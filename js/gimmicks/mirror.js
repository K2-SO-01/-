// =====================================================================
// 鏡文字フィルム：透明なフィルムに鏡文字。横スワイプ（またはタップ）で裏返すと読める
//   状態 0 = 表（鏡文字） / 1 = 裏返し（正しく読める）
// =====================================================================
import { CONFIG } from '../config.js';
import { draggable, animate, h } from '../drag.js';

export class Mirror {
  constructor(def, ctx) {
    this.def = def;
    this.ctx = ctx;
    this.flipped = (ctx.state ?? 0) ? 1 : 0;
    this.deg = this.flipped * 180;
    const el = (this.el = h('div', 'gm gm-mirror'));
    this.card = h('div', 'mi-card');
    const front = h('div', 'mi-face mi-front');
    const back = h('div', 'mi-face mi-back');
    const text = () => {
      const t = h('div', 'mi-text');
      for (const line of def.text) t.append(h('div', 'mi-line', line));
      return t;
    };
    front.append(text());
    back.append(text());
    this.card.append(front, back);
    this.hint = h('div', 'mi-hint', ctx.readOnly ? '' : '← スワイプ / タップで裏返す →');
    el.append(this.card, this.hint);
    if (!ctx.readOnly) this.bind();
    this.render();
  }

  bind() {
    let d0 = 0, stop = null;
    draggable(this.card, {
      start: () => { stop?.(); d0 = this.deg; },
      move: (e, dx) => { this.deg = d0 + dx * CONFIG.mirror.dragDegPerPx; this.render(); },
      end: (e, dx, dy, info) => {
        if (info.tap) return;
        this.settle(Math.round(this.deg / 180) * 180);
      },
      tap: () => this.settle((Math.round(this.deg / 180) + 1) * 180),
    });
    this.stopAnim = () => stop?.();
  }

  settle(to) {
    const was = this.flipped;
    animate(this.deg, to, 260, (v) => { this.deg = v; this.render(); }, () => {
      this.deg = to;
      this.flipped = Math.abs(Math.round(to / 180)) % 2;
      this.render();
      if (was !== this.flipped) {
        this.ctx.onSound?.('flip');
        this.ctx.onSnap?.(true);
        this.ctx.onChange?.(this.flipped);
      }
    });
  }

  render() {
    this.card.style.transform = `rotateY(${this.deg.toFixed(1)}deg)`;
  }

  resize(w, hgt) {
    const len = Math.max(...this.def.text.map((l) => [...l].length));
    const lines = this.def.text.length;
    const width = Math.min(w - 24, 420);
    const fs = Math.max(16, Math.min(30, (width - 40) / Math.max(len, 6), (hgt - 70) / (lines * 1.6)));
    this.el.style.setProperty('--mi-fs', fs.toFixed(1) + 'px');
    this.card.style.width = width + 'px';
  }

  getState() { return this.flipped; }
  setState(s) { this.flipped = s ? 1 : 0; this.deg = this.flipped * 180; this.render(); }
  highlight() {}
  destroy() { this.el.remove(); }
}
