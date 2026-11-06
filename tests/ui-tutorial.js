// チュートリアルの点検：はじめて遊ぶ人（「ていねい」を選ぶ）として、光らせて指す案内に従って進める
//   node tests/ui-tutorial.js [スクショの保存先]
// - 起動画面 → 経験値の申告 → オープニング → 第1章 → ナビの会話 → 計算ラボの案内
// - 案内の枠が、指している部品をちゃんと囲んでいるか
// - 3問正解 → 次のミッションの案内に従って「建てる」→「採掘機」→ 鉱脈をタップ で採掘機が建つ
// - はじめての画面（研究）で案内が自動で出る／「？」で船内マニュアルが開く
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = process.argv[2] || null;

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errors = [], fails = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ok = (c, m) => { if (!c) fails.push(m); };
  const shot = async (n) => { if (OUT) await page.screenshot({ path: path.join(OUT, 'tut-' + n + '.png') }); };
  const wait = (ms) => page.waitForTimeout(ms);
  const talkThrough = async () => { for (let i = 0; i < 12 && await page.$('.talk-foot .btn'); i++) { await page.click('.talk-foot .btn'); await wait(200); } };
  /** 案内の枠が、いま指している部品を囲んでいるか */
  const frameOk = () => page.evaluate(() => {
    const f = document.querySelector('.tut-frame');
    if (!f || f.style.display === 'none') return 'none';
    const fr = f.getBoundingClientRect();
    const cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
    const e = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), Math.min(innerHeight - 1, Math.max(0, cy)));
    return e && !e.closest('.tut') ? 'ok' : 'covered:' + (e ? e.className : 'null') + ' frame=' + Math.round(fr.left) + ',' + Math.round(fr.top) + ',' + Math.round(fr.width) + 'x' + Math.round(fr.height) + ' text=' + document.querySelector('.tut-text').textContent.slice(0, 20);
  });
  /** 案内を最後まで「次へ」で進める（押す手順・やってみる手順が来たら止まる） */
  const advance = async (label) => {
    for (let k = 0; k < 30; k++) {
      if (!(await page.$('.tut'))) return 'closed';
      await wait(250);
      const f = await frameOk();
      if (f.startsWith('covered')) { fails.push(label + '：案内の枠の中が押せない（' + k + '手目）' + f); await shot('covered-' + k); }
      const nextVisible = await page.evaluate(() => { const b = document.querySelector('.tut-btns .btn.primary'); return !!(b && b.style.display !== 'none'); });
      if (!nextVisible) return 'waiting';
      await page.click('.tut-btns .btn.primary');
    }
    return 'stuck';
  };
  /** いま光っている所の真ん中を押す */
  const tapFrame = async () => { const r = await page.evaluate(() => { const b = document.querySelector('.tut-frame').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await page.touchscreen.tap(r.x, r.y); await wait(400); };
  const cellPos = (x, y) => page.evaluate(([x, y]) => { const F = MF.FactoryUI, r = F.canvas.getBoundingClientRect(), cs = F.cs * F.zoom; return { x: r.left + F.ox + (x + 0.5) * cs, y: r.top + F.oy + (y + 0.5) * cs }; }, [x, y]);

  try {
    await page.goto(URL);
    await page.waitForSelector('.boot', { timeout: 5000 }); await page.click('.boot'); await wait(150); await page.click('.boot', { timeout: 1500 }).catch(() => {});
    await page.waitForSelector('.tut-ask', { timeout: 5000 });
    await shot('1-ask');
    await page.click('text=はじめて遊ぶ（ていねい）');
    ok(await page.evaluate(() => MF.UI.state.settings.tutorial === 'full'), '「はじめて遊ぶ」を選んでも、ていねいモードにならない');
    await page.waitForSelector('.opening', { timeout: 5000 }); await wait(2600);
    await page.click('text=目を覚ます');
    await page.waitForSelector('.chapter-card'); await page.click('text=はじめる');
    await page.waitForSelector('.talk'); await talkThrough();
    // 計算ラボの案内（画面のガイド＋ミッションのガイド）
    await page.waitForSelector('.tut', { timeout: 4000 });
    await shot('2-quiz-tour');
    const r1 = await advance('計算ラボの案内');
    ok(r1 === 'closed', '計算ラボの案内が最後まで進まない：' + r1);
    // 3問正解
    for (let i = 0; i < 3; i++) {
      if (await page.evaluate(() => MF.UI.state.quiz.current.done)) await page.tap('#screen .q-actions .btn.primary');
      await page.waitForFunction(() => !MF.UI.state.quiz.current.done, null, { timeout: 5000 });
      const ans = await page.evaluate(() => MF.Questions.answerText(MF.Game.Quiz.currentQuestion(MF.UI.state)));
      for (const ch of ans) await page.tap('.keypad .key >> text="' + (ch === '-' ? '−' : ch) + '"');
      await page.tap('.keypad .key-ok');
      await wait(400);
    }
    // 次のミッション（採掘機）：会話 → 工場の案内 → 「建てる」→「採掘機」→ 鉱脈をタップ
    await page.waitForSelector('.talk', { timeout: 8000 }); await talkThrough();
    await page.waitForSelector('.tut', { timeout: 4000 });
    let r2 = await advance('工場の案内');
    ok(r2 === 'waiting', '「建てる」を押す手順で止まらない：' + r2);
    await shot('3-build');
    await tapFrame(); // 建てる
    r2 = await advance('採掘機えらび');
    await tapFrame(); // 採掘機
    ok(await page.evaluate(() => MF.FactoryUI.tool === 'build' && MF.FactoryUI.type === 'miner'), '案内どおりに押しても、採掘機を選んだ状態にならない');
    r2 = await advance('鉱脈をタップ');
    await shot('4-tap-ore');
    const t = await page.evaluate(() => {
      const s = MF.UI.state, f = s.factory, core = Object.values(f.b).find((b) => b.type === 'core');
      let best = null;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const o = f.ore[y * f.w + x]; if (!o || !MF.Factory.canPlace(s, 'miner', x, y).ok) continue; const d = Math.abs(x - core.x) + Math.abs(y - core.y); if (!best || d < best.d) best = { x, y, d }; }
      return best;
    });
    const p = await cellPos(t.x, t.y);
    await page.touchscreen.tap(p.x, p.y);
    await wait(900);
    ok(await page.evaluate(() => MF.Factory.count(MF.UI.state, 'miner') === 1), '案内どおりに鉱脈をタップしても採掘機が建たない');
    const r3 = await advance('採掘機のあと');
    ok(r3 === 'closed', '採掘機のあとの案内が閉じない：' + r3);
    // 次のミッション（ベルト）：会話のあとに案内が自動で出る → 「ガイドを閉じる」
    await page.waitForSelector('.talk', { timeout: 8000 }); await talkThrough();
    await page.waitForSelector('.tut', { timeout: 4000 }).catch(() => fails.push('ベルトのミッションで案内が自動で出ない'));
    ok(await page.evaluate(() => MF.UI.current === 'factory'), 'ベルトの案内で工場が開かない');
    await page.click('.tut-btns .btn.ghost'); await wait(300);
    // はじめての画面：研究 → 案内が自動で出る
    await page.evaluate(() => MF.UI.go('research'));
    await page.waitForSelector('.tut', { timeout: 5000 }).catch(() => fails.push('はじめての研究画面で案内が出ない'));
    await shot('5-research-tour');
    await page.click('.tut-btns .btn.ghost').catch(() => {}); // ガイドを閉じる
    await wait(300);
    ok(!(await page.$('.tut')), '「ガイドを閉じる」で案内が閉じない');
    ok(await page.evaluate(() => MF.Tutorial.seen(MF.UI.state, 'screen:research')), '閉じた案内が「見た」になっていない（毎回出てしまう）');
    // 「？」で船内マニュアル（いまの画面の章）
    await page.tap('.help-chip');
    await wait(400);
    ok(await page.evaluate(() => MF.UI.current === 'manual' && !!document.querySelector('#man-research.manual-hit')), '「？」で研究の章が開かない');
    await shot('6-manual');
    // マニュアルの「ガイドを見る」でもう一度
    await page.click('#man-factory .btn.primary');
    await page.waitForSelector('.tut', { timeout: 4000 }).catch(() => fails.push('マニュアルの「ガイドを見る」で案内が出ない'));
    ok(await page.evaluate(() => MF.UI.current === 'factory'), 'マニュアルの「ガイドを見る」で工場が開かない');
    await page.keyboard.press('Escape'); await wait(300);
    ok(!(await page.$('.tut')), 'Escキーで案内が閉じない');
  } catch (e) { fails.push('テストが止まった：' + e.message.split('\n')[0]); await shot('error'); }
  await browser.close();
  const all = fails.concat(errors.map((e) => 'エラー：' + e));
  console.log((all.length ? '✗ ' : '✓ ') + 'チュートリアル（ていねい）' + (all.length ? '\n  ' + all.join('\n  ') : ''));
  process.exit(all.length ? 1 : 0);
})();
