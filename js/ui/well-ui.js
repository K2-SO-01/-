/* 数学ファクトリー：勉強タイマー（画面） */
(function (MF) {
  'use strict';
  const UI = MF.UI, W = MF.Well, U = MF.Util, G = MF.Game;
  const h = UI.h;
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };

  // ヘッダーのタイマー
  UI.headerExtras.push((s) => {
    const p = s.well.pomo;
    const left = W.pomoLeft(s, Date.now());
    const label = p.state === 'idle' ? '🍅' : (p.state === 'focus' ? '🍅 ' : '☕ ') + U.fmtClock(left);
    return h('button', { class: 'pomo-chip ' + p.state, title: 'ポモドーロ（勉強タイマー）', onclick: () => pomoPanel() }, label);
  });
  function pomoPanel() {
    const s = UI.state, p = s.well.pomo;
    const body = h('div', {},
      h('p', { class: 'small' }, p.focusMin + '分集中して、' + p.breakMin + '分休む。4回ごとに' + p.longBreakMin + '分の長い休憩。集中中は正解の資源 +10%、1回終わるごとに研究P +10。'),
      h('p', {}, 'いまの状態：', h('b', {}, { idle: '待機中', focus: '集中タイム', break: '休憩タイム' }[p.state]), p.state !== 'idle' ? '（のこり ' + U.fmtClock(W.pomoLeft(s, Date.now())) + '）' : ''),
      h('p', { class: 'small muted' }, '今日までに完了したポモドーロ：' + p.done + ' 回'),
      MF.SettingsUI.choice('集中する時間', 'pomoFocus', [[15, '15分'], [25, '25分'], [40, '40分'], [50, '50分']], (v) => { p.focusMin = v; }),
      MF.SettingsUI.choice('休憩の時間', 'pomoBreak', [[3, '3分'], [5, '5分'], [10, '10分']], (v) => { p.breakMin = v; }));
    const btns = [];
    if (p.state === 'idle') btns.push({ label: '▶ 集中スタート', cls: 'primary', action: () => { W.pomoStart(s, Date.now()); sfx('pomo'); UI.toast('🍅 集中タイム開始！ ' + p.focusMin + '分がんばろう', 'good'); } });
    if (p.state === 'focus') btns.push({ label: '■ やめる', cls: 'ghost', action: () => W.pomoStop(s) });
    if (p.state === 'break') btns.push({ label: '休憩をスキップ', cls: 'ghost', action: () => W.pomoSkipBreak(s, Date.now()) });
    btns.push({ label: '閉じる' });
    UI.modal({ title: '🍅 勉強タイマー', body, buttons: btns, onClose: () => UI.renderHeader() });
  }
  MF.WellUI = { pomoPanel };
  UI.noticeHandlers.pomo = (n) => {
    sfx('bell');
    if (n.phase === 'break') {
      UI.modal({ title: '☕ 休憩しよう', body: h('div', { class: 'center' }, h('div', { class: 'break-ico' }, '☕'), h('p', {}, n.text), h('p', { class: 'small muted' }, '目を閉じる・水を飲む・体をのばすのがおすすめ。休憩中も工場は動いているよ。')),
        buttons: [{ label: '休憩する', cls: 'primary' }] });
    } else UI.toast(n.text, 'info', 5000);
    return true;
  };

  // ---------- 設定 ----------
  MF.SettingsUI.sections.splice(1, 0, () => UI.section('勉強タイマー',
    h('div', { class: 'set-row' }, h('span', { class: 'set-lbl' }, '🍅 ポモドーロ', h('span', { class: 'muted small set-desc' }, '25分集中して5分休む。上のバーの🍅からも使える')), h('button', { class: 'btn small', onclick: () => pomoPanel() }, '開く'))));
})(globalThis.MF = globalThis.MF || {});
