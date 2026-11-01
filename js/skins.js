// 自機スキン。すべて白一色の幾何学図形。
// cost = 解放に必要なコイン。path(ctx, r) で原点中心のパスを作る。
const TAU = Math.PI * 2;

function poly(ctx, n, r, rot = -Math.PI / 2) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function star(ctx, n, ro, ri) {
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i / (n * 2)) * TAU;
    const r = i % 2 ? ri : ro;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export const SKINS = [
  { id: 'circle', name: 'CIRCLE', cost: 0, path: (c, r) => c.arc(0, 0, r, 0, TAU) },
  { id: 'triangle', name: 'TRIANGLE', cost: 40, path: (c, r) => poly(c, 3, r * 1.3, -Math.PI / 2) },
  { id: 'diamond', name: 'DIAMOND', cost: 80, path: (c, r) => { c.moveTo(0, -r * 1.3); c.lineTo(r * 0.9, 0); c.lineTo(0, r * 1.3); c.lineTo(-r * 0.9, 0); c.closePath(); } },
  { id: 'square', name: 'SQUARE', cost: 120, path: (c, r) => c.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8) },
  { id: 'hexagon', name: 'HEXAGON', cost: 180, path: (c, r) => poly(c, 6, r * 1.08, 0) },
  { id: 'star', name: 'STAR', cost: 260, spin: 1.2, path: (c, r) => star(c, 5, r * 1.35, r * 0.6) },
  { id: 'ring', name: 'RING', cost: 360, evenodd: true, path: (c, r) => {
    c.arc(0, 0, r * 1.05, 0, TAU);
    c.moveTo(r * 0.62, 0); c.arc(0, 0, r * 0.62, 0, TAU);
    c.moveTo(r * 0.28, 0); c.arc(0, 0, r * 0.28, 0, TAU);
  } },
  { id: 'cross', name: 'CROSS', cost: 480, path: (c, r) => {
    const a = r * 1.15, b = r * 0.38;
    c.moveTo(-b, -a); c.lineTo(b, -a); c.lineTo(b, -b); c.lineTo(a, -b); c.lineTo(a, b); c.lineTo(b, b);
    c.lineTo(b, a); c.lineTo(-b, a); c.lineTo(-b, b); c.lineTo(-a, b); c.lineTo(-a, -b); c.lineTo(-b, -b); c.closePath();
  } },
  { id: 'shuriken', name: 'SHURIKEN', cost: 650, spin: 4, path: (c, r) => star(c, 4, r * 1.4, r * 0.42) },
];

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

/** 原点に図形を塗る（呼び出し側で translate / globalAlpha 設定済み前提） */
export function fillSkin(ctx, skin, r) {
  ctx.beginPath();
  skin.path(ctx, r);
  ctx.fill(skin.evenodd ? 'evenodd' : 'nonzero');
}
