// =====================================================================
// engine.js — 暗号表の「純粋なロジック」部分（ブラウザ / Node 共通）
//   ・ギミックの状態 → 対応関係・見える文字 の計算
//   ・問題データの steps（解読手順）と constraints（問題文が与える条件）の実行
//   ・全状態の総当たり（tools/verify.js と解説画面で使用）
// UI は js/gimmicks/*.js が担当し、見た目の対応関係はすべてこのファイルの関数で決まる。
// =====================================================================

// ---------- 文字セット（リング） ----------
const KANA46 = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'];
// いろは順（ゐ・ゑを除き、最後に ん）。KANA46 と同じ46文字の並べ替え
const IROHA46 = [...'いろはにほへとちりぬるをわかよたれそつねならむうのおくやまけふこえてあさきゆめみしひもせすん'];

export const SETS = {
  KANA46,
  IROHA46,
  ALPHA: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  DIGIT10: [...'0123456789'],
  CONS10: [...'あかさたなはまやらわ'], // 行
  VOW5: [...'あいうえお'], // 段
  ETO12: ['ね', 'うし', 'とら', 'う', 'たつ', 'み', 'うま', 'ひつじ', 'さる', 'とり', 'いぬ', 'い'],
  CLOCK12: ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
  WEEK7: ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'],
};

// 五十音表（行 × 段）。'・' は存在しない枠
export const GOJUON = {
  あ: 'あいうえお', か: 'かきくけこ', さ: 'さしすせそ', た: 'たちつてと', な: 'なにぬねの',
  は: 'はひふへほ', ま: 'まみむめも', や: 'や・ゆ・よ', ら: 'らりるれろ', わ: 'わ・・・を',
};

export const MARK = '●'; // 表側の目印マス
export const EMPTY = '・'; // 何もないマス

export const mod = (a, n) => ((a % n) + n) % n;

export function resolveRing(r) {
  if (Array.isArray(r)) return r.slice();
  if (typeof r === 'string' && SETS[r]) return SETS[r].slice();
  if (typeof r === 'string') return [...r];
  throw new Error('bad ring: ' + JSON.stringify(r));
}

export function toTokens(v) {
  if (Array.isArray(v)) return v.slice();
  return [...String(v)];
}

// ---------- かな分解 ----------
export function decompose(ch) {
  for (const cons of Object.keys(GOJUON)) {
    const i = GOJUON[cons].indexOf(ch);
    if (i >= 0 && ch !== EMPTY) return { cons, vow: SETS.VOW5[i] };
  }
  return null;
}
export function compose(cons, vow) {
  const row = GOJUON[cons];
  if (!row) return null;
  const ch = row[SETS.VOW5.indexOf(vow)];
  return ch && ch !== EMPTY ? ch : null;
}

// =====================================================================
// リング型ギミック（slide / dial）
//   a = 上段 / 左列 / 外円、b = 下段 / 右列 / 内円
//   状態 k : a[i] と b[(i + k) mod n] が向かい合う
// =====================================================================
export function ringOf(g) {
  if (g._ring) return g._ring;
  const a = resolveRing(g.type === 'dial' ? g.outer : g.a);
  const b = resolveRing(g.type === 'dial' ? g.inner : (g.b ?? (g.type === 'dial' ? g.outer : g.a)));
  if (a.length !== b.length) throw new Error(`${g.id}: ring length mismatch`);
  Object.defineProperty(g, '_ring', { value: { a, b, n: a.length }, enumerable: false });
  return g._ring;
}

export function mapToken(g, k, tok, from = 'a') {
  const { a, b, n } = ringOf(g);
  if (from === 'a') {
    const i = a.indexOf(tok);
    return i < 0 ? null : b[mod(i + k, n)];
  }
  const j = b.indexOf(tok);
  return j < 0 ? null : a[mod(j - k, n)];
}

export function mapTokens(g, k, toks, from = 'a') {
  const out = [];
  for (const t of toks) {
    const m = mapToken(g, k, t, from);
    if (m == null) return null;
    out.push(m);
  }
  return out;
}

// =====================================================================
// 透かしカード（stencil）
//   grid : 文字列の配列（1文字 = 1マス、'●' 目印、'・' 空）
//   card : 正方形。'.' 不透明 / 'o' 穴 / '1'〜'9' 番号つき穴 / 'm' 目印穴（●の上に置く）
//   状態 {x, y, rot(0-3, 時計回り90°単位), flip(0/1 左右反転)}
//   変換順：反転 → 回転（CSS の `rotate() scaleX()` と同じ順）
// =====================================================================
export function gridOf(g) {
  return g.grid.map((row) => [...row]);
}

export function cardCells(g, rot = 0, flip = 0) {
  const rows = g.card.map((r) => [...r]);
  const N = rows.length;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const kind = rows[r][c];
      if (kind === '.') continue;
      let rr = r, cc = c;
      if (flip) cc = N - 1 - cc;
      for (let t = 0; t < mod(rot, 4); t++) {
        const nr = cc, nc = N - 1 - rr; // 時計回り90°
        rr = nr; cc = nc;
      }
      cells.push({ r: rr, c: cc, kind, sr: r, sc: c });
    }
  }
  return { N, cells };
}

// 穴から見える文字を読む。valid=false なら「その置き方は成立しない」
export function stencilRead(g, st) {
  const grid = gridOf(g);
  const R = grid.length, C = grid[0].length;
  const { cells } = cardCells(g, st.rot, st.flip);
  const holes = [];
  let valid = true;
  let inside = true;
  for (const cell of cells) {
    const gr = st.y + cell.r, gc = st.x + cell.c;
    const ch = gr >= 0 && gr < R && gc >= 0 && gc < C ? grid[gr][gc] : null;
    if (ch == null) { inside = false; valid = false; continue; }
    if (cell.kind === 'm') {
      if (ch !== MARK) valid = false;
    } else {
      if (ch === MARK || ch === EMPTY) valid = false;
      holes.push({ r: gr, c: gc, ch, num: /[1-9]/.test(cell.kind) ? +cell.kind : 0 });
    }
  }
  const numbered = holes.some((h) => h.num);
  holes.sort((p, q) => (numbered ? p.num - q.num : p.r - q.r || p.c - q.c));
  return { valid, inside, holes, tokens: holes.map((h) => h.ch) };
}

export function stencilStates(g) {
  const grid = gridOf(g);
  const R = grid.length, C = grid[0].length;
  const N = g.card.length;
  const out = [];
  const rots = g.allowRotate ? [0, 1, 2, 3] : [0];
  const flips = g.allowFlip ? [0, 1] : [0];
  for (const rot of rots) for (const flip of flips) {
    for (let y = -(N - 1); y < R; y++) for (let x = -(N - 1); x < C; x++) {
      out.push({ x, y, rot, flip });
    }
  }
  return out;
}

// =====================================================================
// 状態空間
// =====================================================================
export function statesOf(g) {
  switch (g.type) {
    case 'slide':
    case 'dial': {
      const { n } = ringOf(g);
      return Array.from({ length: n }, (_, i) => i);
    }
    case 'stencil':
      return stencilStates(g);
    case 'mirror':
      return [0, 1];
    default:
      throw new Error('unknown gimmick type ' + g.type);
  }
}

export function initialState(g) {
  if (g.type === 'stencil') return { x: 0, y: 0, rot: 0, flip: 0, ...(g.initial || {}) };
  return g.initial ?? 0;
}

export function sameState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// =====================================================================
// steps（解読手順）
// =====================================================================
function resolveRef(ref, vars) {
  // "$K"        → 変数 K のトークン列
  // "$K:1"      → 変数 K の 1 番目のトークン
  // それ以外    → 文字列リテラル（1文字ずつトークン化）/ 配列
  if (typeof ref === 'string' && ref.startsWith('$')) {
    const [name, idx] = ref.slice(1).split(':');
    const v = vars[name];
    if (!v) return null;
    if (idx === undefined) return v;
    const t = v[+idx];
    return t == null ? null : [t];
  }
  return toTokens(ref);
}

export function runSteps(puzzle, states) {
  const G = Object.fromEntries(puzzle.gimmicks.map((g) => [g.id, g]));
  const vars = {};
  const trace = [];
  for (const s of puzzle.steps) {
    let out = null;
    switch (s.type) {
      case 'const':
        out = toTokens(s.value);
        break;
      case 'stencil': {
        const r = stencilRead(G[s.g], states[s.g]);
        out = r.valid ? r.tokens : null;
        break;
      }
      case 'map': {
        const inp = resolveRef(s.in, vars);
        out = inp && mapTokens(G[s.g], states[s.g], inp, s.from || 'a');
        break;
      }
      case 'map2d': {
        // かなを（行, 段）に分解し、行は s.cons、段は s.vow のリングで読み替える
        const inp = resolveRef(s.in, vars);
        if (!inp) break;
        out = [];
        for (const ch of inp) {
          const d = decompose(ch);
          if (!d) { out = null; break; }
          const cons = s.cons ? mapToken(G[s.cons], states[s.cons], d.cons, s.from || 'a') : d.cons;
          const vow = s.vow ? mapToken(G[s.vow], states[s.vow], d.vow, s.from || 'a') : d.vow;
          const c2 = cons && vow ? compose(cons, vow) : null;
          if (!c2) { out = null; break; }
          out.push(c2);
        }
        break;
      }
      case 'reverse': {
        const inp = resolveRef(s.in, vars);
        out = inp && inp.slice().reverse();
        break;
      }
      case 'pick': {
        const inp = resolveRef(s.in, vars);
        if (!inp) break;
        if (s.idx) out = s.idx.map((i) => inp[i]).filter((t) => t != null);
        else out = inp.slice(s.start ?? 0, s.end ?? inp.length);
        break;
      }
      case 'concat': {
        out = [];
        for (const r of s.ins) {
          const v = resolveRef(r, vars);
          if (!v) { out = null; break; }
          out.push(...v);
        }
        break;
      }
      case 'chars': {
        // トークン列を1文字ずつに分解（「うし」「とら」→ う し と ら）
        const inp = resolveRef(s.in, vars);
        out = inp && [...inp.join('')];
        break;
      }
      default:
        throw new Error('unknown step ' + s.type);
    }
    if (!out) return { ok: false, vars, trace, failedAt: s };
    vars[s.out] = out;
    trace.push({ step: s, out });
  }
  const ans = vars[puzzle.answerVar || 'answer'];
  return { ok: !!ans, vars, trace, answer: ans ? ans.join('') : null };
}

// =====================================================================
// constraints（問題文・ギミックが与える条件）
// =====================================================================
export function checkConstraint(c, puzzle, states, vars) {
  const G = Object.fromEntries(puzzle.gimmicks.map((g) => [g.id, g]));
  switch (c.type) {
    case 'crib': {
      // ギミック c.g で、c.text（c.from 側）が c.expect と向かい合う
      const text = resolveRef(c.text, vars);
      const expect = resolveRef(c.expect, vars);
      if (!text || !expect) return false;
      const m = mapTokens(G[c.g], states[c.g], text, c.from || 'a');
      return !!m && m.join('|') === expect.join('|');
    }
    case 'offset': {
      const v = typeof c.value === 'string' ? +resolveRef(c.value, vars)?.join('') : c.value;
      return mod(states[c.g], ringOf(G[c.g]).n) === mod(v, ringOf(G[c.g]).n);
    }
    case 'prop': {
      const v = vars[c.var];
      if (!v) return false;
      const s = v.join('');
      const val = c.value == null ? null : String(c.value);
      switch (c.test) {
        case 'startsWith': return s.startsWith(val);
        case 'endsWith': return s.endsWith(val);
        case 'includes': return s.includes(val);
        case 'equals': return s === val;
        case 'notIncludes': return !s.includes(val);
        case 'count': return [...s].filter((ch) => ch === c.char).length === c.n;
        case 'length': return v.length === c.n;
        default: throw new Error('unknown prop test ' + c.test);
      }
    }
    default:
      throw new Error('unknown constraint ' + c.type);
  }
}

// 解答に関わるギミック（steps / constraints から参照されるもの）
export function involvedGimmicks(puzzle) {
  const ids = new Set();
  for (const s of puzzle.steps) {
    if (s.g) ids.add(s.g);
    if (s.cons) ids.add(s.cons);
    if (s.vow) ids.add(s.vow);
  }
  for (const c of puzzle.constraints || []) if (c.g) ids.add(c.g);
  return puzzle.gimmicks.filter((g) => ids.has(g.id));
}

// 総当たり。条件を満たす全状態と、その答えを返す
export function solveAll(puzzle, { limit = 2e6 } = {}) {
  const gs = involvedGimmicks(puzzle);
  const spaces = gs.map((g) => statesOf(g));
  const total = spaces.reduce((p, s) => p * s.length, 1);
  if (total > limit) throw new Error(`state space too large: ${total}`);
  const hits = [];
  let runnable = 0; // 条件を無視しても解読手順が成立する状態数（＝ギミックを適当に動かしても読める数）
  const runnableAnswers = new Set();
  const idx = new Array(gs.length).fill(0);
  for (let t = 0; t < total; t++) {
    const states = {};
    gs.forEach((g, i) => (states[g.id] = spaces[i][idx[i]]));
    const r = runSteps(puzzle, states);
    if (r.ok) {
      runnable++;
      runnableAnswers.add(r.answer);
      if ((puzzle.constraints || []).every((c) => checkConstraint(c, puzzle, states, r.vars))) {
        hits.push({ states, answer: r.answer, vars: r.vars });
      }
    }
    // 次の組み合わせ
    for (let i = 0; i < gs.length; i++) {
      idx[i]++;
      if (idx[i] < spaces[i].length) break;
      idx[i] = 0;
    }
  }
  return { total, runnable, runnableAnswers: runnableAnswers.size, hits, gimmicks: gs.map((g) => g.id) };
}

// 解説用：保存されている正解状態で解読手順を走らせる
export function solutionTrace(puzzle) {
  const states = {};
  for (const g of puzzle.gimmicks) states[g.id] = puzzle.solution?.[g.id] ?? initialState(g);
  return { states, ...runSteps(puzzle, states) };
}
