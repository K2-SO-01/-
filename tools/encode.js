#!/usr/bin/env node
// =====================================================================
// tools/encode.js — 問題づくりの補助。答え（平文）から暗号文を計算する
//
//  ずらし帯（上段で暗号を探して下段を読む / --from b なら逆）
//    node tools/encode.js slide --a KANA46 --b KANA46 --crib あ=か --plain さくら
//    node tools/encode.js slide --a KANA46 --b IROHA46 --k 25 --plain ほたる --from b
//  円盤（トークンは「,」区切り。外側=a、内側=b）
//    node tools/encode.js dial --a ETO12 --b CLOCK12 --crib うま=12 --plain うし,とら --from b
//  行と段の2本帯（五十音の行・段を別々にずらす）
//    node tools/encode.js 2d --cons あ=た --vow あ=え --plain もみのき
//
//  使える文字セット: KANA46 IROHA46 ALPHA DIGIT10 CONS10 VOW5 ETO12 CLOCK12 WEEK7
//  （それ以外の文字列を渡すと1文字ずつのリングとして扱う）
// =====================================================================
import * as E from '../js/engine.js';

const [mode, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];

function solveK(g, crib, from = 'a') {
  const [t, e] = crib.split('=');
  const n = E.ringOf(g).n;
  for (let k = 0; k < n; k++) if (E.mapToken(g, k, t, 'a') === e) return k;
  throw new Error(`鍵 ${crib} を満たすずらし量がない`);
}
function encRing(g, k, plain, from) {
  const { a, b } = E.ringOf(g);
  const src = from === 'b' ? b : a;
  return plain.map((p) => {
    const c = src.find((t) => E.mapToken(g, k, t, from) === p);
    if (c == null) throw new Error(`「${p}」はこのリングで表せない`);
    return c;
  });
}
const toks = (s) => (s.includes(',') ? s.split(',') : [...s]);

if (mode === 'slide' || mode === 'dial') {
  const g = mode === 'dial'
    ? { id: 'g', type: 'dial', outer: opt.a || 'ALPHA', inner: opt.b || opt.a || 'ALPHA' }
    : { id: 'g', type: 'slide', a: opt.a || 'KANA46', b: opt.b || opt.a || 'KANA46' };
  const from = opt.from || 'a';
  const k = opt.k != null ? +opt.k : opt.crib ? solveK(g, opt.crib) : 0;
  const c = encRing(g, k, toks(opt.plain), from);
  console.log(JSON.stringify({ k, from, cipher: c.join(mode === 'dial' || c.some((x) => x.length > 1) ? '・' : ''), tokens: c }, null, 1));
} else if (mode === '2d') {
  const gc = { id: 'r', type: 'slide', a: 'CONS10' };
  const gv = { id: 'v', type: 'slide', a: 'VOW5' };
  const kc = opt.cons ? solveK(gc, opt.cons) : +(opt.kc || 0);
  const kv = opt.vow ? solveK(gv, opt.vow) : +(opt.kv || 0);
  const all = Object.values(E.GOJUON).join('').replace(/・/g, '');
  const out = [...opt.plain].map((p) => {
    const c = [...all].find((ch) => {
      const d = E.decompose(ch);
      const cc = E.mapToken(gc, kc, d.cons, 'a'), vv = E.mapToken(gv, kv, d.vow, 'a');
      return cc && vv && E.compose(cc, vv) === p;
    });
    if (!c) throw new Error(`「${p}」はこのずらし方では作れない（や行・わ行の空きに当たる）`);
    return c;
  });
  console.log(JSON.stringify({ kc, kv, cipher: out.join('') }, null, 1));
} else {
  console.log('使い方は tools/encode.js の先頭コメントを参照');
  process.exit(1);
}
