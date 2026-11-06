/* 数学ファクトリー：工場（グリッド配置・ベルト輸送・電力・自動生産・オフライン生産）
 * ベルトは「つながった先の設備へ、流せる量だけ一気に運ぶ」方式。時間の刻み(dt)が大きくても結果が崩れにくい。 */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, B = MF.Balance;
  const F = {};

  B.factory = {
    startW: 16, startH: 12, expand1: [22, 15], expand2: [28, 18],
    chargeStart: 300, chargeMax: 900, chargePerAnswer: [40, 60, 90], chargeIdleSpeed: 0.25,
    coreCap: 200, storageCap: 250,
    offlineMaxHours: 8, offlineEff: 0.8,
    spaghettiPenalty: 0.35,
  };

  F.DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 上 右 下 左
  F.DIR_ARROWS = ['↑', '→', '↓', '←'];
  F.ORES = ['iron', 'copper', 'coal', 'stone', 'uranium', 'silicon', 'oil'];

  F.BUILDINGS = {
    core:      { name: '宇宙船のコア', short: 'コア', icon: '🛸', color: '#3a6d8c', power: 8, accepts: 'all', storage: true, desc: '不時着した宇宙船の心臓部。届いた品物を持ち物にしまい、少し電気もつくる。動かせない。' },
    miner:     { name: '採掘機', short: '採掘', icon: '⛏️', color: '#7a6a3a', cost: { iron: 6, stone: 4 }, power: -2, rate: 0.25, onOre: true, desc: '鉱脈の上に置くと鉱石を掘り、向いている方向へ送り出す。' },
    belt:      { name: 'ベルトコンベア', short: 'ベルト', icon: '', color: '#3b3f46', cost: { iron: 1 }, power: 0, speed: 4, desc: '矢印の方向へ品物を運ぶ。曲げたり絡めたりしすぎると「スパゲッティ度」が上がる。' },
    furnace:   { name: '溶鉱炉', short: '溶鉱炉', icon: '🔥', color: '#8c3f2a', cost: { stone: 10, iron: 2 }, power: -3, time: 1.6, desc: '鉱石を溶かして鉄板・銅板・レンガ・ウェハにする。' },
    assembler: { name: '組立機', short: '組立', icon: '⚙️', color: '#3d6b45', cost: { ironPlate: 20, copperPlate: 12 }, power: -4, desc: 'レシピを選ぶと、材料を組み立てて製品をつくる。' },
    lab:       { name: '研究所', short: '研究', icon: '🔬', color: '#5a3d8c', cost: { ironPlate: 30, copperPlate: 25, brick: 15, gear: 10 }, power: -4, time: 8, rpPerPack: 2, desc: '研究パックを研究ポイントに変える。研究ツリーを進めるのに必要。' },
    storage:   { name: '倉庫', short: '倉庫', icon: '📦', color: '#6b5530', cost: { iron: 10, stone: 12 }, power: 0, accepts: 'all', storage: true, desc: '届いた品物を持ち物にしまう。置くほど持てる量（上限）が増える。' },
    power:     { name: '発電所', short: '発電', icon: '⚡', color: '#8c7a2a', cost: { iron: 12, stone: 8, copper: 6 }, power: 12, fuel: 'coal', burn: 10, desc: '石炭を燃やして電気をつくる（10秒に1個）。ベルトで石炭を運ぶか、持ち物の石炭を使う。' },
    solar:     { name: 'ソーラーパネル', short: 'ソーラー', icon: '☀️', color: '#2a4a6b', cost: { ironPlate: 15, copperPlate: 15, wafer: 3 }, power: 5, desc: '燃料なしで電気をつくる。' },
    port:      { name: '供給ポート', short: '供給', icon: '📤', color: '#2a6b6b', cost: { ironPlate: 15, copperPlate: 10 }, power: -1, rate: 2, desc: '持ち物（コア・倉庫）から、正面のとなりの設備が必要とする材料を取り出して送りこむ。複雑なレシピもベルトなしで動かせる。' },
  };
  F.SMELT = {
    iron: { out: 'ironPlate', n: 1 }, copper: { out: 'copperPlate', n: 1 },
    stone: { out: 'brick', n: 2 }, silicon: { out: 'wafer', n: 1 },
  };
  F.RECIPES = {
    gear:        { name: '歯車',         in: { ironPlate: 2 }, time: 1 },
    circuit:     { name: '電子回路',     in: { ironPlate: 1, copperPlate: 1 }, time: 2 },
    sciencePack: { name: '研究パック',   in: { gear: 1, circuit: 1 }, time: 4 },
    plastic:     { name: 'プラスチック', in: { oil: 1, coal: 1 }, time: 2 },
    chip:        { name: '演算チップ',   in: { circuit: 2, wafer: 1, plastic: 1 }, time: 5 },
    fuelCell:    { name: '燃料棒',       in: { uranium: 2, ironPlate: 1 }, time: 5 },
  };
  F.recipeUnlocked = function (s, r) { return F.recipeLocks[r] ? F.recipeLocks[r](s) : true; };
  F.recipeLocks = {}; // 研究で解放（ステップ4）
  F.buildingLocks = {}; // 研究で解放（ステップ4）
  F.isUnlocked = function (s, type) { return F.buildingLocks[type] ? F.buildingLocks[type](s) : true; };

  // ---------- マップ ----------
  F.idx = (f, x, y) => y * f.w + x;
  F.inside = (f, x, y) => x >= 0 && y >= 0 && x < f.w && y < f.h;
  function genOre(f, seed, w, h, coreX, coreY) {
    const r = U.rng(seed);
    const ore = new Array(w * h).fill(null);
    const near = ['iron', 'stone', 'coal', 'copper'];
    const order = near.concat(['silicon', 'oil', 'uranium']);
    const taken = (x, y) => Math.abs(x - coreX) <= 1 && Math.abs(y - coreY) <= 1;
    order.forEach((o, i) => {
      let cx, cy, tries = 0;
      do {
        const ang = (i / order.length) * Math.PI * 2 + r.next() * 0.6;
        const dist = (i < 4 ? 2.6 : 4.2) + r.next() * 1.4;
        cx = Math.round(coreX + Math.cos(ang) * dist * (w / h));
        cy = Math.round(coreY + Math.sin(ang) * dist);
        tries++;
      } while ((!(cx >= 1 && cy >= 1 && cx < w - 1 && cy < h - 1) || taken(cx, cy) || ore[cy * w + cx]) && tries < 60);
      cx = U.clamp(cx, 1, w - 2); cy = U.clamp(cy, 1, h - 2);
      const size = i < 4 ? 6 : 5;
      let placed = 0, guard = 0;
      const cells = [[cx, cy]];
      while (placed < size && guard++ < 200) {
        const [x, y] = cells[Math.floor(r.next() * cells.length)];
        const [dx, dy] = F.DIRS[Math.floor(r.next() * 4)];
        const nx = placed === 0 ? x : x + dx, ny = placed === 0 ? y : y + dy;
        if (!F.inside({ w, h }, nx, ny) || taken(nx, ny)) continue;
        const k = ny * w + nx;
        if (ore[k] && ore[k] !== o) continue;
        if (!ore[k]) { ore[k] = o; placed++; cells.push([nx, ny]); }
      }
    });
    return ore;
  }
  F.initFactory = function (s, now) {
    const w = B.factory.startW, h = B.factory.startH;
    const seed = U.newSeed(s);
    const coreX = Math.floor(w / 2) - 1, coreY = Math.floor(h / 2);
    const f = {
      w, h, seed, ore: null, cells: new Array(w * h).fill(0), b: {}, nextId: 1, ver: 1,
      charge: B.factory.chargeStart, chargeMax: B.factory.chargeMax,
      power: { supply: 0, demand: 0, sat: 1 }, spaghetti: 0, fuelAcc: 0,
      produced: {}, rateLog: [], blueprints: [], lastReport: null, damaged: 0,
    };
    f.ore = genOre(f, seed, w, h, coreX, coreY);
    s.factory = f;
    F.place(s, 'core', coreX, coreY, 1, { free: true });
    return f;
  };
  /** マップを広げる（研究で使う）。既存の配置はそのまま、右と下に広がる */
  F.expand = function (s, nw, nh) {
    const f = s.factory;
    if (nw <= f.w && nh <= f.h) return;
    const cells = new Array(nw * nh).fill(0), ore = new Array(nw * nh).fill(null);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { cells[y * nw + x] = f.cells[y * f.w + x]; ore[y * nw + x] = f.ore[y * f.w + x]; }
    // 新しい場所に鉱脈を足す
    const extra = genOre(f, f.seed + nw * 7, nw, nh, Math.floor(nw * 0.75), Math.floor(nh * 0.7));
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) if ((x >= f.w || y >= f.h) && extra[y * nw + x]) ore[y * nw + x] = extra[y * nw + x];
    f.w = nw; f.h = nh; f.cells = cells; f.ore = ore; f.ver++;
  };

  // ---------- 置く・消す ----------
  F.at = function (s, x, y) { const f = s.factory; if (!F.inside(f, x, y)) return null; const id = f.cells[F.idx(f, x, y)]; return id ? f.b[id] : null; };
  F.costOf = function (s, type) { const d = F.BUILDINGS[type]; return d.cost || {}; };
  F.canPlace = function (s, type, x, y, opts) {
    const f = s.factory, d = F.BUILDINGS[type];
    if (!d) return { ok: false, reason: '不明な設備' };
    if (!F.inside(f, x, y)) return { ok: false, reason: '範囲外' };
    if (f.cells[F.idx(f, x, y)]) return { ok: false, reason: 'すでに設備がある' };
    if (type === 'core' && Object.values(f.b).some((b) => b.type === 'core')) return { ok: false, reason: 'コアは1つだけ' };
    if (!F.isUnlocked(s, type)) return { ok: false, reason: '研究で解放されていない' };
    if (d.onOre && !f.ore[F.idx(f, x, y)]) return { ok: false, reason: '採掘機は鉱脈の上にしか置けない' };
    if (!(opts && opts.free) && !G.has(s, F.costOf(s, type))) return { ok: false, reason: '資源が足りない：' + G.costText(F.costOf(s, type)) };
    return { ok: true };
  };
  F.place = function (s, type, x, y, dir, opts) {
    const chk = F.canPlace(s, type, x, y, opts);
    if (!chk.ok) return chk;
    const f = s.factory;
    if (!(opts && opts.free)) G.pay(s, F.costOf(s, type));
    const id = f.nextId++;
    const b = { id, type, x, y, dir: (dir | 0) % 4, lvl: 1, inBuf: {}, outBuf: {}, prog: 0, state: 'idle' };
    if (type === 'miner') b.ore = f.ore[F.idx(f, x, y)];
    if (type === 'assembler') b.recipe = (opts && opts.recipe) || 'gear';
    f.b[id] = b;
    f.cells[F.idx(f, x, y)] = id;
    f.ver++;
    G.emit(s, 'build', { type, id, x, y });
    return { ok: true, b };
  };
  F.remove = function (s, id, opts) {
    const f = s.factory, b = f.b[id];
    if (!b || b.type === 'core') return false;
    if (!(opts && opts.noRefund)) {
      G.give(s, F.costOf(s, b.type));
      for (const k of Object.keys(b.inBuf)) G.add(s, k, Math.floor(b.inBuf[k]));
      for (const k of Object.keys(b.outBuf)) G.add(s, k, Math.floor(b.outBuf[k]));
      if (b.spent) G.give(s, b.spent);
    }
    if (F.onRemove) F.onRemove(s, b);
    f.cells[F.idx(f, b.x, b.y)] = 0;
    delete f.b[id];
    f.ver++;
    return true;
  };
  F.rotate = function (s, id) { const b = s.factory.b[id]; if (!b) return false; b.dir = (b.dir + 1) % 4; s.factory.ver++; return true; };
  F.setRecipe = function (s, id, recipe) {
    const b = s.factory.b[id];
    if (!b || b.type !== 'assembler' || !F.RECIPES[recipe] || !F.recipeUnlocked(s, recipe)) return false;
    if (b.recipe !== recipe) { for (const k of Object.keys(b.inBuf)) G.add(s, k, Math.floor(b.inBuf[k])); b.inBuf = {}; b.prog = 0; }
    b.recipe = recipe;
    return true;
  };
  // ---------- 強化 ----------
  F.maxLevel = function () { return 2; }; // 研究で上がる
  F.canUpgrade = function (s, b) { return !!b && b.type !== 'belt' && b.type !== 'core' && b.lvl < F.maxLevel(s); };
  F.upgradeCost = function (s, b) {
    const base = F.costOf(s, b.type), k = Math.pow(1.7, b.lvl), c = {};
    for (const key of Object.keys(base)) c[key] = Math.ceil(base[key] * k);
    if (b.lvl >= 2) c.gear = 3 * b.lvl;
    if (b.lvl >= 3) c.circuit = 3 * (b.lvl - 2);
    return c;
  };
  F.upgrade = function (s, id) {
    const b = s.factory.b[id];
    if (!b) return { ok: false, reason: '設備がない' };
    if (b.type === 'belt' || b.type === 'core') return { ok: false, reason: 'この設備は強化できない（ベルトは研究で速くなる）' };
    if (b.lvl >= F.maxLevel(s)) return { ok: false, reason: 'これ以上は研究「設備改良」が必要（今の上限 Lv' + F.maxLevel(s) + '）' };
    const cost = F.upgradeCost(s, b);
    if (!G.pay(s, cost)) return { ok: false, reason: '資源が足りない：' + G.costText(cost) };
    b.spent = b.spent || {};
    for (const k of Object.keys(cost)) b.spent[k] = (b.spent[k] || 0) + cost[k];
    b.lvl++;
    s.factory.ver++;
    G.emit(s, 'upgrade', { type: b.type, lvl: b.lvl });
    return { ok: true, b };
  };

  // ---------- 設計図 ----------
  F.bpCapture = function (s, x1, y1, x2, y2, name) {
    const f = s.factory;
    const xa = Math.min(x1, x2), xb = Math.max(x1, x2), ya = Math.min(y1, y2), yb = Math.max(y1, y2);
    const items = [];
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const b = F.at(s, x, y);
      if (b && b.type !== 'core') items.push({ dx: x - xa, dy: y - ya, type: b.type, dir: b.dir, recipe: b.recipe || null });
    }
    if (!items.length) return null;
    f.bpNext = (f.bpNext || 0) + 1;
    const bp = { id: f.bpNext, name: name || ('設計図' + f.bpNext), w: xb - xa + 1, h: yb - ya + 1, items };
    f.blueprints.push(bp);
    if (f.blueprints.length > 12) f.blueprints.shift();
    G.emit(s, 'blueprint', { n: items.length });
    return bp;
  };
  F.bpRotate = function (bp) {
    return Object.assign({}, bp, { w: bp.h, h: bp.w, items: bp.items.map((it) => Object.assign({}, it, { dx: bp.h - 1 - it.dy, dy: it.dx, dir: (it.dir + 1) % 4 })) });
  };
  F.bpCost = function (s, bp) {
    const c = {};
    for (const it of bp.items) { const k = F.costOf(s, it.type); for (const r of Object.keys(k)) c[r] = (c[r] || 0) + k[r]; }
    return c;
  };
  /** 貼りつけ。置けないマス（重なり・鉱脈なし・資源不足）は飛ばす */
  F.bpPaste = function (s, bp, ax, ay) {
    let placed = 0;
    const skipped = {};
    for (const it of bp.items) {
      const x = ax + it.dx, y = ay + it.dy;
      const res = F.place(s, it.type, x, y, it.dir, { recipe: it.recipe || undefined });
      if (res.ok) { placed++; if (it.recipe && res.b.type === 'assembler') F.setRecipe(s, res.b.id, it.recipe); }
      else skipped[res.reason.split('：')[0]] = (skipped[res.reason.split('：')[0]] || 0) + 1;
    }
    if (placed) G.emit(s, 'blueprintPaste', { placed });
    return { placed, skipped };
  };
  F.bpDelete = function (s, id) { const f = s.factory; f.blueprints = f.blueprints.filter((b) => b.id !== id); };

  /** 溶鉱炉で溶かす鉱石を決める（null なら自動） */
  F.setSmelt = function (s, id, ore) {
    const b = s.factory.b[id];
    if (!b || b.type !== 'furnace' || (ore && !F.SMELT[ore])) return false;
    if (b.smelt !== ore) { for (const k of Object.keys(b.inBuf)) if (k !== ore) { G.add(s, k, Math.floor(b.inBuf[k])); delete b.inBuf[k]; } }
    b.smelt = ore || null;
    return true;
  };
  F.count = function (s, type) { let n = 0; for (const id in s.factory.b) if (s.factory.b[id].type === type) n++; return n; };

  // ---------- 経路とスパゲッティ度（配置が変わったときだけ計算） ----------
  const cache = typeof WeakMap !== 'undefined' ? new WeakMap() : new Map();
  F.layout = function (s) {
    const f = s.factory;
    let c = cache.get(f);
    if (c && c.ver === f.ver) return c;
    c = { ver: f.ver, routes: {}, beltInfo: {}, spaghetti: 0, beltCount: 0, beltCells: [] };
    const beltAt = (x, y) => { const b = F.at(s, x, y); return b && b.type === 'belt' ? b : null; };
    // 各設備の出口から、ベルトをたどって行き先を決める
    for (const id in f.b) {
      const b = f.b[id];
      if (b.type === 'belt' || !F.producesItems(b)) continue;
      const [dx, dy] = F.DIRS[b.dir];
      let x = b.x + dx, y = b.y + dy;
      const path = [];
      const seen = new Set();
      let dest = null, dead = false;
      while (true) {
        if (!F.inside(f, x, y)) { dead = true; break; }
        const t = F.at(s, x, y);
        if (!t) { dead = true; break; }
        if (t.type !== 'belt') { dest = t.id === b.id ? null : t.id; dead = !dest; break; }
        const k = F.idx(f, x, y);
        if (seen.has(k)) { dead = true; break; }
        seen.add(k); path.push(k);
        const [ex, ey] = F.DIRS[t.dir];
        x += ex; y += ey;
      }
      c.routes[id] = { path, dest, dead };
    }
    // スパゲッティ度：曲がり・絡まり・行き止まり・使われていないベルト
    let pen = 0, belts = 0;
    for (const id in f.b) {
      const b = f.b[id];
      if (b.type !== 'belt') continue;
      belts++;
      c.beltCells.push(F.idx(f, b.x, b.y));
      const [dx, dy] = F.DIRS[b.dir];
      let inputs = 0, straightIn = false;
      for (let d = 0; d < 4; d++) {
        const [ox, oy] = F.DIRS[d];
        const n = F.at(s, b.x + ox, b.y + oy);
        if (!n) continue;
        const nOutX = n.x + F.DIRS[n.dir][0], nOutY = n.y + F.DIRS[n.dir][1];
        const feedsMe = nOutX === b.x && nOutY === b.y && (n.type === 'belt' || F.producesItems(n));
        const iFeed = b.x + dx === n.x && b.y + dy === n.y;
        if (feedsMe) { inputs++; if (ox === -dx && oy === -dy) straightIn = true; }
        else if (!iFeed && n.type === 'belt' && n.dir !== b.dir) pen += 0.5; // 向きの違うベルトが横にくっついている＝絡まり
      }
      if (inputs > 0 && !straightIn) pen += 0.35; // 曲がり角
      if (inputs > 1) pen += 0.25;                  // 合流
      if (inputs === 0) pen += 0.6;                 // 何も流れてこないベルト
      // 行き止まり：たどった先に設備がない
      let x = b.x, y = b.y, guard = 0, ok = false;
      const seen = new Set();
      while (guard++ < 400) {
        const t = F.at(s, x, y);
        if (!t) break;
        if (t.type !== 'belt') { ok = true; break; }
        const k = x + ',' + y; if (seen.has(k)) break; seen.add(k);
        x += F.DIRS[t.dir][0]; y += F.DIRS[t.dir][1];
      }
      if (!ok) pen += 1;
    }
    c.beltCount = belts;
    c.spaghetti = belts ? U.clamp(pen / Math.max(6, belts) * 1.2, 0, 1) : 0;
    f.spaghetti = c.spaghetti;
    cache.set(f, c);
    return c;
  };
  F.producesItems = function (b) { return b.type === 'miner' || b.type === 'furnace' || b.type === 'assembler'; };
  F.hasFront = function (b) { return F.producesItems(b) || b.type === 'port'; };
  /** 設備 t が受け取りたい材料の一覧（供給ポート用） */
  F.needs = function (s, t) {
    if (t.type === 'assembler') { const r = F.RECIPES[t.recipe]; return r ? Object.keys(r.in) : []; }
    if (t.type === 'lab') return ['sciencePack'];
    if (t.type === 'power') return ['coal'];
    if (t.type === 'furnace') { if (t.smelt) return [t.smelt]; const cur = Object.keys(F.SMELT).find((o) => (t.inBuf[o] || 0) > 0); return cur ? [cur] : Object.keys(F.SMELT).filter((o) => (s.inv[o] || 0) > 0).slice(0, 1); }
    if (F.extraNeeds && F.extraNeeds[t.type]) return F.extraNeeds[t.type](s, t);
    return [];
  };
  F.extraNeeds = {};

  // ---------- 受け入れ ----------
  F.storageCap = function (s) {
    let cap = B.factory.coreCap;
    for (const id in s.factory.b) { const b = s.factory.b[id]; if (b.type === 'storage') cap += B.factory.storageCap * (1 + 0.5 * (b.lvl - 1)); }
    return Math.floor(cap * (F.capMult ? F.capMult(s) : 1));
  };
  /** b が item をあと何個受け取れるか */
  F.room = function (s, b, item, scale, capCache) {
    const d = F.BUILDINGS[b.type];
    if (b.disabled) return 0;
    if (d.accepts === 'all') { const cap = capCache || F.storageCap(s); return Math.max(0, cap - (s.inv[item] || 0)); }
    const have = b.inBuf[item] || 0;
    if (b.type === 'furnace') return F.SMELT[item] && (!b.smelt || b.smelt === item) ? Math.max(0, 10 * scale - have) : 0;
    if (b.type === 'assembler') { const r = F.RECIPES[b.recipe]; return r && r.in[item] ? Math.max(0, (r.in[item] * 3 + 4) * scale - have) : 0; }
    if (b.type === 'lab') return item === 'sciencePack' ? Math.max(0, 10 * scale - have) : 0;
    if (b.type === 'power') return item === 'coal' ? Math.max(0, 20 * scale - have) : 0;
    if (F.extraRoom && F.extraRoom[b.type]) return F.extraRoom[b.type](s, b, item, scale);
    return 0;
  };
  F.accept = function (s, b, item, n) {
    const d = F.BUILDINGS[b.type];
    if (d.accepts === 'all') { G.add(s, item, n); s.factory.produced[item] = (s.factory.produced[item] || 0) + n; G.emit(s, 'factoryDeliver', { item, n }); }
    else b.inBuf[item] = (b.inBuf[item] || 0) + n;
  };

  // ---------- 速さ ----------
  F.levelMult = function (b) { return 1 + 0.35 * (b.lvl - 1); };
  F.speedMult = []; // (s, b) => 倍率（研究・相棒など）
  F.buildingSpeed = function (s, b, base) {
    let m = base * F.levelMult(b);
    for (const fn of F.speedMult) m *= fn(s, b) || 1;
    return m;
  };
  F.powerSupply = []; // (s) => 追加の発電量
  F.computePower = function (s, dt, apply) {
    const f = s.factory;
    let supply = 0, demand = 0, burners = 0;
    for (const id in f.b) {
      const b = f.b[id];
      if (b.disabled) continue;
      const d = F.BUILDINGS[b.type];
      if (b.type === 'power') burners++;
      else if (d.power > 0) supply += d.power * (b.type === 'core' ? 1 : F.levelMult(b));
      else if (d.power < 0) demand += -d.power;
    }
    // 発電所：ベルトで届いた石炭 → 持ち物の石炭 の順に燃やす
    let fueled = 0;
    for (const id in f.b) {
      const b = f.b[id];
      if (b.type !== 'power' || b.disabled) continue;
      const need = dt / F.BUILDINGS.power.burn;
      b.fuel = b.fuel || 0;
      if (b.fuel < need) {
        const take = Math.ceil(need - b.fuel);
        const fromBuf = Math.min(take, Math.floor(b.inBuf.coal || 0));
        if (apply) { b.inBuf.coal = (b.inBuf.coal || 0) - fromBuf; b.fuel += fromBuf; }
        const rest = take - fromBuf;
        if (rest > 0 && (s.inv.coal || 0) >= rest) { if (apply) { s.inv.coal -= rest; b.fuel += rest; } }
      }
      const ok = b.fuel >= need - 1e-9 || (!apply && ((b.inBuf.coal || 0) + (s.inv.coal || 0)) > 0);
      if (ok) { if (apply) b.fuel -= need; supply += F.BUILDINGS.power.power * F.levelMult(b) * (F.powerPlantMult ? F.powerPlantMult(s) : 1); fueled++; b.state = 'work'; }
      else b.state = 'nofuel';
    }
    for (const fn of F.powerSupply) supply += fn(s) || 0;
    const sat = demand > 0 ? Math.min(1, supply / demand) : 1;
    f.power = { supply: Math.round(supply * 10) / 10, demand, sat, burners, fueled };
    return f.power;
  };

  // ---------- 1ステップ進める ----------
  F.step = function (s, dt, now) {
    const f = s.factory;
    if (!f || !f.cells) return;
    const L = F.layout(s);
    const pw = F.computePower(s, dt, true);
    const hasCharge = f.charge > 0;
    const chargeF = hasCharge ? 1 : B.factory.chargeIdleSpeed;
    const spagF = 1 - B.factory.spaghettiPenalty * L.spaghetti;
    const base = pw.sat * chargeF * spagF * (F.globalMult ? F.globalMult(s) : 1);
    const scale = Math.max(1, dt);
    const capCache = F.storageCap(s);
    let working = 0;
    // 1) 運ぶ（ベルトは1マスごとに「運べる量」がたまっていき、運ぶと減る）
    const beltCap = F.BUILDINGS.belt.speed * dt * spagF * (F.beltMult ? F.beltMult(s) : 1);
    const credit = f.beltCredit = (f.beltCredit && f.beltCredit.ver === f.ver) ? f.beltCredit : { ver: f.ver };
    const credMax = Math.max(2, beltCap * 1.5);
    for (const k of L.beltCells) credit[k] = Math.min(credMax, (credit[k] || 0) + beltCap);
    const flowNow = {};
    for (const id in L.routes) {
      const b = f.b[id];
      if (!b) continue;
      const r = L.routes[id];
      const items = Object.keys(b.outBuf).filter((k) => b.outBuf[k] >= 1);
      if (!items.length) continue;
      if (!r.dest) { b.blocked = true; continue; }
      const dst = f.b[r.dest];
      let moved = false;
      for (const item of items) {
        let n = Math.floor(b.outBuf[item]);
        n = Math.min(n, Math.floor(F.room(s, dst, item, scale, capCache)));
        for (const k of r.path) n = Math.min(n, Math.floor(credit[k] + 1e-9));
        if (n <= 0) continue;
        for (const k of r.path) { credit[k] -= n; flowNow[k] = item; }
        b.outBuf[item] -= n;
        F.accept(s, dst, item, n);
        moved = true;
      }
      b.blocked = !moved && items.length > 0;
    }
    f.beltFlow = flowNow;
    // 2) つくる
    for (const id in f.b) {
      const b = f.b[id];
      if (b.disabled) { b.state = 'broken'; continue; }
      const d = F.BUILDINGS[b.type];
      const outTotal = Object.values(b.outBuf).reduce((a, v) => a + v, 0);
      const outCap = 5 * scale;
      if (b.type === 'miner') {
        if (outTotal >= outCap) { b.state = 'full'; continue; }
        b.prog += F.buildingSpeed(s, b, d.rate) * base * dt;
        const n = Math.floor(b.prog);
        if (n > 0) { const k = Math.min(n, Math.ceil(outCap - outTotal)); b.outBuf[b.ore] = (b.outBuf[b.ore] || 0) + k; b.prog -= n; }
        b.state = pw.sat < 0.5 ? 'lowpower' : 'work'; working++;
      } else if (b.type === 'furnace') {
        const ore = Object.keys(F.SMELT).find((o) => (b.inBuf[o] || 0) >= F.SMELT[o].n);
        if (!ore) { b.state = 'noinput'; b.prog = Math.min(b.prog, 0.99); continue; }
        if (outTotal >= outCap) { b.state = 'full'; continue; }
        b.prog += F.buildingSpeed(s, b, 1 / d.time) * base * dt;
        let made = 0;
        while (b.prog >= 1 && (b.inBuf[ore] || 0) >= F.SMELT[ore].n && outTotal + made < outCap) {
          b.prog -= 1; b.inBuf[ore] -= F.SMELT[ore].n; made++;
        }
        if (made) { const out = F.SMELT[ore].out; b.outBuf[out] = (b.outBuf[out] || 0) + made; }
        if (b.prog > 1) b.prog = 1;
        b.state = 'work'; working++;
      } else if (b.type === 'assembler') {
        const r = F.RECIPES[b.recipe];
        if (!r) { b.state = 'norecipe'; continue; }
        const can = Object.keys(r.in).every((k) => (b.inBuf[k] || 0) >= r.in[k]);
        if (!can) { b.state = 'noinput'; b.prog = Math.min(b.prog, 0.99); continue; }
        if (outTotal >= outCap) { b.state = 'full'; continue; }
        b.prog += F.buildingSpeed(s, b, 1 / r.time) * base * dt;
        let made = 0;
        while (b.prog >= 1 && Object.keys(r.in).every((k) => (b.inBuf[k] || 0) >= r.in[k]) && outTotal + made < outCap) {
          b.prog -= 1; for (const k of Object.keys(r.in)) b.inBuf[k] -= r.in[k]; made++;
        }
        if (made) b.outBuf[b.recipe] = (b.outBuf[b.recipe] || 0) + made;
        if (b.prog > 1) b.prog = 1;
        b.state = 'work'; working++;
      } else if (b.type === 'lab') {
        if ((b.inBuf.sciencePack || 0) < 1) { b.state = 'noinput'; b.prog = Math.min(b.prog, 0.99); continue; }
        b.prog += F.buildingSpeed(s, b, 1 / d.time) * base * dt;
        let used = 0;
        while (b.prog >= 1 && (b.inBuf.sciencePack || 0) >= 1) { b.prog -= 1; b.inBuf.sciencePack -= 1; used++; }
        if (used) { const rp = used * d.rpPerPack * (F.labMult ? F.labMult(s, b) : 1); s.rp += rp; f.produced.rp = (f.produced.rp || 0) + rp; G.emit(s, 'labRP', { rp }); }
        if (b.prog > 1) b.prog = 1;
        b.state = 'work'; working++;
      } else if (b.type === 'port') {
        // 正面の設備が必要な材料を、持ち物から送りこむ
        const [dx, dy] = F.DIRS[b.dir];
        const t = F.at(s, b.x + dx, b.y + dy);
        const needs = t ? F.needs(s, t) : [];
        if (!needs.length) { b.state = 'noinput'; continue; }
        b.prog = Math.min(b.prog + F.buildingSpeed(s, b, d.rate) * base * dt, d.rate * Math.max(1, dt) * 2);
        let moved = 0;
        for (const item of needs) {
          const n = Math.floor(Math.min(b.prog, s.inv[item] || 0, F.room(s, t, item, scale, capCache)));
          if (n <= 0) continue;
          s.inv[item] -= n; F.accept(s, t, item, n); b.prog -= n; moved += n;
        }
        b.state = moved || b.prog >= 1 ? 'work' : 'noinput';
        if (moved) working++;
      } else if (F.extraStep && F.extraStep[b.type]) {
        if (F.extraStep[b.type](s, b, dt, base, now)) working++;
      }
    }
    // 3) 演算チャージを消費
    if (working > 0 && f.charge > 0) f.charge = Math.max(0, f.charge - dt);
    f.working = working;
  };

  /** 留守中の生産。最大 offlineMaxHours 時間、効率 offlineEff */
  F.simulateOffline = function (s, seconds, now) {
    const f = s.factory;
    if (!f || !(seconds > 5)) return null;
    const cap = B.factory.offlineMaxHours * 3600;
    const sec = Math.min(seconds, cap);
    const before = Object.assign({}, s.inv, { rp: s.rp });
    const chargeBefore = f.charge;
    const steps = Math.min(4000, Math.max(1, Math.ceil(sec / 2)));
    const dt = sec / steps;
    const effDt = dt * B.factory.offlineEff;
    for (let i = 0; i < steps; i++) F.step(s, effDt, now - (steps - i) * dt * 1000);
    const gained = {};
    for (const k of Object.keys(s.inv)) { const d = (s.inv[k] || 0) - (before[k] || 0); if (d > 0) gained[k] = d; }
    const drp = s.rp - before.rp; if (drp > 0.5) gained.rp = Math.floor(drp);
    const report = { seconds, simulated: sec, capped: seconds > cap, gained, chargeUsed: chargeBefore - f.charge, chargeLeft: f.charge };
    f.lastReport = report;
    return report;
  };

  /** 正解で演算チャージを補充 */
  G.on('answer', (s, d) => {
    if (!d.ok || !s.factory) return;
    const add = B.factory.chargePerAnswer[d.level] * (d.first ? 1 : 0.5) * (F.chargeMult ? F.chargeMult(s) : 1);
    s.factory.charge = Math.min(F.chargeMax(s), s.factory.charge + add);
  });
  F.chargeMax = function (s) { return B.factory.chargeMax + (F.chargeMaxBonus ? F.chargeMaxBonus(s) : 0); };

  /** 生産量の記録（直近の毎分レート表示用） */
  F.sampleRates = function (s, now) {
    const f = s.factory;
    const snap = { t: now, p: Object.assign({}, f.produced) };
    f.rateLog.push(snap);
    while (f.rateLog.length > 2 && now - f.rateLog[0].t > 120000) f.rateLog.shift();
    if (f.rateLog.length > 30) f.rateLog.splice(0, f.rateLog.length - 30);
  };
  F.ratesPerMin = function (s) {
    const L = s.factory.rateLog;
    if (L.length < 2) return {};
    const a = L[0], b = L[L.length - 1];
    const mins = (b.t - a.t) / 60000;
    if (mins <= 0.05) return {};
    const out = {};
    for (const k of Object.keys(b.p)) { const d = b.p[k] - (a.p[k] || 0); if (d > 0) out[k] = d / mins; }
    return out;
  };

  let sampleAcc = 0;
  G.register({
    id: 'factory',
    init(s, now) { F.initFactory(s, now); },
    migrate(s, now) {
      if (!s.factory || !Array.isArray(s.factory.cells)) F.initFactory(s, now);
      if (!s.factory.rateLog) s.factory.rateLog = [];
    },
    tick(s, dt, now) {
      F.step(s, dt, now);
      sampleAcc += dt;
      if (sampleAcc >= 5) { sampleAcc = 0; F.sampleRates(s, now); }
    },
  });
  MF.Factory = F;
})(globalThis.MF = globalThis.MF || {});
