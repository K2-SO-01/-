// 画面のスモークテスト（Playwright）：node tests/ui-smoke.js [スクショ保存先]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || null;
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

async function run(label, ctxOpts, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForSelector('.qpanel');
  try { await fn(page); } catch (e) { errors.push('test: ' + e.message); }
  await browser.close();
  console.log((errors.length ? '✗ ' : '✓ ') + label + (errors.length ? '\n  ' + errors.join('\n  ') : ''));
  return errors.length;
}
async function answerCurrent(page, correct) {
  const ans = await page.evaluate((ok) => {
    const q = MF.Game.Quiz.currentQuestion(MF.UI.state);
    return ok ? MF.Questions.answerText(q) : MF.Util.fstr(MF.Util.fadd(q.answer, 1));
  }, correct);
  const keypad = await page.$('.keypad');
  if (keypad) {
    for (const ch of ans) {
      const label = ch === '-' ? '−' : ch;
      await page.click('.keypad .key >> text="' + label + '"');
    }
    await page.click('.keypad .key-ok');
  } else {
    await page.fill('.q-input', ans);
    await page.press('.q-input', 'Enter');
  }
  await page.waitForTimeout(150);
}
async function shot(page, name) { if (OUT) await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); }
global.__steps = global.__steps || [];
const extra = require('./ui-steps.js');

(async () => {
  let fails = 0;
  fails += await run('desktop', { viewport: { width: 1280, height: 800 } }, async (page) => {
    await answerCurrent(page, true);
    const ok = await page.$('.qpanel.ok');
    if (!ok) throw new Error('correct answer not shown');
    await shot(page, 'd-quiz-correct');
    await page.click('text=次の問題 ▶');
    await answerCurrent(page, false);
    if (!(await page.$('.hint'))) throw new Error('hint not shown after wrong');
    await shot(page, 'd-quiz-wrong');
    for (const fn of extra.desktop) await fn(page, { shot, answerCurrent });
  });
  fails += await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, async (page) => {
    await answerCurrent(page, true);
    await shot(page, 'm-quiz');
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    if (w > 392) throw new Error('horizontal overflow ' + w);
    for (const fn of extra.mobile) await fn(page, { shot, answerCurrent });
  });
  process.exit(fails ? 1 : 0);
})();
