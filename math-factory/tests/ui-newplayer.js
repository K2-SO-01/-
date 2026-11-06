// 新しく始めたプレイヤーの動きを、スマホの画面操作だけで再現する（ミッション1〜3）
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || null;
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (n) => { if (OUT) await page.screenshot({ path: path.join(OUT, 'np-' + n + '.png') }); };
  const closeTalks = async () => { let empty = 0; for (let i = 0; i < 40 && empty < 9; i++) { await page.waitForTimeout(300); const b = await page.$('.talk-foot .btn'); if (b) { empty = 0; await b.click().catch(() => {}); } else if (await page.$('.chapter-card')) { empty = 0; await page.click('text=はじめる'); } else if (!(await page.$('.modal'))) empty++; else { empty = 0; const f = await page.$('.modal-foot .btn >> nth=-1'); if (f) await f.click().catch(() => {}); } } };
  const cellPos = (x, y) => page.evaluate(([x, y]) => { const F = MF.FactoryUI, r = F.canvas.getBoundingClientRect(), cs = F.cs * F.zoom; return { x: r.left + F.ox + (x + 0.5) * cs, y: r.top + F.oy + (y + 0.5) * cs }; }, [x, y]);
  const mission = () => page.evaluate(() => (MF.Story.current(MF.UI.state) || {}).id);
  try {
    await page.goto(URL);
    // はじめての起動画面：1回目のタップで全部の行を出し、2回目で閉じる
    await page.waitForSelector('.boot', { timeout: 5000 }); await page.click('.boot'); await page.waitForTimeout(150); await page.click('.boot', { timeout: 1500 }).catch(() => {});
    await page.click('text=慣れてる（最小限）', { timeout: 5000 }); // 案内は最小限（ていねいな案内は ui-tutorial.js で点検）
    await page.waitForSelector('.opening'); await page.waitForTimeout(2500);
    await page.click('text=目を覚ます');
    await closeTalks();
    // ミッション1：3問正解
    for (let i = 0; i < 3; i++) {
      // 前の問題が終わっていたら「次の問題」で進む（ナビのひとことがある間は自動で進むのが少し遅い）
      if (await page.evaluate(() => MF.UI.state.quiz.current.done)) await page.tap('#screen .q-actions .btn.primary');
      await page.waitForFunction(() => !MF.UI.state.quiz.current.done, null, { timeout: 5000 });
      const ans = await page.evaluate(() => MF.Questions.answerText(MF.Game.Quiz.currentQuestion(MF.UI.state)));
      for (const ch of ans) await page.tap('.keypad .key >> text="' + (ch === '-' ? '−' : ch) + '"');
      await page.tap('.keypad .key-ok');
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(1500);
    await shot('1-after-solve3');
    await closeTalks();
    if (await mission() !== 'miner') throw new Error('mission2 not started: ' + await mission());
    // バナーの「工場へ」
    await page.tap('.mission >> text=工場へ');
    await page.waitForSelector('.fac-canvas');
    await shot('2-factory');
    await page.tap('.tool-btn[data-id=build]');
    await page.tap('.pal-btn[data-type=miner]');
    await shot('3-build-miner');
    // コアに近い鉄の鉱脈をタップ（なければ石）
    const t = await page.evaluate(() => {
      const s = MF.UI.state, f = s.factory, core = Object.values(f.b).find((b) => b.type === 'core');
      let best = null;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const o = f.ore[y * f.w + x]; if (o !== 'iron' && o !== 'stone') continue; if (y !== core.y) continue; const d = Math.abs(x - core.x); if (!best || d < best.d) best = { x, y, d }; }
      if (!best) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const o = f.ore[y * f.w + x]; if (o !== 'iron' && o !== 'stone') continue; const d = Math.abs(x - core.x) + Math.abs(y - core.y); if (!best || d < best.d) best = { x, y, d }; }
      return { m: best, core: { x: core.x, y: core.y } };
    });
    await page.evaluate((d) => { MF.FactoryUI.dir = d; }, t.m.y === t.core.y ? (t.m.x < t.core.x ? 1 : 3) : (t.m.y < t.core.y ? 2 : 0));
    let p = await cellPos(t.m.x, t.m.y);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(1600);
    await shot('4-miner-placed');
    await closeTalks();
    if (await mission() !== 'belt') throw new Error('mission3 not started: ' + await mission());
    // ベルト：ゲームの操作と同じく1マスずつタップで置く（向きは「向き」ボタンで）
    await page.tap('.pal-btn[data-type=belt]');
    const cells = [];
    if (t.m.y === t.core.y) { const sx = Math.sign(t.core.x - t.m.x); for (let x = t.m.x + sx; x !== t.core.x; x += sx) cells.push([x, t.m.y, sx > 0 ? 1 : 3]); }
    else { const sy = Math.sign(t.core.y - t.m.y); for (let y = t.m.y + sy; y !== t.core.y; y += sy) cells.push([t.m.x, y, sy > 0 ? 2 : 0]); const sx = Math.sign(t.core.x - t.m.x); cells.push([t.m.x, t.core.y, sx > 0 ? 1 : 3]); for (let x = t.m.x + sx; x !== t.core.x; x += sx) cells.push([x, t.core.y, sx > 0 ? 1 : 3]); }
    for (const [x, y, d] of cells) {
      for (let k = 0; k < 4 && await page.evaluate(() => MF.FactoryUI.dir) !== d; k++) await page.tap('.dir-btn');
      p = await cellPos(x, y); await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(80);
    }
    await page.waitForTimeout(6000);
    await shot('5-belt');
    await closeTalks();
    await page.waitForTimeout(500);
    const m = await mission();
    if (m !== 'power') throw new Error('mission4 not started: ' + m);
    await shot('6-power-mission');
  } catch (e) { errors.push(e.message); await shot('error'); }
  await browser.close();
  console.log(errors.length ? '✗ newplayer\n  ' + errors.join('\n  ') : '✓ newplayer');
  process.exit(errors.length ? 1 : 0);
})();
