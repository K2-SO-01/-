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
