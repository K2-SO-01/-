// 進行の点検：ストーリーを最初から最後まで、画面の操作で進める。
// 1手ごとに「画面に出ている数字」と「ゲームの中のデータ」が合っているか、ミッションがちゃんと進むかを確かめる。
//   node tests/ui-progress.js [スクショ保存先]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || null;
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('エラー: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('コンソール: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (n) => { if (OUT) await page.screenshot({ path: path.join(OUT, 'pg-' + n + '.png') }); };
  const wait = (ms) => page.waitForTimeout(ms);
  const closeModals = async () => { for (let i = 0; i < 20; i++) { const b = await page.$('.modal-foot .btn >> nth=-1'); if (!b) break; await b.click().catch(() => {}); await wait(250); } };
  const mission = () => ev(() => (MF.Story.current(MF.UI.state) || { id: 'END' }).id);
  /** ゲームの関数で設備を置く（置けなかったら問題として記録） */
  const place = async (type, x, y, dir, label) => { const r = await ev(([type, x, y, dir]) => { const s = MF.UI.state; const r = MF.Factory.place(s, type, x, y, dir); return r.ok ? null : r.reason + ' @' + x + ',' + y + ' ' + (MF.Factory.at(s, x, y) || {}).type; }, [type, x, y, dir]); if (r) problems.push((label || type) + 'が置けない：' + r); };
  const ff = (sec) => ev((sec) => { const s = MF.UI.state; for (let t = 0; t < sec; t += 5) MF.Game.tick(s, 5, Date.now()); }, sec);

  /** 画面とデータの食いちがいを探す */
  async function check(label) {
    await wait(700);
    let bad = await snapshot();
    if (bad.length) { await wait(700); bad = await snapshot(); } // 一瞬の差は見のがす（0.7秒後も残るものだけ）
    bad.forEach((b) => problems.push(label + '：' + b));
    return bad;
  }
  function snapshot() {
    return ev(() => {
      const s = MF.UI.state, U = MF.Util, out = [];
      const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
      const m = MF.Story.current(s);
      const banner = txt('.mission .ms-prog');
      if (m && banner !== null) { const p = MF.Story.progress(s, m); if (banner !== p.have + ' / ' + p.need) out.push('ミッション表示 ' + banner + ' ≠ ' + p.have + ' / ' + p.need + '（' + m.id + '）'); }
      if (m && banner !== null && document.querySelector('.mission b').textContent.indexOf(m.title) < 0) out.push('ミッション名が古い：' + document.querySelector('.mission b').textContent);
      const goal = txt('.goal-strip .bar-lbl');
      if (goal !== null) { const want = MF.Meta.todayCount(s, Date.now()) + ' / ' + s.meta.dailyGoal; if (goal !== want) out.push('今日の目標 ' + goal + ' ≠ ' + want); }
      const rb = txt('.mini-banner:not(.planet)');
      if (rb !== null && s.research.current) { const t = MF.Research.byId[s.research.current], p = s.research.prog[t.id] || {}; for (const k of Object.keys(t.req)) { const v = MF.Questions.TOPICS[k].name + ' ' + Math.min(t.req[k], p[k] || 0) + '/' + t.req[k]; if (rb.indexOf(v) < 0) out.push('研究の表示が古い：' + rb + '（' + v + '）'); } }
      if (rb !== null && !s.research.current) out.push('研究が終わったのに研究中の表示が残っている');
      document.querySelectorAll('#res-strip .item-chip').forEach((c) => { const id = c.dataset.id; const v = U.fmtNum(id === 'rp' ? s.rp : (s.inv[id] || 0)); const shown = c.querySelector('.amt').textContent; if (shown !== v) out.push('資源 ' + id + ' ' + shown + ' ≠ ' + v); });
      MF.UI.order.forEach((id) => { const d = MF.UI.screens[id]; if (d.nav !== 'main' || !d.badge) return; const want = d.badge(s) || ''; const btn = Array.from(document.querySelectorAll('#nav .nav-btn')).find((b) => b.getAttribute('aria-label') === d.title); if (!btn) return; const got = (btn.querySelector('.nav-badge') || { textContent: '' }).textContent; if (got !== want) out.push('バッジ ' + id + ' 「' + got + '」≠「' + want + '」'); });
      return out;
    });
  }
  async function answer(ok, opts) {
    opts = opts || {};
    const ans = await ev((ok) => { const q = MF.Game.Quiz.currentQuestion(MF.UI.state); return ok ? MF.Questions.answerText(q) : MF.Util.fstr(MF.Util.fadd(q.answer, 1)); }, ok);
    const sel = opts.modal ? '.modal .q-input' : '#screen .q-input';
    await page.fill(sel, ans);
    await page.press(sel, 'Enter');
    await wait(opts.fast ? 200 : 350);
  }
  async function nextQ() { const b = await page.$('#screen .q-actions >> text=次の問題 ▶'); if (b) await b.click().catch(() => {}); await wait(150); }
  async function solve(n, label) { for (let i = 0; i < n; i++) { await answer(true); await nextQ(); } if (label) await check(label); }
  async function expectMission(id, label) {
    await wait(1200);
    const m = await mission();
    if (m !== id) problems.push(label + '：ミッションが「' + id + '」に進まない（いま「' + m + '」 ' + JSON.stringify(await ev(() => ({ prog: MF.Story.progress(MF.UI.state), pals: MF.UI.state.pals.list.map((p) => p.at), modal: MF.UI.modalStack.length }))) + '）');
  }
  async function go(id) { await ev((id) => MF.UI.go(id), id); await wait(300); }

  try {
    await page.goto(URL);
    await wait(1200);
    await ev(() => { MF.StoryUI.quiet = true; while (MF.UI.modalStack.length) MF.UI.closeTopModal(); });
    // EASY=1 node tests/ui-progress.js で、ぬるま湯モード（算数だけ）でも最後まで進めるか点検
    if (process.env.EASY) await ev(() => { const s = MF.UI.state; s.settings.easyMode = true; s.quiz.current = null; MF.UI.rerender(); });
    await check('はじめ');

    // ① 3問正解：1問目はまちがえてから正解（やり直しの正解も数える）
    await answer(false); await answer(true); await nextQ();
    await check('1問目（やり直しで正解）');
    await solve(2, '3問正解したあと');
    await expectMission('miner', '①');

    // ② 採掘機 ③ ベルト（ゲームの関数で置き、時間を進める）
    await ev(() => {
      const s = MF.UI.state, F = MF.Factory, f = s.factory, core = Object.values(f.b).find((b) => b.type === 'core');
      s.inv.iron += 50; s.inv.stone += 50;
      f.ore[core.y * f.w + core.x - 2] = 'iron';
      F.place(s, 'miner', core.x - 2, core.y, 1);
    });
    await go('factory'); await check('採掘機を置いた');
    await expectMission('belt', '②');
    await ev(() => { const s = MF.UI.state, F = MF.Factory, core = Object.values(s.factory.b).find((b) => b.type === 'core'); F.place(s, 'belt', core.x - 1, core.y, 1); });
    await ff(30); await check('ベルトでつないだ');
    await expectMission('power', '③');
    // ④ 発電所 ⑤ 鉄板
    await ev(() => { const s = MF.UI.state, F = MF.Factory; Object.assign(s.inv, { iron: 200, stone: 200, copper: 100, coal: 100 }); F.place(s, 'power', 0, 0, 1); });
    await check('発電所'); await expectMission('plates', '④');
    await ev(() => {
      const s = MF.UI.state, F = MF.Factory, f = s.factory, core = Object.values(f.b).find((b) => b.type === 'core');
      f.ore[(core.y + 2) * f.w + core.x - 2] = 'iron';
      F.place(s, 'miner', core.x - 2, core.y + 2, 1); F.place(s, 'furnace', core.x - 1, core.y + 2, 0); F.place(s, 'belt', core.x - 1, core.y + 1, 0);
    });
    await ff(120); await check('溶鉱炉'); await expectMission('research1', '⑤');

    // ⑥ 研究：研究画面のボタンで始めて、「解く」ボタンから問題を解く
    await ev(() => { MF.UI.state.rp = 200; });
    await go('research');
    await page.click('.tech:has-text("自動化の基礎") >> text=研究を始める');
    await wait(300);
    await page.click('.req-row >> text=解く');
    await wait(300);
    await check('研究を始めた');
    // いま出ている問題はそのまま（引き直し防止）。別の分野なら予告が出て、次の問題から研究の分野になる
    const first = await ev(() => MF.UI.state.quiz.current.topic);
    if (first !== 'quad') {
      const note = await ev(() => { const n = document.querySelector('.next-note'); return n ? n.textContent : ''; });
      if (note.indexOf('二次関数') < 0) problems.push('⑥：「次の問題から二次関数」の予告が出ない：' + note);
      await answer(true); await nextQ();
      if (await ev(() => MF.UI.state.quiz.current.topic) !== 'quad') problems.push('⑥：研究の「解く」のあと、次の問題が二次関数にならない');
    }
    for (let i = 0; i < 3; i++) { await answer(true); await nextQ(); await check('研究の問題 ' + (i + 1)); }
    const auto = await ev(() => MF.Research.has(MF.UI.state, 'automation'));
    if (!auto) problems.push('⑥：研究「自動化の基礎」が完了しない');
    await ev(() => { MF.UI.state.quiz.topic = 'auto'; });
    // ⑦ 復習：受験→弱点リスト→復習スタート
    await expectMission('review', '⑥');
    await go('study');
    await page.click('text=🔁 復習スタート');
    await wait(300);
    await answer(true);
    await wait(1500);
    if (await page.$('.session-bar')) await page.click('.session-bar >> text=終了');
    await wait(400); await closeModals();
    await check('復習した'); await expectMission('assembler', '⑦');
    // ⑧ 組立機
    await ev(() => { Object.assign(MF.UI.state.inv, { ironPlate: 100, copperPlate: 100 }); });
    await place('assembler', 2, 0, 1, '組立機');
    await check('組立機'); await expectMission('hatch', '⑧');
    // ⑨ 卵：ミッションでもらえる卵を、問題を解いてかえす
    await go('quiz');
    const eggs = await ev(() => MF.UI.state.pals.eggs.length);
    if (!eggs) problems.push('⑨：卵がもらえていない');
    await solve(5, '卵をあたためた');
    const ready = await ev(() => MF.Pals.readyEggs(MF.UI.state).length);
    if (!ready) problems.push('⑨：5問解いても卵がかえる状態にならない');
    await go('pals'); await check('相棒の画面');
    await page.click('.hatch-btn'); await wait(1600); await closeModals();
    await check('孵化した'); await expectMission('assign', '⑨');
    // ⑩ 相棒を配置：工場で設備をタップ→相棒を配置
    await go('factory');
    await ev(() => { const F = MF.FactoryUI, s = MF.UI.state; F.setTool('inspect'); const m = Object.values(s.factory.b).find((b) => b.type === 'miner'); F.sel = m.id; F.renderInfo(); });
    await page.click('text=🐾 相棒を配置'); await page.click('.pick-item >> nth=0'); await wait(300);
    await check('相棒を配置'); await expectMission('raid', '⑩');
    // ⑪ 襲撃：ミッションで群れが近づく → 問題を解く → 防衛 → 迎え撃つ → カードで戦う
    await go('quiz');
    for (let i = 0; i < 8 && !(await ev(() => !!MF.UI.state.battle.raid.pending)); i++) { await answer(true); await nextQ(); }
    await wait(500);
    if (!(await ev(() => !!MF.UI.state.battle.raid.pending))) problems.push('⑪：問題を解いても襲撃が来ない');
    await check('襲撃の警告');
    await ev(() => { MF.UI.state.battle.hpBonus = 300; });
    await go('defense');
    await page.click('text=迎え撃つ！'); await wait(400);
    for (let k = 0; k < 60; k++) {
      if (await ev(() => { const bt = MF.UI.state.battle.active; return !bt || !!bt.over; })) break;
      const i = await ev(() => { const s = MF.UI.state, bt = s.battle.active; return bt.hand.findIndex((c) => MF.Battle.cost(s, bt, c) <= bt.player.energy); });
      if (i < 0) { await page.click('text=ターン終了 ▶'); await wait(150); continue; }
      await page.click('.hand .card-el >> nth=' + i);
      await page.waitForSelector('.modal .qpanel');
      await answer(true, { modal: true });
      await wait(1200);
      const c = await page.$('.modal >> text=つづける ▶'); if (c) await c.click();
      await wait(150);
    }
    await wait(500);
    const choose = await page.$('.modal .card-choices .card-el'); if (choose) await choose.click();
    await wait(300); await closeModals();
    await check('襲撃に勝った'); await expectMission('exam', '⑪');
    // ⑫ 模試：受験→模試→ミニ模試（3問解いて終了）
    await go('study'); await page.click('.tab:has-text("模試")');
    await page.click('.node-btn:has-text("ミニ模試")'); await page.click('.modal-foot >> text=はじめる'); await wait(300);
    for (let i = 0; i < 3; i++) { await answer(i !== 1); await wait(1400); await nextQ(); }
    await check('模試の途中');
    await page.click('.session-bar >> text=終了'); await wait(500); await closeModals();
    await check('模試を終えた'); await expectMission('labs', '⑫');
    // ⑬ 研究所
    await ev(() => {
      const s = MF.UI.state, F = MF.Factory;
      s.research.done.push('labs', 'logistics');
      Object.assign(s.inv, { ironPlate: 150, copperPlate: 150, brick: 50, gear: 40, circuit: 40 });
      const lab = F.place(s, 'lab', 6, 0, 1).b; const a = F.place(s, 'assembler', 5, 0, 1).b; F.setRecipe(s, a.id, 'sciencePack'); F.place(s, 'port', 4, 0, 1);
    });
    await ff(60); await check('研究所が動いた'); await expectMission('rocketry', '⑬');
    // ⑭ ロケット工学 ⑮ 発射台 ⑯ 打ち上げ（燃料は問題を解いて充填）
    await ev(() => { const s = MF.UI.state; s.research.done.push('rocketry'); });
    await wait(1200); await expectMission('silo', '⑭');
    await ev(() => { const s = MF.UI.state, F = MF.Factory; Object.assign(s.inv, { ironPlate: 400, brick: 300, circuit: 200, gear: 200 }); s.factory.w > 10 && F.place(s, 'silo', 8, 0, 1); });
    await wait(1200); await expectMission('launch', '⑮');
    await ev(() => { MF.UI.state.inv.rocketPart = MF.Balance.galaxy.rocketParts; });
    await go('galaxy'); await check('打ち上げ前');
    await go('quiz');
    const need = await ev(() => MF.Balance.galaxy.launchFuel);
    for (let i = 0; i < need + 2 && !(await ev(() => MF.Galaxy.canLaunch(MF.UI.state))); i++) { await answer(true, { fast: true }); await nextQ(); }
    if (!(await ev(() => MF.Galaxy.canLaunch(MF.UI.state)))) problems.push('⑯：燃料が満タンにならない（' + (await ev(() => MF.UI.state.galaxy.fuel)) + '）');
    await go('galaxy'); await check('燃料満タン');
    await page.click('text=🚀 打ち上げ！'); await wait(3000);
    for (let i = 0; i < 10; i++) { const t = await page.$('.talk-foot .btn'); if (t) { await t.click(); await wait(250); } else break; }
    await closeModals();
    await check('脱出した'); await expectMission('colonize', '⑯');
    // ⑰ 植民
    await ev(() => { const s = MF.UI.state; s.inv.rocketPart = MF.Balance.galaxy.colonyParts; s.galaxy.fuel = 99; MF.Galaxy.launch(s, Date.now()); const n = MF.Galaxy.adj(s, s.galaxy.home).find((i) => !s.galaxy.systems[i].owner); MF.GalaxyUI.sel = n; MF.UI.rerender(); });
    await wait(300);
    const col = await page.$('text=🏳️ 植民する');
    if (col && await col.isEnabled()) await col.click(); else problems.push('⑰：植民ボタンが押せない');
    await wait(1500); await closeModals();
    await expectMission('END', '⑰');
    await shot('end');
  } catch (e) { problems.push('テストが止まった：' + e.message.split('\n')[0]); await shot('error'); }
  await browser.close();
  const tag = process.env.EASY ? '・ぬるま湯モード' : '';
  console.log(problems.length ? '✗ 進行の点検' + tag + '\n  ' + problems.join('\n  ') : '✓ 進行の点検（ストーリー全17ミッション' + tag + '）');
  process.exit(problems.length ? 1 : 0);
})();
