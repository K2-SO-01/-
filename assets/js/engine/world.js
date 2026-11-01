// 統計データへのアクセスと、モデルの較正（公表値に合うように係数を解く）
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Gauss-Hermite 風の簡易積分点（標準正規）
const Z = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
const ZW = Z.map((z) => Math.exp(-z * z / 2));
const ZWS = ZW.reduce((a, b) => a + b, 0);

function solve(f, target, lo, hi, iter = 60) {
  // f が単調増加と仮定
  for (let i = 0; i < iter; i++) {
    const m = (lo + hi) / 2;
    if (f(m) < target) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

export const UNIV_COEF = { q: 0.42, k: 0.7 };

// 初婚のハザードの年齢の形（相対値）
function marriageShape(sex, a) {
  const peak = sex === 'M' ? 29.5 : 27.8;
  const sd = sex === 'M' ? 5.8 : 5.0;
  if (a < 18 || a > 60) return 0;
  const x = (a - peak) / sd;
  // 右に長い裾
  return Math.exp(-0.5 * x * x) + (a > peak ? 0.18 * Math.exp(-(a - peak) / 9) : 0);
}
// 既婚女性の出生ハザードの年齢の形
function fertShape(a) {
  if (a < 16 || a > 46) return 0;
  const x = (a - 31.5) / 5.2;
  return Math.exp(-0.5 * x * x);
}
export const PARITY = [1.0, 0.82, 0.24, 0.12, 0.06, 0.03];

export function createWorld(D) {
  const W = { D };
  W.prefs = D.prefs;
  W.byName = new Map(D.prefs.map((p) => [p.name, p]));
  W.nat = D.national;
  W.avg = D.national.averages;
  W.model = D.model;
  W.pref = (name) => W.byName.get(name);

  W.q = (prefName, sex, age) => {
    const p = W.byName.get(prefName);
    return p.lt[sex].q[Math.min(110, Math.max(0, Math.floor(age)))];
  };
  W.survival = (prefName, sex) => {
    const q = W.byName.get(prefName).lt[sex].q;
    const l = [1];
    for (let a = 0; a < 110; a++) l.push(l[a] * (1 - q[a]));
    return l;
  };
  W.lifeExp = (prefName, sex) => W.byName.get(prefName).lt[sex].e0;

  // ------- 出生地の抽選
  W.drawPref = (rng, mode) => {
    const pairs = D.prefs.map((p) => [p.name, mode === 'population' ? p.popShare : p.birthShare]);
    return rng.weighted(pairs);
  };

  // ------- 死因
  const bands = D.causes.bands;
  W.causeRow = (sex, age) => {
    let i = 0;
    for (let k = 0; k < bands.length; k++) if (age >= bands[k]) i = k;
    return D.causes[sex][i];
  };
  W.causeLabel = (c) => D.causes.labels[c] || c;

  // ------- 地域の係数
  const natTax = W.avg.taxableIncomePerTaxpayer;
  W.incomeFactor = (prefName) => {
    const p = W.byName.get(prefName);
    return Math.pow(p.v.taxableIncomePerTaxpayer / natTax, D.model.earnings.prefFactorExponent);
  };
  W.suicideFactor = (prefName) => W.byName.get(prefName).v.suicideRate / W.avg.suicideRate;
  W.trafficFactor = (prefName) => W.byName.get(prefName).v.trafficDeathsPer100k / W.avg.trafficDeathsPer100k;
  W.divorceFactor = (prefName) => Math.pow(W.byName.get(prefName).v.divorceRate / W.avg.divorceRate, 0.8);
  W.marriageFactor = (prefName) => Math.pow(W.byName.get(prefName).v.marriedShareF15_64 / W.avg.marriedShareF15_64, 2.2);
  W.crimeFactor = (prefName) => W.byName.get(prefName).v.crimePer1000 / W.avg.crimePer1000;
  W.quakeAnnual = (prefName) => {
    const p30 = W.byName.get(prefName).quake30 / 100;
    return 1 - Math.pow(1 - p30, 1 / 30);
  };

  // ------- 大学等進学：県の進学率に平均が一致する切片を解く
  W.univIntercept = {};
  for (const p of D.prefs) {
    const target = p.v.univEntryRate / 100;
    const f = (a) => {
      let s = 0;
      for (let q = 1; q <= 5; q++) for (let i = 0; i < Z.length; i++) s += sigmoid(a + UNIV_COEF.q * (q - 3) + UNIV_COEF.k * Z[i]) * ZW[i];
      return s / (5 * ZWS);
    };
    W.univIntercept[p.name] = solve(f, target, -6, 6);
  }

  // ------- 初婚：50歳時未婚割合と一致する強さ
  const never = D.national.marriage.neverMarriedAt50_2020;
  W.marriageC = {};
  for (const sx of ['M', 'F']) {
    let S = 0;
    for (let a = 18; a < 50; a++) S += marriageShape(sx, a);
    W.marriageC[sx] = -Math.log(never[sx] / 100) / S;
  }
  W.marriageHazard = (sex, age, prefName) =>
    clamp(W.marriageC[sex] * marriageShape(sex, age) * W.marriageFactor(prefName), 0, 0.6);
  W.meanFirstMarriageAge = (sex) => {
    let surv = 1, m = 0, tot = 0;
    for (let a = 18; a < 60; a++) {
      const h = W.marriageC[sex] * marriageShape(sex, a);
      const p = surv * h; m += p * (a + 0.5); tot += p; surv *= 1 - h;
    }
    return m / tot;
  };

  // ------- 出生：県の合計特殊出生率に一致する強さ
  const oow = D.model.family.outOfWedlockBirthShare;
  W.fertK = {};
  for (const p of D.prefs) {
    const tfr = p.v.tfr;
    const f = (k) => {
      // 女性ひとりの期待出生数（死亡・離婚は無視した近似）
      let single = 1; const par = new Array(8).fill(0); // 既婚者のparity分布
      let births = 0;
      for (let a = 15; a < 50; a++) {
        const h = W.marriageHazard('F', a, p.name);
        const newly = single * h; single -= newly; par[0] += newly;
        const g = fertShape(a) * k;
        for (let n = 6; n >= 0; n--) {
          const b = par[n] * clamp(g * PARITY[Math.min(n, PARITY.length - 1)], 0, 0.9);
          par[n] -= b; par[n + 1] += b; births += b;
        }
      }
      return births / (1 - oow);
    };
    W.fertK[p.name] = solve(f, tfr, 0.01, 3);
  }
  // 離婚・死別で結婚が途切れる分を補う係数（シミュレーションで合計特殊出生率に合わせた値）
  const FERT_ADJ = 1.25;
  W.fertHazard = (womanAge, parity, prefName) =>
    clamp(FERT_ADJ * W.fertK[prefName] * fertShape(womanAge) * PARITY[Math.min(parity, PARITY.length - 1)], 0, 0.9);

  // ------- 年齢別の都道府県間移動
  const mig = D.model.migration.annualByAge;
  const migAges = Object.keys(mig).map(Number).sort((a, b) => a - b);
  W.migrationRate = (age) => {
    let lo = migAges[0];
    for (const a of migAges) if (age >= a) lo = a;
    const i = migAges.indexOf(lo);
    const hi = migAges[i + 1];
    if (hi === undefined) return mig[lo];
    const t = (age - lo) / (hi - lo);
    return mig[lo] * (1 - t) + mig[hi] * t;
  };
  // 移り住む先：人口×転入超過の強さ×近さ
  W.drawDestination = (rng, from, reason) => {
    const fp = W.byName.get(from);
    const pairs = D.prefs.filter((p) => p.name !== from).map((p) => {
      let w = p.popShare * Math.exp(4 * p.v.netMigrationRate);
      if (p.region === fp.region) w *= 3.2;
      if (reason === 'univ') w = p.popShare * Math.pow(p.v.univCapacityIndex / 100, 1.6) * (p.region === fp.region ? 3 : 1);
      return [p.name, w];
    });
    return rng.weighted(pairs);
  };

  // ------- 賃金カーブ
  const ai = D.model.earnings.ageIndex;
  const idx = (sex, age) => {
    const pts = Object.keys(ai[sex]).map(Number).sort((a, b) => a - b);
    let lo = pts[0];
    for (const a of pts) if (age >= a) lo = a;
    const i = pts.indexOf(lo); const hi = pts[i + 1];
    if (hi === undefined) return ai[sex][lo];
    const t = (age - lo) / (hi - lo);
    return ai[sex][lo] * (1 - t) + ai[sex][hi] * t;
  };
  // 一般労働者の全年齢平均が賃金センサスの値になるよう、22〜64歳の平均指数で割る
  const meanIdx = {};
  for (const sx of ['M', 'F']) { let s = 0; for (let a = 22; a <= 64; a++) s += idx(sx, a); meanIdx[sx] = s / 43; }
  const annual = D.national.wages2024.annualAllAges;
  // 学歴・職業・個人差の係数をかけた後の平均が賃金センサスの値に戻るよう、シミュレーションで測った補正
  const WAGE_CAL = { M: 0.8, F: 0.83 };
  W.baseWage = (sex, age) => annual[sex] * idx(sex, age) / meanIdx[sex] * WAGE_CAL[sex];

  return W;
}

export { sigmoid, clamp };
