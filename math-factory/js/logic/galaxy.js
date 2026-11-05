/* 数学ファクトリー：宇宙進出と勢力争い（ロケット・銀河マップ・ライバル帝国・ランダムイベント） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, F = MF.Factory, B = MF.Balance, Qs = MF.Questions;
  const GX = {};
  B.galaxy = { rocketParts: 10, colonyParts: 5, turnEvery: 8, turnSecs: 40, eventEvery: 22, eventChance: 0.55, eventMinCorrect: 20, colonyBonus: 0.3, focusBonus: 4, colonyIncome: 3 };

  // ---------- ロケット発射台 ----------
  F.BUILDINGS.silo = { name: 'ロケット発射台', short: '発射台', icon: '🚀', color: '#4a4f6b', cost: { ironPlate: 40, brick: 30, circuit: 20, gear: 20 }, power: -6, desc: 'ロケット部品を集めて打ち上げる。最初の打ち上げで、この星を脱出できる。' };
  F.RECIPES.rocketPart = { name: 'ロケット部品', in: { chip: 2, fuelCell: 1, brick: 4, gear: 2 }, time: 10 };
  F.buildingLocks.silo = (s) => MF.Research.has(s, 'rocketry');
  F.recipeLocks.rocketPart = (s) => MF.Research.has(s, 'rocketry');
  F.extraRoom.silo = (s, b, item, scale) => (item === 'rocketPart' ? Math.max(0, 40 - (b.inBuf.rocketPart || 0)) : 0);
  F.extraStep.silo = (s, b) => { b.state = (b.inBuf.rocketPart || 0) + (s.inv.rocketPart || 0) >= GX.partsNeeded(s) ? 'work' : 'noinput'; return false; };
  GX.silo = function (s) { return Object.values(s.factory.b).find((b) => b.type === 'silo' && !b.disabled) || null; };
  GX.partsNeeded = function (s) { return s.galaxy.unlocked ? B.galaxy.colonyParts : B.galaxy.rocketParts; };
  GX.partsHave = function (s) { const si = GX.silo(s); return (si ? Math.floor(si.inBuf.rocketPart || 0) : 0) + Math.floor(s.inv.rocketPart || 0); };
  GX.canLaunch = function (s) { return !!GX.silo(s) && GX.partsHave(s) >= GX.partsNeeded(s); };
  GX.launch = function (s, now) {
    if (!GX.canLaunch(s)) return { ok: false, reason: GX.silo(s) ? 'ロケット部品が足りない（' + GX.partsHave(s) + ' / ' + GX.partsNeeded(s) + '）' : 'ロケット発射台がない' };
    let need = GX.partsNeeded(s);
    const si = GX.silo(s);
    const fromSilo = Math.min(need, Math.floor(si.inBuf.rocketPart || 0));
    si.inBuf.rocketPart -= fromSilo; need -= fromSilo;
    s.inv.rocketPart -= need;
    const first = !s.galaxy.unlocked;
    if (first) { GX.generate(s, now); s.galaxy.unlocked = true; s.galaxy.escapedAt = now; G.emit(s, 'escape', {}); }
    else s.galaxy.ships++;
    s.galaxy.launches++;
    G.emit(s, 'launch', { first });
    return { ok: true, first };
  };

  // ---------- 銀河の生成 ----------
  const NAMES = ['ノイズ7', 'アルファ・ログ', 'ケプラーΣ', 'イマジナリア', 'デカルト星', 'フィボナ', 'ガウシア', 'オイラー環', 'ベクトリア', 'ピタゴラ', 'ネイピア', 'リーマンβ', 'ユークリ', 'カントール', 'ラグランジュ', 'ポアソン'];
  const PTYPES = [{ id: 'desert', name: '砂漠の星', color: '#d9a55a' }, { id: 'ocean', name: '海の星', color: '#4a8fd9' }, { id: 'ice', name: '氷の星', color: '#bfe3ff' }, { id: 'lava', name: '溶岩の星', color: '#e05a3a' }, { id: 'gas', name: 'ガス惑星', color: '#c79ad9' }, { id: 'crystal', name: '結晶の星', color: '#7ae0d0' }];
  GX.EMPIRES = [
    { id: 'gauss', name: 'ガウス連邦', color: '#4aa8ff', pers: 'scientist', base: 10, growth: 1.0, expand: 0.35, desc: '研究好きの穏やかな連邦。交易を好む。', gift: 'rp' },
    { id: 'euclid', name: 'ユークリッド帝国', color: '#ff5d5d', pers: 'militarist', base: -10, growth: 1.5, expand: 0.55, desc: '領土拡大に熱心な軍事帝国。油断するな。', gift: 'iron' },
    { id: 'riemann', name: 'リーマン同盟', color: '#52d273', pers: 'trader', base: 20, growth: 1.2, expand: 0.4, desc: '商人たちの同盟。取引すれば頼もしい仲間に。', gift: 'gold' },
  ];
  GX.empById = {}; GX.EMPIRES.forEach((e) => { GX.empById[e.id] = e; });
  GX.generate = function (s, now) {
    const r = U.rng(U.newSeed(s));
    const N = 14;
    const sys = [];
    let guard = 0;
    while (sys.length < N && guard++ < 2000) {
      const x = 8 + r.next() * 84, y = 8 + r.next() * 84;
      if (sys.some((o) => Math.hypot(o.x - x, o.y - y) < 17)) continue;
      sys.push({ id: sys.length, x: Math.round(x), y: Math.round(y) });
    }
    // 近い星をつなぐ航路
    const lanes = new Set();
    sys.forEach((a) => {
      const near = sys.filter((b) => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)).slice(0, 2 + (r.next() < 0.4 ? 1 : 0));
      near.forEach((b) => lanes.add(Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id)));
    });
    // 全体をつなげる（ばらばらの島をなくす）
    const linked = () => { const adj = {}; lanes.forEach((l) => { const [a, b] = l.split('-').map(Number); (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }); const seen = new Set([0]); const st = [0]; while (st.length) { const v = st.pop(); for (const w of adj[v] || []) if (!seen.has(w)) { seen.add(w); st.push(w); } } return seen; };
    let seen = linked();
    while (seen.size < sys.length) {
      let best = null;
      sys.forEach((a) => { if (!seen.has(a.id)) return; sys.forEach((b) => { if (seen.has(b.id)) return; const d = Math.hypot(a.x - b.x, a.y - b.y); if (!best || d < best.d) best = { a: a.id, b: b.id, d }; }); });
      lanes.add(Math.min(best.a, best.b) + '-' + Math.max(best.a, best.b));
      seen = linked();
    }
    // 惑星：ふるさとは中央寄り、帝国は遠く
    const center = sys.slice().sort((p, q) => Math.hypot(p.x - 50, p.y - 50) - Math.hypot(q.x - 50, q.y - 50))[0];
    const extra = ['explog', 'comb', 'cplx', 'coord'];
    const names = r.shuffle(NAMES.slice(1));
    sys.forEach((p, i) => {
      if (p === center) { Object.assign(p, { name: NAMES[0], type: 'home', topics: Qs.HOME_TOPICS.slice(), resource: null, owner: 'player', home: true }); return; }
      const ptype = r.pick(PTYPES);
      const primary = i % 3 === 0 ? r.pick(Qs.HOME_TOPICS) : extra[i % extra.length];
      let second = r.pick(Qs.HOME_TOPICS.concat(extra)); if (second === primary) second = r.pick(Qs.HOME_TOPICS.filter((t) => t !== primary));
      Object.assign(p, { name: names[i % names.length], type: ptype.id, typeName: ptype.name, color: ptype.color, topics: [primary, second], resource: Qs.TOPICS[primary].resource, owner: null, richness: 1 + Math.round(r.next() * 2) });
    });
    const far = sys.filter((p) => !p.home).sort((p, q) => Math.hypot(q.x - center.x, q.y - center.y) - Math.hypot(p.x - center.x, p.y - center.y));
    const homes = [];
    for (const p of far) { if (homes.length >= 3) break; if (homes.every((h) => Math.hypot(h.x - p.x, h.y - p.y) > 35)) homes.push(p); }
    while (homes.length < 3) homes.push(far.find((p) => homes.indexOf(p) < 0));
    const emp = {};
    GX.EMPIRES.forEach((E, k) => { homes[k].owner = E.id; homes[k].capital = E.id; emp[E.id] = { id: E.id, rel: E.base, stance: 'neutral', strength: 30, trade: false, met: false, wins: 0 }; });
    Object.assign(s.galaxy, { systems: sys, lanes: Array.from(lanes), empires: emp, home: center.id, focus: null, turn: 0, log: [] });
    GX.log(s, '🚀 宇宙へ飛び出した！ 銀河には3つの帝国があるようだ…');
  };
  GX.adj = function (s, id) {
    const out = [];
    for (const l of s.galaxy.lanes) { const [a, b] = l.split('-').map(Number); if (a === id) out.push(b); else if (b === id) out.push(a); }
    return out;
  };
  GX.sys = (s, id) => s.galaxy.systems[id];
  GX.owned = (s, owner) => s.galaxy.systems.filter((p) => p.owner === owner);
  GX.log = function (s, t) { const g = s.galaxy; g.log = g.log || []; g.log.push(t); if (g.log.length > 30) g.log.shift(); };

  // ---------- 植民 ----------
  GX.canColonize = function (s, id) {
    const p = GX.sys(s, id);
    if (!p || p.owner) return { ok: false, reason: 'ほかの勢力の星' };
    if (!GX.adj(s, id).some((n) => GX.sys(s, n).owner === 'player')) return { ok: false, reason: '自分の星と航路でつながっていない' };
    if (s.galaxy.ships < 1) return { ok: false, reason: 'コロニー船がない（ロケット部品' + B.galaxy.colonyParts + '個で打ち上げ）' };
    return { ok: true };
  };
  GX.colonize = function (s, id, now) {
    const c = GX.canColonize(s, id);
    if (!c.ok) return c;
    s.galaxy.ships--;
    const p = GX.sys(s, id);
    p.owner = 'player';
    p.colonizedAt = now;
    GX.log(s, '🏳️ ' + p.name + ' に植民した！ ' + p.topics.map((t) => Qs.TOPICS[t].name).join('・') + ' の問題が出るようになった');
    G.emit(s, 'colonize', { id });
    return { ok: true, p };
  };
  GX.setFocus = function (s, id) { const p = id === null ? null : GX.sys(s, id); if (p && p.owner !== 'player') return false; s.galaxy.focus = p && !p.home ? id : null; return true; };
  // 植民した星の分野が出題にくわわる
  G.topicProviders.push((s) => (s.galaxy && s.galaxy.unlocked ? GX.owned(s, 'player').reduce((a, p) => a.concat(p.topics), []) : []));
  // 惑星で勉強中：その星の分野だけが「おまかせ」で出る
  G.topicWeighters.push((s, t) => {
    if (!s.galaxy || s.galaxy.focus === null || s.galaxy.focus === undefined) return 0;
    const p = GX.sys(s, s.galaxy.focus);
    return p && p.topics.indexOf(t) >= 0 ? 12 : 0;
  });
  // 植民地の分野の正解は資源が増える
  G.addMultiplier((s, topic, kind) => {
    if (kind !== 'quiz' || !s.galaxy || !s.galaxy.unlocked) return 1;
    const n = GX.owned(s, 'player').filter((p) => !p.home && p.topics[0] === topic).length;
    return 1 + Math.min(3, n) * B.galaxy.colonyBonus;
  });

  // ---------- 外交 ----------
  GX.STANCE = { neutral: '中立', trade: '交易中', alliance: '同盟', war: '戦争中' };
  GX.borders = function (s, eid) {
    return GX.owned(s, 'player').some((p) => GX.adj(s, p.id).some((n) => GX.sys(s, n).owner === eid));
  };
  GX.diplo = function (s, eid, action, now) {
    const e = s.galaxy.empires[eid], E = GX.empById[eid];
    if (!e) return { ok: false, reason: '不明' };
    if (action === 'trade') {
      if (e.stance === 'war') return { ok: false, reason: '戦争中は交易できない' };
      if (e.trade) { e.trade = false; if (e.stance === 'trade') e.stance = 'neutral'; return { ok: true, text: '交易をやめた' }; }
      if (e.rel < -20) return { ok: false, reason: '関係が悪すぎる（-20以上が必要）' };
      if (s.rp < 30) return { ok: false, reason: '研究P 30 が必要' };
      s.rp -= 30; e.trade = true; if (e.stance === 'neutral') e.stance = 'trade'; e.rel += 5;
      GX.log(s, '🤝 ' + E.name + ' と交易を始めた');
      return { ok: true, text: E.name + ' と交易を始めた！ 毎ターン品物が届く' };
    }
    if (action === 'alliance') {
      if (e.stance === 'alliance') { e.stance = e.trade ? 'trade' : 'neutral'; e.rel -= 15; return { ok: true, text: '同盟を解消した' }; }
      if (e.stance === 'war') return { ok: false, reason: '戦争中' };
      if (e.rel < 50) return { ok: false, reason: '関係が 50 以上必要（今 ' + Math.round(e.rel) + '）' };
      e.stance = 'alliance'; e.rel += 10;
      GX.log(s, '🛡️ ' + E.name + ' と同盟を結んだ');
      G.emit(s, 'alliance', { id: eid });
      return { ok: true, text: E.name + ' と同盟！ 戦闘で援護してくれる' };
    }
    if (action === 'war') {
      if (e.stance === 'war') return { ok: false, reason: 'すでに戦争中' };
      e.stance = 'war'; e.trade = false; e.rel = -100;
      for (const k of Object.keys(s.galaxy.empires)) if (k !== eid) s.galaxy.empires[k].rel -= 10;
      GX.log(s, '⚔️ ' + E.name + ' に宣戦布告した');
      G.emit(s, 'war', { id: eid });
      return { ok: true, text: E.name + ' に宣戦布告！ 敵の星を攻撃できる。こちらの星も狙われる' };
    }
    if (action === 'peace') {
      if (e.stance !== 'war') return { ok: false, reason: '戦争していない' };
      const cost = 60;
      if (s.rp < cost) return { ok: false, reason: '研究P ' + cost + ' が必要（賠償金）' };
      s.rp -= cost; e.stance = 'neutral'; e.rel = -30;
      GX.log(s, '🕊️ ' + E.name + ' と和平を結んだ');
      return { ok: true, text: E.name + ' と和平を結んだ' };
    }
    if (action === 'gift') {
      const cost = { iron: 40, copper: 40 };
      if (!G.pay(s, cost)) return { ok: false, reason: '鉄鉱石40・銅鉱石40 が必要' };
      e.rel = Math.min(100, e.rel + 12);
      return { ok: true, text: E.name + ' に贈り物をした（関係 +12）' };
    }
    return { ok: false, reason: '?' };
  };

  // ---------- 戦争：星の攻防（カードバトル） ----------
  GX.attackPlan = function (s, id) {
    const p = GX.sys(s, id);
    if (!p || !p.owner || p.owner === 'player') return null;
    const e = s.galaxy.empires[p.owner];
    if (!e || e.stance !== 'war') return null;
    if (!GX.adj(s, id).some((n) => GX.sys(s, n).owner === 'player')) return null;
    const tier = Math.min(3, 1 + Math.floor(e.strength / 40));
    return { target: id, owner: p.owner, enemies: U.randPick(s, MF.Battle.ENCOUNTERS[tier]).concat(p.capital ? ['shell'] : []), hpMult: 1 + e.strength / 120, tier };
  };
  GX.attack = function (s, id) {
    const plan = GX.attackPlan(s, id);
    if (!plan) return { ok: false, reason: '攻撃できない（戦争中の帝国の、となりの星だけ）' };
    s.galaxy.pendingWar = { kind: 'attack', target: id, owner: plan.owner };
    MF.Battle.start(s, 'raid', plan.enemies, { hpMult: plan.hpMult, tier: plan.tier, war: true });
    s.battle.active.war = { kind: 'attack', target: id, owner: plan.owner };
    return { ok: true };
  };
  GX.defend = function (s) {
    const w = s.galaxy.incoming;
    if (!w) return { ok: false };
    const e = s.galaxy.empires[w.owner];
    const tier = Math.min(3, 1 + Math.floor(e.strength / 40));
    MF.Battle.start(s, 'raid', U.randPick(s, MF.Battle.ENCOUNTERS[tier]), { hpMult: 1 + e.strength / 150, tier, war: true });
    s.battle.active.war = { kind: 'defend', target: w.target, owner: w.owner };
    return { ok: true };
  };
  /** 星の攻防戦の結果 */
  GX.finishWar = function (s, now) {
    const bt = s.battle.active;
    if (!bt || !bt.war || !bt.over) return null;
    const w = bt.war, win = bt.over === 'win';
    const e = s.galaxy.empires[w.owner], E = GX.empById[w.owner], p = GX.sys(s, w.target);
    s.battle.active = null;
    const out = { win, kind: w.kind, name: p.name, empire: E.name };
    if (w.kind === 'attack') {
      if (win) { p.owner = 'player'; p.capital = null; e.strength = Math.max(10, e.strength * 0.7); e.wins = (e.wins || 0); GX.log(s, '🏴 ' + p.name + ' を ' + E.name + ' から奪った！'); G.emit(s, 'conquer', {}); }
      else { e.strength += 5; GX.log(s, '💥 ' + p.name + ' への攻撃は失敗した'); }
    } else {
      s.galaxy.incoming = null;
      if (win) { e.strength = Math.max(10, e.strength * 0.8); GX.log(s, '🛡️ ' + p.name + ' を守りきった'); }
      else if (!p.home) { p.owner = w.owner; if (s.galaxy.focus === p.id) s.galaxy.focus = null; GX.log(s, '😢 ' + p.name + ' を ' + E.name + ' に奪われた'); out.lost = true; }
      else { MF.Battle.damageFactory(s, 2); GX.log(s, '💥 ふるさとが攻撃を受けて設備が壊れた'); out.damaged = true; }
    }
    return out;
  };
  // 同盟国は戦闘で援護射撃してくれる
  GX.allyFire = function (s) { if (!s.galaxy || !s.galaxy.unlocked) return 0; return Object.values(s.galaxy.empires).filter((e) => e.stance === 'alliance').length * 5; };

  // ---------- 銀河のターン（帝国の行動） ----------
  GX.turn = function (s, now) {
    const g = s.galaxy;
    g.turn++;
    const out = [];
    for (const E of GX.EMPIRES) {
      const e = g.empires[E.id];
      const owned = GX.owned(s, E.id);
      if (!owned.length) continue;
      e.strength += E.growth * (1 + owned.length * 0.15);
      // 拡大
      if (U.rand(s) < E.expand) {
        const cands = [];
        owned.forEach((p) => GX.adj(s, p.id).forEach((n) => { const q = GX.sys(s, n); if (!q.owner && cands.indexOf(q) < 0) cands.push(q); }));
        if (cands.length) {
          const q = U.randPick(s, cands);
          const allyBlock = e.stance === 'alliance' && GX.adj(s, q.id).some((n) => GX.sys(s, n).owner === 'player') && U.rand(s) < 0.6;
          if (!allyBlock) { q.owner = E.id; out.push(E.name + ' が ' + q.name + ' に進出した'); }
        }
      }
      // 関係の変化
      const target = E.base + (e.trade ? 25 : 0) + (e.stance === 'alliance' ? 30 : 0) - (GX.borders(s, E.id) && E.pers === 'militarist' ? 20 : 0);
      if (e.stance !== 'war') e.rel += U.clamp((target - e.rel) * 0.08, -3, 3);
      e.rel = U.clamp(e.rel, -100, 100);
      // 交易の品
      if (e.trade && e.stance !== 'war') {
        const bundle = E.gift === 'rp' ? { rp: 15 } : E.gift === 'gold' ? { gold: 12, copper: 15 } : { iron: 25, ironPlate: 8 };
        G.give(s, bundle);
      }
      // 戦争：こちらの星を攻撃してくる
      if (e.stance === 'war' && !g.incoming && U.rand(s) < 0.3) {
        const targets = GX.owned(s, 'player').filter((p) => GX.adj(s, p.id).some((n) => GX.sys(s, n).owner === E.id));
        if (targets.length) { const t = U.randPick(s, targets); g.incoming = { owner: E.id, target: t.id, at: now }; out.push('⚠️ ' + E.name + ' の艦隊が ' + t.name + ' に向かっている！'); G.notice(s, { type: 'raid', text: '⚠️ ' + E.name + ' の艦隊が ' + t.name + ' を攻撃しにきた！ 銀河マップで迎撃しよう' }); }
      }
      // 好戦的な帝国は関係が悪いと宣戦布告してくる
      if (e.stance !== 'war' && e.stance !== 'alliance' && E.pers === 'militarist' && e.rel < -40 && GX.borders(s, E.id) && U.rand(s) < 0.25) {
        e.stance = 'war'; e.trade = false; out.push('⚔️ ' + E.name + ' が宣戦布告してきた！');
        G.notice(s, { type: 'raid', text: '⚔️ ' + E.name + ' が宣戦布告してきた！' });
      }
    }
    // 植民地からの収入
    const cols = GX.owned(s, 'player').filter((p) => !p.home);
    cols.forEach((p) => G.add(s, p.resource, B.galaxy.colonyIncome * p.richness));
    out.forEach((t) => GX.log(s, t));
    G.emit(s, 'galaxyTurn', { turn: g.turn });
    return out;
  };
  GX.score = function (s, owner) { return GX.owned(s, owner).length; };

  // ---------- ランダムイベント ----------
  // quiz: その選択肢は問題に答えて結果が決まる。ok/ng: 効果
  GX.EVENTS = [
    { id: 'meteor', title: '☄️ 隕石群が接近', text: '工場に向かって小さな隕石が降ってくる！', choices: [
      { label: 'シールドの角度を計算する', quiz: true, ok: { text: '計算どおり！ 隕石をはじいた。ついでに鉄を回収', iron: 40 }, ng: { text: '計算ミス…設備が1つ壊れた', damage: 1 } },
      { label: '工場を止めて避難する', ok: { text: '無事だったが、演算チャージを5分ぶん失った', charge: -300 } }] },
    { id: 'signal', title: '📡 謎の通信', text: '暗号化された通信をキャッチした。', choices: [
      { label: '暗号を解読する', quiz: true, ok: { text: '解読成功！ 古い研究データだった', rp: 60 }, ng: { text: '解読できなかった…', rp: 0 } },
      { label: '放っておく', ok: { text: '何も起こらなかった' } }] },
    { id: 'cargo', title: '📦 漂流する貨物', text: '宇宙を漂うコンテナが流れついた。', choices: [
      { label: 'そのまま回収する', ok: { text: '資源が入っていた！', copper: 30, coal: 30, stone: 30 } },
      { label: 'ロックを数学で開ける', quiz: true, ok: { text: '中には卵が！', egg: 1 }, ng: { text: 'ロックが固い…少しだけ資源を回収', stone: 15 } }] },
    { id: 'lostpal', title: '🐾 相棒が迷子', text: '相棒の1匹がどこかへ行ってしまったらしい。', need: (s) => s.pals.list.length > 0, choices: [
      { label: '足あとの間隔から居場所を計算する', quiz: true, ok: { text: '見つけた！ 冒険して強くなって帰ってきた', palxp: 60 }, ng: { text: '見つからない…でも夜にはおなかをすかせて帰ってきた' } },
      { label: '待つ', ok: { text: 'しばらくして帰ってきた' } }] },
    { id: 'flare', title: '🌞 太陽フレア', text: '恒星から強い光が放たれた。', choices: [
      { label: 'エネルギーを受け止める計算をする', quiz: true, ok: { text: '演算チャージ満タン！', chargeFull: true }, ng: { text: '過電流で設備が1つ故障した', damage: 1 } },
      { label: 'シャッターを閉じる', ok: { text: '何事もなく過ぎた' } }] },
    { id: 'merchant', title: '🛸 行商の船', text: '「鉄鉱石80個と研究ポイント90を交換しないか？」', choices: [
      { label: '交換する', cost: { iron: 80 }, ok: { text: '交換成立！', rp: 90 } },
      { label: '値切る（問題）', quiz: true, cost: { iron: 50 }, ok: { text: '値切り成功！ 鉄50で研究P90', rp: 90 }, ng: { text: '交渉決裂…鉄は返ってきた', iron: 50 } },
      { label: '断る', ok: { text: '商人は去っていった' } }] },
    { id: 'scout', title: '👾 赤い斥候', text: '赤い異星生物の偵察隊が工場の近くをうろついている。', choices: [
      { label: '先制攻撃（問題）', quiz: true, ok: { text: '追いはらった！ 群れが来るのが遅くなる', raid: -15 }, ng: { text: '逃げられた…群れに知らされてしまった', raid: 8 } },
      { label: '静かにやり過ごす', ok: { text: 'こっそりやり過ごしたが、少し近づかれた', raid: 4 } }] },
    { id: 'vein', title: '⛏️ 新しい鉱脈', text: '地下に豊かな鉱脈が見つかった。', choices: [
      { label: '採掘隊を送る', ok: { text: '大量の鉱石を掘り出した！', iron: 50, stone: 50 } },
      { label: '埋蔵量を計算してから掘る', quiz: true, ok: { text: '最適な場所を掘り当てた！', iron: 90, stone: 90, coal: 40 }, ng: { text: '計算はずれ…少しだけ', iron: 20 } }] },
    { id: 'contest', title: '🏅 銀河数学コンテスト', text: '銀河中の計算自慢が集まる大会の招待状が届いた。', galaxy: true, choices: [
      { label: '出場する（難問）', quiz: true, hard: true, ok: { text: '優勝！ 賞品をもらった', rp: 120, ticket: 1 }, ng: { text: '惜しくも入賞ならず。参加賞をもらった', rp: 15 } },
      { label: '見学する', ok: { text: '勉強になった', rp: 10 } }] },
    { id: 'refugee', title: '🚀 難民船', text: '帝国の争いから逃れてきた船が、受け入れを求めている。', galaxy: true, choices: [
      { label: '受け入れる（資源を分ける）', cost: { iron: 40, copper: 40 }, ok: { text: '感謝され、銀河中の評判が上がった', relAll: 10, egg: 1 } },
      { label: '断る', ok: { text: '船は去っていった', relAll: -3 } }] },
    { id: 'ruins', title: '🏛️ 古代遺跡', text: '植民地で、数式が刻まれた古代の遺跡が見つかった。', galaxy: true, choices: [
      { label: '遺跡の謎を解く（難問）', quiz: true, hard: true, ok: { text: '遺跡の奥でレリックを見つけた！', relic: true }, ng: { text: '謎は解けなかった…' } },
      { label: 'そっとしておく', ok: { text: '遺跡は静かに眠っている' } }] },
    { id: 'envoy', title: '🎁 帝国の使者', text: 'ある帝国の使者が贈り物を持ってきた。', galaxy: true, choices: [
      { label: '受け取る', ok: { text: '贈り物を受け取った（関係 +8）', rel: 8, gold: 20, titanium: 20 } },
      { label: '丁重に断る', ok: { text: '使者は少し不満そうだ（関係 -4）', rel: -4 } }] },
  ];
  GX.evById = {}; GX.EVENTS.forEach((e) => { GX.evById[e.id] = e; });
  GX.rollEvent = function (s, now) {
    const pool = GX.EVENTS.filter((e) => (!e.galaxy || s.galaxy.unlocked) && (!e.need || e.need(s)));
    const ev = U.randPick(s, pool);
    const emp = s.galaxy.unlocked ? U.randPick(s, GX.EMPIRES).id : null;
    s.galaxy.event = { id: ev.id, at: now, emp };
    G.notice(s, { type: 'event', text: '❗ ' + ev.title.replace(/^\S+\s/, '') + '：イベントが発生！ 上のバーの❗から選ぼう' });
    return s.galaxy.event;
  };
  GX.chooseEvent = function (s, idx, quizOk, now) {
    const pe = s.galaxy.event;
    if (!pe) return null;
    const ev = GX.evById[pe.id], ch = ev.choices[idx];
    if (!ch) return null;
    if (ch.cost && !G.pay(s, ch.cost)) return { ok: false, reason: '資源が足りない：' + G.costText(ch.cost) };
    const fx = ch.quiz ? (quizOk ? ch.ok : ch.ng) : ch.ok;
    s.galaxy.event = null;
    const keys = ['iron', 'copper', 'coal', 'stone', 'gold', 'titanium'];
    keys.forEach((k) => { if (fx[k]) G.add(s, k, fx[k]); });
    if (fx.rp) s.rp += fx.rp;
    if (fx.ticket) s.meta.tickets += fx.ticket;
    if (fx.charge) s.factory.charge = U.clamp(s.factory.charge + fx.charge, 0, F.chargeMax(s));
    if (fx.chargeFull) s.factory.charge = F.chargeMax(s);
    if (fx.damage) MF.Battle.damageFactory(s, fx.damage);
    if (fx.egg && MF.Pals) MF.Pals.addEgg(s, U.randPick(s, G.availableTopics(s)), now, 0.05);
    if (fx.palxp && s.pals.list.length) MF.Pals.gainXP(s, U.randPick(s, s.pals.list), fx.palxp);
    if (fx.raid) s.battle.raid.meter = Math.max(0, s.battle.raid.meter + fx.raid);
    if (fx.relic) { const r = MF.Battle.randomRelic(s, s.battle.relics); if (r) { s.battle.relics.push(r); fx.text += '（' + MF.Battle.RELICS[r].name + '）'; } else s.rp += 50; }
    if (fx.relAll && s.galaxy.unlocked) Object.values(s.galaxy.empires).forEach((e) => { e.rel = U.clamp(e.rel + fx.relAll, -100, 100); });
    if (fx.rel && pe.emp) { const e = s.galaxy.empires[pe.emp]; e.rel = U.clamp(e.rel + fx.rel, -100, 100); fx.text += '（' + GX.empById[pe.emp].name + '）'; }
    G.emit(s, 'eventDone', { id: ev.id, ok: quizOk });
    return { ok: true, text: fx.text };
  };

  // ---------- 時間とともに進む ----------
  G.on('answer', (s, d) => {
    if (!d.ok) return;
    const g = s.galaxy;
    // 惑星で勉強中：その星の資源も手に入る
    if (g.unlocked && g.focus !== null && g.focus !== undefined) {
      const p = GX.sys(s, g.focus);
      if (p && p.owner === 'player' && p.topics.indexOf(d.topic) >= 0) G.add(s, p.resource, B.galaxy.focusBonus * (d.level + 1) * p.richness);
    }
    if (d.mode === 'battle' || d.mode === 'exam') return;
    g.clock += 1;
    if (s.stats.correct >= B.galaxy.eventMinCorrect && !g.event) { g.evClock++; if (g.evClock >= B.galaxy.eventEvery) { g.evClock = 0; if (U.rand(s) < B.galaxy.eventChance) GX.rollEvent(s, d.now || Date.now()); } }
  });
  G.register({
    id: 'galaxy',
    init(s) { s.galaxy = { unlocked: false, launches: 0, ships: 0, systems: [], lanes: [], empires: {}, home: null, focus: null, turn: 0, clock: 0, timeAcc: 0, evClock: 0, event: null, incoming: null, log: [] }; },
    tick(s, dt, now) {
      const g = s.galaxy;
      if (!g.unlocked) return;
      g.timeAcc += dt;
      if (g.timeAcc >= B.galaxy.turnSecs) { g.timeAcc = 0; g.clock += 1; }
      if (g.clock >= B.galaxy.turnEvery) { g.clock = 0; GX.turn(s, now); }
    },
  });
  MF.Galaxy = GX;
})(globalThis.MF = globalThis.MF || {});
