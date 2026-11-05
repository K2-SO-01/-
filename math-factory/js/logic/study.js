/* 数学ファクトリー：受験対策（弱点リスト・復習モード） */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, Qs = MF.Questions;
  const S = {};
  // 弱点の復習間隔：正解するたびに段階が上がり、3段階クリアで「卒業」
  S.WEAK_STEPS_MS = [0, 10 * 60 * 1000, 24 * 3600 * 1000];
  S.GRADUATE_AT = 3;
  S.WEAK_MAX = 300;

  S.weakKey = (w) => w.topic + ':' + w.level + ':' + w.seed;
  S.addWeak = function (s, topic, level, seed, now) {
    const list = s.study.weak;
    const key = topic + ':' + level + ':' + seed;
    const ex = list.find((w) => S.weakKey(w) === key);
    if (ex) { ex.stage = 0; ex.due = now; ex.miss++; return ex; }
    const q = Qs.generate(topic, level, seed);
    const w = { topic, level, seed, kind: q.kind, added: now, due: now, stage: 0, miss: 1, tries: 0 };
    list.push(w);
    if (list.length > S.WEAK_MAX) list.splice(0, list.length - S.WEAK_MAX);
    return w;
  };
  S.dueWeak = function (s, now) { return s.study.weak.filter((w) => w.due <= now); };
  S.weakCountByTopic = function (s) {
    const out = {};
    for (const w of s.study.weak) out[w.topic] = (out[w.topic] || 0) + 1;
    return out;
  };
  /** 復習で次に出す弱点（期限が来たもの優先、なければ古いもの） */
  S.nextReview = function (s, now, exclude) {
    const list = s.study.weak.filter((w) => !exclude || !exclude.has(S.weakKey(w)));
    if (!list.length) return null;
    const due = list.filter((w) => w.due <= now);
    const pool = due.length ? due : list;
    pool.sort((a, b) => a.due - b.due || b.miss - a.miss);
    return pool[0];
  };
  /** 復習の1問を出題する（同じ問題を同じシードで再生成） */
  S.startReview = function (s, now, w) {
    return G.Quiz.next(s, now, { topic: w.topic, level: w.level, seed: w.seed, mode: 'review', source: 'weak' });
  };
  function onReviewResult(s, d) {
    const key = d.topic + ':' + d.level + ':' + d.seed;
    const idx = s.study.weak.findIndex((w) => S.weakKey(w) === key);
    if (idx < 0) return;
    const w = s.study.weak[idx];
    w.tries++;
    if (d.ok && d.pure) {
      w.stage++;
      if (w.stage >= S.GRADUATE_AT) {
        s.study.weak.splice(idx, 1);
        s.study.graduated++;
        G.notice(s, { type: 'good', text: '🎓 弱点を1つ卒業！（' + Qs.TOPICS[w.topic].name + '）' });
        G.emit(s, 'graduate', { topic: w.topic });
      } else {
        w.due = d.now + S.WEAK_STEPS_MS[w.stage];
      }
    } else {
      w.stage = 0; w.due = d.now; w.miss++;
    }
  }

  G.on('answer', (s, d) => {
    if (d.source === 'weak' || d.mode === 'review') { if (d.first) onReviewResult(s, d); return; }
    if (!d.first) return;
    if (!d.ok || !d.pure) {
      if (d.mode !== 'exam' || d.ok === false) S.addWeak(s, d.topic, d.level, d.seed, d.now);
    }
  });
  // 弱点が多い分野は、おまかせ出題で少し出やすくする
  G.topicWeighters.push((s, t) => {
    const n = s.study.weak.filter((w) => w.topic === t).length;
    return Math.min(1.5, n * 0.15);
  });

  // =====================================================================
  //  間隔反復（分野ごと）：正解するたびに次に出すまでの間隔を 1→3→7→14→30日 とのばす。
  //  期限（忘れかけたころ）が来た分野は、おまかせ出題で優先して出る。
  // =====================================================================
  S.SRS_DAYS = [0, 1, 3, 7, 14, 30];
  S.srsOf = function (s, t) { return s.study.srs[t] || (s.study.srs[t] = { stage: 0, due: 0, last: 0 }); };
  S.srsUpdate = function (s, t, ok, now) {
    const r = S.srsOf(s, t);
    const wasDue = now >= r.due;
    if (ok) { if (wasDue || r.stage === 0) r.stage = Math.min(S.SRS_DAYS.length - 1, r.stage + 1); r.due = now + S.SRS_DAYS[r.stage] * 86400000; }
    else { r.stage = Math.max(0, r.stage - 2); r.due = now + 10 * 60 * 1000; }
    r.last = now;
  };
  S.dueTopics = function (s, now) { return G.availableTopics(s).filter((t) => { const r = s.study.srs[t]; return r && r.last && now >= r.due; }); };
  G.topicWeighters.push((s, t, now) => { const r = s.study.srs[t]; if (!r || !r.last) return 0.6; return now >= r.due ? 2.5 : 0; });

  // =====================================================================
  //  模試モード
  // =====================================================================
  S.EXAM_KINDS = {
    short: { name: 'ミニ模試', n: 10, seconds: 15 * 60 },
    full: { name: '本番模試', n: 20, seconds: 35 * 60 },
  };
  S.EXPECT = [0.75, 0.55, 0.38]; // 受験生全体の想定正答率（易・普・難）
  S.examCreate = function (s, now, kind) {
    const K = S.EXAM_KINDS[kind] || S.EXAM_KINDS.short;
    const topics = G.availableTopics(s);
    const items = [];
    const order = U.rng(U.newSeed(s)).shuffle(topics);
    for (let i = 0; i < K.n; i++) {
      const topic = order[i % order.length];
      const level = U.rand(s) < 0.6 ? 1 : 2;
      items.push({ topic, level, seed: U.newSeed(s), ok: null, ms: 0 });
    }
    s.study.exam = { kind, name: K.name, n: K.n, seconds: K.seconds, items, idx: 0, startedAt: now, deadline: now + K.seconds * 1000 };
    return s.study.exam;
  };
  S.examNext = function (s, now) {
    const ex = s.study.exam;
    if (!ex || ex.idx >= ex.items.length || now > ex.deadline) return null;
    const it = ex.items[ex.idx];
    return G.Quiz.next(s, now, { topic: it.topic, level: it.level, seed: it.seed, mode: 'exam', source: 'exam' });
  };
  S.examRecord = function (s, ok, ms) {
    const ex = s.study.exam;
    if (!ex || ex.idx >= ex.items.length) return;
    const it = ex.items[ex.idx];
    it.ok = !!ok; it.ms = ms || 0;
    ex.idx++;
  };
  /** 採点。点数（100点満点）、偏差値っぽい評価、ランク、分野別の結果 */
  S.examScore = function (items, n) {
    const per = 100 / n;
    let score = 0, expect = 0;
    const byTopic = {};
    items.forEach((it) => {
      const w = per * (it.level === 2 ? 1.25 : 0.85);
      const b = byTopic[it.topic] = byTopic[it.topic] || { n: 0, ok: 0 };
      b.n++;
      if (it.ok) { score += w; b.ok++; }
      expect += w * S.EXPECT[it.level];
    });
    const maxW = items.reduce((a, it) => a + per * (it.level === 2 ? 1.25 : 0.85), 0);
    score = Math.round(score / maxW * 100);
    expect = expect / maxW * 100;
    const dev = Math.round(U.clamp(50 + 10 * (score - expect) / 18, 25, 80) * 10) / 10;
    const rank = dev >= 68 ? 'S' : dev >= 60 ? 'A' : dev >= 54 ? 'B' : dev >= 47 ? 'C' : dev >= 40 ? 'D' : 'E';
    return { score, dev, rank, byTopic, expect: Math.round(expect) };
  };
  S.examFinish = function (s, now) {
    const ex = s.study.exam;
    if (!ex) return null;
    for (let i = ex.idx; i < ex.items.length; i++) ex.items[i].ok = false;
    const r = S.examScore(ex.items, ex.n);
    const res = Object.assign({ date: U.dateStr(now), at: now, kind: ex.kind, name: ex.name, answered: ex.idx, n: ex.n, timeSec: Math.round((Math.min(now, ex.deadline) - ex.startedAt) / 1000) }, r);
    s.study.exams.push(res);
    if (s.study.exams.length > 50) s.study.exams.shift();
    s.study.exam = null;
    s.rp += Math.round(r.score / 2);
    G.emit(s, 'exam', res);
    return res;
  };

  // =====================================================================
  //  週ごとの成長レポート
  // =====================================================================
  function sumDays(s, fromDi, toDi) {
    const out = { a: 0, c: 0, days: 0, t: {} };
    for (const k of Object.keys(s.stats.days)) {
      const [y, m, d] = k.split('-').map(Number);
      const di = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
      if (di < fromDi || di > toDi) continue;
      const v = s.stats.days[k];
      out.a += v.a; out.c += v.c; if (v.a) out.days++;
      for (const t of Object.keys(v.t || {})) { const x = out.t[t] = out.t[t] || [0, 0]; x[0] += v.t[t][0]; x[1] += v.t[t][1]; }
    }
    return out;
  }
  S.weekRange = function (now, back) {
    const di = U.dayIndex(now);
    const dow = (new Date(now).getDay() + 6) % 7; // 月曜=0
    const start = di - dow - 7 * (back || 0);
    return [start, start + 6];
  };
  S.weeklyReport = function (s, now) {
    const [a0, a1] = S.weekRange(now, 0), [b0, b1] = S.weekRange(now, 1);
    const cur = sumDays(s, a0, a1), prev = sumDays(s, b0, b1);
    const acc = (x) => (x.a ? x.c / x.a : null);
    const topics = Object.keys(Object.assign({}, cur.t, prev.t));
    const rows = topics.map((t) => { const c = cur.t[t] || [0, 0], p = prev.t[t] || [0, 0]; return { topic: t, n: c[0], acc: c[0] ? c[1] / c[0] : null, prevAcc: p[0] ? p[1] / p[0] : null }; });
    const weak = rows.filter((r) => r.n >= 3 && r.acc !== null).sort((x, y) => x.acc - y.acc).slice(0, 2);
    const improved = rows.filter((r) => r.acc !== null && r.prevAcc !== null && r.n >= 3).sort((x, y) => (y.acc - y.prevAcc) - (x.acc - x.prevAcc))[0] || null;
    const untouched = G.availableTopics(s).filter((t) => !(cur.t[t] && cur.t[t][0]));
    const exams = s.study.exams.filter((e) => { const di = U.dayIndex(e.at); return di >= a0 && di <= a1; });
    return { from: a0, to: a1, cur: { a: cur.a, c: cur.c, acc: acc(cur), days: cur.days }, prev: { a: prev.a, c: prev.c, acc: acc(prev), days: prev.days }, rows, weak, improved, untouched, exams };
  };

  // =====================================================================
  //  試験日カウントダウンとおすすめ学習メニュー
  // =====================================================================
  S.daysLeft = function (s, now) {
    if (!s.study.examDate) return null;
    const [y, m, d] = s.study.examDate.split('-').map(Number);
    const target = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    return target - U.dayIndex(now);
  };
  S.weakestTopics = function (s, n) {
    return G.availableTopics(s).map((t) => { const b = s.stats.byTopic[t] || { a: 0, c: 0 }; return { t, acc: b.a ? (b.c + 1) / (b.a + 2) : 0.5, a: b.a }; })
      .sort((x, y) => x.acc - y.acc).slice(0, n || 2).map((x) => x.t);
  };
  S.plan = function (s, now) {
    const left = S.daysLeft(s, now);
    const weak = S.weakestTopics(s, 2);
    const due = S.dueTopics(s, now);
    let phase, goal, items;
    if (left === null) { phase = { name: '試験日を設定しよう', desc: '本番の日を入れると、残り日数に合わせたメニューを出すよ。' }; goal = 20; items = [{ k: 'quiz', label: 'おまかせで20問', topic: 'auto', n: 20 }, { k: 'review', label: '弱点リストの復習' }]; }
    else if (left < 0) { phase = { name: '試験おつかれさま！', desc: '結果はどうだった？ 次の目標の日付を入れてもいいね。' }; goal = 10; items = [{ k: 'quiz', label: '気楽におまかせ10問', topic: 'auto', n: 10 }]; }
    else if (left <= 7) { phase = { name: '総仕上げ', desc: '新しいことより、解ける問題を確実に。睡眠をしっかりとって体調を整えよう。' }; goal = 15; items = [{ k: 'review', label: '弱点の最終チェック' }, { k: 'exam', kind: 'short', label: 'ミニ模試で本番のリズム確認' }, { k: 'quiz', label: '得意分野で自信をつける', topic: S.weakestTopics(s, 7).slice(-1)[0], n: 5 }]; }
    else if (left <= 30) { phase = { name: '直前期', desc: '本番形式に慣れる時期。模試を2日に1回、まちがえた問題は必ず復習。' }; goal = 30; items = [{ k: 'exam', kind: 'full', label: '本番模試（20問・35分）' }, { k: 'review', label: '弱点リストを空にする' }].concat(weak.map((t) => ({ k: 'quiz', label: '苦手の' + Qs.TOPICS[t].name + 'を5問', topic: t, n: 5 }))); }
    else if (left <= 90) { phase = { name: '実戦期', desc: '「普」〜「難」で得点力をのばす。模試は週2回。' }; goal = 35; items = weak.map((t) => ({ k: 'quiz', label: '苦手の' + Qs.TOPICS[t].name + 'を8問', topic: t, n: 8 })).concat([{ k: 'exam', kind: 'full', label: '本番模試（週2回）' }, { k: 'review', label: '弱点リストの復習' }]); }
    else if (left <= 180) { phase = { name: '実力養成期', desc: '苦手分野を毎日少しずつ。模試で現在地を確認しよう（週1回）。' }; goal = 30; items = weak.map((t) => ({ k: 'quiz', label: '苦手の' + Qs.TOPICS[t].name + 'を5問', topic: t, n: 5 })).concat([{ k: 'exam', kind: 'short', label: 'ミニ模試（週1回）' }, { k: 'quiz', label: 'おまかせ15問', topic: 'auto', n: 15 }]); }
    else { phase = { name: '基礎固め期', desc: '全分野をまんべんなく。「易」〜「普」を確実に解けるように。' }; goal = 20; items = [{ k: 'quiz', label: 'おまかせ20問（全分野まんべんなく）', topic: 'auto', n: 20 }, { k: 'review', label: '弱点リストの復習' }, { k: 'exam', kind: 'short', label: 'ミニ模試（2週に1回）' }]; }
    if (due.length && left !== null && left >= 0) items.unshift({ k: 'quiz', label: '忘れかけの' + Qs.TOPICS[due[0]].name + 'を復習', topic: due[0], n: 5 });
    return { left, phase, goal, items, weak, due };
  };

  G.on('answer', (s, d) => {
    if (!d.first) return;
    if (d.mode === 'battle' && !d.ok) { S.srsUpdate(s, d.topic, false, d.now); return; }
    S.srsUpdate(s, d.topic, d.ok && d.pure !== false, d.now || Date.now());
  });

  G.register({
    id: 'study',
    init(s) { s.study = { weak: [], graduated: 0, srs: {}, exams: [], exam: null, examDate: null, examName: '本番', lastReportWeek: null }; },
  });
  MF.Study = S;
})(globalThis.MF = globalThis.MF || {});
