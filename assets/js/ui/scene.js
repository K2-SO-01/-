// 場面のイラスト：年齢・季節・住んでいる町・仕事・家族に合わせて、ドット絵風の場面をその場で描く（この作品のオリジナル）
// SVG の四角形だけで描くので、画像ファイルはいりません。
import { LOCAL } from '../engine/local.js';

const VW = 192, VH = 72, GY = 58; // 横幅・高さ・地面の高さ

// ---------------------------------------------------------------- 小さな道具
const r = (x, y, w, h, c, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${extra}/>`;
function sprite(rows, pal, x, y, flip = false) {
  let out = '';
  rows.forEach((row, j) => {
    const line = flip ? row.split('').reverse().join('') : row;
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '.' || !pal[ch]) { i++; continue; }
      let k = i;
      while (k < line.length && line[k] === ch) k++;
      out += r(x + i, y + j, k - i, 1, pal[ch]);
      i = k;
    }
  });
  return out;
}
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- 人の形
const ADULT = ['..hhh..', '.hhhhh.', '.hsssh.', '..sss..', '...s...', '.ccacc.', 'cccaccc', 'ccccccc', 's.ccc.s', '..ppp..', '..p.p..', '..p.p..', '.oo.oo.'];
const ADULT_LONG = ['..hhh..', '.hhhhh.', '.hsssh.', '.hsssh.', '.h.s.h.', '.ccacc.', 'cccaccc', 'ccccccc', 's.ccc.s', '..ppp..', '..p.p..', '..p.p..', '.oo.oo.'];
const ELDER = ['..hhh...', '.hhhhh..', '.hsssh..', '..sss...', '.ccccc..', 'ccccccc.', 'cccccccn', 's.ccc.sn', '..ppp..n', '..p.p..n', '..p.p..n', '.oo.oo.n'];
const CHILD = ['.hhh..', 'hhhhh.', 'hsssh.', '.sss..', 'ccccbb', 'ccccbb', 'scccbb', '.ppp..', '.p.p..', 'oo.oo.'];
const KID = ['.hhh.', 'hhhhh', 'hsssh', '.sss.', 'ccccc', 'scccs', '.ppp.', 'oo.oo'];
const BABY_CART = ['.kkkkk...', 'kk.ss.k..', 'kkssssk..', 'kkkkkkkkh', '.k....k..', 'w.w..w.w.'];
const DOG = ['....dd', '.ddddd', 'ddddd.', 'd.d.d.'];
const CAT = ['c...c.', 'cc.cc.', 'ccccc.', '.cccc.', 'c.c.c.'];

const SKIN = ['#f1c9a5', '#e8b98f', '#d9a578', '#c68e62'];
const HAIR = ['#2b2522', '#3b2a20', '#5a3d2b', '#1f1f28'];
const CLOTH = ['#3f6aa8', '#c8553d', '#4d8b5b', '#8a5aa6', '#d39b2a', '#2f7f86', '#b4466e'];

function person(kind, x, y, o = {}) {
  const pal = { h: o.hair, s: o.skin, c: o.cloth, a: o.accent || o.cloth, p: o.pants || '#3a3f4b', o: '#2a2a2a', b: o.bag || '#c0392b', n: '#7a5a3a' };
  if (kind === 'elder') return sprite(ELDER, pal, x, y + 1, o.flip);
  if (kind === 'child') return sprite(CHILD, pal, x, y + 3, o.flip);
  if (kind === 'kid') return sprite(KID, pal, x, y + 5, o.flip);
  if (kind === 'baby') return sprite(BABY_CART, { k: o.cart || '#6c8fb3', s: o.skin, h: '#555', w: '#333' }, x, y + 7, o.flip);
  return sprite(o.long ? ADULT_LONG : ADULT, pal, x, y, o.flip);
}

// ---------------------------------------------------------------- 季節と空
const SEASON = ['spring', 'summer', 'autumn', 'winter'];
export function seasonOf(month) { return month >= 3 && month <= 5 ? 0 : month >= 6 && month <= 8 ? 1 : month >= 9 && month <= 11 ? 2 : 3; }
function sky(stage) {
  // 人生の朝・昼・夕方・夜
  if (stage === 'morning') return ['#bfe3f7', '#d8eefa', '#eef7fc'];
  if (stage === 'day') return ['#8ec9ef', '#b1dbf5', '#d4ecfa'];
  if (stage === 'evening') return ['#f2b27a', '#f6c995', '#fbe2bf'];
  return ['#3a3f6b', '#5a5486', '#8a6f95'];
}
function ground(season, snowy, warm) {
  if (season === 3 && snowy) return ['#f4f7fb', '#dfe6ef'];
  if (season === 3) return warm ? ['#7fb069', '#6a9a57'] : ['#a7a37a', '#8e8a64'];
  if (season === 2) return ['#b9a35a', '#9e8846'];
  if (season === 1) return ['#5fa448', '#4c8c39'];
  return ['#86c26a', '#6eab55'];
}

// ---------------------------------------------------------------- 背景
function farCity(R, col) {
  let out = '';
  let x = 0;
  while (x < VW) {
    const w = 8 + Math.floor(R() * 12), h = 14 + Math.floor(R() * 26);
    out += r(x, GY - h, w, h, col);
    for (let wy = GY - h + 3; wy < GY - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (R() < 0.55) out += r(wx, wy, 1, 2, '#f6e7a8', ' opacity=".55"');
    x += w + Math.floor(R() * 3);
  }
  return out;
}
function farTown(R, roofs) {
  let out = '';
  let x = -4;
  while (x < VW) {
    const w = 12 + Math.floor(R() * 10), h = 8 + Math.floor(R() * 10), tall = R() < 0.2;
    const top = GY - (tall ? h + 10 : h);
    out += r(x, top, w, GY - top, tall ? '#c3cbd6' : '#e6dcc8');
    if (!tall) for (let i = 0; i < 4; i++) out += r(x + i, top - 4 + i, w - i * 2, 1, roofs[Math.floor(R() * roofs.length)]);
    else for (let wy = top + 2; wy < GY - 2; wy += 3) out += r(x + 2, wy, w - 4, 1, '#e3ebf4');
    x += w + 1 + Math.floor(R() * 4);
  }
  return out;
}
function farMountains(R, col, col2, snowcap, fuji) {
  let out = '';
  const peaks = fuji ? [[118, 34]] : [[20 + R() * 30, 24 + R() * 10], [80 + R() * 30, 20 + R() * 10], [150 + R() * 30, 26 + R() * 10]];
  for (const [px, py] of peaks) {
    const top = Math.round(py);
    for (let y = top; y < GY; y++) {
      const half = Math.round((y - top) * (fuji ? 2.2 : 1.6));
      out += r(Math.round(px) - half, y, half * 2 + 1, 1, y < top + 5 && snowcap ? '#f7f9fc' : (y % 6 < 3 ? col : col2));
    }
  }
  return out;
}
function farSea(season) {
  const c1 = season === 1 ? '#3f8fc7' : '#5a95bd', c2 = season === 1 ? '#5aa7d8' : '#77a9c9';
  let out = r(0, 40, VW, GY - 40, c1);
  for (let y = 42; y < GY; y += 3) for (let x = (y * 7) % 11; x < VW; x += 14) out += r(x, y, 5, 1, c2);
  return out + r(0, 39, VW, 1, '#e8f3fb', ' opacity=".7"');
}
function farFields(season, snowy) {
  const rows = season === 2 ? ['#d4b24c', '#c49f3c'] : season === 1 ? ['#6db35a', '#5aa04a'] : season === 0 ? ['#9ccf8a', '#7fb46e'] : snowy ? ['#eef3f8', '#dde5ee'] : ['#a99d74', '#958a63'];
  let out = '';
  for (let y = 44, i = 0; y < GY; y += 2, i++) out += r(0, y, VW, 2, rows[i % 2]);
  return out;
}

// ---------------------------------------------------------------- 建物（場所）
function house(x, roof = '#a4473a') {
  let out = '';
  for (let i = 0; i < 9; i++) out += r(x + 12 - i * 1.5 - 2, GY - 26 + i, i * 3 + 4, 1, roof);
  out += r(x, GY - 17, 24, 17, '#efe2c8') + r(x + 3, GY - 13, 6, 5, '#9bc4e2') + r(x + 15, GY - 11, 5, 11, '#7a5434');
  return out;
}
function school(x) {
  let out = r(x, GY - 26, 64, 26, '#f1ead8') + r(x, GY - 27, 64, 2, '#c9bfa6');
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) if (!(row === 2 && i === 4)) out += r(x + 3 + i * 7, GY - 23 + row * 8, 4, 4, '#8fbde0');
  out += r(x + 29, GY - 8, 6, 8, '#6d4c33') + r(x + 28, GY - 34, 8, 8, '#f1ead8') + r(x + 30, GY - 32, 4, 4, '#ffffff') + r(x + 31, GY - 31, 1, 2, '#333');
  out += r(x + 70, GY - 34, 1, 34, '#888') + r(x + 71, GY - 34, 7, 4, '#ffffff') + r(x + 73, GY - 33, 2, 2, '#c8553d');
  return out;
}
function office(x) {
  let out = r(x, GY - 46, 26, 46, '#9aa7b8') + r(x + 30, GY - 32, 22, 32, '#b5bfcc');
  for (let y = GY - 43; y < GY - 4; y += 4) for (let i = 0; i < 5; i++) out += r(x + 2 + i * 5, y, 3, 2, '#dbe8f5');
  for (let y = GY - 29; y < GY - 4; y += 4) for (let i = 0; i < 4; i++) out += r(x + 32 + i * 5, y, 3, 2, '#e8f0f8');
  return out + r(x + 10, GY - 6, 6, 6, '#4a5566');
}
function shop(x) {
  let out = r(x, GY - 20, 34, 20, '#f3e6cf');
  for (let i = 0; i < 34; i += 4) out += r(x + i, GY - 22, 2, 5, '#c8553d') + r(x + i + 2, GY - 22, 2, 5, '#ffffff');
  return out + r(x + 3, GY - 14, 14, 10, '#a9d1ea') + r(x + 22, GY - 14, 8, 14, '#7a5434') + r(x + 4, GY - 26, 26, 4, '#2f4d84');
}
function hospital(x) {
  let out = r(x, GY - 30, 44, 30, '#f7f7f7') + r(x, GY - 31, 44, 2, '#cfd6de');
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) out += r(x + 3 + i * 7, GY - 27 + row * 8, 4, 4, '#a9cbe6');
  return out + r(x + 18, GY - 40, 8, 8, '#ffffff') + r(x + 21, GY - 39, 2, 6, '#d9453b') + r(x + 19, GY - 37, 6, 2, '#d9453b') + r(x + 19, GY - 8, 6, 8, '#8fbde0');
}
function factory(x) {
  let out = r(x, GY - 20, 46, 20, '#a7a19a');
  for (let i = 0; i < 4; i++) out += r(x + i * 11, GY - 26, 11, 6, '#8d8780') + r(x + i * 11, GY - 26, 3, 6, '#b7b1aa');
  out += r(x + 36, GY - 40, 5, 20, '#7f7973') + r(x + 33, GY - 46, 4, 4, '#dcdcdc', ' opacity=".8"') + r(x + 30, GY - 51, 5, 4, '#e8e8e8', ' opacity=".6"');
  for (let i = 0; i < 4; i++) out += r(x + 4 + i * 9, GY - 14, 5, 5, '#e4d8a8');
  return out;
}
function field(x, season) {
  const c = season === 2 ? '#d9b44a' : season === 1 ? '#4f9a3c' : season === 0 ? '#79b860' : '#a08f68';
  let out = r(x, GY - 3, 64, 3, '#7b5b3a');
  for (let i = 0; i < 64; i += 4) out += r(x + i, GY - 9, 2, 6, c) + r(x + i + 1, GY - 11, 1, 2, c);
  return out + house(x + 40);
}
function stadium(x) {
  let out = r(x, GY - 18, 70, 18, '#c9ced6') + r(x + 4, GY - 14, 62, 4, '#9ea6b3');
  for (const lx of [x + 2, x + 64]) out += r(lx, GY - 44, 2, 26, '#7c8594') + r(lx - 3, GY - 48, 8, 4, '#fff6c8');
  return out;
}
function univ(x) {
  let out = r(x, GY - 28, 56, 28, '#e7dcc6');
  for (let i = 0; i < 6; i++) out += r(x + 4 + i * 9, GY - 24, 3, 24, '#f6efe0');
  for (let i = 0; i < 10; i++) out += r(x + 28 - i * 2.8, GY - 38 + i, 5.6 * i + 2, 1, '#b9ab8e');
  return out;
}
function bench(x) { return r(x, GY - 6, 18, 2, '#8a5a35') + r(x + 1, GY - 4, 2, 4, '#5a3a22') + r(x + 15, GY - 4, 2, 4, '#5a3a22') + r(x, GY - 10, 18, 2, '#8a5a35'); }
function slide(x) { let out = r(x, GY - 16, 2, 16, '#c0392b') + r(x + 6, GY - 16, 2, 16, '#c0392b') + r(x, GY - 16, 8, 2, '#e67e22'); for (let i = 0; i < 12; i++) out += r(x + 8 + i, GY - 15 + i, 2, 2, '#f1c40f'); return out; }

// ---------------------------------------------------------------- 木と季節の粒
function tree(x, season, snowy, warm) {
  let out = r(x + 5, GY - 14, 3, 14, '#6b4a2f');
  const leaf = season === 0 ? (warm ? '#6fbf5a' : '#f4b6c8') : season === 1 ? '#3f8f3a' : season === 2 ? '#d9772b' : warm ? '#4f9a46' : null;
  const leaf2 = season === 0 ? (warm ? '#88cf73' : '#f8cfdb') : season === 1 ? '#57a84c' : season === 2 ? '#c8553d' : warm ? '#64ad58' : null;
  const blob = [[4, 0, 6], [2, 1, 10], [1, 2, 12], [0, 3, 14], [0, 4, 14], [1, 5, 12], [2, 6, 10], [4, 7, 6]];
  if (leaf) for (const [dx, dy, w] of blob) out += r(x + dx - 0.5, GY - 24 + dy, w, 1, dy % 2 ? leaf : leaf2);
  else {
    out += r(x + 2, GY - 20, 1, 7, '#6b4a2f') + r(x + 10, GY - 19, 1, 6, '#6b4a2f') + r(x + 3, GY - 21, 8, 1, '#6b4a2f');
    if (snowy) out += r(x + 1, GY - 22, 11, 1, '#ffffff');
  }
  return out;
}
function particles(season, snowy, warm, R) {
  let col = null;
  if (season === 0 && !warm) col = '#f6c1d1';
  if (season === 2) col = '#d9772b';
  if (season === 3 && snowy) col = '#ffffff';
  if (!col) return '';
  let out = '<g class="fall">';
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(R() * VW), d = (4 + R() * 5).toFixed(1), del = (-R() * 9).toFixed(1);
    out += `<rect x="${x}" y="-3" width="${season === 3 ? 1 : 2}" height="1" fill="${col}" style="animation-duration:${d}s;animation-delay:${del}s"/>`;
  }
  return out + '</g>';
}

// ---------------------------------------------------------------- 場所を決める
const PLACE_BY_JOB = {
  field: ['farmer', 'ricefarmer', 'fruitfarmer', 'dairy', 'fisher', 'forestry', 'agricorp'],
  hospital: ['care', 'nurse', 'midwife', 'therapist', 'labtech', 'dentalhyg', 'pharmacist', 'doctor', 'dentist', 'vet', 'socialworker'],
  factory: ['factory', 'autofactory', 'food', 'qc', 'engineer', 'chemist', 'construction', 'carpenter', 'plasterer', 'electrician', 'plumber', 'welder', 'sitemanager', 'printing', 'driver', 'delivery', 'warehouse', 'mechanic'],
  shop: ['retail', 'conveni', 'drugstore', 'shop', 'apparel', 'cook', 'baker', 'restaurant', 'hairdresser', 'esthetician', 'trimmer', 'shopowner', 'shopowner_food', 'hotel', 'ryokan', 'tourism'],
  school: ['nursery', 'teacher', 'teacherjhs', 'teacherhs', 'jukuteacher'],
  univ: ['professor', 'researcher', 'librarian'],
  stadium: ['pro_baseball', 'pro_soccer', 'pro_golfer', 'rikishi', 'jockey'],
};
const JOB_PLACE = (id = '') => Object.keys(PLACE_BY_JOB).find((k) => PLACE_BY_JOB[k].includes(id)) || 'office';

// ---------------------------------------------------------------- 本体
export function sceneKey(L, month) {
  const s = seasonOf(month);
  const kids = L.family.children.filter((c) => c.alive && L.startYear + L.age - c.by < 12).length;
  const sp = L.family.spouse && L.family.spouse.alive && !L.family.spouse.divorced;
  return [L.age < 3 ? 0 : L.age < 6 ? 3 : L.age < 12 ? 6 : L.age < 18 ? 12 : L.age < 23 ? 18 : L.age < 65 ? 23 : L.age < 80 ? 65 : 80, s, L.pref, L.muni, L.work.status, L.work.jobId, L.edu.stage, kids > 0, sp, !!(L.pet && L.pet.alive), L.alive, L.health.care].join('|');
}

/**
 * @param {object} W 世界（統計）
 * @param {object} L 人生
 * @param {number} month いまの月（1〜12）
 */
export function sceneSVG(W, L, month) {
  const season = seasonOf(month);
  const local = LOCAL[L.pref];
  const tags = local?.tags || [];
  const snowy = tags.includes('snow') || ['北海道', '青森県', '岩手県', '秋田県', '山形県', '新潟県', '富山県', '石川県', '福井県', '長野県'].includes(L.pref);
  const warm = L.pref === '沖縄県' || L.pref === '鹿児島県';
  const R = rng(hash(`${L.seed}|${L.muni}|${L.pref}`));
  const a = L.age;
  const stage = a < 18 ? 'morning' : a < 60 ? 'day' : a < 80 ? 'evening' : 'night';
  const [s1, s2, s3] = sky(stage);
  const [g1, g2] = ground(season, snowy, warm);
  // 町の景色
  const m = W.muni ? W.muni(L.pref, L.muni) : null;
  const pop = m ? m[1] : 100000;
  const big = /区$/.test(L.muni || '') || pop >= 300000;
  const inland = tags.includes('inland');
  const mid = !big && pop >= 50000;
  const view = big ? 'city' : (L.pref === '山梨県' || L.pref === '静岡県') && R() < 0.5 ? 'fuji' : mid ? (!inland && R() < 0.3 ? 'sea' : 'town') : inland ? (R() < 0.6 ? 'mount' : 'fields') : ['sea', 'fields', 'mount'][Math.floor(R() * 3)];
  let svg = r(0, 0, VW, 16, s1) + r(0, 16, VW, 14, s2) + r(0, 30, VW, GY - 30, s3);
  // 太陽・月
  if (stage === 'night') svg += r(160, 8, 6, 6, '#f4ecc2') + r(162, 8, 4, 4, s1) + [[20, 6], [48, 12], [96, 5], [130, 14], [176, 20]].map(([x, y]) => r(x, y, 1, 1, '#ffffff')).join('');
  else svg += r(stage === 'evening' ? 150 : 158, stage === 'evening' ? 22 : 8, 8, 8, stage === 'evening' ? '#f08a4b' : '#fff1a6') + r(stage === 'evening' ? 152 : 160, stage === 'evening' ? 20 : 6, 4, 12, stage === 'evening' ? '#f08a4b' : '#fff1a6');
  // 雲
  for (let i = 0; i < 3; i++) { const cx = Math.floor(R() * 160), cy = 6 + Math.floor(R() * 14); svg += r(cx, cy, 14, 3, '#ffffff', ' opacity=".75"') + r(cx + 3, cy - 2, 8, 2, '#ffffff', ' opacity=".75"'); }
  if (view === 'city') svg += farCity(R, stage === 'night' ? '#4c5274' : '#a9b4c4');
  else if (view === 'sea') svg += farSea(season);
  else if (view === 'town') svg += farMountains(R, '#b7c9b4', '#adc0aa', season === 3 && snowy, false) + farTown(R, ['#a4473a', '#3e5f8a', '#6b6b6b', '#4a6b52']);
  else if (view === 'fields') svg += farMountains(R, '#a7bfa1', '#9bb595', season === 3 && snowy, false) + farFields(season, snowy);
  else svg += farMountains(R, '#7fa38b', '#73977f', season === 3 || snowy, view === 'fuji');
  // 地面
  svg += r(0, GY, VW, VH - GY, g1) + r(0, GY, VW, 1, g2);
  for (let i = 0; i < 18; i++) svg += r(Math.floor(R() * VW), GY + 3 + Math.floor(R() * 10), 2, 1, g2);
  // 場所
  const w = L.work, st = L.edu.stage;
  let place;
  if (!L.alive) place = 'none';
  else if (L.health.care && a >= 60) place = 'hospital';
  else if (a < 3) place = 'house';
  else if (a < 6) place = 'park';
  else if (['elem', 'jhs', 'hs'].includes(st)) place = 'school';
  else if (['univ', 'grad', 'voc', 'jc'].includes(st)) place = 'univ';
  else if (w.status === 'employed') place = JOB_PLACE(w.jobId);
  else if (a >= 60) place = 'house';
  else place = 'park';
  const PX = 108;
  if (place === 'house') svg += house(PX + 20, ['#a4473a', '#3e5f8a', '#6b6b6b', '#7a4a2a'][Math.floor(R() * 4)]);
  else if (place === 'park') svg += slide(PX + 10) + bench(PX + 44);
  else if (place === 'school') svg += school(PX - 8);
  else if (place === 'univ') svg += univ(PX + 6);
  else if (place === 'office') svg += office(PX + 18);
  else if (place === 'shop') svg += shop(PX + 18);
  else if (place === 'hospital') svg += hospital(PX + 14);
  else if (place === 'factory') svg += factory(PX + 14);
  else if (place === 'field') svg += field(PX, season);
  else if (place === 'stadium') svg += stadium(PX);
  // 木
  svg += tree(14, season, snowy, warm) + tree(88, season, snowy, warm);
  // 人（建物とのつり合いのため、地面を基準に拡大して描く）
  let ppl = '';
  if (L.alive) {
    let svg = '';
    const pick = (arr, k) => arr[hash(L.seed + k) % arr.length];
    const look = { hair: a >= 65 ? '#cfcfcf' : a >= 55 ? '#8d8a86' : pick(HAIR, 'h'), skin: pick(SKIN, 's'), cloth: pick(CLOTH, 'c'), long: L.sex === 'F', pants: '#3a3f4b' };
    if (['jhs', 'hs'].includes(st)) { look.cloth = '#2c3e66'; look.accent = L.sex === 'F' ? '#c8553d' : '#2c3e66'; }
    if (place === 'office' && a >= 18) { look.cloth = '#3d4757'; look.accent = '#c8553d'; }
    if (place === 'hospital' && w.status === 'employed') { look.cloth = '#6cb6c9'; look.accent = '#6cb6c9'; look.pants = '#6cb6c9'; }
    const X = 52;
    if (a < 3) {
      svg += person('baby', X + 8, GY - 13, { skin: look.skin, cart: pick(CLOTH, 'cart') });
      svg += person('adult', X - 2, GY - 13, { hair: pick(HAIR, 'mom'), skin: look.skin, cloth: pick(CLOTH, 'mom'), long: true });
    } else if (a < 6) svg += person('kid', X, GY - 13, { ...look, flip: true });
    else if (a < 12) svg += person('child', X, GY - 13, { ...look, bag: L.sex === 'F' ? pick(['#c0392b', '#8e44ad', '#2e86c1', '#6d4c33'], 'bag') : pick(['#2b2b2b', '#2e86c1', '#6d4c33', '#1e8449'], 'bag') });
    else if (a < 80) svg += person('adult', X, GY - 13, look);
    else svg += person('elder', X, GY - 13, look);
    // 連れ合い
    const sp = L.family.spouse;
    if (sp && sp.alive && !sp.divorced && a >= 18) svg += person(a >= 80 ? 'elder' : 'adult', X - 12, GY - 13, { hair: a >= 65 ? '#d6d6d6' : pick(HAIR, 'sp'), skin: pick(SKIN, 'sps'), cloth: pick(CLOTH, 'spc'), long: sp.sex === 'F' || (sp.sex == null && L.sex === 'M') });
    // 小さな子ども
    const kid = L.family.children.find((c) => c.alive && L.startYear + L.age - c.by < 12 && L.startYear + L.age - c.by >= 2);
    if (kid) svg += person('kid', X + 10, GY - 13, { hair: pick(HAIR, 'k'), skin: look.skin, cloth: pick(CLOTH, 'kc'), long: kid.sex === 'F' });
    // ペット
    if (L.pet && L.pet.alive) svg += L.pet.kind === '猫' ? sprite(CAT, { c: '#e0a458' }, X + 20, GY - 5) : L.pet.kind === '犬' ? sprite(DOG, { d: '#b07a45' }, X + 20, GY - 4) : '';
    ppl = `<g transform="translate(${X} ${GY}) scale(1.6) translate(${-X} ${-GY})">${svg}</g>`;
  } else {
    // 亡くなったあと：花
    for (let i = 0; i < 5; i++) svg += r(56 + i * 4, GY - 4, 1, 4, '#4d8b5b') + r(55 + i * 4, GY - 6, 3, 2, ['#f4b6c8', '#ffffff', '#f6e27a'][i % 3]);
  }
  svg += ppl + particles(season, snowy, warm, R);
  return { svg: `<svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`, label: sceneLabel(L, season, place, view) };
}

const PLACE_LABEL = { house: '家の前', park: '公園', school: '学校の前', univ: '大学の前', office: '会社のビルの前', shop: '店の前', hospital: '病院の前', factory: '工場の前', field: '畑のそば', stadium: '競技場の前', none: '' };
const VIEW_LABEL = { city: '町のビル', town: '家並み', sea: '海', fields: '田畑', mount: '山', fuji: '富士山' };
function sceneLabel(L, season, place, view) {
  const s = ['春', '夏', '秋', '冬'][season];
  if (!L.alive) return `${s}。花が手向けられています。`;
  return `${s}。${VIEW_LABEL[view]}が見える${PLACE_LABEL[place]}に、${L.age}歳の${L.name.mei}さんがいます。`;
}
export { SEASON };
