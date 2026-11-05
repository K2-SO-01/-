/* 数学ファクトリー：起動とメインループ（ブラウザ専用） */
(function (MF) {
  'use strict';
  const G = MF.Game, UI = MF.UI;
  const App = {};
  MF.App = App;
  App.TICK_MS = 250;
  App.bootHooks = [];   // (state, info) => void  起動直後（オフライン生産の報告など）
  App.frameHooks = [];  // (state, dt, now) => void 毎フレーム（画面の更新）

  App.newState = function () { return G.createState(Date.now()); };
  App.loadState = function () { return null; };   // ステップ2で localStorage 対応
  App.save = function () { /* ステップ2 */ };

  App.applySettings = function () {
    const st = UI.state.settings;
    document.documentElement.style.setProperty('--fs', String(st.fontScale || 1));
    document.body.classList.toggle('reduce-motion', !!st.reduceMotion);
    document.body.classList.toggle('high-contrast', !!st.highContrast);
  };

  App.boot = function () {
    let s = null, info = { fresh: false };
    try { s = App.loadState(); } catch (e) { console.error(e); }
    if (!s) { s = App.newState(); info.fresh = true; }
    UI.state = s;
    App.applySettings();
    App.bootHooks.forEach((fn) => { try { fn(s, info); } catch (e) { console.error(e); } });
    UI.renderHeader();
    UI.go(UI.startScreen || 'quiz');
    let last = Date.now();
    setInterval(() => {
      const now = Date.now();
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 5) dt = 5; // タブ復帰時などの大きな飛びはオフライン処理に任せる
      G.tick(UI.state, dt, now);
    }, App.TICK_MS);
    let lastF = performance.now();
    const frame = (t) => {
      const dt = Math.min(0.1, (t - lastF) / 1000);
      lastF = t;
      try {
        UI.renderHeader();
        UI.drainNotices();
        const d = UI.screens[UI.current];
        if (d && d.update) d.update(UI.state, dt, Date.now());
        App.frameHooks.forEach((fn) => fn(UI.state, dt, Date.now()));
      } catch (e) { console.error(e); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeTopModal(); });
  };
  window.addEventListener('DOMContentLoaded', () => App.boot());
})(globalThis.MF = globalThis.MF || {});
