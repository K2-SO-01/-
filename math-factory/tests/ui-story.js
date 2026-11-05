// ストーリーとチュートリアルの画面テスト：新しく始めて、オープニング→第1章→最初のミッション達成→次の会話
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || null;
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  const shot = async (n) => { if (OUT) await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  try {
    await page.waitForSelector('.opening', { timeout: 5000 });
    await page.waitForTimeout(2600);
    await shot('s-opening');
    await page.click('text=目を覚ます');
    await page.waitForSelector('.chapter-card');
    await shot('s-chapter');
    await page.click('text=はじめる');
    await page.waitForSelector('.talk');
    await shot('s-talk');
    for (let i = 0; i < 6 && await page.$('.talk'); i++) { await page.click('.talk-foot .btn'); await page.waitForTimeout(200); }
    await page.waitForSelector('.mission');
    await shot('s-mission');
    for (let i = 0; i < 3; i++) {
      const ans = await page.evaluate(() => MF.Questions.answerText(MF.Game.Quiz.currentQuestion(MF.UI.state)));
      for (const ch of ans) await page.click('.keypad .key >> text="' + (ch === '-' ? '−' : ch) + '"');
      await page.click('.keypad .key-ok');
      await page.waitForTimeout(1500);
    }
    await page.waitForSelector('.talk', { timeout: 6000 });
    await shot('s-mission2');
    const id = await page.evaluate(() => MF.Story.current(MF.UI.state).id);
    if (id !== 'miner') throw new Error('mission not advanced: ' + id);
  } catch (e) { errors.push(e.message); }
  await browser.close();
  console.log((errors.length ? '✗ story\n  ' + errors.join('\n  ') : '✓ story'));
  process.exit(errors.length ? 1 : 0);
})();
