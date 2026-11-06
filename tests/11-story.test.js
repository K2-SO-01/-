const { T0, fresh, answerN } = require('./helpers');
const G = MF.Game, F = MF.Factory, St = MF.Story;

test('ストーリー：最初のミッションは3問正解で達成し、報酬と次のミッション', () => {
  const s = fresh();
  St.check(s, T0);
  assert.strictEqual(St.current(s).id, 'solve3');
  answerN(s, 3);
  St.check(s, T0);
  assert.strictEqual(St.current(s).id, 'miner');
  assert(s.story.done.indexOf('solve3') >= 0);
});
test('ストーリー：採掘機→ベルト→発電所…と進む（工場を操作して確認）', () => {
  const s = fresh();
  answerN(s, 3); St.check(s, T0);
  Object.assign(s.inv, { iron: 100, stone: 100, copper: 50 });
  const f = s.factory;
  const core = Object.values(f.b).find((b) => b.type === 'core');
  f.ore[core.y * f.w + core.x - 2] = 'iron';
  F.place(s, 'miner', core.x - 2, core.y, 1);
  St.check(s, T0);
  assert.strictEqual(St.current(s).id, 'belt');
  F.place(s, 'belt', core.x - 1, core.y, 1);
  let now = T0; for (let i = 0; i < 40; i++) { now += 250; G.tick(s, 0.25, now); }
  St.check(s, now);
  assert.strictEqual(St.current(s).id, 'power');
});
test('ストーリー：全ミッションの進み具合が計算でき、エラーにならない', () => {
  const s = fresh();
  for (const m of St.MISSIONS) { const p = St.progress(s, m); assert(p.need >= 1 && p.have >= 0, m.id); assert(m.where && m.how && m.title); }
});
test('ストーリー：卵のミッションでは卵が必ずもらえ、襲撃のミッションでは襲撃が近づく', () => {
  const s = fresh();
  s.story.idx = St.MISSIONS.findIndex((m) => m.id === 'hatch');
  St.check(s, T0);
  assert(s.pals.eggs.length >= 1);
  s.story.idx = St.MISSIONS.findIndex((m) => m.id === 'raid');
  St.check(s, T0);
  assert(s.battle.forceRaids);
  answerN(s, 6);
  MF.Battle.checkRaid(s, T0 + 999999);
  assert(s.battle.raid.pending);
});
test('最初のミッションは、まちがえてからやり直して正解した問題も数える', () => {
  const s = fresh();
  for (let i = 0; i < 3; i++) { G.Quiz.next(s, T0); const q = G.Quiz.currentQuestion(s); G.Quiz.answer(s, '99999', T0 + 1); G.Quiz.answer(s, MF.Questions.answerText(q), T0 + 2); }
  St.check(s, T0);
  assert.strictEqual(St.current(s).id, 'miner');
});
