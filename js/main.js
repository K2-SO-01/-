/* 数学ファクトリー：起動とメインループ（ブラウザ専用） */
(function (MF) {
  'use strict';
  const G = MF.Game, UI = MF.UI;
  const App = MF.App;
  App.TICK_MS = 250;

  App.KEY = 'mathFactory.save.v1';
  App.BACKUP_KEY = 'mathFactory.backup.v1';
  App.storageOk = true;
  App.newState = function () { return G.createState(Date.now()); };
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { App.storageOk = false; return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { App.storageOk = false; return false; } }
  App.loadState = function () {
    const raw = lsGet(App.KEY);
    if (!raw) return null;
    try { return G.deserialize(raw, Date.now()); }
    catch (e) {
      console.error('セーブデータが壊れています。バックアップから復元します', e);
      const bk = lsGet(App.BACKUP_KEY);
      if (bk) { try { const s = G.deserialize(bk, Date.now()); setTimeout(() => UI.toast('セーブが壊れていたのでバックアップから復元したよ', 'warn', 5000), 500); return s; } catch (e2) { console.error(e2); } }
      return null;
    }
  };
  App.save = function () {
    const s = UI.state;
    if (!s || App.resetting) return false;
    s.lastSaved = Date.now();
    const json = G.serialize(s);
    const ok = lsSet(App.KEY, json);
    if (!App.lastBackup || Date.now() - App.lastBackup > 5 * 60 * 1000) { lsSet(App.BACKUP_KEY, json); App.lastBackup = Date.now(); }
    return ok;
  };
  App.exportText = function () { App.save(); return G.serialize(UI.state); };
  App.download = function (filename, text, type) {
    const blob = new Blob([text], { type: type || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  // Artifact（claude.ai）の中など、ブラウザ保存やファイル保存に制限がある場所かどうか
  App.inArtifact = !!window.MF_ARTIFACT;
  /** 状態を差しかえて、ページを読み直さずに最初から描き直す */
  App.restart = function (s, info) {
    UI.modalStack.slice().forEach((c) => c());
    if (MF.QuizUI) MF.QuizUI.session = null;
    if (MF.FactoryUI) MF.FactoryUI.sel = null;
    UI.state = s;
    App.applySettings();
    App.bootHooks.forEach((fn) => { try { fn(s, info); } catch (e) { console.error(e); } });
    UI.renderHeader();
    UI.go('quiz');
    App.resetting = false;
    App.save();
  };
  App.importText = function (text) {
    const s = G.deserialize(String(text).trim(), Date.now()); // 失敗したら例外
    lsSet(App.KEY, G.serialize(s));
    App.restart(s, { fresh: false, imported: true });
  };
  App.reset = function () {
    try { window.localStorage.removeItem(App.KEY); window.localStorage.removeItem(App.BACKUP_KEY); } catch (e) { /* noop */ }
    App.restart(App.newState(), { fresh: true });
  };

  App.applySettings = function () {
    const st = UI.state.settings;
    document.documentElement.style.setProperty('--fs', String(st.fontScale || 1));
    document.body.classList.toggle('reduce-motion', !!st.reduceMotion);
    document.body.classList.toggle('high-contrast', !!st.highContrast);
  };

  App.boot = function (hot) {
    let s = null, info = { fresh: false };
    // 公開中のページが更新されたときは、直前の状態から再開する
    if (hot && hot.save) { try { s = G.deserialize(hot.save, Date.now()); } catch (e) { s = null; } }
    if (!s) { try { s = App.loadState(); } catch (e) { console.error(e); } }
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
      if (dt > 5) { // タブを閉じていた・スリープしていた間はオフライン生産として処理
        App.catchUpHooks.forEach((fn) => { try { fn(UI.state, dt, now); } catch (e) { console.error(e); } });
        UI.state.lastTick = now;
        return;
      }
      G.tick(UI.state, dt, now);
    }, App.TICK_MS);
    let lastF = performance.now();
    const frame = (t) => {
      const dt = Math.min(0.1, (t - lastF) / 1000);
      lastF = t;
      try {
        UI.renderHeader();
        UI.drainNotices();
        App.slowAcc = (App.slowAcc || 0) + dt;
        if (App.slowAcc > 0.25) { App.slowAcc = 0; UI.updateLive(); UI.updateNav(); UI.updateScreen(); }
        const d = UI.screens[UI.current];
        if (d && d.update) d.update(UI.state, dt, Date.now());
        App.frameHooks.forEach((fn) => fn(UI.state, dt, Date.now()));
      } catch (e) { console.error(e); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.escapeModal(); });
    setInterval(() => App.save(), 10000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') App.save(); });
    window.addEventListener('pagehide', () => App.save());
    if (!App.storageOk) setTimeout(() => UI.toast('この環境では自動セーブが使えません。設定から書き出しで保存してね', 'warn', 6000), 800);
  };
  function start(data) { App.boot(data || {}); }
  function bootWithHot() {
    const hot = window.claude && window.claude.hot;
    if (hot && typeof hot.snapshot === 'function') {
      try { hot.snapshot(() => { App.save(); return { save: UI.state ? G.serialize(UI.state) : null }; }); } catch (e) { /* noop */ }
    }
    if (hot && typeof hot.ready === 'function') hot.ready(start);
    else start(hot && hot.data);
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootWithHot);
  else bootWithHot();
})(globalThis.MF = globalThis.MF || {});
