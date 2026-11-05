/* 数学ファクトリー：問題の自動生成（高校数学 数I・A・II・B・C）
 * generate(topic, level, seed) は同じ引数なら必ず同じ問題を返す（弱点リストの再出題に使う）。
 * 各問題は { text, answer(分数), hints:[ヒント1, ヒント2], steps:[完全解説...] } を持つ。 */
(function (MF) {
  'use strict';
  const U = MF.Util;
  const { fh, poly, sup, sub, num, paren, shift, signed, vec, frac, fadd, fsub, fmul, fdiv, fpow, nCr, nPr, fact, MINUS } = U;

  const TOPICS = {
    quad:   { id: 'quad',   name: '二次関数',     subject: '数I',  resource: 'iron',     color: '#9aa7b4' },
    prob:   { id: 'prob',   name: '確率',         subject: '数A',  resource: 'copper',   color: '#d9824a' },
    diff:   { id: 'diff',   name: '微分',         subject: '数II', resource: 'coal',     color: '#5b5b66' },
    seq:    { id: 'seq',    name: '数列',         subject: '数B',  resource: 'stone',    color: '#b9a27a' },
    vec:    { id: 'vec',    name: 'ベクトル',     subject: '数C',  resource: 'uranium',  color: '#7bd66b' },
    integ:  { id: 'integ',  name: '積分',         subject: '数II', resource: 'silicon',  color: '#8fb3d9' },
    trig:   { id: 'trig',   name: '三角関数',     subject: '数II', resource: 'oil',      color: '#6d5a8a' },
    explog: { id: 'explog', name: '指数・対数',   subject: '数II', resource: 'titanium', color: '#c0c8d0' },
    comb:   { id: 'comb',   name: '場合の数',     subject: '数A',  resource: 'gold',     color: '#e6c34a' },
    cplx:   { id: 'cplx',   name: '複素数平面',   subject: '数C',  resource: 'crystal',  color: '#c77ddb' },
    coord:  { id: 'coord',  name: '図形と方程式', subject: '数II', resource: 'helium',   color: '#e07a9a' },
  };
  const HOME_TOPICS = ['quad', 'prob', 'diff', 'seq', 'vec', 'integ', 'trig'];
  const ALL_TOPICS = Object.keys(TOPICS);
  const LEVEL_NAMES = ['易', '普', '難'];

  // ---------- 表示の小道具 ----------
  const lim = (a, b) => '<span class="lim"><sup>' + b + '</sup><sub>' + a + '</sub></span>';
  const INT = (a, b) => '∫' + lim(num(a), num(b));
  const SIG = (n) => 'Σ' + lim('k=1', n);
  const C = (n, r) => sub(n) + 'C' + sub(r);
  const P = (n, r) => sub(n) + 'P' + sub(r);
  const pt = (x, y) => '(' + fh(x) + ', ' + fh(y) + ')';
  const vt = (a, b, c) => '(' + num(a) + ', ' + num(b) + (c !== undefined ? ', ' + num(c) : '') + ')';
  const coefX = (a, v) => (a === 1 ? v : a === -1 ? MINUS + v : num(a) + v);
  /** 符号付きの「係数×文字」項。0 なら空、±1 なら係数を省く */
  const sv = (c, v) => (c === 0 ? '' : (c < 0 ? ' ' + MINUS + ' ' : ' + ') + (Math.abs(c) === 1 ? '' : Math.abs(c)) + v);
  const cx = (a, b, unitI) => { // a + bi
    unitI = unitI || 'i';
    if (b === 0) return num(a);
    const bi = (Math.abs(b) === 1 ? '' : Math.abs(b)) + unitI;
    if (a === 0) return (b < 0 ? MINUS : '') + bi;
    return num(a) + (b < 0 ? ' ' + MINUS + ' ' : ' + ') + bi;
  };
  const lineEq = (a, b, c) => { // ax + by + c = 0
    let s = '';
    const add = (k, v) => {
      if (k === 0) return;
      const abs = Math.abs(k);
      const body = (abs === 1 && v ? '' : abs) + v;
      if (s === '') s = (k < 0 ? MINUS : '') + body; else s += (k < 0 ? ' ' + MINUS + ' ' : ' + ') + body;
    };
    add(a, 'x'); add(b, 'y'); add(c, '');
    return s + ' = 0';
  };
  const radStr = (deg) => { // 度 → πを使った表示
    if (deg === 0) return '0';
    const f = frac(deg, 180);
    const n = Math.abs(f.n);
    const top = (n === 1 ? '' : n) + 'π';
    const body = f.d === 1 ? top : '<span class="frac"><span class="fn">' + top + '</span><span class="fd">' + f.d + '</span></span>';
    return (f.n < 0 ? MINUS : '') + body;
  };
  function Q(text, answer, hints, steps, extra) {
    const o = { text, answer: typeof answer === 'object' ? frac(answer.n, answer.d) : frac(answer, 1), hints, steps };
    if (extra) Object.assign(o, extra);
    return o;
  }

  // =====================================================================
  //  二次関数（数I）
  // =====================================================================
  const quad = [[], [], []];
  quad[0].push(function vertexRead(r) {
    const p = r.int(-5, 5), q = r.int(-6, 6), a = r.pick([1, 1, 2, -1, 3, -2]);
    const askX = r.chance(0.5);
    const head = a === 1 ? '' : a === -1 ? MINUS : num(a);
    const expr = 'y = ' + head + shift(p) + sup(2) + signed(q);
    const ans = askX ? p : q;
    return Q('二次関数 ' + expr + ' のグラフの頂点の <b>' + (askX ? 'x' : 'y') + ' 座標</b>を求めよ。', ans,
      ['y = a(x − p)' + sup(2) + ' + q のグラフの頂点は点 (p, q) だよ。',
        (p === 0 ? 'かっこがなく x' + sup(2) + ' の形なので p = 0。' : 'かっこの中が (x ' + (p > 0 ? MINUS + ' ' + p : '+ ' + (-p)) + ') なので p = ' + num(p) + '。') + '後ろの定数が q = ' + num(q) + '。'],
      [expr + ' は y = a(x − p)' + sup(2) + ' + q の形。', '頂点は (' + num(p) + ', ' + num(q) + ')。', 'よって ' + (askX ? 'x' : 'y') + ' 座標は <b>' + num(ans) + '</b>。']);
  });
  quad[0].push(function evalPoly(r) {
    const a = r.pick([1, 2, -1, -2, 3]), b = r.int(-5, 5), c = r.int(-6, 6), k = r.int(-3, 3);
    const ans = a * k * k + b * k + c;
    return Q('f(x) = ' + poly([a, b, c]) + ' のとき、f(' + num(k) + ') の値を求めよ。', ans,
      ['x に ' + num(k) + ' を代入するだけ。マイナスの2乗に注意！', 'f(' + num(k) + ') = ' + num(a) + '×' + paren(k) + sup(2) + ' + ' + paren(b) + '×' + paren(k) + ' + ' + paren(c)],
      ['f(' + num(k) + ') = ' + num(a) + '×' + paren(k) + sup(2) + ' + ' + paren(b) + '×' + paren(k) + ' + ' + paren(c),
        '= ' + num(a * k * k) + ' + ' + paren(b * k) + ' + ' + paren(c), '= <b>' + num(ans) + '</b>']);
  });
  quad[1].push(function extremum(r) {
    const a = r.pick([1, -1, 2, -2]), p = r.nz(-4, 4), q = r.int(-8, 8);
    const b = -2 * a * p, c = a * p * p + q;
    const word = a > 0 ? '最小値' : '最大値';
    const A = a === 1 ? '' : a === -1 ? MINUS : num(a);
    return Q('二次関数 y = ' + poly([a, b, c]) + ' の<b>' + word + '</b>を求めよ。', q,
      ['平方完成して y = a(x − p)' + sup(2) + ' + q の形にしよう。a の符号で最大か最小かが決まる。',
        'y = ' + A + '(x' + sup(2) + signed(-2 * p) + 'x)' + signed(c) + ' と x' + sup(2) + ' の係数でくくってみよう。'],
      ['y = ' + A + '(x' + sup(2) + signed(-2 * p) + 'x)' + signed(c),
        '= ' + A + shift(p) + sup(2) + signed(-a * p * p) + signed(c),
        '= ' + A + shift(p) + sup(2) + signed(q),
        (a > 0 ? '下に凸' : '上に凸') + 'の放物線なので、x = ' + num(p) + ' のとき' + word + ' <b>' + num(q) + '</b>。']);
  });
  quad[1].push(function axis(r) {
    const a = r.pick([1, 2, -1, 2]), b = r.pick([1, 3, 5, -1, -3, -5, 7]), c = r.int(-5, 5);
    const ans = frac(-b, 2 * a);
    return Q('放物線 y = ' + poly([a, b, c]) + ' の軸は直線 x = □ である。□ に入る数を求めよ。', ans,
      ['y = ax' + sup(2) + ' + bx + c の軸は x = ' + MINUS + 'b/(2a)。平方完成でも同じ結果になるよ。', 'a = ' + num(a) + ', b = ' + num(b) + ' を代入しよう。'],
      ['軸は x = ' + MINUS + 'b/(2a)', '= ' + MINUS + paren(b) + ' ÷ (2×' + paren(a) + ')', '= <b>' + fh(ans) + '</b>']);
  });
  quad[2].push(function rangeMinMax(r) {
    const p = r.int(-4, 4), q = r.int(-6, 6);
    const m = r.int(-5, 3), n = m + r.int(2, 4);
    const wantMax = r.chance(0.4);
    const f = (x) => (x - p) * (x - p) + q;
    let ans, where, reason;
    if (!wantMax) {
      if (p < m) { ans = f(m); where = m; reason = '軸 x = ' + num(p) + ' は区間の左外。区間では右上がりなので左端で最小。'; }
      else if (p > n) { ans = f(n); where = n; reason = '軸 x = ' + num(p) + ' は区間の右外。区間では右下がりなので右端で最小。'; }
      else { ans = q; where = p; reason = '軸 x = ' + num(p) + ' が区間に含まれるので、頂点で最小。'; }
    } else {
      if (Math.abs(m - p) >= Math.abs(n - p)) { ans = f(m); where = m; } else { ans = f(n); where = n; }
      reason = '下に凸なので、軸 x = ' + num(p) + ' から遠いほうの端 x = ' + num(where) + ' で最大。';
    }
    const word = wantMax ? '最大値' : '最小値';
    return Q('f(x) = ' + poly([1, -2 * p, p * p + q]) + '（' + num(m) + ' ≦ x ≦ ' + num(n) + '）の<b>' + word + '</b>を求めよ。', ans,
      ['平方完成して軸の位置と定義域の関係を調べよう。', 'f(x) = ' + shift(p) + sup(2) + signed(q) + '。軸は x = ' + num(p) + '。区間 ' + num(m) + ' ≦ x ≦ ' + num(n) + ' と比べよう。'],
      ['f(x) = ' + shift(p) + sup(2) + signed(q) + '（軸 x = ' + num(p) + '）', reason, word + ' = f(' + num(where) + ') = <b>' + num(ans) + '</b>']);
  });
  quad[2].push(function doubleRoot(r) {
    const r1 = r.int(1, 5), r2 = r.int(-5, -1);
    const A = r1 + r2, B = -r1 * r2;
    const constPart = (A === 0 ? '' : coefX(A, 'm') + ' + ') + B;
    return Q('x の2次方程式 x' + sup(2) + ' − 2mx + ' + (A === 0 ? B : '(' + constPart + ')') + ' = 0 が<b>重解</b>をもつような正の定数 m の値を求めよ。', r1,
      ['重解をもつ ⇔ 判別式 D = 0。x の係数が偶数（−2m）なので D/4 = (b′)' + sup(2) + ' − ac が便利。',
        'D/4 = m' + sup(2) + ' − (' + constPart + ') = 0 を解こう。'],
      ['D/4 = (' + MINUS + 'm)' + sup(2) + ' − 1·(' + constPart + ') = m' + sup(2) + sv(-A, 'm') + signed(-B),
        '= ' + shift(r1, 'm') + shift(r2, 'm') + ' = 0', 'm = ' + num(r1) + ', ' + num(r2), 'm > 0 より m = <b>' + r1 + '</b>']);
  });

  // =====================================================================
  //  確率（数A・数B）
  // =====================================================================
  const prob = [[], [], []];
  prob[0].push(function diceSum(r) {
    const s = r.int(2, 12);
    const pairs = [];
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === s) pairs.push('(' + i + ',' + j + ')');
    const ans = frac(pairs.length, 36);
    return Q('大小2個のさいころを投げるとき、出た目の<b>和が ' + s + '</b> になる確率を求めよ。', ans,
      ['目の出方は全部で 6×6 = 36 通り。どれも同様に確からしい。', '和が ' + s + ' になる組 (大, 小) を全部書き出して数えよう。'],
      ['全体：36 通り', '和が ' + s + '：' + pairs.join(' ') + ' の ' + pairs.length + ' 通り', '確率 = ' + U.fhRaw(pairs.length, 36) + ' = <b>' + fh(ans) + '</b>']);
  });
  prob[0].push(function coins(r) {
    const n = r.int(3, 5), k = r.int(0, n);
    const ans = frac(nCr(n, k), Math.pow(2, n));
    return Q('1枚のコインを ' + n + ' 回投げるとき、表がちょうど <b>' + k + ' 回</b>出る確率を求めよ。', ans,
      ['表裏の出方は全部で 2' + sup(n) + ' = ' + Math.pow(2, n) + ' 通り。', n + ' 回のうちどの ' + k + ' 回が表かを選ぶので ' + C(n, k) + ' 通り。'],
      ['全体：2' + sup(n) + ' = ' + Math.pow(2, n) + ' 通り', '表が ' + k + ' 回：' + C(n, k) + ' = ' + nCr(n, k) + ' 通り', '確率 = ' + U.fhRaw(nCr(n, k), Math.pow(2, n)) + ' = <b>' + fh(ans) + '</b>']);
  });
  prob[0].push(function oneDie(r) {
    const k = r.int(2, 5);
    const evs = [['偶数の目', [2, 4, 6]], ['奇数の目', [1, 3, 5]], ['3の倍数の目', [3, 6]], ['素数の目', [2, 3, 5]], ['6の約数の目', [1, 2, 3, 6]],
      [k + ' 以上の目', [1, 2, 3, 4, 5, 6].filter((x) => x >= k)], [k + ' 以下の目', [1, 2, 3, 4, 5, 6].filter((x) => x <= k)]];
    const [name, list] = r.pick(evs);
    const ans = frac(list.length, 6);
    return Q('1個のさいころを投げるとき、<b>' + name + '</b>が出る確率を求めよ。', ans,
      ['目の出方は 6 通り。条件に合う目を数えよう。', name + 'は ' + list.join(', ') + ' のどれか。'],
      ['全体：6 通り', name + '：' + list.join(', ') + ' の ' + list.length + ' 通り', '確率 = ' + U.fhRaw(list.length, 6) + ' = <b>' + fh(ans) + '</b>']);
  });
  prob[1].push(function bag(r) {
    const red = r.int(2, 6), white = r.int(2, 6), n = red + white;
    const all = nCr(n, 2);
    const kind = r.int(0, 2);
    let cnt, name, how;
    if (kind === 0) { cnt = nCr(red, 2); name = '2個とも赤玉'; how = '赤 ' + red + ' 個から2個：' + C(red, 2) + ' = ' + cnt + ' 通り'; }
    else if (kind === 1) { cnt = red * white; name = '赤玉と白玉が1個ずつ'; how = '赤1個 × 白1個：' + red + '×' + white + ' = ' + cnt + ' 通り'; }
    else { cnt = nCr(red, 2) + nCr(white, 2); name = '2個が同じ色'; how = '赤2個 ' + C(red, 2) + ' + 白2個 ' + C(white, 2) + ' = ' + nCr(red, 2) + ' + ' + nCr(white, 2) + ' = ' + cnt + ' 通り'; }
    const ans = frac(cnt, all);
    return Q('赤玉 ' + red + ' 個、白玉 ' + white + ' 個が入った袋から、同時に2個取り出す。<b>' + name + '</b>である確率を求めよ。', ans,
      ['玉はすべて区別して考える。2個の取り出し方は全部で ' + C(n, 2) + ' = ' + all + ' 通り。', '条件に合う取り出し方を組合せ C で数えよう。'],
      ['全体：' + C(n, 2) + ' = ' + all + ' 通り', how, '確率 = ' + U.fhRaw(cnt, all) + ' = <b>' + fh(ans) + '</b>']);
  });
  prob[1].push(function atLeast(r) {
    const m = r.pick([2, 2, 3]), k = r.int(4, 6);
    const miss = frac(Math.pow(k - 1, m), Math.pow(6, m));
    const ans = fsub(1, miss);
    return Q(m + ' 個のさいころを同時に投げるとき、<b>少なくとも1個は ' + k + ' 以上</b>の目が出る確率を求めよ。', ans,
      ['「少なくとも」は余事象を考えるのが定番。1 − (どれも ' + k + ' 未満の確率)。', 'すべて ' + (k - 1) + ' 以下になる確率は (' + U.fhRaw(k - 1, 6) + ')' + sup(m) + '。'],
      ['余事象：' + m + ' 個とも ' + (k - 1) + ' 以下 → (' + U.fhRaw(k - 1, 6) + ')' + sup(m) + ' = ' + fh(miss), '求める確率 = 1 − ' + fh(miss) + ' = <b>' + fh(ans) + '</b>']);
  });
  const trialCtx = [
    [frac(1, 2), 'さいころを投げて偶数の目が出る'], [frac(1, 3), 'さいころを投げて1か2の目が出る'], [frac(2, 3), 'さいころを投げて3以上の目が出る'],
    [frac(1, 6), 'さいころを投げて6の目が出る'], [frac(1, 4), '当たる確率 1/4 のくじを引く（引いたら戻す）とき当たる'], [frac(3, 4), '成功率 3/4 のシュートが入る'],
  ];
  prob[2].push(function binomial(r) {
    const n = r.int(3, 5), k = r.int(1, n - 1);
    const [p, ctx] = r.pick(trialCtx);
    const q = fsub(1, p);
    const pk = fpow(p, k), qk = fpow(q, n - k);
    const ans = fmul(nCr(n, k), fmul(pk, qk));
    return Q('「' + ctx + '」という試行を ' + n + ' 回くり返す。ちょうど <b>' + k + ' 回</b>起こる確率を求めよ。', ans,
      ['反復試行の確率：' + C('n', 'k') + ' p' + sup('k') + '(1 − p)' + sup('n−k') + '。1回で起こる確率 p = ' + fh(p) + '。',
        C(n, k) + ' × (' + fh(p) + ')' + sup(k) + ' × (' + fh(q) + ')' + sup(n - k) + ' を計算しよう。'],
      ['p = ' + fh(p) + '、起こらない確率 1 − p = ' + fh(q), C(n, k) + ' × (' + fh(p) + ')' + sup(k) + ' × (' + fh(q) + ')' + sup(n - k),
        '= ' + nCr(n, k) + ' × ' + fh(pk) + ' × ' + fh(qk), '= <b>' + fh(ans) + '</b>']);
  });
  prob[2].push(function conditional(r) {
    const red = r.int(2, 6), white = r.int(2, 6), n = red + white;
    const rr = frac(red * (red - 1), n * (n - 1)), wr = frac(white * red, n * (n - 1));
    const pb = fadd(rr, wr);
    const ans = fdiv(rr, pb);
    return Q('赤玉 ' + red + ' 個、白玉 ' + white + ' 個が入った袋から、1個ずつ2回、<b>戻さずに</b>取り出す。2回目に赤玉が出たとき、1回目も赤玉である<b>条件付き確率</b>を求めよ。', ans,
      ['P(A|B) = P(A∩B) ÷ P(B)。B は「2回目が赤」、A は「1回目が赤」。', 'P(B) =「赤→赤」+「白→赤」の確率。'],
      ['P(赤→赤) = ' + U.fhRaw(red, n) + ' × ' + U.fhRaw(red - 1, n - 1) + ' = ' + fh(rr), 'P(白→赤) = ' + U.fhRaw(white, n) + ' × ' + U.fhRaw(red, n - 1) + ' = ' + fh(wr),
        'P(B) = ' + fh(rr) + ' + ' + fh(wr) + ' = ' + fh(pb), '求める確率 = ' + fh(rr) + ' ÷ ' + fh(pb) + ' = <b>' + fh(ans) + '</b>']);
  });
  prob[2].push(function binomDist(r) {
    const [p, n] = r.pick([[frac(1, 2), 10], [frac(1, 2), 20], [frac(1, 3), 12], [frac(1, 3), 18], [frac(1, 6), 36], [frac(1, 6), 30], [frac(1, 4), 20], [frac(1, 4), 12], [frac(2, 3), 9], [frac(1, 5), 25]]);
    const askV = r.chance(0.5);
    const E = fmul(n, p), V = fmul(E, fsub(1, p));
    const ans = askV ? V : E;
    return Q('確率変数 X が二項分布 B(' + n + ', ' + fh(p) + ') に従うとき、X の<b>' + (askV ? '分散 V(X)' : '期待値 E(X)') + '</b>を求めよ。', ans,
      ['B(n, p) の期待値は E(X) = np、分散は V(X) = np(1 − p)。（数B 統計的な推測）', 'n = ' + n + '、p = ' + fh(p) + ' を代入しよう。'],
      [askV ? 'V(X) = np(1 − p) = ' + n + ' × ' + fh(p) + ' × ' + fh(fsub(1, p)) : 'E(X) = np = ' + n + ' × ' + fh(p), '= <b>' + fh(ans) + '</b>']);
  });

  // =====================================================================
  //  微分（数II）
  // =====================================================================
  const diff = [[], [], []];
  diff[0].push(function quadDeriv(r) {
    const a = r.nz(-4, 4), b = r.int(-6, 6), c = r.int(-5, 5), k = r.int(-3, 3);
    const ans = 2 * a * k + b;
    return Q('f(x) = ' + poly([a, b, c]) + ' のとき、<b>f′(' + num(k) + ')</b> を求めよ。', ans,
      ['(x' + sup('n') + ')′ = nx' + sup('n−1') + '、定数の微分は 0。', 'f′(x) = ' + poly([2 * a, b]) + ' に x = ' + num(k) + ' を代入。'],
      ['f′(x) = ' + poly([2 * a, b]), 'f′(' + num(k) + ') = ' + num(2 * a) + '×' + paren(k) + signed(b) + ' = <b>' + num(ans) + '</b>']);
  });
  diff[0].push(function powerDeriv(r) {
    const n = r.int(3, 5), a = r.nz(-3, 3), b = r.int(-5, 5), k = r.pick([-2, -1, 1, 2]);
    const ans = a * n * Math.pow(k, n - 1) + b;
    const coeffs = [a]; for (let i = 0; i < n - 2; i++) coeffs.push(0); coeffs.push(b, 0);
    const d = [a * n]; for (let i = 0; i < n - 2; i++) d.push(0); d.push(b);
    return Q('f(x) = ' + poly(coeffs) + ' のとき、<b>f′(' + num(k) + ')</b> を求めよ。', ans,
      ['(x' + sup(n) + ')′ = ' + n + 'x' + sup(n - 1) + '。', 'f′(x) = ' + poly(d) + '。'],
      ['f′(x) = ' + poly(d), 'f′(' + num(k) + ') = ' + num(a * n) + '×' + paren(k) + sup(n - 1) + signed(b), '= ' + num(a * n * Math.pow(k, n - 1)) + signed(b) + ' = <b>' + num(ans) + '</b>']);
  });
  diff[1].push(function cubicDeriv(r) {
    const a = r.nz(-2, 2), b = r.int(-4, 4), c = r.int(-6, 6), d = r.int(-5, 5), k = r.int(-2, 3);
    const ans = 3 * a * k * k + 2 * b * k + c;
    return Q('f(x) = ' + poly([a, b, c, d]) + ' のとき、x = ' + num(k) + ' における微分係数 <b>f′(' + num(k) + ')</b> を求めよ。', ans,
      ['項ごとに微分しよう。(x' + sup(3) + ')′ = 3x' + sup(2) + '、(x' + sup(2) + ')′ = 2x。', 'f′(x) = ' + poly([3 * a, 2 * b, c])],
      ['f′(x) = ' + poly([3 * a, 2 * b, c]), 'f′(' + num(k) + ') = ' + num(3 * a) + '×' + paren(k) + sup(2) + signed(2 * b) + '×' + paren(k) + signed(c), '= <b>' + num(ans) + '</b>']);
  });
  diff[1].push(function tangent(r) {
    const cubic = r.chance(0.4);
    const b = r.int(-4, 4), c = r.int(-4, 4), t = r.pick([-2, -1, 1, 2, 3]);
    const coeffs = cubic ? [1, 0, b, c] : [1, b, c];
    const f = (x) => (cubic ? x * x * x + b * x + c : x * x + b * x + c);
    const m = cubic ? 3 * t * t + b : 2 * t + b;
    const ft = f(t);
    const n = ft - m * t;
    const askM = r.chance(0.35);
    return Q('曲線 y = ' + poly(coeffs) + ' 上の点 (' + num(t) + ', ' + num(ft) + ') における接線を y = mx + n とするとき、<b>' + (askM ? 'm' : 'n') + '</b> の値を求めよ。', askM ? m : n,
      ['x = t における接線：y − f(t) = f′(t)(x − t)。傾きは f′(t)。', 'f′(x) = ' + poly(cubic ? [3, 0, b] : [2, b]) + ' より f′(' + num(t) + ') = ' + num(m) + '。'],
      ['f′(x) = ' + poly(cubic ? [3, 0, b] : [2, b]) + '、f′(' + num(t) + ') = ' + num(m), 'y − ' + paren(ft) + ' = ' + num(m) + '(x − ' + paren(t) + ')',
        'y = ' + poly([m, n]), 'よって ' + (askM ? 'm' : 'n') + ' = <b>' + num(askM ? m : n) + '</b>']);
  });
  diff[2].push(function cubicExtreme(r) {
    const al = r.int(-4, 2), be = al + 2 * r.int(1, 3);
    const k = r.pick([1, 1, -1]);
    const A = -3 * (al + be) / 2, B = 3 * al * be, Cc = r.int(-6, 6);
    const f = (x) => k * (x * x * x + A * x * x + B * x) + Cc;
    const wantMax = r.chance(0.5);
    const maxAt = k > 0 ? al : be, minAt = k > 0 ? be : al;
    const at = wantMax ? maxAt : minAt;
    const ans = f(at);
    const word = wantMax ? '極大値' : '極小値';
    return Q('関数 f(x) = ' + poly([k, k * A, k * B, Cc]) + ' の<b>' + word + '</b>を求めよ。', ans,
      ['f′(x) = 0 となる x を求めて増減表をかこう。', 'f′(x) = ' + poly([3 * k, 2 * k * A, k * B]) + ' = ' + num(3 * k) + shift(al) + shift(be) + '。'],
      ['f′(x) = ' + poly([3 * k, 2 * k * A, k * B]) + ' = ' + num(3 * k) + shift(al) + shift(be), 'f′(x) = 0 より x = ' + num(al) + ', ' + num(be),
        'x' + sup(3) + ' の係数が' + (k > 0 ? '正' : '負') + 'なので、x = ' + num(maxAt) + ' で極大、x = ' + num(minAt) + ' で極小。',
        word + ' = f(' + num(at) + ') = <b>' + num(ans) + '</b>']);
  });
  diff[2].push(function extremeCoef(r) {
    const al = r.int(-3, 2), be = al + 2 * r.int(1, 2);
    const a = -3 * (al + be) / 2, b = 3 * al * be;
    return Q('関数 f(x) = x' + sup(3) + ' + ax' + sup(2) + ' + bx が x = ' + num(al) + ' と x = ' + num(be) + ' で極値をとるとき、<b>a + b</b> の値を求めよ。', a + b,
      ['極値をとる x では f′(x) = 0。f′(x) = 3x' + sup(2) + ' + 2ax + b。', 'f′(x) = 3' + shift(al) + shift(be) + ' と係数を比べよう。'],
      ['f′(x) = 3x' + sup(2) + ' + 2ax + b = 3' + shift(al) + shift(be) + ' = ' + poly([3, -3 * (al + be), 3 * al * be]),
        '係数比較：2a = ' + num(-3 * (al + be)) + '、b = ' + num(b) + '（このとき確かに符号が変わり極値になる）', 'a = ' + num(a) + '、b = ' + num(b) + ' より a + b = <b>' + num(a + b) + '</b>']);
  });

  // =====================================================================
  //  数列（数B）
  // =====================================================================
  const seq = [[], [], []];
  seq[0].push(function arithTerm(r) {
    const a = r.int(-10, 10), d = r.nz(-5, 5), k = r.int(5, 20);
    const ans = a + (k - 1) * d;
    return Q('初項 ' + num(a) + '、公差 ' + num(d) + ' の等差数列の<b>第 ' + k + ' 項</b>を求めよ。', ans,
      ['等差数列の一般項は a' + sub('n') + ' = a + (n − 1)d。', 'a' + sub(k) + ' = ' + num(a) + ' + (' + k + ' − 1)×' + paren(d)],
      ['a' + sub('n') + ' = a + (n − 1)d', 'a' + sub(k) + ' = ' + num(a) + ' + ' + (k - 1) + '×' + paren(d) + ' = <b>' + num(ans) + '</b>']);
  });
  seq[0].push(function geoTerm(r) {
    const a = r.nz(-4, 5), rr = r.pick([2, 3, -2, -3, 2]), k = r.int(3, 6);
    const ans = a * Math.pow(rr, k - 1);
    return Q('初項 ' + num(a) + '、公比 ' + num(rr) + ' の等比数列の<b>第 ' + k + ' 項</b>を求めよ。', ans,
      ['等比数列の一般項は a' + sub('n') + ' = ar' + sup('n−1') + '。', 'a' + sub(k) + ' = ' + num(a) + '×' + paren(rr) + sup(k - 1)],
      ['a' + sub(k) + ' = ' + num(a) + '×' + paren(rr) + sup(k - 1) + ' = ' + num(a) + '×' + paren(Math.pow(rr, k - 1)), '= <b>' + num(ans) + '</b>']);
  });
  seq[1].push(function arithSum(r) {
    const a = r.int(-8, 10), d = r.nz(-4, 5), n = r.int(5, 20);
    const ans = n * (2 * a + (n - 1) * d) / 2;
    const last = a + (n - 1) * d;
    return Q('初項 ' + num(a) + '、公差 ' + num(d) + ' の等差数列の、初項から<b>第 ' + n + ' 項までの和</b>を求めよ。', ans,
      ['等差数列の和：S' + sub('n') + ' = n(初項 + 末項)/2 = n{2a + (n − 1)d}/2。', '末項 a' + sub(n) + ' = ' + num(a) + ' + ' + (n - 1) + '×' + paren(d) + ' = ' + num(last)],
      ['末項 a' + sub(n) + ' = ' + num(last), 'S = ' + n + '×(' + num(a) + ' + ' + paren(last) + ') ÷ 2', '= <b>' + num(ans) + '</b>']);
  });
  seq[1].push(function geoSum(r) {
    const a = r.int(1, 5), rr = r.pick([2, 3, -2, 2]), n = r.int(3, 7);
    const ans = a * (Math.pow(rr, n) - 1) / (rr - 1);
    return Q('初項 ' + a + '、公比 ' + num(rr) + ' の等比数列の、初項から<b>第 ' + n + ' 項までの和</b>を求めよ。', ans,
      ['等比数列の和：S' + sub('n') + ' = a(r' + sup('n') + ' − 1)/(r − 1)（r ≠ 1）。', 'r' + sup(n) + ' = ' + paren(rr) + sup(n) + ' = ' + num(Math.pow(rr, n))],
      ['S = ' + a + '×{' + paren(rr) + sup(n) + ' − 1} ÷ (' + num(rr) + ' − 1)', '= ' + a + '×' + paren(Math.pow(rr, n) - 1) + ' ÷ ' + paren(rr - 1), '= <b>' + num(ans) + '</b>']);
  });
  seq[1].push(function arithFromTwo(r) {
    const a = r.int(-10, 10), d = r.nz(-4, 5);
    const p = r.int(2, 5), q = p + r.int(2, 5), k = q + r.int(2, 8);
    const ap = a + (p - 1) * d, aq = a + (q - 1) * d, ans = a + (k - 1) * d;
    return Q('等差数列 {a' + sub('n') + '} において、a' + sub(p) + ' = ' + num(ap) + '、a' + sub(q) + ' = ' + num(aq) + ' である。<b>a' + sub(k) + '</b> を求めよ。', ans,
      ['a' + sub(q) + ' − a' + sub(p) + ' = (' + q + ' − ' + p + ')d から公差 d が分かる。', 'd = (' + num(aq) + ' − ' + paren(ap) + ') ÷ ' + (q - p) + ' = ' + num(d)],
      ['公差 d = (' + num(aq) + ' − ' + paren(ap) + ') ÷ ' + (q - p) + ' = ' + num(d), 'a' + sub(k) + ' = a' + sub(q) + ' + (' + k + ' − ' + q + ')d = ' + num(aq) + ' + ' + (k - q) + '×' + paren(d), '= <b>' + num(ans) + '</b>']);
  });
  seq[2].push(function sigmaPoly(r) {
    const p = r.int(1, 3), q = r.int(-4, 4), c = r.int(-5, 5), n = r.int(5, 12);
    const s2 = n * (n + 1) * (2 * n + 1) / 6, s1 = n * (n + 1) / 2;
    const ans = p * s2 + q * s1 + c * n;
    return Q(SIG(n) + '(' + poly([p, q, c], 'k') + ') の値を求めよ。', ans,
      ['Σk' + sup(2) + ' = n(n+1)(2n+1)/6、Σk = n(n+1)/2、Σc = cn を使って項ごとに分けよう。', 'n = ' + n + ' のとき Σk' + sup(2) + ' = ' + s2 + '、Σk = ' + s1 + '。'],
      ['与式 = ' + (p === 1 ? '' : p) + 'Σk' + sup(2) + sv(q, 'Σk') + (c ? signed(c) + '×' + n : ''), '= ' + p + '×' + s2 + (q ? signed(q) + '×' + s1 : '') + signed(c * n), '= <b>' + num(ans) + '</b>']);
  });
  seq[2].push(function recurrence(r) {
    const a1 = r.int(1, 5), p = r.pick([2, 3, -1, 2, -2]), q = r.int(-5, 5), k = r.int(4, 6);
    const vals = [a1];
    for (let i = 1; i < k; i++) vals.push(p * vals[i - 1] + q);
    const ans = vals[k - 1];
    return Q('a' + sub(1) + ' = ' + a1 + '、a' + sub('n+1') + ' = ' + coefX(p, 'a' + sub('n')) + signed(q) + ' で定まる数列の<b>a' + sub(k) + '</b> を求めよ。', ans,
      ['漸化式に n = 1, 2, 3, … と順に代入していけば求まる。（一般項は特性方程式 α = ' + coefX(p, 'α') + signed(q) + ' でも解けるよ）', 'a' + sub(2) + ' = ' + num(p) + '×' + paren(a1) + signed(q) + ' = ' + num(vals[1])],
      vals.slice(1).map((v, i) => 'a' + sub(i + 2) + ' = ' + num(p) + '×' + paren(vals[i]) + signed(q) + ' = ' + num(v)).concat(['よって a' + sub(k) + ' = <b>' + num(ans) + '</b>']));
  });
  seq[2].push(function kaisa(r) {
    const s = r.int(-3, 5), c = r.int(1, 3), e = r.int(-3, 3), k = r.int(5, 10);
    const m = k - 1;
    const ans = s + c * m * (m + 1) / 2 + e * m;
    return Q('a' + sub(1) + ' = ' + num(s) + '、a' + sub('n+1') + ' − a' + sub('n') + ' = ' + poly([c, e], 'n') + ' を満たす数列の<b>a' + sub(k) + '</b> を求めよ。', ans,
      ['階差数列 b' + sub('n') + ' = ' + poly([c, e], 'n') + ' を使う：a' + sub('n') + ' = a' + sub(1) + ' + Σ' + lim('k=1', 'n−1') + 'b' + sub('k') + '（n ≧ 2）。',
        'a' + sub(k) + ' = ' + num(s) + ' + Σ' + lim('k=1', m) + '(' + poly([c, e], 'k') + ')'],
      ['a' + sub(k) + ' = ' + num(s) + ' + ' + c + '×Σk' + (e ? signed(e) + '×' + m : '') + '（k = 1〜' + m + '）', '= ' + num(s) + ' + ' + c + '×' + (m * (m + 1) / 2) + signed(e * m), '= <b>' + num(ans) + '</b>']);
  });

  // =====================================================================
  //  ベクトル（数C）
  // =====================================================================
  const vecG = [[], [], []];
  const va = vec('a'), vb = vec('b');
  vecG[0].push(function dot2(r) {
    const a1 = r.int(-5, 5), a2 = r.int(-5, 5), b1 = r.int(-5, 5), b2 = r.int(-5, 5);
    const ans = a1 * b1 + a2 * b2;
    return Q(va + ' = ' + vt(a1, a2) + '、' + vb + ' = ' + vt(b1, b2) + ' のとき、内積 <b>' + va + '·' + vb + '</b> を求めよ。', ans,
      ['成分での内積：' + va + '·' + vb + ' = a' + sub(1) + 'b' + sub(1) + ' + a' + sub(2) + 'b' + sub(2) + '。', num(a1) + '×' + paren(b1) + ' + ' + paren(a2) + '×' + paren(b2)],
      [va + '·' + vb + ' = ' + num(a1) + '×' + paren(b1) + ' + ' + paren(a2) + '×' + paren(b2), '= ' + num(a1 * b1) + ' + ' + paren(a2 * b2) + ' = <b>' + num(ans) + '</b>']);
  });
  vecG[0].push(function combo(r) {
    const a1 = r.int(-4, 4), a2 = r.int(-4, 4), b1 = r.int(-4, 4), b2 = r.int(-4, 4);
    const s = r.pick([1, 2, 3, -1]), t = r.pick([1, 2, -1, -2, 3]);
    const askX = r.chance(0.5);
    const x = s * a1 + t * b1, y = s * a2 + t * b2;
    const expr = coefX(s, va) + (t < 0 ? ' − ' + (t === -1 ? '' : -t) : ' + ' + (t === 1 ? '' : t)) + vb;
    return Q(va + ' = ' + vt(a1, a2) + '、' + vb + ' = ' + vt(b1, b2) + ' のとき、' + expr + ' の<b>' + (askX ? 'x' : 'y') + ' 成分</b>を求めよ。', askX ? x : y,
      ['成分ごとに計算する：s' + va + ' + t' + vb + ' = (sa' + sub(1) + ' + tb' + sub(1) + ', sa' + sub(2) + ' + tb' + sub(2) + ')。', askX ? num(s) + '×' + paren(a1) + ' + ' + paren(t) + '×' + paren(b1) : num(s) + '×' + paren(a2) + ' + ' + paren(t) + '×' + paren(b2)],
      [expr + ' = (' + num(s) + '×' + paren(a1) + ' + ' + paren(t) + '×' + paren(b1) + ', ' + num(s) + '×' + paren(a2) + ' + ' + paren(t) + '×' + paren(b2) + ')', '= ' + vt(x, y), (askX ? 'x' : 'y') + ' 成分は <b>' + num(askX ? x : y) + '</b>']);
  });
  vecG[1].push(function perp(r) {
    const a1 = r.nz(-5, 5), a2 = r.nz(-5, 5), b2 = r.nz(-6, 6);
    const ans = frac(-a2 * b2, a1);
    return Q(va + ' = ' + vt(a1, a2) + '、' + vb + ' = (x, ' + num(b2) + ') が<b>垂直</b>になるような x の値を求めよ。', ans,
      ['垂直 ⇔ 内積 = 0（零ベクトルでないとき）。', num(a1) + 'x + ' + paren(a2) + '×' + paren(b2) + ' = 0 を解こう。'],
      [va + '·' + vb + ' = ' + num(a1) + 'x' + signed(a2 * b2) + ' = 0', 'x = ' + fh(ans) + '。答え <b>' + fh(ans) + '</b>']);
  });
  vecG[1].push(function parallel(r) {
    const a1 = r.nz(-5, 5), a2 = r.nz(-5, 5), b2 = r.nz(-6, 6);
    const ans = frac(a1 * b2, a2);
    return Q(va + ' = ' + vt(a1, a2) + '、' + vb + ' = (x, ' + num(b2) + ') が<b>平行</b>になるような x の値を求めよ。', ans,
      ['平行 ⇔ ' + vb + ' = k' + va + '、成分では a' + sub(1) + 'b' + sub(2) + ' − a' + sub(2) + 'b' + sub(1) + ' = 0。', num(a1) + '×' + paren(b2) + ' − ' + paren(a2) + '×x = 0'],
      [num(a1) + '×' + paren(b2) + ' − ' + paren(a2) + 'x = 0', 'x = ' + num(a1 * b2) + ' ÷ ' + paren(a2) + ' = <b>' + fh(ans) + '</b>']);
  });
  vecG[1].push(function normSq(r) {
    const a1 = r.int(-4, 4), a2 = r.int(-4, 4), b1 = r.int(-4, 4), b2 = r.int(-4, 4);
    const s = r.pick([1, 2, -1, 3]), t = r.pick([1, -1, 2, -2]);
    const x = s * a1 + t * b1, y = s * a2 + t * b2;
    const expr = coefX(s, va) + (t < 0 ? ' − ' + (t === -1 ? '' : -t) : ' + ' + (t === 1 ? '' : t)) + vb;
    const ans = x * x + y * y;
    return Q(va + ' = ' + vt(a1, a2) + '、' + vb + ' = ' + vt(b1, b2) + ' のとき、<b>|' + expr + '|' + sup(2) + '</b> を求めよ。', ans,
      ['まず ' + expr + ' を成分で求めよう。', '(p, q) の大きさの2乗は p' + sup(2) + ' + q' + sup(2) + '。'],
      [expr + ' = ' + vt(x, y), '|' + expr + '|' + sup(2) + ' = ' + paren(x) + sup(2) + ' + ' + paren(y) + sup(2) + ' = <b>' + ans + '</b>']);
  });
  vecG[1].push(function division(r) {
    const x1 = r.int(-5, 5), y1 = r.int(-5, 5), x2 = r.int(-5, 5), y2 = r.int(-5, 5);
    const m = r.int(1, 3), n = r.int(1, 3);
    const askX = r.chance(0.5);
    const px = frac(n * x1 + m * x2, m + n), py = frac(n * y1 + m * y2, m + n);
    return Q('2点 A' + vt(x1, y1) + '、B' + vt(x2, y2) + ' を結ぶ線分 AB を <b>' + m + ' : ' + n + '</b> に内分する点 P の <b>' + (askX ? 'x' : 'y') + ' 座標</b>を求めよ。', askX ? px : py,
      ['m : n に内分する点は (nA + mB)/(m + n)。', askX ? '(' + n + '×' + paren(x1) + ' + ' + m + '×' + paren(x2) + ') ÷ ' + (m + n) : '(' + n + '×' + paren(y1) + ' + ' + m + '×' + paren(y2) + ') ÷ ' + (m + n)],
      ['P = (' + n + 'A + ' + m + 'B) ÷ ' + (m + n), askX ? 'x = (' + num(n * x1) + ' + ' + paren(m * x2) + ') ÷ ' + (m + n) : 'y = (' + num(n * y1) + ' + ' + paren(m * y2) + ') ÷ ' + (m + n), '= <b>' + fh(askX ? px : py) + '</b>']);
  });
  vecG[2].push(function normFromDot(r) {
    const A = r.int(1, 4), B = r.int(1, 4), d = r.int(-A * B, A * B);
    const s = r.pick([1, 2, 3]), t = r.pick([1, -1, 2, -2, -3]);
    const ans = s * s * A * A + 2 * s * t * d + t * t * B * B;
    const expr = coefX(s, va) + (t < 0 ? ' − ' + (t === -1 ? '' : -t) : ' + ' + (t === 1 ? '' : t)) + vb;
    return Q('|' + va + '| = ' + A + '、|' + vb + '| = ' + B + '、' + va + '·' + vb + ' = ' + num(d) + ' のとき、<b>|' + expr + '|' + sup(2) + '</b> を求めよ。', ans,
      ['|s' + va + ' + t' + vb + '|' + sup(2) + ' = s' + sup(2) + '|' + va + '|' + sup(2) + ' + 2st(' + va + '·' + vb + ') + t' + sup(2) + '|' + vb + '|' + sup(2) + ' と展開しよう。',
        's = ' + s + '、t = ' + num(t) + ' を代入。'],
      ['|' + expr + '|' + sup(2) + ' = ' + (s * s) + '|' + va + '|' + sup(2) + signed(2 * s * t) + '(' + va + '·' + vb + ')' + signed(t * t) + '|' + vb + '|' + sup(2),
        '= ' + (s * s) + '×' + (A * A) + signed(2 * s * t) + '×' + paren(d) + signed(t * t) + '×' + (B * B), '= <b>' + ans + '</b>']);
  });
  vecG[2].push(function triArea(r) {
    let a1, a2, b1, b2, cr;
    do { a1 = r.int(-5, 5); a2 = r.int(-5, 5); b1 = r.int(-5, 5); b2 = r.int(-5, 5); cr = a1 * b2 - a2 * b1; } while (cr === 0);
    const ans = frac(Math.abs(cr), 2);
    return Q('原点 O と 2点 A' + vt(a1, a2) + '、B' + vt(b1, b2) + ' を頂点とする <b>△OAB の面積</b>を求めよ。', ans,
      [vec('OA') + ' = (a' + sub(1) + ', a' + sub(2) + ')、' + vec('OB') + ' = (b' + sub(1) + ', b' + sub(2) + ') のとき、面積 S = ½|a' + sub(1) + 'b' + sub(2) + ' − a' + sub(2) + 'b' + sub(1) + '|。',
        'a' + sub(1) + 'b' + sub(2) + ' − a' + sub(2) + 'b' + sub(1) + ' = ' + num(a1) + '×' + paren(b2) + ' − ' + paren(a2) + '×' + paren(b1)],
      ['a' + sub(1) + 'b' + sub(2) + ' − a' + sub(2) + 'b' + sub(1) + ' = ' + num(a1 * b2) + ' − ' + paren(a2 * b1) + ' = ' + num(cr), 'S = ½ × |' + num(cr) + '| = <b>' + fh(ans) + '</b>']);
  });
  const v3pool = (function () {
    const base = [[1, 2, 2], [0, 3, 4], [2, 3, 6]];
    const out = [];
    base.forEach((b) => {
      const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      perms.forEach((p) => { for (let s = 0; s < 8; s++) { const v = p.map((i, j) => b[i] * ((s >> j) & 1 ? -1 : 1)); out.push(v); } });
    });
    return out;
  })();
  vecG[2].push(function cos3d(r) {
    const u = r.pick(v3pool), v = r.pick(v3pool);
    const lu = Math.round(Math.hypot(u[0], u[1], u[2])), lv = Math.round(Math.hypot(v[0], v[1], v[2]));
    const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const ans = frac(d, lu * lv);
    return Q(va + ' = ' + vt(u[0], u[1], u[2]) + '、' + vb + ' = ' + vt(v[0], v[1], v[2]) + ' のなす角を θ とするとき、<b>cos θ</b> を求めよ。', ans,
      ['cos θ = ' + va + '·' + vb + ' ÷ (|' + va + '||' + vb + '|)。', '|' + va + '| = √(' + (u[0] * u[0]) + '+' + (u[1] * u[1]) + '+' + (u[2] * u[2]) + ') = ' + lu + '、|' + vb + '| = ' + lv + '。'],
      [va + '·' + vb + ' = ' + num(u[0] * v[0]) + ' + ' + paren(u[1] * v[1]) + ' + ' + paren(u[2] * v[2]) + ' = ' + num(d), '|' + va + '| = ' + lu + '、|' + vb + '| = ' + lv, 'cos θ = ' + U.fhRaw(d, lu * lv) + ' = <b>' + fh(ans) + '</b>']);
  });

  // =====================================================================
  //  積分（数II）
  // =====================================================================
  const integ = [[], [], []];
  integ[0].push(function linInt(r) {
    const p = r.nz(-4, 4), q = r.int(-5, 5), a = r.int(-2, 1), b = a + r.int(1, 3);
    const ans = fadd(frac(p * (b * b - a * a), 2), q * (b - a));
    return Q(INT(a, b) + '(' + poly([p, q]) + ') dx を計算せよ。', ans,
      ['原始関数を求めて [F(x)]' + lim(num(a), num(b)) + ' = F(' + num(b) + ') − F(' + num(a) + ')。', 'F(x) = ' + poly([frac(p, 2), q, 0]) + '（x' + sup('n') + ' の積分は x' + sup('n+1') + '/(n+1)）'],
      ['F(x) = ' + poly([frac(p, 2), q, 0]), 'F(' + num(b) + ') = ' + fh(fadd(frac(p * b * b, 2), q * b)) + '、F(' + num(a) + ') = ' + fh(fadd(frac(p * a * a, 2), q * a)), '答え = F(' + num(b) + ') − F(' + num(a) + ') = <b>' + fh(ans) + '</b>']);
  });
  integ[0].push(function sqInt(r) {
    const c = r.int(1, 3), b = r.int(1, 3);
    const ans = frac(c * b * b * b, 3);
    return Q(INT(0, b) + coefX(c, 'x' + sup(2)) + ' dx を計算せよ。', ans,
      ['x' + sup(2) + ' の原始関数は x' + sup(3) + '/3。', '[' + (c === 1 ? '' : c) + 'x' + sup(3) + '/3]' + lim(0, b) + ' を計算しよう。'],
      ['= [' + fh(frac(c, 3)) + 'x' + sup(3) + ']' + lim(0, b), '= ' + fh(frac(c, 3)) + '×' + b + sup(3) + ' − 0 = <b>' + fh(ans) + '</b>']);
  });
  const Fq = (p, q, s, x) => fadd(fadd(frac(p * x * x * x, 3), frac(q * x * x, 2)), s * x);
  integ[1].push(function quadInt(r) {
    const p = r.nz(-3, 3), q = r.int(-4, 4), s = r.int(-4, 4), a = r.int(-2, 1), b = a + r.int(1, 3);
    const ans = fsub(Fq(p, q, s, b), Fq(p, q, s, a));
    return Q(INT(a, b) + '(' + poly([p, q, s]) + ') dx を計算せよ。', ans,
      ['項ごとに積分：x' + sup(2) + ' → x' + sup(3) + '/3、x → x' + sup(2) + '/2、定数 c → cx。', 'F(x) = ' + poly([frac(p, 3), frac(q, 2), s, 0]) + ' として F(' + num(b) + ') − F(' + num(a) + ')。'],
      ['F(x) = ' + poly([frac(p, 3), frac(q, 2), s, 0]), 'F(' + num(b) + ') = ' + fh(Fq(p, q, s, b)) + '、F(' + num(a) + ') = ' + fh(Fq(p, q, s, a)), '答え = <b>' + fh(ans) + '</b>']);
  });
  integ[1].push(function antiderivative(r) {
    const p = r.nz(-3, 3), q = r.int(-4, 4), c0 = r.int(-5, 5), k = r.pick([1, 2, 3, -1]);
    // F'(x) = 3p x^2 + 2q x  → F(x) = p x^3 + q x^2 + c0
    const ans = p * k * k * k + q * k * k + c0;
    return Q('F′(x) = ' + poly([3 * p, 2 * q, 0]) + '、F(0) = ' + num(c0) + ' を満たす関数 F(x) について、<b>F(' + num(k) + ')</b> を求めよ。', ans,
      ['F(x) は F′(x) の不定積分：F(x) = ' + poly([p, q, 0]) + ' + C。', 'F(0) = C = ' + num(c0) + ' で積分定数が決まる。'],
      ['F(x) = ∫(' + poly([3 * p, 2 * q, 0]) + ')dx = ' + poly([p, q, 0]) + ' + C', 'F(0) = C = ' + num(c0) + ' より F(x) = ' + poly([p, q, c0]), 'F(' + num(k) + ') = <b>' + num(ans) + '</b>']);
  });
  integ[2].push(function areaAxis(r) {
    const k = r.pick([1, -1, 2, -2, 3]), al = r.int(-3, 2), be = al + r.int(1, 4);
    const ans = frac(Math.abs(k) * Math.pow(be - al, 3), 6);
    return Q('放物線 y = ' + poly([k, -k * (al + be), k * al * be]) + ' と x 軸で囲まれた部分の<b>面積</b>を求めよ。', ans,
      ['まず x 軸との交点を求めよう。y = ' + num(k) + shift(al) + shift(be) + '。', '公式 ∫' + lim('α', 'β') + '(x − α)(x − β)dx = ' + MINUS + '(β − α)' + sup(3) + '/6 が使える。'],
      ['y = ' + (k === 1 ? '' : k === -1 ? MINUS : num(k)) + shift(al) + shift(be) + '、交点は x = ' + num(al) + ', ' + num(be),
        'S = |' + num(k) + '| × (' + num(be) + ' − ' + paren(al) + ')' + sup(3) + ' ÷ 6 = ' + Math.abs(k) + '×' + Math.pow(be - al, 3) + '/6', '= <b>' + fh(ans) + '</b>']);
  });
  integ[2].push(function areaLine(r) {
    const al = r.int(-3, 1), be = al + r.int(1, 4);
    const m = al + be, n = -al * be;
    const ans = frac(Math.pow(be - al, 3), 6);
    return Q('放物線 y = x' + sup(2) + ' と直線 y = ' + poly([m, n]) + ' で囲まれた部分の<b>面積</b>を求めよ。', ans,
      ['交点の x 座標は x' + sup(2) + ' = ' + poly([m, n]) + ' の解。', 'x' + sup(2) + signed(-m) + (m !== 0 ? 'x' : '') + signed(-n) + ' = ' + shift(al) + shift(be) + ' = 0。あとは (β − α)' + sup(3) + '/6 の公式。'],
      ['x' + sup(2) + ' − (' + poly([m, n]) + ') = ' + shift(al) + shift(be) + '、交点 x = ' + num(al) + ', ' + num(be),
        'S = ∫' + lim(num(al), num(be)) + '{(' + poly([m, n]) + ') − x' + sup(2) + '}dx = (' + num(be) + ' − ' + paren(al) + ')' + sup(3) + '/6', '= <b>' + fh(ans) + '</b>']);
  });
  integ[2].push(function symInt(r) {
    const a = r.int(1, 3), p = r.int(-3, 3), q = r.nz(-3, 3), rr = r.int(-4, 4), s = r.int(-4, 4);
    const ans = fmul(2, fadd(frac(q * a * a * a, 3), s * a));
    return Q(INT(-a, a) + '(' + poly([p, q, rr, s]) + ') dx を計算せよ。', ans,
      ['区間が −a〜a のときは、奇関数（x' + sup(3) + ', x）の部分は 0、偶関数（x' + sup(2) + ', 定数）は 2∫' + lim(0, 'a') + ' にできる。', '与式 = 2' + INT(0, a) + '(' + poly([q, 0, s]) + ')dx'],
      ['奇数次の項は消えるので 与式 = 2' + INT(0, a) + '(' + poly([q, 0, s]) + ')dx', '= 2[' + poly([frac(q, 3), 0, s, 0]) + ']' + lim(0, a), '= <b>' + fh(ans) + '</b>']);
  });

  // =====================================================================
  //  三角関数（数I 三角比・数II）
  // =====================================================================
  const trig = [[], [], []];
  const TV = [ // [関数, 度, 値]
    ['sin', 0, frac(0)], ['sin', 30, frac(1, 2)], ['sin', 90, frac(1)], ['sin', 150, frac(1, 2)], ['sin', 180, frac(0)], ['sin', 210, frac(-1, 2)], ['sin', 270, frac(-1)], ['sin', 330, frac(-1, 2)],
    ['cos', 0, frac(1)], ['cos', 60, frac(1, 2)], ['cos', 90, frac(0)], ['cos', 120, frac(-1, 2)], ['cos', 180, frac(-1)], ['cos', 240, frac(-1, 2)], ['cos', 300, frac(1, 2)],
    ['tan', 0, frac(0)], ['tan', 45, frac(1)], ['tan', 135, frac(-1)], ['tan', 225, frac(1)], ['tan', 315, frac(-1)],
  ];
  const quadrantNote = (deg) => {
    if (deg % 90 === 0) return deg + '° は軸上の角。単位円上の点は ' + ({ 0: '(1, 0)', 90: '(0, 1)', 180: '(−1, 0)', 270: '(0, −1)' }[deg]) + '。';
    const q = Math.floor(deg / 90) + 1;
    const ref = [deg, 180 - deg, deg - 180, 360 - deg][q - 1];
    const signs = { 1: 'sin+, cos+, tan+', 2: 'sin+, cos−, tan−', 3: 'sin−, cos−, tan+', 4: 'sin−, cos+, tan−' }[q];
    return deg + '° は第' + q + '象限（' + signs + '）。基準の角は ' + ref + '°。';
  };
  trig[0].push(function stdValue(r) {
    const [fn, deg, val] = r.pick(TV);
    const useRad = r.chance(0.45);
    const angle = useRad ? radStr(deg) : deg + '°';
    return Q('<b>' + fn + ' ' + angle + '</b> の値を求めよ。', val,
      ['単位円で考えよう：角 θ の動径と単位円の交点が (cos θ, sin θ)、tan θ = sin θ/cos θ。' + (useRad ? 'π = 180° と直してから考えると楽。' : ''),
        (useRad ? angle + ' = ' + deg + '°。' : '') + quadrantNote(deg)],
      [(useRad ? angle + ' = ' + deg + '°' : deg + '°') + '：' + quadrantNote(deg), fn + ' ' + angle + ' = <b>' + fh(val) + '</b>']);
  });
  trig[0].push(function degRad(r) {
    const deg = r.pick([30, 45, 60, 90, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330]);
    if (r.chance(0.5)) {
      return Q('<b>' + radStr(deg) + '</b> を度数法で表すと何度か。（数字だけ入力）', deg,
        ['π ラジアン = 180°。', radStr(deg) + ' の π を 180° に置きかえて計算しよう。'],
        [radStr(deg) + ' = ' + fh(frac(deg, 180)) + ' × 180°', '= <b>' + deg + '</b>°']);
    }
    const f = frac(deg, 180);
    return Q('<b>' + deg + '°</b> を弧度法で表すと □π である。□ に入る数を求めよ。', f,
      ['180° = π ラジアン なので、1° = π/180。', deg + '° = ' + deg + '/180 × π を約分しよう。'],
      [deg + '° = ' + U.fhRaw(deg, 180) + 'π', '= ' + radStr(deg) + '。□ = <b>' + fh(f) + '</b>']);
  });
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
  trig[1].push(function pythag(r) {
    let [a, b, h] = r.pick(TRIPLES); if (r.chance(0.5)) [a, b] = [b, a];
    const obtuse = r.chance(0.5);
    const askTan = r.chance(0.4);
    const sinv = frac(a, h), cosv = frac(obtuse ? -b : b, h), tanv = frac(obtuse ? -a : a, b);
    const range = obtuse ? '90° &lt; θ &lt; 180°' : '0° &lt; θ &lt; 90°';
    return Q('sin θ = ' + fh(sinv) + '（' + range + '）のとき、<b>' + (askTan ? 'tan θ' : 'cos θ') + '</b> の値を求めよ。', askTan ? tanv : cosv,
      ['sin' + sup(2) + 'θ + cos' + sup(2) + 'θ = 1 を使おう。' + (obtuse ? '90° &lt; θ &lt; 180° では cos θ &lt; 0。' : '0° &lt; θ &lt; 90° では cos θ > 0。'),
        'cos' + sup(2) + 'θ = 1 − (' + fh(sinv) + ')' + sup(2) + ' = ' + fh(frac(b * b, h * h))],
      ['cos' + sup(2) + 'θ = 1 − ' + fh(frac(a * a, h * h)) + ' = ' + fh(frac(b * b, h * h)), (obtuse ? 'cos θ &lt; 0' : 'cos θ > 0') + ' より cos θ = ' + fh(cosv),
        askTan ? 'tan θ = sin θ ÷ cos θ = <b>' + fh(tanv) + '</b>' : 'cos θ = <b>' + fh(cosv) + '</b>']);
  });
  trig[1].push(function doubleAngle(r) {
    let [a, b, h] = r.pick(TRIPLES); if (r.chance(0.5)) [a, b] = [b, a];
    const askCos = r.chance(0.5);
    const s2 = frac(2 * a * b, h * h), c2 = fsub(1, frac(2 * a * a, h * h));
    return Q('sin θ = ' + fh(frac(a, h)) + '（0° &lt; θ &lt; 90°）のとき、<b>' + (askCos ? 'cos 2θ' : 'sin 2θ') + '</b> の値を求めよ。', askCos ? c2 : s2,
      [askCos ? '2倍角の公式 cos 2θ = 1 − 2sin' + sup(2) + 'θ を使えば sin だけで計算できる。' : '2倍角の公式 sin 2θ = 2 sin θ cos θ。まず cos θ を求めよう。',
        askCos ? '1 − 2×(' + fh(frac(a, h)) + ')' + sup(2) : 'cos θ = ' + fh(frac(b, h)) + '（第1象限なので正）'],
      askCos ? ['cos 2θ = 1 − 2sin' + sup(2) + 'θ = 1 − 2×' + fh(frac(a * a, h * h)), '= <b>' + fh(c2) + '</b>']
        : ['cos θ = √(1 − sin' + sup(2) + 'θ) = ' + fh(frac(b, h)), 'sin 2θ = 2 × ' + fh(frac(a, h)) + ' × ' + fh(frac(b, h)) + ' = <b>' + fh(s2) + '</b>']);
  });
  trig[1].push(function sineRule(r) {
    const [A, s] = r.pick([[30, frac(1, 2)], [150, frac(1, 2)], [90, frac(1)]]);
    const R = r.int(2, 9);
    const a = fmul(2 * R, s);
    return Q('△ABC において、a = ' + fh(a) + '、A = ' + A + '° のとき、外接円の<b>半径 R</b> を求めよ。', R,
      ['正弦定理：a/sin A = 2R。', 'sin ' + A + '° = ' + fh(s) + ' を代入しよう。'],
      ['2R = a ÷ sin A = ' + fh(a) + ' ÷ ' + fh(s) + ' = ' + (2 * R), 'R = <b>' + R + '</b>']);
  });
  const MAXP = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [1, 0, 1]].filter((x) => x[1] !== 0);
  trig[2].push(function synthesis(r) {
    let [a, b, R] = r.pick(MAXP);
    a *= r.sign(); b *= r.sign();
    const c = r.int(-4, 4), wantMax = r.chance(0.6);
    const ans = wantMax ? R + c : -R + c;
    return Q('y = ' + coefX(a, 'sin θ') + (b < 0 ? ' − ' + (b === -1 ? '' : -b) : ' + ' + (b === 1 ? '' : b)) + 'cos θ' + signed(c) + ' の<b>' + (wantMax ? '最大値' : '最小値') + '</b>を求めよ。', ans,
      ['三角関数の合成：a sin θ + b cos θ = √(a' + sup(2) + ' + b' + sup(2) + ') sin(θ + α)。', '√(' + paren(a) + sup(2) + ' + ' + paren(b) + sup(2) + ') = ' + R + '。sin の値域は −1〜1。'],
      [coefX(a, 'sin θ') + (b < 0 ? ' − ' : ' + ') + Math.abs(b) + 'cos θ = ' + R + ' sin(θ + α)', '−' + R + ' ≦ ' + R + ' sin(θ + α) ≦ ' + R, (wantMax ? '最大値 = ' + R + signed(c) : '最小値 = ' + MINUS + R + signed(c)) + ' = <b>' + num(ans) + '</b>']);
  });
  trig[2].push(function symmetric(r) {
    const t = r.pick([frac(1, 2), frac(1, 3), frac(2, 3), frac(1, 5), frac(-1, 2), frac(-1, 3), frac(3, 4), frac(1, 4)]);
    const sc = fdiv(fsub(fmul(t, t), 1), 2);
    const askCube = r.chance(0.4);
    const cube = fsub(fpow(t, 3), fmul(3, fmul(sc, t)));
    return Q('sin θ + cos θ = ' + fh(t) + ' のとき、<b>' + (askCube ? 'sin' + sup(3) + 'θ + cos' + sup(3) + 'θ' : 'sin θ cos θ') + '</b> の値を求めよ。', askCube ? cube : sc,
      ['両辺を2乗すると (sin θ + cos θ)' + sup(2) + ' = 1 + 2 sin θ cos θ。', 'sin θ cos θ = {(' + fh(t) + ')' + sup(2) + ' − 1} ÷ 2 = ' + fh(sc) + (askCube ? '。さらに a' + sup(3) + ' + b' + sup(3) + ' = (a + b)' + sup(3) + ' − 3ab(a + b)。' : '')],
      ['(' + fh(t) + ')' + sup(2) + ' = 1 + 2 sin θ cos θ', 'sin θ cos θ = ' + fh(sc)].concat(askCube ? ['sin' + sup(3) + 'θ + cos' + sup(3) + 'θ = (' + fh(t) + ')' + sup(3) + ' − 3×' + paren(sc) + '×' + paren(t), '= <b>' + fh(cube) + '</b>'] : ['答え <b>' + fh(sc) + '</b>']));
  });
  const COSR = [[60, 3, 8, 7], [60, 5, 8, 7], [60, 8, 15, 13], [60, 6, 16, 14], [60, 10, 16, 14], [120, 3, 5, 7], [120, 7, 8, 13], [120, 6, 10, 14], [120, 5, 16, 19]];
  trig[2].push(function cosineRule(r) {
    let [A, b, c, a] = r.pick(COSR); if (r.chance(0.5)) [b, c] = [c, b];
    const cosA = A === 60 ? frac(1, 2) : frac(-1, 2);
    return Q('△ABC において、b = ' + b + '、c = ' + c + '、A = ' + A + '° のとき、<b>辺 a の長さ</b>を求めよ。', a,
      ['余弦定理：a' + sup(2) + ' = b' + sup(2) + ' + c' + sup(2) + ' − 2bc cos A。', 'cos ' + A + '° = ' + fh(cosA) + '。'],
      ['a' + sup(2) + ' = ' + b + sup(2) + ' + ' + c + sup(2) + ' − 2×' + b + '×' + c + '×' + paren(cosA), '= ' + (b * b) + ' + ' + (c * c) + signed(A === 60 ? -b * c : b * c) + ' = ' + (a * a), 'a > 0 より a = <b>' + a + '</b>']);
  });

  // =====================================================================
  //  指数・対数（数II）
  // =====================================================================
  const explog = [[], [], []];
  const logS = (b, x) => 'log' + sub(b) + ' ' + x;
  explog[0].push(function logBasic(r) {
    const b = r.pick([2, 3, 5, 10]);
    const range = { 2: [-4, 6], 3: [-3, 4], 5: [-2, 3], 10: [-3, 4] }[b];
    const k = r.int(range[0], range[1]);
    const arg = k >= 0 ? String(Math.pow(b, k)) : fh(frac(1, Math.pow(b, -k)));
    return Q('<b>' + logS(b, arg) + '</b> の値を求めよ。', k,
      ['log' + sub('a') + ' M = p ⇔ a' + sup('p') + ' = M。「' + b + ' を何乗すると ' + (k >= 0 ? Math.pow(b, k) : '1/' + Math.pow(b, -k)) + ' になるか」を考えよう。',
        k >= 0 ? Math.pow(b, k) + ' = ' + b + sup(k) : '1/' + Math.pow(b, -k) + ' = ' + b + sup(MINUS + (-k))],
      [(k >= 0 ? Math.pow(b, k) : '1/' + Math.pow(b, -k)) + ' = ' + b + sup(num(k)), logS(b, arg) + ' = <b>' + num(k) + '</b>']);
  });
  explog[0].push(function negExp(r) {
    const b = r.pick([2, 3, 4, 5, 10]), k = r.int(1, 3);
    const inv = r.chance(0.35);
    const ans = inv ? Math.pow(b, k) : frac(1, Math.pow(b, k));
    const base = inv ? '(' + fh(frac(1, b)) + ')' : String(b);
    return Q('<b>' + base + sup(MINUS + k) + '</b> の値を求めよ。', ans,
      ['a' + sup('−n') + ' = 1/a' + sup('n') + '。', inv ? '(1/' + b + ')' + sup(MINUS + k) + ' = ' + b + sup(k) : b + sup(MINUS + k) + ' = 1/' + b + sup(k)],
      [inv ? '(1/' + b + ')' + sup(MINUS + k) + ' = ' + b + sup(k) : b + sup(MINUS + k) + ' = 1/' + b + sup(k), '= <b>' + fh(ans) + '</b>']);
  });
  explog[1].push(function fracExp(r) {
    const [c, n] = r.pick([[2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [3, 4], [5, 2], [5, 3], [4, 3], [10, 2], [10, 3]]);
    const m = r.pick([1, 2, 3, -1, -2]);
    const base = Math.pow(c, n);
    const ans = m > 0 ? Math.pow(c, m) : frac(1, Math.pow(c, -m));
    return Q('<b>' + base + sup(num(m) + '/' + n) + '</b> の値を求めよ。', ans,
      ['底を素直な数の累乗に直そう：' + base + ' = ' + c + sup(n) + '。', '(' + c + sup(n) + ')' + sup(num(m) + '/' + n) + ' = ' + c + sup(num(m)) + '（指数法則 (a' + sup('p') + ')' + sup('q') + ' = a' + sup('pq') + '）'],
      [base + ' = ' + c + sup(n), base + sup(num(m) + '/' + n) + ' = ' + c + sup(n + '×' + paren(m) + '/' + n) + ' = ' + c + sup(num(m)), '= <b>' + fh(ans) + '</b>']);
  });
  explog[1].push(function logSum(r) {
    const [a, k] = r.pick([[2, 3], [2, 4], [3, 2], [3, 3], [6, 2], [10, 2], [10, 3], [2, 5]]);
    const tot = Math.pow(a, k);
    const divs = []; for (let d = 2; d < tot; d++) if (tot % d === 0) divs.push(d);
    const M = r.pick(divs), N = tot / M;
    if (r.chance(0.5)) {
      return Q('<b>' + logS(a, M) + ' + ' + logS(a, N) + '</b> の値を求めよ。', k,
        ['log' + sub('a') + ' M + log' + sub('a') + ' N = log' + sub('a') + ' MN。', logS(a, M * N) + ' = ' + logS(a, a + sup(k))],
        ['与式 = ' + logS(a, M + '×' + N) + ' = ' + logS(a, tot), tot + ' = ' + a + sup(k) + ' より 答え <b>' + k + '</b>']);
    }
    const X = tot * N;
    return Q('<b>' + logS(a, X) + ' − ' + logS(a, N) + '</b> の値を求めよ。', k,
      ['log' + sub('a') + ' M − log' + sub('a') + ' N = log' + sub('a') + ' (M/N)。', X + ' ÷ ' + N + ' = ' + tot],
      ['与式 = ' + logS(a, X + '/' + N) + ' = ' + logS(a, tot), tot + ' = ' + a + sup(k) + ' より 答え <b>' + k + '</b>']);
  });
  explog[1].push(function changeBase(r) {
    const [a, b] = r.shuffle([2, 3, 5]).slice(0, 2);
    const p = r.int(1, 3), q = r.int(1, 3);
    return Q('<b>' + logS(a, Math.pow(b, p)) + ' × ' + logS(b, Math.pow(a, q)) + '</b> の値を求めよ。', p * q,
      ['底の変換公式：log' + sub('a') + ' b = log b / log a（底をそろえる）。', logS(a, b + sup(p)) + ' = ' + p + 'log' + sub(a) + ' ' + b + '、' + logS(b, a + sup(q)) + ' = ' + q + 'log' + sub(b) + ' ' + a + '、そして log' + sub(a) + ' ' + b + ' × log' + sub(b) + ' ' + a + ' = 1。'],
      ['与式 = ' + (p === 1 ? '' : p) + 'log' + sub(a) + ' ' + b + ' × ' + (q === 1 ? '' : q) + 'log' + sub(b) + ' ' + a, '= ' + (p * q) + ' × (log ' + b + '/log ' + a + ') × (log ' + a + '/log ' + b + ')', '= <b>' + (p * q) + '</b>']);
  });
  explog[2].push(function expQuad(r) {
    const base = r.pick([2, 3]);
    const al = r.int(0, 2), be = al + r.int(1, 2);
    const s = Math.pow(base, al) + Math.pow(base, be), pr = Math.pow(base, al + be);
    const sq = base * base;
    return Q('方程式 <b>' + sq + sup('x') + ' − ' + s + '·' + base + sup('x') + ' + ' + pr + ' = 0</b> のすべての解の和を求めよ。', al + be,
      ['t = ' + base + sup('x') + '（t > 0）とおくと ' + sq + sup('x') + ' = t' + sup(2) + '。', 't' + sup(2) + ' − ' + s + 't + ' + pr + ' = 0 → (t − ' + Math.pow(base, al) + ')(t − ' + Math.pow(base, be) + ') = 0'],
      ['t = ' + base + sup('x') + ' とおくと t' + sup(2) + ' − ' + s + 't + ' + pr + ' = 0', '(t − ' + Math.pow(base, al) + ')(t − ' + Math.pow(base, be) + ') = 0 より t = ' + Math.pow(base, al) + ', ' + Math.pow(base, be),
        base + sup('x') + ' = ' + Math.pow(base, al) + ' → x = ' + al + '、' + base + sup('x') + ' = ' + Math.pow(base, be) + ' → x = ' + be, '解の和 = <b>' + (al + be) + '</b>']);
  });
  explog[2].push(function logEq(r) {
    const m = r.int(2, 4), n = r.int(0, m - 1);
    const x = Math.pow(2, m), c = Math.pow(2, m) - Math.pow(2, n), k = m + n;
    return Q('方程式 <b>' + logS(2, 'x') + ' + ' + logS(2, '(x − ' + c + ')') + ' = ' + k + '</b> を解け。（解 x を入力）', x,
      ['まず真数条件：x > 0 かつ x − ' + c + ' > 0 より x > ' + c + '。', 'log' + sub(2) + ' x(x − ' + c + ') = ' + k + ' → x(x − ' + c + ') = 2' + sup(k) + ' = ' + Math.pow(2, k)],
      ['真数条件より x > ' + c, 'x(x − ' + c + ') = ' + Math.pow(2, k) + ' → x' + sup(2) + ' − ' + c + 'x − ' + Math.pow(2, k) + ' = 0', '(x − ' + x + ')(x + ' + Math.pow(2, n) + ') = 0', 'x > ' + c + ' より x = <b>' + x + '</b>']);
  });
  explog[2].push(function digits(r) {
    const useThree = r.chance(0.35);
    const b = useThree ? 3 : 2, lg = useThree ? 0.4771 : 0.3010, trueLg = Math.log10(b);
    let n;
    do { n = r.int(20, 60); } while (Math.floor(n * lg) !== Math.floor(n * trueLg));
    const digitsN = Math.floor(n * lg) + 1;
    return Q('log' + sub(10) + ' ' + b + ' = ' + lg + ' とする。<b>' + b + sup(n) + ' は何桁の整数か</b>。', digitsN,
      ['N が k 桁 ⇔ 10' + sup('k−1') + ' ≦ N &lt; 10' + sup('k') + ' ⇔ k − 1 ≦ log' + sub(10) + ' N &lt; k。', 'log' + sub(10) + ' ' + b + sup(n) + ' = ' + n + ' × ' + lg + ' = ' + (n * lg).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')],
      ['log' + sub(10) + ' ' + b + sup(n) + ' = ' + n + ' × ' + lg + ' = ' + (n * lg).toFixed(3), Math.floor(n * lg) + ' ≦ log' + sub(10) + ' ' + b + sup(n) + ' &lt; ' + (Math.floor(n * lg) + 1), 'よって 10' + sup(Math.floor(n * lg)) + ' ≦ ' + b + sup(n) + ' &lt; 10' + sup(Math.floor(n * lg) + 1) + '、<b>' + digitsN + '</b> 桁']);
  });

  // =====================================================================
  //  場合の数（数A）
  // =====================================================================
  const comb = [[], [], []];
  comb[0].push(function perm(r) {
    const n = r.int(4, 9), k = r.int(2, 3);
    return Q(n + ' 人の中から ' + k + ' 人を選んで<b>1列に並べる</b>方法は何通りか。', nPr(n, k),
      ['順番を区別するので順列 ' + P('n', 'r') + '。', P(n, k) + ' = ' + Array.from({ length: k }, (_, i) => n - i).join('×')],
      [P(n, k) + ' = ' + Array.from({ length: k }, (_, i) => n - i).join(' × '), '= <b>' + nPr(n, k) + '</b> 通り']);
  });
  comb[0].push(function chooseC(r) {
    const n = r.int(5, 10), k = r.int(2, 4);
    return Q(n + ' 人の中から ' + k + ' 人の<b>委員を選ぶ</b>方法は何通りか。', nCr(n, k),
      ['選ぶだけ（順番は関係ない）なので組合せ ' + C('n', 'r') + '。', C(n, k) + ' = ' + P(n, k) + ' ÷ ' + k + '!'],
      [C(n, k) + ' = (' + Array.from({ length: k }, (_, i) => n - i).join('×') + ') ÷ (' + Array.from({ length: k }, (_, i) => k - i).join('×') + ')', '= <b>' + nCr(n, k) + '</b> 通り']);
  });
  comb[0].push(function factorial(r) {
    const n = r.int(3, 6);
    return Q(n + ' 人が<b>1列に並ぶ</b>並び方は何通りか。', fact(n),
      ['n 人の並び方は n! = n × (n−1) × … × 1。', n + '! = ' + Array.from({ length: n }, (_, i) => n - i).join('×')],
      [n + '! = ' + Array.from({ length: n }, (_, i) => n - i).join(' × '), '= <b>' + fact(n) + '</b> 通り']);
  });
  comb[1].push(function circular(r) {
    const n = r.int(4, 7);
    return Q(n + ' 人が<b>円形のテーブル</b>に座る座り方は何通りか。（回転して同じものは同じとみなす）', fact(n - 1),
      ['円順列は (n − 1)!。1人を固定して残りを並べると考えよう。', '(' + n + ' − 1)! = ' + (n - 1) + '!'],
      ['1人を固定すると残り ' + (n - 1) + ' 人の並び方', '(' + n + ' − 1)! = ' + Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join('×') + ' = <b>' + fact(n - 1) + '</b> 通り']);
  });
  comb[1].push(function divisors(r) {
    const a = r.int(1, 4), b = r.int(0, 3), c = r.int(0, 2);
    const N = Math.pow(2, a) * Math.pow(3, b) * Math.pow(5, c);
    const parts = ['2' + sup(a)]; if (b) parts.push('3' + sup(b)); if (c) parts.push('5' + sup(c));
    const cnt = (a + 1) * (b + 1) * (c + 1);
    const factors = ['(' + a + '+1)']; if (b) factors.push('(' + b + '+1)'); if (c) factors.push('(' + c + '+1)');
    return Q('<b>' + N + ' の正の約数</b>は全部で何個あるか。', cnt,
      ['素因数分解しよう。N = p' + sup('a') + 'q' + sup('b') + '… なら約数の個数は (a+1)(b+1)…。', N + ' = ' + parts.join('×')],
      [N + ' = ' + parts.join(' × '), '約数の個数 = ' + factors.join('×') + ' = <b>' + cnt + '</b> 個']);
  });
  comb[1].push(function committee(r) {
    const m = r.int(4, 7), n = r.int(3, 6), a = r.int(1, 3), b = r.int(1, 2);
    const ans = nCr(m, a) * nCr(n, b);
    return Q('男子 ' + m + ' 人、女子 ' + n + ' 人の中から、<b>男子 ' + a + ' 人と女子 ' + b + ' 人</b>を選ぶ方法は何通りか。', ans,
      ['男子の選び方と女子の選び方をそれぞれ求めて、積の法則でかけ算。', C(m, a) + ' × ' + C(n, b)],
      [C(m, a) + ' = ' + nCr(m, a) + '、' + C(n, b) + ' = ' + nCr(n, b), nCr(m, a) + ' × ' + nCr(n, b) + ' = <b>' + ans + '</b> 通り']);
  });
  comb[1].push(function adjacent(r) {
    const n = r.int(5, 7), not = r.chance(0.4);
    const adj = 2 * fact(n - 1), ans = not ? fact(n) - adj : adj;
    return Q(n + ' 人が1列に並ぶとき、特定の2人 A、B が<b>' + (not ? '隣り合わない' : '隣り合う') + '</b>並び方は何通りか。', ans,
      ['隣り合う2人はひとかたまりにして (n − 1) 人の並び方、かたまりの中の並び方 2 通りをかける。' + (not ? '隣り合わないは「全体 − 隣り合う」。' : ''),
        '隣り合う：' + (n - 1) + '! × 2 = ' + adj],
      ['A、B をひとまとめ → ' + (n - 1) + '! × 2 = ' + adj + ' 通り'].concat(not ? ['全体 ' + n + '! = ' + fact(n), '隣り合わない = ' + fact(n) + ' − ' + adj + ' = <b>' + ans + '</b> 通り'] : ['答え <b>' + ans + '</b> 通り']));
  });
  const WORDS = ['BANANA', 'LETTER', 'SUCCESS', 'COOKIE', 'PEPPER', 'COFFEE', 'ASSESS', 'FACTORY', 'PUZZLE', 'BALLOON'];
  comb[2].push(function wordPerm(r) {
    const w = r.pick(WORDS);
    const cnt = {}; for (const ch of w) cnt[ch] = (cnt[ch] || 0) + 1;
    let den = 1; const denParts = [];
    Object.keys(cnt).forEach((k) => { if (cnt[k] > 1) { den *= fact(cnt[k]); denParts.push(cnt[k] + '!'); } });
    const ans = fact(w.length) / den;
    const dup = Object.keys(cnt).filter((k) => cnt[k] > 1).map((k) => k + 'が' + cnt[k] + '個').join('、');
    return Q('<b>' + w + '</b> の ' + w.length + ' 文字をすべて1列に並べる方法は何通りか。', ans,
      ['同じものを含む順列：n!/(p!q!…)。', dup ? '同じ文字：' + dup + '。' : '同じ文字はない → ' + w.length + '!。'],
      [w.length + '!' + (denParts.length ? ' ÷ (' + denParts.join('×') + ')' : ''), '= ' + fact(w.length) + (den > 1 ? ' ÷ ' + den : ''), '= <b>' + ans + '</b> 通り']);
  });
  comb[2].push(function gridPath(r) {
    const w = r.int(4, 6), h = r.int(3, 5), p = r.int(1, w - 1), q = r.int(1, h - 1);
    const first = nCr(p + q, p), second = nCr(w - p + h - q, w - p);
    const ans = first * second;
    return Q('右に ' + w + ' 区画、上に ' + h + ' 区画の碁盤の目の道がある。左下から右上まで最短で行くとき、<b>右に ' + p + '、上に ' + q + ' 進んだ交差点を通る</b>道順は何通りか。', ans,
      ['最短経路は「→ と ↑ の並べ方」。通過点で前半と後半に分けてかけ算。', '前半 ' + C(p + q, p) + '、後半 ' + C(w - p + h - q, w - p)],
      ['前半：→' + p + '個、↑' + q + '個の並べ方 ' + C(p + q, p) + ' = ' + first, '後半：→' + (w - p) + '個、↑' + (h - q) + '個 ' + C(w - p + h - q, w - p) + ' = ' + second, first + ' × ' + second + ' = <b>' + ans + '</b> 通り']);
  });
  comb[2].push(function stars(r) {
    const n = r.int(5, 12), pos = r.chance(0.5);
    const ans = pos ? nCr(n - 1, 2) : nCr(n + 2, 2);
    return Q('x + y + z = ' + n + ' を満たす<b>' + (pos ? '正の整数' : '0以上の整数') + '</b>の組 (x, y, z) は何組あるか。', ans,
      [pos ? '○を ' + n + ' 個並べ、間（' + (n - 1) + ' か所）から仕切りを入れる2か所を選ぶ。' : '○ ' + n + ' 個と仕切り | 2本を並べる方法の数（重複組合せ）。',
        pos ? C(n - 1, 2) : C(n + 2, 2)],
      [pos ? '○の間 ' + (n - 1) + ' か所から2か所を選ぶ：' + C(n - 1, 2) : '○' + n + '個と|2本、計 ' + (n + 2) + ' 個の並べ方：' + C(n + 2, 2), '= <b>' + ans + '</b> 組']);
  });
  comb[2].push(function inclusion(r) {
    const N = r.pick([100, 120, 150, 200, 300]);
    const [p, q] = r.pick([[2, 3], [2, 5], [3, 5], [3, 7], [2, 7], [5, 7]]);
    const neither = r.chance(0.4);
    const A = Math.floor(N / p), B = Math.floor(N / q), AB = Math.floor(N / (p * q));
    const or = A + B - AB, ans = neither ? N - or : or;
    return Q('1 から ' + N + ' までの整数のうち、<b>' + p + ' または ' + q + ' で割り切れる数' + (neither ? 'ではないもの' : '') + '</b>は何個あるか。', ans,
      ['n(A∪B) = n(A) + n(B) − n(A∩B)。A∩B は ' + (p * q) + ' の倍数。', p + ' の倍数 ' + A + ' 個、' + q + ' の倍数 ' + B + ' 個、' + (p * q) + ' の倍数 ' + AB + ' 個。'],
      [A + ' + ' + B + ' − ' + AB + ' = ' + or].concat(neither ? [N + ' − ' + or + ' = <b>' + ans + '</b> 個'] : ['答え <b>' + ans + '</b> 個']));
  });

  // =====================================================================
  //  複素数平面（数C）
  // =====================================================================
  const cplx = [[], [], []];
  const PY2 = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17]];
  cplx[0].push(function absZ(r) {
    if (r.chance(0.5)) {
      const [a0, b0, h] = r.pick(PY2), a = a0 * r.sign(), b = b0 * r.sign();
      return Q('複素数 z = ' + cx(a, b) + ' の<b>絶対値 |z|</b> を求めよ。', h,
        ['|a + bi| = √(a' + sup(2) + ' + b' + sup(2) + ')（原点からの距離）。', '√(' + paren(a) + sup(2) + ' + ' + paren(b) + sup(2) + ') = √' + (h * h)],
        ['|z| = √(' + (a * a) + ' + ' + (b * b) + ') = √' + (h * h), '= <b>' + h + '</b>']);
    }
    const a = r.nz(-6, 6), b = r.nz(-6, 6);
    return Q('複素数 z = ' + cx(a, b) + ' について <b>|z|' + sup(2) + '</b> を求めよ。', a * a + b * b,
      ['|a + bi|' + sup(2) + ' = a' + sup(2) + ' + b' + sup(2) + '。', paren(a) + sup(2) + ' + ' + paren(b) + sup(2)],
      ['|z|' + sup(2) + ' = ' + (a * a) + ' + ' + (b * b) + ' = <b>' + (a * a + b * b) + '</b>']);
  });
  cplx[0].push(function product(r) {
    const a = r.int(-4, 4), b = r.nz(-4, 4), c = r.int(-4, 4), d = r.nz(-4, 4);
    const re = a * c - b * d, im = a * d + b * c, askRe = r.chance(0.5);
    return Q('(' + cx(a, b) + ')(' + cx(c, d) + ') を計算したときの<b>' + (askRe ? '実部' : '虚部') + '</b>を求めよ。', askRe ? re : im,
      ['展開して i' + sup(2) + ' = −1 を使う。(a + bi)(c + di) = (ac − bd) + (ad + bc)i。', askRe ? '実部 = ' + num(a) + '×' + paren(c) + ' − ' + paren(b) + '×' + paren(d) : '虚部 = ' + num(a) + '×' + paren(d) + ' + ' + paren(b) + '×' + paren(c)],
      ['= ' + num(a * c) + sv(a * d, 'i') + sv(b * c, 'i') + sv(b * d, 'i' + sup(2)), '= ' + cx(re, im), (askRe ? '実部' : '虚部') + ' = <b>' + num(askRe ? re : im) + '</b>']);
  });
  cplx[1].push(function quotient(r) {
    const a = r.int(-5, 5), b = r.int(-5, 5), c = r.nz(-3, 3), d = r.nz(-3, 3);
    const den = c * c + d * d, re = frac(a * c + b * d, den), im = frac(b * c - a * d, den), askRe = r.chance(0.5);
    return Q('<span class="frac"><span class="fn">' + cx(a, b) + '</span><span class="fd">' + cx(c, d) + '</span></span> の<b>' + (askRe ? '実部' : '虚部') + '</b>を求めよ。', askRe ? re : im,
      ['分母の共役複素数 ' + cx(c, -d) + ' を分母・分子にかけて、分母を実数にしよう。', '分母 = (' + cx(c, d) + ')(' + cx(c, -d) + ') = ' + den],
      ['分子 = (' + cx(a, b) + ')(' + cx(c, -d) + ') = ' + cx(a * c + b * d, b * c - a * d), '分母 = ' + paren(c) + sup(2) + ' + ' + paren(d) + sup(2) + ' = ' + den, (askRe ? '実部 = ' + U.fhRaw(a * c + b * d, den) : '虚部 = ' + U.fhRaw(b * c - a * d, den)) + ' = <b>' + fh(askRe ? re : im) + '</b>']);
  });
  cplx[1].push(function distance(r) {
    const [dx0, dy0, h] = r.pick(PY2);
    const dx = dx0 * r.sign(), dy = dy0 * r.sign();
    const a = r.int(-4, 4), b = r.int(-4, 4);
    return Q('複素数平面上の2点 α = ' + cx(a, b) + '、β = ' + cx(a + dx, b + dy) + ' の<b>距離 |β − α|</b> を求めよ。', h,
      ['2点間の距離は |β − α|。', 'β − α = ' + cx(dx, dy)],
      ['β − α = ' + cx(dx, dy), '|β − α| = √(' + (dx * dx) + ' + ' + (dy * dy) + ') = <b>' + h + '</b>']);
  });
  cplx[1].push(function conjugate(r) {
    const a = r.nz(-6, 6), b = r.nz(-6, 6), kind = r.int(0, 1);
    const zb = '<span class="ovl">z</span>';
    if (kind === 0) return Q('z = ' + cx(a, b) + ' のとき、<b>z' + zb + '</b> の値を求めよ。（' + zb + ' は z の共役複素数）', a * a + b * b,
      [zb + ' = ' + cx(a, -b) + '。z' + zb + ' = |z|' + sup(2) + ' になるよ。', '(' + cx(a, b) + ')(' + cx(a, -b) + ') = ' + paren(a) + sup(2) + ' + ' + paren(b) + sup(2)],
      ['z' + zb + ' = ' + paren(a) + sup(2) + ' − (' + cx(0, b) + ')' + sup(2), '= ' + (a * a) + ' + ' + (b * b) + ' = <b>' + (a * a + b * b) + '</b>']);
    return Q('z = ' + cx(a, b) + ' のとき、<b>z + ' + zb + '</b> の値を求めよ。（' + zb + ' は z の共役複素数）', 2 * a,
      [zb + ' は虚部の符号を変えたもの：' + zb + ' = ' + cx(a, -b) + '。', '虚部どうしは打ち消し合う。'],
      ['z + ' + zb + ' = (' + cx(a, b) + ') + (' + cx(a, -b) + ')', '= <b>' + num(2 * a) + '</b>']);
  });
  const S3 = '√3';
  cplx[2].push(function deMoivre(r) {
    const kind = r.int(0, 1);
    if (kind === 0) {
      const n = r.int(2, 10), askRe = r.chance(0.5);
      let re = 1, im = 0; for (let i = 0; i < n; i++) { const nr = re - im, ni = re + im; re = nr; im = ni; }
      const ans = askRe ? re : im;
      return Q('<b>(1 + i)' + sup(n) + '</b> の' + (askRe ? '実部' : '虚部') + 'を求めよ。', ans,
        ['極形式にしよう：1 + i = √2(cos 45° + i sin 45°)。', 'ド・モアブルの定理：(1 + i)' + sup(n) + ' = (√2)' + sup(n) + '(cos ' + (45 * n) + '° + i sin ' + (45 * n) + '°)'],
        ['(1 + i)' + sup(n) + ' = (√2)' + sup(n) + '{cos(' + (45 * n) + '°) + i sin(' + (45 * n) + '°)}', '= ' + cx(re, im), (askRe ? '実部' : '虚部') + ' = <b>' + num(ans) + '</b>']);
    }
    const n = r.pick([2, 3, 4, 6, 8, 9, 10]);
    const COS = { 0: frac(1), 60: frac(1, 2), 90: frac(0), 120: frac(-1, 2), 180: frac(-1), 240: frac(-1, 2), 270: frac(0), 300: frac(1, 2) };
    const useSqrt3First = r.chance(0.5); // (√3 + i)^n なら 30°刻み
    const step = useSqrt3First ? 30 : 60;
    let nn = n; let angle = (step * nn) % 360;
    if (COS[angle] === undefined) { nn = n + 1; angle = (step * nn) % 360; }
    if (COS[angle] === undefined) { nn = n + 2; angle = (step * nn) % 360; }
    const ans = fmul(Math.pow(2, nn), COS[angle]);
    const z = useSqrt3First ? S3 + ' + i' : '1 + ' + S3 + 'i';
    return Q('<b>(' + z + ')' + sup(nn) + '</b> の実部を求めよ。', ans,
      ['極形式：' + z + ' = 2(cos ' + step + '° + i sin ' + step + '°)。', 'ド・モアブルの定理で (' + z + ')' + sup(nn) + ' = 2' + sup(nn) + '(cos ' + (step * nn) + '° + i sin ' + (step * nn) + '°)'],
      ['(' + z + ')' + sup(nn) + ' = 2' + sup(nn) + '{cos ' + (step * nn) + '° + i sin ' + (step * nn) + '°}', 'cos ' + (step * nn) + '°' + (angle !== step * nn ? ' = cos ' + angle + '°' : '') + ' = ' + fh(COS[angle]), '実部 = ' + Math.pow(2, nn) + ' × ' + paren(COS[angle]) + ' = <b>' + fh(ans) + '</b>']);
  });
  const ARGS = [['1 + ' + S3 + 'i', 60], [S3 + ' + i', 30], ['1 + i', 45], ['−1 + i', 135], ['−1 − ' + S3 + 'i', 240], ['i', 90], ['−1', 180], ['1 − i', 315], ['−' + S3 + ' + i', 150], ['1 − ' + S3 + 'i', 300], [S3 + ' − i', 330], ['−1 + ' + S3 + 'i', 120], ['−' + S3 + ' − i', 210], ['−1 − i', 225]];
  cplx[2].push(function argument(r) {
    const [z, deg] = r.pick(ARGS);
    const n = r.chance(0.5) ? 1 : r.int(2, 5);
    const ans = (deg * n) % 360;
    return Q((n === 1 ? 'z = ' + z + ' の' : 'z = ' + z + ' のとき z' + sup(n) + ' の') + '<b>偏角 θ</b>（0° ≦ θ &lt; 360°）を度数法で求めよ。', ans,
      ['z を複素数平面に点で描いて、実軸の正の向きからの角を読もう。', n === 1 ? '|z| で割ると cos θ、sin θ が有名角の値になるはず。' : 'arg z' + sup(n) + ' = n × arg z。まず arg z = ' + deg + '°。'],
      ['arg z = ' + deg + '°'].concat(n > 1 ? ['arg z' + sup(n) + ' = ' + n + ' × ' + deg + '° = ' + (deg * n) + '°', '0° ≦ θ &lt; 360° に直して <b>' + ans + '</b>°'] : ['答え <b>' + ans + '</b>°']));
  });
  cplx[2].push(function rotation(r) {
    const a = r.int(-5, 5), b = r.int(-5, 5);
    const rot = r.pick([90, 180, 270]);
    const res = rot === 90 ? [-b, a] : rot === 180 ? [-a, -b] : [b, -a];
    const askRe = r.chance(0.5);
    const mul = rot === 90 ? 'i' : rot === 180 ? '−1' : '−i';
    return Q('点 z = ' + cx(a, b) + ' を原点のまわりに <b>' + rot + '°</b> 回転した点の<b>' + (askRe ? '実部' : '虚部') + '</b>を求めよ。', askRe ? res[0] : res[1],
      ['原点まわりの θ 回転は (cos θ + i sin θ) をかけること。', rot + '° 回転は ' + mul + ' をかける。'],
      ['(' + cx(a, b) + ') × ' + mul + ' = ' + cx(res[0], res[1]), (askRe ? '実部' : '虚部') + ' = <b>' + num(askRe ? res[0] : res[1]) + '</b>']);
  });

  // =====================================================================
  //  図形と方程式（数II）
  // =====================================================================
  const coord = [[], [], []];
  coord[0].push(function dist(r) {
    const [dx0, dy0, h] = r.pick(PY2.concat([[0, 5, 5], [7, 0, 7]]));
    const dx = dx0 * r.sign(), dy = dy0 * r.sign(), x1 = r.int(-5, 5), y1 = r.int(-5, 5);
    return Q('2点 A' + vt(x1, y1) + '、B' + vt(x1 + dx, y1 + dy) + ' 間の<b>距離 AB</b> を求めよ。', h,
      ['AB = √{(x' + sub(2) + ' − x' + sub(1) + ')' + sup(2) + ' + (y' + sub(2) + ' − y' + sub(1) + ')' + sup(2) + '}。', 'x の差 ' + num(dx) + '、y の差 ' + num(dy)],
      ['AB = √(' + paren(dx) + sup(2) + ' + ' + paren(dy) + sup(2) + ') = √' + (h * h), '= <b>' + h + '</b>']);
  });
  coord[0].push(function midpoint(r) {
    const x1 = r.int(-6, 6), y1 = r.int(-6, 6), x2 = r.int(-6, 6), y2 = r.int(-6, 6), askX = r.chance(0.5);
    const ans = askX ? frac(x1 + x2, 2) : frac(y1 + y2, 2);
    return Q('2点 A' + vt(x1, y1) + '、B' + vt(x2, y2) + ' を結ぶ線分の<b>中点の ' + (askX ? 'x' : 'y') + ' 座標</b>を求めよ。', ans,
      ['中点 = ((x' + sub(1) + ' + x' + sub(2) + ')/2, (y' + sub(1) + ' + y' + sub(2) + ')/2)。', askX ? '(' + num(x1) + ' + ' + paren(x2) + ') ÷ 2' : '(' + num(y1) + ' + ' + paren(y2) + ') ÷ 2'],
      [askX ? '(' + num(x1) + ' + ' + paren(x2) + ') ÷ 2' : '(' + num(y1) + ' + ' + paren(y2) + ') ÷ 2', '= <b>' + fh(ans) + '</b>']);
  });
  coord[1].push(function lineTwo(r) {
    let x1, x2; do { x1 = r.int(-5, 5); x2 = r.int(-5, 5); } while (x1 === x2);
    const y1 = r.int(-6, 6), y2 = r.int(-6, 6);
    const m = frac(y2 - y1, x2 - x1), n = fsub(y1, fmul(m, x1)), askM = r.chance(0.5);
    return Q('2点 ' + vt(x1, y1) + '、' + vt(x2, y2) + ' を通る直線を y = mx + n とするとき、<b>' + (askM ? 'm' : 'n') + '</b> を求めよ。', askM ? m : n,
      ['傾き m = (y の増加量)/(x の増加量)。', 'm = (' + num(y2) + ' − ' + paren(y1) + ') ÷ (' + num(x2) + ' − ' + paren(x1) + ') = ' + fh(m) + (askM ? '' : '。y = m(x − x' + sub(1) + ') + y' + sub(1) + ' に代入して n を出そう。')],
      ['m = ' + U.fhRaw(y2 - y1, x2 - x1) + ' = ' + fh(m), 'y = ' + fh(m) + '(x − ' + paren(x1) + ') + ' + paren(y1) + ' → n = ' + fh(n), '答え <b>' + fh(askM ? m : n) + '</b>']);
  });
  const LINES = [[3, 4, 5], [4, 3, 5], [3, -4, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [1, 0, 1], [0, 1, 1], [8, -6, 10]];
  coord[1].push(function pointLine(r) {
    const [a, b, h] = r.pick(LINES), c = r.int(-10, 10), x0 = r.int(-4, 4), y0 = r.int(-4, 4);
    const v = a * x0 + b * y0 + c;
    const ans = frac(Math.abs(v), h);
    return Q('点 ' + vt(x0, y0) + ' と直線 ' + lineEq(a, b, c) + ' の<b>距離</b>を求めよ。', ans,
      ['点と直線の距離：|ax' + sub(0) + ' + by' + sub(0) + ' + c| / √(a' + sup(2) + ' + b' + sup(2) + ')。', '分子 |' + num(a) + '×' + paren(x0) + ' + ' + paren(b) + '×' + paren(y0) + ' + ' + paren(c) + '| = ' + Math.abs(v) + '、分母 √' + (a * a + b * b) + ' = ' + h],
      ['|' + num(a * x0) + ' + ' + paren(b * y0) + ' + ' + paren(c) + '| = ' + Math.abs(v), '√(' + (a * a) + ' + ' + (b * b) + ') = ' + h, '距離 = ' + U.fhRaw(Math.abs(v), h) + ' = <b>' + fh(ans) + '</b>']);
  });
  coord[1].push(function perpLine(r) {
    const m = r.pick([2, 3, -2, frac(1, 2), frac(-1, 3), frac(2, 3), -1, 1]);
    const mm = typeof m === 'object' ? m : frac(m);
    const k = r.int(-5, 5), x0 = r.int(-4, 4), y0 = r.int(-4, 4);
    const pm = fdiv(-1, mm), n = fsub(y0, fmul(pm, x0)), askM = r.chance(0.4);
    return Q('点 ' + vt(x0, y0) + ' を通り、直線 y = ' + poly([mm, k]) + ' に<b>垂直</b>な直線を y = px + q とするとき、<b>' + (askM ? 'p' : 'q') + '</b> を求めよ。', askM ? pm : n,
      ['垂直な2直線の傾きの積は −1。', 'p = −1 ÷ ' + paren(mm) + ' = ' + fh(pm) + (askM ? '' : '。点を通る条件から q を求めよう。')],
      ['p = ' + fh(pm), 'y = ' + fh(pm) + '(x − ' + paren(x0) + ') + ' + paren(y0) + ' より q = ' + fh(n), '答え <b>' + fh(askM ? pm : n) + '</b>']);
  });
  coord[2].push(function circle(r) {
    const p = r.int(-5, 5), q = r.int(-5, 5), R = r.int(1, 6);
    const D = -2 * p, E = -2 * q, F = p * p + q * q - R * R;
    const ask = r.pick(['R', 'R', 'x', 'y']);
    const ans = ask === 'R' ? R : ask === 'x' ? p : q;
    const eq = 'x' + sup(2) + ' + y' + sup(2) + (D ? signed(D) + 'x' : '') + (E ? signed(E) + 'y' : '') + signed(F) + ' = 0';
    return Q('円 ' + eq + ' の' + (ask === 'R' ? '<b>半径</b>' : '<b>中心の ' + ask + ' 座標</b>') + 'を求めよ。', ans,
      ['x と y それぞれ平方完成して (x − a)' + sup(2) + ' + (y − b)' + sup(2) + ' = r' + sup(2) + ' の形に。', shift(p) + sup(2) + ' + ' + shift(q, 'y') + sup(2) + ' = ' + (R * R)],
      [shift(p) + sup(2) + ' − ' + (p * p) + ' + ' + shift(q, 'y') + sup(2) + ' − ' + (q * q) + signed(F) + ' = 0', shift(p) + sup(2) + ' + ' + shift(q, 'y') + sup(2) + ' = ' + (R * R), '中心 (' + num(p) + ', ' + num(q) + ')、半径 ' + R + '。答え <b>' + num(ans) + '</b>']);
  });
  coord[2].push(function tangentCircle(r) {
    const s = r.int(1, 3);
    const opts = [[frac(1), 2 * s * s, 2 * s, '√2'], [frac(-1), 2 * s * s, 2 * s, '√2'], [frac(2), 5 * s * s, 5 * s, '√5'], [frac(3, 4), 16 * s * s, 5 * s, '5/4'], [frac(4, 3), 9 * s * s, 5 * s, '5/3'], [frac(-3, 4), 16 * s * s, 5 * s, '5/4']];
    const [m, R2, k, root] = r.pick(opts);
    return Q('直線 y = ' + poly([m, 0]) + ' + k が円 x' + sup(2) + ' + y' + sup(2) + ' = ' + R2 + ' に<b>接する</b>とき、正の定数 k の値を求めよ。', k,
      ['接する ⇔ 円の中心（原点）と直線の距離 = 半径。', '直線を ' + fh(m) + 'x − y + k = 0 とみると、距離 = |k| ÷ √{(' + fh(m) + ')' + sup(2) + ' + 1} = |k| ÷ ' + root],
      ['中心 (0, 0) と直線の距離 = |k| ÷ √(m' + sup(2) + ' + 1)', '= 半径 √' + R2, '|k| = √' + R2 + ' × √(' + fh(fadd(fmul(m, m), 1)) + ') = ' + k + '、k > 0 より <b>' + k + '</b>']);
  });

  const GEN = { quad, prob, diff, seq, vec: vecG, integ, trig, explog, comb, cplx, coord };

  /** 問題を生成する。同じ (topic, level, seed) なら同じ問題 */
  function generate(topic, level, seed) {
    const t = GEN[topic];
    if (!t) throw new Error('unknown topic ' + topic);
    level = U.clamp(level | 0, 0, 2);
    const r = U.rng(seed);
    const list = t[level];
    const gi = Math.floor(r.next() * list.length);
    const q = list[gi](r);
    q.topic = topic; q.level = level; q.seed = seed; q.kind = topic + '.' + list[gi].name;
    return q;
  }
  function check(q, input) {
    const v = U.parseAnswer(input);
    if (!v) return { ok: false, parsed: null, invalid: true };
    return { ok: U.feq(v, q.answer), parsed: v, invalid: false };
  }
  function answerText(q) { return U.fstr(q.answer); }
  function kinds(topic) { return GEN[topic].map((lv) => lv.map((f) => f.name)); }

  MF.Questions = { TOPICS, HOME_TOPICS, ALL_TOPICS, LEVEL_NAMES, generate, check, answerText, kinds, GEN };
})(globalThis.MF = globalThis.MF || {});
