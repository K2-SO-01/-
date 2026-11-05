/* 数学ファクトリー：ゲームの中心（状態・アイテム・出題と採点・モジュールのつなぎ）
 * 画面には一切さわらない。時刻(now)と乱数はすべて引数／状態から受け取るので、自動テストやシミュレーションから呼べる。 */
(function (MF) {
  'use strict';
  const U = MF.Util, B = MF.Balance, Qs = MF.Questions;
  const G = {};
  G.VERSION = 1;

  // ---------- アイテム ----------
  G.ITEMS = {
    iron:     { name: '鉄鉱石',     sym: 'Fe', color: '#a9b4c0', raw: true },
    copper:   { name: '銅鉱石',     sym: 'Cu', color: '#e08a4f', raw: true },
    coal:     { name: '石炭',       sym: 'C',  color: '#6b6b78', raw: true },
    stone:    { name: '石材',       sym: '石', color: '#c9b48a', raw: true },
    uranium:  { name: 'ウラン',     sym: 'U',  color: '#7bea5f', raw: true },
    silicon:  { name: 'シリコン',   sym: 'Si', color: '#8fb8e6', raw: true },
    oil:      { name: '石油',       sym: '油', color: '#9b7fd1', raw: true },
    titanium: { name: 'チタン',     sym: 'Ti', color: '#d7dee6', raw: true },
    gold:     { name: '金',         sym: 'Au', color: '#f2cc4a', raw: true },
    crystal:  { name: '量子結晶',   sym: 'Qz', color: '#e08ef5', raw: true },
    helium:   { name: 'ヘリウム3',  sym: 'He', color: '#ff9ab8', raw: true },
    ironPlate:   { name: '鉄板',         sym: '▭', color: '#c3ccd6' },
    copperPlate: { name: '銅板',         sym: '▭', color: '#f0a06a' },
    brick:       { name: 'レンガ',       sym: '▦', color: '#c46a4a' },
    wafer:       { name: 'ウェハ',       sym: '◎', color: '#a7cdf5' },
    gear:        { name: '歯車',         sym: '⚙', color: '#d0d6dc' },
    circuit:     { name: '電子回路',     sym: '▣', color: '#5fd36a' },
    plastic:     { name: 'プラスチック', sym: '◇', color: '#e8e8f0' },
    sciencePack: { name: '研究パック',   sym: '⚗', color: '#ff6b6b' },
    chip:        { name: '演算チップ',   sym: '▤', color: '#39d0ff' },
    fuelCell:    { name: '燃料棒',       sym: '▮', color: '#9cff6b' },
    ammo:        { name: '弾薬',         sym: '◆', color: '#ffb02e' },
    rocketPart:  { name: 'ロケット部品', sym: '▲', color: '#ffffff' },
  };
  G.ITEM_IDS = Object.keys(G.ITEMS);

  // ---------- モジュールとフック ----------
  G.modules = [];
  G.register = function (m) { G.modules.push(m); };
  G.hooks = {};
  G.on = function (type, fn) { (G.hooks[type] = G.hooks[type] || []).push(fn); };
  G.emit = function (state, type, data) {
    const list = G.hooks[type];
    if (!list) return;
    for (const fn of list) fn(state, data);
  };
  /** 報酬倍率を各モジュールから集める（研究・相棒・惑星など） */
  G.multipliers = [];
  G.addMultiplier = function (fn) { G.multipliers.push(fn); };
  G.rewardMult = function (state, topic, kind) {
    let m = 1;
    for (const fn of G.multipliers) m *= fn(state, topic, kind) || 1;
    return m;
  };
  /** 出題できる分野（惑星の進出で増える） */
  G.topicProviders = [];
  G.availableTopics = function (state) {
    const set = new Set(Qs.HOME_TOPICS);
    for (const fn of G.topicProviders) for (const t of fn(state) || []) set.add(t);
    return Array.from(set);
  };
  /** おまかせ出題で分野の重みを足すもの（間隔反復・弱点など） */
  G.topicWeighters = [];

  // ---------- 状態 ----------
  G.createState = function (now, seed) {
    const s = {
      version: G.VERSION,
      createdAt: now, lastTick: now, lastSaved: now,
      rngState: (seed === undefined ? (Math.floor(Math.random() * 2147483646) + 1) : seed) | 0,
      inv: {},
      rp: 0,
      quiz: {
        combo: 0, maxCombo: 0, topic: 'auto', levelMode: 'auto', levels: {}, recent: {},
        current: null, lastTopics: [], served: 0,
      },
      stats: { answered: 0, correct: 0, byTopic: {}, days: {}, log: [], timeMs: 0 },
      settings: { sound: true, bgm: true, fontScale: 1, reduceMotion: false, highContrast: false, keypad: 'auto', autoNext: true, volume: 0.6 },
      flags: {},
      runtime: { notices: [], events: [] },
    };
    for (const id of G.ITEM_IDS) s.inv[id] = 0;
    for (const t of Qs.ALL_TOPICS) { s.quiz.levels[t] = 0; s.quiz.recent[t] = []; s.stats.byTopic[t] = { a: 0, c: 0, ms: 0 }; }
    for (const m of G.modules) if (m.init) m.init(s, now);
    return s;
  };
  /** 古いセーブや欠けた項目を補う（将来の項目追加に強くする） */
  G.migrate = function (s, now) {
    const base = G.createState(now, 1);
    function fill(dst, src) {
      for (const k of Object.keys(src)) {
        if (dst[k] === undefined || dst[k] === null && src[k] !== null) dst[k] = U.deepClone(src[k]);
        else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) fill(dst[k], src[k]);
      }
    }
    const keepRng = s.rngState;
    fill(s, base);
    s.rngState = keepRng || base.rngState;
    s.runtime = { notices: [], events: [] };
    for (const m of G.modules) if (m.migrate) m.migrate(s, now);
    s.version = G.VERSION;
    return s;
  };
  G.serialize = function (s) {
    const rt = s.runtime; s.runtime = undefined;
    const out = JSON.stringify(s);
    s.runtime = rt;
    return out;
  };
  G.deserialize = function (json, now) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    if (!s || typeof s !== 'object' || !s.inv || !s.quiz) throw new Error('セーブデータの形式が正しくありません');
    return G.migrate(s, now);
  };
  G.notice = function (s, n) { if (s.runtime) s.runtime.notices.push(n); };
  G.event = function (s, e) { if (s.runtime) s.runtime.events.push(e); };

  // ---------- 持ち物 ----------
  G.add = function (s, item, n) { if (!n) return; s.inv[item] = (s.inv[item] || 0) + n; };
  G.has = function (s, cost, mult) {
    mult = mult || 1;
    for (const k of Object.keys(cost)) {
      const need = Math.ceil(cost[k] * mult);
      if (k === 'rp') { if (s.rp < need) return false; } else if ((s.inv[k] || 0) < need) return false;
    }
    return true;
  };
  G.pay = function (s, cost, mult) {
    mult = mult || 1;
    if (!G.has(s, cost, mult)) return false;
    for (const k of Object.keys(cost)) {
      const need = Math.ceil(cost[k] * mult);
      if (k === 'rp') s.rp -= need; else s.inv[k] -= need;
    }
    return true;
  };
  G.give = function (s, bundle) { for (const k of Object.keys(bundle || {})) { if (k === 'rp') s.rp += bundle[k]; else G.add(s, k, bundle[k]); } };
  G.costText = function (cost, mult) {
    return Object.keys(cost).map((k) => (k === 'rp' ? '研究P' : G.ITEMS[k].name) + ' ' + Math.ceil(cost[k] * (mult || 1))).join('、');
  };

  // ---------- 出題 ----------
  const Quiz = {};
  G.Quiz = Quiz;
  Quiz.comboMult = function (combo) { return 1 + B.quiz.comboStep * Math.min(combo, B.quiz.comboCap); };
  Quiz.levelFor = function (s, topic) {
    const m = s.quiz.levelMode;
    if (m === 'auto') return s.quiz.levels[topic] || 0;
    return U.clamp(m | 0, 0, 2);
  };
  Quiz.pickTopic = function (s, now) {
    const avail = G.availableTopics(s);
    const sel = s.quiz.topic;
    if (sel !== 'auto' && avail.indexOf(sel) >= 0) return sel;
    const last = s.quiz.lastTopics;
    return U.weightedPick(s, avail, (t) => {
      let w = 1;
      for (const fn of G.topicWeighters) w += fn(s, t, now) || 0;
      if (last.length && last[last.length - 1] === t) w *= 0.35;
      if (last.length > 1 && last[last.length - 2] === t) w *= 0.6;
      return w;
    });
  };
  /** 次の問題を出す。opts: {topic, level, seed, mode, source} */
  Quiz.next = function (s, now, opts) {
    opts = opts || {};
    const topic = opts.topic || Quiz.pickTopic(s, now);
    const level = opts.level !== undefined ? opts.level : Quiz.levelFor(s, topic);
    const seed = opts.seed || U.newSeed(s);
    s.quiz.current = { topic, level, seed, attempts: 0, hints: 0, startedAt: now, mode: opts.mode || 'normal', source: opts.source || null, done: false, firstOk: null };
    s.quiz.served++;
    return Qs.generate(topic, level, seed);
  };
  Quiz.currentQuestion = function (s) {
    const c = s.quiz.current;
    return c ? Qs.generate(c.topic, c.level, c.seed) : null;
  };
  /** ヒントを1段階開ける（0→1:ヒント1、→2:ヒント2、→3:完全解説） */
  Quiz.revealHint = function (s, now) {
    const c = s.quiz.current;
    if (!c || c.done) return 0;
    c.hints = Math.min(3, c.hints + 1);
    if (c.hints >= 3) { // 解説を見たら、この問題は終了（未正解なら不正解あつかい）
      if (c.attempts === 0) { c.attempts = 1; recordFirst(s, c, false, now - c.startedAt, now); s.quiz.combo = 0; G.emit(s, 'answer', { topic: c.topic, level: c.level, ok: false, first: true, ms: now - c.startedAt, combo: 0, mode: c.mode, source: c.source, seed: c.seed, now }); }
      c.done = true;
      G.emit(s, 'questionEnd', { topic: c.topic, level: c.level, ok: false, mode: c.mode, source: c.source, seed: c.seed });
    }
    return c.hints;
  };
  function recordFirst(s, c, ok, ms, now) {
    c.firstOk = ok;
    const st = s.stats;
    st.answered++; if (ok) st.correct++;
    const bt = st.byTopic[c.topic] || (st.byTopic[c.topic] = { a: 0, c: 0, ms: 0 });
    bt.a++; if (ok) bt.c++; bt.ms += Math.min(ms, 600000);
    const day = U.dateStr(now);
    const d = st.days[day] || (st.days[day] = { a: 0, c: 0, t: {} });
    d.a++; if (ok) d.c++;
    const dt = d.t[c.topic] || (d.t[c.topic] = [0, 0]);
    dt[0]++; if (ok) dt[1]++;
    st.log.push({ t: now, topic: c.topic, lv: c.level, ok: ok ? 1 : 0, ms: Math.round(ms), mode: c.mode });
    if (st.log.length > 600) st.log.splice(0, st.log.length - 600);
    // 難易度の自動調整
    const rec = s.quiz.recent[c.topic] || (s.quiz.recent[c.topic] = []);
    rec.push(ok ? 1 : 0);
    if (rec.length > B.quiz.autoWindow) rec.shift();
    if (rec.length >= B.quiz.autoMin && c.mode !== 'exam') {
      const acc = rec.reduce((a, b) => a + b, 0) / rec.length;
      const lv = s.quiz.levels[c.topic] || 0;
      if (acc >= B.quiz.autoUp && lv < 2) { s.quiz.levels[c.topic] = lv + 1; s.quiz.recent[c.topic] = []; G.notice(s, { type: 'level', text: Qs.TOPICS[c.topic].name + ' の難易度が「' + Qs.LEVEL_NAMES[lv + 1] + '」に上がった！' }); }
      else if (acc <= B.quiz.autoDown && lv > 0) { s.quiz.levels[c.topic] = lv - 1; s.quiz.recent[c.topic] = []; G.notice(s, { type: 'level', text: Qs.TOPICS[c.topic].name + ' の難易度を「' + Qs.LEVEL_NAMES[lv - 1] + '」に下げたよ。基礎から固めよう' }); }
    }
    s.quiz.lastTopics.push(c.topic);
    if (s.quiz.lastTopics.length > 4) s.quiz.lastTopics.shift();
  }
  Quiz.rewardFor = function (s, c, ms) {
    const lvl = c.level;
    let mult = B.quiz.retryFactor[Math.min(c.attempts - 1, 2)];
    if (c.hints > 0 && c.attempts === 1) mult *= B.quiz.hintFactor;
    let combo = 1;
    if (c.attempts === 1 && c.hints === 0) combo = Quiz.comboMult(s.quiz.combo);
    const speed = (c.attempts === 1 && ms <= B.quiz.speedSec * 1000) ? 1 + B.quiz.speedBonus : 1;
    const extra = G.rewardMult(s, c.topic, 'quiz');
    const amount = Math.max(1, Math.round(B.quiz.baseReward[lvl] * mult * combo * speed * extra));
    const rp = Math.max(c.attempts === 1 ? 1 : 0, Math.round(B.quiz.rpReward[lvl] * mult * G.rewardMult(s, c.topic, 'rp')));
    return { item: Qs.TOPICS[c.topic].resource, amount, rp, combo, speed: speed > 1 };
  };
  /** 解答する。戻り値 {ok, invalid, attempt, reward, combo, done, hintLevel, answer} */
  Quiz.answer = function (s, input, now) {
    const c = s.quiz.current;
    if (!c || c.done) return { ok: false, invalid: true, reason: 'no-question' };
    const q = Qs.generate(c.topic, c.level, c.seed);
    const res = Qs.check(q, input);
    if (res.invalid) return { ok: false, invalid: true, reason: 'parse' };
    c.attempts++;
    const ms = now - c.startedAt;
    const first = c.attempts === 1;
    if (first) recordFirst(s, c, res.ok && c.hints === 0, ms, now);
    const out = { ok: res.ok, invalid: false, attempt: c.attempts, topic: c.topic, level: c.level, ms, answer: Qs.answerText(q) };
    if (res.ok) {
      const pure = first && c.hints === 0;
      if (pure) { s.quiz.combo++; if (s.quiz.combo > s.quiz.maxCombo) s.quiz.maxCombo = s.quiz.combo; }
      const rw = Quiz.rewardFor(s, c, ms);
      G.add(s, rw.item, rw.amount);
      s.rp += rw.rp;
      out.reward = rw;
      c.done = true;
      out.done = true;
      out.combo = s.quiz.combo;
      G.emit(s, 'answer', { topic: c.topic, level: c.level, ok: true, first, pure, ms, combo: s.quiz.combo, mode: c.mode, source: c.source, seed: c.seed, now, reward: rw });
      G.emit(s, 'questionEnd', { topic: c.topic, level: c.level, ok: true, first, pure, mode: c.mode, source: c.source, seed: c.seed, now });
    } else {
      if (first) s.quiz.combo = 0;
      out.combo = s.quiz.combo;
      // 段階的なヒント：1回目の不正解でヒント1、2回目でヒント2、3回目で完全解説
      c.hints = Math.max(c.hints, Math.min(3, c.attempts));
      out.hintLevel = c.hints;
      G.emit(s, 'answer', { topic: c.topic, level: c.level, ok: false, first, ms, combo: 0, mode: c.mode, source: c.source, seed: c.seed, now });
      if (c.hints >= 3) {
        c.done = true; out.done = true;
        G.emit(s, 'questionEnd', { topic: c.topic, level: c.level, ok: false, first, mode: c.mode, source: c.source, seed: c.seed, now });
      }
    }
    return out;
  };
  /** スキップ（まだ答えていなければ不正解として記録） */
  Quiz.skip = function (s, now) {
    const c = s.quiz.current;
    if (!c || c.done) return;
    if (c.attempts === 0) {
      c.attempts = 1;
      recordFirst(s, c, false, now - c.startedAt, now);
      s.quiz.combo = 0;
      G.emit(s, 'answer', { topic: c.topic, level: c.level, ok: false, first: true, skipped: true, ms: now - c.startedAt, combo: 0, mode: c.mode, source: c.source, seed: c.seed, now });
    }
    c.done = true;
    G.emit(s, 'questionEnd', { topic: c.topic, level: c.level, ok: false, mode: c.mode, source: c.source, seed: c.seed, now });
  };
  Quiz.accuracy = function (s, topic) {
    const b = topic ? s.stats.byTopic[topic] : { a: s.stats.answered, c: s.stats.correct };
    return b && b.a ? b.c / b.a : 0;
  };

  // ---------- 時間経過 ----------
  G.tick = function (s, dt, now) {
    if (!(dt > 0)) return;
    for (const m of G.modules) if (m.tick) m.tick(s, dt, now);
    s.lastTick = now;
  };

  MF.Game = G;
})(globalThis.MF = globalThis.MF || {});
