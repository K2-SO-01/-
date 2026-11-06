/* 数学ファクトリー：銀河マップ・外交・ロケット打ち上げ・ランダムイベント */
(function (MF) {
  'use strict';
  const UI = MF.UI, GX = MF.Galaxy, G = MF.Game, U = MF.Util, Qs = MF.Questions, F = MF.Factory, FUI = MF.FactoryUI, B = MF.Balance;
  const h = UI.h;
  const GUI = { sel: null };
  MF.GalaxyUI = GUI;
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };
  const ownerColor = (s, o) => (o === 'player' ? '#b6ff3b' : o ? GX.empById[o].color : '#5a6270');
  const ownerName = (o) => (o === 'player' ? 'あなた' : o ? GX.empById[o].name : '無所属');

  GUI.launch = function () {
    const s = UI.state;
    const r = GX.launch(s, Date.now());
    if (!r.ok) { UI.toast(r.reason, 'warn'); return; }
    sfx('launch');
    if (MF.FX && MF.FX.launch) MF.FX.launch();
    if (r.first) { if (MF.StoryUI && MF.StoryUI.ending) setTimeout(() => MF.StoryUI.ending(), 1600); else UI.toast('🚀 星を脱出した！ 銀河マップが開いた', 'good', 5000); }
    else UI.toast('🚀 コロニー船を打ち上げた！ 銀河マップで植民先をえらぼう', 'good', 4000);
    setTimeout(() => UI.go('galaxy'), r.first ? 200 : 400);
  };

  // ---------- 発射台（工場） ----------
  FUI.paletteOrder.push('silo');
  FUI.infoExtras.push((s, b, box) => {
    if (b.type !== 'silo') return;
    const need = GX.partsNeeded(s), have = GX.partsHave(s);
    box.appendChild(h('div', { class: 'silo-box' }, h('div', { class: 'small' }, s.galaxy.unlocked ? 'コロニー船：ロケット部品 ' + need + ' 個で打ち上げ（いま船 ' + s.galaxy.ships + ' 隻）' : '脱出ロケット：ロケット部品 ' + need + ' 個で打ち上げ'),
      UI.bar(Math.min(have, need), need, 'blue', '部品 ' + have + ' / ' + need),
      GX.partsReady(s) ? UI.bar(Math.min(s.galaxy.fuel || 0, GX.fuelNeeded(s)), GX.fuelNeeded(s), 'red', '燃料 ' + Math.floor(s.galaxy.fuel || 0) + ' / ' + GX.fuelNeeded(s) + '（正解で充填・難は2）') : h('div', { class: 'tiny muted' }, '部品がそろったら、問題に正解して燃料を充填する'),
      h('button', { class: 'btn primary', disabled: !GX.canLaunch(s), onclick: () => GUI.launch() }, '🚀 打ち上げ')));
  });

  // ---------- 銀河マップ ----------
  function mapSvg(s) {
    const g = s.galaxy;
    const parts = ['<svg viewBox="0 0 100 100" class="gx-map" role="img" aria-label="銀河マップ">'];
    parts.push('<rect width="100" height="100" fill="#000"/>');
    // 星（小さな点）
    const r = U.rng(7); for (let i = 0; i < 60; i++) { const sz = r.next() < 0.15 ? 0.6 : 0.35; parts.push('<rect x="' + (r.next() * 100).toFixed(1) + '" y="' + (r.next() * 100).toFixed(1) + '" width="' + sz + '" height="' + sz + '" fill="' + (r.next() < 0.5 ? '#e3ffb0' : '#4c7520') + '" opacity="' + (r.next() * 0.6 + 0.3).toFixed(2) + '"/>'); }
    g.lanes.forEach((l) => { const [a, b] = l.split('-').map(Number); const A = g.systems[a], Bs = g.systems[b]; parts.push('<line x1="' + A.x + '" y1="' + A.y + '" x2="' + Bs.x + '" y2="' + Bs.y + '" class="lane"/>'); });
    const PL = ['..####..', '.#h####.', '#h######', '########', '########', '######d#', '.####dd.', '..####..'];
    g.systems.forEach((p) => {
      const col = ownerColor(s, p.owner);
      const sel = GUI.sel === p.id;
      const sz = p.home ? 5.6 : 4.4, half = sz / 2;
      const pc = p.home ? '#ffd23b' : (p.color || '#888');
      const planet = MF.Sprite.svg(PL, { '#': pc, h: MF.Sprite.shade(pc, 0.25), d: MF.Sprite.shade(pc, -0.3) }, sz, 'gx-planet').replace('<svg ', '<svg x="' + (p.x - half) + '" y="' + (p.y - half) + '" ');
      const corner = (k) => { const e = 5, L = 1.6, w = 0.45, X = p.x, Y = p.y; return ['M' + (X - e) + ' ' + (Y - e) + 'h' + L + 'v' + w + 'h' + (w - L) + 'v' + (L - w) + 'h' + (-w) + 'z', 'M' + (X + e) + ' ' + (Y - e) + 'h' + (-L) + 'v' + w + 'h' + (L - w) + 'v' + (L - w) + 'h' + w + 'z', 'M' + (X - e) + ' ' + (Y + e) + 'h' + L + 'v' + (-w) + 'h' + (w - L) + 'v' + (w - L) + 'h' + (-w) + 'z', 'M' + (X + e) + ' ' + (Y + e) + 'h' + (-L) + 'v' + (-w) + 'h' + (L - w) + 'v' + (w - L) + 'h' + w + 'z'][k]; };
      parts.push('<g class="sys" data-id="' + p.id + '">' +
        '<rect x="' + (p.x - 6) + '" y="' + (p.y - 6) + '" width="12" height="12" fill="transparent"/>' +
        (p.owner ? '<rect x="' + (p.x - 4) + '" y="' + (p.y - 4) + '" width="8" height="8" fill="' + col + '" opacity=".16"/><rect x="' + (p.x - 4) + '" y="' + (p.y - 4) + '" width="8" height="8" fill="none" stroke="' + col + '" stroke-width=".4"/>' : '') +
        planet +
        (sel ? '<path d="' + [0, 1, 2, 3].map(corner).join('') + '" fill="#dcff9a"/>' : '') +
        (p.capital ? MF.Px.svgAt('crown', p.x - 1.6, p.y - 7.4, 3.2, '#ffd23b') : '') +
        (g.focus === p.id ? MF.Px.svgAt('bookopen', p.x + 3, p.y - 6, 3.2, '#e3ffb0') : '') +
        (g.incoming && g.incoming.target === p.id ? MF.Px.svgAt('warn', p.x - 6.4, p.y - 6, 3.4, '#ff5a3c') : '') +
        '<text x="' + p.x + '" y="' + (p.y + 7.2) + '" text-anchor="middle" class="sys-name">' + U.esc(p.name) + '</text></g>');
    });
    parts.push('</svg>');
    const el = h('div', { class: 'gx-wrap', html: parts.join('') });
    el.addEventListener('click', (e) => { const gEl = e.target.closest('.sys'); if (gEl) { GUI.sel = +gEl.dataset.id; sfx('click'); UI.rerender(); } });
    return el;
  }
  function sysCard(s, p) {
    const g = s.galaxy;
    const box = UI.section((p.home ? '🏠 ' : '🪐 ') + p.name + '（' + (p.home ? 'ふるさと' : p.typeName) + '）');
    box.appendChild(h('div', { class: 'small' }, '勢力：', h('b', { style: { color: ownerColor(s, p.owner) } }, ownerName(p.owner)), p.capital ? '（首都）' : ''));
    box.appendChild(h('div', { class: 'small' }, '出る問題：' + p.topics.map((t) => Qs.TOPICS[t].name).join('・')));
    if (!p.home) box.appendChild(h('div', { class: 'small' }, 'とれる資源：', UI.itemChip(p.resource, null), ' 豊かさ ' + '★'.repeat(p.richness)));
    const row = h('div', { class: 'row', style: { marginTop: '.4rem' } });
    if (!p.owner) {
      const c = GX.canColonize(s, p.id);
      row.appendChild(h('button', { class: 'btn primary', disabled: !c.ok, title: c.reason || '', onclick: () => { const r = GX.colonize(s, p.id, Date.now()); if (r.ok) { sfx('levelup'); UI.toast('🏳️ ' + p.name + ' に植民した！', 'good', 3500); } else UI.toast(r.reason, 'warn'); UI.rerender(); } }, '🏳️ 植民する'));
      if (!c.ok) row.appendChild(h('span', { class: 'tiny muted' }, c.reason));
    } else if (p.owner === 'player') {
      if (!p.home) row.appendChild(h('button', { class: 'btn ' + (g.focus === p.id ? 'primary' : ''), onclick: () => { GX.setFocus(s, g.focus === p.id ? null : p.id); UI.toast(g.focus === p.id ? p.name + ' で勉強する！ おまかせ出題がこの星の分野になる' : 'ふるさとにもどった', 'info'); UI.rerender(); } }, g.focus === p.id ? '📖 この星で勉強中（解除）' : '📖 この星で勉強する'));
      if (g.incoming && g.incoming.target === p.id) row.appendChild(h('button', { class: 'btn danger', onclick: () => { GX.defend(s); MF.BattleUI.intro = true; UI.go('battle'); } }, '⚔️ 迎撃する'));
    } else {
      const plan = GX.attackPlan(s, p.id);
      if (plan) row.appendChild(h('button', { class: 'btn danger', onclick: () => UI.confirm('攻撃', p.name + ' に攻めこむ？（カードバトル。勝てば星を奪える）', '攻撃！', () => { GX.attack(s, p.id); MF.BattleUI.intro = true; UI.go('battle'); }, 'danger') }, '⚔️ 攻撃する'));
      else row.appendChild(h('span', { class: 'tiny muted' }, s.galaxy.empires[p.owner].stance === 'war' ? 'となりの星からしか攻撃できない' : '戦争中の帝国の星だけ攻撃できる'));
    }
    box.appendChild(row);
    return box;
  }
  function empireCard(s, E) {
    const e = s.galaxy.empires[E.id];
    const n = GX.owned(s, E.id).length;
    const rel = Math.round(e.rel);
    const btn = (label, act, cls) => h('button', { class: 'btn small ' + (cls || ''), onclick: () => { const r = GX.diplo(s, E.id, act, Date.now()); UI.toast(r.ok ? r.text : r.reason, r.ok ? 'good' : 'warn', 3500); if (r.ok) sfx(act === 'war' ? 'alarm' : 'click'); UI.rerender(); } }, label);
    return h('div', { class: 'emp', style: { borderColor: E.color } },
      h('div', { class: 'row' }, h('span', { class: 'emp-dot', style: { background: E.color } }), h('b', {}, E.name), h('span', { class: 'badge' + (e.stance === 'war' ? ' bad-b' : e.stance === 'alliance' ? ' good' : '') }, GX.STANCE[e.stance]), e.trade ? h('span', { class: 'badge' }, '🤝交易') : null),
      h('div', { class: 'tiny muted' }, E.desc),
      h('div', { class: 'small' }, '星 ' + n + ' 個・軍事力 ' + Math.round(e.strength)),
      h('div', { class: 'rel-row small' }, '関係 ', h('span', { class: 'rel-bar' }, h('span', { class: 'rel-fill', style: { left: rel < 0 ? (50 + rel / 2) + '%' : '50%', width: Math.abs(rel) / 2 + '%', background: rel < 0 ? 'var(--bad)' : 'var(--good)' } })), h('b', {}, (rel > 0 ? '+' : '') + rel)),
      h('div', { class: 'row' },
        e.stance !== 'war' ? btn(e.trade ? '交易をやめる' : '🤝 交易（研究P30）', 'trade') : null,
        e.stance !== 'war' ? btn(e.stance === 'alliance' ? '同盟を解消' : '🛡️ 同盟', 'alliance') : null,
        e.stance !== 'war' ? btn('🎁 贈り物', 'gift', 'ghost') : null,
        e.stance === 'war' ? btn('🕊️ 和平（研究P60）', 'peace') : btn('⚔️ 宣戦布告', 'war', 'danger ghost')));
  }
  UI.screen('galaxy', {
    title: '銀河', icon: '🌌', nav: 'more', navOrder: 6,
    sig: (s) => { const g = s.galaxy; return [g.unlocked, g.ships, g.turn, !!g.incoming, Math.floor(g.fuel || 0), GX.partsHave(s), GX.canLaunch(s), g.unlocked ? GX.owned(s, 'player').length : 0, MF.Research.has(s, 'rocketry'), !!GX.silo(s)].join('|'); },
    badge: (s) => (s.galaxy.incoming ? '!' : s.galaxy.ships > 0 ? '🚀' : null),
    render(root, s) {
      const g = s.galaxy;
      root.appendChild(h('h2', { class: 'screen-title' }, '銀河'));
      if (!g.unlocked) {
        const R = MF.Research;
        const has = R.has(s, 'rocketry'), silo = !!GX.silo(s), parts = GX.partsHave(s), need = GX.partsNeeded(s);
        root.appendChild(UI.section('🚀 この星を脱出しよう', h('p', { class: 'small' }, '宇宙船を修理してロケットを打ち上げれば、銀河へ飛び出せる。そこには新しい分野の問題と資源、そしてライバルの帝国が待っている。'),
          h('ul', { class: 'checklist' },
            h('li', { class: has ? 'ok' : '' }, (has ? '✅' : '⬜') + ' 研究「ロケット工学」を完了する'),
            h('li', { class: silo ? 'ok' : '' }, (silo ? '✅' : '⬜') + ' 工場に「ロケット発射台」を建てる'),
            h('li', { class: parts >= need ? 'ok' : '' }, (parts >= need ? '✅' : '⬜') + ' ロケット部品を ' + need + ' 個そろえる（いま ' + parts + ' 個）'),
            h('li', { class: GX.canLaunch(s) ? 'ok' : '' }, (GX.canLaunch(s) ? '✅' : '⬜') + ' 燃料を充填する：部品がそろったあと、問題に ' + GX.fuelNeeded(s) + ' 問正解（いま ' + Math.floor(s.galaxy.fuel || 0) + '、「難」は2問ぶん）')),
          UI.bar(Math.min(parts, need), need, 'blue', '部品 ' + parts + ' / ' + need),
          GX.partsReady(s) ? UI.bar(Math.min(s.galaxy.fuel || 0, GX.fuelNeeded(s)), GX.fuelNeeded(s), 'red', '燃料 ' + Math.floor(s.galaxy.fuel || 0) + ' / ' + GX.fuelNeeded(s)) : null,
          h('p', { class: 'tiny muted' }, 'ロケット部品 = 演算チップ3 + 燃料棒1 + レンガ5 + 歯車4（組立機）。発射台にベルトで運ぶか、持ち物に入れておけばOK。'),
          h('button', { class: 'btn primary big-btn', disabled: !GX.canLaunch(s), onclick: () => GUI.launch() }, '🚀 打ち上げ！')));
        return;
      }
      if (g.incoming) { const t = GX.sys(s, g.incoming.target); root.appendChild(h('div', { class: 'card raid-alert' }, h('b', {}, '⚠️ ' + GX.empById[g.incoming.owner].name + ' の艦隊が ' + t.name + ' を攻撃中！'), h('button', { class: 'btn danger', style: { marginLeft: '.6rem' }, onclick: () => { GX.defend(s); MF.BattleUI.intro = true; UI.go('battle'); } }, '⚔️ 迎撃する'))); }
      const mine = GX.owned(s, 'player').length;
      root.appendChild(h('div', { class: 'row small' }, h('span', {}, '🪐 あなたの星 ', h('b', {}, mine), ' / ' + g.systems.length), h('span', {}, '🚀 コロニー船 ', h('b', {}, g.ships)),
        h('span', {}, 'ターン ' + g.turn), h('span', { class: 'muted' }, '（帝国は問題を解いたり時間がたつと動く）'),
        h('button', { class: 'btn small', disabled: !GX.canLaunch(s), onclick: () => GUI.launch() }, '🚀 コロニー船を打ち上げ（部品' + GX.partsHave(s) + '/' + GX.partsNeeded(s) + '）')));
      const layout = h('div', { class: 'gx-layout' });
      layout.appendChild(mapSvg(s));
      const side = h('div', { class: 'gx-side' });
      if (GUI.sel === null || !g.systems[GUI.sel]) GUI.sel = g.home;
      side.appendChild(sysCard(s, g.systems[GUI.sel]));
      side.appendChild(h('div', { class: 'legend small' }, h('span', {}, h('i', { style: { background: '#b6ff3b' } }), 'あなた'), GX.EMPIRES.map((E) => h('span', {}, h('i', { style: { background: E.color } }), E.name)), h('span', {}, h('i', { style: { background: '#5a6270' } }), '無所属')));
      layout.appendChild(side);
      root.appendChild(layout);
      root.appendChild(h('h3', { class: 'tier-title' }, 'ライバル帝国'));
      root.appendChild(h('div', { class: 'emp-grid' }, GX.EMPIRES.map((E) => empireCard(s, E))));
      root.appendChild(h('details', { class: 'card' }, h('summary', {}, '📜 銀河のできごと'), h('div', { class: 'small' }, (g.log || []).slice().reverse().map((t) => h('div', {}, t)))));
    },
  });
  // 惑星で勉強中のお知らせ（出題画面）
  MF.QuizUI.extraTop.push((s) => {
    const g = s.galaxy;
    if (!g.unlocked || g.focus === null || g.focus === undefined) return null;
    const p = GX.sys(s, g.focus);
    return h('div', { class: 'mini-banner planet' }, '🪐 ' + p.name + ' で勉強中：' + p.topics.map((t) => Qs.TOPICS[t].name).join('・') + '（' + G.ITEMS[p.resource].name + 'も手に入る）', h('button', { class: 'btn small ghost', style: { marginLeft: '.4rem' }, onclick: () => { GX.setFocus(s, null); UI.rerender(); } }, '解除'));
  });

  // ---------- ランダムイベント ----------
  GUI.showEvent = function () {
    const s = UI.state;
    const pe = s.galaxy.event;
    if (!pe) return;
    const ev = GX.evById[pe.id];
    // 問題を出したことのある選択肢があれば、ほかの問題つき選択肢はえらべない（引き直し防止）
    const locked = (i) => ev.choices[i].quiz && pe.quiz && pe.quiz.choice !== i;
    const body = h('div', {}, h('p', {}, ev.text), pe.quiz ? h('p', { class: 'small muted' }, '✏️ さっきの問題の続きから答えられるよ') : null, h('div', { class: 'ev-choices' }, ev.choices.map((ch, i) => h('button', { class: 'menu-item', disabled: locked(i), onclick: () => { close(); choose(i); } },
      h('span', {}, ch.quiz ? '✏️' : '👉'), h('span', {}, ch.label, ch.cost ? h('span', { class: 'tiny muted block' }, '必要：' + G.costText(ch.cost)) : null, ch.quiz ? h('span', { class: 'tiny muted block' }, '正解：' + ch.ok.text.split('！')[0] + ' ／ 不正解：' + ch.ng.text.split('…')[0]) : null), h('span', {}, '▶')))));
    const close = UI.modal({ title: ev.title, body, buttons: [{ label: 'あとで決める', cls: 'ghost' }] });
    function choose(i) {
      const ch = ev.choices[i];
      if (ch.cost && !G.has(s, ch.cost)) { UI.toast('資源が足りない：' + G.costText(ch.cost), 'warn'); return; }
      if (!ch.quiz) return finish(i, false);
      const q = GX.eventQuestion(s, i);
      if (!q) return;
      if (q.answered) return finish(i, q.answered.ok); // 答えたあとで読み直していた
      const holder = h('div', {});
      let res = null, done = false;
      const c2 = UI.modal({ title: ev.title, body: holder, noClose: true, cls: 'q-modal' });
      const panel = MF.QuizUI.createPanel(holder, { compact: true, allowHints: false, allowSkip: false, oneShot: true, autoNext: 900, nextLabel: 'つづける ▶', onDone: (r) => { res = r; },
        next: () => { if (done) return null; done = true; panel.destroy(); c2(); finish(i, !!(res && res.ok && res.attempt === 1)); return null; } });
      panel.load(G.Quiz.next(s, Date.now(), q));
    }
    function finish(i, ok) {
      const r = GX.chooseEvent(s, i, ok, Date.now());
      if (!r) return;
      if (!r.ok) { UI.toast(r.reason, 'warn'); return; }
      UI.modal({ title: ev.title, body: h('p', {}, r.text), buttons: [{ label: 'OK', cls: 'primary' }] });
      sfx(ok ? 'correct' : 'click');
      UI.rerender();
    }
  };
  UI.headerExtras.push((s) => (s.galaxy.event ? h('button', { class: 'event-chip', onclick: () => GUI.showEvent() }, '❗イベント') : null));
  UI.noticeHandlers.event = (n) => { UI.toast(n.text, 'info', 5000); sfx('event'); return true; };
})(globalThis.MF = globalThis.MF || {});
