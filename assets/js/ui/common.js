// 画面で共通に使うもの：データの読み込み、保存、テーマ、地図、相談窓口
import { createWorld } from '../engine/world.js';
import { MAP_VIEWBOX, MAP_PATHS } from './map-data.js';

export const TITLE = '47分の1';
export const SUBTITLE = '日本のどこかに生まれて、一度きりの人生を';

let worldPromise = null;
export function loadWorld() {
  if (!worldPromise) {
    worldPromise = fetch(new URL('../../../data/japan.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error('data'); return r.json(); })
      .then((D) => createWorld(D));
  }
  return worldPromise;
}

// ---------- 保存（この端末の localStorage だけ）
const NS = '47b:';
export const store = {
  get(k, def = null) {
    try { const v = localStorage.getItem(NS + k); return v == null ? def : JSON.parse(v); } catch { return def; }
  },
  set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(NS + k); } catch { /* 何もしない */ } },
};

// ---------- テーマ
export function applyTheme() {
  const t = store.get('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
export function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const t = store.get('theme', 'auto');
  const next = order[(order.indexOf(t) + 1) % order.length];
  store.set('theme', next);
  applyTheme();
  return next;
}
export const themeLabel = (t) => ({ auto: '端末に合わせる', light: '明るい', dark: '暗い' }[t]);

// ---------- 地図
export function mapSVG(W, { cls = 'map', label = '日本地図' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', MAP_VIEWBOX);
  svg.setAttribute('class', cls);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  for (const p of W.prefs) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', MAP_PATHS[p.mapId]);
    path.dataset.pref = p.name;
    const t = document.createElementNS(ns, 'title');
    t.textContent = p.name;
    path.appendChild(t);
    svg.appendChild(path);
  }
  return svg;
}
export function markMap(svg, marks) {
  for (const path of svg.querySelectorAll('path')) {
    path.classList.remove('hi', 'me', 'glow', 'flash');
    const m = marks[path.dataset.pref];
    if (m) for (const c of m.split(' ')) path.classList.add(c);
  }
}

// ---------- 相談窓口
const HOTLINE_SETS = {
  suicide: ['こころの健康相談統一ダイヤル', 'いのちの電話（ナビダイヤル）', '#いのちSOS（自殺対策支援センター ライフリンク）', 'よりそいホットライン'],
  mental: ['こころの健康相談統一ダイヤル', 'いのちの電話（ナビダイヤル）', 'よりそいホットライン'],
  dv: ['DV相談＋（プラス）', 'DV相談ナビ', 'よりそいホットライン'],
  sexual: ['性犯罪・性暴力被害者のためのワンストップ支援センター', 'よりそいホットライン'],
  abuse: ['児童相談所 虐待対応ダイヤル', 'よりそいホットライン'],
  bully: ['よりそいホットライン', 'いのちの電話（ナビダイヤル）'],
  addiction: ['こころの健康相談統一ダイヤル', 'よりそいホットライン'],
  poverty: ['よりそいホットライン'],
  grief: ['いのちの電話（ナビダイヤル）', 'よりそいホットライン'],
  default: ['こころの健康相談統一ダイヤル', 'いのちの電話（ナビダイヤル）', 'よりそいホットライン'],
};
export function hotlinesFor(W, kind) {
  const names = HOTLINE_SETS[kind] || HOTLINE_SETS.default;
  const list = W.D.hotlines.list;
  return names.map((n) => list.find((h) => h.name === n)).filter(Boolean);
}
export function telHref(tel) {
  return 'tel:' + tel.replace(/[^0-9#]/g, '').replace('#', '%23');
}
export function hotlineHTML(W, kind, { compact = true } = {}) {
  const hs = hotlinesFor(W, kind);
  const items = hs.map((h) => `<a href="${telHref(h.tel)}">${esc(h.name)} ${esc(h.tel)}</a>`).join(' ／ ');
  return `<div class="help-inline" role="note">つらいときは、ひとりで抱えずに相談できます：${items}　<a href="about.html#help">ほかの相談先</a></div>`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function footerHTML() {
  return `<nav aria-label="ページ"><a href="index.html">${TITLE}</a><a href="stats.html">47都道府県の統計</a><a href="about.html">どんなしくみ？</a><a href="about.html#sources">出典</a><a href="about.html#help"><b>心がつらいとき</b></a></nav>
  <p class="small">記録はこの端末のブラウザにだけ保存され、どこにも送信されません。地図：svg-maps（Victor Cazanave, CC BY 4.0）。統計の出典は「出典」をご覧ください。このシミュレーションは占いや予言ではありません。</p>`;
}
