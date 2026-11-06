// ランダム操作のテスト：見えているボタン・タブ・マップ・答えの入力を、でたらめに何百回も押す。
// エラーが出ないか、画面に NaN / undefined などが出ないか、表示とデータがずれないかを見る。
//   node tests/ui-monkey.js [回数] [シード]
const { chromium } = require('playwright');
const path = require('path');
const STEPS = +(process.argv[2] || 350);
const SEED = +(process.argv[3] || 7);
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
// 進み具合を消してしまうボタンは押さない
const SKIP = /リセット|旅に出す|読み込む|撤退する|宣戦布告/;

(async () => {
  const browser = await chromium.launch();
  let fails = 0;
  for (const [label, opts] of [['PC', { viewport: { width: 1280, height: 820 } }], ['スマホ', { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }]]) {
    const page = await (await browser.newContext(opts)).newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push('エラー: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') problems.push('コンソール: ' + m.text()); });
    let x = SEED * 9301 + (label === 'PC' ? 1 : 2);
    const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    await page.goto(URL);
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      MF.StoryUI.quiet = true;
      while (MF.UI.modalStack.length) MF.UI.closeTopModal();
      const s = MF.UI.state;
      Object.assign(s.inv, { iron: 250, copper: 200, coal: 200, stone: 250, ironPlate: 120, copperPlate: 100, brick: 60, gear: 40, circuit: 30 });
      s.rp = 400; s.battle.forceRaids = true; s.battle.hpBonus = 200;
      s.research.done.push('automation', 'logistics', 'labs', 'blueprint', 'military');
    });
    for (let i = 0; i < STEPS; i++) {
      try {
        const r = rnd();
        const hasQ = await page.$('.modal .qpanel:not(.done) .q-input, #screen .qpanel:not(.done) .q-input');
        if (hasQ && r < 0.4) {
          const ok = rnd() < 0.7;
          const ans = await page.evaluate((ok) => { const q = MF.Game.Quiz.currentQuestion(MF.UI.state); return q ? (ok ? MF.Questions.answerText(q) : '12345') : '1'; }, ok);
          const inModal = await page.$('.modal .qpanel .q-input');
          const sel = inModal ? '.modal .q-input' : '#screen .q-input';
          const keypad = await page.$((inModal ? '.modal' : '#screen') + ' .keypad');
          if (keypad) { for (const ch of ans) await page.click((inModal ? '.modal' : '#screen') + ' .keypad .key >> text="' + (ch === '-' ? '−' : ch) + '"', { timeout: 2000 }).catch(() => {}); await page.click((inModal ? '.modal' : '#screen') + ' .keypad .key-ok', { timeout: 2000 }).catch(() => {}); }
          else { await page.fill(sel, ans, { timeout: 2000 }).catch(() => {}); await page.press(sel, 'Enter', { timeout: 2000 }).catch(() => {}); }
        } else if (r < 0.9) {
          const picked = await page.evaluate(([rv, skip]) => {
            document.querySelectorAll('[data-monkey]').forEach((e) => e.removeAttribute('data-monkey'));
            const re = new RegExp(skip);
            const els = Array.from(document.querySelectorAll('.modal button:not([disabled]), .modal .card-el, #nav .nav-btn, #screen button:not([disabled]), #top-extras button'))
              .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && !re.test(e.textContent || ''); });
            // 小窓が開いているときは小窓の中だけ
            const modal = els.filter((e) => e.closest('.modal'));
            const pool = modal.length ? modal : els;
            if (!pool.length) return false;
            pool[Math.floor(rv * pool.length)].setAttribute('data-monkey', '1');
            return true;
          }, [rnd(), SKIP.source]);
          if (picked) await page.click('[data-monkey="1"]', { timeout: 1500 }).catch(() => {});
        } else if (r < 0.97) {
          const cv = await page.$('.fac-canvas');
          if (cv) { const b = await cv.boundingBox(); if (b) await page.mouse.click(b.x + rnd() * b.width, b.y + rnd() * b.height).catch(() => {}); }
        } else await page.keyboard.press('Escape');
        await page.waitForTimeout(120);
        if (i % 25 === 24) {
          const bad = await page.evaluate(() => {
            const out = [], s = MF.UI.state;
            const t = document.body.innerText;
            const m = t.match(/.{0,20}(NaN|undefined|\[object Object\]|Infinity).{0,20}/);
            if (m) out.push('画面に「' + m[1] + '」：' + m[0].replace(/\n/g, ' '));
            for (const k of Object.keys(s.inv)) if (!Number.isFinite(s.inv[k]) || s.inv[k] < 0) out.push('資源がおかしい ' + k + '=' + s.inv[k]);
            if (!Number.isFinite(s.rp)) out.push('研究Pがおかしい');
            const mb = document.querySelector('.mission .ms-prog');
            const cur = MF.Story.current(s);
            if (mb && cur) { const p = MF.Story.progress(s, cur); if (mb.textContent.trim() !== p.have + ' / ' + p.need) out.push('ミッション表示がずれている ' + mb.textContent + ' / ' + p.have); }
            return out;
          });
          if (bad.length) { await page.waitForTimeout(800); const again = await page.evaluate(() => { const s = MF.UI.state, mb = document.querySelector('.mission .ms-prog'), cur = MF.Story.current(s); if (!mb || !cur) return true; const p = MF.Story.progress(s, cur); return mb.textContent.trim() === p.have + ' / ' + p.need; }); bad.filter((b) => !(again && b.startsWith('ミッション表示'))).forEach((b) => problems.push((i + 1) + '手目：' + b)); }
        }
      } catch (e) { problems.push((i + 1) + '手目でテストが止まった：' + e.message.split('\n')[0]); break; }
    }
    const uniq = Array.from(new Set(problems));
    console.log((uniq.length ? '✗ ' : '✓ ') + label + '（ランダム操作 ' + STEPS + ' 回）' + (uniq.length ? '\n  ' + uniq.slice(0, 15).join('\n  ') : ''));
    if (uniq.length) fails++;
    await page.close();
  }
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
