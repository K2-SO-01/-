// =====================================================================
// スライド式の暗号帯（横 axis:'x' / 縦 axis:'y'）
//   a 段（上 / 左）… ドラッグで「見わたす」（両段が一緒に動く＝対応は変わらない）
//   b 段（下 / 右）… ドラッグで「ずらす」（状態 k が変わる）
//   a[i] と b[i+k] が向かい合う。帯は両端がつながったリング
// =====================================================================
import { ringOf, mod } from '../engine.js';
import { CONFIG } from '../config.js';
import { draggable, magnet, animate, h } from '../drag.js';

// 表示用：ずらし量を −n/2〜+n/2 の符号つきで（+5 = 下段を左へ5つ）
export const signed = (k, n) => {
  const m = mod(k, n);
  const v = m > n / 2 ? m - n : m;
  return v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0';
};

export class Slide {
  constructor(def, ctx) {
    this.def = def;
    this.ctx = ctx;
    const { a, b, n } = ringOf(def);
    Object.assign(this, { a, b, n });
    this.vertical = def.axis === 'y';
    this.k = mod(ctx.state ?? def.initial ?? 0, n);
    this.kf = this.k; // 表示中の（小数を含む）ずらし量
    this.view = 0; // 見わたし位置
    this.lastSnap = this.k;
    this.hiA = new Set();
    this.hiB = new Set();
    this.suffix = def.suffix || '';

    const el = (this.el = h('div', 'gm gm-slide' + (this.vertical ? ' vertical' : '')));
    this.laneA = this.makeLane('a', def.labelA || (this.vertical ? '左：見わたす' : '上段：見わたす'));
    this.laneB = this.makeLane('b', def.labelB || (this.vertical ? '右：ずらす' : '下段：ずらす'));
    this.badge = h('div', 'slide-badge');
    this.cap = h('div', 'slide-cap', this.vertical ? '左：見わたす ／ 右：ずらす' : '');
    const wrap = h('div', 'slide-wrap');
    wrap.append(this.laneA.el, this.laneB.el);
    el.append(wrap, this.badge);
    if (this.vertical) el.append(this.cap);
    this.wrap = wrap;
    if (!ctx.readOnly) this.bind();
  }

  makeLane(side, label) {
    const el = h('div', `lane lane-${side}`);
    const track = h('div', 'track');
    const lab = h('div', 'lane-label', label);
    el.append(track, lab);
    return { el, track, cells: [], side };
  }

  bind() {
    const ax = (dx, dy) => (this.vertical ? dy : dx);
    let v0 = 0, k0 = 0, stop = null;
    draggable(this.laneA.el, {
      start: () => { stop?.(); v0 = this.view; this.laneA.el.classList.add('active'); },
      move: (e, dx, dy) => { this.view = v0 - ax(dx, dy) / this.cell; this.render(); },
      end: () => {
        this.laneA.el.classList.remove('active');
        const to = Math.round(this.view);
        stop = animate(this.view, to, CONFIG.snap.settleMs, (v) => { this.view = v; this.render(); });
      },
    });
    draggable(this.laneB.el, {
      start: () => { stop?.(); k0 = this.kf; this.laneB.el.classList.add('active'); },
      move: (e, dx, dy) => {
        const raw = k0 - ax(dx, dy) / this.cell;
        this.kf = magnet(raw, CONFIG.snap.zone);
        if (Number.isInteger(this.kf) && this.kf !== this.lastSnap) {
          this.lastSnap = this.kf;
          this.ctx.onSnap?.();
        }
        this.render();
      },
      end: () => {
        this.laneB.el.classList.remove('active');
        const to = Math.round(this.kf);
        const fire = to !== this.lastSnap;
        stop = animate(this.kf, to, CONFIG.snap.settleMs, (v) => { this.kf = v; this.render(); }, () => {
          this.kf = this.k = mod(to, this.n);
          this.lastSnap = this.kf;
          this.render();
          if (fire) this.ctx.onSnap?.();
          this.ctx.onChange?.(this.k);
        });
      },
    });
  }

  resize(w, hgt) {
    const C = CONFIG.slide;
    if (this.vertical) {
      this.len = hgt - 66;
      this.cell = Math.max(30, Math.min(C.cellMax, this.len / 5.2));
      this.wrap.style.width = Math.min(w, this.cell * 2 + 140) + 'px';
    } else {
      this.cell = Math.max(C.cellMin, Math.min(C.cellMax, w / C.visibleTarget));
      this.len = w;
      this.wrap.style.width = '';
    }
    this.el.style.setProperty('--cell', this.cell + 'px');
    const count = Math.ceil(this.len / this.cell) + 4;
    for (const lane of [this.laneA, this.laneB]) {
      while (lane.cells.length < count) {
        const c = h('div', 'cell');
        lane.track.append(c);
        lane.cells.push(c);
      }
      while (lane.cells.length > count) lane.cells.pop().remove();
    }
    this.render();
  }

  render() {
    if (!this.cell) return;
    const cw = this.cell;
    const center = this.len / 2 - cw / 2;
    const prop = this.vertical ? 'translateY' : 'translateX';
    const half = Math.floor(this.laneA.cells.length / 2);
    const draw = (lane, ring, shift, hi) => {
      const base = Math.floor(shift);
      lane.cells.forEach((c, p) => {
        const i = base - half + p;
        const pos = (i - shift) * cw + center;
        const tok = ring[mod(i, this.n)];
        if (c._tok !== tok) {
          c._tok = tok;
          c.innerHTML = '';
          c.append(h('span', 'tok' + (tok.length > 2 ? ' long' : ''), tok));
          if (this.suffix) c.append(h('small', 'suf', this.suffix));
        }
        c.style.transform = `${prop}(${pos.toFixed(2)}px)`;
        c.classList.toggle('hi', hi.has(tok));
        c.classList.toggle('origin', mod(i, this.n) === 0);
      });
    };
    draw(this.laneA, this.a, this.view, this.hiA);
    draw(this.laneB, this.b, this.view + this.kf, this.hiB);
    this.badge.textContent = `ずらし ${signed(Math.round(this.kf), this.n)}`;
  }

  getState() { return this.k; }

  setState(k) {
    this.k = this.kf = this.lastSnap = mod(k, this.n);
    this.render();
  }

  // 解説用：見わたし位置を指定トークンが中央に来るように
  focus(tok) {
    const i = this.a.indexOf(tok);
    if (i >= 0) { this.view = i; this.render(); }
  }

  highlight(aToks = [], bToks = []) {
    this.hiA = new Set(aToks);
    this.hiB = new Set(bToks);
    this.render();
  }

  destroy() { this.el.remove(); }
}
