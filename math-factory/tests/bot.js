// テストとシミュレーション用のカードバトル自動プレイ
const MF = globalThis.MF;
function botFight(s, p, rnd, opts) {
  const Bt = MF.Battle;
  opts = opts || {};
  let guard = 0;
  while (s.battle.active && !s.battle.active.over && guard++ < 800) {
    const bt = s.battle.active;
    let played = false;
    // 攻撃より防御が必要なとき（被ダメ予定がブロックより大きい）は防御を優先
    const incoming = Bt.alive(bt).reduce((a, e) => a + (e.intent.dmg ? MF.Battle.calcDmg(e.intent.dmg, e.str, e.weak, bt.player.vuln, 1) * (e.intent.hits || 1) : 0), 0);
    const order = bt.hand.map((c, i) => i).sort((a, b) => {
      const fa = Bt.cardFx(bt.hand[a]), fb = Bt.cardFx(bt.hand[b]);
      const sa = (fa.str || fa.dex || fa.metal || fa.ritual ? 50 : 0) + (incoming > bt.player.block ? (fa.block || 0) * 2 : 0) + (fa.dmg || 0) * (fa.hits || 1) + (fa.dmgAll || 0) * Bt.alive(bt).length;
      const sb = (fb.str || fb.dex || fb.metal || fb.ritual ? 50 : 0) + (incoming > bt.player.block ? (fb.block || 0) * 2 : 0) + (fb.dmg || 0) * (fb.hits || 1) + (fb.dmgAll || 0) * Bt.alive(bt).length;
      return sb - sa;
    });
    for (const i of order) {
      const c = bt.hand[i];
      if (Bt.cost(s, bt, c) > bt.player.energy) continue;
      const alive = Bt.alive(bt).sort((a, b) => a.hp - b.hp);
      const r = Bt.requestPlay(s, i, alive.length ? alive[0].idx : 0);
      if (!r.ok) continue;
      let ok;
      if (opts.quiz) { // 本物の問題を出して、正答率 p で答える
        const q = MF.Game.Quiz.next(s, opts.now(), r.q);
        ok = rnd() < p;
        const ans = ok ? MF.Questions.answerText(q) : MF.Util.fstr(MF.Util.fadd(q.answer, 1));
        MF.Game.Quiz.answer(s, ans, opts.now(25000));
        if (!ok) while (!s.quiz.current.done) MF.Game.Quiz.revealHint(s, opts.now(0));
      } else ok = rnd() < p;
      let res = Bt.resolvePlay(s, ok, 12000);
      if (res && res.retry) res = Bt.resolvePlay(s, rnd() < p, 12000);
      played = true;
      break;
    }
    if (!played) Bt.endTurn(s);
  }
  return s.battle.active ? s.battle.active.over : null;
}
module.exports = { botFight };
