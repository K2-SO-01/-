// 進行データ・設定の保存（localStorage）。使えない環境でもメモリ上で動く
const KEY = 'angou-slide:v1';

const DEFAULT = () => ({
  v: 1,
  cleared: {}, // id -> { stars, bestTime, hints }
  combo: 0,
  bestCombo: 0,
  settings: { sound: true, vibe: true, fx: 'normal' }, // fx: 'normal' | 'low'
  seenTutorial: false,
});

let data = DEFAULT();

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      data = { ...DEFAULT(), ...d, settings: { ...DEFAULT().settings, ...(d.settings || {}) } };
    }
  } catch {
    data = DEFAULT();
  }
  // 初回起動で「視差効果を減らす」設定の端末は演出を控えめに
  if (!raw && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) data.settings.fx = 'low';
  return data;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* プライベートモード等 */
  }
}

export const store = () => data;
export const settings = () => data.settings;

export function setSetting(k, v) {
  data.settings[k] = v;
  save();
}

export function recordClear(id, { stars, time, hints }) {
  const prev = data.cleared[id];
  data.cleared[id] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    bestTime: Math.min(prev?.bestTime ?? Infinity, time),
    hints: Math.min(prev?.hints ?? 99, hints),
  };
  save();
  return { firstClear: !prev, improved: !prev || stars > prev.stars };
}

export function totalStars() {
  return Object.values(data.cleared).reduce((s, c) => s + (c.stars || 0), 0);
}

export function resetAll() {
  const s = data.settings;
  data = DEFAULT();
  data.settings = s;
  save();
}
