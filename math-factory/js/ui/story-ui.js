/* 数学ファクトリー：ストーリー（ナビとの会話・ミッション表示・オープニングとエンディング） */
(function (MF) {
  'use strict';
  const UI = MF.UI, St = MF.Story, G = MF.Game, U = MF.Util;
  const h = UI.h;
  const SUI = {};
  MF.StoryUI = SUI;
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };

  // ナビ（船のAI）の顔
  // 船のコンピューターの顔（ドット絵のモニター）
  const NAVI = {
    base: ['........a.......', '........f.......', '.......fff......', '.ffffffffffffff.', '.fssssssssssssf.', '.fssssssssssssf.', null, null, null, null, '.fssssssssssssf.', '.ffffffffffffff.', '......ffff......', '....ffffffff....'],
    normal: ['.fsseesssseessf.', '.fsseesssseessf.', '.fssssssssssssf.', '.fssssmmmmssssf.'],
    happy: ['.fsssessssesssf.', '.fssesessesessf.', '.fsssmssssmsssf.', '.fssssmmmmssssf.'],
  };
  SUI.navi = function (size, mood) {
    const face = NAVI[mood === 'happy' ? 'happy' : 'normal'];
    let k = 0;
    const rows = NAVI.base.map((r) => r || face[k++]);
    return MF.Sprite.svg(MF.Sprite.grid(rows, 'center'), { a: '#ffd23b', f: '#4c7520', s: '#061004', e: '#b6ff3b', m: '#b6ff3b' }, size || 72, 'navi-svg', 'ナビ');
  };
  /** 会話を1行ずつ見せる */
  SUI.talk = function (lines, opts) {
    opts = opts || {};
    let i = 0;
    const text = h('div', { class: 'talk-text' });
    const body = h('div', { class: 'talk' }, h('div', { class: 'talk-face', html: SUI.navi(80, opts.mood) }), h('div', { class: 'talk-bubble' }, h('div', { class: 'talk-name' }, opts.name || 'ナビ'), text));
    const btn = h('button', { class: 'btn primary', onclick: () => next() }, '次へ ▶');
    const box = h('div', {}, body, h('div', { class: 'talk-foot' }, h('span', { class: 'tiny muted talk-count' }), btn));
    const close = UI.modal({ title: opts.title || '📡 通信', body: box, cls: 'talk-modal', buttons: [{ label: 'スキップ', cls: 'ghost small' }], onClose: () => { if (opts.done) opts.done(); } });
    function show() {
      text.textContent = lines[i];
      box.querySelector('.talk-count').textContent = (i + 1) + ' / ' + lines.length;
      btn.textContent = i === lines.length - 1 ? (opts.last || 'わかった！') : '次へ ▶';
      text.classList.remove('typing'); void text.offsetWidth; text.classList.add('typing');
    }
    function next() { sfx('tick'); i++; if (i >= lines.length) { close(); return; } show(); }
    body.addEventListener('click', () => next());
    show();
    return close;
  };
  SUI.chapterCard = function (ch, done) {
    const C = St.CHAPTERS.find((c) => c.id === ch);
    if (!C) { if (done) done(); return; }
    sfx('chapter');
    const body = h('div', { class: 'chapter-card' }, h('div', { class: 'cc-title' }, C.title), h('div', { class: 'cc-sub' }, C.sub));
    UI.modal({ body, cls: 'chapter-modal', buttons: [{ label: 'はじめる', cls: 'primary' }], onClose: done });
  };
  SUI.showIntro = function (m, cb) {
    const s = UI.state;
    if (!m || !m.intro || s.story.seen[m.id]) { if (cb) cb(); return; }
    s.story.seen[m.id] = true;
    SUI.talk(m.intro, { title: '📡 ナビ：' + m.title, done: cb });
  };

  // ---------- ミッションのバナー ----------
  SUI.banner = function (s) {
    const m = St.current(s);
    if (!m) return null;
    const p = St.progress(s, m);
    const C = St.CHAPTERS.find((c) => c.id === m.ch);
    const el = h('div', { class: 'mission' },
      h('div', { class: 'ms-head' }, h('span', { class: 'ms-ch' }, C.title), h('b', {}, '🎯 ' + m.title), h('span', { class: 'ms-prog' }, p.have + ' / ' + p.need)),
      h('div', { class: 'small' }, m.desc),
      h('div', { class: 'row ms-btns' },
        h('button', { class: 'btn small ghost', onclick: () => { UI.modal({ title: '💡 ' + m.title, body: h('div', {}, h('div', { class: 'talk-face-s', html: SUI.navi(48) }), h('p', {}, m.how)), buttons: [{ label: 'わかった', cls: 'primary' }] }); } }, '💡 やり方'),
        UI.current !== m.where ? h('button', { class: 'btn small', onclick: () => UI.go(m.where) }, '▶ ' + (UI.screens[m.where] ? UI.screens[m.where].title : '') + 'へ') : null,
        m.intro ? h('button', { class: 'btn small ghost', onclick: () => SUI.talk(m.intro, { title: '📡 ナビ：' + m.title }) }, '📡 会話') : null));
    return el;
  };
  MF.QuizUI.extraTop.unshift((s) => SUI.banner(s));
  MF.FactoryUI.belowExtras.unshift(() => { const b = UI.live((st) => SUI.banner(st)); setTimeout(() => { const head = document.querySelector('.fac-head'); if (head && b.parentNode) head.after(b); }, 0); return b; });

  // ---------- 通知 ----------
  UI.noticeHandlers.mission = (n) => {
    UI.toast(n.text, 'good', 3500);
    sfx('mission');
    if (MF.FX && MF.FX.banner) MF.FX.banner('MISSION CLEAR', St.byId[n.id] ? St.byId[n.id].title : '');
    SUI.pendingIntro = true;
    UI.rerender();
    return true;
  };
  UI.noticeHandlers.chapter = (n) => { SUI.pendingChapter = n.ch; return true; };
  // 会話や章の扉は、戦闘中・模試中・ほかの画面が開いているときは出さずに待つ
  SUI.calm = function () {
    return !SUI.quiet && !UI.modalStack.length && ['battle', 'run'].indexOf(UI.current) < 0 && !(MF.QuizUI.session) && !(UI.state.battle && UI.state.battle.active);
  };
  let calmFor = 0;
  MF.App.frameHooks.push((s, dt) => {
    if (!SUI.pendingIntro && !SUI.pendingChapter) return;
    if (!SUI.calm()) { calmFor = 0; return; }
    calmFor += dt;
    if (calmFor < 2.3) return;
    calmFor = 0;
    const m = St.current(s);
    if (SUI.pendingChapter) { const ch = SUI.pendingChapter; SUI.pendingChapter = null; SUI.pendingIntro = false; SUI.chapterCard(ch, () => SUI.showIntro(St.current(s), () => UI.rerender())); return; }
    SUI.pendingIntro = false;
    if (m) SUI.showIntro(m, () => UI.rerender());
  });

  // ---------- オープニング ----------
  MF.App.bootHooks.push((s, info) => {
    if (s.story.introSeen || SUI.quiet) return;
    s.story.introSeen = true;
    setTimeout(() => {
      const body = h('div', { class: 'opening' }, h('div', { class: 'op-stars' }), h('div', { class: 'op-ship' }, '🛸'), h('p', { class: 'op-text' }, '西暦2xxx年。調査船ラグランジュ号は、未知の星系で謎の赤い嵐に巻きこまれた——'),
        h('p', { class: 'op-text d2' }, '気がつくと、そこは名前もない星の上だった。'));
      UI.modal({ title: '数学ファクトリー', body, cls: 'opening-modal', noClose: true, buttons: [{ label: '目を覚ます', cls: 'primary', action: () => { setTimeout(() => SUI.chapterCard(1, () => SUI.showIntro(St.current(s), () => UI.rerender())), 200); } }] });
    }, 900);
  });

  // ---------- エンディング（最初の打ち上げ） ----------
  SUI.ending = function () {
    const s = UI.state;
    if (s.story.endingSeen) return;
    s.story.endingSeen = true;
    St.check(s, Date.now());
    const lines = ['ロケット、点火！ …上昇中…大気圏を突破しました！', '下に見えるのが、わたしたちが不時着した星です。あの小さな工場から、ここまで来たんですね。',
      'キャプテンが解いてきた問題のひとつひとつが、この船を空へ押し上げたんです。', 'そして…レーダーに反応。この銀河には、ほかにも文明があるようです。', 'さあ、新しい物語のはじまりです！'];
    SUI.talk(lines, { title: '🚀 脱出', mood: 'happy', last: '銀河へ！', done: () => {
      const st = s.stats;
      const body = h('div', { class: 'center ending' }, h('div', { class: 'big-emoji' }, '🌌'), h('h3', {}, 'THE ESCAPE — 星を脱出した！'),
        h('div', { class: 'tiles' }, MF.MetaUI.tile('解いた問題', st.answered + ' 問'), MF.MetaUI.tile('正答率', Math.round(st.correct / Math.max(1, st.answered) * 100) + '%'), MF.MetaUI.tile('相棒', s.pals.list.length + ' 匹'), MF.MetaUI.tile('研究', s.research.done.length + ' 個')),
        h('p', { class: 'small' }, 'ここからは銀河編。植民して新しい分野（指数・対数／場合の数／複素数平面／図形と方程式）に挑戦しよう！'));
      UI.modal({ title: '🏆 第一部 完', body, buttons: [{ label: '銀河マップを開く', cls: 'primary', action: () => UI.go('galaxy') }] });
      if (MF.FX && MF.FX.confetti) MF.FX.confetti();
      sfx('victory');
    } });
  };

  // ---------- ストーリー画面 ----------
  UI.screen('story', {
    title: 'ストーリー', icon: '📖', nav: 'more', navOrder: 8,
    render(root, s) {
      root.appendChild(h('h2', { class: 'screen-title' }, 'ストーリー'));
      root.appendChild(h('div', { class: 'row' }, h('span', { html: SUI.navi(56) }), h('p', { class: 'small' }, '遭難した調査船ラグランジュ号。工場を立て直し、ロケットで星を脱出せよ！ ミッションを順番にこなすと、遊び方も自然に覚えられるよ。')));
      St.CHAPTERS.forEach((C) => {
        const ms = St.MISSIONS.filter((m) => m.ch === C.id);
        const card = UI.section(C.title + '　' + C.sub);
        ms.forEach((m) => {
          const done = s.story.done.indexOf(m.id) >= 0, cur = St.current(s) === m;
          card.appendChild(h('div', { class: 'ms-row' + (done ? ' done' : cur ? ' cur' : '') }, h('span', {}, done ? '✅' : cur ? '▶' : '⬜'), h('span', { class: 'small' }, h('b', {}, m.title), '：' + m.desc),
            (done || cur) && m.intro ? h('button', { class: 'btn small ghost', onclick: () => SUI.talk(m.intro, { title: '📡 ' + m.title }) }, '会話') : null));
        });
        root.appendChild(card);
      });
      if (St.finished(s)) root.appendChild(h('p', { class: 'good' }, '🎉 すべてのミッションを達成！ あとは銀河を自由に冒険しよう。'));
    },
  });
})(globalThis.MF = globalThis.MF || {});
