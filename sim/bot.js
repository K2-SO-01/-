// 数学ファクトリー：自動プレイボット（バランス調整用）
// 正答率 p の「プレイヤー」が、問題を解き、工場を建て、研究し、襲撃と戦い、ロケットで脱出するまでを遊ぶ。
const MF = globalThis.MF;
const G = MF.Game, F = MF.Factory, R = MF.Research, P = MF.Pals, Bt = MF.Battle, S = MF.Study, GX = MF.Galaxy, St = MF.Story, U = MF.Util;

const ORE_OF = { ironPlate: 'iron', copperPlate: 'copper', brick: 'stone', wafer: 'silicon' };
const RAW = ['iron', 'copper', 'coal', 'stone', 'uranium', 'silicon', 'oil'];
const RESEARCH_ORDER = ['automation', 'logistics', 'mapExpand1', 'labs', 'storage2', 'chargeCap1', 'smelting2', 'upgrade1', 'military', 'electricity', 'plastics', 'quizBoost1',
  'mapExpand2', 'blueprint', 'upgrade2', 'electronics', 'chargeCap2', 'nuclear', 'rocketry', 'solar', 'quizBoost2'];

class Bot {
  constructor(s, opts) {
    this.s = s;
    this.p = opts.p;
    this.rng = U.rng(opts.seed);
    this.t = opts.t0;           // いまの時刻（ms）
    this.t0 = opts.t0;
    this.log = [];
    this.goals = [];
    this.built = new Set();      // 済んだ建設目標
    this.answers = 0;
    this.fails = {};
    this.nextRun = 150 * 60;     // 侵攻ランに行くプレイ時間（秒）
    this.runs = [];
    this.raids = [];
    this.err = null;
  }
  r() { return this.rng.next(); }
  playSec() { return (this.t - this.t0) / 1000; }
  // ---- 時間を進める（工場が動く） ----
  advance(sec) {
    const s = this.s;
    let left = sec;
    while (left > 0) {
      const dt = Math.min(5, left);
      this.t += dt * 1000;
      G.tick(s, dt, this.t);
      left -= dt;
    }
  }
  accuracy(level) { return U.clamp(this.p + [0.1, 0, -0.15][level], 0.05, 0.98); }
  // ---- 1問解く ----
  answerOne(opts) {
    const s = this.s;
    const q = G.Quiz.next(s, this.t, opts || {});
    const lv = s.quiz.current.level;
    const think = [30, 45, 70][lv] * (0.7 + this.r() * 0.6);
    const ok = this.r() < this.accuracy(lv);
    this.advance(think);
    let res = G.Quiz.answer(s, ok ? MF.Questions.answerText(q) : U.fstr(U.fadd(q.answer, 1)), this.t);
    if (!ok) {
      // ヒントを見てもう一度（半分くらいの確率で正解）
      this.advance(15);
      const ok2 = this.r() < this.accuracy(lv) * 0.6;
      res = G.Quiz.answer(s, ok2 ? MF.Questions.answerText(q) : U.fstr(U.fadd(q.answer, 2)), this.t);
      if (!s.quiz.current.done) { this.advance(20); while (!s.quiz.current.done) G.Quiz.revealHint(s, this.t); }
    }
    this.answers++;
    return ok;
  }

  // =================== 工場づくり ===================
  core() { return Object.values(this.s.factory.b).find((b) => b.type === 'core'); }
  free(x, y) { const f = this.s.factory; return F.inside(f, x, y) && !f.cells[F.idx(f, x, y)]; }
  isOre(x, y) { const f = this.s.factory; return !!f.ore[F.idx(f, x, y)]; }
  /** 設備 dst の入口まで、src の出口からベルトを引く（既存のベルトに合流してもよい） */
  connect(src, dst, placed) {
    const s = this.s, f = s.factory;
    // となりならベルト不要
    for (let d = 0; d < 4; d++) { const [dx, dy] = F.DIRS[d]; if (src.x + dx === dst.x && src.y + dy === dst.y) { src.dir = d; f.ver++; return true; } }
    const L = F.layout(s);
    const leadsTo = new Set();
    for (const id in L.routes) { const r = L.routes[id]; if (r.dest === dst.id) r.path.forEach((k) => leadsTo.add(k)); }
    const goal = (x, y) => {
      for (let d = 0; d < 4; d++) {
        const [dx, dy] = F.DIRS[d], nx = x + dx, ny = y + dy;
        if (nx === dst.x && ny === dst.y) return d;
        if (F.inside(f, nx, ny) && leadsTo.has(F.idx(f, nx, ny))) return d;
      }
      return -1;
    };
    // ダイクストラ（鉱脈の上はなるべく避ける）
    const W = f.w, H = f.h, INF = 1e9;
    const dist = new Array(W * H).fill(INF), prev = new Array(W * H).fill(-1);
    const startDir = new Array(W * H).fill(-1);
    const q = [];
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = F.DIRS[d], x = src.x + dx, y = src.y + dy;
      if (!this.free(x, y)) continue;
      const k = F.idx(f, x, y); dist[k] = this.isOre(x, y) ? 25 : 1; startDir[k] = d; q.push(k);
    }
    let found = -1, foundDir = -1;
    while (q.length) {
      let bi = 0; for (let i = 1; i < q.length; i++) if (dist[q[i]] < dist[q[bi]]) bi = i;
      const k = q.splice(bi, 1)[0];
      const x = k % W, y = Math.floor(k / W);
      const gd = goal(x, y);
      if (gd >= 0) { found = k; foundDir = gd; break; }
      if (dist[k] > 120) continue;
      for (let d = 0; d < 4; d++) {
        const [dx, dy] = F.DIRS[d], nx = x + dx, ny = y + dy;
        if (!this.free(nx, ny)) continue;
        const nk = F.idx(f, nx, ny), nd = dist[k] + (this.isOre(nx, ny) ? 25 : 1);
        if (nd < dist[nk]) { if (dist[nk] === INF) q.push(nk); dist[nk] = nd; prev[nk] = k; startDir[nk] = startDir[k]; }
      }
    }
    if (found < 0) return false;
    const path = [];
    for (let k = found; k >= 0; k = prev[k]) path.unshift(k);
    if ((s.inv.iron || 0) < path.length) return false;
    src.dir = startDir[path[0]]; f.ver++;
    for (let i = 0; i < path.length; i++) {
      const k = path[i], x = k % W, y = Math.floor(k / W);
      let dir;
      if (i < path.length - 1) { const nk = path[i + 1]; const nx = nk % W, ny = Math.floor(nk / W); dir = F.DIRS.findIndex(([dx, dy]) => x + dx === nx && y + dy === ny); }
      else dir = foundDir;
      const r = F.place(s, 'belt', x, y, dir);
      if (!r.ok) return false;
      placed.push(r.b.id);
    }
    return true;
  }
  /** 近くの空き地（鉱脈ではなく、まわりに空きがある場所） */
  spotNear(x0, y0) {
    const f = this.s.factory;
    let best = null;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      if (!this.free(x, y) || this.isOre(x, y)) continue;
      let freeN = 0; for (const [dx, dy] of F.DIRS) if (this.free(x + dx, y + dy)) freeN++;
      if (freeN < 2) continue;
      const d = Math.abs(x - x0) + Math.abs(y - y0) - freeN * 0.3;
      if (!best || d < best.d) best = { x, y, d };
    }
    return best;
  }
  oreSpot(ore, near) {
    const f = this.s.factory;
    let best = null;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      if (f.ore[F.idx(f, x, y)] !== ore || !this.free(x, y)) continue;
      let freeN = 0; for (const [dx, dy] of F.DIRS) if (this.free(x + dx, y + dy)) freeN++;
      if (!freeN) continue;
      const d = Math.abs(x - near.x) + Math.abs(y - near.y);
      if (!best || d < best.d) best = { x, y, d };
    }
    return best;
  }
  place(type, x, y, placed, opts) { const r = F.place(this.s, type, x, y, 1, opts); if (r.ok) placed.push(r.b.id); return r.ok ? r.b : null; }
  minerTo(ore, dst, placed) {
    const sp = this.oreSpot(ore, dst);
    if (!sp) return null;
    const m = this.place('miner', sp.x, sp.y, placed);
    if (!m) return null;
    return this.connect(m, dst, placed) ? m : null;
  }
  smelterTo(ore, dst, placed) {
    const sp = this.oreSpot(ore, dst);
    if (!sp) return null;
    const m = this.place('miner', sp.x, sp.y, placed);
    if (!m) return null;
    // 採掘機のとなり（鉱脈以外を優先）に溶鉱炉
    let fs = null;
    for (const pass of [0, 1]) for (let d = 0; d < 4 && !fs; d++) { const [dx, dy] = F.DIRS[d], x = m.x + dx, y = m.y + dy; if (this.free(x, y) && (pass || !this.isOre(x, y))) fs = { x, y, d }; }
    if (!fs) return null;
    const fu = this.place('furnace', fs.x, fs.y, placed);
    if (!fu) return null;
    m.dir = fs.d; this.s.factory.ver++;
    return this.connect(fu, dst, placed) ? fu : null;
  }
  producerTo(item, dst, placed) {
    if (ORE_OF[item]) return this.smelterTo(ORE_OF[item], dst, placed);
    if (RAW.indexOf(item) >= 0) return this.minerTo(item, dst, placed);
    return this.assemblerTo(item, dst, placed);
  }
  assemblerTo(recipe, dst, placed) {
    const sp = this.spotNear(dst.x, dst.y);
    if (!sp) return null;
    const a = this.place('assembler', sp.x, sp.y, placed, { recipe });
    if (!a) return null;
    F.setRecipe(this.s, a.id, recipe);
    if (!this.connect(a, dst, placed)) return null;
    for (const inp of Object.keys(F.RECIPES[recipe].in)) if (!this.producerTo(inp, a, placed)) return null;
    return a;
  }
  /** 供給ポートつきの組立ライン：持ち物から材料をもらって recipe をつくり、dst へ送る */
  portLine(recipe, dst, placed, smelt) {
    const s = this.s, f = s.factory;
    const mk = (x, y) => { const type = smelt ? 'furnace' : 'assembler'; const a = this.place(type, x, y, placed, { recipe }); if (!a) return null; if (smelt) F.setSmelt(s, a.id, smelt); else F.setRecipe(s, a.id, recipe); return a; };
    // まず dst のとなりに組立機、そのとなりにポート
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = F.DIRS[d], ax = dst.x + dx, ay = dst.y + dy;
      if (!this.free(ax, ay)) continue;
      for (let e = 0; e < 4; e++) {
        const [ex, ey] = F.DIRS[e], px = ax + ex, py = ay + ey;
        if ((px === dst.x && py === dst.y) || !this.free(px, py)) continue;
        const a = mk(ax, ay);
        if (!a) return null;
        a.dir = (d + 2) % 4;
        const pt = this.place('port', px, py, placed);
        if (!pt) return null;
        pt.dir = (e + 2) % 4; f.ver++;
        return a;
      }
    }
    // となりが空いていなければ、ベルトでつなぐ
    const sp = this.spotNear(dst.x, dst.y);
    if (!sp) return null;
    const a = mk(sp.x, sp.y);
    if (!a) return null;
    if (!this.connect(a, dst, placed)) return null;
    for (let e = 0; e < 4; e++) {
      if (e === a.dir) continue;
      const [ex, ey] = F.DIRS[e], px = a.x + ex, py = a.y + ey;
      if (!this.free(px, py)) continue;
      const pt = this.place('port', px, py, placed);
      if (!pt) return null;
      pt.dir = (e + 2) % 4; f.ver++;
      return a;
    }
    return null;
  }
  /** まとめて建てる。失敗したら全部撤去（全額返ってくる） */
  tx(fn) {
    const placed = [];
    let ok = false;
    try { ok = !!fn(placed); } catch (e) { ok = false; }
    if (!ok) { for (const id of placed.reverse()) F.remove(this.s, id); this.s.factory.ver++; }
    return ok;
  }
  afford(cost, mult) { return G.has(this.s, cost, mult || 1); }

  // ---- 次に建てるもの（足りない物のラインを足していく） ----
  lineFor(item, dst, pl) {
    const s = this.s;
    if (RAW.indexOf(item) >= 0) return this.minerTo(item, dst, pl);
    if (ORE_OF[item]) { const r = this.smelterTo(ORE_OF[item], dst, pl); if (r || !R.has(s, 'logistics') || (s.inv[ORE_OF[item]] || 0) < 30) return r; for (const id of pl.splice(0)) F.remove(s, id); return this.portLine(null, dst, pl, ORE_OF[item]); }
    if (R.has(s, 'logistics')) { const r = this.portLine(item, dst, pl); if (r) return r; for (const id of pl.splice(0).reverse()) F.remove(s, id); s.factory.ver++; }
    return this.assemblerTo(item, dst, pl);
  }
  build() {
    const s = this.s, core = this.core();
    const has = (t) => F.count(s, t);
    const lines = this.lines = this.lines || {};
    if (this.lastW !== s.factory.w || this.playSec() - (this.failReset || 0) > 1200) { this.lastW = s.factory.w; this.fails = {}; this.failReset = this.playSec(); }
    const tryLine = (item, dst, cond, max) => {
      if (!cond || (lines[item] || 0) >= (max || 1)) return false;
      const key = item + (lines[item] || 0);
      if ((this.fails[key] || 0) > 3) return false;
      const ok = this.tx((pl) => this.lineFor(item, dst || core, pl));
      if (ok) lines[item] = (lines[item] || 0) + 1; else this.fails[key] = (this.fails[key] || 0) + 1;
      return ok;
    };
    const one = (key, cond, fn) => { if (this.built.has(key) || !cond || (this.fails[key] || 0) > 3) return false; const ok = this.tx(fn); if (ok) this.built.add(key); else this.fails[key] = (this.fails[key] || 0) + 1; return ok; };
    const low = (k, n) => (s.inv[k] || 0) < n;
    const af = (c, m) => this.afford(c, m);
    // 電力
    const pw = F.computePower(s, 0.25, false);
    if (pw.demand + 3 > pw.supply) {
      if (F.isUnlocked(s, 'solar') && af(F.BUILDINGS.solar.cost)) { if (this.tx((pl) => { const sp = this.spotNear(0, 0); return sp && this.place('solar', sp.x, sp.y, pl); })) return true; }
      else if (pw.burners === pw.fueled && (s.inv.coal || 0) > 40 && has('power') < 10 && af(F.BUILDINGS.power.cost)) { if (this.tx((pl) => { const sp = this.spotNear(0, 0); return sp && this.place('power', sp.x, sp.y, pl); })) return true; }
    }
    if (has('power') > 0 && (s.inv.coal || 0) < 60 && tryLine('coal', core, af({ iron: 8, stone: 4 }), 1 + has('power'))) return true;
    // 序盤：鉱石と板
    const ore = af({ iron: 8, stone: 4 });
    if (tryLine('iron', core, ore, 1)) return true;
    if (tryLine('stone', core, ore, 1)) return true;
    if (tryLine('copper', core, ore, 1)) return true;
    if (tryLine('coal', core, ore, 1)) return true;
    const sm = af({ iron: 10, stone: 16 });
    if (tryLine('ironPlate', core, sm && low('ironPlate', 150), 7)) return true;
    if (tryLine('copperPlate', core, sm && low('copperPlate', 100), 4)) return true;
    if (tryLine('brick', core, sm && low('brick', 80), 2)) return true;
    if (tryLine('iron', core, ore && low('iron', 100) && (lines.ironPlate || 0) > 0, 4)) return true;
    if (tryLine('stone', core, ore && low('stone', 100), 3)) return true;
    // 倉庫（上限に近い資源があれば）
    const cap = F.storageCap(s);
    if (Object.keys(s.inv).some((k) => (s.inv[k] || 0) > cap * 0.9) && af(F.BUILDINGS.storage.cost, 1.5) && has('storage') < 3) {
      if (this.tx((pl) => { const sp = this.spotNear(0, s.factory.h - 1); return sp && this.place('storage', sp.x, sp.y, pl); })) return true;
    }
    // 中盤：組立と研究
    const asm = af({ ironPlate: 30, copperPlate: 20, iron: 30, stone: 30 });
    const auto = R.has(s, 'automation'), port = R.has(s, 'logistics');
    if (tryLine('gear', core, auto && asm && low('gear', 60), 3)) return true;
    if (tryLine('circuit', core, auto && asm && low('circuit', 60), 3)) return true;
    if (R.has(s, 'labs') && port && has('lab') < 2 && asm && (s.inv.gear || 0) > 5) {
      if (one('lab' + has('lab'), true, (pl) => { const sp = this.spotNear(core.x + 3, core.y + 3); if (!sp) return false; const lab = this.place('lab', sp.x, sp.y, pl); return lab && this.portLine('sciencePack', lab, pl); })) return true;
    }
    if (R.has(s, 'military') && port && asm) {
      if (tryLine('ammo', core, low('ammo', 40), 1)) return true;
      if (has('turret') < 3 && af({ ironPlate: 40, gear: 15, stone: 20 }) && one('turret' + has('turret'), true, (pl) => { const sp = this.spotNear(0, 0); if (!sp) return false; const t = this.place('turret', sp.x, sp.y, pl); if (!t) return false; for (let e = 0; e < 4; e++) { const [ex, ey] = F.DIRS[e]; if (this.free(t.x + ex, t.y + ey)) { const pt = this.place('port', t.x + ex, t.y + ey, pl); if (!pt) return false; pt.dir = (e + 2) % 4; s.factory.ver++; return true; } } return false; })) return true;
    }
    // 終盤：電子部品と燃料
    if (tryLine('oil', core, R.has(s, 'plastics') && ore && ((lines.oil || 0) === 0 || low('oil', 50)), 2)) return true;
    if (tryLine('plastic', core, R.has(s, 'plastics') && port && asm && low('plastic', 40), 2)) return true;
    if (tryLine('silicon', core, R.has(s, 'electronics') && ore, 1)) return true;
    if (tryLine('wafer', core, R.has(s, 'electronics') && sm && low('wafer', 40), 2)) return true;
    if (tryLine('chip', core, R.has(s, 'electronics') && port && asm && low('chip', 40), 3)) return true;
    if (tryLine('uranium', core, R.has(s, 'nuclear') && ore, 1)) return true;
    if (tryLine('fuelCell', core, R.has(s, 'nuclear') && port && asm && low('fuelCell', 20), 2)) return true;
    // ロケット
    if (R.has(s, 'rocketry')) {
      if (one('silo', af(F.BUILDINGS.silo.cost), (pl) => { const sp = this.spotNear(s.factory.w - 2, 1); return sp && this.place('silo', sp.x, sp.y, pl); })) return true;
      const silo = GX.silo(s);
      if (silo && port && asm && one('rocketLine', true, (pl) => this.portLine('rocketPart', silo, pl))) return true;
    }
    // 強化（余裕があるとき）
    if (this.r() < 0.25) {
      const cands = Object.values(s.factory.b).filter((b) => F.canUpgrade(s, b) && ['miner', 'furnace', 'assembler', 'lab', 'port'].indexOf(b.type) >= 0);
      for (const b of cands) { const c = F.upgradeCost(s, b); if (G.has(s, c, 2)) { F.upgrade(s, b.id); return true; } }
    }
    return false;
  }
  repair() { for (const b of Object.values(this.s.factory.b)) if (b.disabled) F.repair(this.s, b.id); }
  // ---- 研究 ----
  research() {
    const s = this.s;
    if (s.research.current) return;
    for (const id of RESEARCH_ORDER) { if (R.status(s, id) === 'available' && (s.research.paid[id] || s.rp >= R.byId[id].rp)) { R.start(s, id); return; } }
  }
  questionOpts() {
    const s = this.s;
    const id = s.research.current;
    if (id && this.r() < 0.6) {
      const t = R.byId[id], p = s.research.prog[id] || {};
      const need = Object.keys(t.req).filter((k) => (p[k] || 0) < t.req[k]);
      if (need.length) return { topic: need[Math.floor(this.r() * need.length)] };
    }
    return {};
  }
  // ---- 相棒 ----
  pals() {
    const s = this.s;
    for (const e of P.readyEggs(s)) P.hatch(s, e.id, this.t);
    for (const pal of s.pals.list) {
      if (pal.at && s.factory.b[pal.at]) continue;
      let best = null;
      for (const b of Object.values(s.factory.b)) { if (b.pal || b.type === 'belt') continue; const v = P.bonusFor(s, pal, b.type); if (v > 0 && (!best || v > best.v)) best = { b, v }; }
      if (best) P.assign(s, pal.id, best.b.id);
    }
    if (!s.pals.partner && s.pals.list.length) s.pals.partner = s.pals.list.slice().sort((a, b) => P.skill(b, 'defense') - P.skill(a, 'defense'))[0].id;
  }
  // ---- 戦闘 ----
  raid() {
    const s = this.s;
    if (!s.battle.raid.pending || s.battle.active) return;
    Bt.startRaid(s, this.t);
    const res = this.fightReal();
    const out = Bt.finishRaid(s, this.t);
    this.raids.push({ win: out.win, elite: !!(out && out.bundle && s.battle.raids % MF.Balance.battle.eliteEvery === 0), n: s.battle.raids });
    if (out.win && out.cards) Bt.takeRaidCard(s, out.cards[0]);
    this.repair();
    return res;
  }
  /** 本物の問題を、正答率どおりに解きながら戦う */
  fightReal() {
    const s = this.s, bot = this;
    let guard = 0;
    while (s.battle.active && !s.battle.active.over && guard++ < 600) {
      const bt = s.battle.active;
      const incoming = Bt.alive(bt).reduce((a, e) => a + (e.intent.dmg ? Bt.calcDmg(e.intent.dmg, e.str, e.weak, bt.player.vuln, 1) * (e.intent.hits || 1) : 0), 0);
      const score = (c) => { const fx = Bt.cardFx(c); return (fx.str || fx.dex || fx.metal || fx.ritual ? 40 : 0) + (incoming > bt.player.block ? (fx.block || 0) * 2 : (fx.block || 0) * 0.3) + (fx.dmg || 0) * (fx.hits || 1) + (fx.dmgAll || 0) * Bt.alive(bt).length + (fx.poison || 0) + (fx.draw || 0) * 3 + (fx.energy || 0) * 8 + (fx.heal || 0); };
      const order = bt.hand.map((c, i) => i).sort((a, b) => score(bt.hand[b]) - score(bt.hand[a]));
      let played = false;
      for (const i of order) {
        if (Bt.cost(s, bt, bt.hand[i]) > bt.player.energy) continue;
        const alive = Bt.alive(bt).sort((a, b) => a.hp - b.hp);
        const req = Bt.requestPlay(s, i, alive.length ? alive[0].idx : 0);
        if (!req.ok) continue;
        const q = G.Quiz.next(s, bot.t, req.q);
        const lv = s.quiz.current.level;
        const think = [25, 40, 60][lv] * (0.7 + bot.r() * 0.6);
        const ok = bot.r() < bot.accuracy(lv);
        bot.advance(think);
        G.Quiz.answer(s, ok ? MF.Questions.answerText(q) : U.fstr(U.fadd(q.answer, 1)), bot.t);
        let g2 = 0; while (!s.quiz.current.done && g2++ < 5) G.Quiz.revealHint(s, bot.t);
        let res = Bt.resolvePlay(s, ok, think * 1000);
        if (res && res.retry) { const ok2 = bot.r() < bot.accuracy(lv); bot.advance(30); res = Bt.resolvePlay(s, ok2, 30000); }
        played = true;
        break;
      }
      if (!played) { Bt.endTurn(s); bot.advance(5); }
    }
    return s.battle.active ? s.battle.active.over : null;
  }
  invasionRun() {
    const s = this.s;
    if (s.battle.active) return;
    Bt.startRun(s, this.t);
    let guard = 0, out = null;
    while (!out && guard++ < 300) {
      const run = s.battle.run;
      if (run.reward) { const cs = run.reward.cards.slice().sort((a, b) => Bt.CARDS[b].rarity - Bt.CARDS[a].rarity); Bt.takeRunCard(s, run.deck.length < 22 ? cs[0] : null); continue; }
      if (run.pendingRest) { const up = run.deck.findIndex((c) => !Bt.isUp(c) && Bt.CARDS[Bt.cardId(c)].rarity > 0); Bt.rest(s, run.hp < run.maxHp * 0.65 || up < 0 ? 'heal' : 'upgrade', up); continue; }
      if (run.pendingEvent) { this.answerOne({}); Bt.resolveEvent(s, this.r() < this.p); continue; }
      const opts = run.options || [];
      let idx = 0;
      const pref = run.hp < run.maxHp * 0.5 ? ['rest', 'treasure', 'event', 'battle', 'elite', 'boss'] : ['treasure', 'elite', 'battle', 'rest', 'event', 'boss'];
      let bestRank = 99;
      opts.forEach((o, i) => { const rk = pref.indexOf(o); if (rk < bestRank) { bestRank = rk; idx = i; } });
      const res = Bt.chooseNode(s, idx);
      if (!res) break;
      if (res.battle) { this.fightReal(); const r = Bt.finishRunBattle(s, this.t); if (r && r.ended) out = r; }
    }
    if (!out) out = Bt.abandonRun(s, this.t) || { floor: 0, cleared: false };
    this.runs.push({ floor: out.floor, cleared: out.cleared, at: this.playSec() });
  }
  // ---- 銀河（脱出後） ----
  galaxy() {
    const s = this.s;
    if (!s.galaxy.unlocked) return;
    if (GX.canLaunch(s)) GX.launch(s, this.t);
    if (s.galaxy.ships > 0) { const mine = GX.owned(s, 'player'); for (const p of mine) { const n = GX.adj(s, p.id).find((k) => GX.canColonize(s, k).ok); if (n !== undefined) { GX.colonize(s, n, this.t); break; } } }
    const g = s.galaxy;
    for (const E of GX.EMPIRES) { const e = g.empires[E.id]; if (!e.trade && e.stance !== 'war' && e.rel > -20 && s.rp > 200) GX.diplo(s, E.id, 'trade', this.t); }
    if (g.incoming && !s.battle.active) { GX.defend(s); this.fightReal(); GX.finishWar(s, this.t); }
  }
  event() {
    const s = this.s;
    const pe = s.galaxy.event;
    if (!pe) return;
    const ev = GX.evById[pe.id];
    const opts = ev.choices.map((c, i) => i).filter((i) => !ev.choices[i].cost || G.has(s, ev.choices[i].cost));
    const i = opts[Math.floor(this.r() * opts.length)];
    let ok = false;
    if (ev.choices[i].quiz) ok = this.answerOne({});
    GX.chooseEvent(s, i, ok, this.t);
  }
  // ---- ストーリーの特別な行動 ----
  story() {
    const s = this.s, m = St.current(s);
    if (!m) return;
    if (m.id === 'review' && s.study.weak.length) { const w = S.nextReview(s, this.t); S.startReview(s, this.t, w); this.answerQuiz(); }
    if (m.id === 'exam' && !s.study.exam) {
      S.examCreate(s, this.t, 'short');
      let q;
      while ((q = S.examNext(s, this.t))) { const lv = s.quiz.current.level; const ok = this.r() < this.accuracy(lv); this.advance([30, 45, 70][lv]); const r = G.Quiz.answer(s, ok ? MF.Questions.answerText(q) : U.fstr(U.fadd(q.answer, 1)), this.t); let g = 0; while (!s.quiz.current.done && g++ < 5) G.Quiz.revealHint(s, this.t); S.examRecord(s, ok, 40000); }
      S.examFinish(s, this.t);
    }
  }
  answerQuiz() {
    const s = this.s, q = G.Quiz.currentQuestion(s), lv = s.quiz.current.level;
    const ok = this.r() < this.accuracy(lv);
    this.advance([30, 45, 70][lv]);
    G.Quiz.answer(s, ok ? MF.Questions.answerText(q) : U.fstr(U.fadd(q.answer, 1)), this.t);
    let g = 0; while (!s.quiz.current.done && g++ < 5) G.Quiz.revealHint(s, this.t);
  }
  // ---- 1サイクル ----
  step() {
    const s = this.s;
    this.answerOne(this.questionOpts());
    if (this.answers % 2 === 0) { this.research(); while (this.build()) { /* 建てられるだけ建てる */ } }
    if (this.answers % 5 === 0) this.pals();
    if (s.battle.raid.pending) this.raid();
    if (s.galaxy.event) this.event();
    if (this.answers % 7 === 0) this.story();
    if (this.playSec() >= this.nextRun) { this.nextRun += 180 * 60; this.invasionRun(); }
    if (s.galaxy.unlocked && this.answers % 5 === 0) this.galaxy();
    if (GX.canLaunch(s) && !s.galaxy.unlocked) GX.launch(s, this.t);
  }
}
module.exports = { Bot, RESEARCH_ORDER };
