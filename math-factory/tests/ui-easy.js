// ぬるま湯モード（算数だけ）の点検：設定画面のスイッチ → 問題画面
//   node tests/ui-easy.js [スクショの保存先]
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = process.argv[2];

(async () => {
  const browser = await chromium.launch();
  const fails = [], errors = [];
  for (const [label, opts] of [['PC', { viewport: { width: 1280, height: 820 } }], ['スマホ', { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }]]) {
    const page = await (await browser.newContext(opts)).newPage();
    page.on('pageerror', (e) => errors.push(label + ': ' + e.message));
    const ok = (c, m) => { if (!c) fails.push(label + '：' + m); };
    const calm = () => page.evaluate(() => { MF.StoryUI.quiet = true; while (MF.UI.modalStack.length) MF.UI.closeTopModal(); });
    await page.goto(URL); await page.waitForTimeout(800); await calm();
    await page.evaluate(() => { MF.UI.state.stats.answered = 30; MF.UI.go('quiz'); });
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => MF.Game.Quiz.currentQuestion(MF.UI.state).text);
    // 設定画面でスイッチを入れる
    await page.evaluate(() => MF.UI.go('settings'));
    await page.waitForTimeout(300); await calm();
    const row = page.locator('label.set-row', { hasText: 'ぬるま湯モード' });
    ok(await row.count() === 1, '設定にぬるま湯モードがない');
    const desc = await row.innerText();
    ok(/繊細なあなた/.test(desc), '説明文が出ていない');
    if (OUT) { await row.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(OUT, 'easy-settings-' + (label === 'PC' ? 'pc' : 'sp') + '.png') }); }
    await row.locator('input').check();
    ok(await page.evaluate(() => MF.UI.state.settings.easyMode === true), 'スイッチを入れても設定が変わらない');
    // 問題画面：いまの問題はそのまま、予告とバッジが出る
    await page.evaluate(() => MF.UI.go('quiz'));
    await page.waitForTimeout(500); await calm();
    ok(await page.evaluate(() => MF.Game.Quiz.currentQuestion(MF.UI.state).text) === before, 'スイッチを入れたら、いまの問題が変わった');
    ok(/算数/.test(await page.locator('.next-note').innerText().catch(() => '')), '「次の問題から算数」の予告が出ない');
    ok(await page.locator('.easy-badge').count() === 1, '問題画面に「ぬるま湯モード中」が出ない');
    // いまの問題に答えて次へ → 算数
    const ans = await page.evaluate(() => MF.Questions.answerText(MF.Game.Quiz.currentQuestion(MF.UI.state)));
    await page.evaluate((a) => { const s = MF.UI.state; MF.Game.Quiz.answer(s, a, Date.now()); MF.UI.rerender(); }, ans);
    await page.waitForTimeout(300);
    await page.locator('#screen .qpanel button:has-text("次の問題")').click().catch(() => {});
    await page.waitForTimeout(500); await calm();
    const now = await page.evaluate(() => ({ easy: !!MF.UI.state.quiz.current.easy, head: (document.querySelector('#screen .q-topic') || {}).textContent || '' }));
    ok(now.easy, '次の問題が算数になっていない');
    ok(/算数/.test(now.head), '問題の見出しが「算数」になっていない：' + now.head);
    ok(!(await page.$('.next-note')), '算数になったのに予告が残っている');
    if (OUT) await page.screenshot({ path: path.join(OUT, 'easy-quiz-' + (label === 'PC' ? 'pc' : 'sp') + '.png') });
    // 画面から答えて正解できる
    const a2 = await page.evaluate(() => MF.Questions.answerText(MF.Game.Quiz.currentQuestion(MF.UI.state)));
    const keypad = await page.$('#screen .keypad');
    if (keypad) { for (const ch of a2) await page.click('#screen .keypad .key >> text="' + ch + '"'); await page.click('#screen .keypad .key-ok'); }
    else { await page.fill('#screen .q-input', a2); await page.press('#screen .q-input', 'Enter'); }
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => MF.UI.state.quiz.current.done && MF.UI.state.quiz.current.firstOk === true), '算数の問題に正解できない');
    await page.close();
  }
  await browser.close();
  const all = fails.concat(errors.map((e) => 'エラー ' + e));
  console.log((all.length ? '✗ ' : '✓ ') + 'ぬるま湯モード' + (all.length ? '\n  ' + all.join('\n  ') : ''));
  process.exit(all.length ? 1 : 0);
})();
