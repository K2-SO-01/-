/* 数学ファクトリー：勉強とのバランス（ポモドーロ式の勉強タイマー・1日のプレイ時間の上限） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, B = MF.Balance;
  const W = {};
  B.well = { focusBonus: 0.1, pomoRewardRp: 10, snoozeMin: 10, maxSnooze: 2 };

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

  // ---------- 1日のプレイ時間 ----------
  W.addPlay = function (s, sec, now) {
    const pl = s.well.play;
    const day = U.dateStr(now);
    if (pl.day !== day) { pl.day = day; pl.sec = 0; pl.snoozes = 0; pl.snoozeUntil = 0; pl.shown = false; }
    pl.sec += sec;
    pl.total = (pl.total || 0) + sec;
  };
  W.limitSec = function (s) { return (s.well.play.limitMin || 0) * 60; };
  W.overLimit = function (s, now) {
    const pl = s.well.play;
    if (!pl.limitMin || pl.day !== U.dateStr(now)) return false;
    return pl.sec >= W.limitSec(s) && now >= (pl.snoozeUntil || 0);
  };
  W.snooze = function (s, now) {
    const pl = s.well.play;
    if (pl.snoozes >= B.well.maxSnooze) return false;
    pl.snoozes++;
    pl.snoozeUntil = now + B.well.snoozeMin * 60000;
    return true;
  };
  W.remaining = function (s, now) {
    const pl = s.well.play;
    if (!pl.limitMin) return null;
    if (pl.day !== U.dateStr(now)) return W.limitSec(s);
    return Math.max(0, W.limitSec(s) - pl.sec);
  };

  G.register({
    id: 'well',
    init(s) {
      s.well = { pomo: { state: 'idle', endsAt: 0, focusMin: 25, breakMin: 5, longBreakMin: 15, cycles: 0, done: 0 }, play: { day: null, sec: 0, limitMin: 0, snoozes: 0, snoozeUntil: 0, total: 0 } };
    },
    tick(s, dt, now) { W.pomoTick(s, now); },
  });
  MF.Well = W;
})(globalThis.MF = globalThis.MF || {});
