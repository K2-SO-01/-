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
// ステップ3：工場で採掘機とベルトを置いて、コアまで運ぶ
async function cellPos(page, x, y) {
  return page.evaluate(([x, y]) => {
    const FUI = MF.FactoryUI, r = FUI.canvas.getBoundingClientRect(), cs = FUI.cs * FUI.zoom;
    return { x: r.left + FUI.ox + (x + 0.5) * cs, y: r.top + FUI.oy + (y + 0.5) * cs };
  }, [x, y]);
}
async function factoryFlow(page, t) {
  await nav(page, '工場');
  await page.evaluate(() => { const s = MF.UI.state; s.inv.iron = 200; s.inv.stone = 200; s.factory.charge = 600; });
  // 鉄の鉱脈で、コアと同じ行か、縦→横でつなげられる場所を探す
  const plan = await page.evaluate(() => {
    const s = MF.UI.state, f = s.factory, F = MF.Factory;
    const core = Object.values(f.b).find((b) => b.type === 'core');
    let best = null;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      if (f.ore[y * f.w + x] !== 'iron' || f.b[f.cells[y * f.w + x]]) continue;
      if (x === core.x) continue;
      const d = Math.abs(x - core.x) + Math.abs(y - core.y);
      if (!best || d < best.d) best = { x, y, d };
    }
    return { core: { x: core.x, y: core.y }, m: best };
  });
  const { core, m } = plan;
  await page.click('.tool-btn[data-id=build]');
  await page.click('.pal-btn[data-type=miner]');
  const vdir = m.y === core.y ? (m.x < core.x ? 1 : 3) : (m.y < core.y ? 2 : 0);
  await page.evaluate((d) => { MF.FactoryUI.dir = d; }, vdir);
  let p = await cellPos(page, m.x, m.y);
  await page.mouse.click(p.x, p.y);
  await page.click('.pal-btn[data-type=belt]');
  const drag = async (cells) => {
    const a = await cellPos(page, cells[0][0], cells[0][1]);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (const c of cells.slice(1)) { const q = await cellPos(page, c[0], c[1]); await page.mouse.move(q.x, q.y, { steps: 3 }); }
    await page.mouse.up();
  };
  const sx = Math.sign(core.x - m.x);
  if (m.y === core.y) {
    const cells = []; for (let x = m.x + sx; x !== core.x; x += sx) cells.push([x, m.y]);
    if (cells.length === 1) { await page.evaluate((d) => { MF.FactoryUI.dir = d; }, vdir); const q = await cellPos(page, cells[0][0], cells[0][1]); await page.mouse.click(q.x, q.y); }
    else await drag(cells);
  } else {
    const sy = Math.sign(core.y - m.y);
    const v = []; for (let y = m.y + sy; ; y += sy) { v.push([m.x, y]); if (y === core.y) break; }
    await page.evaluate((d) => { MF.FactoryUI.dir = d; }, vdir);
    if (v.length === 1) { const q = await cellPos(page, v[0][0], v[0][1]); await page.mouse.click(q.x, q.y); } else await drag(v);
    const hcells = [[m.x, core.y]]; for (let x = m.x + sx; x !== core.x; x += sx) hcells.push([x, core.y]);
    if (hcells.length === 1) { await page.evaluate(([x, y, d]) => { const b = MF.Factory.at(MF.UI.state, x, y); if (b) { b.dir = d; MF.UI.state.factory.ver++; } }, [m.x, core.y, sx > 0 ? 1 : 3]); }
    else await drag(hcells);
  }
  const route = await page.evaluate(() => {
    const s = MF.UI.state, L = MF.Factory.layout(s);
    const miner = Object.values(s.factory.b).find((b) => b.type === 'miner');
    return L.routes[miner.id];
  });
  if (!route || !route.dest) throw new Error('route not connected ' + JSON.stringify(route) + ' ' + JSON.stringify(plan));
  const iron0 = await page.evaluate(() => MF.UI.state.inv.iron);
  let iron1 = iron0;
  for (let i = 0; i < 16 && !(iron1 > iron0); i++) { await page.waitForTimeout(500); iron1 = await page.evaluate(() => MF.UI.state.inv.iron); }
  if (!(iron1 > iron0)) {
    const dbg = await page.evaluate(() => { const s = MF.UI.state; const m = Object.values(s.factory.b).find((b) => b.type === 'miner'); return JSON.stringify({ m, power: s.factory.power, charge: s.factory.charge, cap: MF.Factory.storageCap(s) }); });
    throw new Error('no delivery ' + iron0 + ' -> ' + iron1 + ' ' + dbg);
  }
  await page.click('.tool-btn[data-id=inspect]');
  p = await cellPos(page, m.x, m.y);
  await page.mouse.click(p.x, p.y);
  await t.shot(page, (t.mobile ? 'm' : 'd') + '-factory-built');
}
module.exports.desktop.push(factoryFlow);
module.exports.mobile.push(async (page, t) => factoryFlow(page, Object.assign({}, t, { mobile: true })));
module.exports.desktop.push(async (page, t) => {
  // 留守中の生産：1時間前に閉じたことにして再読み込み
  await page.evaluate(() => { const s = MF.UI.state; MF.App.save(); const o = JSON.parse(localStorage.getItem(MF.App.KEY)); o.lastTick -= 3600 * 1000; o.factory.charge = 1200; localStorage.setItem(MF.App.KEY, JSON.stringify(o)); MF.App.resetting = true; });
  await page.reload();
  await page.waitForSelector('.modal:has-text("留守中の生産量")', { timeout: 5000 });
  await t.shot(page, 'd-offline');
  await page.click('.modal >> text=受け取る');
});
// ステップ4：研究画面・強化・設計図
module.exports.desktop.push(async (page, t) => {
  await page.evaluate(() => { const s = MF.UI.state; s.rp = 200; });
  await nav(page, '研究');
  await page.waitForSelector('.tech');
  await page.click('.tech:has-text("設計図") >> text=研究を始める');
  await page.evaluate(() => { const s = MF.UI.state; s.research.prog.blueprint = { seq: 3 }; MF.Research.checkDone(s); });
  await t.shot(page, 'd-research');
  await nav(page, '工場');
  await page.evaluate(() => { Object.assign(MF.UI.state.inv, { iron: 280, stone: 280, gear: 20 }); });
  await page.click('.tool-btn[data-id=upgrade]');
  const miner = await page.evaluate(() => { const b = Object.values(MF.UI.state.factory.b).find((x) => x.type === 'miner'); return { x: b.x, y: b.y }; });
  let p = await cellPos(page, miner.x, miner.y);
  await page.mouse.click(p.x, p.y);
  const lvl = await page.evaluate(() => Object.values(MF.UI.state.factory.b).find((x) => x.type === 'miner').lvl);
  if (lvl !== 2) throw new Error('upgrade failed lvl=' + lvl);
  await page.click('.tool-btn[data-id=blueprint]');
  const core = await page.evaluate(() => { const b = Object.values(MF.UI.state.factory.b).find((x) => x.type === 'core'); return { x: b.x, y: b.y }; });
  p = await cellPos(page, miner.x, miner.y); await page.mouse.click(p.x, p.y);
  p = await cellPos(page, miner.x + (core.x > miner.x ? 1 : -1), miner.y); await page.mouse.click(p.x, p.y);
  const n = await page.evaluate(() => MF.UI.state.factory.blueprints.length);
  if (n !== 1) throw new Error('blueprint not captured');
  await page.mouse.move(p.x, p.y + 60);
  await t.shot(page, 'd-blueprint');
});
// ステップ5：相棒
module.exports.desktop.push(async (page, t) => {
  await page.evaluate(() => { const s = MF.UI.state; for (const tp of ['quad', 'trig', 'prob']) { const e = MF.Pals.addEgg(s, tp, Date.now()); e.prog = e.need; } });
  await nav(page, '相棒');
  await page.click('.hatch-btn');
  await page.waitForSelector('.hatch-reveal:not(.hidden)', { timeout: 4000 });
  await t.shot(page, 'd-hatch');
  await page.click('.modal >> text=よろしくね！');
  await page.click('.hatch-btn'); await page.waitForSelector('.hatch-reveal:not(.hidden)'); await page.click('.modal >> text=よろしくね！');
  await page.click('.hatch-btn'); await page.waitForSelector('.hatch-reveal:not(.hidden)'); await page.click('.modal >> text=よろしくね！');
  await t.shot(page, 'd-pals');
  await page.click('.tab:has-text("図鑑")');
  await t.shot(page, 'd-dex');
  await nav(page, '工場');
  await page.click('.tool-btn[data-id=inspect]');
  const miner = await page.evaluate(() => { const b = Object.values(MF.UI.state.factory.b).find((x) => x.type === 'miner'); return { x: b.x, y: b.y }; });
  const p = await cellPos(page, miner.x, miner.y);
  await page.mouse.click(p.x, p.y);
  await page.click('text=🐾 相棒を配置');
  await page.click('.pick-item >> nth=0');
  const assigned = await page.evaluate(() => !!Object.values(MF.UI.state.factory.b).find((x) => x.type === 'miner').pal);
  if (!assigned) throw new Error('pal not assigned');
  await t.shot(page, 'd-pal-assigned');
});
// ステップ6：襲撃と侵攻ラン
async function answerModal(page, ok) {
  const ans = await page.evaluate((ok) => { const q = MF.Game.Quiz.currentQuestion(MF.UI.state); return ok ? MF.Questions.answerText(q) : MF.Util.fstr(MF.Util.fadd(q.answer, 1)); }, ok);
  const kp = await page.$('.modal .keypad');
  if (kp) { for (const ch of ans) await page.click('.modal .keypad .key >> text="' + (ch === '-' ? '−' : ch) + '"'); await page.click('.modal .keypad .key-ok'); }
  else { await page.fill('.modal .q-input', ans); await page.press('.modal .q-input', 'Enter'); }
}
async function battleFlow(page, t, prefix) {
  await page.evaluate(() => { const s = MF.UI.state; s.battle.forceRaids = true; s.battle.raid.meter = 99; MF.Battle.checkRaid(s, Date.now()); });
  await nav(page, '防衛');
  await page.waitForSelector('text=迎え撃つ！');
  await t.shot(page, prefix + '-defense');
  await page.click('text=迎え撃つ！');
  await page.waitForSelector('.enemies');
  await t.shot(page, prefix + '-battle');
  for (let k = 0; k < 40; k++) {
    const over = await page.evaluate(() => { const bt = MF.UI.state.battle.active; return !bt || !!bt.over; });
    if (over) break;
    const playable = await page.evaluate(() => { const s = MF.UI.state, bt = s.battle.active; return bt.hand.findIndex((c) => MF.Battle.cost(s, bt, c) <= bt.player.energy); });
    if (playable < 0) { await page.click('text=ターン終了 ▶'); await page.waitForTimeout(150); continue; }
    await page.click('.hand .card-el >> nth=' + playable);
    await page.waitForSelector('.modal .qpanel');
    if (k === 0) await t.shot(page, prefix + '-card-question');
    await answerModal(page, k % 4 !== 3);
    await page.waitForTimeout(1300);
    if (await page.$('.modal >> text=つづける ▶')) await page.click('.modal >> text=つづける ▶');
    await page.waitForTimeout(100);
  }
  await page.waitForSelector('.modal');
  await t.shot(page, prefix + '-battle-result');
  const choose = await page.$('.modal .card-choices .card-el');
  if (choose) await choose.click(); else await page.click('.modal-foot .btn');
  await page.waitForTimeout(200);
}
module.exports.desktop.push(async (page, t) => {
  await page.evaluate(() => { MF.UI.state.battle.hpBonus = 200; });
  await battleFlow(page, t, 'd');
  // 侵攻ラン：出撃→ノード選択→戦闘画面
  await nav(page, '防衛');
  await page.click('text=🚀 出撃する');
  await page.waitForSelector('.node-btn');
  await t.shot(page, 'd-run');
  await page.click('.node-btn >> nth=0');
  await page.waitForSelector('.enemies');
});
module.exports.mobile.push(async (page, t) => {
  await page.evaluate(() => { MF.UI.state.battle.hpBonus = 200; });
  await battleFlow(page, t, 'm');
});
// ステップ7：実績・ガチャ・統計・日替わり
module.exports.desktop.push(async (page, t) => {
  await nav(page, '受験');
  await page.click('.tab:has-text("統計")');
  await page.waitForSelector('.hbars');
  await t.shot(page, 'd-stats');
  await nav(page, '実績');
  await t.shot(page, 'd-ach');
  await page.click('.tab:has-text("ガチャ")');
  await page.evaluate(() => { MF.UI.state.rp = 2000; MF.UI.rerender(); });
  await page.click('text=10回（研究P 540）');
  await page.waitForSelector('.gacha-res');
  await page.waitForTimeout(500);
  await t.shot(page, 'd-gacha');
  await page.click('.modal-foot .btn');
  await page.click('.tab:has-text("今日の目標")');
  await t.shot(page, 'd-daily');
  await page.click('text=挑戦する');
  await page.waitForSelector('.session-bar');
  await t.answerCurrent(page, true);
  await t.shot(page, 'd-challenge');
  await page.click('.session-bar >> text=終了');
  await page.waitForSelector('.modal');
  await page.click('.modal-foot .btn');
});
// ステップ8：模試・レポート・カウントダウン
module.exports.desktop.push(async (page, t) => {
  await page.evaluate(() => { const s = MF.UI.state; s.battle.active = null; if (s.battle.run) s.battle.run.active = false; });
  await nav(page, '受験');
  await page.click('.tab:has-text("模試")');
  await page.click('.node-btn:has-text("ミニ模試")');
  await page.click('.modal-foot >> text=はじめる');
  await page.waitForSelector('.session-bar');
  for (let i = 0; i < 3; i++) { await t.answerCurrent(page, i !== 1); await page.waitForTimeout(1400); if (await page.$('text=次の問題 ▶')) await page.click('text=次の問題 ▶'); }
  await t.shot(page, 'd-exam');
  await page.evaluate(() => { MF.UI.state.study.exam.deadline = Date.now() - 1; });
  await page.waitForSelector('.modal:has-text("の結果")', { timeout: 5000 });
  await t.shot(page, 'd-exam-result');
  await page.click('.modal-foot >> text=閉じる');
  await page.click('.tab:has-text("週間レポート")');
  await t.shot(page, 'd-report');
  await page.click('.tab:has-text("カウントダウン")');
  await page.fill('input[type=date]', '2027-01-16');
  await page.dispatchEvent('input[type=date]', 'change');
  await page.waitForSelector('.countdown');
  await t.shot(page, 'd-plan');
});
// ステップ9：勉強タイマーとプレイ時間の上限
module.exports.desktop.push(async (page, t) => {
  await page.click('.pomo-chip');
  await page.click('.modal-foot >> text=▶ 集中スタート');
  await page.evaluate(() => { MF.UI.state.well.pomo.endsAt = Date.now() - 10; });
  await page.waitForSelector('.modal:has-text("休憩しよう")', { timeout: 4000 });
  await t.shot(page, 'd-pomo-break');
  await page.click('.modal-foot >> text=休憩する');
  await page.evaluate(() => { const p = MF.UI.state.well.play; p.limitMin = 30; p.sec = 30 * 60 + 5; });
  await page.waitForSelector('.modal:has-text("休憩の時間")', { timeout: 4000 });
  await t.shot(page, 'd-limit');
  await page.click('.modal-foot >> text=あと10分だけ');
  await nav(page, '設定');
  await t.shot(page, 'd-settings2');
  await page.evaluate(() => { MF.UI.state.well.play.limitMin = 0; });
});
