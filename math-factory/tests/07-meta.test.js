const { T0, fresh, answerN } = require('./helpers');
const G = MF.Game, M = MF.Meta, U = MF.Util;

test('実績：条件を満たすと解除され、称号を選べる', () => {
  const s = fresh();
  answerN(s, 1);
  const got = M.checkAll(s, T0);
  assert(got.some((a) => a.id === 'first'));
  assert(M.titles(s).indexOf('見習い計算士') >= 0);
  assert(M.setTitle(s, '見習い計算士'));
  assert(!M.setTitle(s, '数学工場長'));
  assert.strictEqual(M.checkAll(s, T0).length, 0, 'not twice');
});
test('ログインボーナス：1日1回、連続日数が伸び、途切れるとリセット', () => {
  const s = fresh();
  const r1 = M.login(s, T0);
  assert(r1 && r1.streak === 1);
  assert.strictEqual(M.login(s, T0 + 3600000), null);
  const r2 = M.login(s, T0 + 86400000);
  assert.strictEqual(r2.streak, 2);
  const r3 = M.login(s, T0 + 86400000 * 4);
  assert.strictEqual(r3.streak, 1);
});
test('1日の目標：達成で報酬が1日1回', () => {
  const s = fresh();
  s.meta.dailyGoal = 5;
  const rp0 = s.rp;
  answerN(s, 5);
  assert.strictEqual(s.meta.goalDays, 1);
  answerN(s, 5);
  assert.strictEqual(s.meta.goalDays, 1);
  assert(s.rp > rp0 + 30 - 1);
});
test('日替わりチャレンジ：日付で決まり、成功で報酬（1日1回）', () => {
  const a = M.challengeFor('2026-11-05'), b = M.challengeFor('2026-11-05'), c = M.challengeFor('2026-11-06');
  assert.deepStrictEqual(a, b);
  assert(a.topic && a.target > 0);
  const s = fresh();
  const ch = M.today(s, T0);
  const r = M.finishChallenge(s, T0, ch.target);
  assert(r.pass && r.reward);
  assert.strictEqual(s.meta.tickets, 1);
  const r2 = M.finishChallenge(s, T0, ch.target);
  assert(r2.pass && !r2.reward);
  assert(c);
});
test('ガチャ：研究Pかチケットで回る。かぶりはかけら、30回以内にSR以上', () => {
  const s = fresh();
  s.rp = 0;
  assert(!M.gacha(s, 1).ok);
  s.rp = 100000;
  let sr = false;
  for (let i = 0; i < 30; i++) { const r = M.gacha(s, 1); if (r.res[0].rarity >= 3) sr = true; }
  assert(sr);
  for (let i = 0; i < 10; i++) M.gacha(s, 10);
  assert(s.meta.shards > 0);
  assert(Object.keys(s.meta.skins).length >= 8);
  s.meta.tickets = 10; const rp = s.rp;
  M.gacha(s, 10);
  assert.strictEqual(s.rp, rp); assert.strictEqual(s.meta.tickets, 0);
});
test('スキン：テーマの色と相棒の着せかえ', () => {
  const s = fresh();
  s.meta.skins.th_neon = 1; s.meta.skins.acc_hat = 1; s.meta.skins.col_shiny = 1;
  assert(M.setTheme(s, 'th_neon'));
  assert(M.themeColor(s, 'miner'));
  assert(!M.setTheme(s, 'th_gold'));
  s.pals.list.push({ id: 1, sp: 'parabon', name: 'P', lvl: 1, xp: 0, topic: 'quad' });
  M.setPalSkin(s, 1, 'acc_hat'); M.setPalSkin(s, 1, 'col_shiny');
  const sk = M.palSkin(s, MF.Pals.get(s, 1));
  assert.strictEqual(sk.acc, 'hat'); assert(sk.color && sk.color !== MF.Pals.byId.parabon.look.color);
});
