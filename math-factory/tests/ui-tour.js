// 画面ツアー：途中まで進んだ状態で全画面のスクショを撮り、はみ出し・エラーを点検する
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2];
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const issues = [];
  for (const [label, ctxOpts] of [['m', { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true }], ['d', { viewport: { width: 1280, height: 800 } }]]) {
    const page = await (await browser.newContext(ctxOpts)).newPage();
    page.on('pageerror', (e) => issues.push(label + ' pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') issues.push(label + ' console: ' + m.text()); });
    await page.goto(URL);
    await page.waitForFunction(() => window.MF && MF.UI && MF.UI.state && MF.StoryUI, null, { timeout: 10000 }); // ゲームの起動を待つ
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      MF.StoryUI.quiet = true; while (MF.UI.modalStack.length) MF.UI.closeTopModal();
      const s = MF.UI.state;
      // 中盤くらいの状態をつくる
      Object.assign(s.inv, { iron: 180, copper: 150, coal: 120, stone: 160, ironPlate: 90, copperPlate: 80, brick: 40, gear: 30, circuit: 20, uranium: 20, silicon: 30, oil: 25 });
      s.rp = 300;
      s.research.done.push('automation', 'logistics', 'labs', 'blueprint', 'upgrade1', 'military');
      for (let i = 0; i < 40; i++) { MF.Game.Quiz.next(s, Date.now()); MF.Game.Quiz.answer(s, i % 4 ? MF.Questions.answerText(MF.Game.Quiz.currentQuestion(s)) : '999', Date.now()); while (!s.quiz.current.done) MF.Game.Quiz.revealHint(s, Date.now()); }
      for (const t of ['quad', 'vec', 'trig']) { const e = MF.Pals.addEgg(s, t, Date.now()); e.prog = e.need; MF.Pals.hatch(s, e.id, Date.now()); }
      s.story.idx = MF.Story.MISSIONS.findIndex((m) => m.id === 'labs');
      MF.UI.go('quiz');
    });
    const screens = ['quiz', 'factory', 'research', 'pals', 'defense', 'study', 'awards', 'galaxy', 'story', 'settings', 'menu'];
    for (const id of screens) {
      await page.evaluate((id) => MF.UI.go(id), id);
      await page.waitForTimeout(350);
      for (let g = 0; g < 8 && await page.$('.modal'); g++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
      // Escで閉じない小窓（問題など）は直接閉じる
      await page.evaluate(() => { while (MF.UI.modalStack.length) MF.UI.closeTopModal(); });
      const over = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const bad = [];
        document.querySelectorAll('#screen *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > W + 1 && !el.closest('.topic-chips,.tabs,.palette,.hand,.res-strip,.chip-wrap,.fac-canvas-wrap,.table-wrap,table,.login-row')) bad.push((el.className || el.tagName) + ':' + Math.round(r.right)); });
        return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) };
      });
      if (over.sw > over.W + 1 || over.bad.length) issues.push(label + ' ' + id + ' overflow sw=' + over.sw + ' W=' + over.W + ' ' + over.bad.join(' '));
      await page.screenshot({ path: path.join(OUT, 'tour-' + label + '-' + id + '.png'), fullPage: label === 'm' });
    }
    // 受験の各タブ
    for (const tab of ['模試', '統計', '週間レポート', 'カウントダウン']) { await page.evaluate(() => MF.UI.go('study')); await page.click('.tab:has-text("' + tab + '")'); await page.waitForTimeout(200); await page.screenshot({ path: path.join(OUT, 'tour-' + label + '-study-' + tab + '.png'), fullPage: label === 'm' }); }
  }
  await browser.close();
  console.log(issues.length ? issues.join('\n') : 'no issues');
})();
