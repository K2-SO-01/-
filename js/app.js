// =====================================================================
// app.js — 起動・画面遷移（タイトル / マップ / 問題 / 解説 / 設定）
// 画面は URL のハッシュで管理（Android の戻るボタン・スワイプバック対応）
//   #/            タイトル
//   #/map         ステージマップ
//   #/play/<id>   問題
//   #/explain/<id> 解説
//   #/settings    設定
// =====================================================================
import { load, store, settings, setSetting, totalStars, resetAll } from './storage.js';
import { installUnlock, sfx, unlock } from './audio.js';
import { buzz } from './haptics.js';
import { h } from './drag.js';
import { playScreen } from './play.js';
import { explainScreen } from './explain.js';
import { ICONS } from './gimmicks/index.js';

const app = document.getElementById('app');
let puzzles = [];
let main = [];
let bonus = [];
let current = null;

const CHAPTERS = [
  { from: 1, title: 'はじめの一歩', sub: '帯・円盤・カードに慣れよう' },
  { from: 6, title: 'ひらめきの扉', sub: '鍵は自分で見つける' },
  { from: 13, title: '組み合わせの迷宮', sub: '道具をつなぐ' },
  { from: 21, title: '達人の暗号', sub: 'すべてを使いこなせ' },
];

const labelOf = (p) => (p.bonus ? `BONUS ${p.id.slice(1)}` : `No.${p.id}`);
const isCleared = (p) => !!store().cleared[p.id];
function isUnlocked(p) {
  if (p.bonus) return totalStars() >= p.requiredStars;
  const i = main.indexOf(p);
  return i === 0 || isCleared(main[i - 1]);
}
const byId = (id) => puzzles.find((p) => p.id === id);

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function mount(screen) {
  current?.destroy?.();
  app.innerHTML = '';
  current = screen;
  app.append(screen.el);
  screen.el.classList.add('enter');
}

function route() {
  const [, name, id] = location.hash.replace(/^#/, '').split('/');
  if (name === 'map') return mount(mapScreen());
  if (name === 'settings') return mount(settingsScreen());
  if (name === 'play' || name === 'explain') {
    const p = byId(id);
    if (!p || !isUnlocked(p)) return go('#/map');
    if (name === 'explain' && !isCleared(p)) return go(`#/play/${p.id}`);
    const nextOf = () => {
      const i = main.indexOf(p);
      const nx = p.bonus ? null : main[i + 1];
      const nb = bonus.find((b) => isUnlocked(b) && !isCleared(b));
      if (nx && isUnlocked(nx)) return `#/play/${nx.id}`;
      if (nb) return `#/play/${nb.id}`;
      return '#/map';
    };
    const opts = {
      label: labelOf(p),
      onExit: () => go('#/map'),
      onExplain: () => go(`#/explain/${p.id}`),
      onNext: () => go(nextOf()),
      bonusThresholds: bonus.map((b) => b.requiredStars),
    };
    return mount(name === 'play' ? playScreen(p, opts) : explainScreen(p, opts));
  }
  mount(titleScreen());
}

// ---------------- タイトル ----------------
function titleScreen() {
  const el = h('div', 'screen title');
  const logo = h('div', 'logo');
  const strip = h('div', 'logo-strip');
  [...'あんごう'].forEach((c, i) => { const s = h('span', `lc c${i}`, c); strip.append(s); });
  const strip2 = h('div', 'logo-strip sub');
  [...'スライド'].forEach((c, i) => { const s = h('span', `lc c${i + 4}`, c); strip2.append(s); });
  logo.append(strip, strip2, h('p', 'logo-tag', '動かして、ずらして、読み解く。'));
  const deco = h('div', 'title-deco');
  ['⇆', '◎', '▦', '◐'].forEach((c, i) => { const d = h('span', `deco d${i}`, c); deco.append(d); });
  const stars = h('div', 'title-stars', `★ ${totalStars()} / ${puzzles.length * 3}`);
  const bottom = h('div', 'title-bottom');
  const play = h('button', 'btn primary big', Object.keys(store().cleared).length ? 'つづきから' : 'はじめる');
  play.addEventListener('click', () => { unlock(); sfx.tap(); buzz(10); go('#/map'); });
  const set = h('button', 'btn ghost', '⚙ せってい');
  set.addEventListener('click', () => { unlock(); sfx.tap(); go('#/settings'); });
  bottom.append(stars, play, set);
  el.append(deco, logo, bottom);
  return { el };
}

// ---------------- ステージマップ ----------------
function mapScreen() {
  const el = h('div', 'screen map');
  const head = h('header', 'map-head');
  const home = h('button', 'icon-btn', '⌂');
  home.addEventListener('click', () => { sfx.tap(); go('#/'); });
  const total = h('div', 'map-total');
  total.append(h('b', '', `★ ${totalStars()}`), h('small', '', ` / ${puzzles.length * 3}`));
  const combo = h('div', 'map-combo', store().combo >= 2 ? `🔥${store().combo}` : '');
  const set = h('button', 'icon-btn', '⚙');
  set.addEventListener('click', () => { sfx.tap(); go('#/settings'); });
  head.append(home, total, combo, set);

  const list = h('div', 'map-list scroll');
  let focusEl = null;
  const node = (p, i) => {
    const unlocked = isUnlocked(p), cleared = isCleared(p);
    const b = h('button', 'node' + (cleared ? ' cleared' : unlocked ? ' open' : ' locked') + (p.bonus ? ' bonus' : ''));
    b.style.setProperty('--x', p.bonus ? '0' : String(Math.sin(i * 0.9) * 0.9));
    const num = h('span', 'node-num', p.bonus ? '★' : String(+p.id));
    const st = store().cleared[p.id]?.stars ?? 0;
    const stars = h('span', 'node-stars', cleared ? '★'.repeat(st) + '☆'.repeat(3 - st) : '');
    const name = h('span', 'node-name', unlocked ? p.title.replace(/^★\s*/, '') : p.bonus ? `★${p.requiredStars}で解放` : '？？？');
    const ico = h('span', 'node-ico', [...new Set(p.gimmicks.map((g) => ICONS[g.type]))].join(''));
    b.append(num, stars, name, ico);
    if (unlocked) b.addEventListener('click', () => { sfx.tap(); buzz(8); go(`#/play/${p.id}`); });
    else b.addEventListener('click', () => { sfx.noStar(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); });
    if (unlocked && !cleared && !focusEl) focusEl = b;
    return b;
  };
  main.forEach((p, i) => {
    const ch = CHAPTERS.find((c) => c.from === i + 1);
    if (ch) {
      const c = h('div', 'chapter');
      c.append(h('b', '', ch.title), h('small', '', ch.sub));
      list.append(c);
    }
    list.append(node(p, i));
  });
  const bc = h('div', 'chapter bonus');
  bc.append(h('b', '', 'ボーナスステージ'), h('small', '', '★を集めると解放'));
  list.append(bc);
  bonus.forEach((p, i) => list.append(node(p, i)));
  list.append(h('div', 'map-foot', 'ヒントなし・ミスなしでクリアするとコンボがつながる！'));
  el.append(head, list);
  requestAnimationFrame(() => focusEl?.scrollIntoView({ block: 'center' }));
  return { el };
}

// ---------------- 設定 ----------------
function settingsScreen() {
  const el = h('div', 'screen settings');
  const head = h('header', 'map-head');
  const back = h('button', 'icon-btn', '←');
  back.addEventListener('click', () => { sfx.tap(); history.length > 1 ? history.back() : go('#/'); });
  head.append(back, h('div', 'map-total', 'せってい'), h('div', ''), h('div', ''));
  const body = h('div', 'set-body scroll');
  const toggle = (key, label, desc) => {
    const row = h('label', 'set-row');
    const txt = h('div', 'set-txt');
    txt.append(h('b', '', label), h('small', '', desc));
    const sw = h('button', 'switch' + (settings()[key] ? ' on' : ''));
    sw.setAttribute('role', 'switch');
    sw.addEventListener('click', () => {
      setSetting(key, !settings()[key]);
      sw.classList.toggle('on', settings()[key]);
      unlock();
      sfx.tap();
      if (key === 'vibe') buzz(30);
    });
    row.append(txt, sw);
    return row;
  };
  body.append(toggle('sound', 'サウンド', '効果音（Web Audio で合成）'));
  const canVibe = typeof navigator.vibrate === 'function';
  body.append(toggle('vibe', '振動', canVibe ? 'スナップや正解時に小さく振動' : 'この端末は振動に対応していません'));
  const fxRow = h('div', 'set-row');
  const fxTxt = h('div', 'set-txt');
  fxTxt.append(h('b', '', '演出の強さ'), h('small', '', '控えめ：パーティクル少なめ・画面のゆれなし'));
  const seg = h('div', 'seg');
  [['normal', '通常'], ['low', '控えめ']].forEach(([v, l]) => {
    const b = h('button', 'seg-btn' + (settings().fx === v ? ' on' : ''), l);
    b.addEventListener('click', () => {
      setSetting('fx', v);
      seg.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b));
      document.documentElement.classList.toggle('fx-low', v === 'low');
      sfx.tap();
    });
    seg.append(b);
  });
  fxRow.append(fxTxt, seg);
  body.append(fxRow);

  const how = h('div', 'set-card');
  how.append(h('b', '', 'あそびかた'));
  [
    '⇆ ずらし帯：上段（左）は見わたすだけ、下段（右）をドラッグすると対応がずれる。',
    '◎ 円盤：内側をくるっと回す。外側と内側で向かい合う文字が対応する。',
    '▦ カード：ドラッグで表に重ねる。◇の穴を●に合わせると、穴から文字が見える。↻で回転、⇋で裏返し。',
    '◐ フィルム：鏡文字。横にスワイプ／タップで裏返すと読める。',
    '答えは下の文字タイルをタップかドラッグで。欄のタイルはタップで外せる。',
    '★：目標タイム以内で★3。ヒント1回ごとに★−1。',
  ].forEach((t) => how.append(h('p', '', t)));
  body.append(how);

  const reset = h('button', 'btn danger', '進行データをリセット');
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'もう一度押すと全て消えます';
      setTimeout(() => { armed = false; reset.textContent = '進行データをリセット'; }, 3000);
      return;
    }
    resetAll();
    reset.textContent = 'リセットしました';
    sfx.remove();
  });
  body.append(reset, h('p', 'set-ver', `問題数 ${main.length} + ボーナス ${bonus.length}`));
  el.append(head, body);
  return { el };
}

// ---------------- 起動 ----------------
function guardGestures() {
  // ズーム・長押しメニュー・スクロールの抑止（.scroll 内だけ縦スクロール可）
  const stop = (e) => e.preventDefault();
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  document.addEventListener('dblclick', stop);
  document.addEventListener('contextmenu', stop);
  document.addEventListener('selectstart', stop);
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || !e.target.closest?.('.scroll')) e.preventDefault();
  }, { passive: false });
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 300 && !e.target.closest?.('button')) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
}

async function boot() {
  load();
  document.documentElement.classList.toggle('fx-low', settings().fx === 'low');
  guardGestures();
  installUnlock();
  try {
    const res = await fetch('data/puzzles.json', { cache: 'no-cache' });
    const data = await res.json();
    puzzles = data.puzzles;
  } catch (e) {
    app.innerHTML = '<p style="padding:24px">問題データを読み込めませんでした。</p>';
    return;
  }
  main = puzzles.filter((p) => !p.bonus);
  bonus = puzzles.filter((p) => p.bonus).sort((a, b) => a.requiredStars - b.requiredStars);
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
