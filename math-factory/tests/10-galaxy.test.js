const { T0, fresh, answerN } = require('./helpers');
const { botFight } = require('./bot');
const G = MF.Game, F = MF.Factory, GX = MF.Galaxy, U = MF.Util, Bt = MF.Battle;
function withSilo(s) {
  s.research.done.push('rocketry', 'automation');
  Object.assign(s.inv, { ironPlate: 200, brick: 100, circuit: 100, gear: 100 });
  const f = s.factory;
  let x = 0, y = 0; while (F.at(s, x, y) || f.ore[y * f.w + x]) { x++; if (x >= f.w) { x = 0; y++; } }
  F.place(s, 'silo', x, y, 1);
}
function launched(seed) { const s = fresh(seed); withSilo(s); s.inv.rocketPart = 10; GX.launch(s, T0); return s; }

test('ロケット：発射台と部品10個で打ち上げ→銀河が開く（星14・航路はすべてつながる・帝国3つ）', () => {
  const s = fresh();
  assert(!GX.launch(s, T0).ok);
  withSilo(s);
  s.inv.rocketPart = 9;
  assert(!GX.launch(s, T0).ok);
  s.inv.rocketPart = 10;
  const r = GX.launch(s, T0);
  assert(r.ok && r.first);
  assert(s.galaxy.unlocked);
  assert.strictEqual(s.galaxy.systems.length, 14);
  assert.strictEqual(Object.keys(s.galaxy.empires).length, 3);
  // 連結性
  const seen = new Set([0]), st = [0];
  while (st.length) { const v = st.pop(); for (const w of GX.adj(s, v)) if (!seen.has(w)) { seen.add(w); st.push(w); } }
  assert.strictEqual(seen.size, 14);
  assert.strictEqual(GX.sys(s, s.galaxy.home).owner, 'player');
  assert.strictEqual(GX.partsNeeded(s), MF.Balance.galaxy.colonyParts);
});
test('植民：となりの星だけ・コロニー船が必要。植民した星の分野が出題される', () => {
  for (let seed = 1; seed < 8; seed++) {
    const s = launched(seed);
    const free = GX.adj(s, s.galaxy.home).find((n) => !GX.sys(s, n).owner);
    if (free === undefined) continue;
    assert(!GX.colonize(s, free, T0).ok, 'no ship');
    s.inv.rocketPart = 5; GX.launch(s, T0);
    assert.strictEqual(s.galaxy.ships, 1);
    assert(GX.colonize(s, free, T0).ok);
    const p = GX.sys(s, free);
    for (const t of p.topics) assert(G.availableTopics(s).indexOf(t) >= 0);
    // その星で勉強すると、その星の分野が出て、その星の資源も手に入る
    assert(GX.setFocus(s, free));
    let hit = 0; for (let i = 0; i < 40; i++) { if (p.topics.indexOf(G.Quiz.pickTopic(s, T0)) >= 0) hit++; s.quiz.lastTopics = []; }
    assert(hit > 25, 'focus topics ' + hit);
    const before = s.inv[p.resource] || 0;
    answerN(s, 3, { q: { topic: p.topics[0] } });
    assert(s.inv[p.resource] > before);
    return;
  }
  assert.fail('no free neighbor in seeds');
});
test('帝国は時間とともに広がり、交易で品物が届く', () => {
  const s = launched(3);
  const n0 = GX.EMPIRES.map((E) => GX.owned(s, E.id).length).reduce((a, b) => a + b, 0);
  s.rp = 100;
  const eid = 'riemann';
  assert(GX.diplo(s, eid, 'trade', T0).ok);
  const gold0 = s.inv.gold || 0;
  for (let i = 0; i < 20; i++) GX.turn(s, T0 + i * 1000);
  const n1 = GX.EMPIRES.map((E) => GX.owned(s, E.id).length).reduce((a, b) => a + b, 0);
  assert(n1 > n0, 'expanded ' + n0 + '->' + n1);
  assert(s.inv.gold > gold0);
});
test('同盟は関係50以上、戦争中は交易不可、和平できる', () => {
  const s = launched(4);
  const e = s.galaxy.empires.gauss;
  e.rel = 20;
  assert(!GX.diplo(s, 'gauss', 'alliance', T0).ok);
  e.rel = 60;
  assert(GX.diplo(s, 'gauss', 'alliance', T0).ok);
  assert(GX.allyFire(s) > 0);
  assert(GX.diplo(s, 'euclid', 'war', T0).ok);
  s.rp = 100;
  assert(!GX.diplo(s, 'euclid', 'trade', T0).ok);
  assert(GX.diplo(s, 'euclid', 'peace', T0).ok);
  assert.strictEqual(s.galaxy.empires.euclid.stance, 'neutral');
});
test('戦争：となりの敵の星を攻めて勝てば奪える', () => {
  for (let seed = 1; seed < 30; seed++) {
    const s = launched(seed);
    // ふるさとのとなりを敵の星にして戦争
    const n = GX.adj(s, s.galaxy.home)[0];
    GX.sys(s, n).owner = 'euclid';
    GX.diplo(s, 'euclid', 'war', T0);
    s.battle.hpBonus = 500;
    const r = GX.attack(s, n);
    assert(r.ok);
    botFight(s, 1, () => 0.5);
    const out = GX.finishWar(s, T0);
    assert(out && out.win);
    assert.strictEqual(GX.sys(s, n).owner, 'player');
    return;
  }
});
test('ランダムイベント：どの選択肢でもエラーにならない', () => {
  const s = launched(6);
  s.pals.list.push({ id: 1, sp: 'parabon', name: 'P', lvl: 1, xp: 0, topic: 'quad' });
  Object.assign(s.inv, { iron: 999, copper: 999 });
  for (const ev of GX.EVENTS) for (let i = 0; i < ev.choices.length; i++) for (const ok of [true, false]) {
    s.galaxy.event = { id: ev.id, at: T0, emp: 'gauss' };
    const r = GX.chooseEvent(s, i, ok, T0);
    assert(r && r.ok && r.text, ev.id + i);
  }
});
test('イベントは問題を解いているとときどき起こる（銀河前でも）', () => {
  const s = fresh();
  answerN(s, 120);
  assert(s.galaxy.event || s.stats.correct >= 120);
  let happened = !!s.galaxy.event;
  if (!happened) { const s2 = fresh(77); answerN(s2, 200); happened = !!s2.galaxy.event; }
  assert(happened);
});
