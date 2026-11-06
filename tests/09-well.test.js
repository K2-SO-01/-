const { T0, fresh, answerN } = require('./helpers');
const G = MF.Game, W = MF.Well, U = MF.Util;
const MIN = 60000;

test('ポモドーロ：25分集中→5分休憩→待機、4回目は長い休憩', () => {
  const s = fresh();
  W.pomoStart(s, T0);
  assert.strictEqual(s.well.pomo.state, 'focus');
  assert.strictEqual(W.pomoTick(s, T0 + 24 * MIN), null);
  const rp = s.rp;
  assert.strictEqual(W.pomoTick(s, T0 + 25 * MIN), 'break');
  assert.strictEqual(s.rp, rp + 10);
  assert.strictEqual(W.pomoTick(s, T0 + 30 * MIN), 'idle');
  let t = T0 + 31 * MIN;
  for (let i = 0; i < 3; i++) { W.pomoStart(s, t); t += 25 * MIN; W.pomoTick(s, t); t += 1; }
  assert.strictEqual(s.well.pomo.cycles, 4);
  assert(s.well.pomo.endsAt - t > 14 * MIN, 'long break');
});
test('集中中は正解の資源が少し増える', () => {
  const a = fresh(9), b = fresh(9);
  W.pomoStart(b, T0);
  a.quiz.topic = b.quiz.topic = 'seq';
  answerN(a, 4); answerN(b, 4);
  assert(b.inv.stone > a.inv.stone);
});
