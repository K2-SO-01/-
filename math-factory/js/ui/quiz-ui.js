/* 数学ファクトリー：出題画面と、ほかの画面でも使える「問題パネル」 */
(function (MF) {
  'use strict';
  const U = MF.Util, G = MF.Game, Qs = MF.Questions, UI = MF.UI;
  const h = UI.h;
  const QuizUI = {};
  const sfx = (n) => { if (MF.Audio) MF.Audio.play(n); };
  const fx = (n, a, b) => { if (MF.FX && MF.FX[n]) MF.FX[n](a, b); };

  QuizUI.useKeypad = function () {
    const m = UI.state.settings.keypad;
    if (m === 'always') return true;
    if (m === 'native') return false;
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  };

  /**
   * 問題パネル。opts:
   *  next(): 次の問題(question)を返す
   *  onResult(res, q): 解答ごと
   *  onDone(res, q): 問題が終わったとき（正解 or 解説表示）
   *  autoNext: 正解後に自動で次へ（ミリ秒、0で無効）
   *  allowHints, allowSkip, showReward, label
   */
  QuizUI.createPanel = function (container, opts) {
    const s = UI.state;
    const P = { q: null, value: '', busy: false, timer: null, destroyed: false };
    const keypad = QuizUI.useKeypad();
    const el = h('div', { class: 'qpanel' + (opts.compact ? ' compact' : '') });
    const head = h('div', { class: 'q-head' });
    const text = h('div', { class: 'q-text' });
    const input = h('input', { class: 'q-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': '答えを入力', placeholder: '答え（例: -3/4）', enterkeyhint: 'done' });
    if (keypad) { input.readOnly = true; input.setAttribute('inputmode', 'none'); }
    const submitBtn = h('button', { class: 'btn primary q-submit', onclick: () => submit() }, '決定');
    const ansRow = h('div', { class: 'q-ans' }, input, submitBtn);
    const fb = h('div', { class: 'q-feedback', 'aria-live': 'polite' });
    const actions = h('div', { class: 'q-actions' });
    const pad = keypad ? buildKeypad() : null;
    el.append(head, text, ansRow, fb, actions);
    if (pad) el.appendChild(pad);
    else el.appendChild(h('div', { class: 'muted small q-tip' }, '分数は 3/4、負の数は -2 のように入力して Enter'));
    container.appendChild(el);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (P.q && cur() && cur().done) goNext(); else submit(); }
    });
    input.addEventListener('input', () => { P.value = input.value; });
    function onKey(e) {
      if (P.destroyed || !document.body.contains(el)) return;
      if (UI.modalStack.length && !el.closest('.modal')) return;
      if (e.target === input && !keypad) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== input) return;
      const k = e.key;
      if (/^[0-9]$/.test(k) || k === '-' || k === '/' || k === '.') { press(k); e.preventDefault(); }
      else if (k === 'Backspace') { press('⌫'); e.preventDefault(); }
      else if (k === 'Enter') { if (cur() && cur().done) goNext(); else submit(); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);

    function cur() { return s.quiz.current; }
    function buildKeypad() {
      const keys = ['7', '8', '9', '⌫', '4', '5', '6', '/', '1', '2', '3', '-', '0', '.', 'C', '決定'];
      return h('div', { class: 'keypad' }, keys.map((k) => h('button', {
        class: 'key' + (k === '決定' ? ' key-ok' : '') + (k === 'C' || k === '⌫' ? ' key-fn' : ''),
        onclick: (e) => { e.preventDefault(); if (k === '決定') { if (cur() && cur().done) goNext(); else submit(); } else press(k); },
      }, k === '-' ? '−' : k)));
    }
    function press(k) {
      if (!P.q) return;
      if (cur() && cur().done) return;
      if (k === 'C') P.value = '';
      else if (k === '⌫') P.value = P.value.slice(0, -1);
      else if (P.value.length < 12) P.value += k;
      input.value = P.value;
      sfx('tick');
    }
    function renderHead() {
      const c = cur();
      const t = Qs.TOPICS[c.topic];
      head.innerHTML = '';
      [
        h('span', { class: 'q-topic', style: { borderColor: t.color } }, t.subject + '・' + t.name),
        h('span', { class: 'q-level lv' + c.level }, Qs.LEVEL_NAMES[c.level]),
        opts.label ? h('span', { class: 'q-label' }, opts.label) : null,
        opts.showReward !== false ? h('span', { class: 'q-reward' }, '正解で ', UI.itemChip(t.resource, null, { noName: false })) : null,
      ].forEach((n) => { if (n) head.appendChild(n); });
    }
    function load(q) {
      P.q = q; P.value = ''; input.value = '';
      clearTimeout(P.timer);
      el.classList.remove('ok', 'ng', 'done');
      renderHead();
      text.innerHTML = q.text;
      fb.innerHTML = '';
      const c = cur();
      if (c && !c.done && c.hints > 0 && c.seed === q.seed) fb.innerHTML = hintsHTML(q, c.hints); // 続きから出すときは、開けたヒントも見せる
      renderActions();
      if (!keypad) setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { /* noop */ } }, 20);
    }
    function renderActions() {
      const c = cur();
      actions.innerHTML = '';
      if (!c) return;
      if (c.done) {
        actions.append(
          c.hints < 3 ? h('button', { class: 'btn ghost', onclick: () => { clearTimeout(P.timer); showSteps(true); } }, '解説を見る') : null,
          h('button', { class: 'btn primary', onclick: () => goNext() }, opts.nextLabel || '次の問題 ▶'));
        return;
      }
      if (opts.allowHints !== false) {
        const label = c.hints === 0 ? 'ヒント' : c.hints === 1 ? 'ヒント2' : '解説を見る';
        actions.append(h('button', { class: 'btn ghost', onclick: () => hint() }, '💡 ' + label));
        if (c.hints > 0 && c.hints < 2) actions.append(h('button', { class: 'btn ghost', onclick: () => { while (cur().hints < 3 && !cur().done) G.Quiz.revealHint(s, Date.now()); afterHint(); } }, '📖 解説'));
      }
      if (opts.allowSkip !== false) actions.append(h('button', { class: 'btn ghost', title: 'スキップは不正解あつかい（弱点リストに入る）', onclick: () => skip() }, 'スキップ'));
    }
    function hintsHTML(q, n) {
      const parts = [];
      if (n >= 1) parts.push('<div class="hint"><b>ヒント1</b> ' + q.hints[0] + '</div>');
      if (n >= 2) parts.push('<div class="hint"><b>ヒント2</b> ' + q.hints[1] + '</div>');
      if (n >= 3) parts.push(stepsHTML(q));
      return parts.join('');
    }
    function stepsHTML(q) {
      return '<div class="steps"><b>完全解説</b><ol>' + q.steps.map((x) => '<li>' + x + '</li>').join('') + '</ol><div class="final">答え：<b>' + U.fh(q.answer) + '</b> <span class="muted small">（入力するなら ' + U.esc(Qs.answerText(q)) + '）</span></div></div>';
    }
    function showSteps(append) {
      const box = h('div', { class: 'steps-wrap', html: stepsHTML(P.q) });
      if (append) { const old = fb.querySelector('.steps-wrap'); if (old) old.remove(); fb.appendChild(box); } else fb.appendChild(box);
      actions.querySelectorAll('button').forEach((b) => { if (b.textContent === '解説を見る') b.remove(); });
    }
    function hint() {
      const c = cur();
      if (!c || c.done) return;
      G.Quiz.revealHint(s, Date.now());
      afterHint();
    }
    function afterHint() {
      const c = cur();
      sfx('hint');
      const wrong = el.classList.contains('ng');
      fb.innerHTML = (wrong ? '<div class="verdict ng">✕ ちがうよ。もう一度！</div>' : '') + hintsHTML(P.q, c.hints);
      if (c.done) { el.classList.add('done'); fb.insertAdjacentHTML('afterbegin', '<div class="verdict info">解説を読んだら次へ進もう</div>'); finish({ ok: false, done: true, viaHint: true }); }
      renderActions();
    }
    function skip() {
      const c = cur();
      if (!c || c.done) return;
      G.Quiz.skip(s, Date.now());
      finish({ ok: false, skipped: true, done: true });
      goNext();
    }
    function submit() {
      if (!P.q || P.busy) return;
      const c = cur();
      if (!c || c.done) return;
      const val = keypad ? P.value : input.value;
      if (!U.normalizeInput(val)) { shake(); UI.toast('答えを入力してね', 'warn', 1400); return; }
      const res = G.Quiz.answer(s, val, Date.now());
      if (res.invalid) { shake(); UI.toast('数字・分数（3/4）・負の数（-2）で入力してね', 'warn', 2000); return; }
      if (opts.onResult) opts.onResult(res, P.q);
      if (res.ok) onCorrect(res); else onWrong(res);
      UI.renderHeader();
    }
    function shake() { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    function onCorrect(res) {
      el.classList.remove('ng'); el.classList.add('ok', 'done');
      const rw = res.reward;
      const combo = res.combo;
      let msg = '<div class="verdict ok">◎ 正解！' + (res.attempt > 1 ? '（' + res.attempt + '回目）' : '') + '</div>';
      if (opts.showReward !== false && rw) {
        msg += '<div class="reward-line">+' + rw.amount + ' ' + G.ITEMS[rw.item].name + (rw.rp ? '　+' + rw.rp + ' 研究P' : '') +
          (rw.combo > 1 ? '　<span class="combo-x">×' + rw.combo.toFixed(1) + '</span>' : '') + (rw.speed ? '　<span class="speedy">⚡速答</span>' : '') + '</div>';
      }
      fb.innerHTML = msg;
      const r = submitBtn.getBoundingClientRect();
      fx('burst', { x: r.left + r.width / 2, y: r.top, color: rw ? G.ITEMS[rw.item].color : '#4cd964', n: 14 + Math.min(combo, 20) * 2 });
      sfx(combo >= 10 ? 'combo2' : combo >= 3 ? 'combo' : 'correct');
      QuizUI.updateCombo();
      if (combo >= 3 && combo % 5 === 0) fx('comboBanner', combo);
      finish(res);
      renderActions();
      const delay = opts.autoNext !== undefined ? opts.autoNext : (s.settings.autoNext === false ? 0 : 1300);
      if (delay > 0) P.timer = setTimeout(() => { if (!P.destroyed && cur() && cur().done && document.body.contains(el)) goNext(); }, delay);
    }
    function onWrong(res) {
      el.classList.add('ng');
      shake();
      sfx('wrong');
      QuizUI.updateCombo();
      if (opts.oneShot) { let g = 0; while (cur() && !cur().done && g++ < 5) G.Quiz.revealHint(s, Date.now()); }
      const c = cur();
      P.value = ''; input.value = '';
      if (c.done) {
        el.classList.add('done');
        fb.innerHTML = '<div class="verdict ng">✕ 残念…正解は ' + U.fh(P.q.answer) + '</div>' + hintsHTML(P.q, 3);
        finish(res);
      } else {
        fb.innerHTML = '<div class="verdict ng">✕ ちがうよ。' + (c.hints === 1 ? 'ヒントを見てもう一度！' : 'もう一息！') + '</div>' + hintsHTML(P.q, c.hints);
      }
      renderActions();
    }
    function finish(res) { if (opts.onDone) opts.onDone(res, P.q); }
    function goNext() {
      clearTimeout(P.timer);
      if (P.destroyed) return;
      const q = opts.next ? opts.next() : null;
      if (q) load(q);
    }
    P.load = load;
    P.destroy = () => { P.destroyed = true; clearTimeout(P.timer); document.removeEventListener('keydown', onKey); el.remove(); };
    P.el = el;
    P.goNext = goNext;
    return P;
  };

  QuizUI.updateCombo = function () {
    const s = UI.state;
    const el = UI.$('#combo-meter');
    const c = s.quiz.combo;
    document.body.classList.toggle('combo-hot', c >= 5 && c < 10);
    document.body.classList.toggle('combo-fire', c >= 10);
    if (!el) return;
    el.className = 'combo-meter' + (c >= 10 ? ' fire' : c >= 5 ? ' hot' : c >= 3 ? ' warm' : '');
    el.innerHTML = c > 0 ? '<span class="cm-n">' + c + '</span><span class="cm-l">COMBO</span><span class="cm-x">×' + G.Quiz.comboMult(c).toFixed(1) + '</span>' : '<span class="cm-l">COMBO</span><span class="cm-x">×1.0</span>';
  };

  // ---------- 出題画面 ----------
  QuizUI.panel = null;
  QuizUI.session = null; // 復習など特別な出題（ステップ2以降）
  QuizUI.extraTop = []; // 他の画面が出題画面の上に足す部品
  QuizUI.extraRow = [];

  UI.screen('quiz', {
    title: '計算ラボ', short: '計算', icon: '🧮', nav: 'main', navOrder: 1,
    render(root, s, params) {
      if (QuizUI.panel) { QuizUI.panel.destroy(); QuizUI.panel = null; }
      if (params && params.session) QuizUI.session = params.session;
      const sess = QuizUI.session;
      QuizUI.extraTop.forEach((fn) => root.appendChild(UI.live(fn)));
      const top = h('div', { class: 'quiz-top' }, h('div', { id: 'combo-meter', class: 'combo-meter' }));
      QuizUI.extraRow.forEach((fn) => top.appendChild(UI.live(fn)));
      if (sess) {
        top.appendChild(h('div', { class: 'session-bar' }, h('b', {}, sess.title), sess.status ? h('span', { class: 'muted small', id: 'session-status' }, sess.status()) : null,
          h('button', { class: 'btn small ghost', onclick: () => { QuizUI.endSession(); } }, '終了')));
      }
      root.appendChild(top);
      if (!sess) {
        const avail = G.availableTopics(s);
        const chips = h('div', { class: 'topic-chips', role: 'tablist' });
        const mk = (id, label, color) => h('button', {
          class: 'tchip' + (s.quiz.topic === id ? ' on' : ''), style: color ? { '--tc': color } : null,
          onclick: () => {
            if (s.quiz.topic === id) return;
            s.quiz.topic = id; s.quiz.topicFrom = null;
            UI.rerender(); // いま出ている問題はそのまま。次の問題からこの分野
          },
        }, label);
        chips.appendChild(mk('auto', '🎲 おまかせ'));
        avail.forEach((t) => {
          const T = Qs.TOPICS[t];
          chips.appendChild(mk(t, T.name, T.color));
        });
        root.appendChild(chips);
        const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': '難易度' });
        [['auto', '自動'], [0, '易'], [1, '普'], [2, '難']].forEach(([v, l]) => {
          seg.appendChild(h('button', { class: 'seg-btn' + (String(s.quiz.levelMode) === String(v) ? ' on' : ''), onclick: () => {
            if (String(s.quiz.levelMode) === String(v)) return;
            s.quiz.levelMode = v;
            UI.rerender(); // いま出ている問題はそのまま。次の問題からこの難易度
          } }, l));
        });
        const lvInfo = h('span', { class: 'muted small hide-sm' }, s.quiz.levelMode === 'auto' ? '正答率に合わせて分野ごとに自動で調整' : '固定');
        root.appendChild(h('div', { class: 'level-row' }, h('span', { class: 'small' }, '難易度'), seg, lvInfo));
        root.appendChild(UI.live((st) => QuizUI.nextNote(st)));
      }
      const holder = h('div', { class: 'quiz-holder' });
      root.appendChild(holder);
      const nextQ = () => {
        if (QuizUI.session) {
          const q = QuizUI.session.next(s);
          const st = UI.$('#session-status'); if (st && QuizUI.session && QuizUI.session.status) st.textContent = QuizUI.session.status();
          if (!q) { QuizUI.endSession(true); return null; }
          return q;
        }
        return G.Quiz.next(s, Date.now());
      };
      QuizUI.panel = QuizUI.createPanel(holder, {
        next: nextQ,
        onDone: (res, q) => { if (QuizUI.session && QuizUI.session.onDone) QuizUI.session.onDone(s, res, q); },
        allowSkip: !(sess && sess.allowSkip === false),
        allowHints: !(sess && sess.allowHints === false),
        oneShot: !!(sess && sess.oneShot),
      });
      const c = s.quiz.current;
      // 続きから出すのは、いまのモードの問題だけ（バトルや模試の問題をふつうの問題として出さない）
      if (c && !c.done && (sess ? c.mode === sess.mode : G.Quiz.isFree(c))) QuizUI.panel.load(G.Quiz.currentQuestion(s));
      else { const q = nextQ(); if (q) QuizUI.panel.load(q); }
      QuizUI.updateCombo();
      const below = h('div', { class: 'quiz-below' });
      QuizUI.extraBelow.forEach((fn) => { const n = fn(s); if (n) below.appendChild(n); });
      root.appendChild(below);
    },
    leave() { if (QuizUI.panel) { QuizUI.panel.destroy(); QuizUI.panel = null; } },
    update(s) { if (QuizUI.session && QuizUI.session.tick) QuizUI.session.tick(s); },
  });
  QuizUI.extraBelow = [];
  QuizUI.extraRow = []; // コンボ表示と同じ行に並べる部品
  /** 分野・難易度を変えても、いま出ている問題は変わらない（問題の引き直しを防ぐ）。次の問題から切りかわることを知らせる */
  QuizUI.nextNote = function (s) {
    const p = G.Quiz.pendingSetting(s);
    if (!p) return null;
    const parts = [];
    if (p.topic) parts.push('「' + Qs.TOPICS[p.topic].name + '」');
    if (p.level !== null) parts.push('難易度「' + Qs.LEVEL_NAMES[p.level] + '」');
    return h('div', { class: 'next-note small' }, '⏭️ いまの問題が終わったら、' + parts.join('・') + 'の問題になるよ');
  };
  /** モード（模試・復習など）の古い問題が残っていたら片づける。ふつうの問題は Quiz.next がとっておいて、あとで続きから出す */
  function dropStale(s) {
    const c = s.quiz.current;
    if (c && !c.done && !G.Quiz.isFree(c) && c.attempts === 0) s.quiz.current = null;
  }
  QuizUI.startSession = function (sess) {
    QuizUI.session = sess;
    dropStale(UI.state);
    UI.go('quiz');
  };
  QuizUI.endSession = function (finished) {
    const sess = QuizUI.session;
    QuizUI.session = null;
    const s = UI.state;
    dropStale(s);
    if (sess && sess.onEnd) sess.onEnd(s, finished);
    else UI.go('quiz');
  };

  UI.noticeHandlers.level = (n) => {
    const up = n.text.indexOf('上がった') >= 0;
    if (MF.Audio) MF.Audio.play(up ? 'levelup' : 'hint');
    if (up && MF.FX) MF.FX.banner('LEVEL UP', n.text); else UI.toast(n.text, 'level', 3500);
    return true;
  };
  MF.QuizUI = QuizUI;
})(globalThis.MF = globalThis.MF || {});
