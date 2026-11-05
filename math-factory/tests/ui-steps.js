// 各ステップで増える画面のチェック
async function nav(page, label) {
  const direct = await page.$('#nav .nav-btn:has-text("' + label + '")');
  if (direct && await direct.isVisible()) { await direct.click(); }
  else { await page.click('#nav .nav-more'); await page.click('.menu-tile:has-text("' + label + '")'); }
  await page.waitForTimeout(100);
}
module.exports = {
  nav,
  desktop: [
    async (page, t) => {
      await nav(page, '工場');
      await page.waitForSelector('.screen-factory');
      await t.shot(page, 'd-factory');
    },
    async (page, t) => {
      // ステップ2：セーブ→再読み込みで成績が残る／弱点リスト→復習
      const before = await page.evaluate(() => { MF.App.save(); return MF.UI.state.stats.answered; });
      await page.reload();
      await page.waitForSelector('.qpanel');
      const after = await page.evaluate(() => MF.UI.state.stats.answered);
      if (after !== before) throw new Error('save/load mismatch ' + before + ' vs ' + after);
      await nav(page, '受験');
      await page.waitForSelector('.weak-item');
      await t.shot(page, 'd-weak');
      await page.click('text=🔁 復習スタート');
      await page.waitForSelector('.session-bar');
      await t.answerCurrent(page, true);
      await t.shot(page, 'd-review');
      await page.click('.session-bar >> text=終了');
      await page.waitForSelector('.modal');
      await t.shot(page, 'd-review-end');
      await page.keyboard.press('Escape');
      await nav(page, '設定');
      await page.click('text=📤 書き出し');
      const txt = await page.inputValue('.save-text');
      if (!txt.includes('"quiz"')) throw new Error('export text missing');
      await page.keyboard.press('Escape');
      await t.shot(page, 'd-settings');
    },
  ],
  mobile: [
    async (page, t) => {
      await nav(page, '工場');
      await t.shot(page, 'm-factory');
      await nav(page, '設定');
      await t.shot(page, 'm-settings');
    },
  ],
};
