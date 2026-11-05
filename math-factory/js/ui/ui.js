/* 数学ファクトリー：画面の共通部品（画面切り替え・モーダル・トースト・ヘッダー） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game;
  const UI = {};
  // アプリ全体のフック（main.js で使う）。画面モジュールより先に用意しておく
  MF.App = MF.App || { bootHooks: [], frameHooks: [], catchUpHooks: [] };
  UI.screens = {};
  UI.order = [];
  UI.current = null;

  /** DOM を作る小さなヘルパー：h('div', {class:'x', onclick: fn}, child, ...) */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => append(el, x)); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  UI.h = h;
  UI.$ = (sel, root) => (root || document).querySelector(sel);

  UI.itemChip = function (id, amount, opts) {
    const it = G.ITEMS[id] || { name: id === 'rp' ? '研究P' : id, sym: id === 'rp' ? 'R' : '?', color: '#39d0ff' };
    const el = h('span', { class: 'chip item-chip' + (opts && opts.big ? ' big' : ''), title: it.name },
      h('span', { class: 'sym', style: { background: it.color } }, it.sym),
      opts && opts.noName ? null : h('span', { class: 'nm' }, it.name),
      amount !== undefined && amount !== null ? h('span', { class: 'amt' }, typeof amount === 'number' ? U.fmtNum(amount) : amount) : null);
    return el;
  };
  UI.costNodes = function (cost, mult) {
    const s = UI.state;
    return Object.keys(cost).map((k) => {
      const need = Math.ceil(cost[k] * (mult || 1));
      const have = k === 'rp' ? s.rp : (s.inv[k] || 0);
      const c = UI.itemChip(k, need, { noName: false });
      if (have < need) c.classList.add('lack');
      return c;
    });
  };

  // ---------- 画面 ----------
  UI.screen = function (id, def) { def.id = id; UI.screens[id] = def; UI.order.push(id); };
  UI.isLocked = function (id) {
    const d = UI.screens[id];
    return d && d.locked ? d.locked(UI.state) : false;
  };
  UI.go = function (id, params) {
    const d = UI.screens[id];
    if (!d) return;
    const lock = UI.isLocked(id);
    if (lock) { UI.toast('🔒 ' + lock, 'warn'); return; }
    if (UI.current && UI.screens[UI.current].leave) UI.screens[UI.current].leave(UI.state);
    UI.current = id;
    UI.params = params || {};
    const root = UI.$('#screen');
    root.innerHTML = '';
    root.className = 'screen screen-' + id;
    d.render(root, UI.state, UI.params);
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    UI.renderNav();
    if (MF.Audio) { MF.Audio.play('click'); MF.Audio.setMood(UI.moodOf(id)); }
  };
  UI.moodOf = (id) => (id === 'battle' || id === 'run' ? 'battle' : id === 'galaxy' ? 'galaxy' : ['study', 'awards', 'settings', 'story', 'pals'].indexOf(id) >= 0 ? 'calm' : 'factory');
  UI.rerender = function () {
    if (!UI.current) return;
    const root = UI.$('#screen');
    const y = window.scrollY;
    root.innerHTML = '';
    UI.screens[UI.current].render(root, UI.state, UI.params || {});
    window.scrollTo(0, y);
    UI.renderNav();
  };
  UI.renderNav = function () {
    const nav = UI.$('#nav');
    if (!nav) return;
    nav.innerHTML = '';
    const main = UI.order.filter((id) => UI.screens[id].nav === 'main').sort((a, b) => (UI.screens[a].navOrder || 0) - (UI.screens[b].navOrder || 0));
    const more = UI.order.filter((id) => UI.screens[id].nav === 'more');
    const mk = (id) => {
      const d = UI.screens[id];
      const lock = UI.isLocked(id);
      const badge = d.badge ? d.badge(UI.state) : null;
      return h('button', { class: 'nav-btn' + (UI.current === id ? ' active' : '') + (lock ? ' locked' : ''), onclick: () => UI.go(id), 'aria-label': d.title },
        h('span', { class: 'nav-ico' }, d.icon), h('span', { class: 'nav-lbl' }, d.short || d.title), badge ? h('span', { class: 'nav-badge' }, badge) : null);
    };
    main.forEach((id) => nav.appendChild(mk(id)));
    if (more.length) {
      const moreActive = more.indexOf(UI.current) >= 0 || UI.current === 'menu';
      const anyBadge = more.some((id) => UI.screens[id].badge && UI.screens[id].badge(UI.state));
      nav.appendChild(h('button', { class: 'nav-btn nav-more' + (moreActive ? ' active' : ''), onclick: () => UI.go('menu') },
        h('span', { class: 'nav-ico' }, '☰'), h('span', { class: 'nav-lbl' }, 'メニュー'), anyBadge ? h('span', { class: 'nav-badge dot' }, '●') : null));
      const side = h('div', { class: 'nav-side-more' });
      more.forEach((id) => side.appendChild(mk(id)));
      nav.appendChild(side);
    }
  };
  // 「メニュー」画面（スマホ用：下のバーに入りきらない画面の一覧）
  UI.screen('menu', {
    title: 'メニュー', icon: '☰', nav: null,
    render(root) {
      root.appendChild(h('h2', { class: 'screen-title' }, 'メニュー'));
      const grid = h('div', { class: 'menu-grid' });
      UI.order.filter((id) => UI.screens[id].nav === 'more' || UI.screens[id].nav === 'main').forEach((id) => {
        const d = UI.screens[id];
        const lock = UI.isLocked(id);
        const badge = d.badge ? d.badge(UI.state) : null;
        grid.appendChild(h('button', { class: 'menu-tile' + (lock ? ' locked' : ''), onclick: () => UI.go(id) },
          h('span', { class: 'menu-ico' }, lock ? '🔒' : d.icon), h('span', { class: 'menu-lbl' }, d.title),
          lock ? h('span', { class: 'menu-sub' }, lock) : d.sub ? h('span', { class: 'menu-sub' }, d.sub) : null,
          badge ? h('span', { class: 'nav-badge' }, badge) : null));
      });
      root.appendChild(grid);
    },
  });

  // ---------- ヘッダー ----------
  UI.headerItems = function (s) {
    const ids = ['iron', 'copper', 'coal', 'stone', 'uranium', 'silicon', 'oil'];
    ['titanium', 'gold', 'crystal', 'helium'].forEach((k) => { if (s.inv[k] > 0) ids.push(k); });
    return ids;
  };
  UI.headerExtras = []; // 他の画面が足すヘッダー部品 (s) => node
  UI.renderHeader = function () {
    const s = UI.state;
    const strip = UI.$('#res-strip');
    if (!strip) return;
    const ids = UI.headerItems(s);
    const key = ids.join(',');
    if (strip.dataset.key !== key) {
      strip.dataset.key = key;
      strip.innerHTML = '';
      ids.forEach((id) => {
        const c = UI.itemChip(id, 0, { noName: true });
        c.dataset.id = id;
        strip.appendChild(c);
      });
      const rp = UI.itemChip('rp', 0, { noName: true }); rp.dataset.id = 'rp'; rp.classList.add('rp');
      strip.appendChild(rp);
      strip.onclick = () => UI.showInventory();
    }
    strip.querySelectorAll('.item-chip').forEach((c) => {
      const id = c.dataset.id;
      const v = id === 'rp' ? s.rp : s.inv[id];
      const t = U.fmtNum(v || 0);
      const amt = c.querySelector('.amt');
      if (amt.textContent !== t) {
        if (amt.textContent !== '' && Number(v) > Number(c.dataset.v || 0)) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
        amt.textContent = t;
        c.dataset.v = v;
      }
    });
    const ex = UI.$('#top-extras');
    if (ex) {
      // 毎フレーム作り直すとクリックが取りこぼされるので、中身が変わったときだけ差しかえる
      while (ex.children.length < UI.headerExtras.length) {
        const slot = document.createElement('span');
        slot.className = 'hx-slot';
        slot.addEventListener('click', (e) => { const c = slot.firstElementChild; if (c && !c.contains(e.target)) c.click(); });
        ex.appendChild(slot);
      }
      UI.headerExtras.forEach((fn, i) => {
        const slot = ex.children[i];
        const n = fn(s);
        const html = n ? n.outerHTML : '';
        if (slot.dataset.html === html) return;
        slot.dataset.html = html;
        slot.innerHTML = '';
        if (n) slot.appendChild(n);
      });
    }
  };
  UI.showInventory = function () {
    const s = UI.state;
    const raw = G.ITEM_IDS.filter((id) => G.ITEMS[id].raw);
    const prod = G.ITEM_IDS.filter((id) => !G.ITEMS[id].raw);
    const body = h('div', {},
      h('h4', {}, '資源（問題を解くと手に入る）'),
      h('div', { class: 'chip-wrap' }, raw.map((id) => {
        const t = Object.values(MF.Questions.TOPICS).find((x) => x.resource === id);
        return h('div', { class: 'inv-row' }, UI.itemChip(id, s.inv[id] || 0), t ? h('span', { class: 'muted small' }, '← ' + t.name) : null);
      })),
      h('h4', {}, '製品（工場でつくる）'),
      h('div', { class: 'chip-wrap' }, prod.map((id) => UI.itemChip(id, s.inv[id] || 0))),
      h('p', { class: 'muted small' }, '研究P（研究ポイント）：' + Math.floor(s.rp)));
    UI.modal({ title: '持ち物', body });
  };

  // ---------- モーダル ----------
  UI.modalStack = [];
  UI.modal = function (o) {
    const root = UI.$('#modal-root');
    const box = h('div', { class: 'modal ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true' });
    const back = h('div', { class: 'modal-back' }, box);
    const close = () => {
      if (!back.parentNode) return;
      back.remove();
      UI.modalStack = UI.modalStack.filter((x) => x !== close);
      if (o.onClose) o.onClose();
    };
    if (o.title) box.appendChild(h('div', { class: 'modal-head' }, h('h3', {}, o.title), o.noClose ? null : h('button', { class: 'icon-btn', 'aria-label': '閉じる', onclick: close }, '✕')));
    const body = h('div', { class: 'modal-body' });
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    box.appendChild(body);
    if (o.buttons) o.buttons = o.buttons.filter(Boolean);
    if (o.buttons && o.buttons.length) {
      box.appendChild(h('div', { class: 'modal-foot' }, o.buttons.map((b) => h('button', {
        class: 'btn ' + (b.cls || ''), disabled: b.disabled,
        onclick: () => { const keep = b.action ? b.action(close) : false; if (keep !== true) close(); },
      }, b.label))));
    }
    if (!o.noClose) back.addEventListener('click', (e) => { if (e.target === back) close(); });
    root.appendChild(back);
    UI.modalStack.push(close);
    const first = box.querySelector('.modal-foot .btn, input, button');
    if (first && !o.noFocus) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) { /* noop */ } }, 30);
    return close;
  };
  UI.closeTopModal = function () { const c = UI.modalStack[UI.modalStack.length - 1]; if (c) c(); };
  UI.confirm = function (title, text, okLabel, onOk, cls) {
    UI.modal({ title, body: h('p', {}, text), buttons: [{ label: 'やめる', cls: 'ghost' }, { label: okLabel || 'OK', cls: cls || 'primary', action: onOk }] });
  };

  // ---------- トースト ----------
  // 一度にたくさん出ると画面がうまるので、順番待ちにして少しずつ出す
  UI.toastQueue = [];
  UI.toast = function (msg, kind, ms) {
    const root = UI.$('#toast-root');
    if (!root) return;
    const text = String(msg);
    if (UI.toastQueue.some((x) => x.text === text) || Array.from(root.children).some((c) => c.textContent === text)) return;
    UI.toastQueue.push({ text, kind, ms });
    if (UI.toastQueue.length > 12) UI.toastQueue.splice(0, UI.toastQueue.length - 12);
    pumpToasts();
  };
  function pumpToasts() {
    const root = UI.$('#toast-root');
    const max = window.matchMedia && window.matchMedia('(max-width: 600px)').matches ? 2 : 3;
    while (root.querySelectorAll('.toast:not(.out)').length < max && UI.toastQueue.length) {
      const it = UI.toastQueue.shift();
      const t = h('div', { class: 'toast ' + (it.kind || '') }, it.text);
      t.addEventListener('click', () => done());
      root.appendChild(t);
      const dur = Math.max(1400, (it.ms || 2600) - UI.toastQueue.length * 350);
      let gone = false;
      const done = () => { if (gone) return; gone = true; t.classList.add('out'); setTimeout(() => { t.remove(); pumpToasts(); }, 350); };
      setTimeout(done, dur);
    }
  }
  UI.drainNotices = function () {
    const s = UI.state;
    const list = s.runtime.notices;
    while (list.length) {
      const n = list.shift();
      if (UI.noticeHandlers[n.type]) { if (UI.noticeHandlers[n.type](n) === true) continue; }
      UI.toast(n.text, n.kind || n.type, n.ms);
    }
  };
  UI.noticeHandlers = {};

  // 進捗バー
  UI.bar = function (v, max, cls, label) {
    const p = max > 0 ? U.clamp(v / max, 0, 1) : 0;
    return h('div', { class: 'bar ' + (cls || '') }, h('div', { class: 'bar-fill', style: { width: (p * 100).toFixed(1) + '%' } }), label ? h('span', { class: 'bar-lbl' }, label) : null);
  };
  UI.section = function (title, ...children) {
    return h('section', { class: 'card' }, title ? h('h3', { class: 'card-title' }, title) : null, ...children);
  };

  MF.UI = UI;
})(globalThis.MF = globalThis.MF || {});
