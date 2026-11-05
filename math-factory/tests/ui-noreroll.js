// 問題の引き直し・途中で抜けたときの点検（画面を実際に操作する）
//   node tests/ui-noreroll.js
// - 難易度・分野のボタンを押しても、いま出ている問題は変わらない（次の問題から切りかわる）
// - 研究の「解く」・模試の出入りでも問題を引き直せない
// - バトルのカード問題の途中でページを読み直しても、同じ問題の続きからバトルが進む
// - Escキーでカード問題の小窓が閉じない
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage();
  const errors = [], fails = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };
  const calm = () => page.evaluate(() => { MF.StoryUI.quiet = true; while (MF.UI.modalStack.length) MF.UI.closeTopModal(); });
  const tap = async (sel) => { await calm(); await page.click(sel, { timeout: 5000 }); };
  const qtext = () => page.evaluate(() => { const el = document.querySelector('#screen .qpanel .q-text') || document.querySelector('#screen .qpanel'); return el ? el.innerText.slice(0, 200) : ''; });

  await page.goto(URL); await page.waitForTimeout(800); await calm();
  await page.evaluate(() => { const s = MF.UI.state; s.research.done.push('automation', 'military'); s.stats.answered = 30; MF.UI.go('quiz'); });
  await page.waitForTimeout(300);

  // 1)(2) 難易度ボタン・分野タブをいろいろ押しても、いま出ている問題は変わらない（次の問題から）
  const t0 = await qtext();
  ok(t0, '問題が表示されていない');
  const chips = await page.$$eval('.tchip', (els) => els.map((e) => e.textContent));
  const labels = ['自動', '易', '普', '難'];
  for (let k = 0; k < 2; k++) {
    for (const l of labels) {
      await tap('.seg-btn >> text="' + l + '"');
      ok(await qtext() === t0, '難易度「' + l + '」を押したら問題が変わった');
    }
    for (const c of chips) {
      await tap('.tchip >> text="' + c + '"');
      ok(await qtext() === t0, '分野「' + c + '」を押したら問題が変わった');
    }
  }
  // 次の問題から切りかわる予告が出て、答えたら新しい設定の問題になる
  const want = chips.find((c) => !/おまかせ/.test(c));
  await tap('.tchip >> text="' + want + '"');
  await tap('.seg-btn >> text="難"');
  await page.waitForTimeout(400);
  const note = await page.evaluate(() => { const n = document.querySelector('.next-note'); return n ? n.textContent : ''; });
  const curTopic = await page.evaluate(() => MF.Questions.TOPICS[MF.UI.state.quiz.current.topic].name);
  if (curTopic !== want) ok(note.indexOf(want) >= 0, '次の問題の予告が出ない：' + note);
  await page.evaluate(() => { const s = MF.UI.state; MF.Game.Quiz.skip(s, Date.now()); MF.UI.rerender(); });
  await page.waitForTimeout(300);
  const nowQ = await page.evaluate(() => { const c = MF.UI.state.quiz.current; return { t: MF.Questions.TOPICS[c.topic].name, lv: c.level, done: c.done }; });
  ok(nowQ.t === want && nowQ.lv === 2 && !nowQ.done, '答えたあとの問題が新しい設定になっていない ' + JSON.stringify(nowQ));
  ok(!(await page.$('.next-note')), '新しい問題になったのに予告が残っている');
  // 3) 研究の「解く」→ 問題画面
  const before = await page.evaluate(() => MF.UI.state.quiz.current.seed);
  await page.evaluate(() => { const s = MF.UI.state; s.quiz.topic = 'quad'; s.rp += 100; s.research.current = null; MF.Research.start(s, 'smelting2'); MF.UI.go('research'); });
  await page.waitForTimeout(200);
  const solveBtn = await page.$('#screen button:has-text("解く")');
  if (solveBtn) { await calm(); await solveBtn.click(); await page.waitForTimeout(200); ok(await page.evaluate(() => MF.UI.state.quiz.current.seed) === before, '研究の「解く」で問題が引き直された'); }
  else fails.push('研究の「解く」ボタンが見つからない');
  // 4) 模試を始めてすぐやめても、もとの問題にもどる
  await page.evaluate(() => MF.UI.go('quiz'));
  await page.waitForTimeout(200);
  const t4 = await qtext();
  ok(t4, '問題が表示されていない');
  await page.evaluate(() => { MF.Study.examCreate(MF.UI.state, Date.now(), 'short'); MF.StudyUI.runExam(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { MF.UI.state.study.exam = null; MF.QuizUI.endSession(); });
  await page.evaluate(() => MF.UI.go('quiz'));
  await page.waitForTimeout(300);
  ok(await qtext() === t4, '模試に入って出たら問題が変わった');

  // 5) バトル：カード問題中に読み直し → 同じ問題が出て、答えるとバトルが進む
  await calm();
  await page.evaluate(() => { const s = MF.UI.state; s.battle.raid.pending = { at: Date.now(), deadline: Date.now() + 60000, plan: MF.Battle.raidEnemies(s) }; MF.Battle.startRaid(s, Date.now()); MF.UI.go('battle'); });
  await page.waitForTimeout(400); await calm(); // 開いた小窓（予告など）を閉じると、カード問題も閉じる → 続きが出るはず
  await page.evaluate(() => MF.UI.go('battle'));
  await page.waitForTimeout(300);
  const hasPending0 = await page.evaluate(() => !!MF.UI.state.battle.active.pending);
  if (!hasPending0) { await page.click('.hand .card-el >> nth=0'); await page.waitForTimeout(300); }
  const seed1 = await page.evaluate(() => (MF.UI.state.battle.active.pending || {}).q && MF.UI.state.battle.active.pending.q.seed);
  ok(!!seed1, 'カードを出しても問題が出ない');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok(await page.$('.modal .qpanel'), 'Escキーでカード問題の小窓が閉じてしまった');
  await page.evaluate(() => MF.App.save());
  await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => { MF.StoryUI.quiet = true; MF.UI.go('battle'); });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ modal: !!document.querySelector('.modal .qpanel'), seed: MF.UI.state.quiz.current && MF.UI.state.quiz.current.seed }));
  ok(after.modal, '読み直したあと、カード問題の続きが出ない');
  ok(after.seed === seed1, '読み直したらカード問題が変わった');
  const ans = await page.evaluate(() => MF.Questions.answerText(MF.Game.Quiz.currentQuestion(MF.UI.state)));
  await page.fill('.modal .q-input', ans).catch(() => {});
  await page.press('.modal .q-input', 'Enter').catch(() => {});
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => { const bt = MF.UI.state.battle.active; return bt ? { pending: !!bt.pending, played: bt.played } : { pending: false, played: 1 }; });
  ok(!st.pending && st.played >= 1, 'カード問題に答えてもバトルが進まない ' + JSON.stringify(st));
  // 6) 答えたあと「つづける」の前に読み直しても、結果が反映される
  await calm();
  const can = await page.evaluate(() => { const bt = MF.UI.state.battle.active; return !!(bt && !bt.over && bt.hand.some((c) => MF.Battle.cost(MF.UI.state, bt, c) <= bt.player.energy)); });
  if (can) {
    await page.evaluate(() => MF.UI.go('battle'));
    await page.waitForTimeout(300);
    const idx = await page.evaluate(() => { const s = MF.UI.state, bt = s.battle.active; return bt.hand.findIndex((c) => MF.Battle.cost(s, bt, c) <= bt.player.energy); });
    await page.click('.hand .card-el >> nth=' + idx);
    await page.waitForTimeout(300);
    const played0 = await page.evaluate(() => MF.UI.state.battle.active.played);
    await page.evaluate(() => { const s = MF.UI.state; MF.Game.Quiz.answer(s, MF.Questions.answerText(MF.Game.Quiz.currentQuestion(s)), Date.now()); MF.App.save(); });
    await page.reload(); await page.waitForTimeout(1200);
    await page.evaluate(() => { MF.StoryUI.quiet = true; MF.UI.go('battle'); });
    await page.waitForTimeout(500);
    const st2 = await page.evaluate(() => { const bt = MF.UI.state.battle.active; return bt ? { pending: !!bt.pending, played: bt.played, modal: !!document.querySelector('.modal .qpanel') } : null; });
    ok(!st2 || (!st2.pending && st2.played === played0 + 1 && !st2.modal), '答えたあとで読み直したら結果が反映されない ' + JSON.stringify(st2));
  }

  await browser.close();
  const all = fails.concat(errors.map((e) => 'エラー: ' + e));
  console.log((all.length ? '✗ ' : '✓ ') + '引き直し・途中で抜けたときの点検' + (all.length ? '\n  ' + all.join('\n  ') : ''));
  process.exit(all.length ? 1 : 0);
})();
