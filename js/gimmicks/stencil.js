// =====================================================================
// 透かしカード（穴あきカードを表に重ねる）＋ 回転 / 裏返し（鏡）
//   状態 {x, y, rot, flip}。見える文字の計算は engine.stencilRead と同じ
// =====================================================================
import { stencilRead, gridOf, MARK, EMPTY } from '../engine.js';
import { CONFIG } from '../config.js';
import { draggable, h } from '../drag.js';

export class Stencil {
  constructor(def, ctx) {
    this.def = def;
    this.ctx = ctx;
    this.grid = gridOf(def);
    this.R = this.grid.length;
    this.C = this.grid[0].length;
    this.N = def.card.length;
    const s = ctx.state ?? def.initial ?? {};
    this.st = { x: 0, y: 0, rot: 0, flip: 0, ...s };
    this.rotDeg = this.st.rot * 90; // CSS 用の累積角度（3→0 で逆回転しないように）

    const el = (this.el = h('div', 'gm gm-stencil'));
    this.area = h('div', 'st-area');
    this.board = h('div', 'st-board');
    this.board.style.gridTemplateColumns = `repeat(${this.C}, var(--cell))`;
    this.cells = [];
    for (let r = 0; r < this.R; r++) {
      for (let c = 0; c < this.C; c++) {
        const ch = this.grid[r][c];
        const e = h('div', 'st-cell' + (ch === MARK ? ' mark' : ch === EMPTY ? ' empty' : ''));
        if (ch === MARK) e.append(h('i', 'dot'));
        else if (ch !== EMPTY) e.textContent = ch;
        this.board.append(e);
        this.cells.push(e);
      }
    }
    this.card = h('div', 'st-card');
    this.face = h('div', 'st-face');
    this.face.style.gridTemplateColumns = `repeat(${this.N}, var(--cell))`;
    this.labels = [];
    def.card.forEach((row) => {
      [...row].forEach((k) => {
        const c = h('div', 'cc ' + (k === '.' ? 'solid' : k === 'm' ? 'hole marker' : 'hole'));
        if (k === 'm') c.append(h('i', 'diamond'));
        if (/[1-9]/.test(k)) {
          const n = h('b', 'num', k);
          c.append(n);
          this.labels.push(n);
        }
        this.face.append(c);
      });
    });
    const arrow = h('div', 'st-top', '▲');
    this.face.append(arrow);
    this.labels.push(arrow);
    this.card.append(this.face);
    this.area.append(this.board, this.card);

    this.tools = h('div', 'st-tools');
    this.readout = h('div', 'st-readout');
    if (!ctx.readOnly) {
      if (def.allowRotate) {
        const b = h('button', 'tool-btn', '↻ 回す');
        b.addEventListener('click', () => this.rotate());
        this.tools.append(b);
      }
      if (def.allowFlip) {
        const b = h('button', 'tool-btn', '⇋ 裏返す');
        b.addEventListener('click', () => this.flip());
        this.tools.append(b);
      }
    }
    // 下段の操作列：［↻］［⇋］［よみとり］（右下はヒントボタン用に空ける）
    this.tools.append(this.readout);
    el.append(this.area, this.tools);
    if (!ctx.readOnly) this.bind();
  }

  bind() {
    let x0 = 0, y0 = 0, last = '';
    draggable(this.card, {
      start: () => {
        x0 = this.st.x; y0 = this.st.y;
        last = `${x0},${y0}`;
        this.card.classList.add('dragging');
      },
      move: (e, dx, dy) => {
        let fx = x0 + dx / this.cell, fy = y0 + dy / this.cell;
        const rx = Math.round(fx), ry = Math.round(fy);
        const z = CONFIG.stencil.magnet;
        // 両軸とも目盛りに近ければカチッと吸着
        if (Math.abs(fx - rx) < z && Math.abs(fy - ry) < z) {
          fx = rx; fy = ry;
          const key = `${rx},${ry}`;
          if (key !== last) { last = key; this.ctx.onSnap?.(); }
        }
        this.place(fx, fy, false);
      },
      end: (e, dx, dy) => {
        this.card.classList.remove('dragging');
        const { lo, hi } = this.bounds();
        const nx = Math.min(hi.x, Math.max(lo.x, Math.round(x0 + dx / this.cell)));
        const ny = Math.min(hi.y, Math.max(lo.y, Math.round(y0 + dy / this.cell)));
        const changed = `${nx},${ny}` !== last;
        this.st.x = nx; this.st.y = ny;
        this.place(nx, ny, true);
        if (changed) this.ctx.onSnap?.();
        this.update();
        this.ctx.onChange?.(this.getState());
      },
    }, { threshold: 2 });
  }

  bounds() {
    // カードが少なくとも1マス表に重なる範囲
    return { lo: { x: -(this.N - 1), y: -(this.N - 1) }, hi: { x: this.C - 1, y: this.R - 1 } };
  }

  rotate() {
    this.st.rot = (this.st.rot + 1) % 4;
    this.rotDeg += 90;
    this.applyFace();
    this.ctx.onSound?.('rotate');
    this.update();
    this.ctx.onChange?.(this.getState());
  }

  flip() {
    this.st.flip ^= 1;
    this.applyFace();
    this.ctx.onSound?.('flip');
    this.update();
    this.ctx.onChange?.(this.getState());
  }

  applyFace() {
    const f = this.st.flip ? -1 : 1;
    this.face.style.transform = `rotate(${this.rotDeg}deg) scaleX(${f})`;
    // 番号と▲マークは常に読める向きに
    for (const l of this.labels) {
      if (l.classList.contains('st-top')) continue;
      l.style.transform = `scaleX(${f}) rotate(${-this.rotDeg}deg)`;
    }
  }

  resize(w, hgt) {
    const S = CONFIG.stencil;
    const toolsH = 54;
    // カードがはみ出しても動かせるよう、表の周囲に余白を取る
    const cell = Math.floor(Math.min((w - 12) / (this.C + 0.6), (hgt - toolsH - 8) / (this.R + 0.4)));
    this.cell = Math.max(S.cellMin, Math.min(S.cellMax, cell));
    this.el.style.setProperty('--cell', this.cell + 'px');
    this.area.style.width = this.C * this.cell + 'px';
    this.area.style.height = this.R * this.cell + 'px';
    this.card.style.width = this.card.style.height = this.N * this.cell + 'px';
    this.place(this.st.x, this.st.y, false);
    this.applyFace();
    this.update();
  }

  place(fx, fy, smooth) {
    this.card.classList.toggle('smooth', !!smooth);
    this.card.style.transform = `translate(${(fx * this.cell).toFixed(1)}px, ${(fy * this.cell).toFixed(1)}px)`;
  }

  update() {
    const r = stencilRead(this.def, this.st);
    const lit = new Set(r.holes.map((p) => p.r * this.C + p.c));
    this.cells.forEach((e, i) => e.classList.toggle('lit', lit.has(i)));
    const toks = r.holes.map((p) => (p.ch === MARK ? '●' : p.ch === EMPTY ? '□' : p.ch));
    const all = r.inside;
    this.readout.innerHTML = '';
    this.readout.append(h('span', 'ro-label', 'よみとり'));
    this.readout.append(h('span', 'ro-text', all && toks.length ? toks.join('') : '———'));
  }

  getState() { return { ...this.st }; }

  setState(s) {
    this.st = { ...this.st, ...s };
    this.rotDeg = this.st.rot * 90;
    this.place(this.st.x, this.st.y, false);
    this.applyFace();
    this.update();
  }

  highlight() {}
  destroy() { this.el.remove(); }
}
