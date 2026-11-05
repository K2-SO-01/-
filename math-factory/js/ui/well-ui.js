/* 数学ファクトリー：勉強タイマーとプレイ時間の上限（画面） */
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

  // ---------- プレイ時間の上限 ----------
  let overlayOpen = false;
  function breakOverlay() {
    const s = UI.state;
    overlayOpen = true;
    const today = s.stats.days[U.dateStr(Date.now())] || { a: 0, c: 0 };
    const pl = s.well.play;
    const canSnooze = pl.snoozes < MF.Balance.well.maxSnooze;
    const body = h('div', { class: 'center' },
      h('div', { class: 'break-ico' }, '🌙'),
      h('p', {}, '今日のプレイ時間が ', h('b', {}, pl.limitMin + ' 分'), ' になったよ。今日はここまでにしよう！'),
      h('p', {}, '今日は ', h('b', {}, today.a + ' 問'), ' 解いて ', h('b', {}, today.c + ' 問'), ' 正解。おつかれさま！'),
      h('p', { class: 'small muted' }, '工場は留守中も動きつづける（最大8時間）。明日また続きをやろう。上限は「設定」で変えられる。'));
    UI.modal({ title: '⏰ 休憩の時間', body, noClose: true, cls: 'break-modal', buttons: [
      canSnooze ? { label: 'あと' + MF.Balance.well.snoozeMin + '分だけ（のこり' + (MF.Balance.well.maxSnooze - pl.snoozes) + '回）', cls: 'ghost', action: () => { W.snooze(s, Date.now()); overlayOpen = false; UI.toast(MF.Balance.well.snoozeMin + '分だけ延長。キリのいいところでやめようね', 'info'); } } : null,
      { label: '今日は終わる', cls: 'primary', action: () => { MF.App.save(); endScreen(); return true; } },
    ].filter(Boolean) });
  }
  function endScreen() {
    UI.closeTopModal();
    const root = UI.$('#screen');
    root.innerHTML = '';
    root.appendChild(h('div', { class: 'end-screen center' }, h('div', { class: 'break-ico' }, '😴'), h('h2', {}, 'また明日！'), h('p', {}, '進み具合は保存したよ。このタブは閉じて大丈夫。'),
      h('button', { class: 'btn ghost small', onclick: () => { overlayOpen = false; UI.state.well.play.snoozeUntil = Date.now() + 5 * 60000; UI.go('quiz'); } }, 'やっぱりもう少しだけ（5分）')));
  }
  MF.App.frameHooks.push((s, dt, now) => {
    if (document.visibilityState !== 'visible') return;
    W.addPlay(s, dt, now);
    if (!overlayOpen && W.overLimit(s, now)) { breakOverlay(); sfx('bell'); }
  });
  // 残り5分のお知らせ
  let warned = null;
  MF.App.frameHooks.push((s, dt, now) => {
    const r = W.remaining(s, now);
    if (r !== null && r > 0 && r <= 300 && warned !== U.dateStr(now)) { warned = U.dateStr(now); UI.toast('⏳ 今日のプレイ時間はあと5分。キリのいいところまで！', 'warn', 5000); }
  });

  // ---------- 設定 ----------
  MF.SettingsUI.sections.splice(1, 0, () => {
    const s = UI.state, pl = s.well.play;
    const sel = h('select', { onchange: (e) => { pl.limitMin = +e.target.value; UI.rerender(); } }, [[0, '上限なし'], [30, '30分'], [45, '45分'], [60, '1時間'], [90, '1時間30分'], [120, '2時間'], [180, '3時間']].map(([v, l]) => h('option', { value: v, selected: pl.limitMin === v ? true : null }, l)));
    return UI.section('勉強とのバランス',
      h('div', { class: 'set-row' }, h('span', { class: 'set-lbl' }, '1日のプレイ時間の上限', h('span', { class: 'muted small set-desc' }, '超えたら休憩をうながす（' + MF.Balance.well.snoozeMin + '分の延長は1日' + MF.Balance.well.maxSnooze + '回まで）')), sel),
      h('div', { class: 'small' }, '今日のプレイ時間：' + U.fmtTime(pl.day === U.dateStr(Date.now()) ? pl.sec : 0) + (pl.limitMin ? '（のこり ' + U.fmtTime(W.remaining(s, Date.now())) + '）' : '')),
      h('div', { class: 'set-row' }, h('span', { class: 'set-lbl' }, '🍅 勉強タイマー（ポモドーロ）', h('span', { class: 'muted small set-desc' }, '上のバーの🍅からも使える')), h('button', { class: 'btn small', onclick: () => pomoPanel() }, '開く')));
  });
})(globalThis.MF = globalThis.MF || {});
