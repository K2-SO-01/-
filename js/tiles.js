// =====================================================================
// 文字タイル＆解答欄
//   タップ：トレイ→空いている最初の欄 / 欄→トレイへ戻す
//   ドラッグ：好きな欄へ（埋まっていれば入れ替え）
//   全部埋まった瞬間に onFull(文字列) を呼ぶ
// =====================================================================
import { CONFIG } from './config.js';
import { h } from './drag.js';

export class TileBoard {
  constructor({ tiles, length, onFull, onPlace, onRemove }) {
    this.onFull = onFull;
    this.onPlace = onPlace;
    this.onRemove = onRemove;
    this.locked = false;
    this.el = h('div', 'tileboard');
    this.slotsEl = h('div', 'slots');
    this.tray = h('div', 'tray');
    this.slots = Array.from({ length }, (_, i) => {
      const s = h('div', 'slot');
      s.dataset.i = i;
      this.slotsEl.append(s);
      return { el: s, tile: null };
    });
    this.slotsEl.style.setProperty('--n', length);
    this.tiles = tiles.map((ch, i) => {
      const home = h('div', 'tile-home');
      const t = h('div', 'tile', ch);
      home.append(t);
      this.tray.append(home);
      const tile = { ch, el: t, home, slot: null, i };
      this.bindTile(tile);
      return tile;
    });
    this.tray.style.setProperty('--cols', Math.max(5, Math.min(7, Math.ceil(tiles.length / 2))));
    // 欄のタイルを外す操作はタイル側の pointer イベントで処理する
    // （click を使うと、置いた直後の合成 click で外れてしまうため）
    this.el.append(this.slotsEl, this.tray);
  }

  bindTile(tile) {
    const el = tile.el;
    let id = null, sx = 0, sy = 0, moved = false, ghost = null, ox = 0, oy = 0;
    el.addEventListener('pointerdown', (e) => {
      if (this.locked || id !== null) return;
      id = e.pointerId;
      sx = e.clientX; sy = e.clientY;
      moved = false;
      try { el.setPointerCapture(id); } catch { /* noop */ }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < CONFIG.tiles.dragThreshold) return;
      if (!moved) {
        moved = true;
        const r = el.getBoundingClientRect();
        ox = sx - r.left; oy = sy - r.top;
        ghost = el.cloneNode(true);
        ghost.className = 'tile ghost';
        ghost.style.width = r.width + 'px';
        ghost.style.height = r.height + 'px';
        document.body.append(ghost);
        el.classList.add('lifted');
      }
      ghost.style.transform = `translate(${e.clientX - ox}px, ${e.clientY - oy}px) scale(1.12)`;
      const s = this.slotAt(e.clientX, e.clientY);
      this.slots.forEach((q) => q.el.classList.toggle('target', q === s));
    });
    const finish = (e, cancel) => {
      if (e.pointerId !== id) return;
      id = null;
      this.slots.forEach((q) => q.el.classList.remove('target'));
      if (!moved) {
        if (!cancel && !this.locked) {
          if (tile.slot) this.toTray(tile);
          else this.toFirstEmpty(tile);
        }
        return;
      }
      el.classList.remove('lifted');
      const gr = ghost.getBoundingClientRect();
      ghost.remove();
      ghost = null;
      if (this.locked) return;
      const s = cancel ? null : this.slotAt(e.clientX, e.clientY);
      if (s) this.toSlot(tile, s, gr);
      else if (tile.slot) this.toTray(tile, gr);
      else this.fly(el, gr);
    };
    el.addEventListener('pointerup', (e) => finish(e, false));
    el.addEventListener('pointercancel', (e) => finish(e, true));
  }

  slotAt(x, y) {
    let best = null, bd = CONFIG.tiles.slotSnapRadius;
    for (const s of this.slots) {
      const r = s.el.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // FLIP アニメーション：from（DOMRect）から現在位置へ
  fly(el, from) {
    if (!from) from = el.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left, dy = from.top - to.top;
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(1.08)` }, { transform: 'translate(0,0) scale(1)' }],
      { duration: 200, easing: 'cubic-bezier(.2,.9,.3,1.2)' },
    );
  }

  toFirstEmpty(tile) {
    const s = this.slots.find((q) => !q.tile);
    if (s) this.toSlot(tile, s);
  }

  toSlot(tile, s, from) {
    const fromRect = from || tile.el.getBoundingClientRect();
    if (s.tile === tile) { this.fly(tile.el, fromRect); return; }
    const prevSlot = tile.slot;
    if (s.tile) {
      const other = s.tile;
      if (prevSlot) this.moveInto(other, prevSlot); // 入れ替え
      else this.toTray(other, null, true);
    } else if (prevSlot) {
      prevSlot.tile = null;
    }
    this.moveInto(tile, s, fromRect);
    this.onPlace?.(this.slots.indexOf(s));
    this.check();
  }

  moveInto(tile, s, fromRect) {
    const r = fromRect || tile.el.getBoundingClientRect();
    if (tile.slot && tile.slot !== s && tile.slot.tile === tile) tile.slot.tile = null;
    s.tile = tile;
    tile.slot = s;
    s.el.append(tile.el);
    s.el.classList.add('filled');
    this.slots.forEach((q) => q.el.classList.toggle('filled', !!q.tile));
    this.fly(tile.el, r);
  }

  toTray(tile, from, silent) {
    const r = from || tile.el.getBoundingClientRect();
    if (tile.slot) tile.slot.tile = null;
    tile.slot = null;
    tile.home.append(tile.el);
    this.slots.forEach((q) => q.el.classList.toggle('filled', !!q.tile));
    this.fly(tile.el, r);
    if (!silent) this.onRemove?.();
  }

  value() {
    return this.slots.map((s) => s.tile?.ch ?? '').join('');
  }

  check() {
    if (this.slots.every((s) => s.tile)) this.onFull?.(this.value());
  }

  shake() {
    this.slotsEl.classList.remove('shake');
    void this.slotsEl.offsetWidth;
    this.slotsEl.classList.add('shake');
  }

  clear() {
    for (const s of this.slots) if (s.tile) this.toTray(s.tile, null, true);
  }

  // ヒント等で使う：指定した欄に正しい文字を入れる（今回は未使用）
  slotRects() {
    return this.slots.map((s) => s.el.getBoundingClientRect());
  }
}
