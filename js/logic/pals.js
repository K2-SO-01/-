/* 数学ファクトリー：相棒（卵・孵化・育成・工場での労働・図鑑） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, F = MF.Factory, B = MF.Balance, Qs = MF.Questions;
  const P = {};
  B.pals = {
    eggChance: 0.07, eggComboBonus: 0.004, eggPity: 14, hatchNeed: [5, 7, 9], maxEggs: 6, maxPals: 40,
    xpTopic: 3, xpOther: 1, xpPerLevel: 8, maxLevel: 30, rarityRoll: [0.7, 0.25, 0.05],
    skillStep: 0.15, levelStep: 0.08,
  };
  P.WORK = {
    mining: { name: '採掘', icon: '⛏️', buildings: ['miner'] },
    smelting: { name: '精錬', icon: '🔥', buildings: ['furnace'] },
    crafting: { name: '組立', icon: '⚙️', buildings: ['assembler'] },
    power: { name: '発電', icon: '⚡', buildings: ['power', 'solar', 'core'] },
    research: { name: '研究', icon: '🔬', buildings: ['lab'] },
    transport: { name: '運搬', icon: '📦', buildings: ['core', 'storage'] },
    defense: { name: '防衛', icon: '🛡️', buildings: ['turret'] },
  };
  // 見た目のパーツ：body(round|tall|wide|cube|drop) ears(cat|round|bunny|none) extra(horns|antenna|wings|spiral|flame|crown|none)
  P.SPECIES = [
    { id: 'parabon', name: 'パラボン', topic: 'quad', rarity: 1, work: { mining: 2 }, look: { body: 'drop', color: '#9fb4c8', belly: '#dfe8f0', ears: 'none', extra: 'arc', sym: 'y' }, desc: '頭のてっぺんが放物線の形をしたスライム。いつも頂点を目指している。' },
    { id: 'choten', name: 'チョウテン', topic: 'quad', rarity: 2, work: { mining: 3, defense: 1 }, look: { body: 'tall', color: '#7f8da0', belly: '#c9d2dc', ears: 'cat', extra: 'peak', sym: '∧' }, desc: '山の頂上に住む。最大値・最小値をかぎ分ける鼻を持つ。' },
    { id: 'saikoron', name: 'サイコロン', topic: 'prob', rarity: 1, work: { crafting: 2 }, look: { body: 'cube', color: '#f0e6d2', belly: '#ffffff', ears: 'none', extra: 'dots', sym: '⚂' }, desc: 'さいころの妖精。転がるたびに出る目が変わる。気分屋。' },
    { id: 'kakuritsune', name: 'カクリツネ', topic: 'prob', rarity: 2, work: { research: 2, crafting: 1 }, look: { body: 'round', color: '#e08a4f', belly: '#ffe2c8', ears: 'cat', extra: 'tail', sym: 'P' }, desc: '確率を操るキツネ。しっぽの数は期待値で決まるらしい。' },
    { id: 'hinokobun', name: 'ヒノコブン', topic: 'diff', rarity: 1, work: { smelting: 2 }, look: { body: 'drop', color: '#ff7a3d', belly: '#ffd18a', ears: 'none', extra: 'flame', sym: '′' }, desc: '火の粉の精。変化の激しいところが大好き。' },
    { id: 'tangen', name: 'タンジェン', topic: 'diff', rarity: 2, work: { smelting: 3, defense: 2 }, look: { body: 'wide', color: '#c9473a', belly: '#ffb08a', ears: 'none', extra: 'horns', sym: '∂' }, desc: '接線の角をもつ小竜。曲線にふれた瞬間の傾きを見抜く。' },
    { id: 'kousamogura', name: 'コウサモグラ', topic: 'seq', rarity: 1, work: { mining: 2, transport: 1 }, look: { body: 'wide', color: '#b9a27a', belly: '#efe2c4', ears: 'round', extra: 'claws', sym: '+d' }, desc: '一定の間隔でトンネルを掘るモグラ。公差は3センチ。' },
    { id: 'fibonakky', name: 'フィボナッキー', topic: 'seq', rarity: 2, work: { transport: 3 }, look: { body: 'round', color: '#d6b25a', belly: '#fff0c0', ears: 'none', extra: 'spiral', sym: 'aₙ' }, desc: 'うずまき模様の殻をもつカタツムリ。1,1,2,3,5…と数えながら進む。' },
    { id: 'yajirun', name: 'ヤジルン', topic: 'vec', rarity: 1, work: { transport: 2 }, look: { body: 'round', color: '#7bd66b', belly: '#d8f5cf', ears: 'none', extra: 'wings', sym: '→' }, desc: '矢印のくちばしを持つ小鳥。向きと大きさにうるさい。' },
    { id: 'naiseki', name: 'ナイセキ', topic: 'vec', rarity: 2, work: { power: 2, defense: 1 }, look: { body: 'wide', color: '#3fae8a', belly: '#bff0dc', ears: 'none', extra: 'antenna', sym: '·' }, desc: '磁力をまとう甲虫。直角に出会うと力が0になってしまう。' },
    { id: 'sekibunbun', name: 'セキブンブン', topic: 'integ', rarity: 1, work: { research: 1, power: 1 }, look: { body: 'round', color: '#f2cc4a', belly: '#fff3c0', ears: 'none', extra: 'wings', sym: '∫' }, desc: '花畑の面積を測りながら蜜を集めるハチ。' },
    { id: 'eriaru', name: 'エリアール', topic: 'integ', rarity: 2, work: { power: 3 }, look: { body: 'drop', color: '#8fb8e6', belly: '#e0efff', ears: 'none', extra: 'tentacles', sym: 'S' }, desc: '囲まれた部分を光で満たすクラゲ。夜の発電所で人気。' },
    { id: 'sainami', name: 'サイナミ', topic: 'trig', rarity: 1, work: { power: 2 }, look: { body: 'wide', color: '#6d8bd1', belly: '#dbe4ff', ears: 'round', extra: 'wave', sym: '∿' }, desc: '波の上でくらすアザラシ。周期 2π で昼寝する。' },
    { id: 'nyangent', name: 'ニャンジェント', topic: 'trig', rarity: 2, work: { research: 2, power: 1 }, look: { body: 'round', color: '#9b7fd1', belly: '#efe4ff', ears: 'cat', extra: 'tail', sym: 'θ' }, desc: '単位円の上を歩くネコ。角度を聞くと sin と cos で答える。' },
    { id: 'sigmadraco', name: 'シグマドラコ', topic: null, rarity: 3, work: { mining: 2, crafting: 2, defense: 3 }, look: { body: 'tall', color: '#ff5d5d', belly: '#ffd0c0', ears: 'none', extra: 'crown', sym: 'Σ' }, desc: 'すべてを足し合わせる伝説の竜。めったに卵から出てこない。' },
    { id: 'zerophantom', name: 'ゼロファントム', topic: null, rarity: 3, work: { research: 3, power: 2 }, look: { body: 'drop', color: '#cfd6ff', belly: '#ffffff', ears: 'none', extra: 'halo', sym: '0' }, desc: '割り算の影にひそむ幽霊。0で割ろうとすると現れる。' },
    { id: 'eulerf', name: 'オイラーフ', topic: null, rarity: 3, work: { mining: 3, crafting: 3 }, look: { body: 'tall', color: '#5b6b8c', belly: '#c9d4ea', ears: 'cat', extra: 'crown', sym: 'e' }, desc: '一筆書きの道を走るオオカミ。e のつく場所に巣を作る。' },
    { id: 'logrin', name: 'ログリン', topic: 'explog', rarity: 2, work: { research: 2, crafting: 1 }, look: { body: 'round', color: '#c0c8d0', belly: '#ffffff', ears: 'bunny', extra: 'antenna', sym: 'log' }, desc: '桁数を数えるのが得意な小鬼。大きな数を見ると目がまわる。' },
    { id: 'kumiawaseru', name: 'クミアワセル', topic: 'comb', rarity: 2, work: { crafting: 3 }, look: { body: 'cube', color: '#e6c34a', belly: '#fff2c0', ears: 'round', extra: 'dots', sym: 'C' }, desc: 'ありとあらゆる並べ方を試すまで眠れない。' },
    { id: 'imajina', name: 'イマジナ', topic: 'cplx', rarity: 2, work: { power: 2, research: 2 }, look: { body: 'drop', color: '#c77ddb', belly: '#f6dcff', ears: 'none', extra: 'halo', sym: 'i' }, desc: '虚数の世界から来た精霊。90°回るとごきげん。' },
    { id: 'zahyousagi', name: 'ザヒョウサギ', topic: 'coord', rarity: 2, work: { transport: 2, mining: 1 }, look: { body: 'round', color: '#e07a9a', belly: '#ffe0ea', ears: 'bunny', extra: 'none', sym: 'xy' }, desc: '方眼紙の上をはねるウサギ。点と直線の距離を一瞬で測る。' },
  ];
  P.byId = {};
  P.SPECIES.forEach((sp) => { P.byId[sp.id] = sp; });
  P.RARITY = ['', 'ノーマル', 'レア', 'エピック'];

  // ---------- 卵と孵化 ----------
  P.addEgg = function (s, topic, now, rarityHint) {
    const pl = s.pals;
    if (pl.eggs.length >= B.pals.maxEggs) return null;
    const egg = { id: ++pl.nextId, topic, prog: 0, need: B.pals.hatchNeed[0], got: now, hint: rarityHint || 0 };
    pl.eggs.push(egg);
    G.notice(s, { type: 'egg', text: '🥚 ' + Qs.TOPICS[topic].name + 'の卵を手に入れた！（あと ' + egg.need + ' 問正解で孵化）' });
    G.emit(s, 'egg', { topic });
    return egg;
  };
  P.rollSpecies = function (s, topic, rarityHint) {
    let r = U.rand(s);
    const roll = B.pals.rarityRoll;
    let rarity = r < roll[2] + (rarityHint || 0) ? 3 : r < roll[2] + roll[1] + (rarityHint || 0) ? 2 : 1;
    let pool = P.SPECIES.filter((sp) => sp.rarity === rarity && (rarity === 3 ? true : sp.topic === topic));
    if (!pool.length) pool = P.SPECIES.filter((sp) => sp.topic === topic);
    if (!pool.length) pool = P.SPECIES.filter((sp) => sp.rarity === 1);
    return U.randPick(s, pool);
  };
  P.hatch = function (s, eggId, now) {
    const pl = s.pals;
    const i = pl.eggs.findIndex((e) => e.id === eggId);
    if (i < 0) return null;
    const egg = pl.eggs[i];
    if (egg.prog < egg.need) return null;
    pl.eggs.splice(i, 1);
    const sp = P.rollSpecies(s, egg.topic, egg.hint);
    const pal = { id: ++pl.nextId, sp: sp.id, name: sp.name, lvl: 1, xp: 0, topic: sp.topic || egg.topic, at: null, born: now, skin: null };
    if (pl.list.length >= B.pals.maxPals) { s.rp += 20; G.notice(s, { type: 'warn', text: '相棒がいっぱいなので、' + sp.name + 'は研究所の手伝いに旅立った（研究P +20）' }); }
    else pl.list.push(pal);
    const dex = pl.dex[sp.id] = pl.dex[sp.id] || { n: 0, first: now };
    const isNew = dex.n === 0;
    dex.n++;
    G.emit(s, 'hatch', { sp: sp.id, rarity: sp.rarity, isNew });
    return { pal, sp, isNew };
  };
  P.readyEggs = function (s) { return s.pals.eggs.filter((e) => e.prog >= e.need); };

  // ---------- 育成 ----------
  P.xpNeed = (lvl) => B.pals.xpPerLevel * lvl;
  P.gainXP = function (s, pal, xp) {
    if (pal.lvl >= B.pals.maxLevel) return false;
    pal.xp += xp;
    let up = false;
    while (pal.lvl < B.pals.maxLevel && pal.xp >= P.xpNeed(pal.lvl)) { pal.xp -= P.xpNeed(pal.lvl); pal.lvl++; up = true; }
    if (up) { G.notice(s, { type: 'palLevel', text: '🐾 ' + pal.name + ' が Lv' + pal.lvl + ' になった！', pal: pal.id }); G.emit(s, 'palLevel', { id: pal.id, lvl: pal.lvl }); }
    return up;
  };
  /** 相棒の作業能力（技能値 × レベル補正） */
  P.skill = function (pal, work) {
    const sp = P.byId[pal.sp];
    const base = sp.work[work] || 0;
    return base * (1 + B.pals.levelStep * (pal.lvl - 1));
  };
  P.bonusFor = function (s, pal, buildingType) {
    let best = 0;
    for (const w of Object.keys(P.WORK)) if (P.WORK[w].buildings.indexOf(buildingType) >= 0) best = Math.max(best, P.skill(pal, w));
    return best * B.pals.skillStep;
  };
  P.get = function (s, id) { return s.pals.list.find((p) => p.id === id) || null; };

  // ---------- 工場で働かせる ----------
  P.assign = function (s, palId, buildingId) {
    const pal = P.get(s, palId);
    const b = s.factory.b[buildingId];
    if (!pal || !b) return false;
    if (b.type === 'belt') return false;
    P.unassign(s, palId);
    if (b.pal) { const old = P.get(s, b.pal); if (old) old.at = null; }
    b.pal = palId; pal.at = buildingId;
    G.emit(s, 'palAssign', { id: palId, type: b.type });
    return true;
  };
  P.unassign = function (s, palId) {
    const pal = P.get(s, palId);
    if (!pal || !pal.at) return;
    const b = s.factory.b[pal.at];
    if (b && b.pal === palId) delete b.pal;
    pal.at = null;
  };
  P.release = function (s, palId) {
    const pal = P.get(s, palId);
    if (!pal) return false;
    P.unassign(s, palId);
    s.pals.list = s.pals.list.filter((p) => p.id !== palId);
    s.rp += 5 + pal.lvl * 2;
    return true;
  };
  F.speedMult.push((s, b) => {
    if (!b.pal || b.type === 'power' || b.type === 'solar' || b.type === 'core' || b.type === 'storage') return 1;
    const pal = P.get(s, b.pal);
    return pal ? 1 + P.bonusFor(s, pal, b.type) : 1;
  });
  const prevLab = F.labMult;
  F.labMult = (s, b) => (prevLab ? prevLab(s, b) : 1);
  const prevBelt = F.beltMult;
  F.beltMult = (s) => {
    let m = prevBelt ? prevBelt(s) : 1;
    for (const id in s.factory.b) { const b = s.factory.b[id]; if (b.pal && (b.type === 'core' || b.type === 'storage')) { const pal = P.get(s, b.pal); if (pal) m *= 1 + P.skill(pal, 'transport') * B.pals.skillStep; } }
    return m;
  };
  F.powerSupply.push((s) => {
    let add = 0;
    for (const id in s.factory.b) {
      const b = s.factory.b[id];
      if (!b.pal || !(b.type === 'power' || b.type === 'solar' || b.type === 'core')) continue;
      if (b.type === 'power' && b.state === 'nofuel') continue;
      const pal = P.get(s, b.pal);
      if (pal) add += (F.BUILDINGS[b.type].power) * P.skill(pal, 'power') * B.pals.skillStep;
    }
    return add;
  });
  const prevRemove = F.onRemove;
  F.onRemove = (s, b) => { if (prevRemove) prevRemove(s, b); if (b.pal) { const pal = P.get(s, b.pal); if (pal) pal.at = null; } };
  /** 戦闘で一緒に戦う相棒（防衛） */
  P.partner = function (s) { return s.pals.partner ? P.get(s, s.pals.partner) : null; };

  // ---------- 問題を解いたとき ----------
  G.on('answer', (s, d) => {
    if (!d.ok) return;
    const pl = s.pals;
    // 経験値：同じ分野の相棒はたくさん、ほかの相棒は少し
    for (const pal of pl.list) {
      const xp = pal.topic === d.topic ? B.pals.xpTopic * (d.level + 1) : B.pals.xpOther;
      P.gainXP(s, pal, xp);
    }
    // 孵化の進み
    for (const e of pl.eggs) if (e.prog < e.need) { e.prog++; if (e.prog === e.need) G.notice(s, { type: 'eggReady', text: '🐣 卵がかえりそう！相棒の画面で孵化させよう', id: e.id }); }
    // 卵が出る
    if (!d.first || d.mode === 'exam') return;
    pl.sinceEgg++;
    const chance = B.pals.eggChance + Math.min(20, d.combo || 0) * B.pals.eggComboBonus + (d.level || 0) * 0.01;
    if (pl.sinceEgg >= B.pals.eggPity || U.rand(s) < chance) {
      if (P.addEgg(s, d.topic, d.now, (d.combo || 0) >= 10 ? 0.05 : 0)) pl.sinceEgg = 0;
    }
  });

  G.register({
    id: 'pals',
    init(s) { s.pals = { list: [], eggs: [], dex: {}, nextId: 0, sinceEgg: 0, partner: null }; },
  });
  MF.Pals = P;
})(globalThis.MF = globalThis.MF || {});
