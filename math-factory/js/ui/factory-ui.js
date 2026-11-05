/* 数学ファクトリー：工場画面（キャンバスにグリッドを描き、タップで建設・ドラッグでベルト） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, F = MF.Factory, UI = MF.UI, B = MF.Balance;
  const h = UI.h;
  const FUI = {
    tool: 'inspect', type: 'miner', dir: 1, sel: null, zoom: 1, ox: 0, oy: 0, cs: 32, hover: null,
    tools: [
      { id: 'inspect', icon: '👆', label: '調べる' },
      { id: 'build', icon: '🔨', label: '建てる' },
      { id: 'rotate', icon: '🔄', label: '回す' },
      { id: 'remove', icon: '🗑', label: '撤去' },
    ],
    paletteOrder: ['miner', 'belt', 'furnace', 'power', 'storage', 'assembler', 'lab'],
    infoExtras: [],     // (s, b, box) => void  選んだ設備の情報欄に足す
    overlayDraw: [],    // (ctx, s, b, x, y, cs) => void
    toolHandlers: {},   // 追加のツール（強化・設計図など）
    statusExtras: [],
    belowExtras: [],
  };
  MF.FactoryUI = FUI;
  const STATE_TXT = { work: ['稼働中', '#52d273'], idle: ['待機', '#9aa3ad'], noinput: ['材料待ち', '#ffcf4a'], full: ['出口が詰まっている', '#ff5d5d'], nofuel: ['燃料（石炭）切れ', '#ff5d5d'], lowpower: ['電力不足', '#ff9a3d'], norecipe: ['レシピ未設定', '#ffcf4a'], broken: ['故障中（修理が必要）', '#ff5d5d'] };
  FUI.STATE_TXT = STATE_TXT;

  // ---------- ヘッダーの「演算チャージ」 ----------
  UI.headerExtras.push((s) => {
    if (!s.factory) return null;
    const f = s.factory, max = F.chargeMax(s);
    const low = f.charge <= 0;
    return h('button', { class: 'charge-chip' + (low ? ' empty' : f.charge < 60 ? ' low' : ''), title: '演算チャージ：問題に正解するとたまり、工場がフル稼働する', onclick: () => UI.go('quiz') },
      h('span', {}, '🧠'), h('span', { class: 'cc-bar' }, h('span', { class: 'cc-fill', style: { width: (100 * f.charge / max).toFixed(0) + '%' } })),
      h('span', { class: 'cc-t' }, low ? '省電力' : U.fmtClock(f.charge)));
  });

  // ---------- 描画 ----------
  function drawTile(ctx, x, y, cs, ore) {
    ctx.fillStyle = (x + y) % 2 ? '#1a1e23' : '#1c2026';
    ctx.fillRect(x * cs, y * cs, cs, cs);
    if (ore) {
      const c = G.ITEMS[ore].color;
      ctx.fillStyle = c + '30';
      ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      ctx.fillStyle = c + 'b0';
      const r = U.rng((x * 73856093) ^ (y * 19349663));
      for (let i = 0; i < 5; i++) { const px = x * cs + 3 + r.next() * (cs - 6), py = y * cs + 3 + r.next() * (cs - 6); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, cs * (0.05 + r.next() * 0.05)), 0, 7); ctx.fill(); }
    }
  }
  function rr(ctx, x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  FUI.rr = rr;
  function drawBelt(ctx, b, cs, t, flowItem) {
    const x = b.x * cs, y = b.y * cs;
    ctx.save();
    ctx.translate(x + cs / 2, y + cs / 2);
    ctx.rotate(b.dir * Math.PI / 2);
    ctx.fillStyle = '#2b3037'; ctx.fillRect(-cs * 0.42, -cs / 2, cs * 0.84, cs);
    ctx.fillStyle = '#3b414a'; ctx.fillRect(-cs * 0.42, -cs / 2, cs * 0.08, cs); ctx.fillRect(cs * 0.34, -cs / 2, cs * 0.08, cs);
    const off = flowItem ? (t * 1.6) % 1 : 0;
    ctx.strokeStyle = flowItem ? '#ffb02e' : '#59606b'; ctx.lineWidth = Math.max(1.5, cs * 0.06);
    for (let i = -1; i < 2; i++) {
      const yy = (i + 0.5 - off) * cs * 0.5;
      if (yy < -cs / 2 || yy > cs / 2) continue;
      ctx.beginPath(); ctx.moveTo(-cs * 0.2, yy + cs * 0.12); ctx.lineTo(0, yy - cs * 0.06); ctx.lineTo(cs * 0.2, yy + cs * 0.12); ctx.stroke();
    }
    if (flowItem && G.ITEMS[flowItem]) {
      ctx.fillStyle = G.ITEMS[flowItem].color;
      for (let i = 0; i < 2; i++) { const yy = ((1 - ((t * 1.6 + i * 0.5) % 1)) - 0.5) * cs; ctx.beginPath(); ctx.arc(0, yy, cs * 0.12, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawBuilding(ctx, s, b, cs, t) {
    const d = F.BUILDINGS[b.type];
    const x = b.x * cs, y = b.y * cs, p = Math.max(2, cs * 0.08);
    const skin = FUI.skinColor ? FUI.skinColor(s, b) : null;
    ctx.fillStyle = skin || d.color;
    rr(ctx, x + p, y + p, cs - 2 * p, cs - 2 * p, cs * 0.16); ctx.fill();
    ctx.strokeStyle = b.disabled ? '#ff5d5d' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 向き（出口）
    if (F.producesItems(b)) {
      ctx.save(); ctx.translate(x + cs / 2, y + cs / 2); ctx.rotate(b.dir * Math.PI / 2);
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(-cs * 0.12, -cs * 0.34); ctx.lineTo(0, -cs * 0.48); ctx.lineTo(cs * 0.12, -cs * 0.34); ctx.fill();
      ctx.restore();
    }
    ctx.font = Math.floor(cs * 0.48) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const wob = b.state === 'work' && !document.body.classList.contains('reduce-motion') ? Math.sin(t * 8 + b.id) * cs * 0.02 : 0;
    ctx.fillText(d.icon, x + cs / 2, y + cs / 2 + wob + 1);
    if (b.type === 'miner' && b.ore) { ctx.fillStyle = G.ITEMS[b.ore].color; ctx.beginPath(); ctx.arc(x + cs * 0.22, y + cs * 0.78, cs * 0.1, 0, 7); ctx.fill(); }
    if (b.type === 'assembler' && b.recipe && G.ITEMS[b.recipe]) { ctx.fillStyle = G.ITEMS[b.recipe].color; ctx.fillRect(x + cs * 0.14, y + cs * 0.7, cs * 0.16, cs * 0.16); }
    // 状態ランプ
    const st = STATE_TXT[b.state] || STATE_TXT.idle;
    if (b.type !== 'core' && b.type !== 'storage') { ctx.fillStyle = st[1]; ctx.beginPath(); ctx.arc(x + cs - p - cs * 0.1, y + p + cs * 0.1, cs * 0.075, 0, 7); ctx.fill(); }
    // 進み具合
    if (b.prog > 0 && b.state === 'work' && b.type !== 'miner') { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + p + 2, y + cs - p - 5, cs - 2 * p - 4, 3); ctx.fillStyle = '#ffb02e'; ctx.fillRect(x + p + 2, y + cs - p - 5, (cs - 2 * p - 4) * Math.min(1, b.prog), 3); }
    for (const fn of FUI.overlayDraw) fn(ctx, s, b, x, y, cs, t);
  }
  FUI.draw = function () {
    const cv = FUI.canvas;
    if (!cv || !document.body.contains(cv)) return;
    const s = UI.state, f = s.factory;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e1013'; ctx.fillRect(0, 0, W, H);
    const cs = FUI.cs * FUI.zoom;
    ctx.save();
    ctx.translate(FUI.ox, FUI.oy);
    const t = performance.now() / 1000;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) drawTile(ctx, x, y, cs, f.ore[y * f.w + x]);
    ctx.strokeStyle = 'rgba(255,176,46,.35)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, f.w * cs, f.h * cs);
    const flow = f.beltFlow || {};
    for (const id in f.b) { const b = f.b[id]; if (b.type === 'belt') drawBelt(ctx, b, cs, t, flow[F.idx(f, b.x, b.y)]); }
    for (const id in f.b) { const b = f.b[id]; if (b.type !== 'belt') drawBuilding(ctx, s, b, cs, t); }
    // 選択・ゴースト
    if (FUI.sel && f.b[FUI.sel]) { const b = f.b[FUI.sel]; ctx.strokeStyle = '#39d0ff'; ctx.lineWidth = 3; ctx.strokeRect(b.x * cs + 1.5, b.y * cs + 1.5, cs - 3, cs - 3); }
    if (FUI.hover && FUI.tool === 'build') {
      const { x, y } = FUI.hover;
      const ok = F.canPlace(s, FUI.type, x, y).ok;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = ok ? '#52d273' : '#ff5d5d';
      ctx.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4);
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x * cs + cs / 2, y * cs + cs / 2); ctx.rotate(FUI.dir * Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-cs * 0.15, cs * 0.05); ctx.lineTo(0, -cs * 0.25); ctx.lineTo(cs * 0.15, cs * 0.05); ctx.fill(); ctx.restore();
    }
    if (FUI.drawExtra) FUI.drawExtra(ctx, s, cs);
    ctx.restore();
  };
  FUI.fit = function () {
    const cv = FUI.canvas;
    if (!cv) return;
    const f = UI.state.factory;
    const W = cv.parentNode.clientWidth;
    const maxH = Math.max(260, window.innerHeight * 0.6);
    FUI.cs = Math.max(20, Math.min(54, Math.floor(Math.min(W / f.w, maxH / f.h))));
    const hgt = Math.min(f.h * FUI.cs, maxH);
    cv.style.height = hgt + 'px';
    FUI.zoom = 1;
    FUI.ox = Math.max(0, (W - f.w * FUI.cs) / 2); FUI.oy = 0;
  };
  function cellAt(e) {
    const r = FUI.canvas.getBoundingClientRect();
    const cs = FUI.cs * FUI.zoom;
    const x = Math.floor((e.clientX - r.left - FUI.ox) / cs), y = Math.floor((e.clientY - r.top - FUI.oy) / cs);
    const f = UI.state.factory;
    return F.inside(f, x, y) ? { x, y } : null;
  }
  function clampPan() {
    const cv = FUI.canvas, f = UI.state.factory, cs = FUI.cs * FUI.zoom;
    const W = cv.clientWidth, H = cv.clientHeight, gw = f.w * cs, gh = f.h * cs;
    FUI.ox = gw <= W ? (W - gw) / 2 : U.clamp(FUI.ox, W - gw - 20, 20);
    FUI.oy = gh <= H ? (H - gh) / 2 : U.clamp(FUI.oy, H - gh - 20, 20);
  }
  FUI.zoomBy = function (k, cx, cy) {
    const cv = FUI.canvas;
    if (cx === undefined) { cx = cv.clientWidth / 2; cy = cv.clientHeight / 2; }
    const old = FUI.zoom;
    FUI.zoom = U.clamp(FUI.zoom * k, 0.6, 3);
    const r = FUI.zoom / old;
    FUI.ox = cx - (cx - FUI.ox) * r; FUI.oy = cy - (cy - FUI.oy) * r;
    clampPan();
  };

  // ---------- 操作 ----------
  function act(cell, stroke) {
    const s = UI.state;
    if (!cell) return;
    const b = F.at(s, cell.x, cell.y);
    const tool = FUI.tool;
    if (FUI.toolHandlers[tool]) { FUI.toolHandlers[tool](s, cell, b); return; }
    if (tool === 'inspect') {
      FUI.sel = b ? b.id : null; renderInfo();
      const ore = s.factory.ore[F.idx(s.factory, cell.x, cell.y)];
      if (!b && ore && els.info) els.info.appendChild(h('div', { class: 'small' }, 'ここは ', UI.itemChip(ore, null), ' の鉱脈。「建てる」→「採掘」でここに採掘機を置こう。'));
      return;
    }
    if (tool === 'rotate') { if (b && b.type !== 'core') { F.rotate(s, b.id); sfx('click'); FUI.sel = b.id; renderInfo(); } return; }
    if (tool === 'remove') {
      if (!b) return;
      if (b.type === 'core') { UI.toast('コアは撤去できない', 'warn'); return; }
      F.remove(s, b.id); sfx('remove'); if (FUI.sel === b.id) FUI.sel = null; renderInfo(); refreshPalette(); return;
    }
    if (tool === 'build') {
      if (b) { if (!stroke) { FUI.sel = b.id; renderInfo(); } return; }
      const res = F.place(s, FUI.type, cell.x, cell.y, FUI.dir);
      if (!res.ok) { if (!stroke) UI.toast(res.reason, 'warn'); return; }
      sfx('build');
      if (MF.FX && MF.FX.puff) { const r = FUI.canvas.getBoundingClientRect(), cs = FUI.cs * FUI.zoom; MF.FX.puff({ x: r.left + FUI.ox + (cell.x + 0.5) * cs, y: r.top + FUI.oy + (cell.y + 0.5) * cs }); }
      FUI.sel = res.b.id; renderInfo(); refreshPalette();
      return res.b;
    }
  }
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };
  function bindCanvas(cv) {
    const ptrs = new Map();
    let start = null, moved = false, pinch = null, stroke = null;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; stroke = null; return; }
      start = { x: e.clientX, y: e.clientY, ox: FUI.ox, oy: FUI.oy, cell: cellAt(e) };
      moved = false;
      if (FUI.tool === 'build' && FUI.type === 'belt' && start.cell) {
        const ex = F.at(UI.state, start.cell.x, start.cell.y);
        stroke = { last: start.cell, placed: ex && ex.type === 'belt' ? ex : null };
        if (!ex) { const b = act(start.cell, true); if (b) stroke.placed = b; }
        moved = true; start.painted = true; start.wasEmpty = !ex;
      }
      else if (FUI.tool === 'remove' && start.cell && e.pointerType !== 'mouse') stroke = { remove: true, last: start.cell };
    });
    cv.addEventListener('pointermove', (e) => {
      const c = cellAt(e);
      if (e.pointerType === 'mouse') FUI.hover = c;
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = cv.getBoundingClientRect();
        FUI.zoomBy(d / pinch.d, pinch.cx - r.left, pinch.cy - r.top);
        pinch.d = d;
        return;
      }
      if (!start) return;
      if (stroke && !stroke.remove) {
        if (c && (c.x !== stroke.last.x || c.y !== stroke.last.y)) {
          const dx = Math.sign(c.x - stroke.last.x), dy = Math.sign(c.y - stroke.last.y);
          const dir = Math.abs(c.x - stroke.last.x) >= Math.abs(c.y - stroke.last.y) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
          if (stroke.placed && UI.state.factory.b[stroke.placed.id]) { stroke.placed.dir = dir; UI.state.factory.ver++; }
          FUI.dir = dir;
          const next = { x: stroke.last.x + (dir === 1 ? 1 : dir === 3 ? -1 : 0), y: stroke.last.y + (dir === 2 ? 1 : dir === 0 ? -1 : 0) };
          const b = act(next, true);
          stroke.placed = b || null;
          stroke.last = next;
          refreshDir();
        }
        return;
      }
      if (stroke && stroke.remove && moved) { if (c && (c.x !== stroke.last.x || c.y !== stroke.last.y)) { act(c, true); stroke.last = c; } return; }
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (dist > 8) moved = true;
      if (moved && !(stroke && stroke.remove)) { FUI.ox = start.ox + e.clientX - start.x; FUI.oy = start.oy + e.clientY - start.y; clampPan(); }
    });
    const end = (e) => {
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (start && !moved && !start.painted) act(cellAt(e) || start.cell, false);
      else if (start && start.painted && stroke && !start.wasEmpty && stroke.last === start.cell) { FUI.sel = stroke.placed ? stroke.placed.id : null; renderInfo(); }
      if (ptrs.size === 0) { start = null; stroke = null; }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); start = null; stroke = null; pinch = null; });
    cv.addEventListener('pointerleave', () => { FUI.hover = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); FUI.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- パネル ----------
  let els = {};
  function refreshDir() { if (els.dirBtn) els.dirBtn.textContent = '向き ' + F.DIR_ARROWS[FUI.dir]; }
  function setTool(id) {
    FUI.tool = id;
    if (els.tools) els.tools.querySelectorAll('.tool-btn').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    if (els.palette) els.palette.classList.toggle('hidden', id !== 'build');
    if (els.help) els.help.classList.toggle('hidden', id !== 'build');
    if (FUI.onToolChange) FUI.onToolChange(id, els);
  }
  FUI.setTool = setTool;
  function refreshPalette() {
    const s = UI.state;
    if (!els.palette) return;
    els.palette.querySelectorAll('.pal-btn').forEach((btn) => {
      const t = btn.dataset.type;
      const cost = F.costOf(s, t);
      btn.classList.toggle('on', FUI.type === t);
      btn.classList.toggle('cant', !G.has(s, cost));
    });
  }
  FUI.refreshPalette = refreshPalette;
  function buildPalette(s) {
    const pal = h('div', { class: 'palette' + (FUI.tool === 'build' ? '' : ' hidden') });
    FUI.paletteOrder.forEach((t) => {
      const d = F.BUILDINGS[t];
      if (!d) return;
      const unlocked = F.isUnlocked(s, t);
      const btn = h('button', { class: 'pal-btn' + (unlocked ? '' : ' locked'), dataset: { type: t }, title: d.desc,
        onclick: () => {
          if (!unlocked) { UI.toast('🔒 ' + d.name + 'は研究で解放されるよ', 'warn'); return; }
          FUI.type = t; refreshPalette();
          showBuildingHelp(t);
        } },
      h('span', { class: 'pal-ico' }, d.icon || '➡️'), h('span', { class: 'pal-name' }, d.short || d.name),
      h('span', { class: 'pal-cost' }, unlocked ? Object.keys(F.costOf(s, t)).map((k) => UI.itemChip(k, F.costOf(s, t)[k], { noName: true })) : '🔒'));
      pal.appendChild(btn);
    });
    els.dirBtn = h('button', { class: 'btn small dir-btn', onclick: () => { FUI.dir = (FUI.dir + 1) % 4; refreshDir(); } }, '向き ' + F.DIR_ARROWS[FUI.dir]);
    pal.appendChild(els.dirBtn);
    els.palette = pal;
    return pal;
  }
  function showBuildingHelp(t) {
    const d = F.BUILDINGS[t];
    if (els.help) els.help.innerHTML = '<b>' + d.name + '</b>：' + U.esc(d.desc) + (t === 'belt' ? '<br><span class="muted">ドラッグすると、なぞった方向にベルトを続けて置けるよ。</span>' : '');
  }
  function renderInfo() {
    const s = UI.state, box = els.info;
    if (!box) return;
    box.innerHTML = '';
    const b = FUI.sel ? s.factory.b[FUI.sel] : null;
    if (!b) { box.appendChild(h('div', { class: 'muted small' }, FUI.tool === 'build' ? '置きたい場所をタップ（ベルトはドラッグ）。' : '設備をタップすると詳しく見られるよ。')); return; }
    const d = F.BUILDINGS[b.type];
    const st = STATE_TXT[b.state] || STATE_TXT.idle;
    box.appendChild(h('div', { class: 'info-head' }, h('span', { class: 'info-ico' }, d.icon || '➡️'), h('b', {}, d.name), h('span', { class: 'badge' }, 'Lv' + b.lvl),
      b.type !== 'belt' && b.type !== 'storage' && b.type !== 'core' ? h('span', { class: 'state-dot', style: { color: st[1] } }, '● ' + st[0]) : null));
    box.appendChild(h('div', { class: 'small muted' }, d.desc));
    if (b.type === 'miner') box.appendChild(h('div', { class: 'small' }, '掘る鉱石：', UI.itemChip(b.ore, null), '　速さ 毎分 ' + (F.buildingSpeed(s, b, d.rate) * 60).toFixed(0) + ' 個（フル稼働時）'));
    if (b.type === 'furnace') box.appendChild(h('div', { class: 'small' }, '鉄鉱石→鉄板、銅鉱石→銅板、石材2→レンガ、シリコン→ウェハ'));
    if (b.type === 'assembler') {
      const sel = h('div', { class: 'recipe-list' });
      Object.keys(F.RECIPES).forEach((r) => {
        const R = F.RECIPES[r];
        const unlocked = F.recipeUnlocked(s, r);
        sel.appendChild(h('button', { class: 'recipe-btn' + (b.recipe === r ? ' on' : '') + (unlocked ? '' : ' locked'), disabled: !unlocked,
          onclick: () => { F.setRecipe(s, b.id, r); renderInfo(); } },
        UI.itemChip(r, null), h('span', { class: 'tiny muted' }, unlocked ? '← ' + Object.keys(R.in).map((k) => G.ITEMS[k].name + '×' + R.in[k]).join(' + ') + '（' + R.time + '秒）' : '🔒 研究で解放')));
      });
      box.appendChild(h('div', { class: 'small' }, 'レシピ：'), sel);
    }
    if (b.type === 'power') box.appendChild(h('div', { class: 'small' }, '発電 ' + Math.round(d.power * F.levelMult(b)) + '⚡・燃料の石炭：ベルトで届いた分 ' + Math.floor(b.inBuf.coal || 0) + ' 個（なければ持ち物から）'));
    if (b.type === 'storage' || b.type === 'core') box.appendChild(h('div', { class: 'small' }, '持ち物の上限（1種類あたり）：' + F.storageCap(s)));
    const bufs = (o, label) => { const ks = Object.keys(o).filter((k) => o[k] >= 1); return ks.length ? h('div', { class: 'small row' }, label, ks.map((k) => UI.itemChip(k, Math.floor(o[k]), { noName: true }))) : null; };
    const ib = bufs(b.inBuf, '材料：'), ob = bufs(b.outBuf, '出口：');
    if (ib) box.appendChild(ib); if (ob) box.appendChild(ob);
    if (F.producesItems(b)) {
      const L = F.layout(s), r = L.routes[b.id];
      box.appendChild(h('div', { class: 'small ' + (r && r.dest ? 'good' : 'bad') }, r && r.dest ? '→ 送り先：' + F.BUILDINGS[s.factory.b[r.dest].type].name + (r.path.length ? '（ベルト ' + r.path.length + ' マス）' : '（となり）') : '⚠ 送り先がない！ 出口（オレンジの▲）の先にベルトか設備を置こう'));
    }
    for (const fn of FUI.infoExtras) fn(s, b, box, renderInfo);
    if (b.type !== 'core') box.appendChild(h('div', { class: 'row', style: { marginTop: '.5rem' } },
      h('button', { class: 'btn small', onclick: () => { F.rotate(s, b.id); renderInfo(); } }, '🔄 回す'),
      h('button', { class: 'btn small danger', onclick: () => { F.remove(s, b.id); FUI.sel = null; renderInfo(); refreshPalette(); } }, '🗑 撤去（全額戻る）')));
  }
  FUI.renderInfo = renderInfo;
  function updateStatus() {
    const s = UI.state, f = s.factory;
    if (!els.status) return;
    const pw = f.power;
    const L = F.layout(s);
    const max = F.chargeMax(s);
    const sp = Math.round(L.spaghetti * 100);
    els.status.querySelector('.st-power').innerHTML = '⚡ <b>' + Math.round(pw.supply) + '</b> / ' + pw.demand + (pw.sat < 1 ? ' <span class="bad">（' + Math.round(pw.sat * 100) + '%）</span>' : '');
    els.status.querySelector('.st-charge').innerHTML = '🧠 ' + (f.charge > 0 ? '<b>' + U.fmtClock(f.charge) + '</b>' : '<span class="bad">省電力 25%</span>') + ' <span class="muted">/ ' + Math.round(max / 60) + '分</span>';
    els.status.querySelector('.st-spag').innerHTML = '🍝 <b class="' + (sp >= 50 ? 'bad' : sp >= 25 ? 'warn' : 'good') + '">' + sp + '%</b>';
    els.status.querySelector('.st-work').innerHTML = '🏭 稼働 <b>' + (f.working || 0) + '</b>';
    for (const fn of FUI.statusExtras) fn(s, els.status);
  }
  function renderRates() {
    const s = UI.state, box = els.rates;
    if (!box) return;
    const r = F.ratesPerMin(s);
    const ks = Object.keys(r).filter((k) => r[k] >= 0.05);
    box.innerHTML = '';
    box.appendChild(h('b', { class: 'small' }, '毎分の生産量 '));
    if (!ks.length) box.appendChild(h('span', { class: 'muted small' }, 'まだ記録なし（コアや倉庫に届いた量）'));
    ks.forEach((k) => box.appendChild(UI.itemChip(k === 'rp' ? 'rp' : k, (Math.round(r[k] * 10) / 10) + '/分', { noName: true })));
  }

  UI.screen('factory', {
    title: '工場', icon: '🏭', nav: 'main', navOrder: 2,
    render(root, s) {
      els = {};
      const head = h('div', { class: 'fac-head' }, h('h2', { class: 'screen-title' }, '工場'));
      root.appendChild(head);
      els.status = h('div', { class: 'fac-status' },
        h('span', { class: 'st-power', title: '発電量 / 消費量。足りないと全体が遅くなる' }), h('span', { class: 'st-charge', title: '演算チャージ：問題に正解するとたまる。切れると工場は25%の速さになる' }),
        h('span', { class: 'st-spag', title: 'スパゲッティ度：ベルトの曲がり・絡まり・行き止まりが多いほど上がり、工場全体の効率が下がる' }), h('span', { class: 'st-work' }));
      root.appendChild(els.status);
      els.tools = h('div', { class: 'tools' });
      FUI.tools.forEach((t) => els.tools.appendChild(h('button', { class: 'tool-btn' + (FUI.tool === t.id ? ' on' : ''), dataset: { id: t.id }, onclick: () => setTool(t.id) }, h('span', {}, t.icon), h('span', { class: 'tool-lbl' }, t.label))));
      root.appendChild(els.tools);
      root.appendChild(buildPalette(s));
      els.help = h('div', { class: 'fac-help small muted' + (FUI.tool === 'build' ? '' : ' hidden') });
      root.appendChild(els.help);
      if (FUI.tool === 'build') showBuildingHelp(FUI.type);
      const wrap = h('div', { class: 'fac-canvas-wrap' });
      FUI.canvas = h('canvas', { class: 'fac-canvas', 'aria-label': '工場のマップ' });
      wrap.appendChild(FUI.canvas);
      wrap.appendChild(h('div', { class: 'zoom-btns' },
        h('button', { class: 'icon-btn', 'aria-label': '拡大', onclick: () => FUI.zoomBy(1.25) }, '＋'),
        h('button', { class: 'icon-btn', 'aria-label': '縮小', onclick: () => FUI.zoomBy(0.8) }, '－'),
        h('button', { class: 'icon-btn', 'aria-label': '全体', onclick: () => FUI.fit() }, '⤢')));
      root.appendChild(wrap);
      els.info = h('div', { class: 'card fac-info' });
      root.appendChild(els.info);
      els.rates = h('div', { class: 'fac-rates' });
      root.appendChild(els.rates);
      FUI.belowExtras.forEach((fn) => { const n = fn(s); if (n) root.appendChild(n); });
      root.appendChild(h('details', { class: 'card fac-guide' }, h('summary', {}, '❓ 工場のしくみ'),
        h('ul', { class: 'small' },
          h('li', {}, '採掘機は鉱脈（色のついたマス）の上に置く。オレンジの▲が出口。出口の先にベルトを置き、コアか倉庫まで運ぶと持ち物に入る。'),
          h('li', {}, '溶鉱炉に鉱石を流しこむと鉄板・銅板・レンガになる。組立機は材料を受け取って製品をつくる。'),
          h('li', {}, '設備は電気を使う。発電量（⚡）が足りないと全体が遅くなるので発電所を建てよう（石炭を燃やす）。'),
          h('li', {}, '🧠 演算チャージは問題に正解するとたまる。切れると工場は25%の速さに落ちる。つまり、勉強した分だけ工場が動く！'),
          h('li', {}, '🍝 スパゲッティ度：ベルトが曲がりくねったり、向きの違うベルトがくっついたり、行き止まりがあると上がり、効率が下がる。'),
          h('li', {}, '撤去すると建設費は全額戻るので、気軽に作り直してOK。'))));
      FUI.fit();
      bindCanvas(FUI.canvas);
      renderInfo(); updateStatus(); renderRates(); refreshPalette();
      FUI.lastInfo = 0;
    },
    update(s, dt) {
      FUI.draw();
      FUI.lastInfo = (FUI.lastInfo || 0) + dt;
      if (FUI.lastInfo > 0.5) { FUI.lastInfo = 0; updateStatus(); renderRates(); refreshPalette(); if (FUI.sel && !document.activeElement.closest('.fac-info')) renderInfo(); }
    },
  });
  window.addEventListener('resize', () => { if (UI.current === 'factory') { FUI.fit(); } });

  // ---------- 留守中の生産 ----------
  FUI.showOfflineReport = function (rep) {
    if (!rep) return;
    const ks = Object.keys(rep.gained);
    const body = h('div', {},
      h('p', {}, '留守にしていた ' + U.fmtTime(rep.seconds) + (rep.capped ? '（工場が動けるのは最大 ' + B.factory.offlineMaxHours + ' 時間まで）' : '') + ' のあいだに、工場がこれだけ生産したよ。'),
      ks.length ? h('div', { class: 'chip-wrap' }, ks.map((k) => UI.itemChip(k, '+' + Math.floor(rep.gained[k])))) : h('p', { class: 'muted' }, '何も届かなかった…（採掘機からコアまでベルトがつながっているか確認しよう）'),
      h('p', { class: 'small muted' }, '留守中は効率 ' + Math.round(B.factory.offlineEff * 100) + '%。演算チャージを ' + U.fmtTime(Math.max(0, rep.chargeUsed)) + ' 使い、' + (rep.chargeLeft > 0 ? '残り ' + U.fmtClock(rep.chargeLeft) + '。' : 'もう空っぽ。問題を解いて充電しよう！')));
    UI.modal({ title: '🏭 留守中の生産量', body, buttons: [{ label: '受け取る', cls: 'primary' }] });
  };
  MF.App.bootHooks.push((s, info) => {
    if (info.fresh) return;
    const now = Date.now();
    const sec = (now - (s.lastTick || now)) / 1000;
    if (sec > 60) { const rep = F.simulateOffline(s, sec, now); s.lastTick = now; if (rep && Object.keys(rep.gained).length) setTimeout(() => FUI.showOfflineReport(rep), 300); }
  });
  MF.App.catchUpHooks.push((s, sec, now) => {
    const rep = F.simulateOffline(s, sec, now);
    if (rep && sec > 120 && Object.keys(rep.gained).length) FUI.showOfflineReport(rep);
  });
})(globalThis.MF = globalThis.MF || {});
