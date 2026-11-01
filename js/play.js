// =====================================================================
// 問題画面（ギミック操作・タイル回答・判定・ヒント・クリア演出）
// =====================================================================
import { CONFIG } from './config.js';
import { createGimmick, ICONS } from './gimmicks/index.js';
import { initialState } from './engine.js';
import { TileBoard } from './tiles.js';
import { sfx } from './audio.js';
import { buzz } from './haptics.js';
import { burst, flash, low } from './fx.js';
import { h } from './drag.js';
import { store, save, recordClear, totalStars } from './storage.js';

export function computeStars(time, target, hints) {
  const S = CONFIG.stars;
  const ratio = time / target;
  let base = S.minTimeStars;
  if (ratio <= S.timeSteps[0]) base = 3;
  else if (ratio <= S.timeSteps[1]) base = 2;
  else if (ratio <= S.timeSteps[2]) base = 1;
  return Math.max(0, Math.min(3, base) - hints * S.hintPenalty);
}

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// 『』で囲まれた部分を強調表示
export function richText(text) {
  const frag = document.createDocumentFragment();
  text.split('\n').forEach((line, i) => {
    if (i) frag.append(document.createElement('br'));
    line.split(/(『[^』]*』)/).forEach((part) => {
      if (/^『.*』$/.test(part)) frag.append(h('em', 'q-em', part.slice(1, -1)));
      else if (part) frag.append(document.createTextNode(part));
    });
  });
  return frag;
}

const SHORT = { ずらし帯: '帯', いろは帯: 'いろは', 行の帯: '行', 段の帯: '段' };

// ギミックを無理なく操作できるステージの高さ（足りなければ問題文を折りたたむ）
function needHeight(def) {
  switch (def.type) {
    case 'stencil': return def.grid.length * CONFIG.stencil.cellMin + 62;
    case 'dial': return 236;
    case 'mirror': return 150;
    case 'slide': return def.axis === 'y' ? 5 * 30 + 72 : 2 * CONFIG.slide.cellMin * 1.16 + 50;
    default: return 180;
  }
}

let lastSnapAt = 0;
function snapFx() {
  const now = performance.now();
  if (now - lastSnapAt < CONFIG.snap.minInterval) return;
  lastSnapAt = now;
  sfx.snap();
  buzz('snap');
}

export function playScreen(p, { label, onExit, onExplain, onNext, bonusThresholds }) {
  const el = h('div', 'screen play');
  let hints = 0, misses = 0, done = false;
  let elapsed = 0, runningSince = performance.now();
  const timeNow = () => elapsed + (runningSince ? (performance.now() - runningSince) / 1000 : 0);
  const pause = () => { if (runningSince) { elapsed = timeNow(); runningSince = 0; } };
  const resume = () => { if (!runningSince && !done) runningSince = performance.now(); };
  const onVis = () => (document.hidden ? pause() : resume());
  document.addEventListener('visibilitychange', onVis);

  // ---- ヘッダー ----
  const head = h('header', 'play-head');
  const back = h('button', 'icon-btn', '←');
  back.setAttribute('aria-label', 'マップへ戻る');
  back.addEventListener('click', () => { sfx.tap(); onExit(); });
  const ttl = h('div', 'play-title');
  ttl.append(h('span', 'play-no', label), h('span', 'play-name', p.title));
  const timer = h('div', 'timer', '0:00');
  head.append(back, ttl, timer);
  const tick = setInterval(() => { timer.textContent = fmtTime(timeNow()); timer.classList.toggle('over', timeNow() > p.targetTime); }, 250);

  // ---- 問題文 ----
  // 問題文：長いときは折りたたみ、タップで全文をステージの上に重ねて表示
  const qWrap = h('div', 'q-wrap');
  const q = h('div', 'q-box');
  const qText = h('div', 'q-text scroll');
  qText.append(richText(p.question));
  const qMore = h('div', 'q-more', '全文 ▼');
  q.append(qText, qMore);
  qWrap.append(q);
  const need = Math.max(...p.gimmicks.map(needHeight));
  const setQ = (lim) => {
    const full = qText.scrollHeight;
    const clamp = full > lim + 8;
    q.classList.toggle('clamp', clamp);
    qWrap.style.height = (clamp ? lim : full) + 22 + 'px';
  };
  const fitQ = () => {
    q.classList.remove('open');
    qMore.textContent = '全文 ▼';
    const lim = Math.round(Math.max(70, Math.min(window.innerHeight * 0.15, 118)));
    setQ(lim);
    const short = need - stage.getBoundingClientRect().height;
    if (short > 0) setQ(Math.max(46, lim - short));
  };
  q.addEventListener('click', () => {
    if (!q.classList.contains('clamp')) return;
    q.classList.toggle('open');
    qMore.textContent = q.classList.contains('open') ? 'とじる ▲' : '全文 ▼';
    sfx.tap();
  });

  // ---- ギミック ----
  const stage = h('div', 'stage');
  const panes = p.gimmicks.map((def) => {
    const pane = h('div', 'pane');
    const g = createGimmick(def, {
      state: initialState(def),
      onSnap: snapFx,
      onSound: (k) => sfx[k]?.(),
    });
    pane.append(g.el);
    stage.append(pane);
    return { def, pane, g, sized: false };
  });
  let active = 0;
  const sizeActive = () => {
    const r = stage.getBoundingClientRect();
    if (r.width < 10) return;
    const P = panes[active];
    P.g.resize(r.width, r.height);
    P.sized = true;
  };
  const ro = new ResizeObserver(() => { panes.forEach((x) => (x.sized = false)); sizeActive(); });
  ro.observe(stage);

  // ---- タブ＋ヒント ----
  const bar = h('div', 'play-bar');
  const tabs = h('div', 'tabs');
  if (panes.length > 1) {
    panes.forEach((P, i) => {
      const t = h('button', 'tab');
      t.append(h('span', 'tab-ico', ICONS[P.def.type]), h('span', 'tab-txt', SHORT[P.def.label] || P.def.label || P.def.type));
      t.addEventListener('click', () => select(i));
      tabs.append(t);
      P.tab = t;
    });
  }
  const select = (i) => {
    if (i === active && panes[i].sized) return;
    active = i;
    panes.forEach((P, j) => {
      P.pane.classList.toggle('on', j === i);
      P.tab?.classList.toggle('on', j === i);
    });
    sfx.tap();
    sizeActive();
  };
  panes[0].pane.classList.add('on');
  panes[0].tab?.classList.add('on');
  const hintBtn = h('button', 'hint-btn');
  const updHint = () => {
    hintBtn.innerHTML = '';
    hintBtn.append(h('span', 'hb-ico', '💡'), h('span', '', `${hints}/3`));
    hintBtn.setAttribute('aria-label', `ヒント（${hints}/3 使用）`);
  };
  updHint();
  hintBtn.addEventListener('click', () => openHints());
  if (panes.length > 1) bar.append(tabs);
  stage.append(hintBtn);

  // ---- タイル ----
  const toast = h('div', 'toast');
  const tb = new TileBoard({
    tiles: shuffle(p.tiles, p.id),
    length: [...p.answer].length,
    onPlace: (i) => { sfx.place(i); buzz('place'); },
    onRemove: () => sfx.remove(),
    onFull: (v) => (v === p.answer ? correct() : wrong()),
  });

  stage.append(toast);
  el.append(head, qWrap, stage, bar, tb.el);

  function wrong() {
    misses++;
    tb.shake();
    sfx.wrong();
    buzz('wrong');
    showToast('ちがうみたい… タイルをタップで外せるよ');
  }
  let toastT = 0;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('on'), 1800);
  }

  // ---- ヒント ----
  function openHints() {
    sfx.tap();
    const ov = h('div', 'sheet-wrap');
    const sheet = h('div', 'sheet');
    const close = () => { ov.classList.add('closing'); setTimeout(() => ov.remove(), 200); };
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    const render = () => {
      sheet.innerHTML = '';
      sheet.append(h('div', 'sheet-grip'));
      sheet.append(h('h3', 'sheet-title', '💡 ヒント'));
      const list = h('div', 'hint-list scroll');
      const names = ['方向性', '使い方', 'ほぼ答え'];
      for (let i = 0; i < hints; i++) {
        const it = h('div', 'hint-item');
        it.append(h('b', 'hint-lv', `${i + 1}. ${names[i]}`), h('p', '', p.hints[i]));
        list.append(it);
      }
      if (!hints) list.append(h('p', 'hint-empty', 'ヒントは3段階。方向性 → ギミックの使い方 → ほぼ答え の順に出るよ。'));
      sheet.append(list);
      if (hints < 3) {
        const cur = computeStars(0, 1, hints), nxt = computeStars(0, 1, hints + 1);
        sheet.append(h('p', 'hint-cost', `見ると このステージの★が1つ減ります（最大 ${'★'.repeat(cur)}${'☆'.repeat(3 - cur)} → ${'★'.repeat(nxt)}${'☆'.repeat(3 - nxt)}）。コンボも止まります。`));
        const b = h('button', 'btn primary', `ヒント${hints + 1}を見る（★−1）`);
        b.addEventListener('click', () => { hints++; updHint(); sfx.hint(); render(); });
        sheet.append(b);
      }
      const c = h('button', 'btn ghost', 'とじる');
      c.addEventListener('click', close);
      sheet.append(c);
    };
    render();
    ov.append(sheet);
    el.append(ov);
  }

  // ---- 正解！ ----
  function correct() {
    if (done) return;
    done = true;
    pause();
    const time = timeNow();
    tb.locked = true;
    const s = store();
    const perfect = hints === 0 && misses === 0;
    s.combo = perfect ? s.combo + 1 : 0;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    save();
    const level = Math.min(s.combo, CONFIG.combo.maxLevel);
    const stars = computeStars(time, p.targetTime, hints);
    const before = totalStars();
    recordClear(p.id, { stars, time, hints });
    const after = totalStars();
    const newBonus = (bonusThresholds || []).filter((t) => before < t && after >= t);

    // 1) タメ
    tb.el.classList.add('charge');
    el.classList.add('charging');
    sfx.charge();
    buzz(8);
    setTimeout(() => {
      // 2) タイルが光りながら弾ける
      tb.el.classList.remove('charge');
      tb.el.classList.add('pop');
      el.classList.remove('charging');
      flash(level >= 3 ? CONFIG.palette[level % CONFIG.palette.length] : '#fff');
      sfx.fanfare(level);
      buzz('clear');
      tb.slotRects().forEach((r, i) => setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, { level, count: Math.round((CONFIG.combo.particlesBase + CONFIG.combo.particlesPerLevel * level) / 2) }), i * 40));
      if (!low()) el.classList.add('quake');
      setTimeout(() => showClear({ time, stars, level, combo: s.combo, newBonus }), CONFIG.clearFx.burstMs);
    }, CONFIG.clearFx.holdMs);
  }

  function showClear({ time, stars, level, combo, newBonus }) {
    const ov = h('div', `clear-wrap lv${level}`);
    const card = h('div', 'clear-card');
    const ttl = h('div', 'clear-title');
    [...'せいかい！'].forEach((ch, i) => { const sp = h('span', '', ch); sp.style.animationDelay = i * 60 + 'ms'; ttl.append(sp); });
    const ans = h('div', 'clear-answer', p.answer);
    const starRow = h('div', 'star-row');
    const starEls = [0, 1, 2].map(() => { const e = h('div', 'big-star', '★'); starRow.append(e); return e; });
    const info = h('div', 'clear-info');
    info.append(h('span', '', `タイム ${fmtTime(time)}`), h('span', '', `目標 ${fmtTime(p.targetTime)}`), h('span', '', `ヒント ${hints}回`));
    const comboEl = h('div', 'combo-badge');
    const btns = h('div', 'clear-btns');
    const bEx = h('button', 'btn primary', 'なぜ？ 解説を見る');
    bEx.addEventListener('click', () => { sfx.tap(); onExplain(); });
    const bNext = h('button', 'btn', '次の問題へ ▶');
    bNext.addEventListener('click', () => { sfx.tap(); onNext(); });
    const bMap = h('button', 'btn ghost', 'マップ');
    bMap.addEventListener('click', () => { sfx.tap(); onExit(); });
    btns.append(bEx, bNext, bMap);
    card.append(ttl, ans, starRow, info, comboEl, btns);
    ov.append(card);
    el.append(ov);
    // 3) ★が1つずつポンポン入る
    const iv = CONFIG.clearFx.starInterval;
    starEls.forEach((e, i) => setTimeout(() => {
      if (i < stars) {
        e.classList.add('on');
        sfx.star(i);
        buzz('star');
        const r = e.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, { level, count: 14 + level * 4, spread: 0.6, kinds: ['star'] });
      } else {
        e.classList.add('off');
        sfx.noStar();
      }
    }, 350 + i * iv));
    const tEnd = 350 + 3 * iv;
    setTimeout(() => {
      if (combo >= 2) {
        comboEl.textContent = `${combo} COMBO!`;
        comboEl.classList.add('on');
        sfx.combo(level);
      } else if (combo === 1) {
        comboEl.textContent = 'ノーヒント・ノーミス！';
        comboEl.classList.add('on', 'small');
      } else if (store().combo === 0 && (hints || misses)) {
        comboEl.textContent = 'ヒントなし・ミスなしでコンボがつながる';
        comboEl.classList.add('on', 'muted');
      }
      if (newBonus.length) {
        const nb = h('div', 'unlock-note', '🎁 ボーナス問題が解放された！');
        card.insertBefore(nb, btns);
        sfx.unlock();
      }
      btns.classList.add('on');
    }, tEnd);
  }

  // 初回サイズ決定
  requestAnimationFrame(() => { fitQ(); sizeActive(); });
  const onWinResize = () => fitQ();
  window.addEventListener('resize', onWinResize);

  return {
    el,
    destroy() {
      clearInterval(tick);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onWinResize);
    },
  };
}

// 問題IDから決まる並べ替え（毎回同じ並び＝覚えやすさより公平さ重視なら Math.random に）
function shuffle(arr, seedStr) {
  let s = [...String(seedStr)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
