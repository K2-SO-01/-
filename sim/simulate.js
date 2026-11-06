// 数学ファクトリー：バランス調整用の自動プレイシミュレーション
//   node sim/simulate.js [--runs 100] [--hours 40] [--balance sim/balance-before.json] [--label after] [--out sim/results-after.json]
// 正答率 50% / 70% / 90% のボットが何百回も遊び、序盤・中盤・終盤に着くまでの時間、ボス戦の勝率、資源の余り、エラーや詰まりを記録する。
const path = require('path');
const fs = require('fs');
const os = require('os');
const { fork } = require('child_process');

const args = {};
process.argv.slice(2).forEach((a, i, arr) => { if (a.startsWith('--')) args[a.slice(2)] = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true; });
const RUNS = +(args.runs || 100), HOURS = +(args.hours || 40), PS = (args.ps || '0.5,0.7,0.9').split(',').map(Number);

/** バランス用の数値（調整の対象）をまとめて取り出す／上書きする */
function surface(MF) {
  return {
    Balance: MF.Balance,
    buildingCost: Object.fromEntries(Object.entries(MF.Factory.BUILDINGS).filter(([k, d]) => d.cost).map(([k, d]) => [k, d.cost])),
    building: Object.fromEntries(Object.entries(MF.Factory.BUILDINGS).map(([k, d]) => [k, { rate: d.rate, time: d.time, power: d.power, speed: d.speed, rpPerPack: d.rpPerPack, burn: d.burn }])),
    recipeTime: Object.fromEntries(Object.entries(MF.Factory.RECIPES).map(([k, r]) => [k, r.time])),
    recipeIn: Object.fromEntries(Object.entries(MF.Factory.RECIPES).map(([k, r]) => [k, r.in])),
    enemyMoves: Object.fromEntries(Object.entries(MF.Battle.ENEMIES).map(([k, e]) => [k, e.moves])),
    research: Object.fromEntries(MF.Research.TECHS.map((t) => [t.id, { rp: t.rp, req: t.req }])),
    enemyHp: Object.fromEntries(Object.entries(MF.Battle.ENEMIES).map(([k, e]) => [k, e.hp])),
  };
}
function applySurface(MF, o) {
  const merge = (dst, src) => { for (const k of Object.keys(src)) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') merge(dst[k], src[k]); else dst[k] = src[k]; } };
  if (o.Balance) merge(MF.Balance, o.Balance);
  if (o.buildingCost) for (const k of Object.keys(o.buildingCost)) if (MF.Factory.BUILDINGS[k]) MF.Factory.BUILDINGS[k].cost = o.buildingCost[k];
  if (o.building) for (const k of Object.keys(o.building)) if (MF.Factory.BUILDINGS[k]) for (const f of Object.keys(o.building[k])) if (o.building[k][f] !== undefined && o.building[k][f] !== null) MF.Factory.BUILDINGS[k][f] = o.building[k][f];
  if (o.recipeTime) for (const k of Object.keys(o.recipeTime)) if (MF.Factory.RECIPES[k]) MF.Factory.RECIPES[k].time = o.recipeTime[k];
  if (o.recipeIn) for (const k of Object.keys(o.recipeIn)) if (MF.Factory.RECIPES[k]) MF.Factory.RECIPES[k].in = o.recipeIn[k];
  if (o.enemyMoves) for (const k of Object.keys(o.enemyMoves)) if (MF.Battle.ENEMIES[k]) MF.Battle.ENEMIES[k].moves = o.enemyMoves[k];
  if (o.research) for (const t of MF.Research.TECHS) if (o.research[t.id]) { t.rp = o.research[t.id].rp; t.req = o.research[t.id].req; }
  if (o.enemyHp) for (const k of Object.keys(o.enemyHp)) if (MF.Battle.ENEMIES[k]) MF.Battle.ENEMIES[k].hp = o.enemyHp[k];
}
module.exports = { surface, applySurface };

// ---------------- 1回分のプレイ ----------------
function playOne(MF, p, seed, hours) {
  const { Bot } = require('./bot');
  const T0 = new Date(2026, 3, 1, 9, 0, 0).getTime();
  const s = MF.Game.createState(T0, seed);
  const bot = new Bot(s, { p, seed: seed * 7 + 1, t0: T0 });
  const m = {}, ans = {};
  let lastIdx = 0, lastIdxAt = 0, stuck = null, err = null, afterClear = null;
  const snap = () => { const raw = ['iron', 'copper', 'coal', 'stone', 'uranium', 'silicon', 'oil'].reduce((a, k) => a + (s.inv[k] || 0), 0); const prod = ['ironPlate', 'copperPlate', 'brick', 'gear', 'circuit'].reduce((a, k) => a + (s.inv[k] || 0), 0); return { raw: Math.round(raw), prod: Math.round(prod), rp: Math.round(s.rp), cap: MF.Factory.storageCap(s) }; };
  const mark = (k, cond) => { if (m[k] === undefined && cond) { m[k] = Math.round(bot.playSec() / 60); ans[k] = s.stats.answered; if (k === 'late' || k === 'clear') m[k + 'Snap'] = snap(); } };
  while (bot.playSec() < hours * 3600) {
    try { bot.step(); } catch (e) { err = (e && e.stack || String(e)).split('\n').slice(0, 4).join(' | '); break; }
    const done = s.story.done;
    mark('first', MF.Factory.count(s, 'miner') > 0 && (s.factory.produced.iron || s.factory.produced.stone || s.factory.produced.copper || s.factory.produced.coal));
    mark('early', done.indexOf('plates') >= 0);
    mark('mid', done.indexOf('raid') >= 0);
    mark('late', MF.Research.has(s, 'rocketry'));
    mark('clear', s.galaxy.unlocked);
    if (s.story.idx !== lastIdx) { lastIdx = s.story.idx; lastIdxAt = bot.playSec(); }
    else if (!s.galaxy.unlocked && bot.playSec() - lastIdxAt > 8 * 3600 && !stuck) stuck = { mission: (MF.Story.current(s) || {}).id, at: Math.round(bot.playSec() / 60) };
    if (bot.answers % 100 === 0) {
      for (const k of Object.keys(s.inv)) if (!Number.isFinite(s.inv[k]) || s.inv[k] < -1e-6) { err = 'invalid inventory ' + k + '=' + s.inv[k]; break; }
      if (!Number.isFinite(s.rp) || !Number.isFinite(s.factory.charge)) err = 'invalid rp/charge';
      if (err) break;
    }
    if (s.galaxy.unlocked) { if (afterClear === null) afterClear = bot.playSec(); if (bot.playSec() - afterClear > 90 * 60) break; }
  }
  // セーブ→ロードできるか（壊れたデータにならないか）
  try { const s2 = MF.Game.deserialize(MF.Game.serialize(s), bot.t); if (s2.stats.answered !== s.stats.answered) err = err || 'save mismatch'; } catch (e) { err = err || 'save error ' + e.message; }
  const raidWins = bot.raids.filter((r) => r.win).length;
  return {
    p, seed, m, ans, stuck, err, answers: s.stats.answered, acc: s.stats.correct / Math.max(1, s.stats.answered),
    raids: bot.raids.length, raidWins, runs: bot.runs.length, runBoss: bot.runs.filter((r) => r.floor >= MF.Balance.battle.runFloors).length, runClear: bot.runs.filter((r) => r.cleared).length,
    bestFloor: Math.max(0, ...bot.runs.map((r) => r.floor)), research: s.research.done.length, buildings: Object.keys(s.factory.b).length, pals: s.pals.list.length,
    levels: Object.assign({}, s.quiz.levels), end: snap(), colonies: s.galaxy.unlocked ? MF.Galaxy.owned(s, 'player').length - 1 : 0,
  };
}

// ---------------- 集計 ----------------
const q = (arr, k) => { const a = arr.slice().sort((x, y) => x - y); if (!a.length) return null; const i = (a.length - 1) * k; const lo = Math.floor(i), hi = Math.ceil(i); return Math.round(a[lo] + (a[hi] - a[lo]) * (i - lo)); };
function summarize(results) {
  const out = {};
  for (const p of PS) {
    const rs = results.filter((r) => r.p === p);
    const st = (k) => { const v = rs.map((r) => r.m[k]).filter((x) => x !== undefined); return { reach: Math.round(v.length / rs.length * 100), p10: q(v, 0.1), med: q(v, 0.5), p90: q(v, 0.9), ans: q(rs.map((r) => r.ans[k]).filter((x) => x !== undefined), 0.5) }; };
    const sum = (k) => rs.reduce((a, r) => a + r[k], 0);
    const clr = rs.filter((r) => r.m.clearSnap).map((r) => r.m.clearSnap);
    out[p] = {
      n: rs.length, acc: Math.round(rs.reduce((a, r) => a + r.acc, 0) / rs.length * 100),
      first: st('first'), early: st('early'), mid: st('mid'), late: st('late'), clear: st('clear'),
      raidWin: sum('raids') ? Math.round(sum('raidWins') / sum('raids') * 100) : null, raidsPerRun: Math.round(sum('raids') / rs.length * 10) / 10,
      runs: sum('runs'), runBossReach: sum('runs') ? Math.round(sum('runBoss') / sum('runs') * 100) : null, runClear: sum('runs') ? Math.round(sum('runClear') / sum('runs') * 100) : null,
      bossWinWhenReached: sum('runBoss') ? Math.round(sum('runClear') / sum('runBoss') * 100) : null, bestFloorMed: q(rs.map((r) => r.bestFloor), 0.5),
      surplusAtClear: clr.length ? { raw: q(clr.map((c) => c.raw), 0.5), prod: q(clr.map((c) => c.prod), 0.5), rp: q(clr.map((c) => c.rp), 0.5), cap: q(clr.map((c) => c.cap), 0.5) } : null,
      surplusAtEnd: { raw: q(rs.map((r) => r.end.raw), 0.5), rp: q(rs.map((r) => r.end.rp), 0.5) },
      errors: rs.filter((r) => r.err).map((r) => r.seed + ': ' + r.err).slice(0, 5), errorCount: rs.filter((r) => r.err).length,
      stuck: rs.filter((r) => r.stuck).map((r) => r.stuck.mission), stuckCount: rs.filter((r) => r.stuck).length,
      levelsMed: Object.fromEntries(Object.keys(rs[0].levels).filter((k) => ['quad', 'prob', 'diff', 'seq', 'vec', 'integ', 'trig'].includes(k)).map((k) => [k, q(rs.map((r) => r.levels[k]), 0.5)])),
    };
  }
  return out;
}
const fmtMin = (v) => (v === null || v === undefined ? '—' : v >= 60 ? (v / 60).toFixed(1) + '時間' : v + '分');
function table(sum, label) {
  const L = [];
  L.push('### ' + label);
  L.push('');
  L.push('| 指標 | ' + PS.map((p) => '正答率' + Math.round(p * 100) + '%').join(' | ') + ' |');
  L.push('|---|' + PS.map(() => '---').join('|') + '|');
  const row = (name, fn) => L.push('| ' + name + ' | ' + PS.map((p) => fn(sum[p])).join(' | ') + ' |');
  row('実際の正答率（1回目）', (x) => x.acc + '%');
  const ms = [['first', '最初の資源が届く'], ['early', '序盤（鉄板の自動生産）'], ['mid', '中盤（初めての襲撃を撃退）'], ['late', '終盤（ロケット工学）'], ['clear', 'クリア（星を脱出）']];
  for (const [k, n] of ms) row(n + ' 中央値 [10%〜90%]', (x) => fmtMin(x[k].med) + ' [' + fmtMin(x[k].p10) + '〜' + fmtMin(x[k].p90) + ']' + (x[k].reach < 100 ? '（到達' + x[k].reach + '%）' : ''));
  row('クリアまでの解答数（中央値）', (x) => (x.clear.ans || '—') + '問');
  row('襲撃（防衛戦）の勝率', (x) => (x.raidWin === null ? '—' : x.raidWin + '%') + '（1人あたり' + x.raidsPerRun + '回）');
  row('侵攻ラン：ボスまで到達', (x) => (x.runBossReach === null ? '—' : x.runBossReach + '%') + '（' + x.runs + '回）');
  row('侵攻ラン：ボス戦の勝率', (x) => (x.bossWinWhenReached === null ? '—' : x.bossWinWhenReached + '%'));
  row('クリア時の資源の余り（鉱石合計/製品合計/研究P）', (x) => (x.surplusAtClear ? x.surplusAtClear.raw + ' / ' + x.surplusAtClear.prod + ' / ' + x.surplusAtClear.rp + '（上限' + x.surplusAtClear.cap + '/種）' : '—'));
  row('エラー / 詰まり', (x) => x.errorCount + ' / ' + x.stuckCount + (x.stuck.length ? '（' + Array.from(new Set(x.stuck)).join(',') + '）' : ''));
  return L.join('\n');
}

// ---------------- 実行（並列） ----------------
if (process.argv[2] === '--worker') {
  const MF = require('../tests/load')();
  process.on('message', (job) => {
    if (job.balance) applySurface(MF, job.balance);
    const out = [];
    for (const [p, seed] of job.items) out.push(playOne(MF, p, seed, job.hours));
    process.send(out);
  });
} else if (require.main === module) {
  const MF = require('../tests/load')();
  if (args['dump-balance']) { fs.writeFileSync(args['dump-balance'], JSON.stringify(surface(MF), null, 1)); console.log('wrote', args['dump-balance']); process.exit(0); }
  const balance = args.balance ? JSON.parse(fs.readFileSync(args.balance, 'utf8')) : null;
  const jobs = [];
  for (const p of PS) for (let i = 0; i < RUNS; i++) jobs.push([p, 1000 + i]);
  const nW = Math.max(1, Math.min(os.cpus().length, +(args.workers || os.cpus().length)));
  const chunks = Array.from({ length: nW }, () => []);
  jobs.forEach((j, i) => chunks[i % nW].push(j));
  const t0 = Date.now();
  let done = 0;
  const results = [];
  console.log('シミュレーション開始：' + jobs.length + ' 回（' + nW + ' 並列、1回あたり最大 ' + HOURS + ' 時間のプレイ）' + (args.balance ? ' バランス=' + args.balance : ''));
  chunks.forEach((items) => {
    if (!items.length) { done++; return; }
    const w = fork(__filename, ['--worker']);
    w.send({ items, hours: HOURS, balance });
    w.on('message', (out) => {
      results.push(...out); w.kill(); done++;
      if (done === chunks.length) {
        const sum = summarize(results);
        const label = (args.label || 'result') + '（各' + RUNS + '回・最大' + HOURS + '時間）';
        const md = table(sum, label);
        console.log(md);
        console.log('\n所要 ' + Math.round((Date.now() - t0) / 1000) + ' 秒');
        if (args.out) fs.writeFileSync(args.out, JSON.stringify({ label, args, summary: sum, results }, null, 1));
        if (args.md) fs.writeFileSync(args.md, md + '\n');
      }
    });
  });
}
