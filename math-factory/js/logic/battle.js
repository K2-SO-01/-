/* 数学ファクトリー：カードバトル（襲撃の防衛戦と、何連戦も続く「侵攻ラン」）
 * カードを使うには、そのカードについた数学の問題に正解する必要がある。
 * 画面からは requestPlay → (出題・解答) → resolvePlay の順に呼ぶ。シミュレーションからも同じ関数を使う。 */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, F = MF.Factory, B = MF.Balance, Qs = MF.Questions;
  const Bt = {};
  B.battle = {
    playerHp: 60, energy: 3, hand: 5, critSec: 15, critMult: 1.25,
    raidMeter: 30, raidMinCorrect: 25, raidCountdownSec: 600, raidHpGrowth: 0.17, raidHpCap: 3.2, raidTierEvery: 1.5,
    turretBase: 2, turretPerLvl: 1.5, runFloors: 10, restHeal: 0.35, eliteEvery: 5,
  };

  // ---------- カード ----------
  // fx: dmg, hits, dmgAll, block, str, dex, vuln, weak, vulnAll, weakAll, draw, energy, heal, poison, metal, ritual, doubleBlock
  Bt.CARDS = {
    strike:   { name: 'ベクトル打撃', type: 'attack', cost: 1, rarity: 0, fx: { dmg: 6 }, up: { dmg: 9 } },
    defend:   { name: '防御関数', type: 'skill', cost: 1, rarity: 0, fx: { block: 5 }, up: { block: 8 } },
    tangent:  { name: '接線スラッシュ', type: 'attack', cost: 2, rarity: 0, fx: { dmg: 8, vuln: 2 }, up: { dmg: 10, vuln: 3 } },
    twin:     { name: '二重積分', type: 'attack', cost: 1, rarity: 1, fx: { dmg: 4, hits: 2 }, up: { dmg: 6, hits: 2 } },
    rush:     { name: '数列ラッシュ', type: 'attack', cost: 1, rarity: 1, fx: { dmg: 3, hits: 3 }, up: { dmg: 4, hits: 3 } },
    shock:    { name: '微分ショック', type: 'attack', cost: 1, rarity: 1, fx: { dmg: 6, weak: 1 }, up: { dmg: 8, weak: 2 } },
    wave:     { name: '三角関数の波', type: 'attack', cost: 1, rarity: 1, fx: { dmgAll: 5 }, up: { dmgAll: 8 } },
    probShield: { name: '確率の盾', type: 'skill', cost: 1, rarity: 1, fx: { block: 5, draw: 1 }, up: { block: 7, draw: 1 } },
    complement: { name: '余事象ガード', type: 'skill', cost: 2, rarity: 1, fx: { block: 13 }, up: { block: 17 } },
    unitCircle: { name: '単位円バリア', type: 'skill', cost: 0, rarity: 1, fx: { block: 3 }, up: { block: 5 } },
    complete: { name: '平方完成', type: 'power', cost: 1, rarity: 1, fx: { str: 2 }, up: { str: 3 } },
    partial:  { name: '部分積分', type: 'skill', cost: 1, rarity: 1, fx: { draw: 2 }, up: { draw: 3 } },
    diverge:  { name: '発散', type: 'attack', cost: 1, rarity: 1, fx: { poison: 5 }, up: { poison: 7 } },
    logScale: { name: '対数スケール', type: 'attack', cost: 2, rarity: 2, fx: { dmg: 15 }, up: { dmg: 20 } },
    projection: { name: '正射影ビーム', type: 'attack', cost: 2, rarity: 2, fx: { dmgAll: 9, vulnAll: 1 }, up: { dmgAll: 12, vulnAll: 1 } },
    expect:   { name: '期待値ブースト', type: 'power', cost: 1, rarity: 2, fx: { dex: 2 }, up: { dex: 3 } },
    recur:    { name: '漸化式チャージ', type: 'skill', cost: 0, rarity: 2, fx: { energy: 1, draw: 1 }, up: { energy: 2, draw: 1 } },
    ivt:      { name: '中間値の定理', type: 'skill', cost: 1, rarity: 2, fx: { heal: 6 }, up: { heal: 9 } },
    doubleAngle: { name: '2倍角の公式', type: 'skill', cost: 1, rarity: 2, fx: { doubleBlock: 1 }, up: { doubleBlock: 1, block: 4 } },
    contra:   { name: '背理法', type: 'skill', cost: 1, rarity: 2, fx: { vuln: 2, weak: 2 }, up: { vuln: 3, weak: 3 } },
    exponent: { name: '指数爆発', type: 'attack', cost: 3, rarity: 3, fx: { dmg: 30 }, up: { dmg: 40 } },
    deMoivre: { name: 'ド・モアブル回転', type: 'attack', cost: 2, rarity: 3, fx: { dmg: 5, hits: 4 }, up: { dmg: 6, hits: 5 } },
    constC:   { name: '積分定数C', type: 'power', cost: 2, rarity: 3, fx: { metal: 4 }, up: { metal: 6 } },
    induction: { name: '数学的帰納法', type: 'power', cost: 2, rarity: 3, fx: { ritual: 1 }, up: { ritual: 2 } },
  };
  Bt.RARITY = ['基本', 'コモン', 'アンコモン', 'レア'];
  Bt.cardId = (c) => c.replace('+', '');
  Bt.isUp = (c) => c.endsWith('+');
  Bt.cardFx = function (c) { const d = Bt.CARDS[Bt.cardId(c)]; return Bt.isUp(c) ? Object.assign({}, d.fx, d.up) : d.fx; };
  Bt.cardName = (c) => Bt.CARDS[Bt.cardId(c)].name + (Bt.isUp(c) ? '+' : '');
  Bt.describe = function (c) {
    const fx = Bt.cardFx(c), p = [];
    if (fx.dmg) p.push(fx.dmg + 'ダメージ' + (fx.hits > 1 ? '×' + fx.hits + '回' : ''));
    if (fx.dmgAll) p.push('敵全体に' + fx.dmgAll + 'ダメージ');
    if (fx.poison) p.push('毒' + fx.poison + '（毎ターンダメージ）');
    if (fx.block) p.push('ブロック' + fx.block);
    if (fx.doubleBlock) p.push('ブロックを2倍にする');
    if (fx.vuln) p.push('脆弱' + fx.vuln);
    if (fx.weak) p.push('弱体' + fx.weak);
    if (fx.vulnAll) p.push('全体に脆弱' + fx.vulnAll);
    if (fx.str) p.push('筋力+' + fx.str);
    if (fx.dex) p.push('敏捷+' + fx.dex);
    if (fx.draw) p.push(fx.draw + '枚引く');
    if (fx.energy) p.push('エネルギー+' + fx.energy);
    if (fx.heal) p.push('HPを' + fx.heal + '回復');
    if (fx.metal) p.push('毎ターン終了時にブロック' + fx.metal);
    if (fx.ritual) p.push('毎ターン筋力+' + fx.ritual);
    return p.join('、');
  };
  Bt.needsTarget = function (c) { const fx = Bt.cardFx(c); return !!(fx.dmg || fx.vuln || fx.weak || fx.poison); };
  Bt.STARTER = ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'tangent'];

  // ---------- レリック ----------
  Bt.RELICS = {
    calc:     { name: '電卓のお守り', icon: '🧮', desc: '最初のターン、エネルギー+1。' },
    note:     { name: '公式ノート', icon: '📓', desc: '戦闘開始時、筋力+1。' },
    helmet:   { name: '安全ヘルメット', icon: '⛑️', desc: '戦闘開始時、ブロック8。' },
    redpen:   { name: '赤ペン', icon: '🖍️', desc: '問題をまちがえても、カードの効果が半分出る。' },
    clock:    { name: 'ストップウォッチ', icon: '⏱️', desc: '10秒以内に正解すると1枚引く。' },
    grid:     { name: '方眼紙', icon: '📐', desc: '最大HP+10。' },
    eraser:   { name: '消しゴム', icon: '🧽', desc: '戦闘ごとに1回、まちがえた問題をやり直せる。' },
    compass:  { name: 'コンパス', icon: '🧭', desc: '砲台のダメージ+50%。' },
    marker:   { name: '蛍光ペン', icon: '🖊️', desc: '毎ターン最初のカードのコスト-1。' },
    omamori:  { name: '合格祈願のお守り', icon: '🎋', desc: 'HPが30%を切ったとき、1回だけブロック15。' },
    wordbook: { name: '単語帳', icon: '📇', desc: '戦闘に勝つとHPを5回復。' },
    looseleaf: { name: 'ルーズリーフ', icon: '🗒️', desc: '毎ターン1枚多く引く。' },
  };
  Bt.RELIC_IDS = Object.keys(Bt.RELICS);

  // ---------- 敵（赤い異星生物） ----------
  Bt.ENEMIES = {
    grub:    { name: 'ベニムシ', hp: [11, 15], look: { body: 'grub', eyes: 2 }, moves: [{ k: 'atk', dmg: 5 }, { k: 'atk', dmg: 6 }, { k: 'def', block: 5 }] },
    wing:    { name: 'アカハネ', hp: [9, 12], look: { body: 'wing', eyes: 3 }, moves: [{ k: 'atk', dmg: 3, hits: 2 }, { k: 'debuff', weak: 1, dmg: 2 }] },
    spitter: { name: 'ヨウガンガエル', hp: [18, 22], look: { body: 'frog', eyes: 2 }, moves: [{ k: 'atk', dmg: 8 }, { k: 'buff', str: 2 }, { k: 'atk', dmg: 4, vuln: 1 }] },
    beast:   { name: 'クレナイジュウ', hp: [28, 34], look: { body: 'beast', eyes: 4 }, moves: [{ k: 'atk', dmg: 10 }, { k: 'atk', dmg: 5, hits: 2 }, { k: 'buff', str: 2, block: 6 }] },
    shell:   { name: '紅甲殻ガルド', hp: [50, 56], elite: true, look: { body: 'shell', eyes: 2 }, moves: [{ k: 'def', block: 12, dmg: 6 }, { k: 'atk', dmg: 14 }, { k: 'atk', dmg: 4, hits: 3 }] },
    spore:   { name: 'ホウシノカタマリ', hp: [44, 48], elite: true, look: { body: 'spore', eyes: 5 }, moves: [{ k: 'debuff', weak: 2, vuln: 2 }, { k: 'atk', dmg: 12 }, { k: 'atk', dmg: 6, hits: 2 }] },
    queen:   { name: '紅蓮の女王クリムゾネア', hp: [95, 100], boss: true, look: { body: 'queen', eyes: 6 }, pattern: 'cycle', moves: [{ k: 'atk', dmg: 13 }, { k: 'atk', dmg: 3, hits: 4 }, { k: 'buff', str: 2, block: 12 }, { k: 'debuff', weak: 2, vuln: 2, dmg: 5 }] },
  };
  Bt.ENCOUNTERS = [
    [['grub'], ['wing', 'wing'], ['grub']],
    [['grub', 'wing'], ['spitter'], ['grub', 'grub']],
    [['beast'], ['spitter', 'wing'], ['grub', 'grub', 'wing']],
    [['beast', 'grub'], ['spitter', 'spitter'], ['beast', 'wing']],
  ];
  Bt.ELITES = [['shell'], ['spore'], ['shell', 'wing']];

  // ---------- 戦闘の準備 ----------
  function mkEnemy(s, type, hpMult, idx) {
    const d = Bt.ENEMIES[type];
    const hp = Math.round(U.randInt(s, d.hp[0], d.hp[1]) * hpMult);
    const e = { idx, type, name: d.name, hp, maxHp: hp, block: 0, str: 0, vuln: 0, weak: 0, poison: 0, mi: -1, hist: [] };
    pickIntent(s, e);
    return e;
  }
  function pickIntent(s, e) {
    const d = Bt.ENEMIES[e.type];
    let mi;
    if (d.pattern === 'cycle') mi = (e.mi + 1) % d.moves.length;
    else {
      let guard = 0;
      do { mi = U.randInt(s, 0, d.moves.length - 1); guard++; } while (guard < 10 && e.hist.length >= 2 && e.hist[e.hist.length - 1] === mi && e.hist[e.hist.length - 2] === mi);
    }
    e.mi = mi; e.hist.push(mi); if (e.hist.length > 4) e.hist.shift();
    e.intent = Object.assign({}, d.moves[mi]);
  }
  Bt.relics = function (s, bt) { return bt.kind === 'run' ? s.battle.run.relics : s.battle.equipped; };
  Bt.has = function (s, bt, r) { return Bt.relics(s, bt).indexOf(r) >= 0; };
  Bt.maxHp = function (s, kind) {
    let hp = B.battle.playerHp + (s.battle.hpBonus || 0);
    const rel = kind === 'run' ? s.battle.run.relics : s.battle.equipped;
    if (rel.indexOf('grid') >= 0) hp += 10;
    return hp;
  };
  /** 戦闘開始。kind: 'raid' | 'run'。enemies: 敵の種類の配列 */
  Bt.start = function (s, kind, enemies, opts) {
    opts = opts || {};
    const hpMult = opts.hpMult || 1;
    const deck = kind === 'run' ? s.battle.run.deck.slice() : s.battle.deck.slice();
    const maxHp = kind === 'run' ? s.battle.run.maxHp : Bt.maxHp(s, 'raid');
    const hp = kind === 'run' ? s.battle.run.hp : maxHp;
    const bt = {
      kind, tier: opts.tier || 0, elite: !!opts.elite, boss: !!opts.boss, raidNo: opts.raidNo || 0,
      player: { hp, maxHp, block: 0, energy: 0, maxEnergy: B.battle.energy, str: 0, dex: 0, vuln: 0, weak: 0, metal: 0, ritual: 0 },
      enemies: enemies.map((t, i) => mkEnemy(s, t, hpMult, i)),
      draw: shuffle(s, deck), hand: [], discard: [], turn: 0, log: [], pending: null, over: null,
      flags: { eraser: true, omamori: true, firstCard: true }, played: 0, correct: 0, wrong: 0, turretShots: 0,
    };
    s.battle.active = bt;
    const rel = Bt.relics(s, bt);
    if (rel.indexOf('note') >= 0) bt.player.str += 1;
    if (rel.indexOf('helmet') >= 0) bt.player.block += 8;
    // 戦闘の相棒
    const pal = MF.Pals && MF.Pals.partner(s);
    if (pal) {
      const d = MF.Pals.skill(pal, 'defense');
      bt.player.block += 3 + Math.round(d * 3);
      if (d >= 2) bt.player.str += 1;
      bt.partner = { id: pal.id, sp: pal.sp, name: pal.name, def: d };
    }
    log(bt, '⚔️ 戦闘開始！ ' + bt.enemies.map((e) => e.name).join('・') + ' があらわれた');
    G.emit(s, 'battleStart', { kind, boss: bt.boss, elite: bt.elite });
    startTurn(s, bt);
    return bt;
  };
  function shuffle(s, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(U.rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function log(bt, t) { bt.log.push(t); if (bt.log.length > 40) bt.log.shift(); }
  function drawCards(s, bt, n) {
    for (let i = 0; i < n; i++) {
      if (!bt.draw.length) { if (!bt.discard.length) return; bt.draw = shuffle(s, bt.discard); bt.discard = []; }
      if (bt.hand.length >= 10) return;
      bt.hand.push(bt.draw.pop());
    }
  }
  Bt.alive = (bt) => bt.enemies.filter((e) => e.hp > 0);
  function startTurn(s, bt) {
    bt.turn++;
    const p = bt.player;
    p.block = bt.turn === 1 ? p.block : 0;
    p.energy = p.maxEnergy + (bt.turn === 1 && Bt.has(s, bt, 'calc') ? 1 : 0);
    if (p.ritual) p.str += p.ritual;
    bt.flags.firstCard = true;
    drawCards(s, bt, B.battle.hand + (Bt.has(s, bt, 'looseleaf') ? 1 : 0));
    // 砲台の援護射撃（防衛戦のみ）
    if (bt.kind === 'raid') turretFire(s, bt);
    // 同盟国の援護（銀河に出てから）
    const ally = bt.kind === 'raid' && MF.Galaxy ? MF.Galaxy.allyFire(s) : 0;
    if (ally > 0) { const alive = Bt.alive(bt); if (alive.length) { const e = alive[Math.floor(U.rand(s) * alive.length)]; const d = hurtEnemy(e, ally); log(bt, '🛰️ 同盟国の援護射撃！ ' + e.name + ' に ' + d + ' ダメージ'); } }
    checkOver(s, bt);
  }
  Bt.turrets = function (s) {
    const out = [];
    for (const id in s.factory.b) { const b = s.factory.b[id]; if (b.type === 'turret' && !b.disabled) out.push(b); }
    return out;
  };
  Bt.turretDamage = function (s, b, bt) { return Math.round((B.battle.turretBase + B.battle.turretPerLvl * (b.lvl - 1)) * (bt && Bt.has(s, bt, 'compass') ? 1.5 : 1)); };
  function takeAmmo(s, b) {
    if ((b.inBuf.ammo || 0) >= 1) { b.inBuf.ammo -= 1; return true; }
    if ((s.inv.ammo || 0) >= 1) { s.inv.ammo -= 1; return true; }
    return false;
  }
  function turretFire(s, bt) {
    for (const t of Bt.turrets(s)) {
      const alive = Bt.alive(bt);
      if (!alive.length) return;
      if (!takeAmmo(s, t)) continue;
      const e = alive[Math.floor(U.rand(s) * alive.length)];
      const dmg = hurtEnemy(e, Bt.turretDamage(s, t, bt));
      bt.turretShots++;
      log(bt, '🗼 砲台が ' + e.name + ' に ' + dmg + ' ダメージ');
    }
  }
  function hurtEnemy(e, amount) {
    let d = Math.max(0, Math.floor(amount));
    const blocked = Math.min(e.block, d);
    e.block -= blocked; d -= blocked;
    e.hp = Math.max(0, e.hp - d);
    return d;
  }
  function hurtPlayer(s, bt, amount) {
    const p = bt.player;
    let d = Math.max(0, Math.floor(amount));
    const blocked = Math.min(p.block, d);
    p.block -= blocked; d -= blocked;
    p.hp = Math.max(0, p.hp - d);
    if (bt.flags.omamori && Bt.has(s, bt, 'omamori') && p.hp > 0 && p.hp < p.maxHp * 0.3) { bt.flags.omamori = false; p.block += 15; log(bt, '🎋 お守りが光った！ ブロック15'); }
    return d;
  }
  Bt.calcDmg = function (base, str, weak, vuln, mult) {
    let v = (base + str) * (mult || 1);
    if (weak > 0) v *= 0.75;
    if (vuln > 0) v *= 1.5;
    return Math.max(0, Math.floor(v));
  };

  // ---------- カードを使う ----------
  Bt.cost = function (s, bt, c) {
    let cost = Bt.CARDS[Bt.cardId(c)].cost;
    if (bt.flags.firstCard && Bt.has(s, bt, 'marker')) cost = Math.max(0, cost - 1);
    return cost;
  };
  /** カードを使う準備。問題に正解したら resolvePlay(true) */
  Bt.requestPlay = function (s, handIdx, target) {
    const bt = s.battle.active;
    if (!bt || bt.over || bt.pending) return { ok: false, reason: '今は使えない' };
    const c = bt.hand[handIdx];
    if (!c) return { ok: false, reason: 'カードがない' };
    const cost = Bt.cost(s, bt, c);
    if (cost > bt.player.energy) return { ok: false, reason: 'エネルギーが足りない' };
    const alive = Bt.alive(bt);
    let t = target;
    if (t === undefined || t === null || !bt.enemies[t] || bt.enemies[t].hp <= 0) t = alive.length ? alive[0].idx : 0;
    bt.pending = { handIdx, card: c, target: t, cost };
    return { ok: true, card: c, q: Bt.questionOpts(s, bt, c) };
  };
  /** カードに対応する問題の分野と難易度 */
  Bt.questionOpts = function (s, bt, c) {
    const avail = G.availableTopics(s);
    const topic = U.randPick(s, avail);
    let level = G.Quiz.levelFor(s, topic);
    if ((bt.elite || bt.boss) && level < 2 && U.rand(s) < 0.5) level++;
    return { topic, level, mode: 'battle', source: 'card' };
  };
  Bt.cancelPlay = function (s) { const bt = s.battle.active; if (bt) bt.pending = null; };
  /** 解答結果を反映。ok: 正解か, ms: かかった時間 */
  Bt.resolvePlay = function (s, ok, ms) {
    const bt = s.battle.active;
    if (!bt || !bt.pending) return null;
    const pd = bt.pending;
    bt.pending = null;
    const p = bt.player;
    if (!ok && bt.flags.eraser && Bt.has(s, bt, 'eraser') && !pd.retried) { bt.flags.eraser = false; pd.retried = true; bt.pending = pd; log(bt, '🧽 消しゴムでやり直し！'); return { retry: true }; }
    p.energy -= pd.cost;
    bt.flags.firstCard = false;
    bt.hand.splice(pd.handIdx, 1);
    const type = Bt.CARDS[Bt.cardId(pd.card)].type;
    if (type !== 'power') bt.discard.push(pd.card);
    bt.played++;
    let mult = 0;
    const crit = ok && ms !== undefined && ms <= B.battle.critSec * 1000;
    if (ok) { mult = crit ? B.battle.critMult : 1; bt.correct++; }
    else { bt.wrong++; if (Bt.has(s, bt, 'redpen')) mult = 0.5; }
    const res = { ok, crit, card: pd.card, fizzle: mult === 0 };
    if (mult > 0) applyFx(s, bt, Bt.cardFx(pd.card), pd.target, mult, res);
    else log(bt, '💨 ' + Bt.cardName(pd.card) + ' は不発…');
    if (ok && ms !== undefined && ms <= 10000 && Bt.has(s, bt, 'clock')) drawCards(s, bt, 1);
    checkOver(s, bt);
    return res;
  };
  function applyFx(s, bt, fx, ti, mult, res) {
    const p = bt.player;
    const tgt = bt.enemies[ti];
    const name = Bt.cardName(res.card);
    const parts = [];
    if (fx.dmg && tgt) {
      const hits = fx.hits || 1;
      let total = 0;
      for (let i = 0; i < hits; i++) { if (tgt.hp <= 0) break; total += hurtEnemy(tgt, Bt.calcDmg(fx.dmg, p.str, p.weak, tgt.vuln, mult)); }
      parts.push(tgt.name + 'に' + total + 'ダメージ');
      res.dmg = total;
    }
    if (fx.dmgAll) { let total = 0; for (const e of Bt.alive(bt)) total += hurtEnemy(e, Bt.calcDmg(fx.dmgAll, p.str, p.weak, e.vuln, mult)); parts.push('全体に計' + total + 'ダメージ'); res.dmg = total; }
    if (fx.poison && tgt) { tgt.poison += Math.round(fx.poison * mult); parts.push('毒' + Math.round(fx.poison * mult)); }
    if (fx.vuln && tgt) tgt.vuln += fx.vuln;
    if (fx.weak && tgt) tgt.weak += fx.weak;
    if (fx.vulnAll) for (const e of Bt.alive(bt)) e.vuln += fx.vulnAll;
    if (fx.doubleBlock) { p.block *= 2; parts.push('ブロック2倍'); }
    if (fx.block) { const v = Math.floor((fx.block + p.dex) * mult); p.block += v; parts.push('ブロック+' + v); res.block = v; }
    if (fx.str) { p.str += fx.str; parts.push('筋力+' + fx.str); }
    if (fx.dex) { p.dex += fx.dex; parts.push('敏捷+' + fx.dex); }
    if (fx.draw) drawCards(s, bt, fx.draw);
    if (fx.energy) p.energy += fx.energy;
    if (fx.heal) { const v = Math.round(fx.heal * mult); p.hp = Math.min(p.maxHp, p.hp + v); parts.push('HP+' + v); }
    if (fx.metal) p.metal += fx.metal;
    if (fx.ritual) p.ritual += fx.ritual;
    log(bt, (res.crit ? '💥会心！ ' : '✨ ') + name + '：' + (parts.join('、') || '発動'));
  }
  /** ターン終了 → 敵の行動 → 次のターン */
  Bt.endTurn = function (s) {
    const bt = s.battle.active;
    if (!bt || bt.over || bt.pending) return null;
    const p = bt.player;
    bt.discard.push(...bt.hand); bt.hand = [];
    if (p.metal) p.block += p.metal;
    if (p.vuln > 0) p.vuln--;
    if (p.weak > 0) p.weak--;
    const acts = [];
    for (const e of Bt.alive(bt)) {
      e.block = 0;
      if (e.poison > 0) { e.hp = Math.max(0, e.hp - e.poison); acts.push(e.name + 'は毒で' + e.poison + 'ダメージ'); e.poison--; if (e.hp <= 0) continue; }
      const it = e.intent;
      if (it.block) e.block += it.block;
      if (it.str) e.str += it.str;
      if (it.dmg) {
        const hits = it.hits || 1;
        let total = 0;
        for (let i = 0; i < hits; i++) total += hurtPlayer(s, bt, Bt.calcDmg(it.dmg, e.str, e.weak, p.vuln, 1));
        acts.push(e.name + 'の攻撃！ ' + total + 'ダメージ');
      }
      if (it.weak) p.weak += it.weak;
      if (it.vuln) p.vuln += it.vuln;
      if (it.k === 'def') acts.push(e.name + 'は守りをかためた');
      if (it.k === 'buff') acts.push(e.name + 'は力をためた');
      if (it.k === 'debuff') acts.push(e.name + 'の妨害！');
      if (e.vuln > 0) e.vuln--;
      if (e.weak > 0) e.weak--;
      pickIntent(s, e);
      if (p.hp <= 0) break;
    }
    acts.forEach((a) => log(bt, '👾 ' + a));
    checkOver(s, bt);
    if (!bt.over) startTurn(s, bt);
    return acts;
  };
  function checkOver(s, bt) {
    if (bt.over) return;
    if (bt.player.hp <= 0) { bt.over = 'lose'; log(bt, '💀 やられてしまった…'); }
    else if (!Bt.alive(bt).length) { bt.over = 'win'; log(bt, '🏆 勝利！'); }
  }
  /** 敵の行動予告（画面表示用） */
  Bt.intentText = function (bt, e) {
    const it = e.intent;
    const p = bt.player;
    const parts = [];
    if (it.dmg) { const d = Bt.calcDmg(it.dmg, e.str, e.weak, p.vuln, 1); parts.push('⚔️' + d + (it.hits > 1 ? '×' + it.hits : '')); }
    if (it.block) parts.push('🛡️' + it.block);
    if (it.str) parts.push('💪+' + it.str);
    if (it.weak || it.vuln) parts.push('☠️' + (it.weak ? '弱体' : '') + (it.vuln ? '脆弱' : ''));
    return parts.join(' ');
  };

  // ---------- 報酬 ----------
  Bt.cardChoices = function (s, n, rareBoost) {
    const pool = Object.keys(Bt.CARDS).filter((k) => Bt.CARDS[k].rarity > 0);
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const r = U.rand(s) - (rareBoost || 0);
      const want = r < 0.1 ? 3 : r < 0.4 ? 2 : 1;
      const cands = pool.filter((k) => Bt.CARDS[k].rarity === want && out.indexOf(k) < 0);
      if (cands.length) out.push(U.randPick(s, cands));
    }
    return out;
  };
  Bt.randomRelic = function (s, owned) {
    const pool = Bt.RELIC_IDS.filter((r) => owned.indexOf(r) < 0);
    return pool.length ? U.randPick(s, pool) : null;
  };

  // ---------- 襲撃（防衛戦） ----------
  Bt.raidStrength = function (s) { return s.battle.raids; };
  Bt.raidEnemies = function (s) {
    const n = s.battle.raids;
    const elite = n > 0 && (n + 1) % B.battle.eliteEvery === 0;
    if (elite) return { enemies: U.randPick(s, Bt.ELITES), elite: true, tier: 2 };
    const tier = Math.min(3, Math.floor(n / B.battle.raidTierEvery));
    return { enemies: U.randPick(s, Bt.ENCOUNTERS[tier]), elite: false, tier };
  };
  Bt.raidHpMult = function (s) { return Math.min(B.battle.raidHpCap, 1 + B.battle.raidHpGrowth * s.battle.raids); };
  Bt.startRaid = function (s, now) {
    const r = s.battle.raid;
    if (!r.pending) return null;
    const plan = r.pending.plan;
    return Bt.start(s, 'raid', plan.enemies, { hpMult: Bt.raidHpMult(s), elite: plan.elite, tier: plan.tier, raidNo: s.battle.raids + 1 });
  };
  /** 襲撃の結果を確定（勝ち：報酬、負け：設備が壊れる） */
  Bt.finishRaid = function (s, now) {
    const bt = s.battle.active;
    if (!bt || bt.kind !== 'raid' || !bt.over) return null;
    const win = bt.over === 'win';
    const out = { win };
    s.battle.raids++;
    s.battle.raid.pending = null;
    s.battle.raid.meter = 0;
    if (win) {
      s.battle.raidWins++;
      const n = s.battle.raids;
      const bundle = { iron: 15 + 4 * n, copper: 10 + 3 * n, coal: 10 + 2 * n, stone: 10 + 3 * n, rp: 10 + 3 * n };
      if (bt.elite) for (const k of Object.keys(bundle)) bundle[k] *= 2;
      G.give(s, bundle);
      out.bundle = bundle;
      out.cards = Bt.cardChoices(s, 3, bt.elite ? 0.15 : 0);
      if (bt.elite || U.rand(s) < 0.2) { const r = Bt.randomRelic(s, s.battle.relics); if (r) { s.battle.relics.push(r); out.relic = r; if (s.battle.equipped.length < 3) s.battle.equipped.push(r); } }
      if (Bt.has(s, bt, 'wordbook')) { /* 防衛戦はHPが毎回全回復なので効果なし */ }
      G.emit(s, 'raidWin', { elite: bt.elite, n });
    } else {
      out.damaged = Bt.damageFactory(s, 1 + Math.min(2, Math.floor(s.battle.raids / 4)));
      G.emit(s, 'raidLose', {});
    }
    s.battle.active = null;
    s.battle.lastRaid = now;
    return out;
  };
  /** 設備を壊す（襲撃に負けた／放っておいた） */
  Bt.damageFactory = function (s, n) {
    const cands = Object.values(s.factory.b).filter((b) => b.type !== 'core' && b.type !== 'belt' && !b.disabled);
    const out = [];
    for (let i = 0; i < n && cands.length; i++) {
      const k = Math.floor(U.rand(s) * cands.length);
      const b = cands.splice(k, 1)[0];
      b.disabled = true; out.push(b.type);
    }
    s.factory.damaged = (s.factory.damaged || 0) + out.length;
    return out;
  };
  F.repairCost = function (s, b) { const c = F.costOf(s, b.type), o = {}; for (const k of Object.keys(c)) o[k] = Math.ceil(c[k] * 0.5); return o; };
  F.repair = function (s, id) {
    const b = s.factory.b[id];
    if (!b || !b.disabled) return { ok: false, reason: '壊れていない' };
    const cost = F.repairCost(s, b);
    if (!G.pay(s, cost)) return { ok: false, reason: '資源が足りない：' + G.costText(cost) };
    b.disabled = false;
    G.emit(s, 'repair', {});
    return { ok: true };
  };
  /** 時間切れで迎え撃たなかった：砲台だけで戦う */
  Bt.autoResolve = function (s, now) {
    const r = s.battle.raid;
    if (!r.pending) return null;
    const plan = r.pending.plan;
    const hp = plan.enemies.reduce((a, t) => a + (Bt.ENEMIES[t].hp[0] + Bt.ENEMIES[t].hp[1]) / 2, 0) * Bt.raidHpMult(s);
    let dmg = 0;
    for (let turn = 0; turn < 4; turn++) for (const t of Bt.turrets(s)) if (takeAmmo(s, t)) dmg += Bt.turretDamage(s, t, null);
    s.battle.raids++;
    r.pending = null; r.meter = 0;
    s.battle.lastRaid = now;
    if (dmg >= hp) { s.battle.raidWins++; G.notice(s, { type: 'good', text: '🗼 砲台だけで襲撃を撃退した！' }); return { win: true, auto: true }; }
    const damaged = Bt.damageFactory(s, 1 + Math.min(2, Math.floor(s.battle.raids / 4)));
    G.notice(s, { type: 'bad', text: '💥 襲撃を受けて設備が ' + damaged.length + ' 個壊れた…（工場で修理できる）', ms: 5000 });
    return { win: false, auto: true, damaged };
  };
  G.on('answer', (s, d) => {
    if (!d.ok || d.mode === 'battle') return;
    const r = s.battle.raid;
    if (s.stats.correct < B.battle.raidMinCorrect && !s.battle.forceRaids) return;
    if (!r.pending) r.meter += 1;
  });
  /** 留守にしていたあいだは襲撃のカウントダウンを止める（いないあいだに負けるのは不公平なので） */
  Bt.pauseRaid = function (s, awaySec) {
    const r = s.battle.raid;
    if (r.pending && awaySec > 0) r.pending.deadline += awaySec * 1000;
  };
  Bt.checkRaid = function (s, now) {
    const r = s.battle.raid;
    if (r.pending) {
      if (!s.battle.active && now > r.pending.deadline) Bt.autoResolve(s, now);
      return;
    }
    if (r.meter >= B.battle.raidMeter) {
      r.pending = { at: now, deadline: now + B.battle.raidCountdownSec * 1000, plan: Bt.raidEnemies(s) };
      G.notice(s, { type: 'raid', text: '⚠️ 赤い異星生物の群れが接近中！ ' + Math.round(B.battle.raidCountdownSec / 60) + '分以内に「防衛」で迎え撃とう', ms: 6000 });
      G.emit(s, 'raidWarn', {});
    }
  };

  // ---------- 侵攻ラン ----------
  Bt.NODE = { battle: { icon: '⚔️', name: '戦闘' }, elite: { icon: '💀', name: 'エリート' }, rest: { icon: '🔥', name: '休憩' }, treasure: { icon: '💎', name: '宝箱' }, event: { icon: '❓', name: '謎の信号' }, boss: { icon: '👑', name: 'ボス' } };
  Bt.startRun = function (s, now) {
    const maxHp = Bt.maxHp(s, 'raid');
    s.battle.run = { active: true, floor: 0, hp: maxHp, maxHp, deck: Bt.STARTER.slice(), relics: s.battle.equipped.slice(), options: null, started: now, kills: 0, log: [] };
    s.battle.runs++;
    Bt.nextFloor(s);
    G.emit(s, 'runStart', {});
    return s.battle.run;
  };
  Bt.nextFloor = function (s) {
    const run = s.battle.run;
    run.floor++;
    const f = run.floor;
    if (f >= B.battle.runFloors) { run.options = ['boss']; return; }
    const opts = ['battle'];
    const pool = f <= 2 ? ['battle', 'event', 'battle'] : ['battle', 'elite', 'rest', 'event', 'treasure', 'battle', 'rest'];
    while (opts.length < 3) { const o = U.randPick(s, pool); if (o === 'treasure' && opts.indexOf('treasure') >= 0) continue; opts.push(o); }
    run.options = U.rng(U.newSeed(s)).shuffle(opts).slice(0, f === 1 ? 2 : 3);
    if (f === 1) run.options = ['battle', 'battle'];
  };
  Bt.runTier = function (floor) { return Math.min(3, Math.floor((floor - 1) / 2.5)); };
  /** 侵攻ランでノードを選ぶ。戦闘ならバトル開始 */
  Bt.chooseNode = function (s, idx) {
    const run = s.battle.run;
    if (!run || !run.active || !run.options) return null;
    const node = run.options[idx];
    if (!node) return null;
    run.options = null;
    run.node = node;
    const f = run.floor;
    if (node === 'battle') return { node, battle: Bt.start(s, 'run', U.randPick(s, Bt.ENCOUNTERS[Bt.runTier(f)]), { hpMult: 1 + 0.03 * f, tier: Bt.runTier(f) }) };
    if (node === 'elite') return { node, battle: Bt.start(s, 'run', U.randPick(s, Bt.ELITES), { hpMult: 1 + 0.03 * f, elite: true, tier: 2 }) };
    if (node === 'boss') return { node, battle: Bt.start(s, 'run', ['queen'], { boss: true, tier: 3 }) };
    if (node === 'rest') { run.pendingRest = true; return { node }; }
    if (node === 'treasure') { const r = Bt.randomRelic(s, run.relics); if (r) run.relics.push(r); else run.hp = Math.min(run.maxHp, run.hp + 10); run.lastTreasure = r; Bt.nextFloor(s); return { node, relic: r }; }
    if (node === 'event') { run.pendingEvent = U.randPick(s, Bt.RUN_EVENTS).id; return { node, event: run.pendingEvent }; }
    return null;
  };
  Bt.rest = function (s, choice, cardIdx) {
    const run = s.battle.run;
    if (!run || !run.pendingRest) return false;
    if (choice === 'heal') run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * B.battle.restHeal));
    else if (choice === 'upgrade') { const c = run.deck[cardIdx]; if (!c || Bt.isUp(c)) return false; run.deck[cardIdx] = c + '+'; }
    run.pendingRest = false;
    Bt.nextFloor(s);
    return true;
  };
  // 謎の信号：数学の問題に答えて結果が変わる
  Bt.RUN_EVENTS = [
    { id: 'calc', title: '漂流する計算機', text: '古い計算機が問題を出してきた。「正解なら力を授けよう」', ok: { maxHp: 6, heal: 6 }, ng: { hp: -6 }, okText: '最大HP+6、HP+6', ngText: 'HP-6' },
    { id: 'forge', title: '異星の鍛冶場', text: '数式が刻まれた炉。正しい答えを入力すればカードを鍛えられる。', ok: { upgrade: 1 }, ng: { hp: -4 }, okText: 'ランダムなカード1枚を強化', ngText: 'やけどでHP-4' },
    { id: 'library', title: '星の図書館', text: '本棚に問題が浮かぶ。正解すれば新しい知識（カード）が手に入る。', ok: { card: 1 }, ng: { curse: 0 }, okText: 'レアなカードを1枚獲得', ngText: '何も起こらなかった' },
    { id: 'spring', title: '回復の泉', text: '泉のほとりに問題が書かれた石碑。', ok: { heal: 20 }, ng: { heal: 5 }, okText: 'HP+20', ngText: 'HP+5' },
  ];
  Bt.resolveEvent = function (s, ok) {
    const run = s.battle.run;
    if (!run || !run.pendingEvent) return null;
    const ev = Bt.RUN_EVENTS.find((e) => e.id === run.pendingEvent);
    const fx = ok ? ev.ok : ev.ng;
    const out = { text: ok ? ev.okText : ev.ngText };
    if (fx.maxHp) { run.maxHp += fx.maxHp; }
    if (fx.heal) run.hp = Math.min(run.maxHp, run.hp + fx.heal);
    if (fx.hp) run.hp = Math.max(1, run.hp + fx.hp);
    if (fx.upgrade) { const idx = run.deck.map((c, i) => [c, i]).filter(([c]) => !Bt.isUp(c)); if (idx.length) { const [c, i] = U.randPick(s, idx); run.deck[i] = c + '+'; out.text += '（' + Bt.cardName(c) + '）'; } }
    if (fx.card) { const c = Bt.cardChoices(s, 1, 0.3)[0]; run.deck.push(c); out.text += '（' + Bt.cardName(c) + '）'; }
    run.pendingEvent = null;
    Bt.nextFloor(s);
    return out;
  };
  /** ランの戦闘が終わったとき */
  Bt.finishRunBattle = function (s, now) {
    const bt = s.battle.active, run = s.battle.run;
    if (!bt || bt.kind !== 'run' || !bt.over || !run) return null;
    run.hp = bt.player.hp;
    run.kills += bt.enemies.length;
    s.battle.active = null;
    if (bt.over === 'lose') return Bt.endRun(s, false, now);
    if (Bt.has(s, { kind: 'run' }, 'wordbook')) run.hp = Math.min(run.maxHp, run.hp + 5);
    if (bt.boss) return Bt.endRun(s, true, now);
    const out = { win: true, cards: Bt.cardChoices(s, 3, bt.elite ? 0.15 : 0) };
    if (bt.elite) { const r = Bt.randomRelic(s, run.relics); if (r) { run.relics.push(r); out.relic = r; } }
    run.reward = out;
    return out;
  };
  Bt.takeRunCard = function (s, card) {
    const run = s.battle.run;
    if (!run || !run.reward) return false;
    if (card && run.reward.cards.indexOf(card) >= 0) run.deck.push(card);
    run.reward = null;
    Bt.nextFloor(s);
    return true;
  };
  Bt.endRun = function (s, cleared, now) {
    const run = s.battle.run;
    const floor = run.floor;
    const rp = Math.round(floor * 8 + (cleared ? 80 : 0));
    s.rp += rp;
    const out = { ended: true, cleared, floor, rp, kills: run.kills };
    if (floor > s.battle.bestFloor) s.battle.bestFloor = floor;
    if (cleared) { s.battle.runClears++; const r = Bt.randomRelic(s, s.battle.relics); if (r) { s.battle.relics.push(r); out.relic = r; } }
    if (floor >= 5 && MF.Pals) { const t = U.randPick(s, G.availableTopics(s)); if (MF.Pals.addEgg(s, t, now, cleared ? 0.1 : 0.03)) out.egg = t; }
    run.active = false;
    s.battle.lastRun = out;
    G.emit(s, 'runEnd', out);
    return out;
  };
  Bt.abandonRun = function (s, now) { if (s.battle.run && s.battle.run.active) { s.battle.active = null; return Bt.endRun(s, false, now); } return null; };

  // ---------- デッキ編集（防衛戦） ----------
  Bt.addToCollection = function (s, card) { s.battle.collection[card] = (s.battle.collection[card] || 0) + 1; };
  Bt.takeRaidCard = function (s, card) { if (!card) return; Bt.addToCollection(s, card); if (s.battle.deck.length < 25) s.battle.deck.push(card); };
  Bt.deckCount = function (s, card) { return s.battle.deck.filter((c) => c === card).length; };
  Bt.deckAdd = function (s, card) {
    if (Bt.deckCount(s, card) >= (s.battle.collection[card] || 0)) return false;
    if (s.battle.deck.length >= 25) return false;
    s.battle.deck.push(card); return true;
  };
  Bt.deckRemove = function (s, card) {
    if (s.battle.deck.length <= 8) return false;
    const i = s.battle.deck.indexOf(card); if (i < 0) return false;
    s.battle.deck.splice(i, 1); return true;
  };
  Bt.upgradeCost = function (card) { const r = Bt.CARDS[Bt.cardId(card)].rarity; return { gear: 4 + r * 4, circuit: 2 + r * 3 }; };
  Bt.upgradeCard = function (s, card) {
    if (Bt.isUp(card) || !(s.battle.collection[card] > 0)) return { ok: false, reason: '強化できない' };
    const cost = Bt.upgradeCost(card);
    if (!G.pay(s, cost)) return { ok: false, reason: '資源が足りない：' + G.costText(cost) };
    s.battle.collection[card]--;
    if (!s.battle.collection[card]) delete s.battle.collection[card];
    Bt.addToCollection(s, card + '+');
    const i = s.battle.deck.indexOf(card); if (i >= 0) s.battle.deck[i] = card + '+';
    return { ok: true };
  };
  Bt.equipRelic = function (s, r) {
    const eq = s.battle.equipped;
    const i = eq.indexOf(r);
    if (i >= 0) { eq.splice(i, 1); return true; }
    if (eq.length >= 3 || s.battle.relics.indexOf(r) < 0) return false;
    eq.push(r); return true;
  };

  // ---------- 砲台（研究「防衛工学」） ----------
  F.BUILDINGS.turret = { name: '砲台', short: '砲台', icon: '🗼', color: '#6b2a2a', cost: { ironPlate: 15, gear: 8, stone: 15 }, power: -1, desc: '襲撃の戦闘中、毎ターン敵を撃つ（弾薬を1発使う）。ベルトで弾薬を運ぶか、持ち物の弾薬を使う。' };
  F.RECIPES.ammo = { name: '弾薬', in: { ironPlate: 1, coal: 1 }, time: 2 };
  F.buildingLocks.turret = (s) => MF.Research ? MF.Research.has(s, 'military') : true;
  F.recipeLocks.ammo = (s) => MF.Research ? MF.Research.has(s, 'military') : true;
  F.extraRoom = F.extraRoom || {};
  F.extraRoom.turret = (s, b, item, scale) => (item === 'ammo' ? Math.max(0, 20 * scale - (b.inBuf.ammo || 0)) : 0);
  F.extraStep = F.extraStep || {};
  F.extraNeeds = F.extraNeeds || {};
  F.extraNeeds.turret = () => ['ammo'];
  F.extraStep.turret = (s, b) => { b.state = (b.inBuf.ammo || 0) >= 1 || (s.inv.ammo || 0) >= 1 ? 'work' : 'noinput'; return false; };

  G.register({
    id: 'battle',
    init(s) {
      const col = {};
      Bt.STARTER.forEach((c) => { col[c] = (col[c] || 0) + 1; });
      s.battle = { collection: col, deck: Bt.STARTER.slice(), relics: [], equipped: [], hpBonus: 0, active: null, run: null,
        raid: { meter: 0, pending: null }, raids: 0, raidWins: 0, runs: 0, runClears: 0, bestFloor: 0, lastRaid: 0, lastRun: null };
    },
    tick(s, dt, now) { Bt.checkRaid(s, now); },
  });
  MF.Battle = Bt;
})(globalThis.MF = globalThis.MF || {});
