/* 数学ファクトリー：工場の追加ツール（強化・設計図） */
(function (MF) {
  'use strict';
  const UI = MF.UI, F = MF.Factory, G = MF.Game, R = MF.Research, FUI = MF.FactoryUI, U = MF.Util;
  const h = UI.h;
  FUI.tools.push({ id: 'upgrade', icon: '⬆️', label: '強化' }, { id: 'blueprint', icon: '📐', label: '設計図' });
  FUI.paletteOrder.push('solar');
  const BP = { mode: 'copy', a: null, cur: null, anchor: null };
  FUI.bp = BP;

  // 強化ツール
  FUI.toolHandlers.upgrade = (s, cell, b) => {
    if (!b) return;
    const r = F.upgrade(s, b.id);
    if (!r.ok) { UI.toast(r.reason, 'warn'); FUI.sel = b.id; FUI.renderInfo(); return; }
    if (MF.Audio) MF.Audio.play('upgrade');
    UI.toast(F.BUILDINGS[b.type].name + ' を Lv' + b.lvl + ' に強化！', 'good');
    FUI.sel = b.id; FUI.renderInfo();
  };
  // 情報欄に強化ボタン
  FUI.infoExtras.push((s, b, box, rerender) => {
    if (b.type === 'belt' || b.type === 'core') return;
    const max = F.maxLevel(s);
    if (b.lvl >= max) { box.appendChild(h('div', { class: 'small muted' }, '強化：Lv' + b.lvl + '（上限。研究「設備改良」で上がる）')); return; }
    const cost = F.upgradeCost(s, b);
    box.appendChild(h('div', { class: 'upg-row' }, h('span', { class: 'small' }, '強化 Lv' + b.lvl + '→' + (b.lvl + 1) + '（速さ +35%）'), h('span', { class: 'cost' }, UI.costNodes(cost)),
      h('button', { class: 'btn small primary', disabled: !G.has(s, cost), onclick: () => { FUI.toolHandlers.upgrade(s, b, b); rerender(); } }, '⬆ 強化')));
  });
  // レベルの点
  FUI.overlayDraw.push((ctx, s, b, x, y, cs) => {
    if (b.lvl <= 1) return;
    ctx.fillStyle = '#ffb02e';
    for (let i = 0; i < b.lvl - 1; i++) { ctx.beginPath(); ctx.arc(x + cs * 0.2 + i * cs * 0.13, y + cs * 0.2, cs * 0.05, 0, 7); ctx.fill(); }
  });

  // 設計図ツール
  FUI.toolHandlers.blueprint = (s, cell) => {
    if (!R.has(s, 'blueprint')) { UI.toast('🔒 研究「設計図」で使えるようになる', 'warn'); return; }
    if (BP.mode === 'copy') {
      if (!BP.a) { BP.a = cell; renderBP(); return; }
      const bp = F.bpCapture(s, BP.a.x, BP.a.y, cell.x, cell.y);
      BP.a = null;
      if (!bp) { UI.toast('その範囲には設備がないよ', 'warn'); renderBP(); return; }
      UI.toast('📐 ' + bp.name + ' を保存（' + bp.items.length + ' 個）', 'good');
      BP.cur = bp; BP.mode = 'paste'; BP.anchor = null;
      renderBP();
    } else if (BP.cur) {
      BP.anchor = cell; renderBP();
    }
  };
  FUI.drawExtra = (ctx, s, cs) => {
    if (FUI.tool !== 'blueprint') return;
    if (BP.mode === 'copy' && BP.a) {
      const b = FUI.hover || BP.a;
      const x = Math.min(BP.a.x, b.x), y = Math.min(BP.a.y, b.y), w = Math.abs(BP.a.x - b.x) + 1, hh = Math.abs(BP.a.y - b.y) + 1;
      ctx.fillStyle = 'rgba(57,208,255,.18)'; ctx.fillRect(x * cs, y * cs, w * cs, hh * cs);
      ctx.strokeStyle = '#39d0ff'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeRect(x * cs, y * cs, w * cs, hh * cs); ctx.setLineDash([]);
    }
    const anc = BP.anchor || (BP.mode === 'paste' ? FUI.hover : null);
    if (BP.mode === 'paste' && BP.cur && anc) {
      for (const it of BP.cur.items) {
        const x = anc.x + it.dx, y = anc.y + it.dy;
        const ok = F.canPlace(s, it.type, x, y).ok;
        ctx.globalAlpha = 0.5; ctx.fillStyle = ok ? '#52d273' : '#ff5d5d';
        ctx.fillRect(x * cs + 3, y * cs + 3, cs - 6, cs - 6); ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(x * cs + cs / 2, y * cs + cs / 2); ctx.rotate(it.dir * Math.PI / 2);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-cs * 0.12, cs * 0.06); ctx.lineTo(0, -cs * 0.2); ctx.lineTo(cs * 0.12, cs * 0.06); ctx.fill(); ctx.restore();
      }
    }
  };
  let bpBox = null;
  function renderBP() {
    const s = UI.state;
    if (!bpBox) return;
    bpBox.innerHTML = '';
    bpBox.classList.toggle('hidden', FUI.tool !== 'blueprint');
    if (FUI.tool !== 'blueprint') return;
    if (!R.has(s, 'blueprint')) { bpBox.appendChild(h('div', { class: 'small' }, '🔒 研究「設計図」で解放されるよ。')); return; }
    const f = s.factory;
    bpBox.appendChild(h('div', { class: 'row' },
      h('div', { class: 'seg' },
        h('button', { class: 'seg-btn' + (BP.mode === 'copy' ? ' on' : ''), onclick: () => { BP.mode = 'copy'; BP.a = null; renderBP(); } }, '範囲をコピー'),
        h('button', { class: 'seg-btn' + (BP.mode === 'paste' ? ' on' : ''), onclick: () => { BP.mode = 'paste'; renderBP(); } }, '貼りつけ')),
      h('span', { class: 'small muted' }, BP.mode === 'copy' ? (BP.a ? '2つ目の角をタップ' : 'コピーしたい範囲の角をタップ') : (BP.cur ? '置きたい左上のマスをタップ' : '下の一覧から設計図を選んでね'))));
    if (BP.mode === 'paste' && BP.cur) {
      const cost = F.bpCost(s, BP.cur);
      bpBox.appendChild(h('div', { class: 'row small' }, '選択中：', h('b', {}, BP.cur.name), '（' + BP.cur.w + '×' + BP.cur.h + '）　費用', h('span', { class: 'cost' }, UI.costNodes(cost)),
        h('button', { class: 'btn small', onclick: () => { BP.cur = F.bpRotate(BP.cur); renderBP(); } }, '🔄 回転'),
        BP.anchor ? h('button', { class: 'btn small primary', onclick: () => {
          const r = F.bpPaste(s, BP.cur, BP.anchor.x, BP.anchor.y);
          const sk = Object.keys(r.skipped).map((k) => k + '×' + r.skipped[k]).join('、');
          UI.toast('📐 ' + r.placed + ' 個置いた' + (sk ? '（置けなかった：' + sk + '）' : ''), r.placed ? 'good' : 'warn', 4000);
          if (r.placed && MF.Audio) MF.Audio.play('build');
          BP.anchor = null; renderBP(); FUI.refreshPalette();
        } }, 'ここに貼る') : null));
    }
    if (f.blueprints.length) {
      const list = h('div', { class: 'bp-list' });
      f.blueprints.slice().reverse().forEach((bp) => list.appendChild(h('div', { class: 'bp-item' + (BP.cur && BP.cur.id === bp.id ? ' on' : '') },
        h('b', { class: 'small' }, bp.name), h('span', { class: 'tiny muted' }, bp.w + '×' + bp.h + '・' + bp.items.length + '個'),
        h('button', { class: 'btn small', onclick: () => { BP.cur = bp; BP.mode = 'paste'; BP.anchor = null; renderBP(); } }, '使う'),
        h('button', { class: 'btn small ghost', 'aria-label': '名前を変える', onclick: () => {
          const inp = h('input', { class: 'text-in', id: 'bp-name', value: bp.name, maxlength: 20 });
          UI.modal({ title: '設計図の名前', body: inp, buttons: [{ label: 'やめる', cls: 'ghost' }, { label: '保存', cls: 'primary', action: () => { const n = inp.value.trim(); if (n) { bp.name = n.slice(0, 20); renderBP(); } } }] });
        } }, '✏️'),
        h('button', { class: 'btn small ghost', onclick: () => { F.bpDelete(s, bp.id); if (BP.cur && BP.cur.id === bp.id) BP.cur = null; renderBP(); } }, '🗑'))));
      bpBox.appendChild(list);
    }
  }
  FUI.onToolChange = (id) => { BP.a = null; BP.anchor = null; renderBP(); };
  FUI.belowExtras.unshift(() => { bpBox = h('div', { class: 'card bp-box hidden' }); setTimeout(() => { const info = document.querySelector('.fac-info'); if (info && bpBox.parentNode) info.parentNode.insertBefore(bpBox, info); renderBP(); }, 0); return bpBox; });
})(globalThis.MF = globalThis.MF || {});
