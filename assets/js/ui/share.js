// 人生の記録を画像（PNG）とテキストで共有する
import { TITLE } from './common.js';
import { MAP_VIEWBOX, MAP_PATHS } from './map-data.js';

export function shareText(W, L, S, { gentle } = {}) {
  const sx = L.sex === 'M' ? '男の子' : '女の子';
  const cause = !gentle && S.cause ? `、${S.cause}` : '';
  const one = Math.round(1 / W.pref(L.birthPref).birthShare);
  return `「${TITLE}」で、${L.birthPref}に${sx}として生まれ、${S.age}歳まで生きました${cause}。（いま日本で生まれる赤ちゃんの約${one}人に1人が${L.birthPref}生まれ）\n生まれる場所は選べません。あなたはどこに生まれるだろう？ #47分の1`;
}

function wrapText(ctx, text, maxW) {
  const lines = []; let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function shareImage(W, L, S, { gentle } = {}) {
  const c = document.createElement('canvas');
  const w = 1080, h = 1350;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark';
  const bg = dark ? '#11141a' : '#f6f3ec', ink = dark ? '#e8e6e1' : '#1f2328', sub = dark ? '#9a9a99' : '#6b6f76', acc = dark ? '#8fa9e0' : '#2f4d84', warm = dark ? '#e58a72' : '#c8553d', fill = dark ? '#3a4150' : '#d9d1c1';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const font = (s, wt = 400) => `${wt} ${s}px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif`;
  // 地図
  const [, , vw, vh] = MAP_VIEWBOX.split(' ').map(Number);
  const scale = 1.25; const ox = w - vw * scale - 40, oy = 70;
  ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
  for (const p of W.prefs) {
    const path = new Path2D(MAP_PATHS[p.mapId]);
    ctx.fillStyle = p.name === L.birthPref ? warm : S.lived.includes(p.name) ? acc : fill;
    ctx.fill(path);
  }
  ctx.restore();
  ctx.fillStyle = sub; ctx.font = font(34); ctx.fillText(`${TITLE} · 人生の記録`, 70, 110);
  ctx.fillStyle = ink; ctx.font = font(84, 800); ctx.fillText(S.name, 70, 300);
  ctx.font = font(40); ctx.fillStyle = sub; ctx.fillText(`${S.years}`, 70, 360);
  ctx.fillStyle = ink; ctx.font = font(64, 700); ctx.fillText(`${S.age}歳`, 70, 470);
  ctx.font = font(38);
  const rows = [
    ['生まれた県', L.birthPref + (L.sex === 'M' ? '（男）' : '（女）')],
    ['暮らした県', S.lived.join('・')],
    ['最終学歴', S.edu],
    ['最後の仕事', S.job || '—'],
    ['家族', `${S.married ? '結婚した' : '結婚しなかった'}・子ども${S.children}人`],
  ];
  if (!gentle && S.cause) rows.push(['死因', S.cause]);
  let y = 620;
  for (const [k, v] of rows) {
    ctx.fillStyle = sub; ctx.fillText(k, 70, y);
    ctx.fillStyle = ink;
    const lines = wrapText(ctx, v, w - 380);
    lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 300, y + i * 50));
    y += 60 + (Math.min(2, lines.length) - 1) * 50;
  }
  // 人生地図
  const cell = 24, gap = 5, cols = 20; let x0 = 70, y0 = Math.max(y + 20, 1000);
  for (let a = 0; a <= S.age; a++) {
    const hap = L.hist.happy[a] ?? 50;
    ctx.globalAlpha = 0.15 + 0.85 * hap / 100; ctx.fillStyle = acc;
    ctx.fillRect(x0 + (a % cols) * (cell + gap), y0 + Math.floor(a / cols) * (cell + gap), cell, cell);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = sub; ctx.font = font(30);
  ctx.fillText('生まれる場所は、誰も選べない。', 70, h - 70);
  return await new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
