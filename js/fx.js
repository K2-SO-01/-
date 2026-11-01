// パーティクル（紙吹雪・光の粒）。全画面キャンバス1枚で描く
import { CONFIG } from './config.js';
import { settings } from './storage.js';

let cv, cx, parts = [], raf = 0, dpr = 1;

function ensure() {
  if (cv) return;
  cv = document.createElement('canvas');
  cv.className = 'fx-canvas';
  document.body.append(cv);
  cx = cv.getContext('2d');
  const fit = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
  };
  fit();
  addEventListener('resize', fit);
}

export const low = () => settings().fx === 'low';

// level: コンボ段階（0〜）。色数とパーティクル量が増える
export function burst(x, y, { level = 0, count, spread = 1, kinds = ['dot', 'rect', 'star'] } = {}) {
  ensure();
  const C = CONFIG.combo;
  const L = Math.min(level, C.maxLevel);
  let n = count ?? C.particlesBase + C.particlesPerLevel * L;
  if (low()) n = Math.ceil(n * 0.25);
  const colors = CONFIG.palette.slice(0, Math.min(CONFIG.palette.length, C.colorsBase + L));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (2 + Math.random() * 6) * spread * (1 + L * 0.12);
    parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 3,
      g: 0.16 + Math.random() * 0.1,
      life: 0,
      max: 50 + Math.random() * 40,
      size: 4 + Math.random() * 6,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[i % colors.length],
      kind: kinds[i % kinds.length],
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function star(c, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

function tick() {
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  parts = parts.filter((p) => p.life < p.max);
  for (const p of parts) {
    p.life++;
    p.vx *= 0.985;
    p.vy = p.vy * 0.985 + p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    cx.globalAlpha = Math.max(0, 1 - p.life / p.max);
    cx.fillStyle = p.color;
    cx.save();
    cx.translate(p.x, p.y);
    cx.rotate(p.rot);
    if (p.kind === 'dot') { cx.beginPath(); cx.arc(0, 0, p.size / 2, 0, 7); cx.fill(); }
    else if (p.kind === 'rect') cx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else star(cx, p.size * 0.7);
    cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
  if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
}

// 画面のフラッシュ
export function flash(color = '#fff') {
  if (low()) return;
  const f = document.createElement('div');
  f.className = 'fx-flash';
  f.style.background = color;
  document.body.append(f);
  f.addEventListener('animationend', () => f.remove());
}
