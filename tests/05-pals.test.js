const { T0, fresh, solve, answerN } = require('./helpers');
const G = MF.Game, F = MF.Factory, P = MF.Pals;

test('正解を続けると卵が手に入り（14問で必ず）、正解で孵化が進む', () => {
  const s = fresh();
  answerN(s, 14);
  assert(s.pals.eggs.length >= 1);
  const e = s.pals.eggs[0];
  answerN(s, e.need);
  assert(P.readyEggs(s).length >= 1);
  const r = P.hatch(s, e.id, T0);
  assert(r && r.pal && r.sp);
  assert.strictEqual(s.pals.list.length, 1);
  assert.strictEqual(s.pals.dex[r.sp.id].n, 1);
});
test('卵の分野に合った相棒が生まれる（エピック以外）', () => {
  for (let seed = 1; seed < 60; seed++) {
    const s = fresh(seed);
    const sp = P.rollSpecies(s, 'trig', 0);
    assert(sp.rarity === 3 || sp.topic === 'trig', sp.id);
  }
});
test('相棒は同じ分野の正解で大きく育つ', () => {
  const s = fresh();
  s.pals.list.push({ id: 100, sp: 'sainami', name: 'A', lvl: 1, xp: 0, topic: 'trig', at: null });
  s.pals.list.push({ id: 101, sp: 'parabon', name: 'B', lvl: 1, xp: 0, topic: 'quad', at: null });
  answerN(s, 6, { q: { topic: 'trig' } });
  const a = P.get(s, 100), b = P.get(s, 101);
  assert(a.lvl > b.lvl || (a.lvl === b.lvl && a.xp > b.xp));
  assert(a.lvl >= 2);
});
test('採掘の得意な相棒を採掘機に置くと速くなる。撤去すると配置が外れる', () => {
  const s = fresh();
  s.inv.iron = 100; s.inv.stone = 100;
  const f = s.factory;
  const k = f.ore.findIndex((o, i) => o && !f.cells[i]);
  const x = k % f.w, y = Math.floor(k / f.w);
  const m = F.place(s, 'miner', x, y, 0).b;
  s.pals.list.push({ id: 7, sp: 'choten', name: 'C', lvl: 5, xp: 0, topic: 'quad', at: null });
  const base = F.buildingSpeed(s, m, 1);
  assert(P.assign(s, 7, m.id));
  const fast = F.buildingSpeed(s, m, 1);
  assert(fast > base * 1.3, base + ' -> ' + fast);
  F.remove(s, m.id);
  assert.strictEqual(P.get(s, 7).at, null);
});
test('発電が得意な相棒をコアに置くと発電量が増える', () => {
  const s = fresh();
  const core = Object.values(s.factory.b).find((b) => b.type === 'core');
  const p0 = F.computePower(s, 0.25, false).supply;
  s.pals.list.push({ id: 9, sp: 'eriaru', name: 'E', lvl: 1, xp: 0, topic: 'integ', at: null });
  P.assign(s, 9, core.id);
  const p1 = F.computePower(s, 0.25, false).supply;
  assert(p1 > p0);
});
test('相棒は全21種、見た目のパーツと得意作業が設定されている', () => {
  assert.strictEqual(P.SPECIES.length, 21);
  for (const sp of P.SPECIES) { assert(sp.look && sp.look.body && Object.keys(sp.work).length); }
});
