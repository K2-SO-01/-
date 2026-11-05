/* 数学ファクトリー：防衛（襲撃・デッキ・レリック・侵攻ラン）とバトル画面 */
(function (MF) {
  'use strict';
  const UI = MF.UI, Bt = MF.Battle, G = MF.Game, U = MF.Util, F = MF.Factory, FUI = MF.FactoryUI, B = MF.Balance;
  const h = UI.h;
  const BUI = { target: 0 };
  MF.BattleUI = BUI;
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };

  // ---------- 敵の絵（赤い異星生物） ----------
  BUI.enemySvg = function (type, size) {
    const d = Bt.ENEMIES[type], L = d.look;
    const red = d.boss ? '#e0263f' : d.elite ? '#c22a4a' : '#d6404f', dk = '#7a1426', lt = '#ff7a86';
    const p = [];
    const eyes = (pts) => pts.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ffe14a"/><circle cx="' + x + '" cy="' + (y + r * 0.15) + '" r="' + r * 0.45 + '" fill="#2a0008"/>').join('');
    if (L.body === 'grub') p.push('<circle cx="74" cy="66" r="14" fill="' + dk + '"/><circle cx="56" cy="62" r="18" fill="' + red + '"/><circle cx="34" cy="56" r="22" fill="' + red + '"/><path d="M16 60 l-8 6 M18 66 l-6 10" stroke="' + dk + '" stroke-width="4" stroke-linecap="round"/>' + eyes([[28, 50, 5], [40, 48, 5]]) + '<path d="M26 64 q8 6 16 0" stroke="#2a0008" stroke-width="3" fill="none"/>');
    if (L.body === 'wing') p.push('<path d="M50 50 L8 24 L18 52 L4 66 L40 60 Z" fill="' + dk + '"/><path d="M50 50 L92 24 L82 52 L96 66 L60 60 Z" fill="' + dk + '"/><ellipse cx="50" cy="56" rx="18" ry="22" fill="' + red + '"/>' + eyes([[42, 50, 4.5], [58, 50, 4.5], [50, 40, 4]]) + '<path d="M44 66 l3 5 l3 -5 l3 5 l3 -5" stroke="#fff" stroke-width="2" fill="none"/>');
    if (L.body === 'frog') p.push('<ellipse cx="50" cy="64" rx="38" ry="26" fill="' + red + '"/><ellipse cx="50" cy="74" rx="26" ry="12" fill="' + lt + '"/><circle cx="30" cy="40" r="12" fill="' + red + '"/><circle cx="70" cy="40" r="12" fill="' + red + '"/>' + eyes([[30, 40, 8], [70, 40, 8]]) + '<path d="M26 64 q24 14 48 0" stroke="#2a0008" stroke-width="4" fill="none"/><circle cx="20" cy="58" r="3" fill="' + dk + '"/><circle cx="80" cy="60" r="3" fill="' + dk + '"/>');
    if (L.body === 'beast') p.push('<path d="M14 70 L22 42 L32 56 L40 34 L50 52 L60 32 L68 54 L78 40 L86 70 Z" fill="' + dk + '"/><ellipse cx="50" cy="66" rx="36" ry="24" fill="' + red + '"/><rect x="22" y="80" width="10" height="12" rx="4" fill="' + dk + '"/><rect x="68" y="80" width="10" height="12" rx="4" fill="' + dk + '"/>' + eyes([[38, 58, 5], [50, 56, 6], [62, 58, 5], [50, 46, 3.5]]) + '<path d="M36 74 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" stroke="#fff" stroke-width="2.5" fill="none"/>');
    if (L.body === 'shell') p.push('<path d="M10 56 q-6 -18 10 -22 q6 8 -2 16 Z" fill="' + dk + '"/><path d="M90 56 q6 -18 -10 -22 q-6 8 2 16 Z" fill="' + dk + '"/><path d="M14 70 Q50 10 86 70 Z" fill="' + red + '" stroke="' + dk + '" stroke-width="3"/><path d="M30 60 Q50 30 70 60 M40 66 Q50 46 60 66" stroke="' + dk + '" stroke-width="3" fill="none"/><rect x="18" y="68" width="64" height="16" rx="8" fill="' + dk + '"/>' + eyes([[40, 76, 4.5], [60, 76, 4.5]]));
    if (L.body === 'spore') p.push('<circle cx="34" cy="64" r="20" fill="' + red + '"/><circle cx="66" cy="62" r="22" fill="' + red + '"/><circle cx="50" cy="40" r="20" fill="' + red + '"/><circle cx="24" cy="40" r="6" fill="' + lt + '"/><circle cx="80" cy="36" r="7" fill="' + lt + '"/><circle cx="50" cy="16" r="5" fill="' + lt + '"/>' + eyes([[30, 62, 5], [40, 70, 4], [62, 58, 5], [72, 66, 4], [50, 40, 6]]));
    if (L.body === 'queen') p.push('<path d="M20 30 L28 6 L38 24 L50 2 L62 24 L72 6 L80 30 Z" fill="#ffd23d" stroke="' + dk + '" stroke-width="2"/>' + [18, 32, 68, 82].map((x) => '<path d="M' + x + ' 76 q' + (x < 50 ? -8 : 8) + ' 10 ' + (x < 50 ? -2 : 2) + ' 20" stroke="' + dk + '" stroke-width="6" fill="none" stroke-linecap="round"/>').join('') + '<ellipse cx="50" cy="56" rx="38" ry="30" fill="' + red + '"/><ellipse cx="50" cy="70" rx="24" ry="12" fill="' + lt + '"/>' + eyes([[34, 46, 5], [50, 42, 7], [66, 46, 5], [40, 58, 4], [60, 58, 4], [50, 30, 3.5]]) + '<path d="M36 72 q14 8 28 0" stroke="#2a0008" stroke-width="4" fill="none"/>');
    return '<svg class="enemy-svg" viewBox="0 0 100 100" width="' + (size || 90) + '" height="' + (size || 90) + '" role="img" aria-label="' + d.name + '">' + p.join('') + '</svg>';
  };

  // ---------- 防衛画面 ----------
  function raidCard(s) {
    const r = s.battle.raid;
    const now = Date.now();
    const box = UI.section('🚨 襲撃');
    if (s.battle.active && s.battle.active.kind === 'raid') { box.appendChild(h('button', { class: 'btn primary block', onclick: () => UI.go('battle') }, '⚔️ 戦闘にもどる')); return box; }
    if (r.pending) {
      const left = Math.max(0, (r.pending.deadline - now) / 1000);
      box.classList.add('raid-alert');
      box.appendChild(h('p', {}, '赤い異星生物の群れが工場に近づいている！ のこり ', h('b', { class: 'bad', id: 'raid-left' }, U.fmtClock(left)), '。時間切れになると砲台だけで戦い、負けると設備が壊れる。'));
      box.appendChild(h('div', { class: 'enemy-preview' }, r.pending.plan.enemies.map((t) => h('div', { class: 'ep' }, h('span', { html: BUI.enemySvg(t, 64) }), h('span', { class: 'tiny' }, Bt.ENEMIES[t].name)))));
      box.appendChild(h('button', { class: 'btn primary block big-btn', onclick: () => { const bt = Bt.startRaid(s, Date.now()); if (bt) { BUI.intro = true; UI.go('battle'); } } }, '⚔️ 迎え撃つ！'));
    } else {
      const unlocked = s.stats.correct >= B.battle.raidMinCorrect || s.battle.forceRaids;
      box.appendChild(h('p', { class: 'small' }, unlocked ? '問題に正解するたびに群れが近づいてくる。メーターが満タンになると襲撃が来るぞ。' : '正解 ' + B.battle.raidMinCorrect + ' 問を超えると、赤い群れがこの工場に気づきはじめる…（いま ' + s.stats.correct + ' 問）'));
      box.appendChild(UI.bar(r.meter, B.battle.raidMeter, 'red', '接近 ' + r.meter + ' / ' + B.battle.raidMeter));
    }
    box.appendChild(h('div', { class: 'small muted' }, '撃退 ' + s.battle.raidWins + ' / ' + s.battle.raids + ' 回・砲台 ' + Bt.turrets(s).length + ' 基（弾薬 ' + Math.floor(s.inv.ammo || 0) + ' 発）'));
    const broken = Object.values(s.factory.b).filter((b) => b.disabled).length;
    if (broken) box.appendChild(h('div', { class: 'small bad' }, '⚠ 壊れた設備が ' + broken + ' 個ある。工場で設備をタップして修理しよう。'));
    return box;
  }
  function runCard(s) {
    const run = s.battle.run;
    const box = UI.section('🛸 侵攻ラン（ローグライク）');
    box.appendChild(h('p', { class: 'small' }, '敵の星へ攻めこむ連戦モード。基本デッキから始めて、戦いながらカードとレリックを集め、' + B.battle.runFloors + '層目のボスを倒せばクリア。負けたらやり直し（何度でも挑戦できる）。'));
    box.appendChild(h('div', { class: 'small muted' }, '最高到達 ' + s.battle.bestFloor + ' 層・挑戦 ' + s.battle.runs + ' 回・クリア ' + s.battle.runClears + ' 回'));
    if (run && run.active) box.appendChild(h('button', { class: 'btn primary block', onclick: () => UI.go('run') }, '▶ つづきから（第' + run.floor + '層・HP ' + run.hp + '/' + run.maxHp + '）'));
    else box.appendChild(h('button', { class: 'btn primary block', disabled: !!s.battle.active, onclick: () => { Bt.startRun(s, Date.now()); UI.go('run'); } }, '🚀 出撃する'));
    if (s.battle.lastRun) { const l = s.battle.lastRun; box.appendChild(h('div', { class: 'tiny muted' }, '前回：' + (l.cleared ? '🏆クリア！' : '第' + l.floor + '層で敗退') + '（研究P +' + l.rp + '）')); }
    return box;
  }
  function deckCard(s) {
    const counts = {};
    s.battle.deck.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    const box = UI.section('🃏 防衛デッキ（' + s.battle.deck.length + '枚）');
    box.appendChild(h('div', { class: 'deck-mini' }, Object.keys(counts).map((c) => h('span', { class: 'chip card-chip t-' + Bt.CARDS[Bt.cardId(c)].type }, Bt.cardName(c) + ' ×' + counts[c]))));
    box.appendChild(h('button', { class: 'btn small', onclick: () => deckEditor() }, '✏️ デッキ編集・カード強化'));
    return box;
  }
  function relicCard(s) {
    const box = UI.section('🔮 レリック（3つまで装備）');
    if (!s.battle.relics.length) { box.appendChild(h('p', { class: 'small muted' }, 'まだ持っていない。エリートの襲撃や侵攻ランで手に入る。')); return box; }
    box.appendChild(h('div', { class: 'relic-list' }, s.battle.relics.map((r) => {
      const R = Bt.RELICS[r], on = s.battle.equipped.indexOf(r) >= 0;
      return h('button', { class: 'relic' + (on ? ' on' : ''), title: R.desc, onclick: () => { if (!Bt.equipRelic(s, r)) UI.toast('装備できるのは3つまで', 'warn'); UI.rerender(); } }, h('span', { class: 'relic-ico' }, R.icon), h('span', {}, h('b', { class: 'small' }, R.name), h('span', { class: 'tiny muted block' }, R.desc)), on ? h('span', { class: 'badge good' }, '装備中') : null);
    })));
    return box;
  }
  BUI.cardEl = function (s, c, opts) {
    opts = opts || {};
    const d = Bt.CARDS[Bt.cardId(c)];
    const cost = opts.bt ? Bt.cost(s, opts.bt, c) : d.cost;
    return h('button', { class: 'card-el t-' + d.type + ' r' + d.rarity + (opts.disabled ? ' dim' : '') + (Bt.isUp(c) ? ' up' : ''), onclick: opts.onclick, disabled: opts.disabledAttr },
      h('span', { class: 'ce-cost' }, cost), h('span', { class: 'ce-name' }, Bt.cardName(c)),
      h('span', { class: 'ce-type' }, { attack: '攻撃', skill: 'スキル', power: 'パワー' }[d.type]), h('span', { class: 'ce-desc' }, Bt.describe(c)));
  };
  function deckEditor() {
    const s = UI.state;
    const body = h('div', {});
    const render = () => {
      body.innerHTML = '';
      body.appendChild(h('p', { class: 'small' }, 'デッキ ' + s.battle.deck.length + ' 枚（8〜25枚）。カードを強化すると効果が上がる（歯車・電子回路を使う）。'));
      const ids = Object.keys(s.battle.collection).sort((a, b) => Bt.CARDS[Bt.cardId(b)].rarity - Bt.CARDS[Bt.cardId(a)].rarity);
      ids.forEach((c) => {
        const have = s.battle.collection[c], inDeck = Bt.deckCount(s, c);
        const up = Bt.isUp(c) ? null : Bt.upgradeCost(c);
        body.appendChild(h('div', { class: 'deck-row' }, BUI.cardEl(s, c), h('div', { class: 'deck-ctl' },
          h('span', { class: 'small' }, 'デッキ ' + inDeck + ' / 所持 ' + have),
          h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { if (!Bt.deckRemove(s, c)) UI.toast('デッキは8枚以上必要', 'warn'); render(); } }, '－'),
            h('button', { class: 'btn small', onclick: () => { if (!Bt.deckAdd(s, c)) UI.toast('所持数か上限(25枚)をこえる', 'warn'); render(); } }, '＋')),
          up ? h('button', { class: 'btn small', disabled: !G.has(s, up), title: G.costText(up), onclick: () => { const r = Bt.upgradeCard(s, c); UI.toast(r.ok ? Bt.cardName(c) + ' を強化！' : r.reason, r.ok ? 'good' : 'warn'); render(); } }, '⬆ 強化（' + G.costText(up) + '）') : null)));
      });
    };
    render();
    UI.modal({ title: 'デッキ編集', body, cls: 'wide', onClose: () => UI.rerender() });
  }
  UI.screen('defense', {
    title: '防衛', icon: '⚔️', nav: 'main', navOrder: 5,
    badge: (s) => (s.battle.raid.pending ? '!' : null),
    render(root, s) {
      root.appendChild(h('h2', { class: 'screen-title' }, '防衛司令室'));
      root.appendChild(raidCard(s));
      root.appendChild(runCard(s));
      root.appendChild(deckCard(s));
      root.appendChild(relicCard(s));
      root.appendChild(h('details', { class: 'card' }, h('summary', {}, '❓ バトルのルール'), h('ul', { class: 'small' },
        h('li', {}, '毎ターン エネルギー3、手札5枚。カードをタップすると数学の問題が出る。正解でカードが発動、不正解だと不発（エネルギーは使う）。'),
        h('li', {}, B.battle.critSec + '秒以内に正解すると「会心」で効果1.25倍！'),
        h('li', {}, '敵の頭の上の予告（⚔️攻撃・🛡️防御・💪強化・☠️妨害）を見て、攻めるか守るか決めよう。'),
        h('li', {}, 'ブロックは次の自分のターンまで攻撃を防ぐ。筋力は攻撃力、敏捷はブロック量を上げる。脆弱は受けるダメージ1.5倍、弱体は与えるダメージ0.75倍。'),
        h('li', {}, '防衛戦では工場の砲台が毎ターン援護射撃（弾薬を使う）。⚔️戦闘に連れていった相棒は開始時にブロックをくれる。'))));
    },
    update(s) { const el = document.getElementById('raid-left'); if (el && s.battle.raid.pending) el.textContent = U.fmtClock((s.battle.raid.pending.deadline - Date.now()) / 1000); },
  });

  // ---------- バトル画面 ----------
  function statusIcons(o) {
    const out = [];
    if (o.block) out.push(h('span', { class: 'st st-block', title: 'ブロック' }, '🛡️' + o.block));
    if (o.str) out.push(h('span', { class: 'st', title: '筋力' }, '💪' + o.str));
    if (o.dex) out.push(h('span', { class: 'st', title: '敏捷' }, '🌀' + o.dex));
    if (o.vuln) out.push(h('span', { class: 'st bad', title: '脆弱（受けるダメージ1.5倍）' }, '💔' + o.vuln));
    if (o.weak) out.push(h('span', { class: 'st bad', title: '弱体（与えるダメージ0.75倍）' }, '🥀' + o.weak));
    if (o.poison) out.push(h('span', { class: 'st bad', title: '毒' }, '☠️' + o.poison));
    if (o.metal) out.push(h('span', { class: 'st', title: '毎ターン ブロック' }, '🔩' + o.metal));
    if (o.ritual) out.push(h('span', { class: 'st', title: '毎ターン 筋力' }, '📈' + o.ritual));
    return out;
  }
  let els = {};
  function renderBattle() {
    const s = UI.state, bt = s.battle.active;
    const root = els.root;
    if (!root) return;
    if (!bt) { UI.go(s.battle.run && s.battle.run.active ? 'run' : 'defense'); return; }
    root.innerHTML = '';
    const title = bt.war ? (bt.war.kind === 'attack' ? '🪐 惑星攻略戦' : '🛡️ 惑星防衛戦') : bt.kind === 'raid' ? (bt.elite ? '💀 エリート襲撃' : '🚨 防衛戦') + '（第' + bt.raidNo + '波）' : '🛸 侵攻ラン 第' + s.battle.run.floor + '層' + (bt.boss ? '・ボス' : bt.elite ? '・エリート' : '');
    root.appendChild(h('div', { class: 'bt-top' }, h('b', {}, title), h('span', { class: 'muted small' }, 'ターン ' + bt.turn), h('span', { class: 'spacer' }),
      h('span', { class: 'tiny muted' }, '山札 ' + bt.draw.length + '・捨て札 ' + bt.discard.length)));
    const alive = Bt.alive(bt);
    if (!bt.enemies[BUI.target] || bt.enemies[BUI.target].hp <= 0) BUI.target = alive.length ? alive[0].idx : 0;
    const row = h('div', { class: 'enemies' });
    bt.enemies.forEach((e) => {
      const dead = e.hp <= 0;
      row.appendChild(h('button', { class: 'enemy' + (dead ? ' dead' : '') + (BUI.target === e.idx && !dead ? ' targeted' : '') + (Bt.ENEMIES[e.type].boss ? ' boss' : ''), dataset: { idx: e.idx }, disabled: dead, onclick: () => { BUI.target = e.idx; renderBattle(); } },
        dead ? null : h('span', { class: 'intent' }, Bt.intentText(bt, e)),
        h('span', { class: 'enemy-pic', html: BUI.enemySvg(e.type, Bt.ENEMIES[e.type].boss ? 130 : 88) }),
        h('span', { class: 'enemy-name' }, e.name),
        UI.bar(e.hp, e.maxHp, 'red', e.hp + ' / ' + e.maxHp),
        h('span', { class: 'sts' }, statusIcons(e))));
    });
    root.appendChild(row);
    const p = bt.player;
    root.appendChild(h('div', { class: 'player-bar' },
      bt.partner && MF.PalArt ? h('span', { class: 'partner', title: bt.partner.name, html: MF.PalArt.svg(bt.partner.sp, { size: 44 }) }) : null,
      h('div', { class: 'pb-main' }, h('div', { class: 'row small' }, h('b', {}, bt.kind === 'raid' ? '工場シールド' : '探査船'), h('span', { class: 'sts' }, statusIcons(p))), UI.bar(p.hp, p.maxHp, 'green', 'HP ' + p.hp + ' / ' + p.maxHp)),
      h('div', { class: 'energy', title: 'エネルギー' }, h('b', {}, p.energy), h('span', { class: 'tiny' }, '/' + p.maxEnergy))));
    const hand = h('div', { class: 'hand' });
    bt.hand.forEach((c, i) => {
      const cost = Bt.cost(s, bt, c);
      hand.appendChild(BUI.cardEl(s, c, { bt, disabled: cost > p.energy, onclick: () => playCard(i) }));
    });
    if (!bt.hand.length) hand.appendChild(h('div', { class: 'muted small empty' }, '手札がない'));
    root.appendChild(hand);
    root.appendChild(h('div', { class: 'bt-actions' },
      h('button', { class: 'btn ghost small', onclick: () => showLog(bt) }, '📜 ログ'),
      h('span', { class: 'bt-last small muted' }, bt.log[bt.log.length - 1] || ''),
      h('button', { class: 'btn primary', disabled: !!bt.over, onclick: () => endTurn() }, 'ターン終了 ▶')));
    if (bt.over) showResult();
  }
  function showLog(bt) { UI.modal({ title: '戦闘ログ', body: h('div', { class: 'small bt-log' }, bt.log.slice().reverse().map((l) => h('div', {}, l))) }); }
  function floatText(sel, text, cls) {
    const el = els.root && els.root.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = h('div', { class: 'float-num ' + (cls || '') }, text);
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height * 0.35) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  }
  function playCard(i) {
    const s = UI.state, bt = s.battle.active;
    if (!bt || bt.over) return;
    const c = bt.hand[i];
    if (Bt.cost(s, bt, c) > bt.player.energy) { UI.toast('エネルギーが足りない', 'warn', 1200); return; }
    const req = Bt.requestPlay(s, i, BUI.target);
    if (!req.ok) { UI.toast(req.reason, 'warn'); return; }
    sfx('card');
    askQuestion(req, false);
  }
  function askQuestion(req, retry) {
    const s = UI.state;
    let res = null, closed = false;
    const holder = h('div', {}, h('div', { class: 'q-card-head' }, BUI.cardEl(s, req.card), h('p', { class: 'small' }, retry ? '🧽 消しゴム：もう一度チャレンジ！' : '正解するとカードが発動！ ' + B.battle.critSec + '秒以内なら会心。')));
    let panel;
    const finish = () => {
      if (closed) return; closed = true;
      if (panel) panel.destroy();
      close();
      const bt = s.battle.active;
      if (!bt || !bt.pending) { renderBattle(); return; }
      const ok = !!(res && res.ok && res.attempt === 1);
      const out = Bt.resolvePlay(s, ok, res ? res.ms : undefined);
      if (out && out.retry) { renderBattle(); const q2 = Object.assign({}, req, { q: Bt.questionOpts(s, bt, req.card) }); askQuestion(q2, true); return; }
      renderBattle();
      if (out) {
        const tsel = '.enemy[data-idx="' + (bt.enemies[BUI.target] ? BUI.target : 0) + '"]';
        if (out.dmg) { floatText(tsel, (out.crit ? '会心 ' : '') + '-' + out.dmg, out.crit ? 'crit' : ''); sfx(out.crit ? 'crit' : 'hit'); }
        else if (out.block) { floatText('.player-bar', '+' + out.block + '🛡️', 'blue'); sfx('block'); }
        else if (out.fizzle) { floatText('.player-bar', '不発…', 'gray'); }
        else sfx('buff');
      }
    };
    const close = UI.modal({ title: '🃏 ' + Bt.cardName(req.card), body: holder, noClose: true, cls: 'q-modal' });
    panel = MF.QuizUI.createPanel(holder, {
      compact: true, allowHints: false, allowSkip: false, oneShot: true, showReward: false, autoNext: 900, nextLabel: 'つづける ▶',
      next: () => { finish(); return null; },
      onDone: (r) => { res = r; },
      label: 'カード発動の問題',
    });
    panel.load(G.Quiz.next(s, Date.now(), req.q));
  }
  function endTurn() {
    const s = UI.state;
    const bt = s.battle.active;
    if (!bt || bt.over) return;
    const hp = bt.player.hp;
    Bt.endTurn(s);
    renderBattle();
    if (bt.player.hp < hp) { floatText('.player-bar', '-' + (hp - bt.player.hp), 'red'); sfx('hurt'); document.body.classList.remove('screen-hit'); void document.body.offsetWidth; document.body.classList.add('screen-hit'); }
  }
  function showResult() {
    const s = UI.state, bt = s.battle.active;
    if (!bt || !bt.over || BUI.resultShown) return;
    BUI.resultShown = true;
    const win = bt.over === 'win';
    sfx(win ? 'victory' : 'defeat');
    if (bt.war && MF.Galaxy) {
      const out = MF.Galaxy.finishWar(s, Date.now());
      const msg = out.kind === 'attack' ? (out.win ? out.name + ' を ' + out.empire + ' から奪った！' : out.name + ' への攻撃は失敗した…') : (out.win ? out.name + ' を守りきった！' : out.lost ? out.name + ' を奪われてしまった…' : 'ふるさとの設備が壊された…');
      UI.modal({ title: out.win ? '🏆 勝利！' : '💥 敗北…', body: h('p', {}, msg), buttons: [{ label: 'OK', cls: 'primary' }], onClose: () => { BUI.resultShown = false; UI.go('galaxy'); } });
      return;
    }
    if (bt.kind === 'raid') {
      const out = Bt.finishRaid(s, Date.now());
      if (win) {
        const body = h('div', {}, h('p', {}, '襲撃を撃退した！'), h('div', { class: 'chip-wrap' }, Object.keys(out.bundle).map((k) => UI.itemChip(k, '+' + out.bundle[k]))),
          out.relic ? h('p', {}, '🔮 レリック獲得：' + Bt.RELICS[out.relic].icon + ' ' + Bt.RELICS[out.relic].name + '（' + Bt.RELICS[out.relic].desc + '）') : null,
          h('p', { class: 'small' }, '新しいカードを1枚えらんでデッキに加えよう：'),
          h('div', { class: 'card-choices' }, out.cards.map((c) => BUI.cardEl(s, c, { onclick: () => { Bt.takeRaidCard(s, c); UI.toast(Bt.cardName(c) + ' を手に入れた！', 'good'); close(); } }))));
        const close = UI.modal({ title: '🏆 勝利！', body, noClose: true, buttons: [{ label: 'カードはいらない', cls: 'ghost' }], onClose: () => { BUI.resultShown = false; UI.go('defense'); } });
      } else {
        UI.modal({ title: '💥 防衛失敗…', body: h('div', {}, h('p', {}, '工場が被害を受けた。壊れた設備：' + (out.damaged.map((t) => F.BUILDINGS[t].name).join('、') || 'なし')), h('p', { class: 'small muted' }, '工場で設備をタップすると修理できる。砲台を建てたり、デッキを強化して次にそなえよう。')),
          buttons: [{ label: 'わかった', cls: 'primary' }], onClose: () => { BUI.resultShown = false; UI.go('defense'); } });
      }
    } else {
      const out = Bt.finishRunBattle(s, Date.now());
      BUI.resultShown = false;
      if (out && out.ended) BUI.showRunEnd(out); else UI.go('run');
    }
  }
  BUI.showRunEnd = function (out) {
    UI.modal({ title: out.cleared ? '🏆 侵攻ラン クリア！' : '💀 侵攻ラン 終了', body: h('div', {},
      h('p', {}, out.cleared ? '紅蓮の女王を倒した！' : '第' + out.floor + '層で力つきた…'),
      h('p', {}, '到達 ' + out.floor + ' 層・撃破 ' + out.kills + ' 体・研究P +' + out.rp),
      out.relic ? h('p', {}, '🔮 レリック獲得：' + Bt.RELICS[out.relic].name) : null,
      out.egg ? h('p', {}, '🥚 卵を見つけた！') : null,
      h('p', { class: 'small muted' }, '何度でも挑戦できる。集めたレリックを装備すると次のランで有利に！')),
    buttons: [{ label: 'もどる', cls: 'primary' }], onClose: () => UI.go('defense') });
  };
  UI.screen('battle', {
    title: 'バトル', icon: '⚔️', nav: null,
    render(root, s) {
      els = { root: h('div', { class: 'battle' }) };
      root.appendChild(els.root);
      BUI.resultShown = false;
      renderBattle();
      const bt = s.battle.active;
      if (BUI.intro && bt) { BUI.intro = false; if (MF.FX && MF.FX.bossIntro && (bt.boss || bt.elite)) MF.FX.bossIntro(bt.enemies[0].name); else sfx('alarm'); }
    },
  });

  // ---------- 侵攻ランのマップ ----------
  UI.screen('run', {
    title: '侵攻ラン', icon: '🛸', nav: null,
    render(root, s) {
      const run = s.battle.run;
      if (!run || !run.active) { UI.go('defense'); return; }
      if (s.battle.active) { UI.go('battle'); return; }
      root.appendChild(h('h2', { class: 'screen-title' }, '🛸 侵攻ラン　第' + run.floor + '層 / ' + B.battle.runFloors));
      root.appendChild(h('div', { class: 'run-stat' }, UI.bar(run.hp, run.maxHp, 'green', 'HP ' + run.hp + ' / ' + run.maxHp),
        h('div', { class: 'small' }, 'デッキ ' + run.deck.length + ' 枚・レリック ', run.relics.length ? run.relics.map((r) => h('span', { title: Bt.RELICS[r].desc }, Bt.RELICS[r].icon)) : 'なし')));
      const track = h('div', { class: 'run-track' });
      for (let f = 1; f <= B.battle.runFloors; f++) track.appendChild(h('span', { class: 'rt-dot' + (f < run.floor ? ' done' : f === run.floor ? ' cur' : '') + (f === B.battle.runFloors ? ' boss' : '') }, f === B.battle.runFloors ? '👑' : f));
      root.appendChild(track);
      if (run.reward) {
        const rw = run.reward;
        root.appendChild(UI.section('🏆 勝利！ 報酬', rw.relic ? h('p', {}, '🔮 ' + Bt.RELICS[rw.relic].icon + ' ' + Bt.RELICS[rw.relic].name + '：' + Bt.RELICS[rw.relic].desc) : null,
          h('p', { class: 'small' }, 'カードを1枚えらんでデッキに加える：'),
          h('div', { class: 'card-choices' }, rw.cards.map((c) => BUI.cardEl(s, c, { onclick: () => { Bt.takeRunCard(s, c); UI.rerender(); } }))),
          h('button', { class: 'btn ghost small', onclick: () => { Bt.takeRunCard(s, null); UI.rerender(); } }, 'スキップ')));
        return;
      }
      if (run.pendingRest) {
        const sel = h('div', { class: 'card-choices' });
        run.deck.forEach((c, i) => { if (!Bt.isUp(c)) sel.appendChild(BUI.cardEl(s, c, { onclick: () => { Bt.rest(s, 'upgrade', i); UI.toast(Bt.cardName(c) + ' を強化！', 'good'); UI.rerender(); } })); });
        root.appendChild(UI.section('🔥 休憩所', h('button', { class: 'btn primary', onclick: () => { Bt.rest(s, 'heal'); UI.rerender(); } }, '休む（HP +' + Math.round(run.maxHp * B.battle.restHeal) + '）'), h('p', { class: 'small' }, 'または、カードを1枚強化する：'), sel));
        return;
      }
      if (run.pendingEvent) {
        const ev = Bt.RUN_EVENTS.find((e) => e.id === run.pendingEvent);
        root.appendChild(UI.section('❓ ' + ev.title, h('p', {}, ev.text), h('p', { class: 'small' }, '正解：' + ev.okText + '　/　不正解：' + ev.ngText),
          h('button', { class: 'btn primary', onclick: () => eventQuestion(ev) }, '問題に挑む')));
        return;
      }
      if (run.lastTreasure !== undefined) { const r = run.lastTreasure; run.lastTreasure = undefined; if (r) UI.toast('💎 宝箱から ' + Bt.RELICS[r].name + ' を見つけた！', 'good', 3500); else UI.toast('💎 宝箱は空っぽ…でも修理キットでHP+10', 'info'); }
      root.appendChild(h('p', { class: 'small' }, '進む道をえらぼう：'));
      root.appendChild(h('div', { class: 'node-choices' }, (run.options || []).map((n, i) => h('button', { class: 'node-btn n-' + n, onclick: () => {
        const res = Bt.chooseNode(s, i);
        if (res && res.battle) { BUI.intro = true; UI.go('battle'); } else UI.rerender();
      } }, h('span', { class: 'node-ico' }, Bt.NODE[n].icon), h('b', {}, Bt.NODE[n].name), h('span', { class: 'tiny muted' }, { battle: '赤い生物と戦う', elite: '強敵。勝てばレリック', rest: 'HP回復かカード強化', treasure: 'レリックが手に入る', event: '問題に答えて運命が変わる', boss: '紅蓮の女王' }[n])))));
      root.appendChild(h('button', { class: 'btn ghost small', onclick: () => UI.confirm('撤退', 'このランをあきらめますか？（ここまでの層に応じた研究Pはもらえる）', '撤退する', () => { const out = Bt.abandonRun(s, Date.now()); if (out) BUI.showRunEnd(out); }, 'danger') }, '🏳 撤退'));
    },
  });
  function eventQuestion(ev) {
    const s = UI.state;
    const holder = h('div', {});
    let res = null, done = false;
    const close = UI.modal({ title: '❓ ' + ev.title, body: holder, noClose: true, cls: 'q-modal' });
    const panel = MF.QuizUI.createPanel(holder, { compact: true, allowHints: false, allowSkip: false, oneShot: true, autoNext: 900, nextLabel: 'つづける ▶', onDone: (r) => { res = r; },
      next: () => { if (done) return null; done = true; panel.destroy(); close(); const out = Bt.resolveEvent(s, !!(res && res.ok && res.attempt === 1)); UI.toast(out ? out.text : '', res && res.ok ? 'good' : 'bad', 3500); UI.rerender(); return null; } });
    const t = U.randPick(s, G.availableTopics(s));
    panel.load(G.Quiz.next(s, Date.now(), { topic: t, level: G.Quiz.levelFor(s, t), mode: 'battle', source: 'event' }));
  }

  // ---------- 工場とのつながり ----------
  FUI.paletteOrder.push('turret');
  FUI.infoExtras.unshift((s, b, box, rerender) => {
    if (!b.disabled) return;
    const cost = F.repairCost(s, b);
    box.appendChild(h('div', { class: 'repair-row' }, h('b', { class: 'bad' }, '💥 故障中'), h('span', { class: 'cost' }, UI.costNodes(cost)),
      h('button', { class: 'btn small primary', disabled: !G.has(s, cost), onclick: () => { const r = F.repair(s, b.id); UI.toast(r.ok ? '修理した！' : r.reason, r.ok ? 'good' : 'warn'); rerender(); } }, '🔧 修理')));
  });
  FUI.overlayDraw.push((ctx, s, b, x, y, cs) => {
    if (!b.disabled) return;
    ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
    ctx.font = Math.floor(cs * 0.4) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💥', x + cs / 2, y + cs / 2);
  });
  UI.headerExtras.push((s) => {
    if (!s.battle.raid.pending && !(s.battle.active)) return null;
    const left = s.battle.active ? '戦闘中' : U.fmtClock((s.battle.raid.pending.deadline - Date.now()) / 1000);
    return h('button', { class: 'raid-chip', onclick: () => UI.go(s.battle.active ? 'battle' : 'defense') }, '🚨 ' + left);
  });
  UI.noticeHandlers.raid = (n) => {
    UI.toast(n.text, 'bad', 6000);
    sfx('alarm');
    if (MF.FX && MF.FX.alert) MF.FX.alert();
    return true;
  };
})(globalThis.MF = globalThis.MF || {});
