/* 数学ファクトリー：研究ツリー
 * 研究するには「研究ポイント（研究所や正解で手に入る）」を払い、さらに指定された分野の問題に一定数正解する必要がある。 */
(function (MF) {
  'use strict';
  const G = MF.Game, F = MF.Factory, Qs = MF.Questions, U = MF.Util;
  const R = {};
  // tier: 表示の段、rp: 研究ポイント、req: {分野: 正解数}、pre: 前提の研究
  R.TECHS = [
    { id: 'automation', tier: 1, icon: '⚙️', name: '自動化の基礎', rp: 15, req: { quad: 3 }, pre: [], desc: '組立機を解放。歯車・電子回路をつくれるようになる。' },
    { id: 'blueprint', tier: 1, icon: '📐', name: '設計図', rp: 15, req: { seq: 3 }, pre: [], desc: '工場の配置をコピーして貼りつけられる「設計図」ツールを解放。' },
    { id: 'upgrade1', tier: 1, icon: '⬆️', name: '設備改良Ⅰ', rp: 20, req: { vec: 3 }, pre: [], desc: '設備をLv3まで強化できる（はじめはLv2まで）。' },
    { id: 'smelting2', tier: 1, icon: '🔥', name: '高温溶鉱炉', rp: 25, req: { diff: 3 }, pre: [], desc: '溶鉱炉の速さ +30%。' },
    { id: 'logistics', tier: 1, icon: '➡️', name: '物流工学', rp: 25, req: { seq: 4 }, pre: [], desc: 'ベルトの輸送量 +50%。持ち物から材料を送りこむ「供給ポート」を解放。' },
    { id: 'storage2', tier: 1, icon: '📦', name: '大型倉庫', rp: 25, req: { integ: 3 }, pre: [], desc: '持ち物の上限 +50%。' },
    { id: 'chargeCap1', tier: 1, icon: '🧠', name: '演算コア拡張Ⅰ', rp: 30, req: { diff: 3, prob: 2 }, pre: [], desc: '演算チャージの上限 +10分。' },
    { id: 'labs', tier: 2, icon: '🔬', name: '研究施設', rp: 40, req: { prob: 5 }, pre: ['automation'], desc: '研究所と「研究パック」のレシピを解放。研究ポイントを自動でかせげる。' },
    { id: 'electricity', tier: 2, icon: '⚡', name: '電力網', rp: 40, req: { trig: 4 }, pre: [], desc: '発電所の出力 +30%。' },
    { id: 'quizBoost1', tier: 2, icon: '📘', name: '公式集', rp: 50, req: { quad: 4, prob: 4 }, pre: ['automation'], desc: '問題に正解したときの資源 +20%。' },
    { id: 'mapExpand1', tier: 2, icon: '🗺️', name: '開拓Ⅰ', rp: 50, req: { seq: 5 }, pre: ['logistics'], desc: '工場の土地が広がる。新しい鉱脈も見つかる。' },
    { id: 'military', tier: 2, icon: '🗼', name: '防衛工学', rp: 50, req: { prob: 5 }, pre: ['automation'], desc: '砲台と弾薬のレシピを解放。襲撃の戦闘が有利になる。' },
    { id: 'solar', tier: 3, icon: '☀️', name: 'ソーラーパネル', rp: 120, req: { trig: 6 }, pre: ['electricity'], desc: '燃料いらずで発電するソーラーパネルを解放。' },
    { id: 'plastics', tier: 3, icon: '🛢️', name: '石油化学', rp: 120, req: { trig: 6, diff: 4 }, pre: ['automation'], desc: 'プラスチックのレシピを解放。' },
    { id: 'upgrade2', tier: 3, icon: '⏫', name: '設備改良Ⅱ', rp: 250, req: { diff: 6, integ: 6 }, pre: ['upgrade1'], desc: '設備をLv5まで強化できる。' },
    { id: 'chargeCap2', tier: 3, icon: '🧠', name: '演算コア拡張Ⅱ', rp: 200, req: { vec: 5, integ: 5 }, pre: ['chargeCap1'], desc: '演算チャージの上限 +15分。正解で増える量 +25%。' },
    { id: 'electronics', tier: 4, icon: '💾', name: '電子工学', rp: 350, req: { vec: 7, integ: 7 }, pre: ['plastics', 'labs'], desc: '演算チップのレシピを解放（ウェハはシリコンを溶鉱炉で）。' },
    { id: 'quizBoost2', tier: 4, icon: '📗', name: '解法パターン集', rp: 350, req: { diff: 7, seq: 7, trig: 7 }, pre: ['quizBoost1'], desc: '問題に正解したときの資源 さらに +25%、研究ポイント +50%。' },
    { id: 'mapExpand2', tier: 4, icon: '🗺️', name: '開拓Ⅱ', rp: 300, req: { seq: 7, vec: 5 }, pre: ['mapExpand1'], desc: '工場の土地がさらに広がる。' },
    { id: 'nuclear', tier: 5, icon: '☢️', name: '核燃料', rp: 450, req: { vec: 8, prob: 6 }, pre: ['electronics'], desc: '燃料棒のレシピを解放（ウランから）。' },
    { id: 'rocketry', tier: 6, icon: '🚀', name: 'ロケット工学', rp: 1200, req: { quad: 9, prob: 9, diff: 9, seq: 9, vec: 9, integ: 9, trig: 9 }, pre: ['nuclear', 'upgrade2'], desc: 'ロケット発射台とロケット部品を解放。この星を脱出しよう！' },
  ];
  MF.Balance.research = { hardWeight: 2 };
  R.byId = {};
  R.TECHS.forEach((t) => { R.byId[t.id] = t; });
  R.has = function (s, id) { return !!(s.research && s.research.done.indexOf(id) >= 0); };
  R.status = function (s, id) {
    if (R.has(s, id)) return 'done';
    if (s.research.current === id) return 'active';
    const t = R.byId[id];
    if (t.pre.some((p) => !R.has(s, p))) return 'locked';
    return 'available';
  };
  R.start = function (s, id) {
    const t = R.byId[id];
    if (!t) return { ok: false, reason: '不明な研究' };
    const st = R.status(s, id);
    if (st === 'done') return { ok: false, reason: '研究済み' };
    if (st === 'locked') return { ok: false, reason: '前提の研究がまだ' };
    if (st === 'active') return { ok: true };
    const r = s.research;
    const paid = r.paid[id];
    if (!paid) {
      if (s.rp < t.rp) return { ok: false, reason: '研究ポイントが足りない（' + Math.floor(s.rp) + ' / ' + t.rp + '）' };
      s.rp -= t.rp;
      r.paid[id] = true;
    }
    r.current = id;
    r.prog[id] = r.prog[id] || {};
    R.checkDone(s);
    return { ok: true };
  };
  R.progress = function (s, id) {
    const t = R.byId[id], p = s.research.prog[id] || {};
    let need = 0, have = 0;
    for (const k of Object.keys(t.req)) { need += t.req[k]; have += Math.min(t.req[k], p[k] || 0); }
    return { need, have, ratio: need ? have / need : 1, by: p };
  };
  R.checkDone = function (s) {
    const r = s.research, id = r.current;
    if (!id) return false;
    const pr = R.progress(s, id);
    if (pr.have >= pr.need) {
      r.done.push(id);
      r.current = null;
      R.apply(s, id);
      G.notice(s, { type: 'research', text: '🔬 研究完了：' + R.byId[id].name, id });
      G.emit(s, 'researchDone', { id });
      // 研究の「解く」ボタンで分野を決めていたら「おまかせ」にもどす
      if (s.quiz.topicFrom === 'research') { s.quiz.topic = 'auto'; s.quiz.topicFrom = null; }
      return true;
    }
    return false;
  };
  /** 研究完了時の一回きりの効果 */
  R.apply = function (s, id) {
    if (id === 'mapExpand1') F.expand(s, MF.Balance.factory.expand1[0], MF.Balance.factory.expand1[1]);
    if (id === 'mapExpand2') F.expand(s, MF.Balance.factory.expand2[0], MF.Balance.factory.expand2[1]);
    if (R.onApply[id]) R.onApply[id](s);
  };
  R.onApply = {};
  R.maxLevel = function (s) { return R.has(s, 'upgrade2') ? 5 : R.has(s, 'upgrade1') ? 3 : 2; };
  F.maxLevel = R.maxLevel;

  G.on('answer', (s, d) => {
    const r = s.research;
    if (!d.ok || !r || !r.current) return;
    const t = R.byId[r.current];
    if (!t || !t.req[d.topic]) return;
    const p = r.prog[r.current] = r.prog[r.current] || {};
    // 「難」の問題は2問ぶん進む（難しい問題に挑戦する人が損をしないように）
    p[d.topic] = (p[d.topic] || 0) + (d.level === 2 ? MF.Balance.research.hardWeight : 1);
    R.checkDone(s);
  });

  // ---------- 効果をつなぐ ----------
  F.buildingLocks.assembler = (s) => R.has(s, 'automation');
  F.buildingLocks.lab = (s) => R.has(s, 'labs');
  F.buildingLocks.solar = (s) => R.has(s, 'solar');
  F.buildingLocks.port = (s) => R.has(s, 'logistics');
  F.recipeLocks.gear = (s) => R.has(s, 'automation');
  F.recipeLocks.circuit = (s) => R.has(s, 'automation');
  F.recipeLocks.sciencePack = (s) => R.has(s, 'labs');
  F.recipeLocks.plastic = (s) => R.has(s, 'plastics');
  F.recipeLocks.chip = (s) => R.has(s, 'electronics');
  F.recipeLocks.fuelCell = (s) => R.has(s, 'nuclear');
  F.speedMult.push((s, b) => (b.type === 'furnace' && R.has(s, 'smelting2') ? 1.3 : 1));
  F.beltMult = (s) => (R.has(s, 'logistics') ? 1.5 : 1);
  F.capMult = (s) => (R.has(s, 'storage2') ? 1.5 : 1);
  F.powerPlantMult = (s) => (R.has(s, 'electricity') ? 1.3 : 1);
  F.chargeMaxBonus = (s) => (R.has(s, 'chargeCap1') ? 600 : 0) + (R.has(s, 'chargeCap2') ? 900 : 0);
  F.chargeMult = (s) => (R.has(s, 'chargeCap2') ? 1.25 : 1);
  G.addMultiplier((s, topic, kind) => {
    if (kind === 'quiz') return (R.has(s, 'quizBoost1') ? 1.2 : 1) * (R.has(s, 'quizBoost2') ? 1.25 : 1);
    if (kind === 'rp') return R.has(s, 'quizBoost2') ? 1.5 : 1;
    return 1;
  });

  G.register({
    id: 'research',
    init(s) { s.research = { done: [], current: null, prog: {}, paid: {} }; },
    migrate(s) { if (!s.research.paid) s.research.paid = {}; },
  });
  MF.Research = R;
})(globalThis.MF = globalThis.MF || {});
