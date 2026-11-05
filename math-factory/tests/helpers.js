// テスト用の共通ヘルパー
const MF = globalThis.MF;
const T0 = new Date(2026, 10, 5, 10, 0, 0).getTime(); // 2026-11-05 10:00（ローカル）
function fresh(seed) { return MF.Game.createState(T0, seed || 12345); }
/** 今の問題に正解する（or わざと間違える） */
function solve(s, now, correct) {
  const q = MF.Game.Quiz.currentQuestion(s);
  const ans = MF.Questions.answerText(q);
  if (correct === false) {
    const wrong = MF.Util.fstr(MF.Util.fadd(q.answer, 1));
    return MF.Game.Quiz.answer(s, wrong, now);
  }
  return MF.Game.Quiz.answer(s, ans, now);
}
function answerN(s, n, opts) {
  opts = opts || {};
  let now = opts.now || T0;
  const res = [];
  for (let i = 0; i < n; i++) {
    MF.Game.Quiz.next(s, now, opts.q || {});
    now += opts.dt || 20000;
    const ok = opts.ok === undefined ? true : typeof opts.ok === 'function' ? opts.ok(i) : opts.ok;
    let r = solve(s, now, ok);
    if (!ok) { while (!s.quiz.current.done) { now += 1000; r = solve(s, now, false); } }
    res.push(r);
  }
  return { res, now };
}
module.exports = { T0, fresh, solve, answerN };
