// data-raw/ の各ファイルから data/japan.json を組み立てる。
//   node scripts/build-data.mjs
// - 生命表：社人研 JMD の県別・男女別・1歳刻み死亡率（2015〜2019年平均）を平滑化し、
//   令和2年都道府県別生命表の平均寿命（e-Stat 社会・人口統計体系）に一致するよう比例調整する。
// - それ以外の値は、出典情報と一緒に indicators / sources に記録する。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = (f) => JSON.parse(readFileSync(join(ROOT, 'data-raw', f), 'utf8'));

const estat = raw('estat_dashboard_prefs.json');
const popRaw = raw('population_prefs.json');
const jmd = raw('jmd_mx_2015_2019.json');
const manual = raw('manual.json');
const names = raw('names.json');
const prefsBase = raw('prefs.json').list;
const model = raw('model.json');

const PREF_NAMES = prefsBase.map((p) => p.name);
const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------- sources
const sources = {};
function src(id, o) { sources[id] = { id, ...o }; return id; }

src('estat_dash', {
  title: 'e-Stat 統計ダッシュボード／社会・人口統計体系（都道府県データ）',
  publisher: '総務省統計局ほか（各指標の作成府省）',
  url: 'https://dashboard.e-stat.go.jp/',
  via: estat._meta.retrieved_via,
});
src('pop2025', {
  title: '総人口（各年10月1日現在）2025年（速報）', publisher: '総務省統計局「国勢調査／人口推計」',
  url: 'https://www.stat.go.jp/data/jinsui/', year: 2025, scope: 'prefecture', via: popRaw._meta.retrieved_via,
  note: 'e-Stat 統計ダッシュボード 系列コード 0201010000000010000（isProvisional=1）',
});
src('births2024', { ...pick(manual.birthsByPref2024, ['title', 'source', 'url', 'via', 'year', 'scope']), publisher: manual.birthsByPref2024.source });
src('jmd', {
  title: '日本版死亡データベース（JMD）都道府県別 Death Rates (period 1x1)', publisher: '国立社会保障・人口問題研究所',
  url: jmd._meta.url, year: '2015-2019', scope: 'prefecture', via: jmd._meta.retrieved_via,
  note: '2015〜2019年の年齢別死亡率の5年平均を平滑化し、令和2年都道府県別生命表の平均寿命に一致させて使用',
});
src('lifetable_pref2020', {
  title: '令和2年都道府県別生命表（平均余命 0歳）', publisher: '厚生労働省',
  url: 'https://www.mhlw.go.jp/toukei/saikin/hw/life/tdfk20/index.html', year: 2020, scope: 'prefecture',
  via: estat._meta.retrieved_via + '（社会・人口統計体系 0203090101000010010 / 0203090201000010010）',
});
const nat = manual.national;
src('vital2025', { title: nat.vital2025.title, publisher: nat.vital2025.source, url: nat.vital2025.url, via: nat.vital2025.via, year: 2025, scope: 'national' });
src('lifetable2024', { title: nat.lifeTable2024.title, publisher: nat.lifeTable2024.source, url: nat.lifeTable2024.url, year: 2024, scope: 'national' });
src('causes2024', { title: nat.deathsByCause2024.title, publisher: nat.deathsByCause2024.source, url: nat.deathsByCause2024.url, year: 2024, scope: 'national' });
src('suicide2024', { title: nat.suicide2024.title, publisher: nat.suicide2024.source, url: nat.suicide2024.url, via: nat.suicide2024.via, year: 2024, scope: 'national' });
src('wages2024', { title: nat.wages2024.title, publisher: nat.wages2024.source, url: nat.wages2024.url, via: nat.wages2024.via, year: 2024, scope: 'national' });
src('household2025', { title: nat.household2025.title, publisher: nat.household2025.source, url: nat.household2025.url, via: nat.household2025.via, year: 2025, scope: 'national' });
src('health2024', { title: nat.health2024.title, publisher: nat.health2024.source, url: nat.health2024.url, via: nat.health2024.via, year: 2024, scope: 'national' });
src('cancer', { title: nat.cancerRisk.title, publisher: nat.cancerRisk.source, url: nat.cancerRisk.url, via: nat.cancerRisk.via, year: '2018/2019', scope: 'national' });
src('dementia', { title: nat.dementiaPrevalence.title, publisher: nat.dementiaPrevalence.source, url: nat.dementiaPrevalence.url, year: 2012, scope: 'national', verified: false });
src('violence2023', { title: nat.violence2023.title, publisher: nat.violence2023.source, url: nat.violence2023.url, via: nat.violence2023.via, year: 2023, scope: 'national' });
src('marriage', { title: '婚姻（夫の氏・平均初婚年齢・50歳時の未婚割合）', publisher: '厚生労働省 人口動態統計／国立社会保障・人口問題研究所 人口統計資料集', url: nat.marriage.neverMarriedAt50_2020.url, scope: 'national', note: '夫の氏 2023年 94.45%、平均初婚年齢 2019年、50歳時未婚割合 2020年（未照合）' });
src('migration2025', { title: nat.migration2025.title, publisher: nat.migration2025.source, url: nat.migration2025.url, year: 2025, scope: 'national' });
src('pension2024', { title: nat.pension2024.title, publisher: nat.pension2024.source, url: nat.pension2024.url, via: nat.pension2024.via, year: 2024, scope: 'national' });
src('industry2020', { ...pick(manual.industryShares2020, ['title', 'url', 'via', 'year', 'scope']), publisher: manual.industryShares2020.source, note: manual.industryShares2020.derivedNote });
src('quake', { title: manual.earthquake30y.title, publisher: manual.earthquake30y.source, url: manual.earthquake30y.url, via: manual.earthquake30y.via, scope: 'prefecture', note: manual.earthquake30y.missingNote });
src('surname_pref', { title: manual.surnamesTop5.title, publisher: manual.surnamesTop5.source, url: manual.surnamesTop5.url, scope: 'prefecture', estimated: true, note: manual.surnamesTop5.note + '。' + manual.surnamesTop5.extendedSource });
src('surname_top1', { title: manual.surnameTop1Approx.title, publisher: manual.surnameTop1Approx.source, url: manual.surnameTop1Approx.url, scope: 'prefecture', estimated: true, note: manual.surnameTop1Approx.note });
src('surname_nat', { title: manual.nationalSurnames.title, publisher: manual.nationalSurnames.source, url: manual.nationalSurnames.url, scope: 'national', estimated: true, note: manual.nationalSurnames.note });
src('names2025', { title: manual.givenNames2025.title, publisher: manual.givenNames2025.source, url: manual.givenNames2025.url, via: manual.givenNames2025.via, year: 2025, scope: 'national', note: manual.givenNames2025.countsNote });
src('names_common', { title: 'ランキング外の一般的な名前と読み・親世代の名前の例', publisher: '作者作成', scope: 'national', estimated: true, note: names.givenNamesCommon.note + '。' + names.parentGenerationNames.note });
src('map', { title: '日本地図（都道府県）', publisher: 'Victor Cazanave「svg-maps」@svg-maps/japan（CC BY 4.0）', url: 'https://github.com/VictorCazanave/svg-maps/tree/master/packages/japan' });
src('model', { title: 'このゲームの推計・仮定（死因の年齢別構成、賃金カーブ、進学・婚姻・出生・移動のモデルなど）', publisher: '作者', estimated: true, note: model._meta.note });

function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; }

// ---------------------------------------------------------------- indicators
// 各指標の「出典・調査年・県別か全国値か・推計かどうか」をここで一元管理する
const indicators = {};
function ind(key, o) { indicators[key] = o; }

const E = estat.indicators;
const estatMap = {
  lifeExpectancyM: ['平均寿命（男）', '歳'], lifeExpectancyF: ['平均寿命（女）', '歳'],
  prefIncomePerCapita: ['1人当たり県民所得', '千円'], taxableIncomePerTaxpayer: ['課税対象所得（納税義務者1人当たり）', '千円'],
  minimumWage: ['地域別最低賃金', '円/時'], workerHouseholdMonthlyIncome: ['勤労者世帯の実収入（月）', '円'],
  householdSavings: ['二人以上世帯の貯蓄現在高', '千円'], welfareHouseholdsPer1000: ['生活保護被保護世帯（一般世帯千当たり）', '世帯'],
  homeOwnershipRate: ['持ち家比率', '%'], rentPer3_3m2: ['民営賃貸住宅の家賃（3.3㎡・月）', '円'], priceIndex: ['消費者物価地域差指数', '全国=100'],
  highSchoolEntryRate: ['中学校卒業者の進学率（通信制を除く）', '%'], univEntryRate: ['高校卒業者の大学等進学率', '%'],
  inPrefUnivShare: ['県内の大学への入学者割合（出身高校の県）', '%'], univCapacityIndex: ['大学収容力指数', ''],
  futokoPer1000JHS: ['中学校の不登校（生徒千人当たり）', '人'], tfr: ['合計特殊出生率', ''], marriageRate: ['婚姻率（人口千対）', ''],
  divorceRate: ['離婚率（人口千対）', ''], marriedShareF15_64: ['有配偶者割合（15〜64歳・女）', '%'], suicideRate: ['自殺死亡率（人口10万対）', ''],
  crimePer1000: ['刑法犯認知件数（人口千人当たり）', '件'], trafficDeathsPer100k: ['交通事故死者数（人口10万人当たり）', '人'],
  doctorsPer100k: ['医師数（人口10万人当たり）', '人'], generalBedsPer100k: ['一般病床数（人口10万人当たり）', '床'],
  unemploymentRate: ['完全失業率', '%'], jobOpeningsRatio: ['有効求人倍率', '倍'], femaleLaborForceRate: ['労働力人口比率（女）', '%'],
  netMigrationRate: ['転入超過率', '%'], popChangeRate: ['人口増減率', '%'], aged65Share: ['65歳以上人口の割合', '%'], under15Share: ['15歳未満人口の割合', '%'],
  childAbusePer100kChildren: ['児童虐待相談対応件数（0〜14歳10万人当たり）', '件'], nursingHomeCapacityPer1000Aged: ['老人ホーム定員（65歳以上千人当たり）', '人'],
  elderlyWorkerShare: ['高齢就業者割合（65歳以上）', '%'], commuteMinutesM: ['通勤・通学時間（男・平均）', '分'], volunteerRate: ['ボランティア活動の行動者率', '%'],
  sportsRate: ['スポーツの年間行動者率', '%'], learningRate: ['学習・自己啓発の行動者率', '%'], foreignResidentShare: ['外国人人口の割合', '%'],
  waitlistChildrenPer100k: ['保育所の待機児童（0〜14歳10万人当たり）', '人'], firesPer100k: ['火災出火件数（人口10万人当たり）', '件'],
};
for (const [k, [label, unit]] of Object.entries(estatMap)) {
  const e = E[k];
  ind(k, { label, unit: unit || e.unit, source: k.startsWith('lifeExpectancy') ? 'lifetable_pref2020' : 'estat_dash', stat: e.stat, code: e.code, year: e.year, scope: 'prefecture', note: e.note || undefined });
}
ind('population', { label: '総人口', unit: '人', source: 'pop2025', year: 2025, scope: 'prefecture' });
ind('births', { label: '年間出生数', unit: '人', source: 'births2024', year: 2024, scope: 'prefecture' });
ind('industry', { label: '産業3部門別就業者割合（第1次・第2次・第3次）', unit: '%', source: 'industry2020', year: 2020, scope: 'prefecture' });
ind('quake30', { label: '30年以内に震度6弱以上の揺れに見舞われる確率', unit: '%', source: 'quake', year: '2024（一部2020）', scope: 'prefecture' });
ind('lifeTable', { label: '年齢別死亡確率（生命表）', unit: '', source: 'jmd', year: '2015-2019→2020', scope: 'prefecture', estimated: true, reason: '県別生命表の年齢別死亡率を直接取得できなかったため、JMD の県別死亡率（2015〜2019年平均）を平滑化し、令和2年都道府県別生命表の平均寿命に一致するよう比例調整' });
ind('surnames', { label: '名字（県内上位）', unit: '', source: 'surname_pref', scope: 'prefecture', estimated: true, reason: '人数が非公開のため順位から割合を推計' });

// ---------------------------------------------------------------- life tables
const ages = [...Array(111).keys()];
const pop2025 = popRaw.population['2025'];
const totalPop = PREF_NAMES.reduce((s, p) => s + pop2025[p].value, 0);

function cleanMx(arr) {
  // 欠損・0 を近傍で埋める
  const out = arr.map((v) => (v == null ? NaN : v));
  for (let a = 0; a < out.length; a++) if (!(out[a] > 0)) out[a] = NaN;
  return out;
}
const natMx = { M: [], F: [] };
for (const sx of ['M', 'F']) {
  for (const a of ages) {
    let s = 0, w = 0;
    for (const p of PREF_NAMES) {
      const v = jmd.mx[p][sx][a];
      if (v != null && v > 0) { const wt = pop2025[p].value; s += v * wt; w += wt; }
    }
    natMx[sx][a] = w ? s / w : NaN;
  }
  // 高齢の端は単調増加にそろえる
  for (let a = 86; a <= 110; a++) {
    if (!(natMx[sx][a] >= natMx[sx][a - 1])) natMx[sx][a] = natMx[sx][a - 1] * 1.08;
    natMx[sx][a] = Math.min(natMx[sx][a], 1.5);
  }
}

function smoothRatio(prefMx, nmx) {
  const lr = ages.map((a) => {
    const v = prefMx[a];
    if (!(v > 0) || !(nmx[a] > 0)) return NaN;
    return Math.log(v / nmx[a]);
  });
  const out = new Array(111).fill(0);
  for (const a of ages) {
    let w0, shrink;
    if (a === 0) { w0 = 0.01; shrink = 0.6; }
    else if (a < 30) { w0 = 6; shrink = 0.5; }
    else if (a < 90) { w0 = 2.5; shrink = 1; }
    else { w0 = 3; shrink = 1; }
    if (a >= 95) continue;
    let s = 0, w = 0;
    for (let b = Math.max(a === 0 ? 0 : 1, a - 15); b <= Math.min(94, a + 15); b++) {
      if (a !== 0 && b === 0) continue;
      if (a === 0 && b !== 0) continue;
      if (!Number.isFinite(lr[b])) continue;
      const wt = Math.exp(-0.5 * ((a - b) / w0) ** 2);
      s += lr[b] * wt; w += wt;
    }
    out[a] = w ? (s / w) * shrink : 0;
  }
  let tail = 0, n = 0;
  for (let a = 85; a <= 94; a++) { tail += out[a]; n++; }
  for (let a = 95; a <= 110; a++) out[a] = tail / n;
  return out;
}

function qFromMx(mx) {
  return mx.map((m, a) => (a === 110 ? 1 : a === 0 ? m / (1 + 0.9 * m) : 1 - Math.exp(-m)));
}
function lifeStats(q) {
  let l = 1, T = 0; const lx = [];
  for (const a of ages) {
    lx[a] = l;
    const d = l * q[a];
    let L;
    if (a === 0) L = l - 0.9 * d; else if (a === 110) L = l * 1.0; else L = l - 0.5 * d;
    T += L; l -= d;
  }
  const surv = (x) => lx[x];
  let median = 0;
  for (const a of ages) if (lx[a] >= 0.5 && lx[a + 1] < 0.5) median = a + (lx[a] - 0.5) / (lx[a] - lx[a + 1]);
  // e65
  const ex = (x) => { let t = 0; for (let a = x; a <= 110; a++) { const d = lx[a] * q[a]; t += a === 110 ? lx[a] : lx[a] - 0.5 * d; } return t / lx[x]; };
  return { e0: T, s65: surv(65), s75: surv(75), s90: surv(90), median, e65: ex(65), e75: ex(75), lx };
}
function calibrate(mxBase, target) {
  let lo = 0.3, hi = 3;
  for (let i = 0; i < 60; i++) {
    const k = (lo + hi) / 2;
    const e0 = lifeStats(qFromMx(mxBase.map((m) => m * k))).e0;
    if (e0 > target) lo = k; else hi = k;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------- prefectures
const births = manual.birthsByPref2024.values;
const totalBirths = Object.values(births).reduce((a, b) => a + b, 0);
const quakeVals = { ...manual.earthquake30y.values2020, ...manual.earthquake30y.values2024 };
const quakeKnown = Object.values(quakeVals).sort((a, b) => a - b);
const quakeMedian = quakeKnown[Math.floor(quakeKnown.length / 2)];

const readings = names.surnameReadings;
function reading(s) { return readings[s] || null; }

const top1 = manual.surnameTop1Approx.values;
const prefs = prefsBase.map((b) => {
  const name = b.name;
  const v = {};
  for (const k of Object.keys(estatMap)) v[k] = E[k].values[name];
  const lt = {};
  const lifeCheck = {};
  for (const sx of ['M', 'F']) {
    const pm = cleanMx(jmd.mx[name][sx]);
    const lr = smoothRatio(pm, natMx[sx]);
    const base = natMx[sx].map((m, a) => m * Math.exp(lr[a]));
    const target = sx === 'M' ? v.lifeExpectancyM : v.lifeExpectancyF;
    const k = calibrate(base, target);
    const q = qFromMx(base.map((m) => m * k));
    const st = lifeStats(q);
    lt[sx] = { q: q.map((x) => Number(x.toPrecision(5))), e0: round(st.e0, 2), e65: round(st.e65, 2), s65: round(st.s65, 4), s75: round(st.s75, 4), s90: round(st.s90, 4), median: round(st.median, 2) };
    lifeCheck[sx] = { k: round(k, 4), target };
  }
  // 名字（県内上位）
  const list = (manual.surnamesTop5.extended[name] || manual.surnamesTop5.values[name]);
  const knownTop1 = top1[name] ? top1[name] / pop2025[name].value : null;
  const s1 = knownTop1 ?? (name === '沖縄県' ? 0.026 : 0.025);
  const surnames = list.map((s, i) => [s, reading(s), round(s1 * Math.pow(i + 1, -0.6), 5)]);
  const quake = quakeVals[name];
  return {
    code: b.code, name, short: b.short, region: b.region, capital: b.capital, mapId: b.mapId,
    festival: b.festival, food: b.food, nature: b.nature,
    population: pop2025[name].value, births: births[name],
    birthShare: round(births[name] / totalBirths, 6), popShare: round(pop2025[name].value / totalPop, 6),
    v,
    industry: manual.industryShares2020.values[name],
    quake30: quake ?? quakeMedian, quakeEstimated: quake == null,
    lt, lifeCheck,
    surnames, surnameTop1Known: knownTop1 != null,
  };
});

// 全国平均（出生数で重み付け）の指標
function weighted(key, weightKey = 'births') {
  let s = 0, w = 0;
  for (const p of prefs) { const x = p.v[key]; if (x == null) continue; s += x * p[weightKey]; w += p[weightKey]; }
  return round(s / w, 3);
}
const nationalAvg = {};
for (const k of Object.keys(estatMap)) nationalAvg[k] = weighted(k, 'population');

// 全国の生命表（県別生命表の出生数加重平均の死亡確率）
const natLt = {};
for (const sx of ['M', 'F']) {
  const q = ages.map((a) => prefs.reduce((s, p) => s + p.lt[sx].q[a] * p.population, 0) / totalPop);
  const st = lifeStats(q);
  natLt[sx] = { q: q.map((x) => Number(x.toPrecision(5))), e0: round(st.e0, 2), e65: round(st.e65, 2), s65: round(st.s65, 4), s75: round(st.s75, 4), s90: round(st.s90, 4), median: round(st.median, 2) };
}

// ---------------------------------------------------------------- names
function surnameNationalWeight(rank) {
  const top = manual.nationalSurnames.top10Approx;
  const order = names.nationalSurnameOrder;
  if (rank <= 10) return top[order[rank - 1]];
  if (rank <= 100) return 860000 * Math.pow(rank / 10, -0.68);
  return 180000 * Math.pow(rank / 100, -0.95);
}
const nationalSurnames = names.nationalSurnameOrder.map((s, i) => [s, reading(s), Math.round(surnameNationalWeight(i + 1))]);
const missingReadings = [...new Set([...nationalSurnames.map((x) => x[0]), ...prefs.flatMap((p) => p.surnames.map((x) => x[0]))])].filter((s) => !reading(s));
if (missingReadings.length) throw new Error('読みのない名字: ' + missingReadings.join(','));

const okinawaExtra = [['安里', 'あさと'], ['石川', 'いしかわ'], ['仲村', 'なかむら'], ['喜屋武', 'きゃん'], ['東江', 'あがりえ'], ['具志堅', 'ぐしけん'], ['屋比久', 'やびく'], ['与那嶺', 'よなみね'], ['宮平', 'みやひら'], ['新里', 'しんざと'], ['外間', 'ほかま'], ['嘉数', 'かかず'], ['伊波', 'いは'], ['比屋根', 'ひやね'], ['糸数', 'いとかず'], ['大湾', 'おおわん'], ['仲間', 'なかま'], ['当山', 'とうやま']];

const rankW = (rank) => Math.pow(rank, -0.7);
function nameList(top, readMap) {
  return top.map(([n, r]) => [n, readMap[n], round(rankW(r), 4)]);
}
const givenNames = {
  boysTop: nameList(manual.givenNames2025.boys, names.givenNameReadings2025),
  girlsTop: nameList(manual.givenNames2025.girls, names.givenNameReadings2025),
  boysCommon: names.givenNamesCommon.boys.map(([n, r], i) => [n, [r], round(rankW(i + 11) , 4)]),
  girlsCommon: names.givenNamesCommon.girls.map(([n, r], i) => [n, [r], round(rankW(i + 12), 4)]),
  topMass: 0.18,
  parentsM: names.parentGenerationNames.parentsM, parentsF: names.parentGenerationNames.parentsF,
  grandM: names.parentGenerationNames.grandM, grandF: names.parentGenerationNames.grandF,
};

// ---------------------------------------------------------------- causes
const causes = model.causeOfDeath;
function normRow(row) { const s = Object.values(row).reduce((a, b) => a + b, 0); const o = {}; for (const [k, x] of Object.entries(row)) o[k] = round(x / s, 4); return o; }
const causeTable = { bands: causes.bands, labels: causes.labels, M: causes.M.map(normRow), F: causes.F.map(normRow) };

// ---------------------------------------------------------------- output
const out = {
  meta: {
    title: '47分の1 データ',
    generated: new Date().toISOString().slice(0, 10),
    description: '都道府県別・全国の公的統計と、それを補う推計。indicators に各指標の出典（sources の id）・調査年・県別/全国値・推計フラグを記録。',
    caveat: 'このデータはゲーム用のシミュレーションに使うもので、個人の将来を予測するものではありません。',
  },
  sources,
  indicators,
  national: {
    population2025: totalPop,
    births2025: nat.vital2025.births, deaths2025: nat.vital2025.deaths, marriages2025: nat.vital2025.marriages, divorces2025: nat.vital2025.divorces, tfr2025: nat.vital2025.tfr,
    lifeTable2024: nat.lifeTable2024,
    lifeTablePrefWeighted: natLt,
    deathsByCause2024: nat.deathsByCause2024,
    suicide2024: nat.suicide2024,
    wages2024: nat.wages2024,
    household2025: nat.household2025,
    health2024: nat.health2024,
    cancerRisk: nat.cancerRisk,
    dementiaPrevalence: nat.dementiaPrevalence.values,
    violence2023: nat.violence2023,
    marriage: nat.marriage,
    migration2025: nat.migration2025,
    pension2024: nat.pension2024,
    averages: nationalAvg,
    birthsTotalResident2024: totalBirths,
  },
  prefs,
  causes: causeTable,
  names: { nationalSurnames, rareSurnames: names.rareSurnames, okinawaExtra, given: givenNames, husbandSurnameShare: nat.marriage.husbandSurnameShare2023.value / 100 },
  model: { earnings: model.earnings, education: model.education, family: model.family, health: model.health, migration: model.migration, causeNote: { estimated: true, reason: causes.reason, constraints: causes.constraints } },
  hotlines: manual.hotlines,
};

const json = JSON.stringify(out);
writeFileSync(join(ROOT, 'data', 'japan.json'), json);
console.log('data/japan.json', (json.length / 1024).toFixed(0) + 'KB');
const show = (p) => `${p.name} M ${p.lt.M.e0}/${p.lifeCheck.M.target} (k=${p.lifeCheck.M.k}) F ${p.lt.F.e0}/${p.lifeCheck.F.target} (k=${p.lifeCheck.F.k})`;
for (const p of prefs.filter((_, i) => [0, 12, 26, 46, 4, 30].includes(i))) console.log(show(p));
console.log('national(pref-weighted) e0', natLt.M.e0, natLt.F.e0, 's65', natLt.M.s65, natLt.F.s65, 's90', natLt.M.s90, natLt.F.s90, 'median', natLt.M.median, natLt.F.median);
console.log('2024 簡易生命表', JSON.stringify(nat.lifeTable2024.e0), JSON.stringify(nat.lifeTable2024.survivalTo));
