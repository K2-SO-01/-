/* 数学ファクトリー：効果音とBGM（WebAudioでその場で合成。音声ファイルは使わない） */
(function (MF) {
  'use strict';
  const A = { ctx: null, master: null, sfxGain: null, bgmGain: null, unlocked: false, mood: null, timer: null, step: 0, nextTime: 0 };
  MF.Audio = A;
  const st = () => (MF.UI && MF.UI.state ? MF.UI.state.settings : { sound: true, bgm: true, volume: 0.6 });

  A.init = function () {
    if (A.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    A.ctx = new AC();
    A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
    A.sfxGain = A.ctx.createGain(); A.sfxGain.connect(A.master);
    A.bgmGain = A.ctx.createGain(); A.bgmGain.gain.value = 0.0; A.bgmGain.connect(A.master);
    // ノイズの素
    const len = A.ctx.sampleRate * 0.5;
    A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.applyVolume();
    return true;
  };
  A.applyVolume = function () {
    if (!A.ctx) return;
    const s = st();
    A.master.gain.value = s.volume === undefined ? 0.6 : s.volume;
    A.sfxGain.gain.value = s.sound ? 0.9 : 0;
    A.bgmGain.gain.setTargetAtTime(s.bgm ? 0.32 : 0, A.ctx.currentTime, 0.3);
  };
  function unlock() {
    if (!A.init()) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (!A.unlocked) { A.unlocked = true; A.startBgm(); }
  }
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) A.ctx.suspend(); else if (A.unlocked) A.ctx.resume(); });

  // ---------- 音の部品 ----------
  function tone(freq, t0, dur, opts) {
    opts = opts || {};
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
    const vol = opts.vol || 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(opts.dest || A.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, opts) {
    opts = opts || {};
    const c = A.ctx, src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    src.buffer = A.noise;
    f.type = opts.filter || 'highpass'; f.frequency.value = opts.freq || 3000;
    g.gain.setValueAtTime(opts.vol || 0.15, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(opts.dest || A.sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12); // MIDI番号→周波数
  const arp = (t, notes, step, opts) => notes.forEach((m, i) => tone(N(m), t + i * step, (opts && opts.dur) || step * 1.6, opts));

  const SFX = {
    click: (t) => tone(1200, t, 0.03, { type: 'square', vol: 0.05 }),
    tick: (t) => tone(1800, t, 0.02, { type: 'triangle', vol: 0.05 }),
    correct: (t) => arp(t, [72, 76, 79], 0.06, { type: 'square', vol: 0.12 }),
    combo: (t) => arp(t, [74, 78, 81, 86], 0.05, { type: 'square', vol: 0.12 }),
    combo2: (t) => { arp(t, [76, 80, 83, 88, 92], 0.045, { type: 'sawtooth', vol: 0.1 }); noise(t, 0.25, { freq: 6000, vol: 0.06 }); },
    wrong: (t) => { tone(220, t, 0.18, { type: 'sawtooth', vol: 0.12, slide: 140 }); tone(180, t + 0.12, 0.22, { type: 'square', vol: 0.08, slide: 110 }); },
    hint: (t) => arp(t, [79, 84], 0.08, { type: 'triangle', vol: 0.1 }),
    levelup: (t) => arp(t, [67, 71, 74, 79, 83, 86], 0.07, { type: 'square', vol: 0.12, dur: 0.18 }),
    build: (t) => { tone(140, t, 0.12, { type: 'square', vol: 0.15, slide: 70 }); noise(t, 0.08, { filter: 'lowpass', freq: 900, vol: 0.12 }); },
    remove: (t) => tone(500, t, 0.15, { type: 'triangle', vol: 0.1, slide: 150 }),
    upgrade: (t) => arp(t, [60, 64, 67, 72], 0.05, { type: 'square', vol: 0.12 }),
    research: (t) => arp(t, [72, 79, 84], 0.09, { type: 'triangle', vol: 0.12, dur: 0.3 }),
    egg: (t) => arp(t, [84, 88], 0.08, { type: 'sine', vol: 0.15 }),
    hatch: (t) => { noise(t + 0.6, 0.15, { freq: 2500, vol: 0.12 }); arp(t + 0.9, [72, 76, 79, 84, 88], 0.08, { type: 'triangle', vol: 0.15, dur: 0.25 }); },
    card: (t) => noise(t, 0.12, { freq: 4000, vol: 0.08 }),
    hit: (t) => { noise(t, 0.1, { filter: 'lowpass', freq: 1500, vol: 0.25 }); tone(110, t, 0.12, { type: 'square', vol: 0.12, slide: 55 }); },
    crit: (t) => { noise(t, 0.18, { filter: 'lowpass', freq: 2500, vol: 0.3 }); tone(880, t, 0.2, { type: 'sawtooth', vol: 0.1, slide: 220 }); },
    block: (t) => tone(600, t, 0.12, { type: 'triangle', vol: 0.15, slide: 900 }),
    buff: (t) => arp(t, [64, 68, 71], 0.05, { type: 'triangle', vol: 0.12 }),
    hurt: (t) => { noise(t, 0.2, { filter: 'lowpass', freq: 800, vol: 0.3 }); tone(90, t, 0.25, { type: 'sawtooth', vol: 0.12, slide: 45 }); },
    victory: (t) => { arp(t, [67, 72, 76, 79], 0.1, { type: 'square', vol: 0.12, dur: 0.2 }); tone(N(84), t + 0.45, 0.6, { type: 'square', vol: 0.12 }); },
    defeat: (t) => arp(t, [64, 60, 57, 52], 0.18, { type: 'triangle', vol: 0.14, dur: 0.3 }),
    alarm: (t) => { for (let i = 0; i < 3; i++) { tone(880, t + i * 0.3, 0.14, { type: 'square', vol: 0.1 }); tone(660, t + i * 0.3 + 0.15, 0.14, { type: 'square', vol: 0.1 }); } },
    launch: (t) => { noise(t, 2.2, { filter: 'lowpass', freq: 600, vol: 0.35 }); tone(60, t, 2.2, { type: 'sawtooth', vol: 0.12, slide: 300 }); },
    gacha: (t) => arp(t, [72, 74, 76, 77, 79, 81, 83, 84], 0.04, { type: 'square', vol: 0.08 }),
    achievement: (t) => arp(t, [76, 79, 84, 88], 0.08, { type: 'triangle', vol: 0.15, dur: 0.3 }),
    mission: (t) => arp(t, [72, 76, 79, 84], 0.08, { type: 'square', vol: 0.11, dur: 0.22 }),
    chapter: (t) => { tone(N(48), t, 1.2, { type: 'sawtooth', vol: 0.08, attack: 0.2 }); arp(t + 0.2, [60, 67, 72], 0.25, { type: 'triangle', vol: 0.1, dur: 0.8 }); },
    bell: (t) => { tone(N(88), t, 1.0, { type: 'sine', vol: 0.15 }); tone(N(95), t, 0.8, { type: 'sine', vol: 0.06 }); },
    pomo: (t) => arp(t, [79, 84], 0.12, { type: 'sine', vol: 0.15, dur: 0.4 }),
    event: (t) => arp(t, [69, 72, 69, 76], 0.09, { type: 'triangle', vol: 0.12 }),
  };
  A.play = function (name) {
    if (!A.ctx || !A.unlocked || !st().sound) return;
    const fn = SFX[name];
    if (!fn) return;
    try { fn(A.ctx.currentTime + 0.01); } catch (e) { /* noop */ }
  };

  // ---------- BGM：画面ごとに雰囲気が変わる自動作曲ループ ----------
  const MOODS = {
    factory: { bpm: 96, bass: [36, 36, 43, 36, 41, 41, 43, 38], lead: [60, 63, 67, 70, 67, 63, 65, 62], wave: 'triangle', hat: true },
    battle: { bpm: 132, bass: [33, 33, 36, 33, 31, 31, 36, 34], lead: [57, 60, 64, 65, 64, 60, 62, 59], wave: 'sawtooth', hat: true },
    galaxy: { bpm: 72, bass: [38, 38, 45, 45, 41, 41, 43, 43], lead: [62, 69, 74, 72, 69, 65, 67, 64], wave: 'sine', hat: false },
    calm: { bpm: 84, bass: [41, 41, 45, 45, 38, 38, 43, 43], lead: [65, 69, 72, 76, 72, 69, 67, 64], wave: 'triangle', hat: false },
  };
  A.setMood = function (m) { if (MOODS[m]) A.mood = m; };
  A.startBgm = function () {
    if (A.timer || !A.ctx) return;
    A.mood = A.mood || 'factory';
    A.nextTime = A.ctx.currentTime + 0.1;
    A.timer = setInterval(schedule, 60);
  };
  function schedule() {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const M = MOODS[A.mood || 'factory'];
    const sp = 60 / M.bpm / 2; // 8分音符
    while (A.nextTime < A.ctx.currentTime + 0.25) {
      const i = A.step % 32, bar = Math.floor(A.step / 8) % 8;
      const t = A.nextTime;
      if (st().bgm) {
        if (i % 2 === 0) tone(N(M.bass[bar]), t, sp * 1.8, { type: 'square', vol: 0.09, dest: A.bgmGain });
        if (i % 4 === 2 || (A.mood === 'battle' && i % 2 === 1)) tone(N(M.lead[(A.step + bar) % 8] + (i % 8 === 6 ? 12 : 0)), t, sp * 1.5, { type: M.wave, vol: 0.05, dest: A.bgmGain });
        if (M.hat && i % 2 === 1) noise(t, 0.03, { freq: 7000, vol: 0.035, dest: A.bgmGain });
        if (M.hat && i % 8 === 0) noise(t, 0.08, { filter: 'lowpass', freq: 200, vol: 0.12, dest: A.bgmGain });
        if (A.mood === 'galaxy' && i % 16 === 0) tone(N(M.lead[bar] + 12), t, sp * 12, { type: 'sine', vol: 0.03, attack: 0.5, dest: A.bgmGain });
      }
      A.nextTime += sp;
      A.step++;
    }
  }
})(globalThis.MF = globalThis.MF || {});
