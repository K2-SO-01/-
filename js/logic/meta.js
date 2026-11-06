/* 数学ファクトリー：やりこみ・ご褒美（実績と称号、ログインボーナス、1日の目標、日替わりチャレンジ、ガチャ）
 * ガチャは研究ポイントかチケットで回す。課金要素は一切ない。 */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, B = MF.Balance, Qs = MF.Questions;
  const M = {};
  B.meta = { gachaCost: 60, gacha10Cost: 540, dailyGoalDefault: 20, goalReward: { rp: 30 }, challengeReward: { rp: 40, ticket: 1 } };

  const st = (s) => s.stats;
  const acc = (s, t) => { const b = s.stats.byTopic[t]; return b && b.a >= 10 ? b.c / b.a : 0; };
  // ---------- 実績と称号 ----------
  M.ACH = [
    { id: 'first', icon: '✏️', name: 'はじめの一問', desc: '問題に1問正解する', title: '見習い計算士', check: (s) => st(s).correct >= 1 },
    { id: 'c50', icon: '📗', name: '50問正解', desc: '合計50問正解', title: '計算工', check: (s) => st(s).correct >= 50 },
    { id: 'c200', icon: '📘', name: '200問正解', desc: '合計200問正解', title: '熟練計算工', check: (s) => st(s).correct >= 200 },
    { id: 'c500', icon: '📙', name: '500問正解', desc: '合計500問正解', title: '数理技師', check: (s) => st(s).correct >= 500 },
    { id: 'c1000', icon: '📕', name: '1000問正解', desc: '合計1000問正解', title: '数学工場長', check: (s) => st(s).correct >= 1000 },
    { id: 'combo10', icon: '🔥', name: '10コンボ', desc: '10問連続で正解', title: '連鎖の使い手', check: (s) => s.quiz.maxCombo >= 10 },
    { id: 'combo30', icon: '☄️', name: '30コンボ', desc: '30問連続で正解', title: '止まらない頭脳', check: (s) => s.quiz.maxCombo >= 30 },
    { id: 'allTopics', icon: '🌈', name: '全分野制覇', desc: 'ふるさとの7分野すべてで10問以上解く', title: 'オールラウンダー', check: (s) => Qs.HOME_TOPICS.every((t) => (s.stats.byTopic[t] || {}).a >= 10) },
    { id: 'acc80', icon: '🎯', name: '正確無比', desc: '7分野すべてで正答率80%以上（各10問以上）', title: '精密機械', check: (s) => Qs.HOME_TOPICS.every((t) => acc(s, t) >= 0.8) },
    { id: 'hard', icon: '💎', name: '難問ハンター', desc: '「難」の問題に30問正解', title: '難問ハンター', check: (s) => (s.meta.hardCorrect || 0) >= 30 },
    { id: 'grad10', icon: '🎓', name: '弱点克服', desc: '弱点を10問卒業する', title: '努力の人', check: (s) => s.study.graduated >= 10 },
    { id: 'build10', icon: '🏗️', name: '工場づくり', desc: '設備を10個置く', title: '建築家', check: (s) => Object.keys(s.factory.b).length >= 11 },
    { id: 'build40', icon: '🏭', name: '大工場', desc: '設備を40個置く', title: '工業王', check: (s) => Object.keys(s.factory.b).length >= 41 },
    { id: 'spaghetti', icon: '🍝', name: 'スパゲッティ職人', desc: 'スパゲッティ度を60%以上にする（よい子はまねしない）', title: 'スパゲッティ職人', check: (s) => s.factory.spaghetti >= 0.6 },
    { id: 'tidy', icon: '📏', name: '整理整頓', desc: 'ベルト20本以上でスパゲッティ度10%以下', title: '几帳面', check: (s) => (MF.Factory.layout(s).beltCount >= 20 && s.factory.spaghetti <= 0.1) },
    { id: 'research5', icon: '🔬', name: '研究者', desc: '研究を5つ完了', title: '研究員', check: (s) => s.research.done.length >= 5 },
    { id: 'research15', icon: '🧪', name: '博士', desc: '研究を15完了', title: '博士', check: (s) => s.research.done.length >= 15 },
    { id: 'pal1', icon: '🐣', name: 'はじめての相棒', desc: '相棒を孵化させる', title: '飼育係', check: (s) => Object.keys(s.pals.dex).length >= 1 },
    { id: 'pal10', icon: '🐾', name: '相棒コレクター', desc: '図鑑を10種うめる', title: '相棒博士', check: (s) => Object.keys(s.pals.dex).length >= 10 },
    { id: 'palLv20', icon: '⭐', name: '育ての親', desc: '相棒をLv20にする', title: '育ての親', check: (s) => s.pals.list.some((p) => p.lvl >= 20) },
    { id: 'raid1', icon: '🛡️', name: '初防衛', desc: '襲撃を撃退する', title: '防衛隊員', check: (s) => s.battle.raidWins >= 1 },
    { id: 'raid10', icon: '🏰', name: '鉄壁', desc: '襲撃を10回撃退', title: '鉄壁の守り', check: (s) => s.battle.raidWins >= 10 },
    { id: 'run5', icon: '🛸', name: '侵攻作戦', desc: '侵攻ランで5層に到達', title: '切り込み隊長', check: (s) => s.battle.bestFloor >= 5 },
    { id: 'runClear', icon: '👑', name: '女王討伐', desc: '侵攻ランをクリア', title: '女王を倒した者', check: (s) => s.battle.runClears >= 1 },
    { id: 'login7', icon: '📅', name: '7日連続', desc: '7日連続でログイン', title: 'こつこつ型', check: (s) => s.meta.login.streak >= 7 },
    { id: 'goal7', icon: '✅', name: '目標達成×7', desc: '1日の目標を7回達成', title: '有言実行', check: (s) => s.meta.goalDays >= 7 },
    { id: 'challenge5', icon: '⏱️', name: 'チャレンジャー', desc: '日替わりチャレンジを5回クリア', title: 'チャレンジャー', check: (s) => s.meta.challengeWins >= 5 },
    { id: 'gacha10', icon: '🎰', name: 'コレクター', desc: 'ガチャで10種類集める', title: 'コレクター', check: (s) => Object.keys(s.meta.skins).length >= 10 },
  ];
  M.achById = {};
  M.ACH.forEach((a) => { M.achById[a.id] = a; });
  M.checkAll = function (s, now) {
    const got = [];
    for (const a of M.ACH) {
      if (s.meta.ach[a.id]) continue;
      let ok = false;
      try { ok = a.check(s); } catch (e) { ok = false; }
      if (ok) {
        s.meta.ach[a.id] = now || 1;
        got.push(a);
        s.rp += 15;
        G.notice(s, { type: 'ach', text: '🏆 実績解除：' + a.name + '（称号「' + a.title + '」・研究P +15）', id: a.id });
      }
    }
    return got;
  };
  M.addAchievements = function (list) { list.forEach((a) => { M.ACH.push(a); M.achById[a.id] = a; }); };
  M.titles = function (s) { return M.ACH.filter((a) => s.meta.ach[a.id]).map((a) => a.title); };
  M.setTitle = function (s, title) { if (!title || M.titles(s).indexOf(title) >= 0) { s.meta.title = title || null; return true; } return false; };

  // ---------- ログインボーナス ----------
  M.LOGIN_REWARDS = [
    { rew: { iron: 30, copper: 30 }, text: '鉄鉱石30・銅鉱石30' },
    { rew: { coal: 30, stone: 30 }, text: '石炭30・石材30' },
    { rew: { rp: 40 }, text: '研究P 40' },
    { rew: { egg: 1 }, text: '相棒の卵' },
    { rew: { iron: 20, copper: 20, coal: 20, stone: 20, uranium: 20, silicon: 20, oil: 20 }, text: '全資源20ずつ' },
    { rew: { rp: 80 }, text: '研究P 80' },
    { rew: { ticket: 2, egg: 1 }, text: 'ガチャチケット2枚＋卵' },
  ];
  M.login = function (s, now) {
    const today = U.dateStr(now);
    const L = s.meta.login;
    if (L.last === today) return null;
    const yesterday = U.dateStr(now - 86400000);
    L.streak = L.last === yesterday ? L.streak + 1 : 1;
    L.last = today;
    L.total++;
    const idx = (L.streak - 1) % 7;
    const r = M.LOGIN_REWARDS[idx];
    M.giveReward(s, r.rew, now);
    G.emit(s, 'login', { streak: L.streak });
    return { day: idx + 1, streak: L.streak, reward: r };
  };
  M.giveReward = function (s, rew, now) {
    for (const k of Object.keys(rew)) {
      if (k === 'egg') { for (let i = 0; i < rew.egg; i++) if (MF.Pals) MF.Pals.addEgg(s, U.randPick(s, G.availableTopics(s)), now, 0.05); }
      else if (k === 'ticket') s.meta.tickets += rew.ticket;
      else if (k === 'rp') s.rp += rew.rp;
      else G.add(s, k, rew[k]);
    }
  };

  // ---------- 1日の目標 ----------
  M.todayCount = function (s, now) { const d = s.stats.days[U.dateStr(now)]; return d ? d.a : 0; };
  M.checkGoal = function (s, now) {
    const today = U.dateStr(now);
    if (s.meta.goalDone === today) return false;
    if (M.todayCount(s, now) >= s.meta.dailyGoal) {
      s.meta.goalDone = today;
      s.meta.goalDays++;
      G.give(s, B.meta.goalReward);
      if (s.factory) s.factory.charge = MF.Factory.chargeMax(s);
      G.notice(s, { type: 'goal', text: '✅ 今日の目標 ' + s.meta.dailyGoal + ' 問を達成！ 研究P +' + B.meta.goalReward.rp + '・演算チャージ満タン' });
      G.emit(s, 'goal', {});
      return true;
    }
    return false;
  };

  // ---------- 日替わりチャレンジ ----------
  M.challengeFor = function (dateStr) {
    const r = U.rng(U.hashStr('challenge:' + dateStr));
    const topic = r.pick(Qs.HOME_TOPICS);
    const kind = r.pick(['time', 'nomiss', 'hard']);
    if (kind === 'time') return { date: dateStr, kind, topic, seconds: 90, target: 5, level: null, title: Qs.TOPICS[topic].name + ' タイムアタック', desc: '90秒で ' + Qs.TOPICS[topic].name + ' に5問以上正解' };
    if (kind === 'nomiss') return { date: dateStr, kind, topic, n: 6, target: 6, level: null, title: Qs.TOPICS[topic].name + ' ノーミス6連', desc: Qs.TOPICS[topic].name + ' を6問、1問もまちがえずに解く' };
    return { date: dateStr, kind, topic, n: 4, target: 3, level: 2, title: Qs.TOPICS[topic].name + ' 難問チャレンジ', desc: '「難」の ' + Qs.TOPICS[topic].name + ' 4問中3問以上正解' };
  };
  M.today = function (s, now) { return M.challengeFor(U.dateStr(now)); };
  M.finishChallenge = function (s, now, score) {
    const ch = M.today(s, now);
    const rec = s.meta.challenges[ch.date] = s.meta.challenges[ch.date] || { best: 0, cleared: false, tries: 0 };
    rec.tries++;
    if (score > rec.best) rec.best = score;
    const pass = score >= ch.target;
    let reward = null;
    if (pass && !rec.cleared) {
      rec.cleared = true;
      s.meta.challengeWins++;
      s.rp += B.meta.challengeReward.rp;
      s.meta.tickets += B.meta.challengeReward.ticket;
      reward = B.meta.challengeReward;
      G.emit(s, 'challenge', {});
    }
    const keys = Object.keys(s.meta.challenges).sort();
    while (keys.length > 30) delete s.meta.challenges[keys.shift()];
    return { pass, reward, best: rec.best };
  };

  // ---------- ガチャ（スキン） ----------
  M.SKINS = [
    { id: 'th_retro', kind: 'theme', name: 'レトロ工場', rarity: 1, colors: { miner: '#8a6a3a', furnace: '#9a4a2a', assembler: '#4a6a3a', lab: '#6a4a7a', storage: '#7a5a30', power: '#9a8a3a', turret: '#7a3a3a', solar: '#3a5a7a' } },
    { id: 'th_mint', kind: 'theme', name: 'ミント工場', rarity: 1, colors: { miner: '#3aa58a', furnace: '#4ab59a', assembler: '#2a957a', lab: '#5ac5aa', storage: '#3a8a7a', power: '#6ad5ba', turret: '#2a7a6a', solar: '#4aa5c5' } },
    { id: 'th_wood', kind: 'theme', name: '木目の工場', rarity: 2, colors: { miner: '#a0703a', furnace: '#8a5a2a', assembler: '#b0804a', lab: '#906030', storage: '#c0905a', power: '#a07a40', turret: '#704a20', solar: '#8a6a3a' } },
    { id: 'th_sakura', kind: 'theme', name: '桜の工場', rarity: 2, colors: { miner: '#e08aa8', furnace: '#d0708a', assembler: '#f0a0b8', lab: '#c07898', storage: '#e8b0c0', power: '#f0c0d0', turret: '#b05070', solar: '#d898b8' } },
    { id: 'th_candy', kind: 'theme', name: 'キャンディ工場', rarity: 2, colors: { miner: '#ff8ac8', furnace: '#ffb05a', assembler: '#8ad8ff', lab: '#c08aff', storage: '#ffe05a', power: '#8aff9a', turret: '#ff6a6a', solar: '#5ae0e0' } },
    { id: 'th_neon', kind: 'theme', name: 'ネオン工場', rarity: 3, colors: { miner: '#1a3a5a', furnace: '#3a1a5a', assembler: '#1a5a4a', lab: '#4a1a6a', storage: '#1a4a6a', power: '#5a4a1a', turret: '#5a1a3a', solar: '#1a2a6a' }, glow: '#39d0ff' },
    { id: 'th_cyber', kind: 'theme', name: 'サイバー工場', rarity: 3, colors: { miner: '#0f2a1a', furnace: '#0f2a1a', assembler: '#0f2a1a', lab: '#0f2a1a', storage: '#0f2a1a', power: '#0f2a1a', turret: '#0f2a1a', solar: '#0f2a1a' }, glow: '#52ff73' },
    { id: 'th_gold', kind: 'theme', name: '黄金工場', rarity: 4, colors: { miner: '#c99a1a', furnace: '#d9aa2a', assembler: '#b98a0a', lab: '#e9ba3a', storage: '#c99a1a', power: '#f9ca4a', turret: '#a97a0a', solar: '#d9aa2a' }, glow: '#ffe08a' },
    { id: 'acc_glasses', kind: 'acc', name: 'まるメガネ', rarity: 1, acc: 'glasses' },
    { id: 'acc_bow', kind: 'acc', name: 'リボン', rarity: 1, acc: 'bow' },
    { id: 'acc_scarf', kind: 'acc', name: '赤いマフラー', rarity: 2, acc: 'scarf' },
    { id: 'acc_hat', kind: 'acc', name: '博士帽', rarity: 2, acc: 'hat' },
    { id: 'acc_helmet', kind: 'acc', name: '工事ヘルメット', rarity: 3, acc: 'helmet' },
    { id: 'col_shiny', kind: 'color', name: '色違い（シャイニー）', rarity: 4, hue: 'shiny' },
    { id: 'col_night', kind: 'color', name: '夜空カラー', rarity: 3, color: '#3a3f8a', belly: '#9aa0ff' },
    { id: 'col_snow', kind: 'color', name: '雪だまカラー', rarity: 2, color: '#e8eef4', belly: '#ffffff' },
  ];
  M.skinById = {};
  M.SKINS.forEach((k) => { M.skinById[k.id] = k; });
  M.RAR = ['', 'N', 'R', 'SR', 'SSR'];
  M.RATES = [0, 0.55, 0.32, 0.11, 0.02];
  M.SHARD_VALUE = [0, 1, 3, 10, 30];
  M.EXCHANGE = [0, 10, 30, 100, 300];
  M.pullOne = function (s) {
    const r = U.rand(s);
    let rar = 1, accum = 0;
    for (let k = 4; k >= 1; k--) { accum += M.RATES[k]; if (r < accum) { rar = k; break; } }
    if (s.meta.pity >= 29) rar = Math.max(rar, 3);
    if (rar >= 3) s.meta.pity = 0; else s.meta.pity++;
    const pool = M.SKINS.filter((k) => k.rarity === rar);
    const skin = U.randPick(s, pool);
    const dup = !!s.meta.skins[skin.id];
    if (dup) s.meta.shards += M.SHARD_VALUE[rar];
    else s.meta.skins[skin.id] = 1;
    s.meta.pulls++;
    return { id: skin.id, dup, rarity: rar };
  };
  /** n回まわす。チケット優先、足りなければ研究P */
  M.gacha = function (s, n) {
    n = n === 10 ? 10 : 1;
    if (s.meta.tickets >= n) s.meta.tickets -= n;
    else {
      const cost = n === 10 ? B.meta.gacha10Cost : B.meta.gachaCost;
      if (s.rp < cost) return { ok: false, reason: '研究Pが足りない（' + cost + ' 必要）' };
      s.rp -= cost;
    }
    const res = [];
    for (let i = 0; i < n; i++) res.push(M.pullOne(s));
    if (n === 10 && !res.some((x) => x.rarity >= 2)) { s.meta.pity = Math.max(0, s.meta.pity - 1); res[9] = M.pullOne(s); }
    G.emit(s, 'gacha', { n });
    return { ok: true, res };
  };
  M.exchange = function (s, id) {
    const k = M.skinById[id];
    if (!k || s.meta.skins[id]) return false;
    const cost = M.EXCHANGE[k.rarity];
    if (s.meta.shards < cost) return false;
    s.meta.shards -= cost; s.meta.skins[id] = 1;
    return true;
  };
  M.setTheme = function (s, id) { if (id && !s.meta.skins[id]) return false; s.meta.theme = id || null; return true; };
  M.themeColor = function (s, type) { const th = s.meta.theme && M.skinById[s.meta.theme]; return th && th.colors ? th.colors[type] || null : null; };
  /** 相棒のスキン → PalArt 用 {color, belly, acc} */
  M.palSkin = function (s, pal) {
    if (!pal.skin && !pal.color) return null;
    const out = {};
    const acc = pal.skin && M.skinById[pal.skin];
    if (acc && acc.acc) out.acc = acc.acc;
    const col = pal.color && M.skinById[pal.color];
    if (col) {
      if (col.hue === 'shiny') { const sp = MF.Pals.byId[pal.sp]; out.color = shinyOf(sp.look.color); out.belly = '#fffbe0'; }
      else { out.color = col.color; out.belly = col.belly; }
    }
    return out;
  };
  function shinyOf(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return '#' + ((1 << 24) + (b << 16) + (r << 8) + g).toString(16).slice(1); }
  M.setPalSkin = function (s, palId, skinId) {
    const pal = MF.Pals.get(s, palId);
    if (!pal) return false;
    if (skinId && !s.meta.skins[skinId]) return false;
    const k = skinId ? M.skinById[skinId] : null;
    if (!k) { pal.skin = null; pal.color = null; return true; }
    if (k.kind === 'acc') pal.skin = pal.skin === skinId ? null : skinId;
    else if (k.kind === 'color') pal.color = pal.color === skinId ? null : skinId;
    return true;
  };

  // ---------- フック ----------
  G.on('answer', (s, d) => {
    if (d.ok && d.first && d.level === 2) s.meta.hardCorrect = (s.meta.hardCorrect || 0) + 1;
    M.checkGoal(s, d.now || Date.now());
  });
  let acc0 = 0;
  G.register({
    id: 'meta',
    init(s) {
      s.meta = { ach: {}, title: null, login: { last: null, streak: 0, total: 0 }, dailyGoal: B.meta.dailyGoalDefault, goalDone: null, goalDays: 0,
        challenges: {}, challengeWins: 0, tickets: 0, shards: 0, skins: {}, pulls: 0, pity: 0, theme: null, hardCorrect: 0 };
    },
    tick(s, dt, now) { acc0 += dt; if (acc0 > 3) { acc0 = 0; M.checkAll(s, now); } },
  });
  MF.Meta = M;
})(globalThis.MF = globalThis.MF || {});
