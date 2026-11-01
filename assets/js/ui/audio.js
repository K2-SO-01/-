// 穏やかなアンビエント音楽を Web Audio API でその場で生成する（音源ファイルは使わない）
let ctx = null, master = null, reverb = null, timer = null, bellTimer = null, on = false;

const CHORDS = [
  [50, 57, 62, 66, 69], // D
  [47, 54, 59, 62, 66], // Bm
  [43, 50, 55, 59, 62], // G
  [45, 52, 57, 61, 64], // A
  [40, 47, 52, 55, 59], // Em
];
const SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function impulse(sec = 3.2) {
  const len = ctx.sampleRate * sec;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
  }
  return buf;
}

function pad(notes) {
  const t = ctx.currentTime;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 900; filt.Q.value = 0.3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 3.5);
  g.gain.setValueAtTime(0.12, t + 7);
  g.gain.linearRampToValueAtTime(0, t + 11.5);
  filt.connect(g); g.connect(master); g.connect(reverb);
  for (const n of notes) {
    for (const det of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(n);
      o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = 0.18 / notes.length;
      o.connect(og); og.connect(filt);
      o.start(t); o.stop(t + 12);
    }
  }
}

function bell() {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = hz(SCALE[Math.floor(Math.random() * SCALE.length)]);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  o.connect(g); g.connect(master); g.connect(reverb);
  o.start(t); o.stop(t + 3.3);
}

export function musicOn() {
  if (on) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  } catch { return; }
  if (ctx.state === 'suspended') ctx.resume();
  if (!master) {
    master = ctx.createGain(); master.gain.value = 0;
    reverb = ctx.createConvolver(); reverb.buffer = impulse();
    const rg = ctx.createGain(); rg.gain.value = 0.55;
    reverb.connect(rg); rg.connect(master);
    master.connect(ctx.destination);
  }
  on = true;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
  let i = 0;
  const next = () => { pad(CHORDS[i % CHORDS.length]); i += Math.random() < 0.7 ? 1 : 2; };
  next();
  timer = setInterval(next, 8000);
  const ring = () => { bell(); bellTimer = setTimeout(ring, 2500 + Math.random() * 5000); };
  bellTimer = setTimeout(ring, 2000);
}

export function musicOff() {
  if (!on) return;
  on = false;
  clearInterval(timer); clearTimeout(bellTimer);
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  }
}
export const musicIsOn = () => on;
