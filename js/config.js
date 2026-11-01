// =====================================================================
// config.js — 操作感・演出・★判定の調整用パラメータはここに集約
// =====================================================================
export const CONFIG = {
  // ---- ドラッグ＆スナップ ----
  snap: {
    zone: 0.26, // 吸着範囲（1マス／1目盛りに対する割合）。大きいほど「カチッ」と吸い付く
    minInterval: 32, // スナップ音・振動の最短間隔(ms)。速く動かしたときの鳴りすぎ防止
    settleMs: 150, // 指を離したあと正しい目盛りへ戻るアニメ時間(ms)
  },
  slide: { cellMin: 40, cellMax: 58, visibleTarget: 7 }, // 横帯：画面幅に何マス見せるか
  dial: { maxSize: 360, tokenScale: 1 },
  stencil: { cellMin: 26, cellMax: 56, magnet: 0.3 }, // magnet: 透かしカードの吸着範囲
  mirror: { dragDegPerPx: 0.9 },
  tiles: { dragThreshold: 8, slotSnapRadius: 56 },

  // ---- ★評価 ----
  stars: {
    // 目標タイム比がこの値以下なら ★3, ★2, ★1。それ以上は minTimeStars
    timeSteps: [1.0, 1.6, 2.5],
    minTimeStars: 1,
    hintPenalty: 1, // ヒント1回ごとの減点
  },

  // ---- コンボ演出 ----
  combo: {
    maxLevel: 5,
    particlesBase: 46,
    particlesPerLevel: 34,
    colorsBase: 2, // レベル0での色数。レベルごとに1色ずつ増える
    pitchPerLevel: 2, // ファンファーレの移調（半音）
  },

  // ---- 正解演出のタイミング(ms) ----
  clearFx: { holdMs: 420, burstMs: 520, starInterval: 300 },

  // ---- 振動パターン(ms) ----
  haptics: {
    snap: 6,
    place: 10,
    wrong: [24, 50, 24],
    clear: [18, 40, 60],
    star: 12,
  },

  audio: { master: 0.55 },

  // ---- ボーナス解放 ----
  // 各ボーナス問題の requiredStars は data/puzzles.json 側で指定
  palette: ['#ff4f81', '#ffb000', '#2ec4b6', '#3a86ff', '#8f4dff', '#ff7a1a', '#3ddc84', '#ffe14d'],
};
