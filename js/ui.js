// 画面（DOMオーバーレイ）の表示切り替えと、スキン・設定・結果画面の描画
import { SKINS, getSkin, fillSkin } from './skins.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor({ storage, haptics }) {
    this.storage = storage;
    this.haptics = haptics;
    this.screens = {
      title: $('screen-title'),
      result: $('screen-result'),
      skins: $('screen-skins'),
      settings: $('screen-settings'),
      pause: $('screen-pause'),
    };
    this.current = 'title';
    this.prev = 'title';
    this.pauseBtn = $('btn-pause');
    if (!haptics.supported) $('vib-note').textContent = 'この端末は非対応';
  }

  show(name) {
    if (name === 'skins' || name === 'settings') {
      if (this.current !== 'skins' && this.current !== 'settings') this.prev = this.current;
    }
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('hidden', k !== name);
    this.current = name;
    this.pauseBtn.classList.toggle('hidden', name !== null);
    if (name === 'title') this.refreshTitle();
    if (name === 'skins') this.renderSkins();
    if (name === 'settings') this.renderSettings();
  }

  back() {
    this.show(this.prev || 'title');
    if (this.prev === 'result') this.refreshNext();
  }

  refreshTitle() {
    const d = this.storage.data;
    $('title-best').textContent = d.best;
    $('title-coins').textContent = d.coins;
  }

  // ---- 結果画面 ----
  showResult(r) {
    const d = this.storage.data;
    $('result-score').textContent = r.score;
    $('result-score').classList.toggle('best', r.newBest);
    $('result-best').textContent = d.best;
    $('result-newbest').classList.toggle('hidden', !r.newBest);
    $('r-time').textContent = `${r.time.toFixed(1)}s`;
    $('r-near').textContent = r.near;
    $('r-perfect').textContent = r.perfect;
    $('r-combo').textContent = r.maxCombo;
    $('r-coins').textContent = r.coins;
    $('r-total').textContent = `/ ${d.coins}`;
    this.refreshNext();
    this.show('result');
    // 直前まで操作していた指の誤タップ防止
    const retry = $('btn-retry');
    retry.classList.add('locked');
    this.retryReadyAt = performance.now() + 350;
    setTimeout(() => retry.classList.remove('locked'), 350);
  }

  get retryReady() { return performance.now() >= (this.retryReadyAt || 0); }

  /** 次に解放できるスキンへの案内（「もう一回」の動機付け） */
  refreshNext() {
    const d = this.storage.data;
    const el = $('r-next');
    const locked = SKINS.filter((s) => !d.unlocked.includes(s.id)).sort((a, b) => a.cost - b.cost);
    el.classList.remove('ready');
    if (!locked.length) { el.textContent = 'ALL SKINS UNLOCKED'; return; }
    const n = locked[0];
    if (d.coins >= n.cost) {
      el.textContent = `${n.name} を解放できます → SKINS`;
      el.classList.add('ready');
    } else {
      el.textContent = `次のスキン ${n.name} まで あと ${n.cost - d.coins} COIN`;
    }
  }

  // ---- スキン画面 ----
  renderSkins(justUnlocked = null) {
    const d = this.storage.data;
    $('skins-coins').textContent = d.coins;
    const grid = $('skin-grid');
    grid.textContent = '';
    for (const s of SKINS) {
      const owned = d.unlocked.includes(s.id);
      const btn = document.createElement('button');
      btn.className = 'skin';
      btn.dataset.ui = '';
      btn.dataset.skin = s.id;
      if (!owned) btn.classList.add('locked');
      if (!owned && d.coins >= s.cost) btn.classList.add('affordable');
      if (d.skin === s.id) btn.classList.add('selected');
      if (justUnlocked === s.id) btn.classList.add('unlocked-now');
      btn.appendChild(this.preview(s));
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = s.name;
      const price = document.createElement('span');
      price.className = 'price';
      price.textContent = owned ? (d.skin === s.id ? 'SELECTED' : 'OWNED') : `${s.cost} COIN`;
      btn.append(name, price);
      grid.appendChild(btn);
    }
  }

  preview(skin) {
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = c.height = 54 * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.translate(27, 27);
    ctx.fillStyle = '#fff';
    fillSkin(ctx, skin, 15);
    return c;
  }

  /** スキンボタンが押された。結果: 'select' | 'unlock' | 'nope' */
  pickSkin(id, btn) {
    const d = this.storage.data;
    const s = getSkin(id);
    if (d.unlocked.includes(id)) {
      d.skin = id;
      this.storage.save();
      this.renderSkins();
      return 'select';
    }
    if (d.coins >= s.cost) {
      d.coins -= s.cost;
      d.unlocked.push(id);
      d.skin = id;
      this.storage.save();
      this.renderSkins(id);
      return 'unlock';
    }
    btn.classList.remove('nope');
    void btn.offsetWidth;
    btn.classList.add('nope');
    return 'nope';
  }

  // ---- 設定画面 ----
  renderSettings() {
    const st = this.storage.data.settings;
    document.querySelectorAll('[data-setting]').forEach((b) => {
      b.setAttribute('aria-pressed', String(!!st[b.dataset.setting]));
    });
    $('sens').value = st.sensitivity;
    $('sens-value').textContent = Number(st.sensitivity).toFixed(2);
  }
}
