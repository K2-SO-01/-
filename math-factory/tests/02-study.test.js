const { T0, fresh, solve, answerN } = require('./helpers');
const G = MF.Game, S = MF.Study, Q = MF.Questions;

test('間違えた問題は弱点リストに入り、同じ問題が再出題できる', () => {
  const s = fresh();
  G.Quiz.next(s, T0);
  const q1 = G.Quiz.currentQuestion(s);
  solve(s, T0 + 1000, false);
  assert.strictEqual(s.study.weak.length, 1);
  const w = s.study.weak[0];
  const q2 = S.startReview(s, T0 + 2000, w);
  assert.strictEqual(q2.text, q1.text);
  assert.strictEqual(s.quiz.current.mode, 'review');
});
test('ヒントを見てから正解した問題も弱点に入る', () => {
  const s = fresh();
  G.Quiz.next(s, T0);
  G.Quiz.revealHint(s, T0 + 100);
  solve(s, T0 + 2000, true);
  assert.strictEqual(s.study.weak.length, 1);
});
test('復習で3段階正解すると卒業、間違えると段階が戻る', () => {
  const s = fresh();
  G.Quiz.next(s, T0); solve(s, T0 + 1000, false);
  const w = s.study.weak[0];
  let now = T0 + 2000;
  S.startReview(s, now, w); solve(s, now + 1000, true);
  assert.strictEqual(w.stage, 1); assert(w.due > now);
  now = w.due + 1;
  S.startReview(s, now, w); solve(s, now + 1000, false);
  assert.strictEqual(w.stage, 0);
  for (let i = 0; i < 3; i++) { now = Math.max(now, w.due) + 1000; S.startReview(s, now, w); solve(s, now + 1000, true); }
  assert.strictEqual(s.study.weak.length, 0);
  assert.strictEqual(s.study.graduated, 1);
});
test('スキップと解説表示は不正解あつかい', () => {
  const s = fresh();
  G.Quiz.next(s, T0); G.Quiz.skip(s, T0 + 500);
  G.Quiz.next(s, T0 + 600); G.Quiz.revealHint(s, T0 + 700); G.Quiz.revealHint(s, T0 + 800); G.Quiz.revealHint(s, T0 + 900);
  assert.strictEqual(s.stats.answered, 2); assert.strictEqual(s.stats.correct, 0);
  assert.strictEqual(s.study.weak.length, 2);
  assert(s.quiz.current.done);
});
test('壊れた・古いセーブも欠けた項目を補って読める', () => {
  const s = fresh();
  answerN(s, 2, { ok: false });
  const obj = JSON.parse(G.serialize(s));
  delete obj.study; delete obj.settings.autoNext; obj.quiz.levels = { quad: 2 };
  const s2 = G.deserialize(obj, T0);
  assert(Array.isArray(s2.study.weak));
  assert.strictEqual(s2.settings.autoNext, true);
  assert.strictEqual(s2.quiz.levels.quad, 2);
  assert.strictEqual(s2.quiz.levels.prob, 0);
});
