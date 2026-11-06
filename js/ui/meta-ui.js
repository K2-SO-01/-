/* 数学ファクトリー：実績・称号・ログインボーナス・1日の目標・日替わりチャレンジ・ガチャ・統計 */
(function (MF) {
  'use strict';
  const UI = MF.UI, M = MF.Meta, G = MF.Game, U = MF.Util, Qs = MF.Questions, B = MF.Balance;
  const h = UI.h;
  const MUI = { tab: 'ach' };
  MF.MetaUI = MUI;
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };

  // ---------- 小さなグラフ部品（単色・値は文字で、ホバーで詳細） ----------
  const Charts = {};
  MF.Charts = Charts;
  /** 横棒：rows [{label, v(0..1) , text, title}] */
  Charts.hbars = function (rows) {
    return h('div', { class: 'hbars', role: 'list' }, rows.map((r) => h('div', { class: 'hb-row', role: 'listitem', title: r.title || '' },
      h('span', { class: 'hb-lbl' }, r.label),
      h('span', { class: 'hb-track' }, r.empty ? null : h('span', { class: 'hb-fill', style: { width: Math.max(1.5, r.v * 100).toFixed(1) + '%' } })),
      h('span', { class: 'hb-val' }, r.text))));
  };
  /** 縦棒（日別の量） */
  Charts.vbars = function (pts, opts) {
    const W = 600, H = 170, padL = 30, padB = 22, padT = 14;
    const max = Math.max(opts.min || 1, ...pts.map((p) => p.v));
    const bw = (W - padL) / pts.length;
    const svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" role="img" aria-label="' + U.esc(opts.label) + '">'];
    [0, 0.5, 1].forEach((k) => { const y = padT + (H - padT - padB) * (1 - k); svg.push('<line x1="' + padL + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (padL - 4) + '" y="' + (y + 4) + '" class="ax" text-anchor="end">' + Math.round(max * k) + '</text>'); });
    pts.forEach((p, i) => {
      const hh = (H - padT - padB) * (p.v / max);
      const x = padL + i * bw + 3, w = Math.max(2, bw - 6), y = H - padB - hh;
      svg.push('<g class="hov"><rect x="' + (padL + i * bw) + '" y="' + padT + '" width="' + bw + '" height="' + (H - padT - padB) + '" fill="transparent"/>' +
        (p.v > 0 ? '<path d="M' + x + ' ' + (H - padB) + ' V' + (y + 4) + ' q0 -4 4 -4 H' + (x + w - 4) + ' q4 0 4 4 V' + (H - padB) + ' Z" class="bar-m"/>' : '') +
        '<title>' + U.esc(p.title || (p.label + '：' + p.v)) + '</title></g>');
      if (i % Math.ceil(pts.length / 7) === 0 || i === pts.length - 1) svg.push('<text x="' + (padL + i * bw + bw / 2) + '" y="' + (H - 6) + '" class="ax" text-anchor="middle">' + p.label + '</text>');
    });
    svg.push('</svg>');
    return h('div', { class: 'chart', html: svg.join('') });
  };
  /** 折れ線（日別の正答率 0..1、データなしの日は線を切る） */
  Charts.line = function (pts, opts) {
    const W = 600, H = 170, padL = 34, padB = 22, padT = 14;
    const n = pts.length, sx = (i) => padL + (W - padL - 10) * (n > 1 ? i / (n - 1) : 0.5), sy = (v) => padT + (H - padT - padB) * (1 - v);
    const svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" role="img" aria-label="' + U.esc(opts.label) + '">'];
    [0, 0.5, 1].forEach((k) => svg.push('<line x1="' + padL + '" x2="' + W + '" y1="' + sy(k) + '" y2="' + sy(k) + '" class="grid"/><text x="' + (padL - 4) + '" y="' + (sy(k) + 4) + '" class="ax" text-anchor="end">' + Math.round(k * 100) + '%</text>'));
    let d = '', pen = false;
    pts.forEach((p, i) => { if (p.v === null) { pen = false; return; } d += (pen ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(p.v).toFixed(1) + ' '; pen = true; });
    svg.push('<path d="' + d + '" class="line-m"/>');
    pts.forEach((p, i) => {
      if (i % Math.ceil(n / 7) === 0 || i === n - 1) svg.push('<text x="' + sx(i) + '" y="' + (H - 6) + '" class="ax" text-anchor="middle">' + p.label + '</text>');
      if (p.v === null) return;
      svg.push('<g class="hov"><circle cx="' + sx(i) + '" cy="' + sy(p.v) + '" r="12" fill="transparent"/><circle cx="' + sx(i) + '" cy="' + sy(p.v) + '" r="4" class="dot-m"/><title>' + U.esc(p.title) + '</title></g>');
    });
    svg.push('</svg>');
    return h('div', { class: 'chart', html: svg.join('') });
  };

  // ---------- 統計（受験対策の中のタブ） ----------
  MF.StudyUI.tabs.push({
    id: 'stats', label: '統計', render(box, s) {
      const st = s.stats;
      const accAll = st.answered ? st.correct / st.answered : 0;
      const totalMs = Object.values(st.byTopic).reduce((a, b) => a + (b.ms || 0), 0) + ((st.easy && st.easy.ms) || 0);
      box.appendChild(h('div', { class: 'tiles' },
        tile('解いた問題', st.answered + ' 問'), tile('正答率', Math.round(accAll * 100) + '%'), tile('最大コンボ', s.quiz.maxCombo), tile('考えた時間', U.fmtTime(totalMs / 1000)), tile('連続ログイン', s.meta.login.streak + ' 日')));
      const E = Qs.EASY_MODE, ez = st.easy;
      if (ez && ez.a) box.appendChild(h('p', { class: 'small muted easy-stat' }, E.icon + ' うち ' + E.name + 'の' + E.subject + '：' + ez.a + ' 問（正解 ' + ez.c + '）。受験の成績には入れていないよ。入れたら泣くのは本番のあなただから。'));
      const topics = G.availableTopics(s);
      box.appendChild(UI.section('分野別の正答率', h('p', { class: 'tiny muted' }, '1回目で正解した割合。バーにふれると詳しく見られる。'),
        Charts.hbars(topics.map((t) => {
          const b = st.byTopic[t] || { a: 0, c: 0 };
          const v = b.a ? b.c / b.a : 0;
          return { label: Qs.TOPICS[t].name, v, empty: !b.a, text: b.a ? Math.round(v * 100) + '%（' + b.a + '問）' : 'まだ', title: Qs.TOPICS[t].name + '：' + b.c + '/' + b.a + ' 正解・いまの難易度「' + Qs.LEVEL_NAMES[s.quiz.levels[t] || 0] + '」' };
        }))));
      const now = Date.now(), days = [];
      for (let i = 13; i >= 0; i--) { const key = U.dateStr(now - i * 86400000); const d = st.days[key]; days.push({ key, label: key.slice(5).replace('-', '/'), a: d ? d.a : 0, c: d ? d.c : 0 }); }
      box.appendChild(UI.section('この14日間に解いた問題数', Charts.vbars(days.map((d) => ({ label: d.label, v: d.a, title: d.key + '：' + d.a + ' 問' })), { label: '日別の解答数', min: 5 })));
      box.appendChild(UI.section('この14日間の正答率', Charts.line(days.map((d) => ({ label: d.label, v: d.a ? d.c / d.a : null, title: d.key + '：' + (d.a ? Math.round(d.c / d.a * 100) + '%（' + d.c + '/' + d.a + '）' : 'なし') })), { label: '日別の正答率' })));
      const tbl = h('table', { class: 'tbl' }, h('tr', {}, ['分野', '解答', '正解', '正答率', '難易度', '平均時間'].map((x) => h('th', {}, x))),
        topics.map((t) => { const b = st.byTopic[t] || { a: 0, c: 0, ms: 0 }; return h('tr', {}, h('td', {}, Qs.TOPICS[t].name), h('td', {}, b.a), h('td', {}, b.c), h('td', {}, b.a ? Math.round(b.c / b.a * 100) + '%' : '-'), h('td', {}, Qs.LEVEL_NAMES[s.quiz.levels[t] || 0]), h('td', {}, b.a ? Math.round(b.ms / b.a / 1000) + '秒' : '-')); }));
      box.appendChild(h('details', { class: 'card' }, h('summary', {}, '📋 表で見る'), tbl));
    },
  });
  function tile(label, v) { return h('div', { class: 'tile' }, h('span', { class: 'tile-v' }, String(v)), h('span', { class: 'tile-l' }, label)); }
  MUI.tile = tile;

  // ---------- 日替わりチャレンジ ----------
  MUI.startChallenge = function () {
    const s = UI.state;
    const ch = M.today(s, Date.now());
    let score = 0, served = 0, failed = false, deadline = null, ended = false;
    MF.QuizUI.startSession({
      mode: 'challenge', title: '⏱️ ' + ch.title, allowHints: false, oneShot: true,
      status: () => ch.kind === 'time' ? '正解 ' + score + '・のこり ' + Math.max(0, Math.ceil(((deadline || Date.now() + ch.seconds * 1000) - Date.now()) / 1000)) + '秒' : '正解 ' + score + ' / ' + ch.n,
      next: (st) => {
        if (ch.kind === 'time') { if (!deadline) deadline = Date.now() + ch.seconds * 1000; if (Date.now() > deadline) return null; }
        else if (served >= ch.n || failed) return null;
        served++;
        return G.Quiz.next(st, Date.now(), { topic: ch.topic, level: ch.level !== null ? ch.level : G.Quiz.levelFor(st, ch.topic, G.Quiz.easyOn(st)), mode: 'challenge', source: 'challenge' });
      },
      onDone: (st, res) => { if (res.ok && res.attempt === 1) score++; else if (ch.kind === 'nomiss') failed = true; },
      tick: () => {
        if (ch.kind !== 'time' || !deadline || ended) return;
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        const el = document.getElementById('session-status');
        if (el) el.textContent = '正解 ' + score + '・のこり ' + left + '秒';
        if (left <= 0) { ended = true; MF.QuizUI.endSession(true); }
      },
      onEnd: (st) => {
        const r = M.finishChallenge(st, Date.now(), score);
        UI.go('awards', { tab: 'daily' });
        UI.modal({ title: r.pass ? '🎉 チャレンジ成功！' : 'チャレンジ終了', body: h('div', {}, h('p', {}, '記録：' + score + '（目標 ' + ch.target + '）・今日のベスト ' + r.best), r.reward ? h('p', { class: 'good' }, '報酬：研究P +' + r.reward.rp + '・ガチャチケット ' + r.reward.ticket + '枚') : null, !r.pass ? h('p', { class: 'small muted' }, '何度でも挑戦できるよ！') : null), buttons: [{ label: 'OK', cls: 'primary' }] });
        sfx(r.pass ? 'victory' : 'click');
      },
    });
  };

  // ---------- ガチャ ----------
  function gachaResult(res) {
    const s = UI.state;
    const body = h('div', { class: 'gacha-res' }, res.map((r, i) => {
      const k = M.skinById[r.id];
      return h('div', { class: 'gr-item r' + r.rarity, style: { animationDelay: (i * 0.08) + 's' } }, h('span', { class: 'gr-rar' }, M.RAR[r.rarity]), skinPreview(k), h('span', { class: 'small' }, k.name), r.dup ? h('span', { class: 'tiny muted' }, 'かぶり→かけら+' + M.SHARD_VALUE[r.rarity]) : h('span', { class: 'new-badge' }, 'NEW'));
    }));
    UI.modal({ title: '🎰 ガチャ結果', body, cls: 'wide', buttons: [{ label: 'OK', cls: 'primary' }] });
    const best = Math.max(...res.map((r) => r.rarity));
    sfx(best >= 3 ? 'levelup' : 'gacha');
    if (best >= 3 && MF.FX && MF.FX.confetti) MF.FX.confetti();
  }
  function skinPreview(k) {
    if (k.kind === 'theme') return h('span', { class: 'skin-prev' }, Object.values(k.colors).slice(0, 4).map((c) => h('span', { class: 'sw', style: { background: c, boxShadow: k.glow ? '0 0 6px ' + k.glow : '' } })));
    if (k.kind === 'acc') return h('span', { html: MF.PalArt.svg('parabon', { size: 54, skin: { acc: k.acc } }) });
    const sk = k.hue === 'shiny' ? M.palSkin({}, { sp: 'parabon', color: k.id }) : { color: k.color, belly: k.belly };
    return h('span', { html: MF.PalArt.svg('parabon', { size: 54, skin: sk }) });
  }

  // ---------- 相棒のスキン選び（相棒の詳細画面で使う） ----------
  MF.PalsUI.skinPicker = function (s, pal) {
    const owned = M.SKINS.filter((k) => (k.kind === 'acc' || k.kind === 'color') && s.meta.skins[k.id]);
    if (!owned.length) return h('p', { class: 'tiny muted' }, '着せかえ：ガチャでアクセサリーや色違いが手に入る');
    return h('div', {}, h('div', { class: 'small' }, '着せかえ（タップで付けはずし）'), h('div', { class: 'chip-wrap' }, owned.map((k) => h('button', { class: 'btn small' + ((pal.skin === k.id || pal.color === k.id) ? ' primary' : ''), onclick: (e) => { M.setPalSkin(s, pal.id, k.id); e.target.classList.toggle('primary'); UI.toast('着せかえを変えた（保存で反映）', 'info', 1200); } }, k.name))));
  };
  MF.FactoryUI.skinColor = (s, b) => M.themeColor(s, b.type);
  MF.FactoryUI.overlayDraw.unshift((ctx, s, b, x, y, cs) => {
    const th = s.meta.theme && M.skinById[s.meta.theme];
    if (!th || !th.glow || b.type === 'belt' || b.type === 'core') return;
    // 光る枠（ドット絵なので、ぼかさずに点の枠を2重に）
    const u = cs / 16, D = MF.FactoryUI.dot;
    ctx.save(); ctx.fillStyle = th.glow;
    D(ctx, x, y, u, 0, 0, 16, 1); D(ctx, x, y, u, 0, 15, 16, 1); D(ctx, x, y, u, 0, 0, 1, 16); D(ctx, x, y, u, 15, 0, 1, 16);
    ctx.globalAlpha = 0.4; D(ctx, x, y, u, 2, 2, 12, 1); D(ctx, x, y, u, 2, 13, 12, 1); D(ctx, x, y, u, 2, 2, 1, 12); D(ctx, x, y, u, 13, 2, 1, 12);
    ctx.restore();
  });

  // ---------- 実績画面 ----------
  MUI.tabs = [
    { id: 'ach', label: '実績', render(box, s) {
      const n = Object.keys(s.meta.ach).length;
      box.appendChild(h('p', { class: 'small' }, '解除 ', h('b', {}, n), ' / ' + M.ACH.length + '。解除すると称号が手に入り、研究Pももらえる。'));
      box.appendChild(h('div', { class: 'ach-grid' }, M.ACH.map((a) => {
        const got = s.meta.ach[a.id];
        return h('div', { class: 'ach' + (got ? ' got' : '') }, h('span', { class: 'ach-ico' }, got ? a.icon : '🔒'), h('span', {}, h('b', { class: 'small' }, a.name), h('span', { class: 'tiny muted block' }, a.desc), h('span', { class: 'tiny block ' + (got ? 'good' : 'muted') }, '称号「' + a.title + '」')));
      })));
    } },
    { id: 'title', label: '称号', render(box, s) {
      const ts = M.titles(s);
      box.appendChild(h('p', { class: 'small' }, 'えらんだ称号は画面の上に表示される。'));
      if (!ts.length) { box.appendChild(h('div', { class: 'empty' }, '実績を解除すると称号が手に入るよ')); return; }
      box.appendChild(h('div', { class: 'chip-wrap' }, h('button', { class: 'btn small' + (!s.meta.title ? ' primary' : ''), onclick: () => { M.setTitle(s, null); UI.rerender(); } }, 'なし'),
        ts.map((t) => h('button', { class: 'btn small' + (s.meta.title === t ? ' primary' : ''), onclick: () => { M.setTitle(s, t); UI.rerender(); } }, t))));
    } },
    { id: 'daily', label: '今日の目標', render(box, s) {
      const now = Date.now();
      const cnt = M.todayCount(s, now), goal = s.meta.dailyGoal;
      const done = s.meta.goalDone === U.dateStr(now);
      box.appendChild(UI.section('✅ 1日の目標', UI.bar(Math.min(cnt, goal), goal, 'green', cnt + ' / ' + goal + ' 問'),
        h('p', { class: 'small' }, done ? '今日の目標は達成ずみ！ えらい！' : '達成すると研究P +' + B.meta.goalReward.rp + ' と演算チャージ満タン。'),
        h('div', { class: 'row small' }, '目標の問題数：', h('select', { onchange: (e) => { s.meta.dailyGoal = +e.target.value; UI.rerender(); } }, [5, 10, 15, 20, 30, 40, 50, 80, 100].map((v) => h('option', { value: v, selected: v === goal ? true : null }, v + ' 問'))))));
      const ch = M.today(s, now), rec = s.meta.challenges[ch.date] || { best: 0, cleared: false, tries: 0 };
      box.appendChild(UI.section('⏱️ 日替わりチャレンジ', h('p', {}, h('b', {}, ch.title), '：' + ch.desc),
        h('p', { class: 'small muted' }, 'ヒントなし。' + (rec.cleared ? '✔ 今日はクリアずみ（ベスト ' + rec.best + '）' : 'クリア報酬：研究P +' + B.meta.challengeReward.rp + '・ガチャチケット1枚') + '・挑戦 ' + rec.tries + ' 回'),
        h('button', { class: 'btn primary', onclick: () => MUI.startChallenge() }, rec.tries ? 'もう一度挑戦' : '挑戦する')));
      const L = s.meta.login;
      box.appendChild(UI.section('📅 ログインボーナス', h('p', { class: 'small' }, '連続 ' + L.streak + ' 日・通算 ' + L.total + ' 日'),
        h('div', { class: 'login-row' }, M.LOGIN_REWARDS.map((r, i) => h('div', { class: 'login-day' + (i < ((L.streak - 1) % 7) + 1 ? ' got' : '') }, h('b', {}, (i + 1) + '日目'), h('span', { class: 'tiny' }, r.text))))));
    } },
    { id: 'gacha', label: 'ガチャ', render(box, s) {
      box.appendChild(h('p', { class: 'small' }, '研究Pかチケットで回せる、工場と相棒の着せかえガチャ。', h('b', {}, '課金は一切なし。'), ' かぶったら「かけら」になり、好きなスキンと交換できる。'));
      box.appendChild(h('div', { class: 'row' }, h('span', {}, '🎫 チケット ', h('b', {}, s.meta.tickets)), h('span', {}, '🧩 かけら ', h('b', {}, s.meta.shards)), h('span', {}, '研究P ', h('b', {}, Math.floor(s.rp)))));
      box.appendChild(h('div', { class: 'row gacha-btns' },
        h('button', { class: 'btn primary big-btn', onclick: () => { const r = M.gacha(s, 1); if (!r.ok) UI.toast(r.reason, 'warn'); else { gachaResult(r.res); UI.rerender(); } } }, '1回（' + (s.meta.tickets >= 1 ? 'チケット1' : '研究P ' + B.meta.gachaCost) + '）'),
        h('button', { class: 'btn primary big-btn', onclick: () => { const r = M.gacha(s, 10); if (!r.ok) UI.toast(r.reason, 'warn'); else { gachaResult(r.res); UI.rerender(); } } }, '10回（' + (s.meta.tickets >= 10 ? 'チケット10' : '研究P ' + B.meta.gacha10Cost) + '）')));
      box.appendChild(h('p', { class: 'tiny muted' }, '出る確率：N ' + M.RATES[1] * 100 + '%・R ' + M.RATES[2] * 100 + '%・SR ' + M.RATES[3] * 100 + '%・SSR ' + M.RATES[4] * 100 + '%（30回以内にSR以上が必ず出る）'));
      box.appendChild(h('h4', {}, '工場のテーマ'));
      box.appendChild(h('div', { class: 'skin-grid' }, h('button', { class: 'skin' + (!s.meta.theme ? ' on' : ''), onclick: () => { M.setTheme(s, null); UI.rerender(); } }, h('span', { class: 'small' }, 'ふつう')),
        M.SKINS.filter((k) => k.kind === 'theme').map((k) => skinTile(s, k, () => { M.setTheme(s, s.meta.theme === k.id ? null : k.id); UI.rerender(); }, s.meta.theme === k.id))));
      box.appendChild(h('h4', {}, '相棒の着せかえ'), h('p', { class: 'tiny muted' }, '相棒の画面 →「くわしく」で付けられる。'));
      box.appendChild(h('div', { class: 'skin-grid' }, M.SKINS.filter((k) => k.kind !== 'theme').map((k) => skinTile(s, k, null, false))));
    } },
  ];
  function skinTile(s, k, onUse, on) {
    const owned = !!s.meta.skins[k.id];
    return h('div', { class: 'skin r' + k.rarity + (owned ? '' : ' locked') + (on ? ' on' : '') },
      h('span', { class: 'gr-rar' }, M.RAR[k.rarity]), skinPreview(k), h('span', { class: 'small' }, k.name),
      owned ? (onUse ? h('button', { class: 'btn small', onclick: onUse }, on ? '使用中' : '使う') : h('span', { class: 'tiny good' }, '所持')) :
        h('button', { class: 'btn small ghost', disabled: s.meta.shards < M.EXCHANGE[k.rarity], onclick: () => { if (M.exchange(s, k.id)) { UI.toast(k.name + ' と交換した！', 'good'); UI.rerender(); } } }, '🧩' + M.EXCHANGE[k.rarity] + 'で交換'));
  }
  UI.screen('awards', {
    title: '実績・ご褒美', short: '実績', icon: '🏆', nav: 'more', navOrder: 7,
    sig: (s) => [Object.keys(s.meta.ach).length, M.todayCount(s, Date.now()), s.meta.goalDone, s.meta.tickets, s.meta.shards, Object.keys(s.meta.skins).length, MUI.tab === 'gacha' ? Math.floor(s.rp / 60) : 0].join('|'),
    render(root, s, params) {
      if (params && params.tab) MUI.tab = params.tab;
      root.appendChild(h('h2', { class: 'screen-title' }, '実績・ご褒美'));
      const tabs = h('div', { class: 'tabs' });
      MUI.tabs.forEach((t) => tabs.appendChild(h('button', { class: 'tab' + (MUI.tab === t.id ? ' on' : ''), onclick: () => { MUI.tab = t.id; UI.params = {}; UI.rerender(); } }, t.label)));
      root.appendChild(tabs);
      const box = h('div', { class: 'tab-body' });
      root.appendChild(box);
      (MUI.tabs.find((t) => t.id === MUI.tab) || MUI.tabs[0]).render(box, s);
    },
  });

  // ---------- 出題画面に「今日の目標」 ----------
  MF.QuizUI.extraRow.push((s) => {
    const now = Date.now(), cnt = M.todayCount(s, now), goal = s.meta.dailyGoal, done = s.meta.goalDone === U.dateStr(now);
    return h('button', { class: 'goal-strip' + (done ? ' done' : ''), onclick: () => UI.go('awards', { tab: 'daily' }) }, h('span', { class: 'small' }, done ? '✅ 今日の目標達成！' : '🎯 今日の目標'), UI.bar(Math.min(cnt, goal), goal, 'green', cnt + ' / ' + goal));
  });
  // ヘッダーの称号
  UI.headerExtras.unshift((s) => (s.meta.title ? h('span', { class: 'title-badge', title: '称号' }, '「' + s.meta.title + '」') : null));

  // ---------- 通知 ----------
  UI.noticeHandlers.ach = (n) => { UI.toast(n.text, 'good', 4000); sfx('achievement'); return true; };
  UI.noticeHandlers.goal = (n) => { UI.toast(n.text, 'good', 4000); sfx('levelup'); if (MF.FX && MF.FX.confetti) MF.FX.confetti(); return true; };

  // ---------- 起動時：ログインボーナス ----------
  MF.App.bootHooks.push((s, info) => {
    const r = M.login(s, Date.now());
    if (!r) return;
    if (info && info.fresh) { setTimeout(() => UI.toast('📅 ログインボーナス：' + r.reward.text + '（毎日ログインでご褒美！）', 'good', 5000), 20000); return; }
    setTimeout(() => UI.modal({ title: '📅 ログインボーナス', body: h('div', {},
      h('p', {}, '連続 ' + r.streak + ' 日目！'),
      h('div', { class: 'login-row' }, M.LOGIN_REWARDS.map((x, i) => h('div', { class: 'login-day' + (i < r.day ? ' got' : '') + (i === r.day - 1 ? ' today' : '') }, h('b', {}, (i + 1) + '日目'), h('span', { class: 'tiny' }, x.text)))),
      h('p', {}, '今日のご褒美：', h('b', {}, r.reward.text))), buttons: [{ label: '受け取る', cls: 'primary' }] }), 600);
  });
  MF.App.dayCheck = function () { const s = UI.state; const r = M.login(s, Date.now()); if (r) UI.toast('📅 日付が変わった！ ログインボーナス：' + r.reward.text, 'good', 4000); };
  setInterval(() => { if (UI.state) MF.App.dayCheck(); }, 60000);
})(globalThis.MF = globalThis.MF || {});
