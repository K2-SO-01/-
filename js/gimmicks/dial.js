// =====================================================================
// 回転ダイヤル（2重の円盤）
//   外円 outer は固定、内円 inner をドラッグで回す
//   状態 r : outer[i] と inner[i + r] が向かい合う（engine.mapToken と同じ）
//   文字は常に正立させて読みやすくしている
// =====================================================================
import { ringOf, mod } from '../engine.js';
import { CONFIG } from '../config.js';
import { draggable, magnet, animate, h } from '../drag.js';
import { signed } from './slide.js';

export class Dial {
  constructor(def, ctx) {
    this.def = def;
    this.ctx = ctx;
    const { a, b, n } = ringOf(def);
    Object.assign(this, { a, b, n });
    this.r = mod(ctx.state ?? def.initial ?? 0, n);
    this.rf = this.r;
    this.lastSnap = this.r;
    this.hiA = new Set();
    this.hiB = new Set();

    const el = (this.el = h('div', 'gm gm-dial'));
    const box = (this.box = h('div', 'dial-box'));
    this.outer = h('div', 'dial-outer');
    this.inner = h('div', 'dial-inner');
    this.hub = h('div', 'dial-hub');
    this.outerToks = a.map((t) => this.tok(t, 'o'));
    this.innerToks = b.map((t) => this.tok(t, 'i'));
    this.outer.append(...this.outerToks);
    this.innerRot = h('div', 'dial-inner-bg');
    this.inner.append(this.innerRot, ...this.innerToks);
    const pointer = h('div', 'dial-pointer');
    box.append(this.outer, this.inner, pointer, this.hub);
    el.append(box);
    // 扇形の区切り（conic-gradient）
    const seg = 360 / n;
    this.outer.style.background = `repeating-conic-gradient(from ${-seg / 2}deg, var(--dial-o1) 0 ${seg}deg, var(--dial-o2) ${seg}deg ${seg * 2}deg)`;
    this.innerRot.style.background = `repeating-conic-gradient(from ${-seg / 2}deg, var(--dial-i1) 0 ${seg}deg, var(--dial-i2) ${seg}deg ${seg * 2}deg)`;
    if (!ctx.readOnly) this.bind();
  }

  tok(t, side) {
    const e = h('div', `dtok dtok-${side}` + (t.length >= 3 ? ' long' : t.length === 2 ? ' mid' : ''), t);
    return e;
  }

  bind() {
    let a0 = 0, r0 = 0, last = 0, acc = 0, stop = null;
    const ang = (e) => {
      const rc = this.box.getBoundingClientRect();
      const x = e.clientX - (rc.left + rc.width / 2), y = e.clientY - (rc.top + rc.height / 2);
      return (Math.atan2(x, -y) * 180) / Math.PI; // 上が0°、時計回りが正
    };
    draggable(this.box, {
      start: (e) => { stop?.(); a0 = last = ang(e); acc = 0; r0 = this.rf; this.el.classList.add('active'); },
      move: (e) => {
        const a = ang(e);
        let d = a - last;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        acc += d;
        last = a;
        const raw = r0 - acc / (360 / this.n);
        this.rf = magnet(raw, CONFIG.snap.zone);
        if (Number.isInteger(this.rf) && this.rf !== this.lastSnap) {
          this.lastSnap = this.rf;
          this.ctx.onSnap?.();
        }
        this.render();
      },
      end: () => {
        this.el.classList.remove('active');
        const to = Math.round(this.rf);
        const fire = to !== this.lastSnap;
        stop = animate(this.rf, to, CONFIG.snap.settleMs, (v) => { this.rf = v; this.render(); }, () => {
          this.rf = this.r = mod(to, this.n);
          this.lastSnap = this.rf;
          this.render();
          if (fire) this.ctx.onSnap?.();
          this.ctx.onChange?.(this.r);
        });
      },
    }, { threshold: 3 });
  }

  resize(w, hgt) {
    const D = Math.max(200, Math.min(CONFIG.dial.maxSize, w - 8, hgt - 18));
    this.D = D;
    this.box.style.width = this.box.style.height = D + 'px';
    const lenO = Math.max(...this.a.map((t) => t.length));
    const lenI = Math.max(...this.b.map((t) => t.length));
    const wO = Math.max(1, lenO * 0.95), wI = Math.max(1, lenI * 0.95);
    const sc = CONFIG.dial.tokenScale;
    const ro = D / 2;
    // 外円：文字の幅が「円周方向のすきま」と「帯の幅」の両方に収まる大きさ
    const fsO = Math.max(10, Math.min(23, ((2 * Math.PI * (ro - 20)) / this.n) * 0.78 / wO)) * sc;
    const bandO = Math.max(32, wO * fsO + 14);
    this.rOut = ro - bandO / 2 - 1;
    const rin = ro - bandO - 3;
    const fsI = Math.max(9, Math.min(21, ((2 * Math.PI * (rin - 18)) / this.n) * 0.78 / wI)) * sc;
    const bandI = Math.max(28, wI * fsI + 12);
    this.inner.style.width = this.inner.style.height = rin * 2 + 'px';
    this.inner.style.left = this.inner.style.top = ro - rin + 'px';
    this.rIn = rin - bandI / 2 - 1;
    this.el.style.setProperty('--fs-o', fsO.toFixed(1) + 'px');
    this.el.style.setProperty('--fs-i', fsI.toFixed(1) + 'px');
    const hub = Math.max(38, (rin - bandI) * 2 - 10);
    this.hub.style.width = this.hub.style.height = hub + 'px';
    this.hub.style.fontSize = Math.min(14, hub / 5) + 'px';
    this.render(true);
  }

  render(all) {
    if (!this.D) return;
    const th = 360 / this.n;
    const ro = this.D / 2;
    if (all) {
      this.outerToks.forEach((e, i) => {
        const t = ((i * th) * Math.PI) / 180;
        e.style.transform = `translate(${(ro + Math.sin(t) * this.rOut).toFixed(1)}px, ${(ro - Math.cos(t) * this.rOut).toFixed(1)}px) translate(-50%,-50%)`;
      });
    }
    const ri = parseFloat(this.inner.style.width) / 2;
    this.innerToks.forEach((e, j) => {
      const t = (((j - this.rf) * th) * Math.PI) / 180;
      e.style.transform = `translate(${(ri + Math.sin(t) * this.rIn).toFixed(1)}px, ${(ri - Math.cos(t) * this.rIn).toFixed(1)}px) translate(-50%,-50%)`;
      e.classList.toggle('hi', this.hiB.has(this.b[j]));
    });
    this.outerToks.forEach((e, i) => e.classList.toggle('hi', this.hiA.has(this.a[i])));
    this.innerRot.style.transform = `rotate(${(-this.rf * th).toFixed(2)}deg)`;
    this.hub.textContent = `回転 ${signed(Math.round(this.rf), this.n)}`;
  }

  getState() { return this.r; }
  setState(r) { this.r = this.rf = this.lastSnap = mod(r, this.n); this.render(); }
  highlight(aToks = [], bToks = []) { this.hiA = new Set(aToks); this.hiB = new Set(bToks); this.render(); }
  destroy() { this.el.remove(); }
}
