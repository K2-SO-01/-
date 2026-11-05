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

  G.register({
    id: 'study',
    init(s) { s.study = { weak: [], graduated: 0 }; },
  });
  MF.Study = S;
})(globalThis.MF = globalThis.MF || {});
