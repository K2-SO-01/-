// =====================================================================
// audio.js — 効果音はすべて Web Audio API で合成（音声ファイルなし）
// iOS Safari は最初のユーザー操作まで音が出ないため unlock() で解放する
// =====================================================================
import { CONFIG } from './config.js';
import { settings } from './storage.js';

let ctx = null;
let master = null;
let noiseBuf = null;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = CONFIG.audio.master;
      // 軽いコンプで音割れ防止
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      master.connect(comp).connect(ctx.destination);
      // 無音を1回鳴らして iOS のロックを外す
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* 音が出せない環境でもゲームは続行 */
  }
}

export function installUnlock() {
  const h = () => {
    unlock();
    if (ctx && ctx.state === 'running') {
      ['pointerdown', 'touchend', 'click', 'keydown'].forEach((t) => document.removeEventListener(t, h, true));
    }
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((t) => document.addEventListener(t, h, true));
  // バックグラウンドから戻ったときに再開
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume?.();
  });
}

const on = () => ctx && settings().sound && ctx.state === 'running';
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tone({ type = 'sine', f0, f1 = f0, t = 0, dur = 0.1, gain = 0.3, attack = 0.004, release, detune = 0, dest }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(f0, now);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + (release ?? dur));
  o.connect(g).connect(dest || master);
  o.start(now);
  o.stop(now + (release ?? dur) + 0.05);
}

function noise({ t = 0, dur = 0.03, gain = 0.2, freq = 3000, q = 4 }) {
  const now = ctx.currentTime + t;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  s.connect(f).connect(g).connect(master);
  s.start(now);
  s.stop(now + dur + 0.02);
}

export const sfx = {
  // ダイヤル・帯のカチッ
  snap(pitch = 0) {
    if (!on()) return;
    noise({ dur: 0.025, gain: 0.35, freq: 3800 + pitch * 200, q: 6 });
    tone({ type: 'square', f0: 1900 + pitch * 60, f1: 1300, dur: 0.018, gain: 0.05 });
  },
  tap() {
    if (!on()) return;
    tone({ type: 'sine', f0: 900, f1: 1200, dur: 0.05, gain: 0.12 });
  },
  place(i = 0) {
    if (!on()) return;
    tone({ type: 'sine', f0: 520 + i * 40, f1: 880 + i * 60, dur: 0.07, gain: 0.25 });
    noise({ dur: 0.02, gain: 0.08, freq: 2000 });
  },
  remove() {
    if (!on()) return;
    tone({ type: 'sine', f0: 760, f1: 420, dur: 0.07, gain: 0.18 });
  },
  flip() {
    if (!on()) return;
    noise({ dur: 0.12, gain: 0.12, freq: 1500, q: 1 });
    tone({ type: 'triangle', f0: 400, f1: 900, dur: 0.12, gain: 0.12 });
  },
  rotate() {
    if (!on()) return;
    noise({ dur: 0.04, gain: 0.2, freq: 2600, q: 3 });
    tone({ type: 'triangle', f0: 700, f1: 1000, dur: 0.06, gain: 0.1 });
  },
  wrong() {
    if (!on()) return;
    tone({ type: 'square', f0: 220, f1: 200, dur: 0.12, gain: 0.08 });
    tone({ type: 'square', f0: 185, f1: 160, t: 0.12, dur: 0.16, gain: 0.08 });
  },
  charge() {
    if (!on()) return;
    tone({ type: 'sine', f0: 300, f1: 1200, dur: 0.38, gain: 0.12, attack: 0.2 });
  },
  // 正解ファンファーレ。level（コンボ）が上がるほど音程が上がり、和音が厚くなる
  fanfare(level = 0) {
    if (!on()) return;
    const base = 72 + level * CONFIG.combo.pitchPerLevel;
    const seq = [0, 4, 7, 12];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', f0: midi(base + n), t: i * 0.08, dur: 0.18, gain: 0.22, release: 0.25 });
      tone({ type: 'sine', f0: midi(base + n + 12), t: i * 0.08, dur: 0.12, gain: 0.06 });
    });
    const t = seq.length * 0.08;
    [0, 4, 7, ...(level >= 2 ? [11] : []), ...(level >= 4 ? [14] : [])].forEach((n) =>
      tone({ type: 'triangle', f0: midi(base + 12 + n), t, dur: 0.6, gain: 0.12, release: 0.9 }),
    );
    noise({ t, dur: 0.3, gain: 0.08 + level * 0.02, freq: 6000, q: 0.8 });
  },
  star(i = 0) {
    if (!on()) return;
    const n = 84 + [0, 4, 7, 12][i % 4];
    tone({ type: 'sine', f0: midi(n), dur: 0.3, gain: 0.25, release: 0.5 });
    tone({ type: 'sine', f0: midi(n + 19), dur: 0.15, gain: 0.05 });
  },
  noStar() {
    if (!on()) return;
    tone({ type: 'sine', f0: 300, f1: 260, dur: 0.12, gain: 0.08 });
  },
  combo(level = 1) {
    if (!on()) return;
    const base = 64 + level * 3;
    for (let i = 0; i < 3 + Math.min(level, 4); i++) {
      tone({ type: 'square', f0: midi(base + i * 3), t: i * 0.045, dur: 0.06, gain: 0.05 });
    }
    tone({ type: 'sawtooth', f0: midi(base), f1: midi(base + 24), dur: 0.35, gain: 0.04 });
  },
  hint() {
    if (!on()) return;
    tone({ type: 'sine', f0: 660, t: 0, dur: 0.12, gain: 0.15 });
    tone({ type: 'sine', f0: 990, t: 0.1, dur: 0.2, gain: 0.12 });
  },
  unlock() {
    if (!on()) return;
    [0, 5, 9, 12].forEach((n, i) => tone({ type: 'triangle', f0: midi(76 + n), t: i * 0.07, dur: 0.2, gain: 0.15 }));
  },
};
