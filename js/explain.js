// =====================================================================
// 解説画面：暗号表の「正しい状態」を図として再現し、解読の流れを見せる
// =====================================================================
import { createGimmick } from './gimmicks/index.js';
import { solutionTrace, decompose } from './engine.js';
import { richText } from './play.js';
import { sfx } from './audio.js';
import { h } from './drag.js';

const STEP_LABEL = {
  const: () => '暗号',
  stencil: () => 'カードの穴から読む',
  map: (s, G) => `${G[s.g].label || '暗号表'}で読みかえ`,
  map2d: () => '行と段を読みかえ',
  reverse: () => '逆から読む',
  pick: () => '続きを取り出す',
  concat: () => 'つなげる',
  chars: () => '読みをつなげる',
};

export function explainScreen(p, { label, onExit, onNext }) {
  const el = h('div', 'screen explain');
  const head = h('header', 'play-head');
  const back = h('button', 'icon-btn', '←');
  back.addEventListener('click', () => { sfx.tap(); onExit(); });
  const ttl = h('div', 'play-title');
  ttl.append(h('span', 'play-no', label), h('span', 'play-name', '解説'));
  head.append(back, ttl, h('div', 'timer ghosted', ''));

  const body = h('div', 'ex-body scroll');
  const G = Object.fromEntries(p.gimmicks.map((g) => [g.id, g]));
  const tr = solutionTrace(p);

  const top = h('div', 'ex-answer');
  top.append(h('small', '', `${p.title} の答え`), h('div', 'ex-answer-word', p.answer));
  body.append(top);

  // 解読の流れ
  const flow = h('div', 'ex-flow');
  tr.trace.forEach((t, i) => {
    const row = h('div', 'ex-step');
    row.append(h('span', 'ex-step-n', String(i + 1)), h('span', 'ex-step-l', STEP_LABEL[t.step.type](t.step, G)));
    row.append(h('span', 'ex-step-v', t.out.join(t.out.some((x) => x.length > 1) ? '・' : '')));
    flow.append(row);
  });
  body.append(h('h3', 'ex-h', '解読の流れ'), flow);

  // 正しい状態の図
  body.append(h('h3', 'ex-h', '正しい状態'));
  const figs = [];
  const hi = {};
  for (const t of tr.trace) {
    const s = t.step;
    const inp = s.in ? (s.in.startsWith('$') ? tr.vars[s.in.slice(1).split(':')[0]] : [...s.in]) : null;
    if (s.type === 'map') {
      const from = s.from || 'a';
      hi[s.g] = from === 'a' ? [inp, t.out] : [t.out, inp];
    }
    if (s.type === 'map2d') {
      const dIn = inp.map(decompose), dOut = t.out.map(decompose);
      if (s.cons) hi[s.cons] = [dIn.map((d) => d.cons), dOut.map((d) => d.cons)];
      if (s.vow) hi[s.vow] = [dIn.map((d) => d.vow), dOut.map((d) => d.vow)];
    }
  }
  for (const def of p.gimmicks) {
    const box = h('div', 'ex-fig');
    box.append(h('div', 'ex-fig-label', def.label || def.type));
    const stage = h('div', `ex-fig-stage t-${def.type}`);
    const g = createGimmick(def, { readOnly: true, state: tr.states[def.id] });
    stage.append(g.el);
    box.append(stage);
    body.append(box);
    figs.push({ g, stage, def });
  }

  const ex = h('div', 'ex-text');
  ex.append(h('h3', 'ex-h', 'なぜこの答え？'), h('p', '', ''));
  ex.lastChild.append(richText(p.explanation));
  body.append(ex);

  const btns = h('div', 'ex-btns');
  const bNext = h('button', 'btn primary', '次の問題へ ▶');
  bNext.addEventListener('click', () => { sfx.tap(); onNext(); });
  const bMap = h('button', 'btn ghost', 'マップへ');
  bMap.addEventListener('click', () => { sfx.tap(); onExit(); });
  btns.append(bNext, bMap);
  body.append(btns);
  el.append(head, body);

  const layout = () => {
    for (const f of figs) {
      const w = f.stage.clientWidth;
      const hh = f.def.type === 'dial' ? Math.min(w, 340) : f.def.type === 'stencil' ? Math.min(w, 380) : f.def.type === 'mirror' ? 150 : f.def.axis === 'y' ? 300 : 150;
      f.stage.style.height = hh + 'px';
      f.g.resize(w, hh);
      const H = hi[f.def.id];
      if (H) {
        f.g.highlight(H[0], H[1]);
        if (f.g.focus && H[0]?.length) f.g.focus(H[0][0]);
      }
    }
  };
  requestAnimationFrame(layout);
  const ro = new ResizeObserver(layout);
  ro.observe(body);
  return { el, destroy: () => ro.disconnect() };
}
