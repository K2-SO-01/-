/* 数学ファクトリー：チュートリアル
 * ・光らせて指す案内（画面を暗くして、押す場所だけを四すみのカギかっこで光らせる。ナビが吹き出しで説明）
 * ・画面ごとのガイド（「ていねい」モードなら、はじめてその画面を開いたときに自動で出る）
 * ・ミッションのガイド（「やり方」から。ていねいモードならミッションの会話のあとに自動で）
 * ・船内マニュアル（いつでも開けるヘルプ画面。ヘッダーの「？」からも）
 * ・最初に「はじめて遊ぶ／慣れてる」を選ぶ（設定で変えられる） */
(function (MF) {
  'use strict';
  const UI = MF.UI, G = MF.Game, St = MF.Story, F = MF.Factory;
  const h = UI.h;
  const SUI = MF.StoryUI;
  const Tut = { cur: null };
  MF.Tutorial = Tut;
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };

  Tut.mode = (s) => (s.settings && s.settings.tutorial) || 'short'; // 'full'：ていねい、'short'：最小限
  Tut.seen = (s, id) => !!(s.flags && s.flags.tours && s.flags.tours[id]);
  Tut.mark = (s, id) => { s.flags = s.flags || {}; (s.flags.tours = s.flags.tours || {})[id] = 1; };

  // ---------- 指す先をさがす ----------
  const visible = (e) => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  /** t：CSSセレクタ / {sel, text} / 関数。見えている最初の要素を返す */
  function find(t) {
    if (!t) return null;
    if (typeof t === 'function') { const e = t(); return visible(e) ? e : null; }
    const sel = typeof t === 'string' ? t : t.sel, text = typeof t === 'string' ? null : t.text;
    for (const e of document.querySelectorAll(sel)) if (visible(e) && (!text || e.textContent.indexOf(text) >= 0)) return e;
    return null;
  }
  Tut.find = find;

  // ---------- 光らせて指す案内 ----------
  /** steps：[{ at, text, go, tab, click, until, optional }]
   *  at：指す先（なければ真ん中に吹き出しだけ）、go：先に開く画面、click：指した所を押したら次へ、until：(s) => 条件がそろったら次へ、optional：見つからなければ飛ばす */
  Tut.run = function (id, steps, opts) {
    opts = opts || {};
    if (Tut.cur) Tut.cur.close(true);
    const s = UI.state;
    steps = steps.filter(Boolean);
    if (!steps.length) return;
    let i = -1, target = null, waitT = 0, timer = null, clickHandler = null, closed = false;
    const root = h('div', { class: 'tut', role: 'dialog', 'aria-label': 'ナビの案内' });
    const shades = [0, 1, 2, 3].map(() => h('div', { class: 'tut-shade' }));
    const frame = h('div', { class: 'tut-frame' });
    const text = h('div', { class: 'tut-text' });
    const count = h('span', { class: 'tut-count tiny' });
    const nextBtn = h('button', { class: 'btn primary small', onclick: () => next() }, '次へ');
    const skipBtn = h('button', { class: 'btn ghost small', onclick: () => close() }, 'ガイドを閉じる');
    const doHint = h('div', { class: 'tut-do tiny' });
    const bubble = h('div', { class: 'tut-bubble' },
      h('div', { class: 'tut-head' }, h('span', { class: 'tut-face', html: SUI.navi(36) }), h('b', {}, 'ナビ'), count),
      text, doHint, h('div', { class: 'tut-btns' }, skipBtn, nextBtn));
    shades.forEach((x) => root.appendChild(x));
    root.append(frame, bubble);
    document.body.appendChild(root);
    const close = (silent) => {
      if (closed) return; closed = true;
      clearInterval(timer);
      if (clickHandler) document.removeEventListener('click', clickHandler, true);
      root.remove();
      UI.modalStack = UI.modalStack.filter((x) => x !== close);
      if (Tut.cur && Tut.cur.close === close) Tut.cur = null;
      Tut.mark(s, id);
      if (!silent && opts.done) opts.done();
      UI.rerender();
    };
    UI.modalStack.push(close); // ほかの小窓や会話は、案内が終わるまで待つ
    Tut.cur = { id, close, root };
    function place() {
      const st = steps[i];
      if (!st) return;
      target = find(st.at);
      const W = innerWidth, H = innerHeight;
      if (target) {
        const r = target.getBoundingClientRect(), p = 6;
        const x0 = Math.max(0, r.left - p), y0 = Math.max(0, r.top - p), x1 = Math.min(W, r.right + p), y1 = Math.min(H, r.bottom + p);
        const set = (e, x, y, w, hh) => Object.assign(e.style, { left: x + 'px', top: y + 'px', width: Math.max(0, w) + 'px', height: Math.max(0, hh) + 'px' });
        set(shades[0], 0, 0, W, y0); set(shades[1], 0, y1, W, H - y1); set(shades[2], 0, y0, x0, y1 - y0); set(shades[3], x1, y0, W - x1, y1 - y0);
        set(frame, x0, y0, x1 - x0, y1 - y0); frame.style.display = '';
        // 吹き出しは、指す先の下（入らなければ上）
        const bw = Math.min(380, W - 32), bh = bubble.offsetHeight || 140;
        const below = H - y1 - 22, above = y0 - 22;
        let top;
        if (bh <= below) top = y1 + 10;              // 下に入る
        else if (bh <= above) top = y0 - bh - 10;    // 上に入る
        else top = below >= above ? Math.min(H - bh - 12, y1 + 10) : Math.max(12, y0 - bh - 10); // 広いほうに寄せる
        top = Math.max(12, Math.min(top, H - bh - 12));
        const left = Math.min(Math.max(16, (x0 + x1) / 2 - bw / 2), W - bw - 16);
        Object.assign(bubble.style, { left: left + 'px', top: top + 'px', width: bw + 'px' });
      } else {
        Object.assign(shades[0].style, { left: 0, top: 0, width: W + 'px', height: H + 'px' });
        [1, 2, 3].forEach((k) => Object.assign(shades[k].style, { width: 0, height: 0 }));
        frame.style.display = 'none';
        const bw = Math.min(380, W - 32);
        Object.assign(bubble.style, { left: (W - bw) / 2 + 'px', top: Math.max(16, H / 2 - (bubble.offsetHeight || 140) / 2) + 'px', width: bw + 'px' });
      }
    }
    function show() {
      const st = steps[i];
      if (st.go && UI.current !== st.go) UI.go(st.go, st.tab ? { tab: st.tab } : undefined);
      if (st.before) st.before(s);
      waitT = 0;
      text.textContent = St.fmt(s, st.text);
      count.textContent = (i + 1) + ' / ' + steps.length;
      const waiting = st.click || st.until;
      nextBtn.style.display = waiting ? 'none' : '';
      nextBtn.textContent = i === steps.length - 1 ? 'わかった' : '次へ';
      doHint.textContent = st.click ? '▶ 光っているところを押してください' : st.until ? '▶ やってみてください（できたら次へ進みます）' : '';
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      setTimeout(() => { const e = find(st.at); if (e) { const r = e.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 70 || r.left < 0 || r.right > innerWidth) e.scrollIntoView({ block: 'center', inline: 'center' }); } place(); if (!waiting) try { nextBtn.focus({ preventScroll: true }); } catch (e) { /* noop */ } }, 60);
      sfx('tick');
    }
    function next() {
      i++;
      while (i < steps.length && steps[i].skipIf && steps[i].skipIf(s)) i++;
      if (i >= steps.length) { close(); return; }
      show();
    }
    clickHandler = (e) => {
      const st = steps[i];
      if (!st || !st.click || !target || !target.contains(e.target)) return;
      const at = i;
      setTimeout(() => { if (!closed && i === at) next(); }, 250);
    };
    document.addEventListener('click', clickHandler, true);
    timer = setInterval(() => {
      if (closed) return;
      const st = steps[i];
      if (!st) return;
      waitT += 0.25;
      if (st.until && st.until(s)) { next(); return; }
      const e = find(st.at);
      if (!e && st.at && st.optional && waitT > 1.5) { next(); return; }
      // 画面が描きなおされて見えなくなったら、もう一度見える所までずらす（横はいつでも、縦は完全に外れたときだけ）
      if (e) { const r = e.getBoundingClientRect(); if (r.left < 0 || r.right > innerWidth || r.bottom < 0 || r.top > innerHeight) e.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      place();
    }, 250);
    addEventListener('resize', place);
    next();
    return close;
  };

  // ---------- 画面ごとのガイド ----------
  const has = (sel) => () => !find(sel);
  const count = (s, t) => F.count(s, t);
  Tut.SCREENS = {
    quiz: [
      { text: '計算ラボです。ここで問題を解くと、資源と研究ポイントが手に入ります。工場の燃料もここで生まれます。つまり、全部ここから始まります。' },
      { at: '#screen .q-text', text: '問題文です。読んでから答えてください。読まずに答える船長もいますが、おすすめしません。' },
      { at: '#screen .q-ans', text: '答えの入力欄です。分数は 3/4、負の数は -2 のように入力します。小数も使えます。' },
      { at: '#screen .q-actions', text: 'ヒントは3段階、最後は完全解説です。スキップは不正解あつかいで、弱点リストに入ります。逃げても記録は残ります。' },
      { at: '.topic-chips', text: '分野の切りかえ。「おまかせ」なら、苦手な分野と忘れかけの分野を多めに出します。正解すると、その分野の資源がもらえます。' },
      { at: '.level-row .seg', text: '難易度。「自動」なら正答率に合わせて上げ下げします。切りかえは次の問題から。今の問題からは逃げられません。' },
      { at: '.combo-meter', text: '続けて1回で正解するとコンボ。もらえる資源が増えます。まちがえると0にもどります。' },
      { at: '#res-strip', text: '持ち物です。押すと一覧が見られます。' },
      { at: '.charge-chip', text: '演算チャージ。正解でたまり、工場をフル稼働させます。切れると工場は25%の速さ。船長が休むと工場も休みます。' },
    ],
    factory: [
      { text: '工場です。鉱石を掘って、溶かして、組み立てて、本船のコアに届けます。届いた品物が持ち物になります。' },
      { at: '.fac-canvas-wrap', text: 'マップです。色のついたマスが鉱脈、🛸のマスが本船のコア。指でなぞると移動、右下の＋−で拡大・縮小。' },
      { at: '.tools', text: '道具です。「調べる」で設備の情報、「建てる」で設置、「回す」で向き、「撤去」で片づけ。' },
      { at: '.fac-status', text: '電力・演算チャージ・稼働数など。電力が足りないと、設備は遅くなります。' },
      { at: '.fac-guide', text: '工場のしくみは、ここにまとまっています。読む価値はあります。わたしが書いたので。', optional: true },
    ],
    research: [
      { text: '研究ツリーです。研究ポイントを払い、指定された分野の問題に正解すると、新しい設備や強化が手に入ります。' },
      { at: '.tech.available', text: '研究のカード。必要な研究ポイントと、正解の数が書いてあります。「研究を始める」で開始です。', optional: true },
      { at: '#res-strip', text: '研究ポイントは持ち物の「R」です。正解や研究所でたまります。' },
      { at: '.tier-title', text: '下の段ほど高度な研究です。前提の研究が終わると、えらべるようになります。', optional: true },
    ],
    pals: [
      { text: '相棒です。卵からかえる、この星の生き物です。食料ではありません。' },
      { at: '#screen .tabs', text: '「相棒」「卵」「図鑑」の切りかえです。' },
      { at: '.pal-card', text: '同じ分野の問題を解くと育ちます。工場の設備に配置すると、得意な作業が速くなります。', optional: true },
      { at: '.egg-card', text: '卵は、正解を重ねるとかえります。', optional: true },
    ],
    defense: [
      { text: '防衛司令室です。赤い群れから工場を守ります。' },
      { at: { sel: '.card', text: '襲撃' }, text: '正解を重ねると、群れが工場に気づいて近づきます。警告が出たら、ここから迎え撃ちます。' },
      { at: { sel: '.card', text: '侵攻ラン' }, text: '侵攻ランは、こちらから攻めこむ連戦モード。10層のボスを倒せばクリアです。' },
      { at: { sel: '.card', text: 'デッキ' }, text: 'バトルで使うカードです。編集と強化はここ。' },
    ],
    battle: [
      { at: '.enemies', text: '敵です。頭の上の予告で、次に何をするか分かります。⚔は攻撃、🛡は防御。' },
      { at: '.player-bar', text: '工場シールド（HP）。0になると負けです。ブロックは攻撃を受け止めます。' },
      { at: '.energy', text: 'エネルギー。毎ターン3。カードの左上の数字だけ使います。' },
      { at: '.hand', text: '手札です。カードを押すと問題が出て、正解すると発動します。15秒以内なら会心。不正解なら不発です。当然ですね。' },
      { at: { sel: '.bt-actions .btn', text: 'ターン終了' }, text: '使い終わったらターン終了。敵が動きます。' },
    ],
    study: [
      { text: '受験対策です。弱点の復習、模試、成長の記録はここ。本番の日から逆算するのも、ここです。' },
      { at: '#screen .tabs', text: '弱点リスト・模試・カウントダウン・統計・レポートの切りかえ。' },
      { at: { sel: '#screen .btn', text: '復習スタート' }, text: 'まちがえた問題を、時間をあけて解き直します。3回クリアで「卒業」。', optional: true },
    ],
    galaxy: [
      { at: '.gx-wrap', text: '銀河マップです。点線は航路、四角い枠の色が勢力。星を押すと詳しく見られます。' },
      { at: '.gx-side', text: '選んだ星の情報です。植民・交易・戦争はここから。', optional: true },
      { at: '.emp-grid', text: 'ライバル帝国です。関係が悪くなると戦争になります。外交の計算ミスも、ちゃんと記録されます。', optional: true },
    ],
    awards: [
      { at: '#screen .tabs', text: '実績・称号・今日の目標・ガチャ。正解を重ねると解放されます。称号はヘッダーに出せます。' },
    ],
    settings: [
      { text: '設定です。音、表示、問題のレベル、船籍、セーブ。' },
      { at: { sel: '.card', text: 'セーブデータ' }, text: 'セーブは自動です。別の端末で続けるときは「書き出し」→「読み込み」。' },
    ],
    menu: [
      { at: '.menu-grid', text: 'ほかの画面への入り口です。迷ったら、まず「船内マニュアル」をどうぞ。' },
    ],
  };
  Tut.screenTour = function (id, force) {
    const s = UI.state, steps = Tut.SCREENS[id];
    if (!steps) return false;
    if (!force && Tut.seen(s, 'screen:' + id)) return false;
    Tut.run('screen:' + id, steps.map((x) => Object.assign({ go: id }, x)));
    return true;
  };

  // ---------- ミッションのガイド ----------
  const build = (type, label) => [
    { go: 'factory', at: '.tool-btn[data-id=build]', text: '「建てる」を押してください。', click: true, skipIf: () => MF.FactoryUI.tool === 'build' },
    { at: '.pal-btn[data-type=' + type + ']', text: label + 'を選んでください。', click: true },
  ];
  Tut.MISSIONS = {
    solve3: [
      { go: 'quiz', at: '.mission', text: 'これがミッションです。いまの目標と進み具合が出ます。「やり方」を押せば、いつでもこの案内が出ます。' },
      { at: '#screen .q-ans', text: '3問正解してください。答えはここに入力して「決定」。' },
    ],
    miner: build('miner', '採掘機').concat([
      { at: '.fac-canvas-wrap', text: '色のついたマスが鉱脈です。鉱脈の上をタップすると、採掘機が建ちます。コアの近くがおすすめ。', until: (s) => count(s, 'miner') > 0 },
      { at: '.dir-btn', text: '設備のふちの小さな▲が出口です。置く前に向きを変えるなら、この「向き」ボタン。置いたあとなら「回す」です。', optional: true },
    ]),
    belt: build('belt', 'ベルト').concat([
      { at: '.fac-canvas-wrap', text: '採掘機の出口のとなりから、コア（🛸のマス）まで指でなぞってください。PCならドラッグ。ベルトは、なぞった向きに流れます。', until: (s) => St.progress(s, St.byId.belt).have >= 1 },
      { at: '.fac-canvas-wrap', text: '届きました。ベルトの山形が流れる向きです。曲がり角も、なぞるだけで作れます。' },
    ]),
    power: build('power', '発電所').concat([
      { at: '.fac-canvas-wrap', text: '発電所は、どこに置いても電気が届きます。燃料の石炭は、持ち物からも使います。', until: (s) => count(s, 'power') > 0 },
      { at: '.fac-status', text: '電力の数字が増えました。電気が足りないと、設備は遅くなります。' },
    ]),
    plates: build('furnace', '溶鉱炉').concat([
      { at: '.fac-canvas-wrap', text: '溶鉱炉は、採掘機の出口の先に置きます。溶鉱炉の出口 → ベルト → コア、とつないでください。', until: (s) => count(s, 'furnace') > 0 },
      { at: '.fac-canvas-wrap', text: 'あとは出口からコアまでベルトでつなぐだけです。出口の向きを、もう一度確認してください。' },
    ]),
    research1: [
      { go: 'research', at: { sel: '.tech', text: '自動化の基礎' }, text: '研究には、研究ポイントと、決められた分野の正解が必要です。おすすめは「自動化の基礎」。', optional: true },
      { at: { sel: '.tech .btn', text: '研究を始める' }, text: '「研究を始める」を押してください。', click: true, optional: true },
      { at: { sel: '.req-row .btn', text: '解く' }, text: '「解く」を押すと、その分野の問題が出ます。', click: true, optional: true },
      { at: '.next-note', text: '今の問題が終わったら、研究の分野の問題に切りかわります。', optional: true },
    ],
    review: [
      { go: 'study', tab: 'weak', at: { sel: '#screen .btn', text: '復習スタート' }, text: '「復習スタート」で、まちがえた問題がもう一度出ます。', click: true, optional: true },
    ],
    assembler: [
      { go: 'research', at: { sel: '.tech', text: '自動化の基礎' }, text: 'まず研究「自動化の基礎」を完了させます。', optional: true, skipIf: (s) => MF.Research.has(s, 'automation') },
    ].concat(build('assembler', '組立機')).concat([
      { at: '.fac-canvas-wrap', text: '組立機を置いてください。', until: (s) => count(s, 'assembler') > 0 },
      { at: '.tool-btn[data-id=inspect]', text: '置いたら「調べる」で組立機をタップして、つくる物（レシピ）を選びます。レシピがないと動きません。' },
    ]),
    hatch: [
      { go: 'pals', at: { sel: '#screen .tab', text: '卵' }, text: '「卵」を押してください。', click: true },
      { at: '.egg-card', text: '卵は、正解を重ねるとかえります。満タンになったら「孵化」です。', optional: true },
    ],
    assign: [
      { go: 'factory', at: '.tool-btn[data-id=inspect]', text: '「調べる」を押してください。', click: true, skipIf: () => MF.FactoryUI.tool === 'inspect' },
      { at: '.fac-canvas-wrap', text: '相棒を置きたい設備をタップして、下の欄の「相棒を配置」から選んでください。', until: (s) => s.pals.list.some((p) => p.at) },
    ],
    raid: [
      { go: 'defense', at: { sel: '.card', text: '襲撃' }, text: '正解を重ねると群れが近づきます。警告が出たら、ここから「迎え撃つ」。' },
    ],
    exam: [
      { go: 'study', tab: 'exam', at: '.exam-kinds', text: '模試の種類です。まずは「ミニ模試」をどうぞ。', optional: true },
    ],
    labs: build('lab', '研究所').concat([{ at: '.fac-canvas-wrap', text: '研究所に「研究パック」を届けると、研究ポイントが自動でたまります。' }]),
    rocketry: [{ go: 'research', at: { sel: '.tech', text: 'ロケット工学' }, text: 'ロケット工学です。すべての分野の正解が必要です。', optional: true }],
    silo: build('silo', '発射台'),
    launch: [{ go: 'galaxy', at: '.silo-box', text: '部品がそろったら、問題に正解するたびに燃料がたまります。満タンで打ち上げです。', optional: true }],
    colonize: [{ go: 'galaxy', at: '.gx-wrap', text: '航路がつながった、空いている星を選んで植民します。', optional: true }],
  };
  Tut.missionTour = function (m) {
    if (!m) return false;
    const s = UI.state, steps = Tut.MISSIONS[m.id];
    if (!steps) return false;
    const where = steps[0].go || m.where;
    // その画面のガイドがまだなら、先に見せる
    const pre = !Tut.seen(s, 'screen:' + where) && Tut.SCREENS[where] ? Tut.SCREENS[where].map((x) => Object.assign({ go: where }, x)) : [];
    if (pre.length) Tut.mark(s, 'screen:' + where);
    Tut.run('mission:' + m.id, pre.concat(steps.map((x) => Object.assign({}, x))).concat([{ text: m.how }]));
    return true;
  };

  // ミッションの「やり方」は、光らせて指す案内に
  MF.StoryUI.howTo = (m) => Tut.missionTour(m);

  // ていねいモード：ミッションの会話のあとに、そのミッションのガイド
  const origIntro = SUI.showIntro;
  SUI.showIntro = function (m, cb) {
    origIntro(m, () => {
      if (cb) cb();
      const s = UI.state;
      if (m && Tut.mode(s) === 'full' && !SUI.quiet && Tut.MISSIONS[m.id] && !Tut.seen(s, 'mission:' + m.id)) setTimeout(() => { if (!UI.modalStack.length) Tut.missionTour(m); }, 400);
    });
  };
  // ていねいモード：はじめての画面ではガイド
  let calmFor = 0;
  MF.App.frameHooks.push((s, dt) => {
    if (Tut.mode(s) !== 'full' || SUI.quiet || Tut.cur || UI.modalStack.length || SUI.pendingIntro || SUI.pendingChapter || (MF.QuizUI && MF.QuizUI.session)) { calmFor = 0; return; }
    const id = UI.current;
    if (!Tut.SCREENS[id] || Tut.seen(s, 'screen:' + id)) { calmFor = 0; return; }
    if (id === 'battle' && !(s.battle.active && !s.battle.active.pending)) return;
    if (!s.story.introSeen) return;
    calmFor += dt;
    if (calmFor < 0.9) return;
    calmFor = 0;
    Tut.screenTour(id);
  });

  // ---------- 最初の選択 ----------
  Tut.ask = function (s, done) {
    const pick = (mode) => () => { s.settings.tutorial = mode; sfx('click'); };
    const body = h('div', { class: 'tut-ask' },
      h('div', { class: 'row' }, h('span', { html: SUI.navi(56) }), h('p', {}, 'ナビ> 船長の経験値を申告してください。正直に。わたしは正直さ90%なので、船長にも同じくらいを期待します。')),
      h('ul', { class: 'small' },
        h('li', {}, h('b', {}, 'はじめて遊ぶ'), '：画面ごとに、押す場所を光らせて案内します。ていねいに。'),
        h('li', {}, h('b', {}, '慣れてる'), '：案内は最小限。必要なら「？」や「やり方」から呼んでください。')),
      h('p', { class: 'tiny muted' }, 'あとから「設定」でいつでも変えられます。'));
    UI.modal({ title: '経験値の申告', body, noClose: true, cls: 'tut-ask-modal', onClose: done,
      buttons: [{ label: 'はじめて遊ぶ（ていねい）', cls: 'primary', action: pick('full') }, { label: '慣れてる（最小限）', cls: 'ghost', action: pick('short') }] });
  };
  // 起動画面 → 選択 → オープニング
  SUI.afterBoot = (s, next) => Tut.ask(s, next);

  // ---------- ヘッダーの「？」 ----------
  UI.headerExtras.push(() => h('button', { class: 'help-chip', title: '船内マニュアル（この画面の説明）', 'aria-label': '船内マニュアル', onclick: () => UI.go('manual', { sec: UI.current }) }, '？'));

  // ---------- 船内マニュアル ----------
  Tut.MANUAL = [
    { id: 'start', title: 'はじめに', lines: ['問題を解く → 資源と研究ポイントが手に入る → 工場が動く → もっと高度な物がつくれる。これがこの船の基本サイクルです。', '画面の上のミッションが、次にやることを教えてくれます。「やり方」を押すと、押す場所を光らせて案内します。', '迷ったら、ヘッダーの「？」で、今の画面の説明がここに出ます。'] },
    { id: 'quiz', title: '計算ラボ', lines: ['答えは数字で入力。分数は 3/4、負の数は -2、小数は 0.5。', 'まちがえるとヒント1 → ヒント2 → 完全解説の順に開きます。解説まで行った問題と、スキップした問題は弱点リストに入ります。', '分野を選ぶと、その分野の資源がもらえます。「おまかせ」は苦手と忘れかけを多めに出します。', '難易度と分野の切りかえは、次の問題から。今の問題は変わりません（引き直しはできません）。', '続けて1回で正解するとコンボで資源が増えます。速く答えると「速答」ボーナス。', '設定の「ぬるま湯モード」をオンにすると算数だけになります。受験には出ません。'] },
    { id: 'factory', title: '工場', lines: ['「建てる」→ 設備を選ぶ → マスをタップで設置。採掘機は鉱脈の上に置きます。', 'ベルトは、指でなぞった向きに品物を運びます。設備のふちの▲が出口。出口の先にベルトか次の設備を置きます。', '品物は本船のコア（🛸）か倉庫に届くと、持ち物になります。', '電力が足りないと設備が遅くなります。発電所は石炭を使います。', '演算チャージ（🧠）は正解でたまり、切れると工場は25%の速さに落ちます。', '研究「物流工学」で、持ち物から材料を送りこむ「供給ポート」が使えます。'] },
    { id: 'research', title: '研究', lines: ['研究ポイントを払って研究を始め、指定された分野の問題に正解すると完了します。「難」の正解は2問ぶん進みます。', '研究カードの「解く」を押すと、次の問題からその分野になります。', '研究所に研究パックを届けると、研究ポイントが自動でたまります。'] },
    { id: 'pals', title: '相棒', lines: ['卵は正解でときどき手に入り、正解を重ねるとかえります。', '工場で設備をタップ →「相棒を配置」。得意な作業の設備に置くと速くなります。', '同じ分野の問題を解くと育ちます。「戦闘に連れていく」と、バトルの最初にブロックをくれます。'] },
    { id: 'defense', title: '防衛とバトル', lines: ['正解を重ねると赤い群れが近づき、警告が出ます。「迎え撃つ」でバトル。時間切れだと自動で戦います（工場の砲台が頼りです）。', 'カードを押すと問題が出て、正解で発動、不正解だと不発。15秒以内の正解は会心で1.25倍。', '敵の頭の上の予告（⚔攻撃・🛡防御・💪強化・☠妨害）を見て、攻めるか守るか決めます。', '侵攻ランは10層のローグライク。カードとレリックを集めて、女王を倒せばクリア。'] },
    { id: 'study', title: '受験対策', lines: ['弱点リスト：まちがえた問題が時間をあけて出なおします。3回クリアで卒業。', '模試：時間内に複数分野を解き、得点と偏差値の目安が出ます。', 'カウントダウン：試験日を入れると、残り日数に合わせたメニューが出ます。', '統計とレポート：分野ごとの正答率と、週ごとの成長。'] },
    { id: 'galaxy', title: '銀河', lines: ['ロケットで星を脱出すると、銀河マップが開きます。', 'コロニー船で、航路がつながった空いている星に植民します。植民した星では新しい分野の問題が出ます。', 'ライバル帝国とは、交易・同盟・戦争ができます。'] },
    { id: 'awards', title: '実績・ご褒美', lines: ['実績を解除すると称号と研究ポイント。毎日のログインボーナスと、1日の目標もあります。', 'ガチャは研究ポイントで回せる着せかえです。強さは変わりません。見た目だけです。'] },
    { id: 'settings', title: '設定とセーブ', lines: ['セーブは自動。別の端末で続けるときは「書き出し」→「読み込み」。', '文字の大きさ・テンキー・動きを減らす・ハイコントラストで、見やすさを調整できます。', '「船籍」で船名を再登録できます。船体の状態は変わりません。'] },
  ];
  const SCREEN_SEC = { quiz: 'quiz', factory: 'factory', research: 'research', pals: 'pals', defense: 'defense', battle: 'defense', run: 'defense', study: 'study', galaxy: 'galaxy', awards: 'awards', settings: 'settings', menu: 'start', story: 'start', manual: 'start' };
  const SEC_SCREEN = { quiz: 'quiz', factory: 'factory', research: 'research', pals: 'pals', defense: 'defense', study: 'study', galaxy: 'galaxy', awards: 'awards', settings: 'settings' };
  UI.screen('manual', {
    title: '船内マニュアル', short: 'マニュアル', icon: '📘', nav: 'more', navOrder: 9,
    render(root, s, params) {
      root.appendChild(h('h2', { class: 'screen-title' }, '船内マニュアル'));
      root.appendChild(h('div', { class: 'row' }, h('span', { html: SUI.navi(48) }), h('p', { class: 'small' }, 'ナビ> 本船「' + St.shipName(s) + '」の取扱説明書です。最後まで読む船長は少数派ですが、少数派は生き残ります。')));
      const modeSeg = h('div', { class: 'seg' }, [['full', 'ていねい'], ['short', '最小限']].map(([v, l]) => h('button', { class: 'seg-btn' + (Tut.mode(s) === v ? ' on' : ''), onclick: () => { s.settings.tutorial = v; UI.rerender(); } }, l)));
      root.appendChild(UI.section('案内の設定', h('div', { class: 'row' }, h('span', { class: 'small' }, '案内'), modeSeg),
        h('p', { class: 'tiny muted' }, 'ていねい：はじめての画面で、押す場所を光らせて案内します。最小限：「やり方」や下の「ガイドを見る」を押したときだけ。'),
        h('button', { class: 'btn small', onclick: () => { s.flags.tours = {}; UI.toast('ナビ> 案内の記録を消しました。もう一度、全部案内します。', 'info', 3000); } }, 'ガイドをもう一度ぜんぶ見る')));
      const toc = h('div', { class: 'chip-wrap manual-toc' }, Tut.MANUAL.map((m) => h('button', { class: 'chip', onclick: () => { const e = document.getElementById('man-' + m.id); if (e) e.scrollIntoView({ block: 'start' }); } }, m.title)));
      root.appendChild(toc);
      const want = params && params.sec ? (SCREEN_SEC[params.sec] || params.sec) : null;
      Tut.MANUAL.forEach((m) => {
        const scr = SEC_SCREEN[m.id];
        const card = UI.section(m.title, h('ul', { class: 'manual-list' }, m.lines.map((l) => h('li', {}, St.fmt(s, l)))),
          scr ? h('div', { class: 'row' },
            h('button', { class: 'btn small', onclick: () => UI.go(scr) }, '画面を開く'),
            Tut.SCREENS[scr] ? h('button', { class: 'btn small primary', onclick: () => { UI.go(scr); setTimeout(() => Tut.screenTour(scr, true), 300); } }, 'ガイドを見る') : null) : null);
        card.id = 'man-' + m.id;
        if (want === m.id) card.classList.add('manual-hit');
        root.appendChild(card);
      });
      if (want) setTimeout(() => { const e = document.getElementById('man-' + want); if (e) e.scrollIntoView({ block: 'start' }); }, 50);
    },
  });

  // ---------- 設定 ----------
  if (MF.SettingsUI) MF.SettingsUI.sections.push(() => {
    const s = UI.state;
    return UI.section('案内（チュートリアル）',
      MF.SettingsUI.choice('案内', 'tutorial', [['full', 'ていねい'], ['short', '最小限']]),
      h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => UI.go('manual') }, '船内マニュアルを開く'),
        h('button', { class: 'btn small', onclick: () => { s.flags.tours = {}; UI.toast('ナビ> 案内の記録を消しました。もう一度、全部案内します。', 'info', 3000); } }, 'ガイドをもう一度ぜんぶ見る')));
  });
})(globalThis.MF = globalThis.MF || {});
