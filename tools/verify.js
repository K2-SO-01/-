#!/usr/bin/env node
// =====================================================================
// tools/verify.js — 全問題の「一意に解けるか」を総当たりで検証する
//
//   node tools/verify.js            # 全問チェック
//   node tools/verify.js 14 B2      # 指定IDだけ
//   node tools/verify.js --verbose  # 解読の途中経過も表示
//
// 検証内容
//   1. データ形式（必須項目・ヒント3段階・タイル・ギミック定義）
//   2. 解答に関わるギミックの全状態を総当たりし、
//      「問題文が与える条件（constraints）」を満たす状態の答えが
//      ちょうど1種類で、puzzle.answer と一致すること（別解なし）
//   3. 保存された正解状態（solution）で解読すると答えになること
//   4. 手がかり（暗号文・鍵の文字）が問題文かフィルムに実際に書かれていること
//   5. タイルに答えの文字がすべてそろっていること
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const only = args.filter((a) => !a.startsWith('--'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/puzzles.json'), 'utf8'));

let errors = 0, warnings = 0;
const rows = [];

function check(p) {
  const err = [], warn = [], info = [];
  const need = ['id', 'title', 'gimmicks', 'question', 'answer', 'tiles', 'hints', 'explanation', 'targetTime', 'steps'];
  for (const k of need) if (p[k] == null) err.push(`必須項目 ${k} がない`);
  if (err.length) return { err, warn, info };
  if (!Array.isArray(p.hints) || p.hints.length !== 3) err.push('ヒントは3段階必要');
  if (!(p.targetTime > 0)) err.push('targetTime が不正');

  // --- ギミック定義 ---
  const ids = new Set();
  for (const g of p.gimmicks) {
    if (ids.has(g.id)) err.push(`ギミックID重複 ${g.id}`);
    ids.add(g.id);
    try {
      if (g.type === 'slide' || g.type === 'dial') {
        const { a, b } = E.ringOf(g);
        if (new Set(a).size !== a.length || new Set(b).size !== b.length) err.push(`${g.id}: リングに同じ文字が2回ある（対応が一意にならない）`);
      } else if (g.type === 'stencil') {
        const N = g.card.length;
        if (g.card.some((r) => [...r].length !== N)) err.push(`${g.id}: カードは正方形にする`);
        if (g.card.some((r) => /[^.om1-9]/.test(r))) err.push(`${g.id}: カードに不明な記号`);
        const C = [...g.grid[0]].length;
        if (g.grid.some((r) => [...r].length !== C)) err.push(`${g.id}: 表の列数がそろっていない`);
      } else if (g.type === 'mirror') {
        if (!Array.isArray(g.text)) err.push(`${g.id}: text は行の配列`);
      } else err.push(`不明なギミック ${g.type}`);
    } catch (e) {
      err.push(`${g.id}: ${e.message}`);
    }
  }
  if (err.length) return { err, warn, info };

  // --- 総当たり ---
  let r;
  try {
    r = E.solveAll(p);
  } catch (e) {
    err.push('総当たり失敗: ' + e.message);
    return { err, warn, info };
  }
  const answers = [...new Set(r.hits.map((h) => h.answer))];
  info.push(`状態 ${r.total}通り / 読める ${r.runnable}通り(${r.runnableAnswers}種) / 条件一致 ${r.hits.length}通り`);
  if (answers.length === 0) err.push('条件を満たす状態がない（解けない）');
  else if (answers.length > 1) err.push(`別解あり: ${answers.join(' / ')}`);
  else if (answers[0] !== p.answer) err.push(`答えが一致しない: 解読=${answers[0]} / 登録=${p.answer}`);
  if (r.hits.length > 1 && answers.length === 1) warn.push(`同じ答えになる状態が${r.hits.length}通り（解説図は1つ目を使用）`);
  const ringOnly = E.involvedGimmicks(p).every((g) => g.type !== 'stencil');
  if (ringOnly && r.runnableAnswers <= 1) warn.push('条件なしでも答えが1つに決まる（手がかりが不要になっている）');

  // --- 保存された正解状態 ---
  const tr = E.solutionTrace(p);
  if (!tr.ok || tr.answer !== p.answer) err.push(`solution の状態で解読すると「${tr.answer}」になる`);
  else if (!(p.constraints || []).every((c) => E.checkConstraint(c, p, tr.states, tr.vars))) err.push('solution の状態が条件を満たしていない');
  for (const g of E.involvedGimmicks(p)) {
    if (E.sameState(E.initialState(g), tr.states[g.id])) warn.push(`${g.id}: 初期状態がすでに正解状態`);
  }
  if (verbose) for (const t of tr.trace) info.push(`  ${t.step.type}${t.step.g ? '(' + t.step.g + ')' : ''} → ${t.out.join('')}`);

  // --- 手がかりが実際に見えているか ---
  const visible = [p.question, ...p.gimmicks.filter((g) => g.type === 'mirror').flatMap((g) => g.text)].join('\n');
  const shown = (tokens) => {
    const s = tokens.join('');
    const s2 = tokens.join('・');
    return visible.includes(s) || visible.includes(s2) || visible.includes(`「${s}」`) || tokens.every((t) => visible.includes(t));
  };
  for (const s of p.steps) {
    if (s.type === 'const' && !shown(E.toTokens(s.value))) err.push(`暗号文「${E.toTokens(s.value).join('')}」が問題文・フィルムに書かれていない`);
  }
  for (const c of p.constraints || []) {
    if (c.type === 'crib') {
      for (const f of ['text', 'expect']) {
        const v = c[f];
        if (typeof v === 'string' && v.startsWith('$')) continue;
        if (c.indirect) continue;
        if (!shown(E.toTokens(v))) err.push(`鍵の文字「${E.toTokens(v).join('')}」が問題文・フィルムにない`);
      }
      if (c.indirect) info.push(`間接的な手がかり: ${c.indirect}`);
    }
    if (c.type === 'prop' && c.value != null && !visible.includes(String(c.value))) err.push(`条件「${c.value}」が問題文にない`);
  }
  if (p.question.includes(p.answer)) err.push('問題文に答えがそのまま書かれている');

  // --- タイル ---
  const pool = p.tiles.slice();
  for (const ch of [...p.answer]) {
    const i = pool.indexOf(ch);
    if (i < 0) err.push(`タイルに「${ch}」が足りない`);
    else pool.splice(i, 1);
  }
  if (p.tiles.length > 12) warn.push(`タイルが${p.tiles.length}枚（12枚まで推奨）`);
  if ([...p.answer].length > 8) warn.push('答えが8文字を超えると解答欄が窮屈');
  if (p.tiles.some((t) => [...t].length !== 1)) err.push('タイルは1文字ずつにする');

  return { err, warn, info, states: r.hits[0]?.states };
}

const ids = new Set();
const main = data.puzzles.filter((p) => !p.bonus);
for (const p of data.puzzles) {
  if (only.length && !only.includes(String(p.id)) && !only.includes(String(+p.id))) continue;
  if (ids.has(p.id)) { console.log(`✗ ID重複: ${p.id}`); errors++; }
  ids.add(p.id);
  const { err, warn, info } = check(p);
  if (p.bonus && !(p.requiredStars <= main.length * 3)) err.push('requiredStars が獲得可能な★を超えている');
  errors += err.length;
  warnings += warn.length;
  const mark = err.length ? '✗' : warn.length ? '△' : '✓';
  const gs = (p.gimmicks || []).map((g) => g.type).join('+');
  console.log(`${mark} [${p.id}] ${p.title}  答え=${p.answer}  (${gs})`);
  for (const i of info) console.log('     ' + i);
  for (const w of warn) console.log('   △ ' + w);
  for (const e of err) console.log('   ✗ ' + e);
  rows.push({ id: p.id, ok: !err.length });
}
console.log('\n' + '='.repeat(60));
console.log(`検証 ${rows.length}問  OK ${rows.filter((r) => r.ok).length}  エラー ${errors}  警告 ${warnings}`);
process.exit(errors ? 1 : 0);
