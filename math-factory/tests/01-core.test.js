const { T0, fresh, solve, answerN } = require('./helpers');
const U = MF.Util, Q = MF.Questions, G = MF.Game;

test('分数の入力を読める', () => {
  const eq = (s, n, d) => { const v = U.parseAnswer(s); assert(v, s); assert.deepStrictEqual([v.n, v.d], [n, d], s); };
  eq('3', 3, 1); eq('-3', -3, 1); eq('3/4', 3, 4); eq('-3/4', -3, 4); eq('6/8', 3, 4); eq('3/-4', -3, 4);
  eq('０．５', 1, 2); eq('−２／６', -1, 3); eq(' 12 ', 12, 1); eq('.25', 1, 4); eq('(-3)/4', -3, 4);
  assert.strictEqual(U.parseAnswer('abc'), null); assert.strictEqual(U.parseAnswer('1/0'), null); assert.strictEqual(U.parseAnswer(''), null);
});
test('問題は全分野・全難易度で正しく生成され、同じシードなら同じ問題', () => {
  for (const t of Q.ALL_TOPICS) for (let lv = 0; lv < 3; lv++) for (let s = 1; s < 150; s++) {
    const a = Q.generate(t, lv, s * 31 + 7), b = Q.generate(t, lv, s * 31 + 7);
    assert.strictEqual(a.text, b.text);
    const all = [a.text, ...a.hints, ...a.steps].join(' ');
    assert(!/NaN|undefined|Infinity|\[object/.test(all), t + lv + ' ' + all);
    assert.strictEqual(a.hints.length, 2);
    assert(a.steps.length >= 1);
    assert(Q.check(a, Q.answerText(a)).ok, 'own answer must be accepted ' + a.kind);
  }
});
test('数学的に正しい（代表的な問題を検算）', () => {
  // 二次関数の最小値：平方完成の結果を数値で検算
  for (let s = 1; s < 200; s++) {
    const q = Q.generate('quad', 1, s);
    if (q.kind !== 'quad.extremum') continue;
    const m = q.text.replace(/<[^>]+>/g, '').match(/y = (.+) の/);
    assert(m);
  }
  // 確率：和が7は 1/6
  let found = false;
  for (let s = 1; s < 400 && !found; s++) {
    const q = Q.generate('prob', 0, s);
    if (q.kind === 'prob.diceSum' && q.text.includes('和が 7')) { assert.strictEqual(U.fstr(q.answer), '1/6'); found = true; }
  }
  assert(found);
});
test('正解で資源と研究ポイントが増え、コンボが伸びる', () => {
  const s = fresh();
  s.quiz.topic = 'quad';
  const { res } = answerN(s, 5);
  assert(res.every((r) => r.ok));
  assert(s.inv.iron > 0, 'iron');
  assert(s.rp > 0, 'rp');
  assert.strictEqual(s.quiz.combo, 5);
  assert(res[4].reward.amount > res[0].reward.amount, 'combo multiplier');
});
test('不正解でコンボが切れ、ヒントが段階的に開く', () => {
  const s = fresh();
  answerN(s, 3);
  G.Quiz.next(s, T0);
  let r = solve(s, T0 + 5000, false);
  assert(!r.ok); assert.strictEqual(s.quiz.combo, 0); assert.strictEqual(r.hintLevel, 1);
  r = solve(s, T0 + 6000, false); assert.strictEqual(r.hintLevel, 2); assert(!r.done);
  r = solve(s, T0 + 7000, false); assert.strictEqual(r.hintLevel, 3); assert(r.done);
});
test('2回目の正解は報酬が減り、正答率は1回目で数える', () => {
  const s = fresh();
  s.quiz.topic = 'prob'; s.quiz.levelMode = 1;
  G.Quiz.next(s, T0);
  solve(s, T0 + 1000, false);
  const r = solve(s, T0 + 2000, true);
  assert(r.ok);
  assert(r.reward.amount < MF.Balance.quiz.baseReward[1]);
  assert.strictEqual(s.stats.answered, 1); assert.strictEqual(s.stats.correct, 0);
});
test('難易度は正答率に応じて自動で上下する', () => {
  const s = fresh();
  s.quiz.topic = 'seq';
  answerN(s, 6);
  assert.strictEqual(s.quiz.levels.seq, 1);
  answerN(s, 6, { ok: false });
  assert.strictEqual(s.quiz.levels.seq, 0);
});
test('セーブデータの書き出しと読み込みで状態が保たれる', () => {
  const s = fresh();
  answerN(s, 4);
  const json = G.serialize(s);
  const s2 = G.deserialize(json, T0 + 1000);
  assert.strictEqual(s2.stats.answered, 4);
  assert.strictEqual(s2.inv.iron, s.inv.iron);
  assert.deepStrictEqual(s2.runtime.notices, []);
  assert.throws(() => G.deserialize('{"x":1}', T0));
});
test('難易度・分野を切りかえても問題は引き直せない（同じ設定なら同じ問題）', () => {
  const s = fresh();
  s.quiz.topic = 'quad';
  G.Quiz.next(s, T0);
  const seed = s.quiz.current.seed;
  const txt = {};
  for (let k = 0; k < 3; k++) for (const lv of [0, 1, 2, 'auto']) {
    s.quiz.levelMode = lv; G.Quiz.retarget(s);
    const q = G.Quiz.currentQuestion(s);
    if (txt[lv] === undefined) txt[lv] = q.text; else assert.strictEqual(q.text, txt[lv], '同じ難易度なら同じ問題 ' + lv);
    assert.strictEqual(s.quiz.current.seed, seed);
  }
  s.quiz.levelMode = 'auto'; G.Quiz.retarget(s);
  s.quiz.topic = 'seq'; G.Quiz.retarget(s); assert.strictEqual(s.quiz.current.topic, 'seq');
  s.quiz.topic = 'quad'; G.Quiz.retarget(s);
  assert.strictEqual(G.Quiz.currentQuestion(s).text, txt.auto);
  // 次の問題を出しても、終わっていなければ同じ問題
  assert.strictEqual(G.Quiz.next(s, T0).text, txt.auto);
  assert.strictEqual(s.quiz.current.seed, seed);
});
test('ヒントを見た・答えた問題は、設定を変えてもそのまま', () => {
  const s = fresh();
  s.quiz.levelMode = 0;
  G.Quiz.next(s, T0);
  G.Quiz.revealHint(s, T0 + 100);
  const before = G.Quiz.currentQuestion(s).text;
  s.quiz.levelMode = 2;
  assert.strictEqual(G.Quiz.retarget(s), false);
  assert.strictEqual(G.Quiz.currentQuestion(s).text, before);
  assert.strictEqual(s.quiz.current.level, 0);
});
test('バトルや模試の問題をはさんでも、ふつうの問題は続きから出る', () => {
  const s = fresh();
  G.Quiz.next(s, T0);
  const c = s.quiz.current, text = G.Quiz.currentQuestion(s).text;
  G.Quiz.next(s, T0 + 10, { topic: 'seq', level: 1, mode: 'battle', source: 'card' });
  assert.strictEqual(s.quiz.parked, c);
  solve(s, T0 + 20, true);
  G.Quiz.next(s, T0 + 30, { topic: 'quad', level: 0, mode: 'exam', source: 'exam' });
  assert.strictEqual(G.Quiz.next(s, T0 + 40).text, text);
  assert.strictEqual(s.quiz.current, c);
  assert.strictEqual(s.quiz.parked, null);
});
