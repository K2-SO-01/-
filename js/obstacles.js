import { CONFIG } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 点(px,py) から回転矩形までの符号付き距離（内側は負） */
function rectDist(px, py, cx, cy, hw, hh, a) {
  let dx = px - cx;
  let dy = py - cy;
  if (a) {
    const c = Math.cos(a), s = Math.sin(a);
    const lx = dx * c + dy * s;
    const ly = -dx * s + dy * c;
    dx = lx; dy = ly;
  }
  const qx = Math.abs(dx) - hw;
  const qy = Math.abs(dy) - hh;
  const ox = qx > 0 ? qx : 0;
  const oy = qy > 0 ? qy : 0;
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0);
}

class Obstacle {
  constructor(y) {
    this.y = y;          // 中心Y
    this.h = 0;          // 上下方向の半分の大きさ（通過判定・カリング用）
    this.minClear = Infinity;
    this.judged = false;
    this.flash = 0;      // ニアミス時に光らせる
  }
  update() {}
}

/** 隙間のある横壁（slider = 隙間が左右に動く） */
class Wall extends Obstacle {
  constructor(y, gapX, gapW, W, slider = null) {
    super(y);
    const C = CONFIG.obstacles.wall;
    this.kind = slider ? 'slider' : 'wall';
    this.th = C.thickness;
    this.h = this.th / 2;
    this.W = W;
    this.baseX = gapX;
    this.gapX = gapX;
    this.gapW = gapW;
    this.slider = slider; // {amp, freq, phase}
  }
  update(dt) {
    if (this.slider) {
      this.slider.phase += dt * this.slider.freq * Math.PI * 2;
      this.gapX = this.baseX + this.slider.amp * Math.sin(this.slider.phase);
    }
  }
  edges() {
    return [this.gapX - this.gapW / 2, this.gapX + this.gapW / 2];
  }
  distance(px, py) {
    const [l1, r0] = this.edges();
    const l0 = -60, r1 = this.W + 60;
    const a = rectDist(px, py, (l0 + l1) / 2, this.y, (l1 - l0) / 2, this.h, 0);
    const b = rectDist(px, py, (r0 + r1) / 2, this.y, (r1 - r0) / 2, this.h, 0);
    return a < b ? a : b;
  }
  draw(ctx) {
    const [l1, r0] = this.edges();
    const top = this.y - this.h;
    ctx.fillRect(-10, top, l1 + 10, this.th);
    ctx.fillRect(r0, top, this.W + 10 - r0, this.th);
    if (this.slider) {
      // 動く壁の目印：隙間の縁に細いライン
      ctx.globalAlpha *= 0.35;
      ctx.fillRect(l1 - 3, top - 6, 2, this.th + 12);
      ctx.fillRect(r0 + 1, top - 6, 2, this.th + 12);
    }
  }
}

/** 回転しながら落ちる四角ブロック */
class Block extends Obstacle {
  constructor(y, x, size, spin, drift, W) {
    super(y);
    this.kind = 'block';
    this.x = x;
    this.s = size / 2;
    this.h = this.s * Math.SQRT2;
    this.a = rand(0, Math.PI);
    this.spin = spin;
    this.drift = drift;
    this.W = W;
  }
  update(dt) {
    this.a += this.spin * dt;
    this.x += this.drift * dt;
    if (this.x < this.s || this.x > this.W - this.s) {
      this.drift = -this.drift;
      this.x = clamp(this.x, this.s, this.W - this.s);
    }
  }
  distance(px, py) {
    return rectDist(px, py, this.x, this.y, this.s, this.s, this.a);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);
    ctx.fillRect(-this.s, -this.s, this.s * 2, this.s * 2);
    ctx.restore();
  }
}

/** 回転バー */
class Rotor extends Obstacle {
  constructor(y, x, spin) {
    super(y);
    const C = CONFIG.obstacles.rotor;
    this.kind = 'rotor';
    this.x = x;
    this.len = C.halfLen;
    this.th = C.thickness;
    this.h = this.len;
    this.a = rand(0, Math.PI);
    this.spin = spin;
  }
  update(dt) {
    this.a += this.spin * dt;
  }
  distance(px, py) {
    return rectDist(px, py, this.x, this.y, this.len, this.th / 2, this.a);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);
    ctx.fillRect(-this.len, -this.th / 2, this.len * 2, this.th);
    // 中心の穴（装飾）
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, this.th * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** パターン生成器：スクロール距離に応じて次の障害物群を出す */
export class Spawner {
  reset(W) {
    this.W = W;
    this.dist = 0;
    this.next = CONFIG.difficulty.firstSpawnDelay;
    this.lastGapX = W / 2;
    this.history = [];
  }

  update(dt, diff, t, out) {
    this.dist += diff.speed * dt;
    if (this.dist < this.next) return;
    this.dist -= this.next;
    const { items, height } = this.make(diff, t);
    // パターンの下端が画面上端のすぐ上に来るよう配置
    for (const o of items) {
      o.y += -height - 10 + this.dist; // dist = 超過分を補正
      out.push(o);
    }
    this.next = height + diff.spacing;
  }

  pickType(diff, t) {
    const O = CONFIG.obstacles;
    if (diff.relief > 0.3) return Math.random() < 0.6 ? 'wall' : 'blocks';
    const pool = [];
    let total = 0;
    for (const k of Object.keys(O.weights)) {
      if (t < O.unlockAt[k]) continue;
      // 同じパターンの3連続は避ける
      const h = this.history;
      if (h.length >= 2 && h[h.length - 1] === k && h[h.length - 2] === k) continue;
      pool.push([k, O.weights[k]]);
      total += O.weights[k];
    }
    let r = Math.random() * total;
    for (const [k, w] of pool) {
      if ((r -= w) <= 0) return k;
    }
    return 'wall';
  }

  gapWidth(diff) {
    const C = CONFIG.obstacles.wall;
    return lerp(C.gapStart, C.gapMin, diff.d) * diff.gapMul * rand(0.95, 1.08);
  }

  nextGapX(gapW, margin = 8) {
    const C = CONFIG.obstacles.wall;
    const lo = gapW / 2 + margin, hi = this.W - gapW / 2 - margin;
    let x = this.lastGapX + rand(-C.maxShift, C.maxShift);
    // 真ん中ばかりにならないよう、ずれが小さすぎたら押し出す
    if (Math.abs(x - this.lastGapX) < 30) x += x < this.W / 2 ? 50 : -50;
    x = clamp(x, lo, hi);
    this.lastGapX = x;
    return x;
  }

  make(diff, t) {
    const type = this.pickType(diff, t);
    this.history.push(type);
    if (this.history.length > 4) this.history.shift();
    const O = CONFIG.obstacles;
    const W = this.W;
    const items = [];
    let height = 0;

    switch (type) {
      case 'wall': {
        const g = this.gapWidth(diff);
        const w = new Wall(0, this.nextGapX(g), g, W);
        w.y = w.h;
        items.push(w);
        height = w.h * 2;
        break;
      }
      case 'slider': {
        const S = O.slider;
        const g = this.gapWidth(diff) * 1.05;
        let amp = lerp(S.ampMin, S.ampMax, diff.d * rand(0.6, 1));
        amp = Math.min(amp, (W - g) / 2 - 10);
        const lo = g / 2 + amp + 8, hi = W - g / 2 - amp - 8;
        const x = clamp(this.lastGapX + rand(-80, 80), lo, hi);
        this.lastGapX = x;
        const w = new Wall(0, x, g, W, {
          amp, freq: lerp(S.freqMin, S.freqMax, diff.d), phase: rand(0, Math.PI * 2),
        });
        w.update(0);
        w.y = w.h;
        items.push(w);
        height = w.h * 2;
        break;
      }
      case 'zigzag': {
        const Z = O.zigzag;
        const g = this.gapWidth(diff) * 1.08;
        const gapY = Math.max(Z.minGapY, diff.speed * Z.timeGap);
        const leftFirst = Math.random() < 0.5;
        const xa = leftFirst ? rand(g / 2 + 8, W * 0.36) : rand(W * 0.64, W - g / 2 - 8);
        const xb = leftFirst ? rand(W * 0.64, W - g / 2 - 8) : rand(g / 2 + 8, W * 0.36);
        // 下（先に来る）が a
        const a = new Wall(0, xa, g, W);
        const b = new Wall(0, xb, g, W);
        b.y = b.h;
        a.y = b.h + gapY;
        items.push(a, b);
        this.lastGapX = xb;
        height = gapY + a.h * 2;
        break;
      }
      case 'blocks': {
        const B = O.blocks;
        const n = Math.round(lerp(B.countMin, B.countMax, Math.min(1, diff.d * rand(0.7, 1.3))));
        let y = 0;
        let lastX = -999;
        for (let i = 0; i < n; i++) {
          const size = rand(B.sizeMin, B.sizeMax);
          let x;
          let tries = 0;
          do {
            x = rand(size, W - size);
          } while (Math.abs(x - lastX) < size * 2.2 && ++tries < 8);
          lastX = x;
          const spin = rand(-B.spinMax, B.spinMax);
          const drift = Math.random() < diff.d ? rand(-B.driftMax, B.driftMax) : 0;
          const blk = new Block(0, x, size, spin, drift, W);
          blk.y = y + blk.h;
          items.push(blk);
          y += B.stepY * rand(0.8, 1.2);
        }
        height = y - B.stepY * 0.5 + B.sizeMax;
        break;
      }
      case 'rotor': {
        const R = O.rotor;
        const spin = lerp(R.spinMin, R.spinMax, diff.d) * (Math.random() < 0.5 ? -1 : 1);
        const r = new Rotor(0, W / 2 + rand(-R.offsetX, R.offsetX), spin);
        r.y = r.h;
        items.push(r);
        height = r.h * 2;
        break;
      }
    }
    return { items, height };
  }
}
