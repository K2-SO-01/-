const { T0, fresh, solve, answerN } = require('./helpers');
const G = MF.Game, S = MF.Study, U = MF.Util;
const DAY = 86400000;

test('間隔反復：正解で間隔が1→3→7日とのび、まちがえると短くなる。期限の来た分野が出やすい', () => {
  const s = fresh();
  answerN(s, 1, { q: { topic: 'vec' } });
  const r = s.study.srs.vec;
  assert.strictEqual(r.stage, 1); assert(Math.abs(r.due - (T0 + 20000 + DAY)) < 5000);
  answerN(s, 1, { q: { topic: 'vec' }, now: r.due + 1 });
  assert.strictEqual(r.stage, 2);
  answerN(s, 1, { q: { topic: 'vec' }, now: r.due - DAY });
  assert.strictEqual(r.stage, 2, 'early review does not advance');
  answerN(s, 1, { q: { topic: 'vec' }, ok: false, now: r.due + 1 });
  assert.strictEqual(r.stage, 0);
  assert(S.dueTopics(s, r.due + 1).indexOf('vec') >= 0);
  // 期限切れの分野はおまかせで選ばれやすい
  const cnt = { vec: 0 };
  for (let i = 0; i < 300; i++) { const t = G.Quiz.pickTopic(s, r.due + 1); if (t === 'vec') cnt.vec++; s.quiz.lastTopics = []; }
  assert(cnt.vec > 300 / 7 * 1.3, 'vec picked ' + cnt.vec);
});
test('模試：時間内に解いて採点。全問正解は高評価、全問不正解は低評価', () => {
  const s = fresh();
  const ex = S.examCreate(s, T0, 'short');
  assert.strictEqual(ex.items.length, 10);
  let now = T0;
  for (let i = 0; i < 10; i++) { S.examNext(s, now); now += 30000; const r = solve(s, now, true); S.examRecord(s, r.ok, 30000); }
  const res = S.examFinish(s, now);
  assert.strictEqual(res.score, 100); assert(res.dev >= 65); assert(res.rank === 'S');
  S.examCreate(s, now, 'full');
  const res2 = S.examFinish(s, now + 1000);
  assert.strictEqual(res2.score, 0); assert(res2.dev <= 30);
  assert.strictEqual(s.study.exams.length, 2);
  assert.strictEqual(s.quiz.levels.quad, 0, 'exam does not change auto level');
});
test('模試：時間切れになると次の問題は出ない', () => {
  const s = fresh();
  S.examCreate(s, T0, 'short');
  assert(S.examNext(s, T0 + 1000));
  assert.strictEqual(S.examNext(s, T0 + 16 * 60 * 1000), null);
});
test('週間レポート：今週と先週を比べ、苦手分野を出す', () => {
  const s = fresh();
  const mon = T0 - ((new Date(T0).getDay() + 6) % 7) * DAY;
  answerN(s, 10, { q: { topic: 'prob' }, ok: (i) => i < 2, now: mon - 3 * DAY });
  answerN(s, 10, { q: { topic: 'prob' }, ok: (i) => i < 8, now: mon + 3600000 });
  answerN(s, 6, { q: { topic: 'integ' }, ok: (i) => i < 1, now: mon + 7200000 });
  const rep = S.weeklyReport(s, mon + DAY);
  assert.strictEqual(rep.cur.a, 16); assert.strictEqual(rep.prev.a, 10);
  assert(rep.cur.acc > rep.prev.acc);
  assert.strictEqual(rep.weak[0].topic, 'integ');
  assert.strictEqual(rep.improved.topic, 'prob');
});
test('カウントダウンと残り日数に合わせたメニュー', () => {
  const s = fresh();
  assert.strictEqual(S.daysLeft(s, T0), null);
  s.study.examDate = U.dateStr(T0 + 100 * DAY);
  assert.strictEqual(S.daysLeft(s, T0), 100);
  assert.strictEqual(S.plan(s, T0).phase.name, '実力養成期');
  s.study.examDate = U.dateStr(T0 + 5 * DAY);
  assert.strictEqual(S.plan(s, T0).phase.name, '総仕上げ');
  s.study.examDate = U.dateStr(T0 + 20 * DAY);
  const p = S.plan(s, T0);
  assert(p.items.some((i) => i.k === 'exam'));
  s.study.examDate = U.dateStr(T0 - DAY);
  assert(S.plan(s, T0).left < 0);
});
