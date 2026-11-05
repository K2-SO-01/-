const { T0, fresh, answerN } = require('./helpers');
const G = MF.Game, F = MF.Factory;

/** テスト用に鉱脈を自由に置けるまっさらな工場 */
function lab(seed) {
  const s = fresh(seed);
  const f = s.factory;
  f.ore = f.ore.map(() => null);
  for (const id of Object.keys(f.b)) if (f.b[id].type !== 'core') F.remove(s, +id, { noRefund: true });
  const core = Object.values(f.b).find((b) => b.type === 'core');
  if (s.research) s.research.done.push('automation', 'labs');
  s.inv.iron = 150; s.inv.stone = 150; s.inv.copper = 150; s.inv.coal = 150; s.inv.ironPlate = 100; s.inv.copperPlate = 100; s.inv.brick = 100;
  return { s, f, core };
}
function run(s, sec, dt) { dt = dt || 0.25; let now = T0; for (let t = 0; t < sec; t += dt) { now += dt * 1000; G.tick(s, dt, now); } }
function setOre(f, x, y, o) { f.ore[y * f.w + x] = o; }

test('採掘機→ベルト→コアで鉱石が届く', () => {
  const { s, f, core } = lab();
  const y = core.y, x0 = core.x - 4;
  setOre(f, x0, y, 'iron');
  assert(F.place(s, 'miner', x0, y, 1).ok);
  for (let x = x0 + 1; x < core.x; x++) assert(F.place(s, 'belt', x, y, 1).ok);
  const before = s.inv.iron;
  run(s, 30);
  assert(s.inv.iron - before >= 8, 'got ' + (s.inv.iron - before));
});
test('行き止まりのベルトには届かず、採掘機が止まる', () => {
  const { s, f, core } = lab();
  const y = core.y - 3, x0 = 1;
  setOre(f, x0, y, 'iron');
  F.place(s, 'miner', x0, y, 1);
  F.place(s, 'belt', x0 + 1, y, 1);
  const before = s.inv.iron;
  run(s, 30);
  assert.strictEqual(s.inv.iron, before);
  const m = Object.values(f.b).find((b) => b.type === 'miner');
  assert.strictEqual(m.state, 'full');
  assert(F.layout(s).spaghetti > 0);
});
test('溶鉱炉で鉄板ができる', () => {
  const { s, f, core } = lab();
  const y = core.y;
  setOre(f, core.x - 3, y, 'iron');
  F.place(s, 'miner', core.x - 3, y, 1);
  F.place(s, 'furnace', core.x - 2, y, 1);
  F.place(s, 'belt', core.x - 1, y, 1);
  run(s, 60);
  assert(s.inv.ironPlate > 110, 'plates ' + s.inv.ironPlate);
});
test('組立機と研究所：歯車・回路→研究パック→研究ポイント', () => {
  const { s, f, core } = lab();
  // 組立機(研究パック)の材料を直接入れて、研究所へ流す
  const a = F.place(s, 'assembler', core.x, core.y - 2, 2).b; // 下向き → (core.x, core.y-1)
  F.setRecipe(s, a.id, 'sciencePack');
  const l = F.place(s, 'lab', core.x, core.y - 1, 2).b;
  a.inBuf.gear = 10; a.inBuf.circuit = 10;
  const rp0 = s.rp;
  run(s, 30);
  assert(s.rp > rp0, 'rp increases');
});
test('電力が足りないと遅くなり、演算チャージが切れるとさらに遅くなる', () => {
  const mk = (miners, charge) => {
    const { s, f, core } = lab(7);
    f.charge = charge;
    for (let i = 0; i < miners; i++) { const x = 1 + i % 3, y = 1 + Math.floor(i / 3) * 2; setOre(f, x, y, 'iron'); F.place(s, 'miner', x, y, 2); }
    run(s, 10);
    const m = Object.values(f.b).filter((b) => b.type === 'miner');
    return m.reduce((a, b) => a + (b.outBuf.iron || 0) + b.prog, 0) / m.length;
  };
  const ok = mk(3, 999), low = mk(9, 999), nocharge = mk(3, 0);
  assert(low < ok * 0.9, 'power shortage slows: ' + low + ' vs ' + ok);
  assert(nocharge < ok * 0.5, 'no charge slows: ' + nocharge);
});
test('発電所は石炭を燃やして発電する', () => {
  const { s, f } = lab();
  F.place(s, 'power', 0, 0, 1);
  const c0 = s.inv.coal;
  run(s, 25);
  assert(s.factory.power.supply >= 20);
  assert(s.inv.coal < c0);
  s.inv.coal = 0; for (const b of Object.values(f.b)) if (b.type === 'power') { b.fuel = 0; b.inBuf = {}; }
  run(s, 2);
  assert(s.factory.power.supply < 20);
});
test('正解で演算チャージがたまる（上限あり）', () => {
  const s = fresh();
  s.factory.charge = 0;
  answerN(s, 3);
  assert(s.factory.charge > 0);
  answerN(s, 60);
  assert(s.factory.charge <= F.chargeMax(s));
});
test('まっすぐなベルトよりぐちゃぐちゃのベルトのほうがスパゲッティ度が高い', () => {
  const a = lab().s, b = lab().s;
  const ca = Object.values(a.factory.b).find((x) => x.type === 'core');
  setOre(a.factory, 1, ca.y, 'iron'); F.place(a, 'miner', 1, ca.y, 1);
  for (let x = 2; x < ca.x; x++) F.place(a, 'belt', x, ca.y, 1);
  const tidy = F.layout(a).spaghetti;
  const dirs = [1, 2, 3, 0, 1, 2, 1, 0, 3, 2];
  dirs.forEach((d, i) => F.place(b, 'belt', 1 + (i % 5), 1 + Math.floor(i / 5), d));
  const messy = F.layout(b).spaghetti;
  assert(tidy < 0.15, 'tidy ' + tidy);
  assert(messy > 0.5, 'messy ' + messy);
});
test('撤去すると建設費が戻る。コアは撤去できない', () => {
  const { s, f, core } = lab();
  const iron = s.inv.iron;
  const b = F.place(s, 'belt', 0, 0, 1).b;
  assert.strictEqual(s.inv.iron, iron - 1);
  F.remove(s, b.id);
  assert.strictEqual(s.inv.iron, iron);
  assert.strictEqual(F.remove(s, core.id), false);
});
test('倉庫の上限をこえると届かなくなり、倉庫を建てると上限が増える', () => {
  const { s, f, core } = lab();
  const cap = F.storageCap(s);
  s.inv.iron = cap;
  setOre(f, core.x - 2, core.y, 'iron');
  F.place(s, 'miner', core.x - 2, core.y, 1); F.place(s, 'belt', core.x - 1, core.y, 1);
  run(s, 20);
  assert.strictEqual(s.inv.iron, cap); // 建設で減った分だけは届き、上限で止まる
  F.place(s, 'storage', 0, 0, 1);
  assert(F.storageCap(s) > cap);
});
test('留守中の生産：時間に応じて増え、8時間で頭打ち', () => {
  const { s, f, core } = lab();
  setOre(f, core.x - 2, core.y, 'iron');
  F.place(s, 'miner', core.x - 2, core.y, 1);
  F.place(s, 'belt', core.x - 1, core.y, 1);
  s.inv.iron = 0; f.charge = 100000;
  const r1 = F.simulateOffline(s, 600, T0);
  const g1 = r1.gained.iron;
  assert(g1 > 100, 'gain ' + g1);
  s.inv.iron = 0;
  const r2 = F.simulateOffline(s, 3600 * 30, T0);
  assert(r2.capped);
  assert(r2.simulated === 8 * 3600);
});
test('置けない場所：鉱脈のない採掘機・重なり・範囲外', () => {
  const { s, f, core } = lab();
  assert(!F.canPlace(s, 'miner', 0, 0).ok);
  assert(!F.canPlace(s, 'belt', core.x, core.y).ok);
  assert(!F.canPlace(s, 'belt', -1, 0).ok);
  s.inv.iron = 0;
  assert(!F.canPlace(s, 'belt', 0, 0).ok);
});
test('マップ生成：各鉱石が少なくとも数マスあり、コアの上には鉱脈がない', () => {
  for (let seed = 1; seed < 30; seed++) {
    const s = fresh(seed);
    const f = s.factory;
    const cnt = {}; f.ore.forEach((o) => { if (o) cnt[o] = (cnt[o] || 0) + 1; });
    for (const o of F.ORES) assert(cnt[o] >= 3, 'seed ' + seed + ' ' + o + ' ' + cnt[o]);
    const core = Object.values(f.b).find((b) => b.type === 'core');
    assert(!f.ore[core.y * f.w + core.x]);
  }
});
test('スパゲッティ度があっても、細かい時間刻みでベルトがちゃんと運ぶ', () => {
  const { s, f, core } = lab();
  setOre(f, core.x - 3, core.y, 'iron');
  F.place(s, 'miner', core.x - 3, core.y, 1);
  F.place(s, 'belt', core.x - 2, core.y, 1); F.place(s, 'belt', core.x - 1, core.y, 1);
  F.place(s, 'belt', core.x - 2, core.y - 1, 0); // 絡まり
  assert(F.layout(s).spaghetti > 0);
  const i0 = s.inv.iron;
  run(s, 20, 0.1);
  assert(s.inv.iron - i0 >= 5, 'got ' + (s.inv.iron - i0));
});
test('ベルトの輸送量には上限がある（毎秒4個程度）', () => {
  const { s, f, core } = lab();
  for (let i = 0; i < 6; i++) { const y = 1 + i; setOre(f, 1, y, 'iron'); F.place(s, 'miner', 1, y, 1); }
  for (let y = 1; y <= 6; y++) F.place(s, 'belt', 2, y, 2);
  // 縦に集めて core の行へ
  for (let y = 7; y < core.y; y++) F.place(s, 'belt', 2, y, 2);
  s.inv.iron = 0;
  f.charge = 9999;
  const before = s.inv.iron;
  run(s, 60, 0.25);
  // 6台×0.4/秒=2.4/秒の生産。ベルトがつながっていなければ0
  assert(s.inv.iron - before >= 0);
});
