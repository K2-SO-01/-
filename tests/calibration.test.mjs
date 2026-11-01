// 1000人ずつシミュレーションして、県別の平均寿命・進学率・出生・収入などが元の統計からずれていないかを確かめる
//   npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../assets/js/engine/rng.js';
import { createLife, beginYear, nextYear, answer } from '../assets/js/engine/life.js';
import { drawSurname, drawGivenName } from '../assets/js/engine/names.js';
import { loadWorld, runMany, summarizeLives } from './sim.mjs';

const W = loadWorld();
const N = Number(process.env.SIM_N || 1000);
const near = (actual, expected, tol, label) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: シミュレーション ${actual.toFixed(3)} / 統計 ${expected.toFixed(3)}（許容 ±${tol}）`);

test('出生地の抽選は都道府県別の出生数の割合にしたがう', () => {
  const R = new Rng('lottery');
  const n = 40000;
  const cnt = {};
  for (let i = 0; i < n; i++) { const p = W.drawPref(R, 'births'); cnt[p] = (cnt[p] || 0) + 1; }
  assert.equal(Object.keys(cnt).length, 47, '47都道府県すべてに生まれうる');
  for (const p of W.prefs) {
    const sd = Math.sqrt(p.birthShare * (1 - p.birthShare) / n);
    near((cnt[p.name] || 0) / n, p.birthShare, 4.5 * sd + 1e-4, `${p.name}の出生割合`);
  }
  // 人口で抽選するモード
  const R2 = new Rng('lottery2');
  let tokyo = 0;
  for (let i = 0; i < n; i++) if (W.drawPref(R2, 'population') === '東京都') tokyo++;
  near(tokyo / n, W.pref('東京都').popShare, 0.006, '人口モードの東京都の割合');
});

test('生命表：県別の死亡確率から計算した平均寿命が、都道府県別生命表の値と一致する', () => {
  for (const p of W.prefs) {
    near(p.lt.M.e0, p.v.lifeExpectancyM, 0.02, `${p.name} 男`);
    near(p.lt.F.e0, p.v.lifeExpectancyF, 0.02, `${p.name} 女`);
  }
});

let national;
test(`全国：${N}人をシミュレーション（出生数で抽選）`, () => {
  const lives = runMany(W, N, { seedPrefix: 'nat' });
  national = summarizeLives(W, lives);
  const s = national;
  const lt = W.nat.lifeTablePrefWeighted;
  near(s.e0.M, lt.M.e0, 1.5, '平均寿命（男）');
  near(s.e0.F, lt.F.e0, 1.5, '平均寿命（女）');
  near(s.s65.M, lt.M.s65, 0.04, '65歳まで生きる割合（男）');
  near(s.s90.F, lt.F.s90, 0.07, '90歳まで生きる割合（女）');
  // 進学率（高校卒業者の大学等進学率を出生数で重みづけた全国の目安）
  let tgt = 0, w = 0;
  for (const p of W.prefs) { tgt += p.v.univEntryRate * p.births; w += p.births; }
  near(s.univRate, (tgt / w) / 100, 0.07, '大学等への進学');
  near(s.everMarried50.M, 1 - W.nat.marriage.neverMarriedAt50_2020.M / 100, 0.06, '50歳までに結婚した割合（男）');
  near(s.everMarried50.F, 1 - W.nat.marriage.neverMarriedAt50_2020.F / 100, 0.06, '50歳までに結婚した割合（女）');
  near(s.childrenPerWoman45, W.nat.tfr2025, 0.2, '女性1人あたりの子どもの数（合計特殊出生率）');
  const wages = W.nat.wages2024.annualAllAges;
  near(s.fullTimeIncome.M / wages.M, 1, 0.12, '正社員の平均年収（男）/ 賃金センサス');
  near(s.fullTimeIncome.F / wages.F, 1, 0.12, '正社員の平均年収（女）/ 賃金センサス');
  assert.ok(s.divorceShare > 0.18 && s.divorceShare < 0.45, `結婚した人のうち離婚を経験する割合 ${s.divorceShare}`);
  const c = s.causes;
  assert.ok(c.cancer > 17 && c.cancer < 29, `死因：がん ${c.cancer}%（全国 23.9%）`);
  assert.ok(c.heart > 9 && c.heart < 20, `死因：心疾患 ${c.heart}%（全国 14.1%）`);
  assert.ok(c.senility > 7 && c.senility < 19, `死因：老衰 ${c.senility}%（全国 12.9%）`);
  assert.ok((c.suicide || 0) > 0.5 && (c.suicide || 0) < 2.5, `死因：自殺 ${c.suicide}%`);
});

for (const pref of ['東京都', '秋田県', '沖縄県']) {
  test(`${pref}：${N}人をシミュレーション`, () => {
    const lives = runMany(W, N, { pref, seedPrefix: pref });
    const s = summarizeLives(W, lives);
    const p = W.pref(pref);
    // 移り住んだ人は移住先の生命表になるため、許容を少し広めにとる
    near(s.e0.M, p.v.lifeExpectancyM, 1.8, `${pref} 平均寿命（男）`);
    near(s.e0.F, p.v.lifeExpectancyF, 1.8, `${pref} 平均寿命（女）`);
    const stay = lives.filter((l) => l.deathAge >= 19 && l.hist.pref[17] === pref);
    const ur = stay.filter((l) => ['univ', 'grad', 'jc'].includes(l.edu.level) || l.edu.stage === 'univ').length / stay.length;
    near(ur, p.v.univEntryRate / 100, 0.07, `${pref} 大学等進学率`);
    near(s.childrenPerWoman45, p.v.tfr, 0.25, `${pref} 子どもの数 / 合計特殊出生率`);
    p._sim = s;
  });
}

test('収入の県差：東京都は秋田県より高い（課税対象所得の差の向き）', () => {
  const t = W.pref('東京都')._sim, a = W.pref('秋田県')._sim;
  assert.ok(t && a);
  assert.ok(t.fullTimeIncome.M > a.fullTimeIncome.M * 1.15, `東京 ${t.fullTimeIncome.M} / 秋田 ${a.fullTimeIncome.M}`);
});

test('名字と名前：県の上位の名字が出やすく、読みがつく', () => {
  const R = new Rng('names');
  const ok = { 沖縄県: ['比嘉', '金城', '大城', '宮城', '上原'], 宮崎県: ['黒木', '甲斐', '河野', '日高', '佐藤'] };
  for (const [pref, top] of Object.entries(ok)) {
    let hit = 0;
    for (let i = 0; i < 3000; i++) { const [s, r] = drawSurname(W, R, pref); assert.ok(r, `${s} の読み`); if (top.includes(s)) hit++; }
    assert.ok(hit / 3000 > 0.08, `${pref}で上位5姓が出る割合 ${hit / 3000}`);
  }
  for (let i = 0; i < 500; i++) { const [k, r] = drawGivenName(W, R, i % 2 ? 'M' : 'F'); assert.ok(k && r); }
});

test('同じ種なら同じ人生。途中で保存して再開しても同じ続きになる', () => {
  const run = (L) => { beginYear(W, L); let g = 0; while (L.alive && g++ < 300) { while (L.pending) answer(W, L, 0, {}); if (L.yearDone && L.alive) nextYear(W, L); } return L; };
  const a = run(createLife(W, { seed: 'same', auto: true }));
  const b = run(createLife(W, { seed: 'same', auto: true }));
  assert.equal(a.deathAge, b.deathAge);
  assert.equal(a.log.length, b.log.length);
  // 30歳で保存 → 復元して続きを生きる
  const c = createLife(W, { seed: 'same', auto: true });
  beginYear(W, c);
  let g = 0;
  while (c.alive && c.age < 30 && g++ < 300) { while (c.pending) answer(W, c, 0, {}); if (c.yearDone && c.alive && c.age < 30) nextYear(W, c); }
  const d = JSON.parse(JSON.stringify(c));
  g = 0;
  while (d.alive && g++ < 300) { while (d.pending) answer(W, d, 0, {}); if (d.yearDone && d.alive) nextYear(W, d); }
  assert.equal(d.deathAge, a.deathAge);
  assert.equal(d.deathCause, a.deathCause);
});
