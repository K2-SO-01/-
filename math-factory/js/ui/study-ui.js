/* 数学ファクトリー：受験対策画面（弱点リスト・復習モード ほか） */
(function (MF) {
  'use strict';
  const UI = MF.UI, G = MF.Game, U = MF.Util, Qs = MF.Questions, S = MF.Study;
  const h = UI.h;
  const StudyUI = { tabs: [], tab: 'weak' };
  MF.StudyUI = StudyUI;

  StudyUI.startReview = function (topicFilter) {
    const s = UI.state;
    const served = new Set();
    const sum = { n: 0, ok: 0, grad0: s.study.graduated };
    MF.QuizUI.startSession({
      mode: 'review', title: '🔁 復習モード' + (topicFilter ? '（' + Qs.TOPICS[topicFilter].name + '）' : ''),
      status: () => '弱点 ' + s.study.weak.length + ' 問・期限切れ ' + S.dueWeak(s, Date.now()).length + ' 問',
      next: (st) => {
        let w = null;
        const now = Date.now();
        const pool = st.study.weak.filter((x) => !served.has(S.weakKey(x)) && (!topicFilter || x.topic === topicFilter));
        if (pool.length) { pool.sort((a, b) => a.due - b.due || b.miss - a.miss); w = pool[0]; }
        if (!w) return null;
        served.add(S.weakKey(w));
        return S.startReview(st, now, w);
      },
      onDone: (st, res) => { sum.n++; if (res.ok && res.attempt === 1) sum.ok++; },
      onEnd: (st) => {
        UI.go('study');
        if (sum.n) UI.modal({ title: '復習おつかれさま！', body: h('div', {}, h('p', {}, sum.n + ' 問中 ' + sum.ok + ' 問を1回で正解。'), h('p', {}, '卒業した弱点：' + (st.study.graduated - sum.grad0) + ' 問'), h('p', { class: 'muted small' }, '正解した問題は時間をおいてもう一度出るよ（10分後→1日後）。3回クリアで卒業！')), buttons: [{ label: 'OK', cls: 'primary' }] });
      },
    });
  };

  StudyUI.tabs.push({
    id: 'weak', label: '弱点リスト',
    render(box, s) {
      const now = Date.now();
      const due = S.dueWeak(s, now).length;
      box.appendChild(UI.section('弱点リスト',
        h('p', { class: 'small' }, '間違えた問題・ヒントを見た問題がここにたまるよ。復習モードで正解すると段階が進み、3回クリアで「卒業」。'),
        h('div', { class: 'row' },
          h('span', {}, '弱点 ', h('b', {}, s.study.weak.length), ' 問　期限切れ ', h('b', { class: due ? 'warn' : '' }, due), ' 問　卒業 ', h('b', { class: 'good' }, s.study.graduated), ' 問'),
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn primary', disabled: !s.study.weak.length, onclick: () => StudyUI.startReview() }, '🔁 復習スタート'))));
      if (!s.study.weak.length) { box.appendChild(h('div', { class: 'empty' }, 'まだ弱点はないよ。どんどん解こう！')); return; }
      const byT = {};
      s.study.weak.forEach((w) => { (byT[w.topic] = byT[w.topic] || []).push(w); });
      Object.keys(byT).sort((a, b) => byT[b].length - byT[a].length).forEach((t) => {
        const list = byT[t].slice().sort((a, b) => a.due - b.due);
        const card = UI.section(null,
          h('div', { class: 'row' }, h('b', {}, Qs.TOPICS[t].name), h('span', { class: 'badge' }, list.length + ' 問'), h('span', { class: 'spacer' }),
            h('button', { class: 'btn small', onclick: () => StudyUI.startReview(t) }, 'この分野だけ復習')));
        const ul = h('div', { class: 'weak-list' });
        list.slice(0, 12).forEach((w) => {
          const q = Qs.generate(w.topic, w.level, w.seed);
          const dueTxt = w.due <= now ? '<span class="warn">復習どき</span>' : 'あと ' + U.fmtTime((w.due - now) / 1000);
          ul.appendChild(h('div', { class: 'weak-item' },
            h('div', { class: 'weak-q', html: q.text }),
            h('div', { class: 'weak-meta small muted', html: Qs.LEVEL_NAMES[w.level] + '・ミス ' + w.miss + ' 回・段階 ' + '●'.repeat(w.stage) + '○'.repeat(S.GRADUATE_AT - w.stage) + '・' + dueTxt })));
        });
        if (list.length > 12) ul.appendChild(h('div', { class: 'muted small' }, 'ほか ' + (list.length - 12) + ' 問'));
        card.appendChild(ul);
        box.appendChild(card);
      });
    },
  });

  UI.screen('study', {
    title: '受験対策', short: '受験', icon: '📚', nav: 'main', navOrder: 6,
    sig: (s) => [StudyUI.tab, s.study.weak.length, S.dueWeak(s, Date.now()).length, s.study.graduated, s.study.exams.length, !!s.study.exam, StudyUI.tab === 'stats' || StudyUI.tab === 'report' ? s.stats.answered : 0].join('|'),
    badge: (s) => { const n = S.dueWeak(s, Date.now()).length; return n ? String(Math.min(99, n)) : null; },
    render(root, s, params) {
      if (params && params.tab) StudyUI.tab = params.tab;
      root.appendChild(h('h2', { class: 'screen-title' }, '受験対策'));
      const tabs = h('div', { class: 'tabs' });
      StudyUI.tabs.forEach((t) => tabs.appendChild(h('button', { class: 'tab' + (StudyUI.tab === t.id ? ' on' : ''), onclick: () => { StudyUI.tab = t.id; UI.params = {}; UI.rerender(); } }, t.label)));
      root.appendChild(tabs);
      const box = h('div', { class: 'tab-body' });
      root.appendChild(box);
      const t = StudyUI.tabs.find((x) => x.id === StudyUI.tab) || StudyUI.tabs[0];
      t.render(box, s);
    },
  });
})(globalThis.MF = globalThis.MF || {});
/* ---- ステップ8：模試・成長レポート・カウントダウン ---- */
(function (MF) {
  'use strict';
  const UI = MF.UI, G = MF.Game, U = MF.Util, Qs = MF.Questions, S = MF.Study, StudyUI = MF.StudyUI;
  const h = UI.h;
  const pct = (v) => (v === null || v === undefined ? '-' : Math.round(v * 100) + '%');

  // ---------- 模試 ----------
  StudyUI.runExam = function () {
    const s = UI.state;
    const ex = s.study.exam;
    if (!ex) return;
    MF.QuizUI.startSession({
      mode: 'exam', title: '📝 ' + ex.name, allowHints: false, oneShot: true,
      status: () => { const e = s.study.exam; return e ? Math.min(e.idx + 1, e.n) + ' / ' + e.n + ' 問・のこり ' + U.fmtClock((e.deadline - Date.now()) / 1000) : ''; },
      next: (st) => S.examNext(st, Date.now()),
      onDone: (st, res) => S.examRecord(st, res.ok && res.attempt === 1, res.ms),
      tick: (st) => {
        const e = st.study.exam;
        if (!e) return;
        const el = document.getElementById('session-status');
        if (el) el.textContent = Math.min(e.idx + 1, e.n) + ' / ' + e.n + ' 問・のこり ' + U.fmtClock((e.deadline - Date.now()) / 1000);
        if (Date.now() > e.deadline) { UI.toast('⏰ 時間切れ！', 'warn'); MF.QuizUI.endSession(true); }
      },
      onEnd: (st) => { const r = S.examFinish(st, Date.now()); UI.go('study', { tab: 'exam' }); if (r) StudyUI.examResult(r); },
    });
  };
  StudyUI.startExam = function (kind) {
    const s = UI.state;
    const K = S.EXAM_KINDS[kind];
    UI.confirm('📝 ' + K.name, K.n + ' 問・制限時間 ' + Math.round(K.seconds / 60) + ' 分。いろいろな分野から「普」「難」が出る。ヒントなし・やり直しなし。始めると時間が動きだすよ。準備はいい？', 'はじめる', () => {
      S.examCreate(s, Date.now(), kind);
      if (MF.Audio) MF.Audio.play('alarm');
      StudyUI.runExam();
    });
  };
  StudyUI.examResult = function (r) {
    const rows = Object.keys(r.byTopic).map((t) => h('tr', {}, h('td', {}, Qs.TOPICS[t].name), h('td', {}, r.byTopic[t].ok + ' / ' + r.byTopic[t].n)));
    const weak = Object.keys(r.byTopic).filter((t) => r.byTopic[t].ok < r.byTopic[t].n).map((t) => Qs.TOPICS[t].name);
    UI.modal({ title: '📝 ' + r.name + ' の結果', body: h('div', { class: 'exam-res' },
      h('div', { class: 'tiles' }, MF.MetaUI.tile('得点', r.score + ' 点'), MF.MetaUI.tile('偏差値（目安）', r.dev), MF.MetaUI.tile('評価', r.rank), MF.MetaUI.tile('時間', U.fmtTime(r.timeSec))),
      h('p', { class: 'small muted' }, '偏差値は「易・普・難」それぞれの想定正答率をもとにした目安です（平均点の目安 ' + r.expect + ' 点）。'),
      h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, '分野'), h('th', {}, '正解')), rows),
      weak.length ? h('p', {}, 'まちがえた問題は弱点リストに入ったよ。特に ', h('b', {}, weak.slice(0, 3).join('・')), ' を復習しよう。') : h('p', { class: 'good' }, '全問正解！ すばらしい！')),
    buttons: [{ label: '弱点を復習', action: () => StudyUI.startReview() }, { label: '閉じる', cls: 'primary' }] });
    if (MF.Audio) MF.Audio.play(r.rank === 'S' || r.rank === 'A' ? 'victory' : 'click');
  };
  StudyUI.tabs.splice(1, 0, {
    id: 'exam', label: '模試', render(box, s) {
      if (s.study.exam) {
        const e = s.study.exam;
        box.appendChild(UI.section('📝 ' + e.name + '（受験中）', h('p', {}, e.idx + ' / ' + e.n + ' 問 解答済み・のこり ' + U.fmtClock((e.deadline - Date.now()) / 1000)),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => StudyUI.runExam() }, 'つづける'), h('button', { class: 'btn ghost', onclick: () => { const r = S.examFinish(s, Date.now()); UI.rerender(); if (r) StudyUI.examResult(r); } }, 'ここで終了して採点'))));
        return;
      }
      box.appendChild(UI.section('📝 模試モード', h('p', { class: 'small' }, '本番形式で、制限時間内に複数分野の問題を連続で解く。点数と偏差値っぽい評価が出るよ。'),
        h('div', { class: 'exam-kinds' }, Object.keys(S.EXAM_KINDS).map((k) => { const K = S.EXAM_KINDS[k]; return h('button', { class: 'node-btn', onclick: () => StudyUI.startExam(k) }, h('span', { class: 'node-ico' }, k === 'full' ? '📘' : '📗'), h('b', {}, K.name), h('span', { class: 'tiny muted' }, K.n + '問・' + Math.round(K.seconds / 60) + '分')); }))));
      const ex = s.study.exams.slice().reverse();
      if (!ex.length) return;
      const last10 = ex.slice(0, 10).reverse();
      box.appendChild(UI.section('これまでの成績（得点）', MF.Charts.line(last10.map((e, i) => ({ label: e.date.slice(5).replace('-', '/'), v: e.score / 100, title: e.date + ' ' + e.name + '：' + e.score + '点・偏差値' + e.dev + '・' + e.rank })), { label: '模試の得点の推移' })));
      box.appendChild(h('table', { class: 'tbl' }, h('tr', {}, ['日付', '種類', '得点', '偏差値', '評価'].map((x) => h('th', {}, x))), ex.slice(0, 15).map((e) => h('tr', {}, h('td', {}, e.date), h('td', {}, e.name), h('td', {}, e.score), h('td', {}, e.dev), h('td', {}, e.rank)))));
    },
  });

  // ---------- 成長レポート ----------
  StudyUI.tabs.push({
    id: 'report', label: '週間レポート', render(box, s) {
      const r = S.weeklyReport(s, Date.now());
      const fmt = (di) => { const d = new Date(di * 86400000); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
      const diffA = r.cur.a - r.prev.a;
      const diffAcc = r.cur.acc !== null && r.prev.acc !== null ? r.cur.acc - r.prev.acc : null;
      box.appendChild(h('p', { class: 'small muted' }, '今週（' + fmt(r.from) + '〜' + fmt(r.to) + '）と先週のくらべ'));
      box.appendChild(h('div', { class: 'tiles' },
        MF.MetaUI.tile('解いた問題', r.cur.a + ' 問'), MF.MetaUI.tile('先週から', (diffA >= 0 ? '+' : '') + diffA + ' 問'),
        MF.MetaUI.tile('正答率', pct(r.cur.acc)), MF.MetaUI.tile('正答率の変化', diffAcc === null ? '-' : (diffAcc >= 0 ? '+' : '') + Math.round(diffAcc * 100) + 'pt'),
        MF.MetaUI.tile('勉強した日', r.cur.days + ' / 7 日')));
      const msgs = [];
      if (!r.cur.a) msgs.push('今週はまだ問題を解いていないよ。まずは5問から始めよう！');
      if (diffA > 0) msgs.push('先週より ' + diffA + ' 問多く解いた！ いい調子！');
      if (r.improved && r.improved.acc - r.improved.prevAcc > 0.05) msgs.push('いちばん伸びたのは ' + Qs.TOPICS[r.improved.topic].name + '（' + pct(r.improved.prevAcc) + '→' + pct(r.improved.acc) + '）。');
      if (r.weak.length) msgs.push('苦手は ' + r.weak.map((w) => Qs.TOPICS[w.topic].name + '（' + pct(w.acc) + '）').join('・') + '。来週は重点的に！');
      if (r.untouched.length && r.cur.a) msgs.push('今週まだ解いていない分野：' + r.untouched.map((t) => Qs.TOPICS[t].name).join('・'));
      if (r.exams.length) msgs.push('模試 ' + r.exams.length + ' 回（最高 ' + Math.max(...r.exams.map((e) => e.score)) + ' 点）。');
      box.appendChild(UI.section('ナビのひとこと', h('ul', { class: 'small' }, msgs.map((m) => h('li', {}, m)))));
      if (r.rows.length) box.appendChild(UI.section('分野別', h('table', { class: 'tbl' }, h('tr', {}, ['分野', '今週', '正答率', '先週', '変化'].map((x) => h('th', {}, x))),
        r.rows.map((x) => h('tr', {}, h('td', {}, Qs.TOPICS[x.topic].name), h('td', {}, x.n + '問'), h('td', {}, pct(x.acc)), h('td', {}, pct(x.prevAcc)),
          h('td', { class: x.acc !== null && x.prevAcc !== null ? (x.acc >= x.prevAcc ? 'good' : 'bad') : '' }, x.acc !== null && x.prevAcc !== null ? (x.acc >= x.prevAcc ? '▲' : '▼') + Math.abs(Math.round((x.acc - x.prevAcc) * 100)) + 'pt' : '-'))))));
    },
  });

  // ---------- カウントダウンとおすすめメニュー ----------
  StudyUI.startMenu = function (item) {
    const s = UI.state;
    if (item.k === 'review') { if (s.study.weak.length) StudyUI.startReview(); else UI.toast('弱点リストは空っぽ！ 他のメニューへ', 'good'); return; }
    if (item.k === 'exam') { StudyUI.startExam(item.kind); return; }
    let served = 0, ok = 0;
    MF.QuizUI.startSession({
      mode: 'normal', title: '📋 ' + item.label, status: () => served + ' / ' + item.n + ' 問',
      next: (st) => { if (served >= item.n) return null; served++; return G.Quiz.next(st, Date.now(), item.topic && item.topic !== 'auto' ? { topic: item.topic } : {}); },
      onDone: (st, res) => { if (res.ok && res.attempt === 1) ok++; },
      onEnd: () => { UI.go('study', { tab: 'plan' }); UI.toast('メニュー完了！ ' + item.n + ' 問中 ' + ok + ' 問を1回で正解', 'good', 4000); },
    });
  };
  StudyUI.tabs.push({
    id: 'plan', label: 'カウントダウン', render(box, s) {
      const now = Date.now();
      const p = S.plan(s, now);
      const date = h('input', { type: 'date', value: s.study.examDate || '', onchange: (e) => { s.study.examDate = e.target.value || null; UI.rerender(); } });
      const name = h('input', { class: 'text-in', value: s.study.examName || '本番', maxlength: 16, onchange: (e) => { s.study.examName = e.target.value.trim() || '本番'; UI.rerender(); } });
      box.appendChild(UI.section('📅 試験日', h('div', { class: 'row' }, h('label', { class: 'small' }, '試験の名前 ', name), h('label', { class: 'small' }, '日付 ', date))));
      if (p.left !== null && p.left >= 0) box.appendChild(h('div', { class: 'countdown' }, h('span', { class: 'cd-name' }, (s.study.examName || '本番') + ' まで'), h('span', { class: 'cd-days' }, p.left === 0 ? '今日！' : 'あと ' + p.left + ' 日')));
      box.appendChild(UI.section('🗺️ いまの時期：' + p.phase.name, h('p', { class: 'small' }, p.phase.desc),
        h('p', { class: 'small' }, 'おすすめの1日の目標：', h('b', {}, p.goal + ' 問'), s.meta.dailyGoal !== p.goal ? h('button', { class: 'btn small', style: { marginLeft: '.5rem' }, onclick: () => { s.meta.dailyGoal = p.goal; UI.toast('1日の目標を ' + p.goal + ' 問にしたよ', 'good'); UI.rerender(); } }, 'この目標にする') : h('span', { class: 'good' }, '（設定ずみ）')),
        h('div', { class: 'menu-items' }, p.items.map((it) => h('button', { class: 'menu-item', onclick: () => StudyUI.startMenu(it) }, h('span', {}, { quiz: '✏️', review: '🔁', exam: '📝' }[it.k]), h('span', {}, it.label), h('span', { class: 'muted' }, '▶'))))));
      const due = S.dueTopics(s, now);
      box.appendChild(UI.section('🧠 間隔反復', h('p', { class: 'small' }, '正解した分野は 1日→3日→7日→14日→30日 と間をあけて、忘れかけたころにもう一度出題されるよ。'),
        h('div', { class: 'chip-wrap' }, G.availableTopics(s).map((t) => {
          const r = s.study.srs[t];
          const st = !r || !r.last ? 'まだ' : now >= r.due ? '復習どき' : 'あと' + Math.ceil((r.due - now) / 86400000) + '日';
          return h('span', { class: 'chip' + (due.indexOf(t) >= 0 ? ' due' : '') }, Qs.TOPICS[t].name + '：' + st + (r && r.stage ? '（段階' + r.stage + '）' : ''));
        }))));
    },
  });

  // ヘッダーに「本番まであと○日」
  UI.headerExtras.push((s) => {
    const left = S.daysLeft(s, Date.now());
    if (left === null || left < 0) return null;
    return h('button', { class: 'cd-chip', onclick: () => UI.go('study', { tab: 'plan' }) }, '📅 ' + (left === 0 ? '本番当日' : left + '日'));
  });
  // 新しい週になったら成長レポートを知らせる
  MF.App.bootHooks.push((s) => {
    const wk = U.weekKey(Date.now());
    if (s.study.lastReportWeek === null) { s.study.lastReportWeek = wk; return; }
    if (s.study.lastReportWeek !== wk) { s.study.lastReportWeek = wk; setTimeout(() => UI.toast('📈 新しい週になったよ。「受験」→「週間レポート」で先週の成長を見てみよう', 'info', 6000), 2500); }
  });
})(globalThis.MF = globalThis.MF || {});
