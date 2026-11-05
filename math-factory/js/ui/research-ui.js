/* 数学ファクトリー：研究画面 */
(function (MF) {
  'use strict';
  const UI = MF.UI, R = MF.Research, Qs = MF.Questions, U = MF.Util;
  const h = UI.h;

  function reqRows(s, t, showBtn) {
    const p = s.research.prog[t.id] || {};
    return h('div', { class: 'req-rows' }, Object.keys(t.req).map((k) => {
      const have = Math.min(t.req[k], p[k] || 0);
      return h('div', { class: 'req-row' }, h('span', { class: 'req-name' }, Qs.TOPICS[k].name), UI.bar(have, t.req[k], have >= t.req[k] ? 'green' : 'blue', have + ' / ' + t.req[k]),
        showBtn && have < t.req[k] ? h('button', { class: 'btn small', onclick: () => { s.quiz.topic = k; s.quiz.current = null; UI.go('quiz'); } }, '解く') : null);
    }));
  }
  function techCard(s, t) {
    const st = R.status(s, t.id);
    const card = h('div', { class: 'tech ' + st },
      h('div', { class: 'tech-head' }, h('span', { class: 'tech-ico' }, st === 'locked' ? '🔒' : t.icon), h('b', {}, t.name),
        st === 'done' ? h('span', { class: 'badge good' }, '完了') : st === 'active' ? h('span', { class: 'badge warn' }, '研究中') : null),
      h('div', { class: 'small muted' }, t.desc));
    if (st !== 'done') {
      card.appendChild(h('div', { class: 'tech-cost small' }, (s.research.paid[t.id] ? '✔ 研究P 支払い済み' : '研究P ' + t.rp), '　必要な正解：', Object.keys(t.req).map((k) => Qs.TOPICS[k].name + '×' + t.req[k]).join('、')));
      if (t.pre.length) card.appendChild(h('div', { class: 'tiny muted' }, '前提：' + t.pre.map((p) => (R.has(s, p) ? '✔' : '✖') + R.byId[p].name).join('、')));
      if (st === 'active') card.appendChild(reqRows(s, t, true));
      if (st === 'available') card.appendChild(h('button', { class: 'btn small ' + (s.research.paid[t.id] || s.rp >= t.rp ? 'primary' : ''), disabled: !(s.research.paid[t.id] || s.rp >= t.rp),
        onclick: () => { const r = R.start(s, t.id); if (!r.ok) UI.toast(r.reason, 'warn'); else { UI.toast('研究開始：' + t.name, 'good'); if (MF.Audio) MF.Audio.play('research'); } UI.rerender(); } },
      s.research.current && s.research.current !== t.id ? 'この研究に切り替える' : '研究を始める'));
    }
    return card;
  }
  UI.screen('research', {
    title: '研究ツリー', short: '研究', icon: '🔬', nav: 'main', navOrder: 3,
    badge: (s) => (s.research.current ? null : R.TECHS.some((t) => R.status(s, t.id) === 'available' && s.rp >= t.rp) ? '!' : null),
    render(root, s) {
      root.appendChild(h('h2', { class: 'screen-title' }, '研究ツリー'));
      root.appendChild(h('p', { class: 'small muted' }, '研究ポイント（研究P）を払って研究を始め、指定された分野の問題に正解すると完了。研究Pは正解や研究所でたまる。いま ',
        h('b', { class: 'rp-now' }, Math.floor(s.rp) + ' 研究P'), '・完了 ' + s.research.done.length + ' / ' + R.TECHS.length));
      const cur = s.research.current ? R.byId[s.research.current] : null;
      if (cur) root.appendChild(UI.section('🔬 研究中：' + cur.name, h('div', { class: 'small muted' }, cur.desc), reqRows(s, cur, true)));
      const tiers = {};
      R.TECHS.forEach((t) => { (tiers[t.tier] = tiers[t.tier] || []).push(t); });
      Object.keys(tiers).forEach((k) => {
        root.appendChild(h('h3', { class: 'tier-title' }, '第' + k + '段階'));
        root.appendChild(h('div', { class: 'tech-grid' }, tiers[k].map((t) => techCard(s, t))));
      });
    },
  });
  // 出題画面に、いまの研究の進み具合を出す
  MF.QuizUI.extraTop.push((s) => {
    const id = s.research.current;
    if (!id) return null;
    const t = R.byId[id], p = s.research.prog[id] || {};
    const parts = Object.keys(t.req).map((k) => Qs.TOPICS[k].name + ' ' + Math.min(t.req[k], p[k] || 0) + '/' + t.req[k]);
    return h('button', { class: 'mini-banner', onclick: () => UI.go('research') }, '🔬 ' + t.name + '：' + parts.join('・'));
  });
  UI.noticeHandlers.research = (n) => {
    const t = R.byId[n.id];
    if (MF.Audio) MF.Audio.play('levelup');
    if (MF.FX && MF.FX.banner) MF.FX.banner('研究完了', t ? t.icon + ' ' + t.name : '');
    UI.toast(n.text, 'good', 3500);
    return true;
  };
})(globalThis.MF = globalThis.MF || {});
