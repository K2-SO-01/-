import { CONFIG } from './config.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * 経過時間 t(秒) における難易度を返す。
 *  d       : 0〜1 の基礎難易度（急上昇＋ゆるやかな上昇）
 *  relief  : 0〜1 緩和区間の強さ（1 = 一番緩んでいる）
 *  speed   : 障害物の落下速度
 *  spacing : 次の障害物までの間隔
 *  gapMul  : 壁の隙間倍率
 */
export function difficultyAt(t) {
  const D = CONFIG.difficulty;
  const W = D.wave;
  const d = D.surgeShare * (1 - Math.exp(-t / D.surgeTau)) +
            (1 - D.surgeShare) * (1 - Math.exp(-t / D.growthTau));

  const build = W.period - W.reliefDuration;
  const p = t % W.period;
  let speedMul;
  let relief = 0;
  if (p < build) {
    // じわじわ緊張が高まる
    speedMul = 1 + W.peakBoost * (p / build);
  } else {
    // 一瞬緩む（滑らかに入って滑らかに抜ける）
    const q = (p - build) / W.reliefDuration;
    relief = smoothstep(0, 0.25, q) * (1 - smoothstep(0.7, 1, q));
    speedMul = lerp(1 + W.peakBoost * (1 - q), W.reliefSpeedMul, relief);
  }

  return {
    d,
    relief,
    speed: lerp(D.speedStart, D.speedMax, d) * speedMul,
    spacing: lerp(D.spacingStart, D.spacingMin, d) * lerp(1, W.reliefSpacingMul, relief),
    gapMul: lerp(1, W.reliefGapMul, relief),
  };
}
