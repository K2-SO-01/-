// 人生エンジン：1年ずつ進み、決断・ひと息で止まる。
// 状態はすべて JSON にでき、乱数の状態も保存するので、ブラウザを閉じても同じ続きから再開できる。
import { Rng } from './rng.js';
import { drawSurname, drawGivenName, drawOlderName } from './names.js';
import { sigmoid, UNIV_COEF } from './world.js';
import { clamp, yen, pct, fill } from './util.js';
import { FOCUS, focusGroup, TEMPER, TODDLER_CARDS, MAJORS, VOC_TRACKS, JOBS, EDU_RANK, EDU_LABEL, QUINTILE, HOBBIES, CLUBS, REFLECTIONS, ordinalChild } from './content.js';

export const REFLECT_AGES = [5, 15, 30, 50, 70];
const SEX_RATIO_M = 0.512; // 出生性比 約105（推計）
const JOB = Object.fromEntries(JOBS.map((j) => [j.id, j]));

// ================================================================ 生成
export function createLife(W, opts = {}) {
  const R = new Rng(opts.seed || 'seed');
  const now = opts.now || new Date();
  const mode = opts.mode || 'births';
  const birthPref = opts.pref || W.drawPref(R, mode);
  const sex = opts.sex || (R.chance(SEX_RATIO_M) ? 'M' : 'F');
  const L = {
    v: 1, seed: String(opts.seed), startYear: now.getFullYear(), birthMonth: now.getMonth() + 1,
    sex, birthPref, pref: birthPref, isPeer: !!opts.isPeer, auto: !!opts.auto, mode,
    age: 0, alive: true, deathAge: null, deathCause: null,
    stats: { health: clamp(Math.round(R.normal(86, 6)), 40, 100), happy: 70, know: 4, social: 50 },
    hBase: 86, talent: R.normal(0, 1), wageZ: R.normal(0, 1),
    temper: { curious: 0, kind: 0, grit: 0, active: 0, calm: 0 }, temperLabel: null,
    family: { mother: null, father: null, siblings: [], grand: [], spouse: null, exSpouses: [], partner: null, children: [], raisedBy: null },
    household: { quintile: 3, income: 0 },
    edu: { stage: 'home', level: 'none', major: null, voc: null, hsType: null, univPref: null, gradAt: null, ronin: 0 },
    work: { status: 'none', jobId: null, nonreg: false, income: 0, years: 0, boost: 0, pensionM: 0, regularYears: 0, retiredAt: null, everWorked: false },
    money: { savings: 0, debt: 0, invest: 0, investOn: false, scholarship: 0 },
    home: { own: false, mortgage: 0, withParents: true },
    health: { smoker: false, everSmoked: false, alcohol: false, gambling: false, conditions: {}, care: false, dementia: false },
    flags: {}, hobby: null, club: null,
    focus: null, focusAuto: true, focusYears: {},
    moved: [], log: [], notes: {}, finalWord: '', decisions: 0,
    pending: null, step: 0, yearDone: false,
    hist: { happy: [], health: [], income: [], pref: [], work: [], ft: [], dev: [] },
  };
  setupFamily(W, R, L);
  const out = [];
  birthLog(W, R, L, out);
  L.rng = R.state();
  L.birthItems = out;
  return L;
}

function personAge(L, p) { return L.startYear + L.age - p.by; }
const curYear = (L) => L.startYear + L.age;

function setupFamily(W, R, L) {
  const pref = W.pref(L.birthPref);
  const F = L.family;
  const motherAge = clamp(Math.round(R.normal(32, 4.6)), 17, 46);
  const outOfWedlock = R.chance(W.model.family.outOfWedlockBirthShare);
  const sur = drawSurname(W, R, L.birthPref);
  const momName = drawOlderName(W, R, 'F', 'parent');
  const univP = clamp(pref.v.univEntryRate / 100 * 0.85, 0.2, 0.8);
  F.mother = mkAdult(W, R, L, 'F', motherAge, sur, momName, univP, 'mother');
  if (!outOfWedlock) {
    const fa = clamp(Math.round(motherAge + R.normal(2.3, 3.5)), 18, 62);
    F.father = mkAdult(W, R, L, 'M', fa, sur, drawOlderName(W, R, 'M', 'parent'), univP, 'father');
  }
  // きょうだい（上）
  const bo = W.model.family.birthOrder;
  let older = R.weighted([[0, bo.first], [1, bo.second], [2, bo.third], [3, bo.fourth]]);
  older = Math.min(older, Math.max(0, Math.floor((motherAge - 19) / 2.5)));
  let gap = 0;
  for (let i = 0; i < older; i++) {
    gap += R.int(2, 4);
    const s = R.chance(SEX_RATIO_M) ? 'M' : 'F';
    const [mei, kana] = drawGivenName(W, R, s);
    F.siblings.push({ rel: s === 'M' ? '兄' : '姉', sex: s, name: { sei: sur[0], mei, meiKana: kana }, by: L.startYear - gap, alive: true, pref: L.birthPref, older: true });
  }
  L.birthOrder = older;
  // 祖父母
  for (const side of ['mother', 'father']) {
    const parent = F[side];
    if (!parent) continue;
    const gmAge = personAge(L, parent) + clamp(Math.round(R.normal(29, 4)), 18, 45);
    for (const s of ['F', 'M']) {
      const age = s === 'F' ? gmAge : gmAge + clamp(Math.round(R.normal(2.5, 3)), -5, 12);
      const surv = W.survival(L.birthPref, s);
      const alive = R.chance(surv[Math.min(110, age)] / surv[Math.min(110, Math.max(0, age - 30))]);
      F.grand.push({ rel: (side === 'mother' ? '母方の' : '父方の') + (s === 'F' ? '祖母' : '祖父'), sex: s, by: L.startYear - age, alive, pref: L.birthPref, side, name: { sei: side === 'father' ? sur[0] : '', mei: drawOlderName(W, R, s, 'grand')[0] } });
    }
  }
  L.name = { sei: sur[0], seiKana: sur[1] };
  const [mei, kana] = drawGivenName(W, R, L.sex);
  L.name.mei = mei; L.name.meiKana = kana;
  L.birthName = { ...L.name };
  // 暮らし向き：親の収入から、全国の家計の分布の中の位置（5分位）を決める
  const inc = familyIncome(W, L);
  L.household.income = inc;
  L.household.quintile = quintileOf(W, inc);
  if (!F.father) L.household.quintile = Math.min(L.household.quintile, R.chance(0.6) ? 1 : 2);
  L.wealthAtBirth = L.household.quintile;
}

function mkAdult(W, R, L, sex, age, sur, nm, univP, rel) {
  const edu = R.chance(univP) ? (R.chance(0.08) ? 'grad' : 'univ') : R.weighted([['hs', 0.55], ['voc', 0.35], ['jhs', 0.1]]);
  const p = { rel: rel === 'mother' ? '母' : '父', sex, by: L.startYear - age, alive: true, pref: L.birthPref, edu, name: { sei: sur[0], mei: nm[0], meiKana: nm[1] }, wageZ: R.normal(0, 1) };
  const working = sex === 'M' ? R.chance(0.95) : R.chance(W.model.family.motherKeepsWorkingAfterBirth);
  if (working) {
    p.jobId = drawJob(W, R, L.birthPref, sex, edu, null, null).id;
    p.nonreg = R.chance(nonRegP(W, sex, edu, age) * (sex === 'F' ? 1.1 : 1));
  }
  return p;
}

// 親世代の家計の分布（全国、出生数で重みづけ）を一度だけ作る
function familyRef(W) {
  if (W._famRef) return W._famRef;
  const R = new Rng('family-reference');
  const arr = [];
  for (let i = 0; i < 2500; i++) {
    const pref = W.drawPref(R, 'births');
    const fake = { startYear: 2026, age: 0, birthPref: pref, family: {} };
    const univP = clamp(W.pref(pref).v.univEntryRate / 100 * 0.85, 0.2, 0.8);
    const ma = clamp(Math.round(R.normal(32, 4.6)), 17, 46);
    const m = mkAdult(W, R, fake, 'F', ma, ['', ''], ['', ''], univP, 'mother');
    const f = R.chance(0.976) ? mkAdult(W, R, fake, 'M', clamp(Math.round(ma + R.normal(2.3, 3.5)), 18, 62), ['', ''], ['', ''], univP, 'father') : null;
    fake.family = { mother: m, father: f };
    arr.push(familyIncome(W, fake));
  }
  arr.sort((a, b) => a - b);
  W._famRef = arr;
  return arr;
}
function quintileOf(W, inc) {
  const ref = familyRef(W);
  let i = 0;
  while (i < ref.length && ref[i] < inc) i++;
  return clamp(Math.floor((i / ref.length) * 5) + 1, 1, 5);
}
function familyIncome(W, L) {
  let s = 0;
  for (const k of ['father', 'mother']) {
    const p = L.family[k];
    if (!p || !p.alive || !p.jobId) continue;
    s += wageOf(W, { sex: p.sex, edu: p.edu, jobId: p.jobId, nonreg: p.nonreg, wageZ: p.wageZ, boost: 0 }, personAge(L, p), p.pref || L.birthPref);
  }
  return Math.round(s);
}

// ================================================================ 賃金・仕事
function nonRegP(W, sex, edu, age) {
  const base = W.model.earnings.nonRegularShare[sex];
  const e = { none: 1.5, jhs: 1.5, hs: 1.15, voc: 0.95, jc: 1.0, univ: 0.6, grad: 0.5 }[edu] ?? 1;
  const a = age < 25 ? 1.2 : age >= 60 ? 1.8 : 1;
  return clamp(base * e * a, 0.03, 0.9);
}
export function wageOf(W, p, age, prefName) {
  const job = JOB[p.jobId];
  if (!job) return 0;
  const M = W.model.earnings;
  let base = job.pub ? (W.baseWage('M', age) + W.baseWage('F', age)) / 2 * 1.02 : W.baseWage(p.sex, age);
  base *= (M.educationFactor[p.edu] ?? 1) * job.wf * W.incomeFactor(prefName) * Math.exp((p.wageZ || 0) * M.personalSigma);
  if (p.nonreg) base *= M.nonRegularRelative[p.sex] * 0.9;
  base *= 1 + (p.boost || 0);
  return Math.max(600000, base);
}

function drawJob(W, R, prefName, sex, edu, major, voc, opts = {}) {
  const p = W.pref(prefName);
  const [i1, i2, i3] = p.industry;
  const sectorShare = { 1: i1, 2: i2, 3: i3 };
  const sums = { 1: 0, 2: 0, 3: 0 };
  for (const j of JOBS) sums[j.s] += j.w;
  const urban = p.industry[2] / 75; // 第3次産業の比率を都市度の目安に
  const er = EDU_RANK[edu] ?? 0;
  const pairs = [];
  for (const j of JOBS) {
    if (opts.exclude && opts.exclude.includes(j.id)) continue;
    const need = EDU_RANK[j.edu] ?? 0;
    if (er < need) continue;
    let w = sectorShare[j.s] / sums[j.s] * j.w;
    w *= (sex === 'F' ? j.f : 1 - j.f) / 0.5 + 0.02;
    if (j.urban) w *= Math.pow(urban, 3);
    if (j.req) {
      const ok = j.req.includes(major) || j.req.includes(voc);
      if (!ok) continue;
      w *= 4;
    }
    if (j.doctor && !opts.doctorOk) continue;
    if (er >= 3 && need <= 0) w *= 0.35; // 大卒が学歴不問の仕事につく割合は低め
    if (er <= 1 && j.s === 3 && need >= 1) w *= 0.8;
    pairs.push([j, w]);
  }
  return R.weighted(pairs);
}

// ================================================================ ログ
function log(C, text, o = {}) {
  const { L } = C;
  const it = { a: L.age, y: curYear(L), t: text, k: o.k || 'life' };
  if (o.h) it.h = o.h; // 重い出来事（相談先を案内）
  if (o.big) it.big = 1;
  if (o.note) it.note = o.note;
  if (o.gentle) it.g = o.gentle; // 「怖い場面を除く」で代わりに出す文
  C.out.push(it);
  L.log.push(it);
  return it;
}
function adj(L, k, d) { L.stats[k] = clamp(L.stats[k] + d, 0, 100); }
// 出費。18歳未満のうちは家計（親）が負担するので、本人のお金からは引かない
function pay(L, amt) { if (L.age >= 18) L.money.savings -= amt; }

// ================================================================ 年の進行
const STEPS = ['reflect', 'family', 'stage', 'events', 'focus', 'money', 'death'];

function ctx(W, L) { return { W, L, R: new Rng(L.rng), out: [] }; }
function done(C) { C.L.rng = C.R.state(); return C.out; }

export function beginYear(W, L) {
  L.step = 0; L.yearDone = false; L.pending = null;
  return continueYear(W, L);
}
export function continueYear(W, L) {
  const C = ctx(W, L);
  run(C);
  return done(C);
}
function run(C) {
  const { L } = C;
  while (!L.pending && L.alive && L.step < STEPS.length) {
    const s = STEPS[L.step++];
    STEP[s](C);
  }
  if (!L.pending && (L.step >= STEPS.length || !L.alive)) L.yearDone = true;
}
export function nextYear(W, L) {
  if (!L.alive) return [];
  L.age += 1;
  return beginYear(W, L);
}

// 決断に答える
export function answer(W, L, index, extra = {}) {
  const C = ctx(W, L);
  const P = L.pending;
  if (!P) return done(C);
  L.pending = null;
  if (P.type === 'decision') {
    const D = DEC[P.id];
    L.decisions++;
    D.apply(C, P.ctx || {}, index, extra);
  } else if (P.type === 'reflect') {
    if (extra.note && extra.note.trim()) {
      L.notes[P.age] = extra.note.trim().slice(0, 200);
      log(C, `「${L.notes[P.age]}」と書き留めました。`, { k: 'note' });
    }
  }
  if (!L.pending) run(C);
  return done(C);
}

export function setFocus(L, id) { L.focus = id; L.focusAuto = false; }
export function setAuto(L, on) { L.auto = on; if (on) L.focusAuto = true; }

// 決断を出す。おまかせ・並走の4人は自動で選ぶ
function offer(C, id, c = {}) {
  const { L, W, R } = C;
  const D = DEC[id];
  if (L.auto || L.isPeer) {
    const idx = D.auto(C, c);
    if (!L.isPeer) L.decisions++;
    D.apply(C, c, idx, { auto: true });
    return;
  }
  const b = D.build(C, c);
  L.pending = { type: 'decision', id, ctx: c, cat: D.cat, title: b.title, body: b.body || '', note: b.note || '', options: b.options.map((o) => ({ label: o.label, hint: o.hint || '' })) };
}

// ================================================================ ステップ
const STEP = {};

STEP.reflect = (C) => {
  const { L, W, R } = C;
  if (L.isPeer || !REFLECT_AGES.includes(L.age)) return;
  const pool = REFLECTIONS[L.age].filter((r) => r.when(L));
  const specific = pool.filter((r) => r.when.length > 0);
  const pickFrom = specific.length && R.chance(0.7) ? specific : pool;
  const r = R.pick(pickFrom);
  const q = fill(r.q, { birthPref: L.birthPref, pref: L.pref });
  // 統計の事実
  const surv = W.survival(L.birthPref, L.sex);
  const facts = [];
  const sx = L.sex === 'M' ? '男の子' : '女の子';
  facts.push(`同じ年に${L.birthPref}で生まれた${sx}のうち、${L.age}歳を迎えるのは約${Math.round(surv[L.age] * 1000) / 10}%。`);
  const next = { 5: 15, 15: 30, 30: 50, 50: 70, 70: 85 }[L.age];
  const pn = surv[next] * 100;
  facts.push(`${next}歳まで生きるのは約${pn >= 99 ? pn.toFixed(1) : Math.round(pn)}%と見込まれます（${L.birthPref}の生命表）。`);
  L.pending = { type: 'reflect', age: L.age, q, facts };
};

STEP.family = (C) => {
  const { L, W, R } = C;
  const F = L.family;
  if (L.age === 0) return;
  // 親・祖父母・きょうだい
  const rel = [...F.grand, F.mother, F.father, ...F.siblings].filter(Boolean);
  for (const p of rel) {
    if (!p.alive) continue;
    const a = personAge(L, p);
    if (a < 0) continue;
    const q = W.q(p.pref || L.birthPref, p.sex, a) * (p.ill ? 1.6 : 1);
    if (R.chance(q)) {
      p.alive = false; p.diedAt = curYear(L);
      const who = relWord(L, p);
      const heavy = (p === F.mother || p === F.father) && L.age < 25;
      if (p.rel.includes('祖')) {
        log(C, `${who}が${a}歳で亡くなりました。`, { k: 'family', big: L.age >= 3 });
      } else if (p === F.mother || p === F.father) {
        log(C, `${who}が${a}歳で亡くなりました。`, { k: 'family', big: true, h: heavy ? 'grief' : undefined });
        adj(L, 'happy', L.age < 25 ? -18 : -10);
        if (L.age < 18) afterParentLoss(C, p);
        L.flags.lostParentYear = curYear(L);
      } else {
        log(C, `${who}が${a}歳で亡くなりました。`, { k: 'family', big: true, h: 'grief' });
        adj(L, 'happy', -12);
      }
      if (p === F.father && L.age < 22) { L.household.quintile = Math.max(1, L.household.quintile - 1); }
    }
  }
  // 親の病気・介護
  for (const p of [F.mother, F.father]) {
    if (!p || !p.alive || p.care) continue;
    const a = personAge(L, p);
    const need = careP(W, a);
    if (a >= 65 && R.chance(need / 6)) {
      p.care = true;
      log(C, `${relWord(L, p)}（${a}歳）に介護が必要になりました。`, { k: 'family', big: true });
      if (L.age >= 30 && !L.isPeer) offer(C, 'care', { who: p.rel });
      else if (L.age >= 30) { L.flags.caring = true; }
      if (L.pending) return;
    }
  }
  // 弟・妹が生まれる
  if (L.age < 16 && F.mother && F.mother.alive && F.father && !L.flags.parentsDivorced) {
    const ma = personAge(L, F.mother);
    const parity = F.siblings.length + 1;
    const h = W.fertHazard(ma, parity, L.birthPref) * 0.95;
    if (R.chance(h)) {
      const s = R.chance(SEX_RATIO_M) ? 'M' : 'F';
      const [mei, kana] = drawGivenName(W, R, s);
      F.siblings.push({ rel: s === 'M' ? '弟' : '妹', sex: s, name: { sei: L.name.sei, mei, meiKana: kana }, by: curYear(L), alive: true, pref: L.birthPref });
      log(C, `${s === 'M' ? '弟' : '妹'}の${mei}が生まれました。`, { k: 'family', big: true });
      adj(L, 'social', 3);
    }
  }
  // 両親の離婚
  if (L.age < 20 && F.father && F.mother && F.father.alive && F.mother.alive && !L.flags.parentsDivorced) {
    const h = 0.0075 * W.divorceFactor(L.birthPref) * (L.age < 10 ? 1.1 : 0.8);
    if (R.chance(h)) {
      L.flags.parentsDivorced = true;
      const withMother = R.chance(0.85);
      log(C, `両親が離婚しました。${withMother ? '母' : '父'}と暮らすことになりました。`, { k: 'family', big: true });
      L.livesWith = withMother ? 'mother' : 'father';
      L.household.quintile = Math.max(1, L.household.quintile - (withMother ? 2 : 1));
      adj(L, 'happy', -10); adj(L, 'social', -4);
    }
  }
  // 配偶者
  const sp = F.spouse;
  if (sp && sp.alive && !sp.divorced) {
    const a = personAge(L, sp);
    if (R.chance(W.q(L.pref, sp.sex, a) * (sp.ill ? 1.5 : 1))) {
      sp.alive = false; sp.diedAt = curYear(L);
      log(C, `${sp.name.mei}（${sp.sex === 'M' ? '夫' : '妻'}）が${a}歳で亡くなりました。`, { k: 'family', big: true, h: 'grief' });
      adj(L, 'happy', -22); adj(L, 'social', -8); adj(L, 'health', -3);
      L.flags.widowed = curYear(L);
    }
  }
  // 子ども
  for (const ch of F.children) {
    if (!ch.alive) continue;
    const a = personAge(L, ch);
    if (R.chance(W.q(ch.pref || L.pref, ch.sex, a))) {
      ch.alive = false;
      log(C, `${relWord(L, ch)}の${ch.name.mei}が${a}歳で亡くなりました。`, { k: 'family', big: true, h: 'grief' });
      adj(L, 'happy', -30); adj(L, 'health', -5);
      continue;
    }
    childMilestones(C, ch, a);
  }
};

function afterParentLoss(C, p) {
  const { L, R } = C;
  const F = L.family;
  const other = p === F.mother ? F.father : F.mother;
  if (other && other.alive && !L.flags.parentsDivorced) return;
  const g = F.grand.filter((x) => x.alive);
  let who;
  if (g.length && R.chance(0.6)) who = `${g[0].rel}`;
  else if (R.chance(0.5)) who = 'おじとおば';
  else who = R.chance(0.5) ? '里親の家庭' : '児童養護施設';
  F.raisedBy = who;
  log(C, `それからは、${who}のもとで育つことになりました。`, { k: 'family', big: true });
  L.household.quintile = Math.max(1, L.household.quintile - 1);
}

function relWord(L, p) {
  if (p.rel) return p.rel;
  return p.sex === 'M' ? '息子' : '娘';
}

function careP(W, a) {
  const t = W.model.health.careNeedByAge;
  const ks = Object.keys(t).map(Number).sort((x, y) => x - y);
  let v = 0;
  for (const k of ks) if (a >= k) v = t[k];
  return v;
}

function childMilestones(C, ch, a) {
  const { L, R, W } = C;
  const nm = `${ch.sex === 'M' ? '息子' : '娘'}の${ch.name.mei}`;
  if (a === 6) log(C, `${nm}が小学校に入学しました。ランドセルが歩いているようでした。`, { k: 'child' });
  else if (a === 12 && R.chance(0.6)) log(C, `${nm}が中学生になりました。`, { k: 'child' });
  else if (a === 15 && R.chance(0.5)) log(C, `${nm}が高校受験に向けて、夜遅くまで机に向かっています。`, { k: 'child' });
  else if (a === 18) {
    const u = R.chance(W.pref(L.pref).v.univEntryRate / 100);
    ch.edu = u ? 'univ' : 'hs';
    if (u) { log(C, `${nm}が大学に進みました。`, { k: 'child', big: true }); pay(L, 1500000); }
    else log(C, `${nm}が高校を卒業し、${R.chance(0.5) ? '専門学校に進みました' : '働きはじめました'}。`, { k: 'child' });
  } else if (a === 22 + (R.chance(0.5) ? 0 : 1) && !ch.left) {
    ch.left = true;
    if (R.chance(0.35)) { ch.pref = W.drawDestination(R, L.pref); log(C, `${nm}が就職して、${ch.pref}で暮らしはじめました。`, { k: 'child', big: true }); }
    else log(C, `${nm}が働きはじめ、家を出ました。`, { k: 'child' });
  }
  if (a >= 24 && !ch.married && R.chance(W.marriageHazard(ch.sex, a, ch.pref || L.pref))) {
    ch.married = true;
    log(C, `${nm}が結婚しました。`, { k: 'child', big: true });
    adj(L, 'happy', 4);
  }
  if (ch.married && a < 45) {
    const wifeAge = ch.sex === 'F' ? a : a - 2;
    ch.kids = ch.kids || 0;
    if (R.chance(W.fertHazard(wifeAge, ch.kids, ch.pref || L.pref))) {
      ch.kids++;
      L.grandkids = (L.grandkids || 0) + 1;
      log(C, L.grandkids === 1 ? `初孫が生まれました。${nm}の子どもです。` : `孫が生まれました（${L.grandkids}人目）。`, { k: 'child', big: L.grandkids === 1 });
      adj(L, 'happy', 6);
    }
  }
}

// ---------------------------------------------------------------- 人生の節目
STEP.stage = (C) => {
  const { L, W, R } = C;
  const a = L.age;
  const pf = W.pref(L.pref);
  // 乳幼児
  if (a === 0) {
    log(C, R.pick(['小さな手で、差し出された指をぎゅっと握りました。', '夜中に何度も泣いて、家族を起こしました。', '初めての笑顔を見せました。']), { k: 'baby' });
    return;
  }
  if (a === 1) log(C, R.pick(['つかまり立ちから、一歩を踏み出しました。', '「まんま」と言えるようになりました。', 'よちよち歩きで、家じゅうを探検しています。']), { k: 'baby' });
  const card = TODDLER_CARDS.find((c) => c.age === a);
  if (card && !L.isPeer) { offer(C, 'toddler', { age: a }); if (L.pending) return; }
  else if (card) { const opt = R.pick(card.options); L.temper[opt[1]]++; }
  if (a === 3) {
    const wait = pf.v.waitlistChildrenPer100k / 100000 * 8;
    if (R.chance(wait)) log(C, '保育園に空きがなく、しばらくは家族が交代で面倒を見ました。', { k: 'school' });
    else log(C, L.family.mother && L.family.mother.jobId ? '保育園に通いはじめました。' : '幼稚園に通いはじめました。', { k: 'school' });
    L.edu.stage = 'preschool';
  }
  if (a === 5) settleTemper(C);
  if (a === 6) {
    L.edu.stage = 'elem';
    log(C, R.pick(['小学校に入学しました。大きなランドセルを背負って、最初の一歩を踏み出しました。', '小学校に入学しました。名札の名前を、何度も指でなぞりました。']), { k: 'school', big: true });
  }
  if (a === 11 && !L.isPeer && isUrbanForExam(pf) && (L.household.quintile >= 4 || L.stats.know > 50)) {
    offer(C, 'jhsExam'); if (L.pending) return;
  }
  if (a === 12) {
    L.edu.stage = 'jhs';
    log(C, `${L.edu.privateJhs ? '私立の' : '地元の'}中学校に入学しました。`, { k: 'school', big: true });
    offer(C, 'club'); if (L.pending) return;
  }
  if (a === 15 && L.edu.stage === 'jhs') { offer(C, 'highschool'); if (L.pending) return; }
  if (L.flags.hsDropAt === a && L.edu.stage === 'hs') {
    L.edu.stage = 'done'; L.edu.level = 'jhs';
    log(C, '高校を中退しました。', { k: 'school', big: true }); adj(L, 'happy', -4);
  }
  if (a === 18 && L.edu.stage === 'hs') {
    L.edu.level = 'hs';
    log(C, '高校を卒業しました。', { k: 'school', big: true });
    offer(C, 'afterHs'); if (L.pending) return;
  }
  if (a === 18) log(C, '18歳になり、法律の上では大人になりました。', { k: 'life' });
  if (a === 20) log(C, `「二十歳のつどい」で、${L.pref === L.birthPref ? '小学校の同級生と久しぶりに会いました' : '地元に帰り、昔の同級生と久しぶりに会いました'}。`, { k: 'life' });
  if (L.edu.stage === 'ronin' && a >= 19) { L.edu.stage = 'hs-grad'; offer(C, 'afterHs', { retry: true }); if (L.pending) return; }
  // 卒業
  if (L.edu.gradAt === a) {
    const st = L.edu.stage;
    if (st === 'univ') { L.edu.level = 'univ'; log(C, `大学を卒業しました（${MAJORS.find((m) => m.id === L.edu.major)?.label || ''}）。`, { k: 'school', big: true }); offer(C, 'afterUniv'); if (L.pending) return; }
    else if (st === 'grad') { L.edu.level = 'grad'; log(C, '大学院を修了しました。', { k: 'school', big: true }); L.edu.stage = 'done'; jobHunt(C); if (L.pending) return; }
    else if (st === 'voc') { L.edu.level = 'voc'; log(C, `専門学校（${VOC_TRACKS.find((v) => v.id === L.edu.voc)?.label || ''}）を卒業しました。`, { k: 'school', big: true }); L.edu.stage = 'done'; jobHunt(C); if (L.pending) return; }
    else if (st === 'jc') { L.edu.level = 'jc'; log(C, '短期大学を卒業しました。', { k: 'school', big: true }); L.edu.stage = 'done'; jobHunt(C); if (L.pending) return; }
  }
  // 仕事を探す
  if (a >= 16 && L.edu.stage === 'done' && (L.work.status === 'none' || L.work.status === 'unemployed') && a < 65) {
    if (L.work.status === 'unemployed' && L.work.unempSince === curYear(L)) { /* 失業した年は探すだけ */ }
    else if (L.work.homemaker) {
      const young = L.family.children.some((ch) => ch.alive && personAge(L, ch) < 3);
      if (!young && R.chance(0.22)) { L.work.homemaker = false; jobHunt(C); if (L.pending) return; }
    } else if (R.chance(L.work.status === 'unemployed' ? 0.7 : 0.85)) { jobHunt(C); if (L.pending) return; }
  }
  // 大人の節目
  if (a >= 18) adultStage(C);
};

function isUrbanForExam(pf) { return ['東京都', '神奈川県', '大阪府', '京都府', '兵庫県', '愛知県', '福岡県', '千葉県', '埼玉県', '奈良県', '広島県'].includes(pf.name); }

function settleTemper(C) {
  const { L, R } = C;
  const t = L.temper;
  const keys = Object.keys(t);
  let best = keys[0];
  for (const k of keys) if (t[k] > t[best] || (t[k] === t[best] && R.chance(0.5))) best = k;
  if (t[best] === 0) best = R.pick(keys);
  L.temperLabel = best;
  const who = L.family.raisedBy ? 'まわりの大人たち' : '家族';
  log(C, `5歳になるころには、${who}から「${TEMPER[best].label}」と言われるようになりました。`, { k: 'baby', big: true, note: '幼いころの気質には、生まれ持ったものと育つなかでの経験の両方が関わります。' });
  if (best === 'grit') L.talent += 0.15;
  if (best === 'kind') adj(L, 'social', 6);
  if (best === 'active') adj(L, 'health', 3);
  if (best === 'curious') adj(L, 'know', 3);
  if (best === 'calm') adj(L, 'happy', 4);
}

function adultStage(C) {
  const { L, W, R } = C;
  const a = L.age;
  const F = L.family;
  // 恋愛と結婚
  if (!F.spouse || F.spouse.divorced || !F.spouse.alive) {
    const married = F.spouse && (F.spouse.alive && !F.spouse.divorced);
    if (!married) {
      const first = !L.everMarried;
      let h = first ? W.marriageHazard(L.sex, a, L.pref) : (a < 65 ? W.model.family.remarriageAnnual * (a < 45 ? 1.4 : 0.6) : 0.004);
      if (L.sex === 'M' && L.work.status === 'employed' && !L.work.nonreg) h *= 1.15;
      if (L.sex === 'M' && (L.work.status !== 'employed' || L.work.nonreg)) h *= 0.62;
      h *= 1 + (L.stats.social - 58) / 200;
      if (L.sex === 'F' && first) h *= 1.14; // 50歳時未婚割合に合わせる補正（シミュレーションで確認）
      if (L.flags.declinedMarriage) h *= 0.6;
      if (R.chance(h)) { meetAndPropose(C); if (L.pending) return; }
      else if (a < 40 && !F.partner && R.chance(0.06)) {
        log(C, R.pick(['友人の紹介で知り合った人と、何度か食事に行きました。', '好きな人ができましたが、気持ちは伝えられないままでした。', 'しばらく付き合っていた人と別れました。']), { k: 'love' });
      }
    }
  }
  // 子ども
  const sp = F.spouse;
  if (sp && sp.alive && !sp.divorced) {
    const wifeAge = L.sex === 'F' ? a : personAge(L, sp);
    const parity = F.children.filter((c) => c.withSpouse === sp.id).length;
    const total = F.children.length;
    if (wifeAge < 46) {
      // 子どもについての話し合い（プレイヤーのみ）
      if (!L.isPeer && !L.auto && wifeAge <= 43 && L.kidsAskedAt !== total && R.chance(0.45)) {
        L.kidsAskedAt = total;
        offer(C, 'kids', { total }); if (L.pending) return;
      }
      const wish = L.flags.kidsWish == null ? 1 : L.flags.kidsWish;
      const h = W.fertHazard(wifeAge, total, L.pref) * wish;
      if (R.chance(h)) { haveChild(C); if (L.pending) return; }
    }
    // 離婚
    const dur = curYear(L) - sp.since;
    const dF = dur < 5 ? 1.7 : dur < 10 ? 1.25 : dur < 20 ? 0.85 : 0.45;
    let h = 0.0105 * dF * W.divorceFactor(L.pref) * (1 + (50 - L.stats.social) / 150);
    if (L.flags.dv) h *= 3;
    if (a < 80 && R.chance(h)) { offer(C, 'crisis'); if (L.pending) return; }
  }
  // 家を買う
  if (!L.home.own && a >= 28 && a <= 55 && L.work.status === 'employed') {
    const pf = W.pref(L.pref);
    const p = (pf.v.homeOwnershipRate / 100) * 0.06 * (sp && sp.alive && !sp.divorced ? 1.6 : 0.5) * (F.children.length ? 1.3 : 1);
    if (R.chance(p)) { offer(C, 'house'); if (L.pending) return; }
  }
  // 仕事の流れ
  workYear(C); if (L.pending) return;
  // 引っ越し（転勤・転職・Uターンなど）
  if (a >= 23 && a < 80) {
    const h = W.migrationRate(a) * 0.55;
    if (R.chance(h)) { offer(C, 'move', moveReason(C)); if (L.pending) return; }
  }
  // 投資
  if (!L.isPeer && !L.money.investAsked && a >= 25 && L.money.savings > 2000000 && R.chance(0.15)) {
    L.money.investAsked = true; offer(C, 'invest'); if (L.pending) return;
  }
  if ((L.isPeer || L.auto) && !L.money.investAsked && a >= 25 && L.money.savings > 2000000 && R.chance(0.1)) { L.money.investAsked = true; L.money.investOn = R.chance(0.35); }
  // 趣味
  if (a >= 25 && !L.hobby && R.chance(0.05)) { offer(C, 'hobby'); if (L.pending) return; }
  // 運転免許の返納
  if (a >= 75 && !L.flags.licenseAsked && R.chance(0.25)) { L.flags.licenseAsked = true; offer(C, 'license'); if (L.pending) return; }
  // 遺言書
  if (a >= 68 && !L.flags.willAsked && R.chance(0.08)) { L.flags.willAsked = true; offer(C, 'will'); if (L.pending) return; }
  // 老後の住まい
  if (a >= 78 && !L.flags.seniorHome && (L.health.care || L.stats.health < 35) && R.chance(0.5)) { L.flags.seniorHome = true; offer(C, 'seniorHome'); if (L.pending) return; }
}

function meetAndPropose(C) {
  const { L, W, R } = C;
  const F = L.family;
  const ss = L.sex === 'M' ? 'F' : 'M';
  const gap = W.model.family.spouseAgeGap;
  const spAge = clamp(Math.round(L.age + (L.sex === 'M' ? -1 : 1) * R.normal(gap.mean, gap.sd)), 18, 95);
  const sur = drawSurname(W, R, L.pref);
  const [mei, kana] = drawOlderName(W, R, ss, spAge > 55 ? 'grand' : 'parent');
  const how = R.weighted([['職場で出会った', 0.22], ['友人の紹介で知り合った', 0.25], ['マッチングアプリで知り合った', 0.2], ['学生時代から付き合っていた', 0.12], ['趣味の集まりで出会った', 0.08], ['お見合い・結婚相談所で出会った', 0.06], ['幼なじみの', 0.04], ['近所で知り合った', 0.03]]);
  F.partner = { sex: ss, by: curYear(L) - spAge, name: { sei: sur[0], seiKana: sur[1], mei, meiKana: kana }, how, alive: true };
  offer(C, 'marry');
}

function haveChild(C) {
  const { L, W, R } = C;
  const F = L.family;
  const sp = F.spouse;
  const s = R.chance(SEX_RATIO_M) ? 'M' : 'F';
  const [mei, kana] = drawGivenName(W, R, s);
  const ch = { sex: s, name: { sei: L.name.sei, mei, meiKana: kana }, by: curYear(L), alive: true, pref: L.pref, withSpouse: sp?.id };
  F.children.push(ch);
  const n = F.children.length;
  log(C, `${ordinalChild(n - 1)}の${s === 'M' ? '男の子' : '女の子'}、${mei}（${kana}）が生まれました。`, { k: 'family', big: true, note: n === 1 ? `${L.pref}の合計特殊出生率は ${W.pref(L.pref).v.tfr}（人口動態統計）。` : undefined });
  adj(L, 'happy', 8); adj(L, 'social', 4); adj(L, 'health', L.sex === 'F' ? -3 : -1);
  if (L.sex === 'F' && L.work.status === 'employed' && !L.isPeer && !L.auto) { offer(C, 'keepWorking'); return; }
  if (L.sex === 'F' && L.work.status === 'employed' && (L.isPeer || L.auto)) {
    if (!R.chance(W.model.family.motherKeepsWorkingAfterBirth)) { quitJob(C, '子育てのために仕事を辞めました。'); L.work.homemaker = true; }
  }
}

function moveReason(C) {
  const { L, R } = C;
  const pairs = [];
  if (L.work.status === 'employed' && !L.work.nonreg && !JOB[L.work.jobId]?.self) pairs.push(['transfer', 0.4]);
  if (L.work.status === 'employed' || L.work.status === 'unemployed') pairs.push(['newjob', 0.25]);
  if (L.pref !== L.birthPref) pairs.push(['uturn', 0.45]);
  const parentNeeds = [L.family.mother, L.family.father].some((p) => p && p.alive && p.care && p.pref !== L.pref);
  if (parentNeeds) pairs.push(['parents', 0.5]);
  pairs.push(['life', 0.12]);
  return { why: R.weighted(pairs) };
}

function quitJob(C, text) {
  const { L } = C;
  L.work.status = 'none'; L.work.jobId = null; L.work.income = 0;
  if (text) log(C, text, { k: 'work' });
}

function startJob(C, job, opts = {}) {
  const { L, W, R } = C;
  L.work.status = 'employed';
  L.work.jobId = job.id;
  L.work.nonreg = opts.nonreg ?? R.chance(nonRegP(W, L.sex, L.edu.level, L.age));
  if (job.pub || job.doctor) L.work.nonreg = false;
  if (job.self) L.work.nonreg = false;
  L.work.years = 0;
  L.work.everWorked = true;
  L.work.title = job.t;
  if (!L.work.firstJob) L.work.firstJob = { title: job.t, age: L.age };
  const type = job.self ? '' : L.work.nonreg ? '（非正規）' : '（正社員）';
  const inc = wageOf(W, { ...L.work, sex: L.sex, edu: L.edu.level, wageZ: L.wageZ }, L.age, L.pref);
  log(C, opts.text || `${job.t}${type}として働きはじめました。最初の年収はおよそ${yen(inc)}。`, { k: 'work', big: true });
}

function jobHunt(C) {
  const { L, W, R } = C;
  offer(C, 'job', { offers: jobOffers(C) });
}
function jobOffers(C, n = 3) {
  const { L, W, R } = C;
  const res = [];
  const ex = [];
  for (let i = 0; i < 12 && res.length < n; i++) {
    const doctorOk = L.edu.major === 'med' && L.flags.medSchool;
    const j = drawJob(W, R, L.pref, L.sex, L.edu.level, L.edu.major, L.edu.voc, { exclude: ex, doctorOk });
    if (!j) break;
    ex.push(j.id);
    res.push(j.id);
  }
  return res;
}

function workYear(C) {
  const { L, W, R } = C;
  const w = L.work;
  if (w.status === 'employed') {
    w.years++;
    if (!w.nonreg) w.regularYears++;
    const pf = W.pref(L.pref);
    // 失業
    const job = JOB[w.jobId];
    if (L.age < 64 && !job.pub && R.chance(pf.v.unemploymentRate / 100 * (w.nonreg ? 0.75 : 0.32) * (job.self ? 0.4 : 1))) {
      const t = job.self ? '店や仕事を畳むことになりました。' : R.pick(['勤めていた会社の業績が悪くなり、仕事を失いました。', '契約が更新されず、仕事を失いました。', '会社が倒産し、仕事を失いました。']);
      w.status = 'unemployed'; w.unempSince = curYear(L); w.jobId = null; w.income = 0;
      log(C, t, { k: 'work', big: true });
      adj(L, 'happy', -9);
      return;
    }
    // 昇進
    if (!w.nonreg && !job.self && w.years > 3 && L.age < 58 && R.chance(0.05 + (L.focus === 'work' ? 0.05 : 0))) {
      w.boost = Math.min(0.45, w.boost + 0.06);
      w.rank = (w.rank || 0) + 1;
      const t = ['主任になりました。', '係長に昇進しました。', '課長に昇進しました。', '部長になりました。'][Math.min(3, w.rank - 1)];
      log(C, t, { k: 'work', big: w.rank >= 3 });
      adj(L, 'happy', 3);
    }
    // 非正規から正社員へ
    if (w.nonreg && L.age < 55 && R.chance(0.04 + (L.focus === 'learn' ? 0.03 : 0))) {
      w.nonreg = false; log(C, '正社員として登用されました。', { k: 'work', big: true }); adj(L, 'happy', 5);
    }
    // 転職の誘い
    const offerP = 0.035 + (L.focus === 'learn' ? 0.05 : 0) + (L.stats.know > 70 ? 0.02 : 0);
    if (L.age >= 24 && L.age < 58 && R.chance(offerP)) { offer(C, 'jobChange', { jobId: jobOffers(C, 1)[0] }); if (L.pending) return; }
    // 定年
    if (!job.self && (L.age === 60 || L.age === 65) && !w.retireAsked?.[L.age]) {
      w.retireAsked = { ...(w.retireAsked || {}), [L.age]: true };
      offer(C, 'retire', { at: L.age }); if (L.pending) return;
    }
    if (job.self && L.age >= 68 && R.chance(0.15)) { offer(C, 'retire', { at: L.age, self: true }); if (L.pending) return; }
  }
  if (L.age === 65 && !L.work.pensionStarted) {
    L.work.pensionStarted = true;
    const P = W.nat.pension2024;
    const kosei = L.work.regularYears >= 10;
    const m = kosei ? P.kosei[L.sex] * clamp(L.work.regularYears / 38, 0.55, 1.15) : P.kokumin[L.sex];
    w.pensionM = Math.round(m);
    log(C, `年金を受け取りはじめました。月におよそ${yen(w.pensionM)}です。`, { k: 'money', big: true, note: `令和6年度末の平均年金月額は、厚生年金 ${yen(P.kosei.all)}、国民年金 ${yen(P.kokumin.all)}（厚生労働省）。` });
  }
}

// ---------------------------------------------------------------- 出来事
STEP.events = (C) => {
  const { L, W, R } = C;
  const a = L.age;
  const pf = W.pref(L.pref);
  const q = L.household.quintile;
  // 子ども時代
  if (a >= 1 && a <= 5) {
    if (R.chance(0.25)) log(C, R.pick(['高い熱を出して、一晩じゅう家族が付き添いました。', '公園で転んで、ひざをすりむきました。', `${pf.nature === '雪' ? '初めての雪に手を伸ばしました。' : '水たまりを見つけるたびに飛びこみました。'}`, '絵本を何度も読んでとせがみました。', 'お気に入りのぬいぐるみを、どこへでも連れて行きました。']), { k: 'baby' });
    if (R.chance(0.02)) { log(C, '肺炎で数日入院しました。', { k: 'health' }); adj(L, 'health', -4); }
  }
  if (a >= 6 && a <= 17) schoolEvents(C);
  // 祭りや地元の行事
  if (a >= 4 && R.chance(0.06)) log(C, R.pick([`家族で「${pf.festival}」を見に行きました。`, `${L.pref === L.birthPref ? '地元' : L.pref}の名物「${pf.food}」を囲みました。`]), { k: 'life' });
  // 虐待（児童相談所への相談対応件数にもとづく）
  if (a >= 1 && a < 18 && !L.flags.abused) {
    const p = pf.v.childAbusePer100kChildren / 100000 * 0.35 * (q <= 2 ? 1.6 : 0.7);
    if (R.chance(p)) {
      L.flags.abused = true;
      log(C, '家の中で、親から虐待を受けるようになりました。', { k: 'heavy', big: true, h: 'abuse' });
      adj(L, 'happy', -15); adj(L, 'health', -4); adj(L, 'social', -6);
      if (R.chance(0.5)) log(C, '児童相談所が関わり、一時保護されました。', { k: 'family' });
    }
  }
  // 大人
  if (a >= 18) { adultEvents(C); if (L.pending) return; }
  if (a >= 60) seniorEvents(C);
  // 犯罪の被害（刑法犯の認知件数にもとづく。大半は窃盗）
  if (a >= 10 && R.chance(pf.v.crimePer1000 / 1000 * 0.8)) {
    const t = a >= 70 && R.chance(0.35) ? '「息子」を名乗る電話にだまされそうになり、家族が止めました。' : R.pick(['自転車を盗まれました。', '財布をなくし、戻ってきませんでした。', '留守のあいだに空き巣に入られました。', '駐車場で車に傷をつけられました。']);
    log(C, t, { k: 'trouble' });
    adj(L, 'happy', -2);
  }
  // 交通事故（けが）
  if (a >= 3 && R.chance(0.0025 * W.trafficFactor(L.pref))) {
    log(C, '交通事故にあい、けがで入院しました。', { k: 'health', big: true, h: 'accident' });
    adj(L, 'health', -10);
  }
  // 地震
  if (R.chance(W.quakeAnnual(L.pref))) {
    const dmg = R.chance(0.15);
    log(C, `${L.pref}で震度6弱以上の大きな地震がありました。${dmg ? '家が壊れ、しばらく避難所で暮らしました。' : '家具が倒れましたが、家族は無事でした。'}`, { k: 'disaster', big: true, h: dmg ? 'disaster' : undefined, note: `${L.pref}の県庁所在地付近で今後30年に震度6弱以上の揺れに見舞われる確率は約${pf.quake30}%（全国地震動予測地図）。${pf.quakeEstimated ? '※この県の値は推計' : ''}` });
    adj(L, 'happy', dmg ? -10 : -3);
    if (dmg) { pay(L, 3000000); }
  } else if (R.chance(0.012)) {
    log(C, R.pick(['大雨で近くの川があふれそうになり、避難所で一晩を過ごしました。', '台風で屋根の一部が飛ばされました。', '大雪で、数日家から出られませんでした。']), { k: 'disaster' });
  }
};

function schoolEvents(C) {
  const { L, W, R } = C;
  const a = L.age;
  const pf = W.pref(L.pref);
  const E = W.model.education;
  const stage = a < 12 ? 'elem' : a < 15 ? 'jhs' : 'hs';
  // いじめ
  if (!L.flags.bulliedYear || curYear(L) - L.flags.bulliedYear > 2) {
    const p = E.bullyingAnnual[stage] * (1 - (L.stats.social - 50) / 200);
    if (R.chance(p)) {
      L.flags.bullied = true; L.flags.bulliedYear = curYear(L);
      const bt = ['クラスで仲間はずれにされるようになりました。', '持ち物を隠されたり、悪口を言われたりするようになりました。'];
      if (stage !== 'elem') bt.push('SNS のグループで、自分だけ外されるようになりました。');
      log(C, R.pick(bt), { k: 'school', big: true, h: 'bully' });
      adj(L, 'happy', -10); adj(L, 'social', -6);
      if (R.chance(0.5)) log(C, R.pick(['担任の先生が気づいて、間に入ってくれました。', '親に打ち明けると、学校と話し合ってくれました。', '学年が変わると、少しずつ落ち着きました。']), { k: 'school' });
    }
  }
  // 不登校
  if (!L.flags.futoko && (stage === 'jhs' || stage === 'elem')) {
    // 不登校の統計は「その年に30日以上休んだ生徒」の割合。続く人も多いので、新たに始まる割合はその3分の1ほどとみる（推計）
    const p = pf.v.futokoPer1000JHS / 1000 * (stage === 'elem' ? E.elementaryFutokoRatio : 1) * 0.33 * (L.flags.bullied ? 2 : 1);
    if (R.chance(p)) {
      L.flags.futoko = true;
      log(C, '学校に行けない日が続くようになりました。', { k: 'school', big: true, note: `${L.pref}では中学生の千人に${Math.round(pf.v.futokoPer1000JHS)}人ほどが、年間30日以上学校を休んでいます（不登校）。` });
      adj(L, 'know', -5); adj(L, 'social', -5);
      if (R.chance(0.55)) log(C, R.pick(['フリースクールに通いはじめ、少しずつ笑顔が戻りました。', '保健室なら通えるようになりました。', 'オンラインで勉強を続けました。']), { k: 'school' });
    }
  }
  // 学校の日々
  const r = R.next();
  if (r < 0.35) {
    const pool = stage === 'elem'
      ? ['運動会のリレーで、最後まで走りきりました。', '夏休みの自由研究で、アサガオの観察日記をつけました。', '遠足で、友だちとお弁当を交換しました。', '図書室の本を、片っ端から読みました。', '九九を全部言えるようになりました。', '学芸会で、木の役を一生懸命演じました。', '放課後、暗くなるまで校庭で遊びました。']
      : stage === 'jhs'
        ? ['定期テストの前の晩、ほとんど眠れませんでした。', '修学旅行で、夜遅くまで友だちと話しました。', '部活の大会で、あと一歩のところで負けました。', '初めて好きな人ができました。', '進路について、親と言い合いになりました。', '体育祭の応援団で声をからしました。']
        : ['文化祭の準備で、教室に遅くまで残りました。', '模試の結果を見て、ため息をつきました。', '友だちと自転車で海まで走りました。', '修学旅行で、初めて飛行機に乗りました。', 'オープンキャンパスに行きました。', '部活を引退する日、涙が止まりませんでした。'];
    log(C, R.pick(pool), { k: 'school' });
  }
  // 習い事（家計による）
  if (a === 7 && R.chance(0.25 + 0.1 * L.household.quintile)) {
    L.flags.lesson = R.pick(['スイミング', 'ピアノ', '英会話', 'サッカー教室', '習字', '学習塾', 'そろばん', '空手']);
    log(C, `${L.flags.lesson}に通いはじめました。`, { k: 'school' });
  } else if (a === 7 && L.household.quintile <= 2 && R.chance(0.3)) {
    log(C, '友だちが通う習い事に行きたいと言いましたが、家の事情を察して、それ以上は言いませんでした。', { k: 'school' });
  }
  if (a === 14 && R.chance(0.4 + 0.1 * L.household.quintile)) log(C, '塾に通いはじめました。', { k: 'school' });
}

function adultEvents(C) {
  const { L, W, R } = C;
  const a = L.age;
  const H = W.model.health;
  const sp = L.family.spouse;
  // 喫煙
  if (!L.health.smoker && !L.health.everSmoked && a >= 18 && a <= 30 && !L.flags.smokeAsked) {
    const p = (L.sex === 'M' ? 0.075 : 0.022);
    if (R.chance(p)) { L.flags.smokeAsked = true; offer(C, 'smoke'); if (L.pending) return; }
  }
  if (L.health.smoker && a >= 25 && R.chance(0.03)) { offer(C, 'quitSmoke'); if (L.pending) return; }
  // 依存症
  if (!L.health.alcohol && a >= 20 && a < 70 && R.chance(H.alcoholDependenceLifetime[L.sex] / 45 * (L.stats.happy < 40 ? 2 : 1))) {
    L.health.alcohol = true;
    log(C, 'お酒の量が増え、やめられなくなりました。アルコール依存症と診断されました。', { k: 'heavy', big: true, h: 'addiction' });
    adj(L, 'health', -10); adj(L, 'social', -8);
    offer(C, 'treatAddiction', { kind: 'alcohol' }); if (L.pending) return;
  }
  if (!L.health.gambling && a >= 20 && a < 70 && R.chance(H.gamblingProblem[L.sex] / 40)) {
    L.health.gambling = true;
    log(C, 'ギャンブルがやめられなくなり、借金がふくらみました。', { k: 'heavy', big: true, h: 'addiction' });
    L.money.debt += R.int(50, 400) * 10000;
    adj(L, 'happy', -8);
    offer(C, 'treatAddiction', { kind: 'gambling' }); if (L.pending) return;
  }
  // こころの不調
  if (!L.health.conditions.depression && a < 70 && R.chance(H.depressionLifetime[L.sex] / 45 * (L.stats.happy < 40 ? 2.5 : 0.8))) {
    L.health.conditions.depression = { since: curYear(L) };
    log(C, '気分の落ち込みが続き、うつ病と診断されました。', { k: 'heavy', big: true, h: 'mental' });
    adj(L, 'happy', -12); adj(L, 'health', -5);
    offer(C, 'treatMental'); if (L.pending) return;
  }
  // 配偶者からの暴力（内閣府調査の生涯経験率に合わせた年あたりの確率）
  if (sp && sp.alive && !sp.divorced && !L.flags.dv) {
    const life = W.nat.violence2023.spousePhysical[L.sex] / 100;
    if (R.chance(life / 36)) {
      L.flags.dv = true;
      log(C, `${sp.sex === 'M' ? '夫' : '妻'}から暴力を受けるようになりました。`, { k: 'heavy', big: true, h: 'dv' });
      adj(L, 'happy', -15); adj(L, 'health', -5);
      offer(C, 'dv'); if (L.pending) return;
    }
  }
  // 性暴力
  if (a < 50 && !L.flags.sv) {
    const v = W.nat.violence2023;
    const life = (L.sex === 'F' ? v.forcedSexF.value : v.forcedSexM.value) / 100;
    if (R.chance(life / 34)) {
      L.flags.sv = true;
      log(C, '性暴力の被害にあいました。', { k: 'heavy', big: true, h: 'sexual' });
      adj(L, 'happy', -15); adj(L, 'health', -4);
    }
  }
  // 病気
  const cs = L.health.conditions;
  const incC = cancerHazard(L.sex, a);
  if (!cs.cancer && R.chance(incC)) {
    cs.cancer = { since: curYear(L), site: cancerSite(R, L.sex, a) };
    log(C, `${cs.cancer.site}がんが見つかりました。`, { k: 'health', big: true, h: 'illness', note: `一生のうちにがんと診断される人は、男性で約${W.nat.cancerRisk.incidence.M}%、女性で約${W.nat.cancerRisk.incidence.F}%（国立がん研究センター）。` });
    adj(L, 'health', -14); adj(L, 'happy', -8);
    offer(C, 'cancer'); if (L.pending) return;
  } else if (cs.cancer && !cs.cancer.cured && curYear(L) - cs.cancer.since >= 5 && R.chance(0.6)) {
    cs.cancer.cured = true;
    log(C, 'がんの治療から5年がたち、再発はありませんでした。', { k: 'health' }); adj(L, 'happy', 5); adj(L, 'health', 6);
  }
  if (a >= 40 && !cs.hypertension && R.chance(0.012 + (a - 40) * 0.0008 + (L.health.smoker ? 0.006 : 0))) {
    cs.hypertension = { since: curYear(L) };
    log(C, '健康診断で血圧が高いと言われ、薬を飲みはじめました。', { k: 'health' }); adj(L, 'health', -3);
  }
  if (a >= 40 && !cs.diabetes && R.chance(0.005 + (a - 40) * 0.0003)) {
    cs.diabetes = { since: curYear(L) };
    log(C, '糖尿病と診断され、食事に気をつけるようになりました。', { k: 'health' }); adj(L, 'health', -5);
  }
  if (a >= 45 && !cs.heart && R.chance(0.0006 * Math.exp((a - 45) * 0.07) * (L.health.smoker ? 1.8 : 1))) {
    cs.heart = { since: curYear(L) };
    log(C, '胸の痛みで救急車を呼びました。心筋梗塞でしたが、手術で命をとりとめました。', { k: 'health', big: true, h: 'illness' }); adj(L, 'health', -16);
  }
  if (a >= 45 && !cs.stroke && R.chance(0.0006 * Math.exp((a - 45) * 0.075) * (cs.hypertension ? 1.8 : 1))) {
    cs.stroke = { since: curYear(L) };
    log(C, '脳梗塞で倒れました。リハビリを続け、少しずつ歩けるようになりました。', { k: 'health', big: true, h: 'illness' }); adj(L, 'health', -18);
  }
  // 小さな出来事
  if (a < 60 && R.chance(0.3)) {
    const pool = [
      '久しぶりに学生時代の友人と集まりました。', '体調を崩して、一週間寝こみました。', '思いきって新しい服を買いました。', '有給休暇をとって、温泉に行きました。',
      '眠れない夜に、昔の写真を眺めました。', '近所の人に野菜をもらいました。', '駅の階段で、見知らぬ人の荷物を運ぶのを手伝いました。', 'スマートフォンを買い替えました。',
    ];
    if (L.work.status === 'employed') pool.push('残業が続き、終電で帰る日が増えました。', '職場の飲み会で、初めて本音で話せる同僚ができました。', '大きな仕事をやり遂げ、同僚と乾杯しました。', '上司と意見がぶつかりました。');
    if (L.family.children.length) pool.push('子どもの運動会で、場所取りのために朝早く家を出ました。', '子どもの寝顔を見ながら、一日を振り返りました。');
    if (L.hobby) pool.push(`${L.hobby}の腕が少し上がりました。`);
    log(C, R.pick(pool), { k: 'life' });
  }
  // 貧困
  const lowInc = (L.work.income + (L.work.pensionM || 0) * 12 + (L.family.spouse?.income || 0)) < 1600000;
  if (L.age >= 20 && lowInc && L.money.debt > 3000000 && L.money.savings < 100000 && !L.flags.welfare && L.work.status !== 'employed' && !['univ', 'voc', 'jc', 'grad'].includes(L.edu.stage) && R.chance(0.06)) {
    L.flags.welfare = true;
    log(C, '暮らしが立ち行かなくなり、生活保護を受けることになりました。', { k: 'heavy', big: true, h: 'poverty', note: `${L.pref}の生活保護を受ける世帯は、一般世帯千あたり約${W.pref(L.pref).v.welfareHouseholdsPer1000.toFixed(1)}世帯（被保護者調査）。` });
    L.money.savings = 0; L.money.debt = Math.max(0, L.money.debt - 1000000);
  }
}

function seniorEvents(C) {
  const { L, W, R } = C;
  const a = L.age;
  const H = W.model.health;
  // 認知症（年齢別有病率の差分から推計した発症率）
  if (!L.health.dementia && a >= 65) {
    const prev = dementiaPrev(W, L.sex, a), prev1 = dementiaPrev(W, L.sex, a + 1);
    const inc = Math.max(0.002, (prev1 - prev) / (1 - prev)) * 0.85 * (L.focus === 'brain' ? 0.75 : 1);
    if (R.chance(inc)) {
      L.health.dementia = true;
      log(C, '物忘れが増え、認知症と診断されました。', { k: 'health', big: true });
      adj(L, 'know', -15); adj(L, 'happy', -4);
    }
  }
  // 介護
  if (!L.health.care && a >= 65 && R.chance(careP(W, a) / 7)) {
    L.health.care = true;
    log(C, R.pick(['足腰が弱り、介護保険のサービスを使いはじめました。', '要介護の認定を受け、デイサービスに通いはじめました。']), { k: 'health', big: true });
    adj(L, 'health', -6);
  }
  // 骨折
  if (a >= 65 && R.chance(a >= 85 ? 0.025 : a >= 75 ? 0.012 : 0.006)) {
    log(C, '家の中で転んで、足の付け根の骨を折りました。', { k: 'health', big: true }); adj(L, 'health', -12);
  }
  if (R.chance(0.25)) {
    const pool = ['老眼鏡を新しくしました。', '同窓会の案内が届きました。', '朝の散歩が日課になりました。', '庭の手入れをしました。', '病院の待合室で、顔なじみが増えました。', '若いころの友人の訃報が届きました。', 'テレビの音量が少しずつ大きくなっています。', '近所の子どもたちに、昔の町の話をしました。'];
    if (L.grandkids) pool.push('孫が遊びに来て、家がにぎやかになりました。', '孫にお年玉を渡しました。');
    log(C, R.pick(pool), { k: 'life' });
  }
}

function dementiaPrev(W, sex, a) {
  const t = W.nat.dementiaPrevalence;
  if (a < 65) return 0.005;
  if (a < 70) return t['65-69'][sex] / 100;
  if (a < 75) return t['70-74'][sex] / 100;
  if (a < 80) return t['75-79'][sex] / 100;
  if (a < 85) return t['80-84'][sex] / 100;
  return Math.min(0.85, t['85+'][sex] / 100 + (a - 87) * 0.015);
}
// がんの罹患率（生涯罹患リスク 男65%・女50% に合うように年齢の形を置いた推計）
const CANCER_K = { M: 2.1, F: 2.1 }; // 生涯罹患リスク（男65%・女50%）に合わせる倍率（シミュレーションで確認）
function cancerHazard(sex, a) {
  if (a < 20) return 0;
  return CANCER_K[sex] * (sex === 'M' ? 0.00017 * Math.exp(0.081 * (a - 20)) : 0.00045 * Math.exp(0.054 * (a - 20)));
}
function cancerSite(R, sex, a) {
  return sex === 'M' ? R.weighted([['前立腺', 0.17], ['大腸', 0.16], ['胃', 0.14], ['肺', 0.15], ['肝臓', 0.05], ['すい臓', 0.04], ['食道', 0.03], ['腎臓', 0.03], ['血液の', 0.04], ['ほかの', 0.19]])
    : R.weighted([['乳', a < 60 ? 0.3 : 0.18], ['大腸', 0.16], ['肺', 0.1], ['胃', 0.08], ['子宮', 0.07], ['すい臓', 0.05], ['甲状腺', 0.03], ['血液の', 0.04], ['ほかの', 0.15]]);
}

// ---------------------------------------------------------------- 重点と状態
const KNOW18 = 57; // 18歳の知識の平均（シミュレーションで測った値）
const KMEAN = (a) => (a <= 18 ? 4 + a * (KNOW18 - 4) / 18 : KNOW18);
STEP.focus = (C) => {
  const { L, W, R } = C;
  const a = L.age;
  const g = focusGroup(a);
  if (g && (L.focusAuto || L.auto || L.isPeer || !L.focus || !FOCUS[g].some((f) => f.id === L.focus))) {
    L.focus = autoFocus(C, g);
  }
  if (g && a >= 18) L.focusYears[L.focus] = (L.focusYears[L.focus] || 0) + 1;
  const f = L.focus;
  const q = L.household.quintile;
  // 知識
  if (a < 23 && ['elem', 'jhs', 'hs', 'univ', 'voc', 'jc', 'grad', 'preschool', 'ronin'].includes(L.edu.stage) || a < 6) {
    let d = a < 6 ? 2 : 3.0 + 0.35 * (q - 3) + 0.9 * L.talent + R.normal(0, 0.9);
    if (L.flags.futoko && a < 16) d -= 1.2;
    if (f === 'study') d += 2.2; if (f === 'friends' || f === 'home') d -= 0.4; if (f === 'parttime') d -= 0.8;
    if (['univ', 'grad'].includes(L.edu.stage)) d = 1.5 + (f === 'study' ? 1 : 0);
    adj(L, 'know', d);
  } else if (a >= 23) {
    let d = a < 60 ? -0.15 : a < 75 ? -0.4 : -0.9;
    if (f === 'learn' || f === 'brain') d += 2; if (L.health.dementia) d -= 2;
    adj(L, 'know', d);
  }
  // 健康：年齢とともにゆっくり下がる
  const drift = a < 18 ? 0.4 : a < 30 ? 0 : a < 45 ? -0.3 : a < 60 ? -0.55 : a < 70 ? -0.8 : a < 80 ? -1.2 : -1.7;
  L.hBase = clamp(L.hBase + drift, 5, 100);
  let dh = drift + (L.hBase - L.stats.health) * 0.08;
  if (f === 'sports' || f === 'health') dh += 1.4; if (f === 'rest') dh += 0.8; if (f === 'work') dh -= 0.8;
  if (L.health.smoker) dh -= 0.6; if (L.health.alcohol) dh -= 1;
  dh += R.normal(0, 1.2);
  adj(L, 'health', dh);
  // 人間関係
  let ds = (50 - L.stats.social) * 0.04;
  if (f === 'friends' || f === 'family' || f === 'community') ds += 2.5; if (f === 'work') ds -= 1.2; if (f === 'home') ds += 1.2;
  if (L.family.spouse && L.family.spouse.alive && !L.family.spouse.divorced) ds += 0.8;
  if (a >= 75) ds -= 0.6;
  adj(L, 'social', ds + R.normal(0, 1));
  // 幸福：暮らしの状態に向かってゆっくり動く
  const target = 52 + (L.stats.health - 60) * 0.18 + (L.stats.social - 50) * 0.22 + incomeHappy(W, L)
    + (L.family.spouse && L.family.spouse.alive && !L.family.spouse.divorced ? 3 : 0) + (L.family.children.length ? 2 : 0)
    + (f === 'hobby' || f === 'rest' ? 3 : 0) + (f === 'friends' ? 2 : 0) + (f === 'study' ? -2 : 0) + (L.money.debt > 3000000 ? -6 : 0)
    + (L.health.conditions.depression && !L.health.conditions.depression.treated ? -8 : 0);
  adj(L, 'happy', (target - L.stats.happy) * 0.22 + R.normal(0, 2.2));
  if (f === 'work' && L.work.status === 'employed') L.work.boost = Math.min(0.45, L.work.boost + 0.01);
  // 記録
  L.hist.happy[a] = Math.round(L.stats.happy);
  L.hist.health[a] = Math.round(L.stats.health);
  if (a === 18) L.hist.know18 = Math.round(L.stats.know);
  if (L.hist.dev) L.hist.dev[a] = Math.round((L.stats.health - L.hBase) * 10) / 10;
  L.hist.pref[a] = L.pref;
};

function incomeHappy(W, L) {
  const inc = L.work.income + (L.work.pensionM || 0) * 12 + (L.family.spouse?.income || 0);
  if (L.age < 18) return (L.household.quintile - 3) * 1.5;
  const ref = W.baseWage(L.sex, Math.min(60, L.age)) * W.incomeFactor(L.pref);
  return clamp(Math.log((inc + 1500000) / (ref + 1500000)) * 8, -8, 6);
}

function autoFocus(C, g) {
  const { L, R } = C;
  const a = L.age;
  const opts = FOCUS[g].filter((f) => (!f.minAge || a >= f.minAge) && (!f.maxAge || a <= f.maxAge));
  const w = {
    study: L.edu.stage === 'hs' && a >= 17 ? 3 : 1.4, friends: 1.6, home: 0.6, sports: 1, hobby: 1, parttime: 0.5,
    work: L.work.status === 'employed' && a < 60 ? 1.4 : 0.3, balance: 2.5, family: L.family.children.length ? 1.6 : 0.8, health: a > 45 ? 1.3 : 0.5,
    learn: 0.5, community: 0.4, rest: 0.6, brain: 0.8,
  };
  // 同じ重点を続けやすい
  return R.weighted(opts.map((o) => [o.id, (w[o.id] || 1) * (o.id === L.focus ? 2.2 : 1)]));
}

// ---------------------------------------------------------------- お金
STEP.money = (C) => {
  const { L, W, R } = C;
  const a = L.age;
  const M = L.money;
  if (a < 16) return;
  const w = L.work;
  if (w.status === 'employed') {
    const inc = wageOf(W, { ...w, sex: L.sex, edu: L.edu.level, wageZ: L.wageZ }, a, L.pref) * Math.exp(R.normal(0, 0.05)) * (L.focus === 'rest' ? 0.96 : 1);
    w.income = Math.round(inc);
  } else w.income = 0;
  if (L.focus === 'parttime' && a < 18) w.income = R.int(15, 60) * 10000;
  if (['univ', 'voc', 'jc', 'grad'].includes(L.edu.stage)) w.income = R.int(40, 110) * 10000;
  const pension = (w.pensionM || 0) * 12;
  const sp = L.family.spouse;
  let spouseInc = 0;
  if (sp && sp.alive && !sp.divorced) {
    const sa = personAge(L, sp);
    if (sa < 65 && sp.jobId) spouseInc = wageOf(W, { sex: sp.sex, edu: sp.edu, jobId: sp.jobId, nonreg: sp.nonreg, wageZ: sp.wageZ, boost: 0 }, sa, L.pref);
    else if (sa >= 65) spouseInc = (sp.sex === 'M' ? 160000 : 90000) * 12;
    sp.income = Math.round(spouseInc);
  }
  const total = w.income + pension + spouseInc;
  // 支出：手取り（約8割）から生活費。家族の人数と県の物価で変わる
  const pf = W.pref(L.pref);
  const kids = L.family.children.filter((c) => c.alive && personAge(L, c) < 22).length;
  const adults = 1 + (sp && sp.alive && !sp.divorced ? 1 : 0);
  // 生活費：最低限の費用（人数・県の物価・家賃）を下限に、手取りの7割ほどを使う（推計）
  const disposable = total * 0.8;
  let sub = (1100000 + 600000 * (adults - 1) + 500000 * kids) * (pf.v.priceIndex / 100);
  if (!L.home.own && !L.home.withParents) sub += pf.v.rentPer3_3m2 * 12 * 12 * (adults + kids > 2 ? 1.4 : 1) * 0.6;
  let living = Math.max(sub, disposable * 0.78 + sub * 0.12);
  if (L.home.withParents && a < 30) living *= 0.5;
  if (L.home.own && L.home.mortgage > 0) { const pay = Math.min(L.home.mortgage, 1200000); L.home.mortgage -= pay; living += pay; }
  if (L.focus === 'health') living += 100000;
  if (L.health.smoker) living += 200000;
  let net = disposable - living;
  if (L.flags.welfare) net = Math.max(net, 0);
  // 学生のあいだは家族の仕送りや奨学金で生活費の多くをまかなう
  if (['univ', 'voc', 'jc', 'grad', 'ronin'].includes(L.edu.stage)) net = Math.max(net, -150000 * (6 - L.household.quintile) / 3);
  if (L.focus === 'work' && net > 0) net *= 1.05;
  if (a < 18) net = Math.min(net, w.income);
  M.savings = Math.round(M.savings + net);
  if (M.investOn && M.savings > 500000) {
    const put = Math.min(1200000, M.savings * 0.2);
    M.savings -= put; M.invest += put;
  }
  if (M.invest > 0) M.invest = Math.round(M.invest * (1 + R.normal(0.04, 0.13)));
  // 借金：貯金がマイナスなら借金として扱う
  if (M.savings < 0 && L.age >= 18) { M.debt += -M.savings; M.savings = 0; }
  if (M.debt > 0 && M.savings > 0) { const pay = Math.min(M.debt, M.savings * 0.5); M.debt -= pay; M.savings -= pay; }
  if (M.scholarship > 0 && L.edu.stage === 'done' && w.income > 0) { const pay = Math.min(M.scholarship, 180000); M.scholarship -= pay; M.savings -= pay; if (M.scholarship === 0) log(C, '奨学金を返し終えました。', { k: 'money' }); }
  L.hist.income[a] = Math.round(total);
  L.hist.work[a] = w.income;
  if (w.status === 'employed' && !w.nonreg && !JOB[w.jobId]?.self) L.hist.ft[a] = 1;
  if (total > (L.maxIncome?.v || 0)) L.maxIncome = { v: Math.round(total), age: a };
};

// ---------------------------------------------------------------- 死亡
// 健康状態による死亡リスクの倍率（全体の平均が生命表に一致するように正規化。tests で確認）
export const HEALTH_K = 0.03;
// 年齢ごとの倍率の平均（シミュレーションで測った値）で割り、全体の死亡率が生命表どおりになるようにする
const HEALTH_NORM = [1.0, 0.94, 0.98, 1.06, 1.1, 1.1, 1.09, 1.11, 1.19, 1.28, 1.4];
export const healthNorm = (a) => HEALTH_NORM[Math.min(10, Math.floor(a / 10))];
STEP.death = (C) => {
  const { L, W, R } = C;
  const a = L.age;
  let q = W.q(L.pref, L.sex, a);
  const dev = L.stats.health - L.hBase;
  const m = a < 1 ? 1 : clamp(Math.exp(-HEALTH_K * dev), 0.5, 2.6) / healthNorm(a);
  q = Math.min(0.995, q * m);
  if (!R.chance(q)) return;
  const cause = drawCause(C);
  die(C, cause);
};

function drawCause(C) {
  const { L, W, R } = C;
  const row = { ...W.causeRow(L.sex, L.age) };
  if (row.suicide) row.suicide *= W.suicideFactor(L.pref) * (L.stats.happy < 35 ? 1.3 : L.stats.happy > 70 ? 0.8 : 1);
  if (row.traffic) row.traffic *= W.trafficFactor(L.pref);
  const cs = L.health.conditions;
  if (cs.cancer && !cs.cancer.cured) row.cancer = (row.cancer || 0) * 5 + 0.05;
  if (cs.heart) row.heart = (row.heart || 0) * 1.8;
  if (cs.stroke) row.stroke = (row.stroke || 0) * 2.5;
  if (cs.diabetes) row.diabetes = (row.diabetes || 0) * 3 + 0.005; if (cs.diabetes) row.kidney = (row.kidney || 0) * 1.5;
  if (L.health.dementia) row.dementia = (row.dementia || 0) * 1.6 + 0.005;
  if (L.health.alcohol) row.liver = (row.liver || 0) * 4 + 0.02;
  return R.weighted(Object.entries(row));
}

function die(C, cause) {
  const { L, W } = C;
  L.alive = false; L.deathAge = L.age; L.deathCause = cause; L.deathYear = curYear(L);
  L.hist.happy[L.age] = Math.round(L.stats.happy);
  const label = W.causeLabel(cause);
  let t, h = 'death';
  if (cause === 'suicide') { t = `${L.age}歳で、自ら命を絶ちました。`; h = 'suicide'; }
  else if (cause === 'homicide') t = `${L.age}歳で、事件に巻き込まれて亡くなりました。`;
  else if (cause === 'traffic') t = `${L.age}歳で、交通事故のため亡くなりました。`;
  else if (cause === 'senility') t = `${L.age}歳で、老衰のため静かに息を引き取りました。`;
  else if (L.age === 0) t = `生まれて1年もたたないうちに、${label}のため亡くなりました。`;
  else t = `${L.age}歳で、${label}のため亡くなりました。`;
  log(C, t, { k: 'death', big: true, h, gentle: `${L.age}歳で亡くなりました。` });
}

// ================================================================ 決断
const DEC = {};
const H = (s) => s; // ヒント文字列

DEC.toddler = {
  cat: 'small',
  build(C, c) { const card = TODDLER_CARDS.find((x) => x.age === c.age); return { title: card.title, body: 'この時期の小さな出来事が積み重なって、5歳ごろに気質が定まっていきます。', options: card.options.map((o) => ({ label: o[0] })) }; },
  auto(C, c) { const card = TODDLER_CARDS.find((x) => x.age === c.age); return C.R.int(0, card.options.length - 1); },
  apply(C, c, i) { const card = TODDLER_CARDS.find((x) => x.age === c.age); const [lab, t] = card.options[i]; C.L.temper[t]++; log(C, lab.replace(/。?$/, '。'), { k: 'baby' }); },
};

DEC.jhsExam = {
  cat: 'family',
  build(C) { return { title: '中学受験をしてみる？', body: `${C.L.pref}の都市部では、私立や国立の中学校を受験する子もいます。塾の費用がかかります。`, options: [{ label: '受験してみる', hint: '知識↑ 幸福↓ お金↓' }, { label: '地元の中学校へ', hint: '友だちと一緒' }] }; },
  auto(C) { return C.R.chance(0.35 + 0.1 * (C.L.household.quintile - 3)) ? 0 : 1; },
  apply(C, c, i) {
    const { L, R } = C;
    if (i === 1) { log(C, '地元の中学校に進むことにしました。', { k: 'school' }); return; }
    adj(L, 'know', 4); adj(L, 'happy', -4); pay(L, 1000000);
    const ok = R.chance(clamp(0.35 + (L.stats.know - KMEAN(11)) / 40, 0.1, 0.9));
    if (ok) { L.edu.privateJhs = true; L.talent += 0.1; log(C, '中学受験に合格しました。', { k: 'school', big: true }); adj(L, 'happy', 6); }
    else log(C, '中学受験は不合格でした。地元の中学校に進みます。', { k: 'school' });
  },
};

DEC.club = {
  cat: 'small',
  build(C) { return { title: '部活は何にする？', options: [{ label: '運動部', hint: '健康↑ 人間関係↑' }, { label: '文化部', hint: '幸福↑ 得意なことが育つ' }, { label: '入らない', hint: '時間を自由に使う' }] }; },
  auto(C) { return C.R.weighted([[0, 0.6], [1, 0.28], [2, 0.12]]); },
  apply(C, c, i) {
    const { L, R } = C;
    if (i === 0) { L.club = R.pick(CLUBS.sports); adj(L, 'health', 3); adj(L, 'social', 3); }
    if (i === 1) { L.club = R.pick(CLUBS.culture); adj(L, 'happy', 3); }
    log(C, i === 2 ? '部活には入らず、放課後は自由に過ごすことにしました。' : `${L.club}に入りました。`, { k: 'school' });
  },
};

DEC.highschool = {
  cat: 'big',
  build(C) {
    const { L, W } = C;
    const pf = W.pref(L.pref);
    const opts = [
      { label: '進学校をめざす', hint: '大学進学の可能性↑ 合格は知識しだい' },
      { label: '地元の普通科の高校へ', hint: 'いちばん多い進路' },
      { label: '工業・商業・農業などの専門学科へ', hint: '就職に強い' },
    ];
    opts.push({ label: '通信制の高校へ', hint: '自分のペースで学べる' });
    opts.push({ label: '高校には行かず働く', hint: 'ごく少数の道' });
    return { title: '中学3年生。高校はどうする？', body: `${L.pref}では中学卒業者の約${pf.v.highSchoolEntryRate}%が高校（全日制・定時制）に進みます。`, options: opts };
  },
  auto(C) {
    const { L, W, R } = C;
    const pf = W.pref(L.pref);
    const E = W.model.education;
    const pFull = pf.v.highSchoolEntryRate / 100;
    const r = R.next();
    const k = (L.stats.know - KMEAN(15)) / 15;
    if (r < E.hsNonEntry) return this._opts(C).length - 1;
    if (r > pFull + E.hsNonEntry || (L.flags.futoko && R.chance(0.15))) return 3;
    const pAcad = clamp(0.3 + 0.18 * k + 0.05 * (L.household.quintile - 3), 0.05, 0.85);
    return R.chance(pAcad) ? 0 : R.chance(0.75) ? 1 : 2;
  },
  _opts(C) { return this.build(C).options; },
  apply(C, c, i, x) {
    const { L, R, W } = C;
    const label = this.build(C).options[i].label;
    if (label.startsWith('高校には')) { L.edu.stage = 'done'; L.edu.level = 'jhs'; log(C, '高校には進まず、働くことにしました。', { k: 'school', big: true }); return; }
    if (label.startsWith('通信制')) { L.edu.stage = 'hs'; L.edu.hsType = 'tsushin'; log(C, '通信制の高校に入学しました。', { k: 'school', big: true }); return; }
    if (label.startsWith('進学校')) {
      const k = (L.stats.know - KMEAN(15)) / 15;
      const ok = x.auto ? true : R.chance(clamp(0.45 + 0.35 * k, 0.08, 0.95));
      if (ok) { L.edu.hsType = 'academic'; L.talent += 0.12; log(C, '第一志望の進学校に合格しました。', { k: 'school', big: true }); adj(L, 'happy', 5); }
      else { L.edu.hsType = 'general'; log(C, '第一志望には届かず、地元の普通科の高校に進みました。', { k: 'school', big: true }); adj(L, 'happy', -4); }
    } else if (label.startsWith('地元')) { L.edu.hsType = 'general'; log(C, '地元の高校に入学しました。', { k: 'school', big: true }); }
    else { L.edu.hsType = 'vocational'; log(C, `${R.pick(['工業', '商業', '農業', '情報'])}科のある高校に入学しました。`, { k: 'school', big: true }); }
    L.edu.stage = 'hs';
    if (R.chance(W.model.education.hsDropout * (L.flags.futoko ? 3 : 1))) L.flags.hsDropAt = 16 + R.int(0, 1);
  },
};

// 県ごとの大学等進学率に平均が一致する切片。家計の5分位は全国基準なので、その県の家計の分布で解く
const ZS = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
const ZWT = ZS.map((z) => Math.exp(-z * z / 2));
const UNIV_OFFSET = 0.32; // 高校の種類・家計の変化による平均のずれ（シミュレーションで確認）
function prefQuintiles(W, pref) {
  W._pq ||= {};
  if (W._pq[pref]) return W._pq[pref];
  const R = new Rng('pq-' + pref);
  const h = [0, 0, 0, 0, 0, 0];
  const n = 300;
  for (let i = 0; i < n; i++) {
    const fake = { startYear: 2026, age: 0, birthPref: pref, family: {} };
    const univP = clamp(W.pref(pref).v.univEntryRate / 100 * 0.85, 0.2, 0.8);
    const ma = clamp(Math.round(R.normal(32, 4.6)), 17, 46);
    const m = mkAdult(W, R, fake, 'F', ma, ['', ''], ['', ''], univP, 'mother');
    const f = R.chance(0.976) ? mkAdult(W, R, fake, 'M', clamp(Math.round(ma + R.normal(2.3, 3.5)), 18, 62), ['', ''], ['', ''], univP, 'father') : null;
    fake.family = { mother: m, father: f };
    h[quintileOf(W, familyIncome(W, fake))]++;
  }
  return (W._pq[pref] = h.map((x) => x / n));
}
export function univIntercept(W, pref) {
  W._ui ||= {};
  if (W._ui[pref] != null) return W._ui[pref];
  const dist = prefQuintiles(W, pref);
  const target = W.pref(pref).v.univEntryRate / 100;
  const f = (a) => {
    let s = 0, w = 0;
    for (let q = 1; q <= 5; q++) for (let i = 0; i < ZS.length; i++) {
      const zk = 0.25 * (q - 3) + 0.95 * ZS[i];
      const wt = dist[q] * ZWT[i];
      s += wt * sigmoid(a + UNIV_COEF.q * (q - 3) + UNIV_COEF.k * zk); w += wt;
    }
    return s / w;
  };
  let lo = -6, hi = 6;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; }
  return (W._ui[pref] = (lo + hi) / 2);
}
function univProb(C) {
  const { L, W } = C;
  const zk = (L.stats.know - KNOW18) / 15;
  let x = univIntercept(W, L.pref) + UNIV_OFFSET + UNIV_COEF.q * (L.household.quintile - 3) + UNIV_COEF.k * zk;
  if (L.edu.hsType === 'academic') x += 0.9; if (L.edu.hsType === 'vocational') x -= 1.2; if (L.edu.hsType === 'tsushin') x -= 0.8;
  return sigmoid(x);
}

DEC.afterHs = {
  cat: 'big',
  build(C, c) {
    const { L, W } = C;
    const pf = W.pref(L.pref);
    const inShare = pf.v.inPrefUnivShare;
    return {
      title: c.retry ? '一年の浪人を経て、もう一度。どうする？' : '高校を卒業しました。次は？',
      body: `${L.pref}の高校卒業者のうち大学等に進むのは約${pf.v.univEntryRate}%。大学に進む人の約${Math.round(100 - inShare)}%は県外の大学に入ります（学校基本調査）。`,
      options: [
        { label: `${L.pref}の大学を受ける`, hint: '合格は知識と準備しだい · 学費がかかる' },
        { label: '県外の大学を受ける', hint: '一人暮らし · 学費と生活費がかかる' },
        { label: '専門学校に進む', hint: '資格を身につける · 2年' },
        { label: '就職する', hint: 'すぐに収入' },
        ...(c.retry ? [] : [{ label: '浪人して、来年もう一度', hint: '知識↑ 幸福↓' }]),
      ],
    };
  },
  auto(C, c) {
    const { L, W, R } = C;
    const pf = W.pref(L.pref);
    if (R.chance(univProb(C))) {
      if (L.sex === 'F' && R.chance(W.model.education.juniorCollegeShareOfUnivF)) { c.jc = true; return 2; }
      return R.chance(pf.v.inPrefUnivShare / 100) ? 0 : 1;
    }
    return R.chance(W.model.education.vocShareOfNonUniv) ? 2 : 3;
  },
  apply(C, c, i, x) {
    const { L, W, R } = C;
    const opts = this.build(C, c).options;
    const lab = opts[i].label;
    if (lab.startsWith('浪人')) { L.edu.stage = 'ronin'; L.edu.ronin++; log(C, '浪人することにしました。予備校に通います。', { k: 'school', big: true }); adj(L, 'know', 4); adj(L, 'happy', -5); return; }
    if (lab === '就職する') { L.edu.stage = 'done'; jobHunt(C); return; }
    if (lab === '専門学校に進む') {
      if (c.jc) { L.edu.stage = 'jc'; L.edu.gradAt = L.age + 2; L.edu.major = R.pick(['hum', 'home', 'edu']); log(C, '短期大学に進学しました。', { k: 'school', big: true }); payTuition(C, 2); return; }
      if (x.auto) { const v = R.weighted(VOC_TRACKS.map((t) => [t.id, t.w])); L.edu.voc = v; L.edu.stage = 'voc'; L.edu.gradAt = L.age + 2; log(C, `${VOC_TRACKS.find((t) => t.id === v).label}の専門学校に入学しました。`, { k: 'school', big: true }); payTuition(C, 2); return; }
      offer(C, 'vocTrack'); return;
    }
    // 大学
    const out = lab === '県外の大学を受ける';
    const auto = !!x.auto;
    const p = auto ? 1 : clamp(univProb(C) * 1.25 + 0.15, 0.1, 0.97);
    if (!R.chance(p)) {
      log(C, '大学入試は不合格でした。', { k: 'school', big: true }); adj(L, 'happy', -6);
      if (!c.retry) { L.edu.stage = 'ronin'; L.edu.ronin++; log(C, '浪人して、もう一度挑戦することにしました。', { k: 'school' }); }
      else { L.edu.stage = 'done'; jobHunt(C); }
      return;
    }
    L.edu.stage = 'univ'; L.edu.gradAt = L.age + 4;
    if (out) {
      const dest = W.drawDestination(R, L.pref, 'univ');
      moveTo(C, dest, '進学');
      L.home.withParents = false;
      log(C, `${dest}の大学に合格し、一人暮らしを始めました。`, { k: 'school', big: true });
    } else {
      log(C, `${L.pref}の大学に合格しました。`, { k: 'school', big: true });
      if (R.chance(0.3)) L.home.withParents = false;
    }
    payTuition(C, 4, out);
    offer(C, 'major');
  },
};

function payTuition(C, years, away) {
  const { L, R } = C;
  const cost = (years >= 4 ? 4500000 : 2400000) + (away ? 3500000 : 0);
  if (L.household.quintile <= 3 && R.chance(0.65 - 0.12 * (L.household.quintile - 1))) {
    const s = Math.round(cost * 0.5);
    L.money.scholarship += s;
    log(C, `貸与型の奨学金を借りることにしました（総額およそ${yen(s)}）。`, { k: 'money' });
  }
}

DEC.vocTrack = {
  cat: 'small',
  build(C, c) { if (!c.ids) c.ids = C.R.shuffle(VOC_TRACKS).slice(0, 4).map((o) => o.id); return { title: '専門学校で何を学ぶ？', options: c.ids.map((id) => ({ label: VOC_TRACKS.find((v) => v.id === id).label })) }; },
  auto(C, c) { c.ids = [C.R.weighted(VOC_TRACKS.map((t) => [t.id, t.w]))]; return 0; },
  apply(C, c, i) {
    const { L } = C;
    const ids = c.ids || VOC_TRACKS.map((v) => v.id);
    const v = VOC_TRACKS.find((t) => t.id === ids[i]) || VOC_TRACKS[0];
    L.edu.voc = v.id; L.edu.stage = 'voc'; L.edu.gradAt = L.age + 2;
    log(C, `${v.label}の専門学校に入学しました。`, { k: 'school', big: true });
    payTuition(C, 2);
  },
};

DEC.major = {
  cat: 'small',
  build(C) { return { title: '大学で何を学ぶ？', options: MAJORS.map((m) => ({ label: m.label })) }; },
  auto(C) { return MAJORS.indexOf(C.R.weighted(MAJORS.map((m) => [m, m.w]))); },
  apply(C, c, i) {
    const { L, R } = C;
    const m = MAJORS[i];
    L.edu.major = m.id;
    if (m.id === 'med' && L.stats.know > 72 && R.chance(0.3)) { L.flags.medSchool = true; L.edu.gradAt = L.age + 6; log(C, '医学部に入りました。6年間の勉強が始まります。', { k: 'school', big: true }); return; }
    log(C, `${m.label}を学ぶことにしました。`, { k: 'school' });
    if (R.chance(0.5)) L.hobby = L.hobby || null;
  },
};

DEC.afterUniv = {
  cat: 'big',
  build(C) { return { title: '大学を卒業します。この先は？', options: [{ label: '就職する', hint: '' }, { label: '大学院に進む', hint: '知識↑ 2年' }] }; },
  auto(C) { return C.R.chance(C.W.model.education.gradSchool[C.L.sex] * (C.L.stats.know > 70 ? 1.6 : 0.8)) ? 1 : 0; },
  apply(C, c, i) {
    const { L } = C;
    if (i === 1) { L.edu.stage = 'grad'; L.edu.gradAt = L.age + 2; log(C, '大学院に進みました。', { k: 'school', big: true }); adj(L, 'know', 4); return; }
    L.edu.stage = 'done';
    // 県外の大学に出ていた人は、地元に戻るかどうか
    if (L.pref !== L.birthPref) { offer(C, 'uturnJob'); return; }
    jobHunt(C);
  },
};

DEC.uturnJob = {
  cat: 'big',
  build(C) { const { L } = C; return { title: 'どこで働く？', body: `大学のある${L.pref}に残るか、生まれた${L.birthPref}に戻るか。`, options: [{ label: `${L.pref}で就職する`, hint: '' }, { label: `${L.birthPref}に戻って就職する`, hint: '家族の近く' }, { label: '東京で就職する', hint: '仕事の選択肢が多い · 家賃が高い' }] }; },
  auto(C) { const { L, R } = C; return L.pref === '東京都' ? (R.chance(0.3) ? 1 : 0) : R.weighted([[0, 0.45], [1, 0.38], [2, 0.17]]); },
  apply(C, c, i) {
    const { L } = C;
    if (i === 1) moveTo(C, L.birthPref, 'Uターン就職');
    if (i === 2 && L.pref !== '東京都') moveTo(C, '東京都', '就職');
    jobHunt(C);
  },
};

DEC.job = {
  cat: 'big',
  build(C, c) {
    const { L, W } = C;
    return {
      title: L.work.status === 'unemployed' ? '次の仕事を探しています。どれにする？' : '仕事を選ぶ',
      body: `${L.pref}で見つかった求人です。${L.pref}の有効求人倍率は${W.pref(L.pref).v.jobOpeningsRatio}倍。`,
      options: c.offers.map((id) => { const j = JOB[id]; const est = wageOf(W, { sex: L.sex, edu: L.edu.level, jobId: id, nonreg: false, wageZ: 0, boost: 0 }, L.age, L.pref); return { label: j.t, hint: `年収の目安 ${yen(est)}` }; }),
    };
  },
  auto(C, c) { return 0; },
  apply(C, c, i) { startJob(C, JOB[c.offers[i]]); },
};

DEC.jobChange = {
  cat: 'big',
  build(C, c) {
    const { L, W } = C;
    const j = JOB[c.jobId];
    const est = wageOf(W, { sex: L.sex, edu: L.edu.level, jobId: c.jobId, nonreg: false, wageZ: L.wageZ, boost: L.work.boost * 0.5 }, L.age, L.pref);
    return { title: '転職の誘いが来ました', body: `${j.t}の仕事です。いまの仕事は${JOB[L.work.jobId]?.t}。`, options: [{ label: '転職する', hint: `年収の目安 ${yen(est)}` }, { label: 'いまの仕事を続ける', hint: '' }] };
  },
  auto(C) { return C.R.chance(0.35) ? 0 : 1; },
  apply(C, c, i) {
    const { L, R } = C;
    if (i === 1) { log(C, '誘いを断り、いまの仕事を続けることにしました。', { k: 'work' }); return; }
    L.work.boost *= 0.5;
    startJob(C, JOB[c.jobId], { nonreg: R.chance(0.15), text: `${JOB[c.jobId].t}に転職しました。` });
    adj(L, 'happy', 2);
  },
};

DEC.retire = {
  cat: 'big',
  build(C, c) {
    if (c.self) return { title: 'そろそろ仕事をやめる？', options: [{ label: '引退する', hint: '' }, { label: 'まだ続ける', hint: '' }] };
    if (c.at === 60) return { title: '60歳。定年を迎えます', body: '多くの職場では、定年のあとも嘱託や再雇用で働き続けることができます。', options: [{ label: '再雇用で働き続ける', hint: '収入は下がる' }, { label: '退職する', hint: '自由な時間' }] };
    return { title: '65歳。仕事をどうする？', body: `${C.L.pref}では、65歳以上の人のうち約${C.W.pref(C.L.pref).v.elderlyWorkerShare}%が働いています（国勢調査）。`, options: [{ label: '働き続ける', hint: '' }, { label: '引退する', hint: '年金で暮らす' }] };
  },
  auto(C, c) {
    const { L, W, R } = C;
    if (c.self) return 0;
    if (c.at === 60) return R.chance(0.8) ? 0 : 1;
    return R.chance(W.pref(L.pref).v.elderlyWorkerShare / 100 * 1.2) ? 0 : 1;
  },
  apply(C, c, i) {
    const { L } = C;
    const keep = c.self ? i === 1 : i === 0;
    if (keep) {
      if (c.at === 60 && !c.self) { L.work.nonreg = true; L.work.boost *= 0.6; log(C, '定年後も、再雇用で同じ職場に残りました。', { k: 'work' }); }
      else log(C, 'もう少し働くことにしました。', { k: 'work' });
      return;
    }
    L.work.status = 'retired'; L.work.retiredAt = L.age; L.work.income = 0;
    log(C, `${L.age}歳で仕事を退きました。`, { k: 'work', big: true });
    adj(L, 'happy', 3);
  },
};

DEC.marry = {
  cat: 'big',
  build(C) {
    const { L, W } = C;
    const p = L.family.partner;
    const pa = personAge(L, p);
    return { title: 'この人と結婚する？', body: `${p.how}${p.name.sei}${p.name.mei}さん（${pa}歳）と付き合って${C.R.int(1, 3)}年になります。`, options: [{ label: '結婚する', hint: '' }, { label: 'まだ結婚しない', hint: '' }], note: `平均初婚年齢は 夫${W.nat.marriage.firstMarriageAge.M}歳・妻${W.nat.marriage.firstMarriageAge.F}歳（${W.nat.marriage.firstMarriageAge.year}年）。` };
  },
  auto(C) { return C.R.chance(0.93) ? 0 : 1; },
  apply(C, c, i) {
    const { L, W, R } = C;
    const p = L.family.partner;
    if (i === 1) {
      L.flags.declinedMarriage = true;
      if (R.chance(0.5)) { log(C, `${p.name.mei}さんとは、しばらくして別れました。`, { k: 'love' }); L.family.partner = null; }
      else log(C, `${p.name.mei}さんとの結婚は、もう少し先にすることにしました。`, { k: 'love' });
      return;
    }
    L.flags.declinedMarriage = false;
    const sp = { ...p, id: (L.family.exSpouses.length + 1), since: curYear(L), alive: true, rel: p.sex === 'M' ? '夫' : '妻' };
    sp.edu = R.chance(W.pref(L.pref).v.univEntryRate / 100) ? 'univ' : R.pick(['hs', 'voc']);
    sp.wageZ = R.normal(0, 1);
    const spAge = personAge(L, sp);
    if (spAge < 65) {
      const working = sp.sex === 'M' ? R.chance(0.94) : R.chance(0.78);
      if (working) { sp.jobId = drawJob(W, R, L.pref, sp.sex, sp.edu, null, null).id; sp.nonreg = R.chance(nonRegP(W, sp.sex, sp.edu, spAge)); }
    }
    L.family.spouse = sp; L.family.partner = null; L.everMarried = true;
    if (L.marriedAge == null) L.marriedAge = L.age;
    L.home.withParents = false;
    // 名字：夫の氏を選ぶ夫婦の割合（人口動態統計）にしたがう
    const takeHusband = R.chance(W.D.names.husbandSurnameShare);
    let nameNote = '';
    if (L.sex === 'F' && takeHusband) { L.name = { ...L.name, sei: sp.name.sei, seiKana: sp.name.seiKana }; nameNote = `名字が「${sp.name.sei}」に変わりました。`; }
    else if (L.sex === 'M' && !takeHusband) { L.name = { ...L.name, sei: sp.name.sei, seiKana: sp.name.seiKana }; nameNote = `妻の名字「${sp.name.sei}」を名乗ることにしました。`; }
    else if (L.sex === 'F') nameNote = `夫が名字「${L.name.sei}」を名乗ることになりました。`;
    for (const ch of L.family.children) if (ch.alive && personAge(L, ch) < 18) ch.name.sei = L.name.sei;
    log(C, `${sp.name.sei}${sp.name.mei}さんと結婚しました。${nameNote}`, { k: 'family', big: true, note: `結婚した夫婦の約${Math.round(W.D.names.husbandSurnameShare * 1000) / 10}%が夫の名字を選んでいます（人口動態統計 2023年）。` });
    adj(L, 'happy', 10); adj(L, 'social', 5);
  },
};

DEC.kids = {
  cat: 'family',
  build(C, c) {
    const { L, W } = C;
    const n = c.total;
    return { title: n === 0 ? '子どもを持つ？' : 'もうひとり、子どもを？', body: `${L.pref}の合計特殊出生率は${W.pref(L.pref).v.tfr}（全国 ${W.nat.tfr2025}）。`, options: [{ label: n === 0 ? '子どもがほしい' : 'もうひとりほしい', hint: '授かるかどうかは年齢と運しだい' }, { label: '自然にまかせる', hint: '' }, { label: n === 0 ? '子どもは持たない' : 'いまの家族で十分', hint: '' }] };
  },
  auto(C) { return 1; },
  apply(C, c, i) {
    const { L } = C;
    L.flags.kidsWish = [2.2, 1, 0.04][i];
    if (i === 0) log(C, '子どもを持つことについて、パートナーと話し合いました。', { k: 'family' });
  },
};

DEC.keepWorking = {
  cat: 'family',
  build(C) { return { title: '出産のあと、仕事はどうする？', body: '育児休業のあと職場に戻る人が増えていますが、仕事を辞める人もいます。', options: [{ label: '育休をとって仕事に戻る', hint: '収入を保つ · 忙しくなる' }, { label: '仕事を辞めて子育てに専念する', hint: '収入↓ 家族↑' }, { label: 'パートで働く', hint: '収入は下がる' }] }; },
  auto(C) { return C.R.chance(C.W.model.family.motherKeepsWorkingAfterBirth) ? 0 : 1; },
  apply(C, c, i) {
    const { L } = C;
    if (i === 0) log(C, '育児休業をとって、1年後に職場に戻りました。', { k: 'work' });
    if (i === 1) { quitJob(C, '仕事を辞めて、子育てに専念することにしました。'); L.work.homemaker = true; adj(L, 'social', 3); }
    if (i === 2) { L.work.nonreg = true; log(C, 'パートタイムで働くことにしました。', { k: 'work' }); }
  },
};

DEC.crisis = {
  cat: 'family',
  build(C) { const sp = C.L.family.spouse; return { title: '夫婦の間に、すれ違いが続いています', body: `${sp.name.mei}さんとの会話が減り、言い争いが増えました。`, options: [{ label: 'じっくり話し合う', hint: '関係が戻ることもある' }, { label: '離婚する', hint: '' }] }; },
  auto(C) { return C.R.chance(0.72) ? 1 : 0; },
  apply(C, c, i, x) {
    const { L, R } = C;
    const sp = L.family.spouse;
    if (i === 0 && R.chance(x.auto ? 0.3 : 0.65 + (L.stats.social - 50) / 200)) { log(C, `${sp.name.mei}さんと何度も話し合い、少しずつ関係を取り戻しました。`, { k: 'family' }); adj(L, 'social', 3); return; }
    sp.divorced = true; sp.divorcedAt = curYear(L);
    L.family.exSpouses.push(sp); L.family.spouse = null;
    const kids = L.family.children.filter((ch) => ch.alive && personAge(L, ch) < 18);
    let t = `${sp.name.mei}さんと離婚しました。`;
    if (kids.length) {
      const keep = L.sex === 'F' ? R.chance(0.85) : R.chance(0.15);
      for (const ch of kids) ch.withMe = keep;
      t += keep ? '子どもは自分が引き取りました。' : `子どもは${sp.name.mei}さんと暮らすことになりました。`;
    }
    if (L.sex === 'F' && L.name.sei !== L.birthName.sei && R.chance(0.6)) { L.name = { ...L.name, sei: L.birthName.sei, seiKana: L.birthName.seiKana }; t += `名字を「${L.name.sei}」に戻しました。`; }
    log(C, t, { k: 'family', big: true });
    adj(L, 'happy', -10); adj(L, 'social', -5);
    L.flags.dv = false;
  },
};

DEC.house = {
  cat: 'family',
  build(C) { const pf = C.W.pref(C.L.pref); return { title: '家を買う？', body: `${C.L.pref}の持ち家の割合は${pf.v.homeOwnershipRate}%（住宅・土地統計調査）。`, options: [{ label: '住宅ローンで家を買う', hint: '借金↑ 幸福が少し↑' }, { label: '賃貸のまま暮らす', hint: '' }] }; },
  auto(C) { return C.R.chance(0.7) ? 0 : 1; },
  apply(C, c, i) {
    const { L, W } = C;
    if (i === 1) { log(C, 'いまの賃貸に住み続けることにしました。', { k: 'life' }); return; }
    const pf = W.pref(L.pref);
    const price = Math.round((pf.v.rentPer3_3m2 / 5000) * 30000000 * C.R.range(0.75, 1.25));
    const down = Math.min(L.money.savings * 0.5, price * 0.2);
    pay(L, down); L.home.own = true; L.home.mortgage = price - down; L.home.withParents = false;
    log(C, `およそ${yen(price)}の家を買いました。住宅ローンは${yen(L.home.mortgage)}です。`, { k: 'money', big: true });
    adj(L, 'happy', 4);
  },
};

DEC.move = {
  cat: 'big',
  build(C, c) {
    const { L, W, R } = C;
    const dest = moveDest(C, c);
    const title = { transfer: `${dest}への転勤を命じられました`, newjob: `${dest}で働かないかと誘われました`, uturn: `生まれた${dest}に戻る？`, parents: `親の近く、${dest}に戻る？`, life: `${dest}に移り住む？` }[c.why];
    const pf = W.pref(dest);
    return { title, body: `${dest}の平均寿命は 男${pf.v.lifeExpectancyM}歳・女${pf.v.lifeExpectancyF}歳。移り住むと、その県の統計の中で暮らすことになります。`, options: [{ label: '移り住む', hint: c.why === 'transfer' ? '断ると職場での立場が少し苦しくなる' : '' }, { label: 'いまの場所にとどまる', hint: '' }] };
  },
  auto(C, c) { moveDest(C, c); return C.R.chance(c.why === 'transfer' ? 0.85 : 0.6) ? 0 : 1; },
  apply(C, c, i) {
    const { L, R } = C;
    moveDest(C, c);
    if (i === 1) { log(C, `${c.dest}には移らず、${L.pref}にとどまりました。`, { k: 'life' }); if (c.why === 'transfer') adj(L, 'happy', -2); return; }
    const why = { transfer: '転勤', newjob: '転職', uturn: 'Uターン', parents: '親の近くへ', life: '暮らしを変えるため' }[c.why];
    moveTo(C, c.dest, why);
    if (c.why === 'newjob') startJob(C, JOB[jobOffers(C, 1)[0]] || JOB.office, { text: `${c.dest}で新しい仕事を始めました。` });
    if (c.why === 'uturn' && L.work.status !== 'employed' && L.age < 60) jobHunt(C);
  },
};

function moveDest(C, c) {
  const { L, W, R } = C;
  if (!c.dest) c.dest = c.why === 'uturn' ? L.birthPref : c.why === 'parents' ? ([L.family.mother, L.family.father].find((p) => p && p.alive && p.care)?.pref || L.birthPref) : W.drawDestination(R, L.pref);
  if (c.dest === L.pref) c.dest = W.drawDestination(R, L.pref);
  return c.dest;
}

function moveTo(C, dest, why) {
  const { L, W } = C;
  const from = L.pref;
  if (dest === from) return;
  L.moved.push({ age: L.age, from, to: dest, why });
  L.pref = dest;
  if (L.family.spouse && L.family.spouse.alive) L.family.spouse.pref = dest;
  for (const ch of L.family.children) if (ch.alive && !ch.left) ch.pref = dest;
  log(C, `${from}から${dest}へ移り住みました（${why}）。ここからは${dest}の統計の中で暮らします。`, { k: 'move', big: true });
  adj(L, 'social', -6);
}

DEC.care = {
  cat: 'family',
  build(C, c) {
    const { L } = C;
    const sibs = L.family.siblings.filter((s) => s.alive).length;
    const opts = [{ label: '同居して介護する', hint: '幸福↓ 健康↓ 仕事を減らすことも' }, { label: '近くに通って支える', hint: '時間とお金がかかる' }, { label: '介護施設に入ってもらう', hint: 'お金↓' }];
    if (sibs) opts.push({ label: 'きょうだいに任せる', hint: '人間関係が少し↓' });
    return { title: `${c.who}の介護をどうする？`, body: '介護保険のサービスを使いながら、家族で支え方を決めます。', options: opts };
  },
  auto(C) { return C.R.weighted([[0, 0.25], [1, 0.4], [2, 0.3], [3, C.L.family.siblings.some((s) => s.alive) ? 0.2 : 0]]); },
  apply(C, c, i) {
    const { L, R } = C;
    L.flags.caring = true;
    if (i === 0) { log(C, `${c.who}を家に迎えて、介護を始めました。`, { k: 'family', big: true }); adj(L, 'happy', -6); adj(L, 'health', -3); if (L.work.status === 'employed' && R.chance(0.15)) quitJob(C, '介護のために仕事を辞めました。'); }
    if (i === 1) { log(C, `週末ごとに${c.who}のもとへ通うようになりました。`, { k: 'family' }); adj(L, 'happy', -3); pay(L, 300000); }
    if (i === 2) { log(C, `${c.who}は介護施設に入りました。`, { k: 'family' }); pay(L, 1500000); adj(L, 'happy', -2); }
    if (i === 3) { log(C, `${c.who}の介護は、きょうだいが中心になって担うことになりました。`, { k: 'family' }); adj(L, 'social', -3); }
  },
};

DEC.smoke = {
  cat: 'small',
  build(C) { return { title: 'タバコをすすめられました', body: `習慣的に喫煙する人は 男性${C.W.nat.health2024.smoking.M}%・女性${C.W.nat.health2024.smoking.F}%（国民健康・栄養調査 2024）。`, options: [{ label: '吸ってみる', hint: '健康↓' }, { label: '断る', hint: '' }] }; },
  auto(C) { return C.R.chance(C.L.sex === 'M' ? 0.62 : 0.4) ? 0 : 1; },
  apply(C, c, i) { const { L } = C; if (i === 0) { L.health.smoker = true; L.health.everSmoked = true; log(C, 'タバコを吸うようになりました。', { k: 'health' }); } else log(C, 'タバコは断りました。', { k: 'health' }); },
};
DEC.quitSmoke = {
  cat: 'small',
  build(C) { return { title: '禁煙する？', options: [{ label: '禁煙外来に通う', hint: '健康↑ お金が少し↓' }, { label: 'このまま吸い続ける', hint: '' }] }; },
  auto(C) { return C.R.chance(0.75) ? 0 : 1; },
  apply(C, c, i) { const { L, R } = C; if (i === 0) { if (R.chance(0.6)) { L.health.smoker = false; log(C, 'タバコをやめました。', { k: 'health' }); adj(L, 'health', 3); } else log(C, '禁煙に挑みましたが、また吸いはじめてしまいました。', { k: 'health' }); } },
};
DEC.treatAddiction = {
  cat: 'big',
  build(C, c) { return { title: '専門の治療を受ける？', body: '依存症は治療や自助グループで回復をめざせる病気です。', options: [{ label: '専門の病院に相談する', hint: '回復の可能性↑' }, { label: '自分でなんとかする', hint: '' }] }; },
  auto(C) { return C.R.chance(0.45) ? 0 : 1; },
  apply(C, c, i) {
    const { L, R } = C;
    const k = c.kind;
    if (R.chance(i === 0 ? 0.6 : 0.15)) { L.health[k] = false; log(C, i === 0 ? '治療と自助グループに通い、少しずつ回復していきました。' : 'なんとか自分の力で踏みとどまりました。', { k: 'health' }); adj(L, 'happy', 5); }
    else log(C, 'やめようとしましたが、うまくいきませんでした。', { k: 'health' });
  },
};
DEC.treatMental = {
  cat: 'big',
  build(C) { return { title: 'こころの不調、どうする？', options: [{ label: '休職して治療に専念する', hint: '回復↑ 収入↓' }, { label: '通院しながら続ける', hint: '' }, { label: '誰にも言わずにがんばる', hint: '' }] }; },
  auto(C) { return C.R.weighted([[0, 0.3], [1, 0.45], [2, 0.25]]); },
  apply(C, c, i) {
    const { L, R } = C;
    const d = L.health.conditions.depression;
    if (R.chance([0.75, 0.55, 0.2][i])) { d.treated = true; log(C, '時間はかかりましたが、少しずつ眠れるようになり、気持ちが戻ってきました。', { k: 'health' }); adj(L, 'happy', 8); }
    else log(C, 'つらい日々が続きました。', { k: 'health', h: 'mental' });
    if (i === 0 && L.work.status === 'employed') pay(L, 800000);
  },
};
DEC.cancer = {
  cat: 'big',
  build(C) { return { title: '治療の方針を決める', body: 'がんの5年相対生存率は、部位や進み具合によって大きく変わります。', options: [{ label: '標準治療を受ける', hint: '多くの人が選ぶ' }, { label: 'セカンドオピニオンを聞いてから決める', hint: '' }, { label: '積極的な治療は受けない', hint: '' }] }; },
  auto(C) { return C.R.weighted([[0, 0.8], [1, 0.15], [2, 0.05]]); },
  apply(C, c, i) {
    const { L, R } = C;
    const cs = L.health.conditions.cancer;
    const cureP = [0.62, 0.64, 0.3][i] * (L.age < 70 ? 1.1 : 0.85);
    if (i === 2) { log(C, '積極的な治療は受けず、痛みを和らげながら暮らすことにしました。', { k: 'health' }); cs.untreated = true; return; }
    log(C, i === 1 ? '別の病院の意見も聞いたうえで、治療を始めました。' : '手術と薬の治療を受けました。', { k: 'health' });
    pay(L, 400000);
    if (R.chance(cureP)) { cs.cured = true; adj(L, 'health', 8); log(C, '治療はうまくいきました。', { k: 'health' }); }
  },
};
DEC.dv = {
  cat: 'big',
  build(C) { return { title: 'どうする？', body: '暴力はあなたのせいではありません。相談できる場所があります。', options: [{ label: '相談窓口に連絡する', hint: '' }, { label: '家を出る', hint: '' }, { label: 'いまはがまんする', hint: '' }] }; },
  auto(C) { return C.R.weighted([[0, 0.35], [1, 0.2], [2, 0.45]]); },
  apply(C, c, i) {
    const { L, R } = C;
    if (i === 0) { log(C, '相談窓口に連絡し、支援を受けながら今後を考えることにしました。', { k: 'heavy' }); if (R.chance(0.5)) offer(C, 'crisis'); }
    if (i === 1) { log(C, '家を出て、別々に暮らすことにしました。', { k: 'heavy', big: true }); const sp = L.family.spouse; sp.divorced = true; L.family.exSpouses.push(sp); L.family.spouse = null; L.flags.dv = false; }
    if (i === 2) { adj(L, 'happy', -5); }
  },
};
DEC.invest = {
  cat: 'small',
  build(C) { return { title: '貯金の一部を、積立投資にまわす？', body: '投資信託などで長く積み立てると、値動きはありますが、増えることも減ることもあります。', options: [{ label: '毎年少しずつ積み立てる', hint: 'お金が増えるかもしれない · 減ることも' }, { label: '預金のままにしておく', hint: '' }] }; },
  auto(C) { return C.R.chance(0.35) ? 0 : 1; },
  apply(C, c, i) { const { L } = C; L.money.investOn = i === 0; log(C, i === 0 ? '積立投資を始めました。' : '貯金は預金のままにしておくことにしました。', { k: 'money' }); },
};
DEC.hobby = {
  cat: 'small',
  build(C, c) { if (!c.opts) c.opts = C.R.shuffle(HOBBIES).slice(0, 3); return { title: '時間があるとき、何をしよう？', options: [...c.opts.map((h) => ({ label: h, hint: '幸福↑' })), { label: '特に何もしない', hint: '' }] }; },
  auto(C, c) { c.opts = C.R.shuffle(HOBBIES).slice(0, 3); return C.R.int(0, 3); },
  apply(C, c, i) { const { L } = C; const o = c.opts || HOBBIES; if (i < 3) { L.hobby = o[i]; log(C, `${o[i]}を始めました。`, { k: 'life' }); adj(L, 'happy', 3); } },
};
DEC.license = {
  cat: 'small',
  build(C) { return { title: '運転免許を返納する？', body: '高齢になると、運転をやめるかどうか家族と話し合う人が増えます。', options: [{ label: '返納する', hint: '暮らしは少し不便に' }, { label: 'まだ運転を続ける', hint: '' }] }; },
  auto(C) { return C.R.chance(0.45) ? 0 : 1; },
  apply(C, c, i) { log(C, i === 0 ? '運転免許を返納しました。' : 'もう少し運転を続けることにしました。', { k: 'life' }); },
};
DEC.will = {
  cat: 'small',
  build(C) { return { title: '遺言書を書いておく？', options: [{ label: '書いておく', hint: '' }, { label: 'まだいい', hint: '' }] }; },
  auto(C) { return C.R.chance(0.2) ? 0 : 1; },
  apply(C, c, i) { if (i === 0) log(C, '遺言書を書き、家族あての手紙も添えました。', { k: 'life' }); },
};
DEC.seniorHome = {
  cat: 'family',
  build(C) { return { title: 'これからの暮らしをどこで？', options: [{ label: '住み慣れた家で暮らす', hint: '在宅の介護サービスを使う' }, { label: '子どもの家の近くへ', hint: '' }, { label: '高齢者施設に入る', hint: 'お金↓ 安心↑' }] }; },
  auto(C) { return C.R.weighted([[0, 0.55], [1, C.L.family.children.length ? 0.2 : 0], [2, 0.25]]); },
  apply(C, c, i) {
    const { L } = C;
    if (i === 0) log(C, '住み慣れた家で暮らし続けることにしました。', { k: 'life' });
    if (i === 1) log(C, '子どもの家の近くに移り、顔を合わせる日が増えました。', { k: 'life' });
    if (i === 2) { log(C, '高齢者施設に入りました。', { k: 'life', big: true }); pay(L, 3000000); }
  },
};

// ================================================================ 誕生
function birthLog(W, R, L, out) {
  const C = { W, L, R, out };
  const F = L.family;
  const pf = W.pref(L.birthPref);
  const ma = personAge(L, F.mother);
  const parents = F.father ? `母${F.mother.name.mei}（${ma}歳）と父${F.father.name.mei}（${personAge(L, F.father)}歳）` : `母${F.mother.name.mei}（${ma}歳）`;
  const order = L.birthOrder === 0 ? '第一子' : `${ordinalChild(L.birthOrder)}`;
  log(C, `${L.startYear}年${L.birthMonth}月、${L.birthPref}で${parents}のもとに、${order}の${L.sex === 'M' ? '男の子' : '女の子'}として生まれました。`, { k: 'birth', big: true });
  log(C, `名前は${L.name.sei}${L.name.mei}（${L.name.seiKana} ${L.name.meiKana}）。${QUINTILE[L.household.quintile]}に生まれました。`, { k: 'birth', note: '暮らし向きは、親の仕事と収入から見た全国の家計の中での位置（5段階）です。' });
}

// ================================================================ まとめ
export function summarize(W, L) {
  const F = L.family;
  const lived = [...new Set([L.birthPref, ...L.moved.map((m) => m.to)])];
  return {
    name: `${L.name.sei}${L.name.mei}`, birthName: `${L.birthName.sei}${L.birthName.mei}`,
    sex: L.sex, birthPref: L.birthPref, lastPref: L.pref, lived,
    years: `${L.startYear}–${L.deathYear ?? curYear(L)}`, age: L.deathAge ?? L.age,
    cause: L.deathCause ? W.causeLabel(L.deathCause) : null,
    edu: EDU_LABEL[L.edu.level] || '中学校',
    job: L.work.title || (L.work.everWorked ? '' : '働く前に'), firstJob: L.work.firstJob?.title,
    children: F.children.length, childrenLost: F.children.filter((c) => !c.alive).length,
    married: !!(F.spouse || F.exSpouses.length), grandkids: L.grandkids || 0,
    maxIncome: L.maxIncome || null, decisions: L.decisions, focusYears: L.focusYears,
    quintile: L.wealthAtBirth,
  };
}

export { JOB, curYear, personAge };
