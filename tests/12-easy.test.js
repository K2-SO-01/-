const { T0, fresh, solve, answerN } = require('./helpers');
const G = MF.Game, Q = MF.Questions, S = MF.Study, Bt = MF.Battle, U = MF.Util;

test('ぬるま湯モードの算数：どの種でも答えは0以上の整数で、ヒントと解説がある', () => {
  for (let lv = 0; lv < 3; lv++) for (let seed = 1; seed < 400; seed++) {
    const q = Q.generate('quad', lv, seed * 7919, true);
    assert(q.easy && q.kind.startsWith('easy.'), q.kind);
    assert.strictEqual(q.answer.d, 1, q.kind + ' の答えが整数でない');
    assert(q.answer.n >= 0, q.kind + ' の答えが負');
    assert.strictEqual(q.hints.length, 2); assert(q.steps.length >= 2); assert(q.text.length > 5);
    assert(Q.check(q, Q.answerText(q)).ok, q.kind);
    assert.strictEqual(Q.generate('quad', lv, seed * 7919, true).text, q.text, '同じ種なら同じ問題');
  }
  // 種類がまんべんなく出る
  for (let lv = 0; lv < 3; lv++) {
    const kinds = new Set();
    for (let seed = 1; seed < 300; seed++) kinds.add(Q.generate('prob', lv, seed * 104729, true).kind);
    assert.strictEqual(kinds.size, Q.EASY[lv].length, '難易度 ' + lv + ' の種類');
  }
});
test('ぬるま湯モードをオンにすると次の問題から算数。切りかえても、いまの問題は変わらない', () => {
  const s = fresh();
  const q1 = G.Quiz.next(s, T0);
  assert(!q1.easy);
  s.settings.easyMode = true;
  assert.strictEqual(G.Quiz.next(s, T0).text, q1.text, 'いまの問題は高校数学のまま');
  assert.deepStrictEqual(G.Quiz.pendingSetting(s), { topic: null, level: null, easy: true });
  solve(s, T0 + 1000, true);
  const q2 = G.Quiz.next(s, T0 + 2000);
  assert(q2.easy && s.quiz.current.easy);
  s.settings.easyMode = false;
  assert.strictEqual(G.Quiz.next(s, T0 + 2000).text, q2.text, 'オフにしても、いまの算数の問題はそのまま');
  solve(s, T0 + 3000, true);
  assert(!G.Quiz.next(s, T0 + 4000).easy);
});
test('算数の正解でも資源・研究ポイント・ストーリーは進むが、受験の成績には入らない', () => {
  const s = fresh();
  s.settings.easyMode = true; s.quiz.topic = 'prob';
  const cu = s.inv.copper, by = JSON.stringify(s.stats.byTopic), lv = JSON.stringify(s.quiz.levels);
  answerN(s, 8);
  assert(s.inv.copper > cu, '確率の資源（銅）がもらえる');
  assert.strictEqual(s.stats.answered, 8); assert.strictEqual(s.stats.solved, 8);
  assert.strictEqual(s.stats.easy.a, 8); assert.strictEqual(s.stats.easy.c, 8);
  assert.strictEqual(JSON.stringify(s.stats.byTopic), by, '分野別の成績は変わらない');
  assert.strictEqual(JSON.stringify(s.quiz.levels), lv, '分野ごとの難易度は変わらない');
  assert(s.quiz.easyLevel >= 1, '算数の難易度は算数だけで上がる');
  const day = s.stats.days[U.dateStr(T0)];
  assert.strictEqual(day.a, 8); assert.deepStrictEqual(day.t, {});
  assert(!s.study.srs.prob || !s.study.srs.prob.last, '忘却曲線の記録も動かない');
});
test('算数で間違えた問題は弱点リストに入り、復習でも同じ算数の問題が出る', () => {
  const s = fresh();
  s.settings.easyMode = true;
  const q = G.Quiz.next(s, T0);
  solve(s, T0 + 1000, false);
  const w = s.study.weak[0];
  assert(w && w.easy);
  s.settings.easyMode = false; // 設定をもどしても、弱点の問題は算数のまま
  const r = S.startReview(s, T0 + 2000, w);
  assert.strictEqual(r.text, q.text);
  solve(s, T0 + 3000, true);
  assert.strictEqual(s.study.weak[0].stage, 1);
});
test('ぬるま湯モード中はバトル・模試・イベントの問題も算数', () => {
  const s = fresh();
  s.settings.easyMode = true;
  const bt = Bt.start(s, 'raid', ['grub']);
  bt.hand = ['strike']; bt.player.energy = 3;
  const r = Bt.requestPlay(s, 0, 0);
  assert(r.q.easy);
  assert(G.Quiz.next(s, T0, r.q).easy);
  S.examCreate(s, T0, 'short');
  assert(s.study.exam.easy);
  s.settings.easyMode = false; // 模試の途中で切りかえても、その模試は算数のまま
  assert(S.examNext(s, T0 + 10).easy);
});
test('ぬるま湯モードの設定と出しかけの算数はセーブ・読み込みで保たれる', () => {
  const s = fresh();
  s.settings.easyMode = true;
  const q = G.Quiz.next(s, T0);
  const s2 = G.deserialize(G.serialize(s), T0 + 1000);
  assert.strictEqual(s2.settings.easyMode, true);
  assert.strictEqual(G.Quiz.currentQuestion(s2).text, q.text);
});
