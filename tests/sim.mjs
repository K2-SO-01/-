// テスト・検証用：画面なしで人生をまとめてシミュレーションする
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createWorld } from '../assets/js/engine/world.js';
import { createLife, beginYear, nextYear, answer } from '../assets/js/engine/life.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export function loadWorld() {
  const D = JSON.parse(readFileSync(join(ROOT, 'data', 'japan.json'), 'utf8'));
  return createWorld(D);
}

export function runLife(W, opts) {
  const L = createLife(W, { auto: true, ...opts });
  beginYear(W, L);
  let guard = 0;
  while (L.alive && guard++ < 400) {
    while (L.pending) answer(W, L, 0, {});
    if (L.yearDone && L.alive) nextYear(W, L);
  }
  return L;
}

export function runMany(W, n, opts = {}) {
  const lives = [];
  for (let i = 0; i < n; i++) lives.push(runLife(W, { seed: `${opts.seedPrefix || 's'}-${i}`, ...opts }));
  return lives;
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

export function summarizeLives(W, lives) {
  const by = (f) => lives.filter(f);
  const M = by((l) => l.sex === 'M'), F = by((l) => l.sex === 'F');
  const reached = (arr, a) => arr.filter((l) => l.deathAge >= a).length / arr.length;
  const adults = lives.filter((l) => l.deathAge >= 22);
  const univ = adults.filter((l) => ['univ', 'grad', 'jc'].includes(l.edu.level)).length / adults.length;
  const hsGrad = lives.filter((l) => l.deathAge >= 19);
  const univRate = hsGrad.filter((l) => l.edu.level === 'univ' || l.edu.level === 'grad' || l.edu.level === 'jc' || l.edu.stage === 'univ').length / hsGrad.length;
  const at50 = (arr) => arr.filter((l) => l.deathAge >= 50);
  const everMarriedBy50 = (arr) => { const a = at50(arr); return a.filter((l) => (l.marriedAge != null ? l.marriedAge < 50 : false)).length / a.length; };
  const women45 = F.filter((l) => l.deathAge >= 45);
  const kids = mean(women45.map((l) => l.family.children.length));
  const causes = {};
  for (const l of lives) causes[l.deathCause] = (causes[l.deathCause] || 0) + 1;
  const ft = (sex) => {
    const v = [];
    for (const l of lives) if (l.sex === sex) for (let a = 22; a <= 64; a++) { if (l.hist.ft[a] && l.hist.work[a]) v.push(l.hist.work[a]); }
    return mean(v);
  };
  const divorced = lives.filter((l) => l.everMarried).map((l) => l.family.exSpouses.some((s) => s.divorced) ? 1 : 0);
  const movedOut = lives.filter((l) => l.deathAge >= 40).map((l) => (l.hist.pref[40] !== l.birthPref ? 1 : 0));
  return {
    n: lives.length,
    e0: { M: mean(M.map((l) => l.deathAge + 0.5)), F: mean(F.map((l) => l.deathAge + 0.5)) },
    s65: { M: reached(M, 65), F: reached(F, 65) }, s90: { M: reached(M, 90), F: reached(F, 90) },
    univRate, univ,
    everMarried50: { M: everMarriedBy50(M), F: everMarriedBy50(F) },
    childrenPerWoman45: kids,
    divorceShare: mean(divorced),
    livingOutsideBirthPrefAt40: mean(movedOut),
    fullTimeIncome: { M: ft('M'), F: ft('F') },
    causes: Object.fromEntries(Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / lives.length * 100).toFixed(1)])),
  };
}
