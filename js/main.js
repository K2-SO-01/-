// エントリポイント：各モジュールの結線・画面遷移・メインループ
import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { haptics } from './haptics.js';
import { AudioManager } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { UI } from './ui.js';

storage.load();
const settings = storage.data.settings;

const app = document.getElementById('app');
const canvas = document.getElementById('game');
const audio = new AudioManager();
audio.preload();

// ---- レイアウト（PCなどでは縦長の枠に収める） ----
function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(vw, Math.round(vh * CONFIG.world.maxAspect));
  app.style.width = (vw / vh > 0.8 ? w : vw) + 'px';
}
layout();

const ui = new UI({ storage, haptics });

const input = new Input({
  onDown() {
    // 画面の空き部分を押した瞬間に開始／再開（その指でそのままドラッグ）
    if (ui.current === 'title' && game.state === 'title') startGame();
    else if (ui.current === 'pause' && game.state === 'paused') resumeGame();
  },
});

const game = new Game(canvas, {
  input, audio, haptics, storage,
  onGameOver: handleGameOver,
});

function applySettings() {
  audio.setEnabled(settings.sound);
  haptics.enabled = settings.vibration;
}
applySettings();

// ---- 画面遷移 ----
function startGame() {
  audio.unlock();
  ui.show(null);
  game.start();
  audio.play('start');
  audio.startBgm();
  tryLockPortrait();
}

function resumeGame() {
  ui.show(null);
  audio.resume();
  game.resume();
}

function pauseGame() {
  if (game.state !== 'play') return;
  game.pause();
  audio.suspend();
  ui.show('pause');
}

function goHome() {
  audio.stopBgm(0.2);
  audio.resume();
  game.toTitle();
  ui.show('title');
}

function handleGameOver(r) {
  const d = storage.data;
  const newBest = r.score > d.best;
  if (newBest) d.best = r.score;
  d.coins += r.coins;
  d.plays += 1;
  storage.save();
  ui.showResult({ ...r, newBest });
  if (newBest && r.score > 0) {
    game.fx.celebrate(2.5);
    audio.play('best');
    haptics.pulse(CONFIG.vibration.best);
  }
}

// ---- ボタン ----
const retry = document.getElementById('btn-retry');
retry.addEventListener('pointerdown', (e) => {
  // ワンタップ即リトライ：押した指をそのままドラッグ操作に引き継ぐ
  if (!ui.retryReady) return;
  e.preventDefault();
  input.claim(e);
  startGame();
});
retry.addEventListener('click', (e) => e.preventDefault());

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action], [data-setting], [data-skin]');
  if (!el) return;
  audio.unlock();
  if (el.dataset.skin) {
    const res = ui.pickSkin(el.dataset.skin, el);
    if (res === 'unlock') {
      audio.play('unlock');
      haptics.pulse(CONFIG.vibration.unlock);
    } else if (res === 'select') {
      audio.play('tap');
    } else {
      haptics.pulse(20);
    }
    game.setSkin(storage.data.skin);
    return;
  }
  if (el.dataset.setting) {
    const k = el.dataset.setting;
    settings[k] = !settings[k];
    storage.save();
    applySettings();
    ui.renderSettings();
    audio.play('tap');
    if (k === 'vibration') haptics.pulse(15);
    return;
  }
  const action = el.dataset.action;
  if (action !== 'pause') audio.play('tap');
  switch (action) {
    case 'skins': ui.show('skins'); break;
    case 'settings': ui.show('settings'); break;
    case 'back': ui.back(); break;
    case 'home': goHome(); break;
    case 'pause': pauseGame(); break;
    case 'reset':
      if (window.confirm('ハイスコア・コイン・スキンをすべて消去しますか？')) {
        storage.reset();
        Object.assign(settings, storage.data.settings);
        storage.data.settings = settings;
        storage.save();
        applySettings();
        game.setSkin(storage.data.skin);
        ui.renderSettings();
      }
      break;
  }
});

const sens = document.getElementById('sens');
sens.min = CONFIG.input.sensitivityMin;
sens.max = CONFIG.input.sensitivityMax;
sens.addEventListener('input', () => {
  settings.sensitivity = Number(sens.value);
  document.getElementById('sens-value').textContent = settings.sensitivity.toFixed(2);
});
sens.addEventListener('change', () => storage.save());

// PCでの確認用：Space / Enter で開始・リトライ
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  if (ui.current === 'title' || (ui.current === 'result' && ui.retryReady)) {
    e.preventDefault();
    startGame();
  }
});

// ---- iOS の音声制限解除（最初のタップで AudioContext を開放） ----
const unlockAudio = () => audio.unlock();
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
  window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
}

// ---- バックグラウンド・回転・リサイズ ----
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseGame();
    audio.suspend();
  } else if (game.state !== 'paused') {
    audio.resume();
  }
});

function onResize() {
  layout();
  game.resize();
  if (window.innerWidth > window.innerHeight && matchMedia('(pointer: coarse)').matches) pauseGame();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

function tryLockPortrait() {
  try {
    const o = screen.orientation;
    if (o && o.lock) o.lock('portrait').catch(() => {});
  } catch { /* 非対応 */ }
}

// ---- メインループ（requestAnimationFrame + delta time） ----
let last = performance.now();
function loop(now) {
  const dt = Math.max(0, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame((t) => { last = t; loop(t); });

ui.show('title');
if (game.debug) window.__game = game;

// ---- PWA: Service Worker ----
// ?nosw を付けて開くと SW を解除（開発中のキャッシュ対策）
if ('serviceWorker' in navigator) {
  if (/[?&]nosw\b/.test(location.search)) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
  } else if (window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}
