// パーティクル・波紋・浮遊テキスト・画面揺れ・フラッシュ（すべて白の濃淡）
import { fillSkin } from './skins.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Effects {
  constructor(shakeDecay = 10) {
    this.shakeDecay = shakeDecay;
    this.clear();
  }

  clear() {
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.flash = 0;
    this.shake = 0;
    this.ox = 0;
    this.oy = 0;
    this.banner = null;
    this.confetti = 0;
  }

  addShake(a) { this.shake = Math.max(this.shake, a); }
  addFlash(a) { this.flash = Math.max(this.flash, a); }

  ring(x, y, r0, r1, life, width = 2, alpha = 0.8) {
    this.rings.push({ x, y, r0, r1, life, t: 0, width, alpha });
  }

  sparks(x, y, n, speed, life = 0.4, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(speed * 0.4, speed);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rand(life * 0.6, life), t: 0, size: rand(size * 0.6, size),
        rot: 0, vr: 0, shape: 'dot', drag: 4,
      });
    }
  }

  /** ミス時の破砕（控えめ） */
  shatter(x, y, skin, r) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rand(-0.2, 0.2);
      const v = rand(60, 260);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rand(0.45, 0.8), t: 0, size: rand(2.5, 5.5),
        rot: rand(0, 6), vr: rand(-12, 12), shape: 'shard', drag: 3.5,
      });
    }
    this.sparks(x, y, 10, 160, 0.35, 1.6);
    this.ring(x, y, r, r * 5, 0.45, 2, 0.9);
  }

  text(x, y, main, sub, big = false) {
    this.texts.push({ x, y, main, sub, big, t: 0, life: big ? 0.9 : 0.7 });
  }

  showBanner(text, life = 1.4) {
    this.banner = { text, t: 0, life };
  }

  celebrate(sec = 2.5) { this.confetti = sec; }

  update(dt, W) {
    // 画面揺れ
    if (this.shake > 0.05) {
      this.ox = rand(-1, 1) * this.shake;
      this.oy = rand(-1, 1) * this.shake;
      this.shake *= Math.exp(-this.shakeDecay * dt);
    } else {
      this.shake = 0; this.ox = 0; this.oy = 0;
    }
    this.flash *= Math.exp(-9 * dt);
    if (this.flash < 0.01) this.flash = 0;

    // ハイスコア時の紙吹雪（白い欠片が上から舞う）
    if (this.confetti > 0) {
      this.confetti -= dt;
      const n = Math.random() < 0.9 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: rand(0, W), y: -10, vx: rand(-20, 20), vy: rand(80, 200),
          life: rand(1.5, 3), t: 0, size: rand(2, 5), rot: rand(0, 6), vr: rand(-6, 6),
          shape: 'shard', drag: 0.3,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) { this.particles.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      if (r.t >= r.life) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      if (t.t >= t.life) this.texts.splice(i, 1);
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.life) this.banner = null;
    }
  }

  drawWorld(ctx) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    for (const p of this.particles) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      if (p.shape === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.7);
        ctx.lineTo(-p.size * 0.6, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    for (const r of this.rings) {
      const k = r.t / r.life;
      const e = 1 - (1 - k) * (1 - k);
      ctx.globalAlpha = r.alpha * (1 - k);
      ctx.lineWidth = r.width * (1 - k * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx, font, W = 360) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = k < 0.12 ? 1 + (1 - k / 0.12) * 0.5 : 1;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const y = t.y - 30 - k * 26;
      ctx.font = `800 ${(t.big ? 22 : 16) * pop}px ${font}`;
      const x = Math.min(Math.max(t.x, 48), W - 48); // 画面端で切れないように
      ctx.fillText(t.main, x, y);
      if (t.sub) {
        ctx.globalAlpha *= 0.7;
        ctx.font = `600 ${t.big ? 12 : 10}px ${font}`;
        ctx.fillText(t.sub, x, y + (t.big ? 18 : 14));
      }
    }
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, W, y, font) {
    const b = this.banner;
    if (!b) return;
    const k = b.t / b.life;
    const inK = Math.min(b.t / 0.15, 1);
    ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    const s = 1 + (1 - inK) * 0.6;
    ctx.font = `900 ${26 * s}px ${font}`;
    ctx.fillText(b.text, W / 2, y);
    ctx.globalAlpha *= 0.5;
    ctx.fillRect(W / 2 - 70 * inK, y + 20, 140 * inK, 1.5);
    ctx.globalAlpha = 1;
  }

  /** 指定スキンで残像を描く */
  static ghost(ctx, skin, x, y, r, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    fillSkin(ctx, skin, r);
    ctx.restore();
  }
}
