// サウンド管理。
//  - assets/audio/ に素材があればそれを再生、無ければ Web Audio の簡易合成音で代用
//  - iOS の再生制限対策：最初のタップ内で AudioContext を生成・resume し無音を鳴らす
//  - Web Audio 非対応 / 読み込み失敗でも例外を出さない
import { CONFIG } from './config.js';

const A = CONFIG.audio;

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.raw = {};       // name -> ArrayBuffer（ctx生成前に先読み）
    this.buffers = {};   // name -> AudioBuffer
    this.bgmSrc = null;
    this.seqTimer = null;
    this.intensity = 0;  // 合成BGMの盛り上がり(0..1)
    this.unlocked = false;
  }

  /** 素材ファイルを先読み（無ければ静かに諦める） */
  preload() {
    if (location.protocol === 'file:') return;
    for (const [name, file] of Object.entries(A.files)) {
      fetch(A.dir + file)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          if (!buf || buf.byteLength < 64) return;
          this.raw[name] = buf;
          if (this.ctx) this.decode(name);
        })
        .catch(() => {});
    }
  }

  decode(name) {
    const buf = this.raw[name];
    if (!buf || !this.ctx) return;
    delete this.raw[name];
    try {
      const done = (ab) => { this.buffers[name] = ab; };
      const p = this.ctx.decodeAudioData(buf, done, () => {});
      if (p && p.then) p.then(done, () => {});
    } catch { /* 無視 */ }
  }

  /** ユーザー操作のハンドラ内で呼ぶ（何度呼んでも安全） */
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!this.ctx) {
        try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { this.ctx = new AC(); }
        const c = this.ctx;
        this.master = c.createGain();
        this.master.gain.value = this.enabled ? A.master : 0;
        this.master.connect(c.destination);
        this.sfx = c.createGain();
        this.sfx.gain.value = A.sfx;
        this.sfx.connect(this.master);
        this.bgmGain = c.createGain();
        this.bgmGain.gain.value = 0;
        this.bgmGain.connect(this.master);
        // ノイズ用バッファ
        const len = c.sampleRate * 0.5;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        for (const name of Object.keys(this.raw)) this.decode(name);
      }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      if (!this.unlocked) {
        // iOS: 無音を1回鳴らして再生を許可させる
        const b = this.ctx.createBuffer(1, 1, 22050);
        const s = this.ctx.createBufferSource();
        s.buffer = b;
        s.connect(this.ctx.destination);
        s.start(0);
        this.unlocked = true;
      }
    } catch { /* 無視 */ }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? A.master : 0;
    if (!on) this.stopBgm(0);
  }

  suspend() { try { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); } catch {} }
  resume() { try { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); } catch {} }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  // ---------------------------------------------------------------
  play(name, opt = {}) {
    if (!this.ready) return;
    try {
      const buf = this.buffers[name];
      if (buf) {
        const s = this.ctx.createBufferSource();
        s.buffer = buf;
        if (opt.rate) s.playbackRate.value = opt.rate;
        s.connect(this.sfx);
        s.start();
        return;
      }
      const fn = SYNTH[name];
      if (fn) fn(this, this.ctx.currentTime, opt);
    } catch { /* 無視 */ }
  }

  // ---- 合成ヘルパ --------------------------------------------------
  tone(t, freq, dur, { type = 'sine', gain = 0.3, freqEnd = null, attack = 0.004, dest = null } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(t, dur, { type = 'lowpass', freq = 1200, gain = 0.3, freqEnd = null, dest = null } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // ---- BGM ---------------------------------------------------------
  startBgm() {
    if (!this.ready) return;
    this.stopBgm(0);
    const c = this.ctx;
    const g = this.bgmGain.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(0.0001, c.currentTime);
    g.exponentialRampToValueAtTime(A.bgm, c.currentTime + 0.4);
    if (this.buffers.bgm) {
      const s = c.createBufferSource();
      s.buffer = this.buffers.bgm;
      s.loop = true;
      s.connect(this.bgmGain);
      s.start();
      this.bgmSrc = s;
    } else {
      this.step = 0;
      this.nextTime = c.currentTime + 0.05;
      this.seqTimer = setInterval(() => this.schedule(), 25);
    }
  }

  stopBgm(fade = 0.5) {
    const stopNow = () => {
      if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
      if (this.bgmSrc) { try { this.bgmSrc.stop(); } catch {} this.bgmSrc = null; }
    };
    if (!this.ctx) return stopNow();
    const c = this.ctx;
    const g = this.bgmGain.gain;
    if (fade > 0) {
      g.cancelScheduledValues(c.currentTime);
      g.setValueAtTime(Math.max(g.value, 0.0001), c.currentTime);
      g.exponentialRampToValueAtTime(0.0001, c.currentTime + fade);
      const src = this.bgmSrc, timer = this.seqTimer;
      this.bgmSrc = null; this.seqTimer = null;
      setTimeout(() => {
        if (timer) clearInterval(timer);
        if (src) { try { src.stop(); } catch {} }
      }, fade * 1000 + 50);
    } else {
      stopNow();
      g.cancelScheduledValues(c.currentTime);
      g.setValueAtTime(0.0001, c.currentTime);
    }
  }

  /** 合成BGM：先読みスケジューラ（16分音符×64ステップ） */
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const spb = 60 / A.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += spb;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(step, t) {
    const dest = this.bgmGain;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const roots = [55, 43.65, 65.41, 49]; // A1 F1 C2 G1
    const root = roots[bar];
    const hi = this.intensity;
    if (s % 4 === 0) this.tone(t, 150, 0.16, { freqEnd: 42, gain: 0.55, dest });
    if (s % 4 === 2) this.noise(t, 0.035, { type: 'highpass', freq: 7000, gain: 0.12, dest });
    else if (hi > 0.45 && s % 2 === 1) this.noise(t, 0.02, { type: 'highpass', freq: 9000, gain: 0.05, dest });
    if ([0, 3, 6, 10, 12, 14].includes(s)) {
      const oct = s === 6 || s === 14 ? 4 : 2;
      this.tone(t, root * oct, 0.16, { type: 'triangle', gain: 0.22, dest });
    }
    if (hi > 0.3 && s % 2 === 0) {
      const scale = [1, 1.189, 1.335, 1.498, 1.782, 2];
      const n = scale[(step * 7 + bar * 3) % scale.length];
      this.tone(t, root * 8 * n, 0.09, { gain: 0.04 + hi * 0.04, dest });
    }
  }
}

// 合成効果音（素材ファイルが無いときの代用品）
const SYNTH = {
  tap(a, t) {
    a.tone(t, 900, 0.05, { gain: 0.15 });
  },
  start(a, t) {
    a.tone(t, 300, 0.18, { type: 'triangle', freqEnd: 1000, gain: 0.25 });
    a.noise(t, 0.15, { type: 'bandpass', freq: 800, freqEnd: 4000, gain: 0.08 });
  },
  near(a, t, { combo = 1 } = {}) {
    const f = 1100 * Math.pow(1.06, Math.min(combo - 1, 12));
    a.tone(t, f, 0.09, { gain: 0.2 });
    a.noise(t, 0.08, { type: 'highpass', freq: 3000, gain: 0.06 });
  },
  perfect(a, t, { combo = 1 } = {}) {
    const f = 1320 * Math.pow(1.06, Math.min(combo - 1, 12));
    a.tone(t, f, 0.12, { gain: 0.22 });
    a.tone(t + 0.05, f * 1.5, 0.18, { gain: 0.18 });
    a.noise(t, 0.18, { type: 'bandpass', freq: 6000, freqEnd: 1500, gain: 0.12 });
  },
  crash(a, t) {
    a.noise(t, 0.5, { type: 'lowpass', freq: 3000, freqEnd: 120, gain: 0.5 });
    a.tone(t, 120, 0.35, { freqEnd: 35, gain: 0.5 });
  },
  best(a, t) {
    [660, 880, 1320, 1760].forEach((f, i) => a.tone(t + i * 0.07, f, 0.2, { type: 'triangle', gain: 0.18 }));
  },
  unlock(a, t) {
    [523, 784, 1047].forEach((f, i) => a.tone(t + i * 0.06, f, 0.25, { type: 'triangle', gain: 0.2 }));
  },
};
