// 名字と名前の抽選
// 名字：県内上位（順位から推計した割合）＋ 全国の上位（推計人数）＋ まれな名字
// 名前：2025年生まれのランキング上位（順位の重み）＋ ランキング外の一般的な名前

export function drawSurname(W, rng, prefName) {
  const N = W.D.names;
  const p = W.pref(prefName);
  const local = p.surnames; // [kanji, reading, share]
  const localMass = local.reduce((s, x) => s + x[2], 0);
  const rareMass = 0.006;
  if (prefName === '沖縄県') {
    // 沖縄は本土と名字の構成が大きく違うため、沖縄に多い名字の枠を大きくとる（推計）
    const r = rng.next();
    if (r < 0.62) return pickW(rng, local.map((x, i) => [[x[0], x[1]], 1 / Math.pow(i + 1, 0.55)]));
    if (r < 0.8) return rng.pick(N.okinawaExtra);
    return pickNational(rng, N);
  }
  const r = rng.next();
  if (r < localMass) return pickW(rng, local.map((x) => [[x[0], x[1]], x[2]]));
  if (r < localMass + rareMass) return rng.pick(N.rareSurnames);
  return pickNational(rng, N);
}

function pickNational(rng, N) {
  return pickW(rng, N.nationalSurnames.map((x) => [[x[0], x[1]], x[2]]));
}
function pickW(rng, pairs) {
  return rng.weighted(pairs);
}

export function drawGivenName(W, rng, sex) {
  const G = W.D.names.given;
  const top = sex === 'M' ? G.boysTop : G.girlsTop;
  const common = sex === 'M' ? G.boysCommon : G.girlsCommon;
  const src = rng.chance(G.topMass) ? top : common;
  const [kanji, readings] = rng.weighted(src.map((x) => [[x[0], x[1]], x[2]]));
  return [kanji, rng.pick(readings)];
}

export function drawOlderName(W, rng, sex, gen) {
  const G = W.D.names.given;
  const list = gen === 'grand' ? (sex === 'M' ? G.grandM : G.grandF) : (sex === 'M' ? G.parentsM : G.parentsF);
  return rng.pick(list);
}
