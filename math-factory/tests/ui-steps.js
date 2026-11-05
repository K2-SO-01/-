// 各ステップで増える画面のチェック
module.exports = {
  desktop: [
    async (page, t) => {
      await page.click('#nav >> text=工場');
      await page.waitForSelector('.screen-factory');
      await t.shot(page, 'd-factory');
    },
  ],
  mobile: [
    async (page, t) => {
      await page.click('#nav >> text=工場');
      await t.shot(page, 'm-factory');
    },
  ],
};
