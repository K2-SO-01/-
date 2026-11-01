// 文章や決断カードが壊れていないか（差し込み漏れ・表示できない選択肢がないか）を、プレイヤーとして生きて確かめる
import test from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../assets/js/engine/rng.js';
import { createLife, beginYear, nextYear, answer, spendNow, setNisa, setIdeco, setAutoSpend, CONTENT_COUNTS } from '../assets/js/engine/life.js';
import { SPEND } from '../assets/js/engine/spend.js';
import { HOBBY_LIST } from '../assets/js/engine/hobbies.js';
import { JOBS } from '../assets/js/engine/content.js';
import { loadWorld } from './sim.mjs';

const W = loadWorld();
const BAD = /\{|\}|undefined|NaN|null|\[object/;

function livePlayer(seed) {
  const R = new Rng('pick-' + seed);
  const L = createLife(W, { seed, auto: false });
  const seen = { cards: new Set(), titles: [] };
  beginYear(W, L);
  let g = 0;
  while (L.alive && g++ < 400) {
    while (L.pending) {
      const P = L.pending;
      if (P.type === 'decision') {
        assert.ok(P.title && !BAD.test(P.title), `決断の題が壊れている: ${P.title}`);
        assert.ok(P.options.length >= 2, `選択肢が足りない: ${P.title}`);
        for (const o of P.options) assert.ok(o.label && !BAD.test(o.label) && !BAD.test(o.hint || ''), `選択肢が壊れている: ${P.title} / ${o.label} / ${o.hint}`);
        seen.cards.add(P.id === 'card' ? P.ctx.id : P.id);
        answer(W, L, R.int(0, P.options.length - 1));
      } else {
        assert.ok(P.q && !BAD.test(P.q), `ひと息の問いが壊れている: ${P.q}`);
        answer(W, L, 0, { note: R.chance(0.5) ? 'メモ' : '' });
      }
    }
    // ときどきお金を使う
    if (L.age >= 20 && L.age % 7 === 0) {
      const s = R.pick(SPEND);
      if (s.invest === 'nisa') setNisa(L, 30000);
      else if (s.invest === 'ideco') setIdeco(L, true);
      else if (s.auto) setAutoSpend(L, s.id, true);
      else spendNow(W, L, s.id);
    }
    if (L.yearDone && L.alive) nextYear(W, L);
  }
  return { L, seen };
}

test('出来事・決断の数（元の作品と同じかそれ以上を目標）', () => {
  assert.ok(CONTENT_COUNTS.events >= 200, `出来事 ${CONTENT_COUNTS.events}`);
  assert.ok(CONTENT_COUNTS.choices >= 75, `決断カード ${CONTENT_COUNTS.choices}`);
  assert.ok(HOBBY_LIST.length >= 60, `趣味 ${HOBBY_LIST.length}`);
  assert.ok(JOBS.length >= 90, `職業 ${JOBS.length}`);
  assert.ok(SPEND.length >= 20, `お金の使い道 ${SPEND.length}`);
});

test('プレイヤーとして200人生きて、記録と決断に差し込み漏れや壊れた文がない', () => {
  const cards = new Set();
  let items = 0;
  for (let i = 0; i < 200; i++) {
    const { L, seen } = livePlayer('content-' + i);
    for (const c of seen.cards) cards.add(c);
    for (const it of L.log) {
      items++;
      assert.ok(it.t && !BAD.test(it.t), `記録の文が壊れている（${it.a}歳）: ${it.t}`);
      assert.ok(['g', 'b', 'n', 'h'].includes(it.o), `トーンがない: ${it.t}`);
      if (it.note) assert.ok(!BAD.test(it.note), `注釈が壊れている: ${it.note}`);
    }
    assert.ok(Number.isFinite(L.money.savings) && Number.isFinite(L.money.invest), 'お金が数値でない');
  }
  assert.ok(items > 20000);
  assert.ok(cards.size >= 60, `200人のうちに出た決断の種類 ${cards.size}`);
});
