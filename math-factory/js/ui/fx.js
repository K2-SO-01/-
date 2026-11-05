/* 数学ファクトリー：画面の演出（粒子・バナー・紙ふぶき・ボス登場・打ち上げ） */
(function (MF) {
  'use strict';
  const FX = { parts: [], running: false };
  MF.FX = FX;
  const calm = () => document.body.classList.contains('reduce-motion');
  function canvas() {
    const cv = document.getElementById('fx-canvas');
    if (!cv) return null;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(innerWidth * dpr) || cv.height !== Math.round(innerHeight * dpr)) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
    return cv;
  }
  function loop() {
    const cv = canvas();
    if (!cv) { FX.running = false; return; }
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    FX.parts = FX.parts.filter((p) => now - p.t0 < p.life);
    for (const p of FX.parts) {
      const k = (now - p.t0) / p.life;
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr || 0;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); ctx.restore(); }
      else if (p.shape === 'text') { ctx.font = 'bold ' + p.r + 'px sans-serif'; ctx.fillText(p.text, p.x, p.y); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (FX.parts.length) requestAnimationFrame(loop); else { FX.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function kick() { if (!FX.running) { FX.running = true; requestAnimationFrame(loop); } }
  FX.burst = function (o) {
    if (calm()) return;
    const n = Math.min(60, o.n || 16);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      FX.parts.push({ x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.15, r: 2 + Math.random() * 3, color: i % 3 === 0 ? '#fff' : o.color || '#ffb02e', t0, life: 600 + Math.random() * 500 });
    }
    // 「+」の文字が舞う
    for (let i = 0; i < 3; i++) FX.parts.push({ x: o.x + (Math.random() - 0.5) * 60, y: o.y, vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2, g: 0.02, r: 16, shape: 'text', text: ['∑', '∫', 'π', '√', '+'][Math.floor(Math.random() * 5)], color: o.color || '#ffb02e', t0, life: 900 });
    kick();
  };
  FX.puff = function (o) {
    if (calm()) return;
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; FX.parts.push({ x: o.x, y: o.y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5 - 0.5, g: -0.02, r: 4 + Math.random() * 4, color: '#9aa3ad', t0, life: 500 }); }
    kick();
  };
  FX.confetti = function () {
    if (calm()) return;
    const t0 = performance.now();
    const cols = ['#ffb02e', '#39d0ff', '#52d273', '#ff5d5d', '#b48cff', '#fff'];
    for (let i = 0; i < 120; i++) FX.parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.03, r: 4 + Math.random() * 4, shape: 'rect', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, color: cols[i % cols.length], t0, life: 2600 + Math.random() * 1200 });
    kick();
  };
  function overlay(cls, html, ms) {
    const el = document.createElement('div');
    el.className = 'fx-overlay ' + cls;
    el.innerHTML = html;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }
  FX.comboBanner = function (n) {
    if (calm()) return;
    overlay('fx-combo', '<span>' + n + '</span> COMBO!', 1100);
    document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
  };
  // バナーは重ならないように1つずつ
  const bq = [];
  let bShowing = false;
  FX.banner = function (title, sub) {
    if (bq.length >= 3) bq.shift();
    bq.push([title, sub]);
    if (!bShowing) nextBanner();
  };
  function nextBanner() {
    const b = bq.shift();
    if (!b) { bShowing = false; return; }
    bShowing = true;
    const ms = calm() ? 1600 : 2000;
    overlay('fx-banner', '<div class="fb-t">' + b[0] + '</div>' + (b[1] ? '<div class="fb-s">' + b[1] + '</div>' : ''), ms);
    setTimeout(nextBanner, ms + 100);
  }
  FX.bossIntro = function (name) {
    if (MF.Audio) MF.Audio.play('alarm');
    overlay('fx-boss', '<div class="fx-warn"><span>⚠ WARNING ⚠</span></div><div class="fx-boss-name">' + name + '</div>', calm() ? 1200 : 2200);
  };
  FX.alert = function () { if (!calm()) overlay('fx-alert', '', 1200); };
  FX.launch = function () {
    overlay('fx-launch', '<div class="fx-rocket">🚀</div><div class="fx-smoke"></div>', calm() ? 800 : 2400);
  };
})(globalThis.MF = globalThis.MF || {});
