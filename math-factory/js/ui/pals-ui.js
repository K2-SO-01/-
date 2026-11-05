/* 数学ファクトリー：相棒画面（相棒の一覧・卵・図鑑）と、工場での配置 */
(function (MF) {
  'use strict';
  const UI = MF.UI, P = MF.Pals, Art = MF.PalArt, Qs = MF.Questions, F = MF.Factory, FUI = MF.FactoryUI, B = MF.Balance, U = MF.Util;
  const h = UI.h;
  const PUI = { tab: 'list' };
  MF.PalsUI = PUI;
  PUI.skinOf = (s, pal) => (MF.Meta && MF.Meta.palSkin ? MF.Meta.palSkin(s, pal) : null);
  PUI.portrait = (s, pal, size) => h('span', { class: 'pal-portrait', html: Art.svg(pal.sp, { size: size || 72, skin: PUI.skinOf(s, pal) }) });

  function workChips(sp) {
    return h('span', { class: 'work-chips' }, Object.keys(sp.work).map((w) => h('span', { class: 'work-chip', title: P.WORK[w].name }, P.WORK[w].icon + P.WORK[w].name + '★'.repeat(sp.work[w]))));
  }
  function stars(r) { return h('span', { class: 'stars r' + r }, '★'.repeat(r)); }

  PUI.hatchModal = function (res) {
    const s = UI.state;
    const box = h('div', { class: 'hatch' });
    box.innerHTML = '<div class="hatch-egg">' + Art.egg(res.pal.topic, 120, true) + '</div>';
    const reveal = h('div', { class: 'hatch-reveal hidden' },
      h('div', { class: 'hatch-pal', html: Art.svg(res.sp.id, { size: 150 }) }),
      h('div', { class: 'hatch-name' }, res.isNew ? h('span', { class: 'new-badge' }, 'NEW!') : null, h('b', {}, res.sp.name), stars(res.sp.rarity)),
      h('div', { class: 'small' }, P.RARITY[res.sp.rarity] + '・' + (res.sp.topic ? Qs.TOPICS[res.sp.topic].name + 'の相棒' : '伝説の相棒')),
      workChips(res.sp),
      h('p', { class: 'small muted' }, res.sp.desc));
    box.appendChild(reveal);
    UI.modal({ title: '🐣 孵化！', body: box, buttons: [{ label: 'よろしくね！', cls: 'primary' }] });
    if (MF.Audio) MF.Audio.play('hatch');
    setTimeout(() => { const e = box.querySelector('.hatch-egg'); if (e) e.classList.add('pop'); }, 900);
    setTimeout(() => { const e = box.querySelector('.hatch-egg'); if (e) e.remove(); reveal.classList.remove('hidden'); if (MF.FX && MF.FX.burst) { const r = reveal.getBoundingClientRect(); MF.FX.burst({ x: r.left + r.width / 2, y: r.top + 80, color: res.sp.look.color, n: 40 }); } if (res.sp.rarity >= 2 && MF.Audio) MF.Audio.play('levelup'); }, 1300);
  };
  function hatchAll() {
    const s = UI.state;
    const ready = P.readyEggs(s);
    if (!ready.length) return;
    const res = P.hatch(s, ready[0].id, Date.now());
    if (res) PUI.hatchModal(res);
    UI.rerender();
  }

  function palCard(s, pal) {
    const sp = P.byId[pal.sp];
    const need = P.xpNeed(pal.lvl);
    const where = pal.at && s.factory.b[pal.at] ? F.BUILDINGS[s.factory.b[pal.at].type].name + 'で働き中' : '休けい中';
    const partner = s.pals.partner === pal.id;
    return h('div', { class: 'pal-card' + (partner ? ' partner' : '') },
      PUI.portrait(s, pal, 72),
      h('div', { class: 'pal-info' },
        h('div', { class: 'row' }, h('b', {}, pal.name), stars(sp.rarity), h('span', { class: 'badge' }, 'Lv' + pal.lvl), partner ? h('span', { class: 'badge warn' }, '⚔️戦闘の相棒') : null),
        h('div', { class: 'tiny muted' }, (pal.topic ? Qs.TOPICS[pal.topic].name + 'を解くと育つ' : '') + '・' + where),
        UI.bar(pal.xp, need, 'green', pal.lvl >= B.pals.maxLevel ? 'MAX' : pal.xp + ' / ' + need),
        workChips(sp),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: () => palDetail(pal) }, 'くわしく'),
          h('button', { class: 'btn small', onclick: () => { s.pals.partner = partner ? null : pal.id; UI.rerender(); } }, partner ? '戦闘からはずす' : '⚔️戦闘に連れていく'))));
  }
  function palDetail(pal) {
    const s = UI.state, sp = P.byId[pal.sp];
    const name = h('input', { class: 'text-in', value: pal.name, maxlength: 12 });
    const body = h('div', { class: 'pal-detail' },
      h('div', { class: 'center', html: Art.svg(pal.sp, { size: 140, skin: PUI.skinOf(s, pal) }) }),
      h('p', { class: 'small' }, sp.desc),
      h('div', {}, '得意な作業：', workChips(sp)),
      h('p', { class: 'small' }, '工場での効果：同じ作業の設備に配置すると速さ +' + Math.round(Math.max(...Object.keys(sp.work).map((w) => P.skill(pal, w))) * B.pals.skillStep * 100) + '%（レベルで上がる）。運搬はコア・倉庫、発電は発電所・ソーラー・コアに配置。'),
      h('label', { class: 'small' }, 'ニックネーム', name),
      MF.PalsUI.skinPicker ? MF.PalsUI.skinPicker(s, pal) : null);
    UI.modal({ title: sp.name + ' Lv' + pal.lvl, body, buttons: [
      { label: '旅に出す（研究P +' + (5 + pal.lvl * 2) + '）', cls: 'danger ghost', action: () => { UI.confirm('お別れ', pal.name + ' を旅に出しますか？（もどってきません）', '旅に出す', () => { P.release(s, pal.id); UI.rerender(); }, 'danger'); } },
      { label: '保存', cls: 'primary', action: () => { const v = name.value.trim(); if (v) pal.name = v.slice(0, 12); UI.rerender(); } },
    ] });
  }

  PUI.tabs = [
    { id: 'list', label: '相棒', render(box, s) {
      const ready = P.readyEggs(s).length;
      if (ready) box.appendChild(h('button', { class: 'btn primary block hatch-btn', onclick: hatchAll }, '🐣 卵が ' + ready + ' 個かえりそう！ タップで孵化'));
      if (!s.pals.list.length) { box.appendChild(h('div', { class: 'empty' }, h('div', { html: Art.egg('quad', 80) }), h('p', {}, 'まだ相棒がいないよ。問題に正解すると、ときどき卵が手に入る！'))); return; }
      box.appendChild(h('p', { class: 'small muted' }, '工場の設備をタップ →「相棒を配置」で働いてもらえる。同じ分野の問題に正解すると大きく育つ。'));
      const list = h('div', { class: 'pal-list' });
      s.pals.list.slice().sort((a, b) => b.lvl - a.lvl).forEach((p) => list.appendChild(palCard(s, p)));
      box.appendChild(list);
    } },
    { id: 'eggs', label: '卵', render(box, s) {
      box.appendChild(h('p', { class: 'small muted' }, '問題に正解すると約' + Math.round(B.pals.eggChance * 100) + '%で卵が出る（コンボ中は出やすい、' + B.pals.eggPity + '問ごとに必ず1個）。卵はどの分野でも正解すれば育つ。最大 ' + B.pals.maxEggs + ' 個。'));
      if (!s.pals.eggs.length) { box.appendChild(h('div', { class: 'empty' }, '卵はまだないよ')); return; }
      const g = h('div', { class: 'egg-grid' });
      s.pals.eggs.forEach((e) => {
        const ready = e.prog >= e.need;
        g.appendChild(h('div', { class: 'egg-card' + (ready ? ' ready' : '') },
          h('div', { class: 'egg-pic', html: Art.egg(e.topic, 64, ready) }), h('div', { class: 'small' }, Qs.TOPICS[e.topic].name + 'の卵'),
          UI.bar(e.prog, e.need, ready ? 'green' : '', e.prog + ' / ' + e.need),
          ready ? h('button', { class: 'btn small primary', onclick: () => { const r = P.hatch(s, e.id, Date.now()); if (r) PUI.hatchModal(r); UI.rerender(); } }, '孵化させる') : h('span', { class: 'tiny muted' }, 'あと ' + (e.need - e.prog) + ' 問正解')));
      });
      box.appendChild(g);
    } },
    { id: 'dex', label: '図鑑', render(box, s) {
      const got = Object.keys(s.pals.dex).length;
      box.appendChild(h('p', { class: 'small' }, '見つけた相棒 ', h('b', {}, got), ' / ' + P.SPECIES.length));
      const g = h('div', { class: 'dex-grid' });
      P.SPECIES.forEach((sp, i) => {
        const d = s.pals.dex[sp.id];
        g.appendChild(h('button', { class: 'dex-card' + (d ? '' : ' unknown'), onclick: () => { if (d) UI.modal({ title: 'No.' + (i + 1) + ' ' + sp.name, body: h('div', {}, h('div', { class: 'center', html: Art.svg(sp.id, { size: 150 }) }), h('div', { class: 'row' }, stars(sp.rarity), h('span', { class: 'small' }, (sp.topic ? Qs.TOPICS[sp.topic].name : 'どの分野からも（まれ）') + '・これまでに ' + d.n + ' 匹')), workChips(sp), h('p', { class: 'small' }, sp.desc)) }); else UI.toast('まだ出会っていない相棒。' + (sp.topic ? Qs.TOPICS[sp.topic].name + 'の卵から生まれるかも' : 'どの卵から生まれるかは…ひみつ'), 'info'); } },
          h('span', { class: 'dex-no' }, 'No.' + (i + 1)), h('span', { html: Art.svg(sp.id, { size: 70, silhouette: !d }) }), h('span', { class: 'dex-name' }, d ? sp.name : '？？？')));
      });
      box.appendChild(g);
    } },
  ];
  UI.screen('pals', {
    title: '相棒', icon: '🐾', nav: 'main', navOrder: 4,
    badge: (s) => { const n = P.readyEggs(s).length; return n ? '🥚' : null; },
    render(root, s, params) {
      if (params && params.tab) PUI.tab = params.tab;
      root.appendChild(h('h2', { class: 'screen-title' }, '相棒'));
      const tabs = h('div', { class: 'tabs' });
      PUI.tabs.forEach((t) => tabs.appendChild(h('button', { class: 'tab' + (PUI.tab === t.id ? ' on' : ''), onclick: () => { PUI.tab = t.id; UI.params = {}; UI.rerender(); } }, t.label + (t.id === 'eggs' && s.pals.eggs.length ? '（' + s.pals.eggs.length + '）' : ''))));
      root.appendChild(tabs);
      const box = h('div', { class: 'tab-body' });
      root.appendChild(box);
      (PUI.tabs.find((t) => t.id === PUI.tab) || PUI.tabs[0]).render(box, s);
    },
  });

  // ---------- 工場：相棒の配置 ----------
  FUI.infoExtras.push((s, b, box, rerender) => {
    if (b.type === 'belt') return;
    const pal = b.pal ? P.get(s, b.pal) : null;
    const row = h('div', { class: 'pal-assign' });
    if (pal) {
      const bonus = b.type === 'core' || b.type === 'storage' ? '運搬 +' + Math.round(P.skill(pal, 'transport') * B.pals.skillStep * 100) + '%（ベルト全体）' : (b.type === 'power' || b.type === 'solar' || b.type === 'core') ? '発電 +' + Math.round(P.skill(pal, 'power') * B.pals.skillStep * 100) + '%' : '速さ +' + Math.round(P.bonusFor(s, pal, b.type) * 100) + '%';
      row.append(PUI.portrait(s, pal, 40), h('span', { class: 'small' }, pal.name + ' Lv' + pal.lvl + ' が働いている：' + bonus), h('button', { class: 'btn small ghost', onclick: () => { P.unassign(s, pal.id); rerender(); } }, 'はずす'));
    } else {
      row.append(h('span', { class: 'small muted' }, '相棒：なし'), h('button', { class: 'btn small', disabled: !s.pals.list.length, onclick: () => pickPal(s, b, rerender) }, '🐾 相棒を配置'));
    }
    box.appendChild(row);
  });
  function pickPal(s, b, rerender) {
    const list = s.pals.list.slice().sort((x, y) => P.bonusFor(s, y, b.type) - P.bonusFor(s, x, b.type) || y.lvl - x.lvl);
    const body = h('div', { class: 'pick-list' }, list.map((pal) => {
      const bonus = P.bonusFor(s, pal, b.type);
      const where = pal.at && s.factory.b[pal.at] ? '（いま：' + F.BUILDINGS[s.factory.b[pal.at].type].name + '）' : '';
      return h('button', { class: 'pick-item', onclick: () => { P.assign(s, pal.id, b.id); close(); rerender(); if (MF.Audio) MF.Audio.play('click'); } },
        PUI.portrait(s, pal, 44), h('span', {}, h('b', {}, pal.name), ' Lv' + pal.lvl + where), h('span', { class: bonus > 0 ? 'good small' : 'muted small' }, bonus > 0 ? '+' + Math.round(bonus * 100) + '%' : '得意ではない'));
    }));
    const close = UI.modal({ title: F.BUILDINGS[b.type].name + 'に配置する相棒', body });
  }
  FUI.overlayDraw.push((ctx, s, b, x, y, cs) => {
    if (!b.pal) return;
    const pal = P.get(s, b.pal);
    if (!pal) return;
    const sp = P.byId[pal.sp];
    const r = cs * 0.17, cx = x + cs - r - cs * 0.06, cy = y + cs - r - cs * 0.06;
    ctx.fillStyle = (PUI.skinOf(s, pal) || {}).color || sp.look.color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.05, r * 0.18, 0, 7); ctx.arc(cx + r * 0.35, cy - r * 0.05, r * 0.18, 0, 7); ctx.fill();
  });
  UI.noticeHandlers.egg = (n) => { UI.toast(n.text, 'good', 3200); if (MF.Audio) MF.Audio.play('egg'); return true; };
})(globalThis.MF = globalThis.MF || {});
