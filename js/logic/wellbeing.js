/* 数学ファクトリー：勉強とのバランス（ポモドーロ式の勉強タイマー） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, B = MF.Balance;
  const W = {};
  B.well = { focusBonus: 0.1, pomoRewardRp: 10 };

  // ---------- ポモドーロ ----------
  W.pomoStart = function (s, now) {
    const p = s.well.pomo;
    p.state = 'focus'; p.endsAt = now + p.focusMin * 60000; p.startedAt = now; p.answered0 = s.stats.answered;
    G.emit(s, 'pomoStart', {});
    return p;
  };
  W.pomoStop = function (s) { const p = s.well.pomo; p.state = 'idle'; p.endsAt = 0; };
  W.pomoSkipBreak = function (s, now) { const p = s.well.pomo; if (p.state === 'break') { p.state = 'idle'; p.endsAt = 0; } };
  W.pomoLeft = function (s, now) { const p = s.well.pomo; return p.state === 'idle' ? 0 : Math.max(0, (p.endsAt - now) / 1000); };
  W.pomoTick = function (s, now) {
    const p = s.well.pomo;
    if (p.state === 'idle' || now < p.endsAt) return null;
    if (p.state === 'focus') {
      p.done++; p.cycles++;
      const solved = s.stats.answered - (p.answered0 || 0);
      const long = p.cycles % 4 === 0;
      p.state = 'break'; p.endsAt = now + (long ? p.longBreakMin : p.breakMin) * 60000;
      s.rp += B.well.pomoRewardRp;
      G.notice(s, { type: 'pomo', phase: 'break', text: '🍅 ポモドーロ完了！（この25分で ' + solved + ' 問）研究P +' + B.well.pomoRewardRp + '。' + (long ? p.longBreakMin : p.breakMin) + '分休憩しよう', long, solved });
      G.emit(s, 'pomoDone', { solved });
      return 'break';
    }
    p.state = 'idle'; p.endsAt = 0;
    G.notice(s, { type: 'pomo', phase: 'ready', text: '⏰ 休憩おわり！ 次のポモドーロを始めよう' });
    return 'idle';
  };
  // 集中中は正解の資源が少し増える
  G.addMultiplier((s, topic, kind) => (kind === 'quiz' && s.well && s.well.pomo.state === 'focus' ? 1 + B.well.focusBonus : 1));

  G.register({
    id: 'well',
    migrate(s) { delete s.well.play; }, // 以前の「1日のプレイ上限」の設定は使わない
    init(s) {
      s.well = { pomo: { state: 'idle', endsAt: 0, focusMin: 25, breakMin: 5, longBreakMin: 15, cycles: 0, done: 0 } };
    },
    tick(s, dt, now) { W.pomoTick(s, now); },
  });
  MF.Well = W;
})(globalThis.MF = globalThis.MF || {});
