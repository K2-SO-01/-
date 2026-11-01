// ゲーム本体：更新・当たり判定・ニアミス・演出・描画
import { CONFIG } from './config.js';
import { difficultyAt } from './difficulty.js';
import { Spawner } from './obstacles.js';
import { Effects } from './effects.js';
import { getSkin, fillSkin } from './skins.js';

const FONT = '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Helvetica Neue", "Segoe UI", Roboto, sans-serif';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor(canvas, { input, audio, haptics, storage, onGameOver }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
    this.input = input;
    this.audio = audio;
    this.haptics = haptics;
    this.storage = storage;
    this.onGameOver = onGameOver;

    this.fx = new Effects(CONFIG.effects.shakeDecay);
    this.spawner = new Spawner();
    this.state = 'title'; // title | play | dying | over | paused
    this.debug = /[?&]debug\b/.test(location.search);
    this.god = /[?&]god\b/.test(location.search); // デバッグ用：無敵
    this.fps = 60;
    this.safe = { top: 0, bottom: 0 };
    this.W = CONFIG.world.width;
    this.H = 640;
    this.bgLines = [];
    this.skin = getSkin(storage.data.skin);
    this.resize();
    this.reset();
  }

  get settings() { return this.storage.data.settings; }
  get fxOn() { return this.settings.effects; }

  // ------------------------------------------------------------------
  resize() {
    const app = this.canvas.parentElement;
    const rect = app.getBoundingClientRect();
    const cssW = Math.max(1, rect.width), cssH = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.world.maxDpr);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.dpr = dpr;
    this.u = cssW / CONFIG.world.width;        // CSS px / 設計px
    const oldH = this.H;
    this.H = cssH / this.u;
    // セーフエリア（CSS env() をプローブ要素から読む）
    const probe = document.getElementById('safe-probe');
    if (probe) {
      const cs = getComputedStyle(probe);
      this.safe.top = (parseFloat(cs.paddingTop) || 0) / this.u;
      this.safe.bottom = (parseFloat(cs.paddingBottom) || 0) / this.u;
    }
    if (this.player && oldH) {
      const k = this.H / oldH;
      this.player.y *= k; this.player.ty *= k;
      this.clampTarget();
    }
    this.initBg();
  }

  initBg() {
    this.bgLines = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      this.bgLines.push({
        x: rand(0, this.W), y: rand(0, this.H), len: rand(10, 60),
        a: rand(0.04, 0.14), k: rand(0.3, 0.9),
      });
    }
  }

  bounds() {
    const P = CONFIG.player;
    return {
      x0: P.radius, x1: this.W - P.radius,
      y0: Math.max(this.H * P.topLimit, this.safe.top + 60),
      y1: this.H - P.radius - P.bottomMargin - this.safe.bottom,
    };
  }

  clampTarget() {
    const b = this.bounds();
    const p = this.player;
    p.tx = clamp(p.tx, b.x0, b.x1);
    p.ty = clamp(p.ty, b.y0, b.y1);
    p.x = clamp(p.x, b.x0, b.x1);
    p.y = clamp(p.y, b.y0, b.y1);
  }

  reset() {
    const P = CONFIG.player;
    const x = this.W / 2, y = this.H * P.startY;
    this.player = { x, y, tx: x, ty: y, vx: 0, rot: 0, trail: [], alive: true };
    this.clampTarget();
    this.obstacles = [];
    this.spawner.reset(this.W);
    this.fx.clear();
    this.t = 0;
    this.bonus = 0;
    this.score = 0;
    this.nearCount = 0;
    this.perfectCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastNearT = -99;
    this.timeScale = 1;
    this.slowTimer = 0;
    this.slowCooldown = 0;
    this.hitstop = 0;
    this.minClear = Infinity;
    this.deathTimer = 0;
    this.bestAtStart = this.storage.data.best;
    this.passedBest = false;
    this.diff = difficultyAt(0);
    this.skin = getSkin(this.storage.data.skin);
  }

  start() {
    this.reset();
    this.state = 'play';
    this.input.consume();
    this.fx.ring(this.player.x, this.player.y, 10, 60, 0.4, 2, 0.6);
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'play';
    this.input.consume();
    this.timeScale = 0.25; // 再開直後はゆっくり戻す
  }

  toTitle() {
    this.reset();
    this.state = 'title';
  }

  setSkin(id) {
    this.skin = getSkin(id);
  }

  // ------------------------------------------------------------------
  frame(dt) {
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    dt = Math.min(dt, 1 / 20); // タブ復帰などの大ジャンプ対策
    this.update(dt);
    this.render();
  }

  update(dt) {
    const p = this.player;
    const E = CONFIG.effects;

    // --- 入力：相対ドラッグ（実時間で即追従。スロー・ヒットストップの影響を受けない）
    const d = this.input.consume();
    const prevX = p.x, prevY = p.y;
    if (this.state === 'play') {
      const s = this.settings.sensitivity / this.u;
      p.tx += d.x * s;
      p.ty += d.y * s;
      this.clampTarget();
      const f = CONFIG.input.follow;
      const k = f > 0 ? 1 - Math.exp(-f * dt) : 1;
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      p.vx = dt > 0 ? (p.x - prevX) / dt : 0;
    }
    if (this.state === 'title' || this.state === 'over') {
      p.vx = 0;
    }

    // --- 時間の流れ（ヒットストップ・スロー）
    let wdt = dt;
    if (this.hitstop > 0) { this.hitstop -= dt; wdt = 0; }
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.slowCooldown > 0) this.slowCooldown -= dt;
    let target = this.slowTimer > 0 ? E.slowScale : 1;
    if (this.state === 'dying' || this.state === 'over') target = 0.15;
    const rate = target < this.timeScale ? E.slowIn : E.slowOut;
    this.timeScale += (target - this.timeScale) * (1 - Math.exp(-rate * dt));
    if (this.state === 'paused') wdt = 0;
    else wdt *= this.timeScale;

    // --- ワールド更新（サブステップで高速時のすり抜けを防ぐ）
    if (this.state === 'play') {
      this.diff = difficultyAt(this.t);
      this.audio.intensity = this.diff.d;
      const move = Math.max(this.diff.speed * wdt, Math.hypot(p.x - prevX, p.y - prevY));
      const steps = clamp(Math.ceil(move / 6), 1, 12);
      this.minClear = Infinity;
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        const px = prevX + (p.x - prevX) * k;
        const py = prevY + (p.y - prevY) * k;
        if (!this.step(wdt / steps, px, py)) break;
      }
      // スローモーション：極端に近い瞬間だけ
      if (this.fxOn && this.state === 'play' && this.minClear < E.slowClear &&
          this.slowCooldown <= 0 && this.slowTimer <= 0) {
        this.slowTimer = E.slowMaxDuration;
        this.slowCooldown = E.slowMaxDuration + E.slowCooldown;
      }
      this.score = Math.floor(this.t * CONFIG.score.perSecond + this.bonus);
      if (!this.passedBest && this.bestAtStart > 0 && this.score > this.bestAtStart) {
        this.passedBest = true;
        this.fx.showBanner('NEW BEST');
        this.fx.ring(p.x, p.y, 10, 120, 0.6, 3, 0.8);
        this.audio.play('best');
        this.haptics.pulse(CONFIG.vibration.best);
      }
    } else if (this.state === 'dying' || this.state === 'over') {
      for (const o of this.obstacles) { o.y += this.diff.speed * wdt; o.update(wdt); }
      if (this.state === 'dying') {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) {
          this.state = 'over';
          this.onGameOver(this.result());
        }
      }
    }

    // --- 残像
    if (this.state === 'play') {
      p.trail.unshift({ x: p.x, y: p.y, rot: p.rot });
      if (p.trail.length > CONFIG.player.trailCount) p.trail.pop();
    } else if (p.trail.length) {
      p.trail.pop();
    }
    const spin = this.skin.spin || 0;
    p.rot = spin ? p.rot + spin * dt : 0;
    p.tilt = clamp(p.vx * CONFIG.player.tiltByVelocity, -0.5, 0.5);

    // --- 背景の流線
    const bgSpeed = this.state === 'play' || this.state === 'dying' || this.state === 'over'
      ? this.diff.speed * 0.9 * (wdt / (dt || 1)) : 60;
    for (const l of this.bgLines) {
      l.y += bgSpeed * l.k * dt;
      if (l.y - l.len > this.H) { l.y = -rand(0, 40); l.x = rand(0, this.W); }
    }

    // 演出は実時間で進める
    const fxScale = this.fxOn ? 1 : 0;
    if (!fxScale) { this.fx.shake = 0; this.fx.flash = 0; }
    this.fx.update(dt, this.W);
  }

  /** 1サブステップ。死んだら false */
  step(h, px, py) {
    const P = CONFIG.player;
    this.t += h;
    this.spawner.update(h, this.diff, this.t, this.obstacles);
    const speed = this.diff.speed;
    let min = this.minClear;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += speed * h;
      o.update(h);
      if (o.flash > 0) o.flash -= h * 4;
      // 近いものだけ判定
      if (Math.abs(o.y - py) < o.h + 60) {
        const clear = o.distance(px, py) - P.hitRadius;
        if (clear < 0 && !this.god) { this.die(px, py); return false; }
        if (clear < o.minClear) o.minClear = clear;
        if (clear < min) min = clear;
      }
      // 自機を通り過ぎたらニアミス判定
      if (!o.judged && o.y - o.h > py + P.radius) this.judge(o, px, py);
      if (o.y - o.h > this.H + 40) {
        if (!o.judged) this.judge(o, px, py);
        this.obstacles.splice(i, 1);
      }
    }
    this.minClear = min;
    return true;
  }

  judge(o, px, py) {
    o.judged = true;
    if (o.minClear < 0) return; // 無敵デバッグ時の接触は数えない
    const N = CONFIG.nearMiss;
    if (o.minClear <= N.perfectClear) this.nearMiss(o, true, px, py);
    else if (o.minClear <= N.nearClear) this.nearMiss(o, false, px, py);
  }

  nearMiss(o, perfect, px, py) {
    const N = CONFIG.nearMiss, E = CONFIG.effects;
    this.combo = this.t - this.lastNearT <= N.comboWindow ? this.combo + 1 : 1;
    this.lastNearT = this.t;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = Math.min(1 + (this.combo - 1) * N.comboStep, N.comboMax);
    const pts = Math.round((perfect ? N.perfectScore : N.nearScore) * mult);
    this.bonus += pts;
    o.flash = 1;
    if (perfect) this.perfectCount++; else this.nearCount++;

    const label = perfect ? 'PERFECT' : 'NEAR';
    const sub = this.combo > 1 ? `${label}  x${mult.toFixed(1)}` : label;
    this.fx.text(px, py, `+${pts}`, sub, perfect);
    this.fx.ring(px, py, CONFIG.player.radius, perfect ? 70 : 42, perfect ? 0.45 : 0.3, perfect ? 2.5 : 1.5, perfect ? 0.9 : 0.6);
    this.fx.sparks(px, py, perfect ? 14 : 6, perfect ? 220 : 140, 0.35, 2);
    this.hitstop = Math.max(this.hitstop, perfect ? E.hitstopPerfect : E.hitstopNear);
    if (this.fxOn) {
      this.fx.addShake(perfect ? E.shakePerfect : E.shakeNear);
      if (perfect) this.fx.addFlash(0.18);
    }
    this.audio.play(perfect ? 'perfect' : 'near', { combo: this.combo });
    this.haptics.pulse(perfect ? CONFIG.vibration.perfect : CONFIG.vibration.near);
  }

  die(px, py) {
    const E = CONFIG.effects;
    const p = this.player;
    p.x = px; p.y = py;
    p.alive = false;
    this.state = 'dying';
    this.deathTimer = E.deathDelay;
    this.hitstop = E.hitstopDeath;
    this.slowTimer = 0;
    this.fx.shatter(px, py, this.skin, CONFIG.player.radius);
    if (this.fxOn) {
      this.fx.addShake(E.shakeDeath);
      this.fx.addFlash(0.35);
    }
    this.audio.play('crash');
    this.audio.stopBgm(0.6);
    this.haptics.pulse(CONFIG.vibration.death);
    this.score = Math.floor(this.t * CONFIG.score.perSecond + this.bonus);
  }

  result() {
    const C = CONFIG.coins;
    return {
      score: this.score,
      time: this.t,
      near: this.nearCount,
      perfect: this.perfectCount,
      maxCombo: this.maxCombo,
      coins: Math.floor(this.score / C.scorePerCoin) + this.perfectCount * C.perPerfect,
    };
  }

  // ------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const s = this.dpr * this.u;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(s, 0, 0, s, this.fx.ox * s, this.fx.oy * s);

    // 背景の流線
    ctx.fillStyle = '#fff';
    for (const l of this.bgLines) {
      ctx.globalAlpha = l.a;
      ctx.fillRect(l.x, l.y - l.len, 1, l.len);
    }
    ctx.globalAlpha = 1;

    // 障害物
    for (const o of this.obstacles) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      o.draw(ctx);
      if (o.flash > 0 && this.fxOn) {
        // ニアミスした障害物の残光
        ctx.globalAlpha = 0.25 * o.flash;
        ctx.save();
        ctx.translate(0, -6 * (1 - o.flash));
        o.draw(ctx);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // 自機
    const p = this.player;
    const R = CONFIG.player.radius;
    if (p.alive) {
      ctx.fillStyle = '#fff';
      for (let i = p.trail.length - 1; i >= 1; i--) {
        const tr = p.trail[i];
        Effects.ghost(ctx, this.skin, tr.x, tr.y, R * (1 - i * 0.06), tr.rot + p.tilt, 0.28 * (1 - i / p.trail.length));
      }
      let bob = 0;
      if (this.state === 'title') bob = Math.sin(performance.now() / 400) * 4;
      Effects.ghost(ctx, this.skin, p.x, p.y + bob, R, p.rot + (p.tilt || 0), 1);

      // 危険リング（ギリギリ感）
      if (this.state === 'play' && this.minClear < CONFIG.effects.dangerRing) {
        const k = 1 - this.minClear / CONFIG.effects.dangerRing;
        ctx.globalAlpha = 0.15 + 0.55 * k;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 + k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R + 6 - k * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (this.debug) {
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, CONFIG.player.hitRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    this.fx.drawWorld(ctx);
    ctx.setTransform(s, 0, 0, s, 0, 0);

    // スロー中は画面の縁がうっすら白む
    if (this.timeScale < 0.9 && this.fxOn && this.state === 'play') {
      const k = (1 - this.timeScale) / (1 - CONFIG.effects.slowScale);
      ctx.globalAlpha = 0.25 * clamp(k, 0, 1);
      ctx.fillStyle = '#fff';
      const b = 3;
      ctx.fillRect(0, 0, this.W, b);
      ctx.fillRect(0, this.H - b, this.W, b);
      ctx.fillRect(0, 0, b, this.H);
      ctx.fillRect(this.W - b, 0, b, this.H);
      ctx.globalAlpha = 1;
    }

    // HUD
    if (this.state === 'play' || this.state === 'dying' || this.state === 'paused') this.drawHud(ctx);
    this.fx.drawTexts(ctx, FONT, this.W);
    this.fx.drawBanner(ctx, this.W, this.safe.top + 120, FONT);

    if (this.fx.flash > 0) {
      ctx.globalAlpha = this.fx.flash;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }

    if (this.debug) {
      ctx.fillStyle = '#fff';
      ctx.font = `500 10px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = 0.7;
      ctx.fillText(`${this.fps.toFixed(0)}fps  dpr${this.dpr}  t${this.t.toFixed(1)}  d${this.diff.d.toFixed(2)}  v${this.diff.speed.toFixed(0)}  relief${this.diff.relief.toFixed(2)}  obj${this.obstacles.length}`, 6, this.H - this.safe.bottom - 16);
      ctx.globalAlpha = 1;
    }
  }

  drawHud(ctx) {
    const top = this.safe.top;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `200 44px ${FONT}`;
    ctx.fillText(String(this.score), this.W / 2, top + 48);
    ctx.globalAlpha = 0.45;
    ctx.font = `600 10px ${FONT}`;
    ctx.fillText(`BEST ${Math.max(this.storage.data.best, this.passedBest ? this.score : 0)}`, this.W / 2, top + 78);
    // コンボ
    if (this.combo > 1 && this.t - this.lastNearT <= CONFIG.nearMiss.comboWindow) {
      const k = 1 - (this.t - this.lastNearT) / CONFIG.nearMiss.comboWindow;
      ctx.globalAlpha = 0.3 + 0.7 * k;
      ctx.font = `800 14px ${FONT}`;
      ctx.fillText(`${this.combo} COMBO`, this.W / 2, top + 96);
      ctx.globalAlpha = 0.3 * k;
      ctx.fillRect(this.W / 2 - 30 * k, top + 107, 60 * k, 1.5);
    }
    ctx.globalAlpha = 1;
  }
}
