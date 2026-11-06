/* 数学ファクトリー：共通ユーティリティ（乱数・分数・日付・HTML整形）
 * ブラウザでも Node でも動くように globalThis.MF にぶら下げる。 */
(function (MF) {
  'use strict';
  const U = {};

  // ---------- 乱数 ----------
  function mix(a) {
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** シード付き乱数オブジェクト（問題生成など、再現性が必要な場所で使う） */
  U.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const r = {
      next() { a = (a + 0x6D2B79F5) | 0; return mix(a); },
      int(lo, hi) { return lo + Math.floor(r.next() * (hi - lo + 1)); },
      nz(lo, hi) { let v = 0; while (v === 0) v = r.int(lo, hi); return v; },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      chance(p) { return r.next() < p; },
      sign() { return r.next() < 0.5 ? -1 : 1; },
      shuffle(arr) { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
    };
    return r;
  };
  /** セーブデータに入っている乱数状態を進める */
  U.rand = function (state) {
    state.rngState = (state.rngState + 0x6D2B79F5) | 0;
    return mix(state.rngState);
  };
  U.randInt = function (state, lo, hi) { return lo + Math.floor(U.rand(state) * (hi - lo + 1)); };
  U.randPick = function (state, arr) { return arr[Math.floor(U.rand(state) * arr.length)]; };
  U.randChance = function (state, p) { return U.rand(state) < p; };
  U.weightedPick = function (state, items, weightFn) {
    let total = 0; for (const it of items) total += Math.max(0, weightFn(it));
    if (total <= 0) return items[0];
    let x = U.rand(state) * total;
    for (const it of items) { x -= Math.max(0, weightFn(it)); if (x < 0) return it; }
    return items[items.length - 1];
  };
  U.newSeed = function (state) { return (Math.floor(U.rand(state) * 2147483646) + 1); };

  // ---------- 数・分数 ----------
  U.gcd = function (a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
  U.lcm = function (a, b) { return Math.abs(a * b) / U.gcd(a, b); };
  U.fact = function (n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  U.nPr = function (n, r) { let v = 1; for (let i = 0; i < r; i++) v *= (n - i); return v; };
  U.nCr = function (n, r) { if (r < 0 || r > n) return 0; r = Math.min(r, n - r); let v = 1; for (let i = 1; i <= r; i++) v = v * (n - r + i) / i; return Math.round(v); };
  U.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /** 有理数 {n, d}（d>0、既約） */
  U.frac = function (n, d) {
    if (d === undefined) d = 1;
    if (typeof n === 'object') return U.frac(n.n, n.d);
    if (d === 0) throw new Error('分母が0');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      // 小数が混じったら近い分数にする（内部計算用）
      return U.fromDecimal(n / d);
    }
    if (d < 0) { n = -n; d = -d; }
    const g = U.gcd(n, d);
    return { n: n / g, d: d / g };
  };
  U.fromDecimal = function (x) {
    for (let d = 1; d <= 100000; d *= 10) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return U.frac(n, d); }
    return U.frac(Math.round(x * 100000), 100000);
  };
  const F = (x) => (typeof x === 'number' ? U.frac(x, 1) : x);
  U.fadd = (a, b) => { a = F(a); b = F(b); return U.frac(a.n * b.d + b.n * a.d, a.d * b.d); };
  U.fsub = (a, b) => { a = F(a); b = F(b); return U.frac(a.n * b.d - b.n * a.d, a.d * b.d); };
  U.fmul = (a, b) => { a = F(a); b = F(b); return U.frac(a.n * b.n, a.d * b.d); };
  U.fdiv = (a, b) => { a = F(a); b = F(b); return U.frac(a.n * b.d, a.d * b.n); };
  U.feq = (a, b) => { a = F(a); b = F(b); return a.n === b.n && a.d === b.d; };
  U.fval = (a) => { a = F(a); return a.n / a.d; };
  U.fpow = (a, k) => { let r = U.frac(1); for (let i = 0; i < k; i++) r = U.fmul(r, a); return r; };
  U.fstr = function (a) { a = F(a); return a.d === 1 ? String(a.n) : a.n + '/' + a.d; };

  /** 入力文字列を有理数に。全角・いろいろなマイナス記号・小数・分数に対応。読めなければ null */
  U.normalizeInput = function (s) {
    if (s === null || s === undefined) return '';
    s = String(s);
    s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    s = s.replace(/[－ー−‐―–—]/g, '-').replace(/[／÷]/g, '/').replace(/[．。]/g, '.').replace(/＋/g, '+');
    s = s.replace(/\s+/g, '');
    return s;
  };
  U.parseAnswer = function (raw) {
    const s = U.normalizeInput(raw);
    if (!s) return null;
    let m = s.match(/^([+-]?)(\d+)$/);
    if (m) return U.frac((m[1] === '-' ? -1 : 1) * parseInt(m[2], 10), 1);
    m = s.match(/^([+-]?)(\d*)\.(\d+)$/);
    if (m) {
      const intPart = m[2] ? parseInt(m[2], 10) : 0;
      const den = Math.pow(10, m[3].length);
      const num = intPart * den + parseInt(m[3], 10);
      return U.frac((m[1] === '-' ? -1 : 1) * num, den);
    }
    m = s.match(/^([+-]?)\(?([+-]?)(\d+)\)?\/\(?([+-]?)(\d+)\)?$/);
    if (m) {
      const den = parseInt(m[5], 10);
      if (den === 0) return null;
      let sign = 1;
      if (m[1] === '-') sign = -sign;
      if (m[2] === '-') sign = -sign;
      if (m[4] === '-') sign = -sign;
      return U.frac(sign * parseInt(m[3], 10), den);
    }
    return null;
  };

  // ---------- 表示用（HTML） ----------
  const MINUS = '−';
  U.MINUS = MINUS;
  U.num = (v) => (v < 0 ? MINUS + Math.abs(v) : String(v));
  /** 分数の HTML（縦書きの分数） */
  U.fh = function (a) {
    a = F(a);
    if (a.d === 1) return U.num(a.n);
    const sign = a.n < 0 ? MINUS : '';
    return sign + '<span class="frac"><span class="fn">' + Math.abs(a.n) + '</span><span class="fd">' + a.d + '</span></span>';
  };
  /** 分数 n/d をそのまま（約分せずに）HTML */
  U.fhRaw = function (n, d) {
    const sign = (n < 0) !== (d < 0) && n !== 0 ? MINUS : '';
    return sign + '<span class="frac"><span class="fn">' + Math.abs(n) + '</span><span class="fd">' + Math.abs(d) + '</span></span>';
  };
  U.sup = (s) => '<sup>' + s + '</sup>';
  U.sub = (s) => '<sub>' + s + '</sub>';
  U.vec = (s) => '<span class="vec">' + s + '</span>';
  U.sqrt = (s) => '√<span class="rt">' + s + '</span>';
  U.paren = (v) => (typeof v === 'object' ? (F(v).n < 0 ? '(' + U.fh(v) + ')' : U.fh(v)) : (v < 0 ? '(' + U.num(v) + ')' : String(v)));
  /** 係数の配列（高次から）を多項式の HTML に。coeffs は数 or 分数 */
  U.poly = function (coeffs, v) {
    v = v || 'x';
    const deg = coeffs.length - 1;
    let out = '';
    coeffs.forEach((c0, i) => {
      const c = F(c0);
      if (c.n === 0) return;
      const p = deg - i;
      const neg = c.n < 0;
      const abs = U.frac(Math.abs(c.n), c.d);
      let coefStr = '';
      if (!(abs.n === 1 && abs.d === 1) || p === 0) coefStr = U.fh(abs);
      let varStr = p === 0 ? '' : p === 1 ? v : v + U.sup(p);
      if (out === '') out += (neg ? MINUS : '') + coefStr + varStr;
      else out += (neg ? ' ' + MINUS + ' ' : ' + ') + coefStr + varStr;
    });
    return out || '0';
  };
  /** (x − p) の形：p が負なら (x + |p|) */
  U.shift = function (p, v) {
    v = v || 'x';
    p = F(p);
    if (p.n === 0) return v;
    return '(' + v + (p.n > 0 ? ' ' + MINUS + ' ' : ' + ') + U.fh(U.frac(Math.abs(p.n), p.d)) + ')';
  };
  /** 符号付きの項 "+ 3" / "− 3" */
  U.signed = function (c) {
    c = F(c);
    if (c.n === 0) return '';
    return (c.n < 0 ? ' ' + MINUS + ' ' : ' + ') + U.fh(U.frac(Math.abs(c.n), c.d));
  };
  U.esc = function (s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); };

  // ---------- 日付 ----------
  U.dateStr = function (ms) {
    const d = new Date(ms);
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };
  U.dayIndex = function (ms) { // ローカル日付の通し番号
    const d = new Date(ms);
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  };
  U.weekKey = function (ms) { // 月曜はじまりの週番号
    const di = U.dayIndex(ms);
    return Math.floor((di + 3) / 7); // 1970-01-01 は木曜
  };
  U.hashStr = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + '時間' + m + '分';
    if (m > 0) return m + '分' + (s < 10 ? '0' : '') + s + '秒';
    return s + '秒';
  };
  U.fmtClock = function (sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  U.fmtNum = function (v) {
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e4) return (v / 1e3).toFixed(1) + 'k';
    return String(Math.floor(v));
  };
  U.deepClone = (o) => JSON.parse(JSON.stringify(o));

  MF.Util = U;
})(globalThis.MF = globalThis.MF || {});
