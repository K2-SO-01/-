const { T0, fresh, answerN } = require('./helpers');
const { botFight } = require('./bot');
const G = MF.Game, F = MF.Factory, Bt = MF.Battle, U = MF.Util;
const rnd = (seed) => { const r = U.rng(seed); return () => r.next(); };

test('カードは正解で効果が出て、不正解だと不発', () => {
  const s = fresh();
  const bt = Bt.start(s, 'raid', ['grub']);
  bt.hand = ['strike', 'strike', 'defend']; bt.player.energy = 3;
  const e = bt.enemies[0], hp = e.hp;
  assert(Bt.requestPlay(s, 0, 0).ok);
  Bt.resolvePlay(s, true, 30000);
  assert.strictEqual(e.hp, Math.max(0, hp - 6));
  assert.strictEqual(bt.player.energy, 2);
  const hp2 = e.hp;
  Bt.requestPlay(s, 0, 0);
  const r = Bt.resolvePlay(s, false, 30000);
  assert(r.fizzle); assert.strictEqual(e.hp, hp2); assert.strictEqual(bt.player.energy, 1);
});
test('速く正解すると会心（1.25倍）', () => {
  const s = fresh();
  const bt = Bt.start(s, 'raid', ['beast']);
  bt.hand = ['strike']; bt.player.energy = 3;
  const e = bt.enemies[0], hp = e.hp;
  Bt.requestPlay(s, 0, 0); const r = Bt.resolvePlay(s, true, 3000);
  assert(r.crit); assert.strictEqual(hp - e.hp, 7);
});
test('筋力・脆弱・弱体・ブロックの計算', () => {
  assert.strictEqual(Bt.calcDmg(6, 2, 0, 0, 1), 8);
  assert.strictEqual(Bt.calcDmg(6, 0, 1, 0, 1), 4);
  assert.strictEqual(Bt.calcDmg(6, 0, 0, 1, 1), 9);
  const s = fresh();
  const bt = Bt.start(s, 'raid', ['grub']);
  bt.player.block = 100; const hp = bt.player.hp;
  bt.hand = [];
  Bt.endTurn(s);
  assert.strictEqual(bt.player.hp, hp);
});
test('いつも正解するボットは序盤の敵に勝ち、まったく正解しないと負ける', () => {
  let wins = 0, losses = 0;
  for (let i = 0; i < 20; i++) {
    const s = fresh(100 + i); Bt.start(s, 'raid', ['grub', 'wing']);
    if (botFight(s, 1, rnd(i)) === 'win') wins++;
    const s2 = fresh(200 + i); Bt.start(s2, 'raid', ['beast']);
    if (botFight(s2, 0, rnd(i)) === 'lose') losses++;
  }
  assert(wins >= 19, 'wins ' + wins); assert(losses >= 19, 'losses ' + losses);
});
test('襲撃：一定数の正解でメーターがたまって警告→迎え撃って勝つと報酬', () => {
  const s = fresh();
  answerN(s, 60);
  Bt.checkRaid(s, T0 + 1);
  assert(s.battle.raid.pending, 'raid pending');
  Bt.startRaid(s, T0);
  botFight(s, 1, rnd(3));
  const before = s.inv.iron;
  const out = Bt.finishRaid(s, T0);
  assert(out.win);
  assert(s.inv.iron > before);
  assert.strictEqual(out.cards.length, 3);
  Bt.takeRaidCard(s, out.cards[0]);
  assert(s.battle.deck.indexOf(out.cards[0]) >= 0);
});
test('襲撃を放置すると時間切れで設備が壊れる。修理できる', () => {
  const s = fresh();
  s.inv.iron = 200; s.inv.stone = 200;
  F.place(s, 'storage', 0, 0, 1); F.place(s, 'storage', 1, 0, 1);
  s.battle.raid.meter = 999; s.battle.forceRaids = true;
  Bt.checkRaid(s, T0);
  Bt.checkRaid(s, T0 + 3600 * 1000);
  assert(!s.battle.raid.pending);
  const broken = Object.values(s.factory.b).filter((b) => b.disabled);
  assert(broken.length >= 1);
  const r = F.repair(s, broken[0].id);
  assert(r.ok); assert(!broken[0].disabled);
});
test('砲台は弾薬を使って戦闘中に撃つ', () => {
  const s = fresh();
  s.research.done.push('military', 'automation');
  Object.assign(s.inv, { ironPlate: 50, gear: 20, stone: 50, ammo: 10 });
  F.place(s, 'turret', 0, 0, 1);
  const bt = Bt.start(s, 'raid', ['beast']);
  assert(bt.turretShots >= 1);
  assert.strictEqual(s.inv.ammo, 9);
});
test('侵攻ラン：最後まで進められ、行き詰まらない（強いボット）', () => {
  for (let k = 0; k < 8; k++) {
    const s = fresh(300 + k);
    const r = rnd(k);
    Bt.startRun(s, T0);
    let guard = 0, ended = null;
    while (!ended && guard++ < 200) {
      const run = s.battle.run;
      if (run.reward) { Bt.takeRunCard(s, run.reward.cards[0]); continue; }
      if (run.pendingRest) { Bt.rest(s, run.hp < run.maxHp * 0.6 ? 'heal' : 'upgrade', run.deck.findIndex((c) => !Bt.isUp(c))); continue; }
      if (run.pendingEvent) { Bt.resolveEvent(s, r() < 0.9); continue; }
      const res = Bt.chooseNode(s, 0);
      assert(res, 'node at floor ' + run.floor);
      if (res.battle) { botFight(s, 0.95, r); const out = Bt.finishRunBattle(s, T0); if (out && out.ended) ended = out; }
    }
    assert(ended, 'run ended');
    assert(ended.floor >= 1);
    assert(!s.battle.run.active);
  }
});
test('デッキ編集：持っている枚数まで・最低8枚・カード強化', () => {
  const s = fresh();
  assert(!Bt.deckAdd(s, 'strike'));
  Bt.deckRemove(s, 'strike'); Bt.deckRemove(s, 'strike');
  assert(Bt.deckAdd(s, 'strike'));
  while (s.battle.deck.length > 8) Bt.deckRemove(s, s.battle.deck[0]);
  assert(!Bt.deckRemove(s, s.battle.deck[0]));
  s.inv.gear = 50; s.inv.circuit = 50;
  const c = s.battle.deck[0];
  assert(Bt.upgradeCard(s, c).ok);
  assert(s.battle.collection[c + '+'] >= 1);
});
test('カードの説明文はすべて作れる', () => {
  for (const id of Object.keys(Bt.CARDS)) { assert(Bt.describe(id).length > 0, id); assert(Bt.describe(id + '+').length > 0); }
});
