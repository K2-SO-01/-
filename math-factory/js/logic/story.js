/* 数学ファクトリー：ストーリーとチュートリアルを兼ねたミッション
 * 遭難した宇宙船「ラグランジュ号」から始まり、ロケットで星を脱出するまでの物語。 */
(function (MF) {
  'use strict';
  const G = MF.Game, U = MF.Util;
  const S = {};
  const prod = (s, k) => (s.factory.produced[k] || 0);
  const rawDelivered = (s) => ['iron', 'copper', 'coal', 'stone', 'uranium', 'silicon', 'oil'].reduce((a, k) => a + prod(s, k), 0);
  const count = (s, t) => MF.Factory.count(s, t);

  S.CHAPTERS = [
    { id: 1, title: '第1章 不時着', sub: '名前も知らない星で目覚める' },
    { id: 2, title: '第2章 電力復旧', sub: '工場に火を入れる' },
    { id: 3, title: '第3章 研究再開', sub: '知識こそ最大の資源' },
    { id: 4, title: '第4章 相棒', sub: 'ひとりじゃない' },
    { id: 5, title: '第5章 赤い群れ', sub: '工場を守れ' },
    { id: 6, title: '第6章 脱出計画', sub: '空の向こうへ' },
    { id: 7, title: '終章 銀河へ', sub: 'あたらしい物語' },
  ];
  // where: 案内する画面、prog: 進み具合 [今, 目標]
  S.MISSIONS = [
    { id: 'solve3', ch: 1, title: '演算コアを再起動せよ', desc: '問題に3問正解して、演算コアに力を取りもどそう。', where: 'quiz', how: '「計算」画面で問題を解こう。分数は 3/4、負の数は -2 のように入力。', prog: (s) => [s.stats.solved || 0, 3], reward: { iron: 10, stone: 8 },
      intro: ['…システム再起動。キャプテン、聞こえますか？ わたしは船のAI、ナビです。', 'ラグランジュ号は、この未知の星に不時着しました。船体は大破、エネルギーはほぼゼロ…。', 'でも大丈夫。この船の演算コアは「数学」で動きます。問題を解けば、エネルギーと資源が生まれるんです。', 'まずは3問、解いてみましょう！'] },
    { id: 'miner', ch: 1, title: '最初の採掘機', desc: '鉱脈の上に採掘機を1台建てよう。', where: 'factory', how: '「工場」→「建てる」→「採掘」をえらび、色のついたマス（鉱脈）をタップ。鉄鉱石は二次関数、石材は数列の問題で手に入る。', prog: (s) => [count(s, 'miner'), 1], reward: { iron: 8, stone: 6 },
      intro: ['すごい！ コアに少しだけ力がもどりました。', '外をスキャンすると、まわりは鉱石だらけ。採掘機を建てれば、自動で掘り出せます。'] },
    { id: 'belt', ch: 1, title: 'ベルトでつなげ', desc: '採掘機からコアまでベルトを引いて、鉱石を届けよう。', where: 'factory', how: '採掘機のオレンジの▲が出口。「建てる」→「ベルト」で、出口のとなりからコアまでドラッグ（スマホは指でなぞる）。', prog: (s) => [Math.min(1, rawDelivered(s)), 1], reward: { iron: 15, copper: 10 },
      intro: ['採掘機が動きだしました！ でも、掘った鉱石を運ばないと持ち物に入りません。', 'ベルトコンベアで、採掘機の出口から宇宙船のコア🛸までつなぎましょう。'] },
    { id: 'power', ch: 2, title: '電力を確保せよ', desc: '発電所を1つ建てよう。', where: 'factory', how: '発電所には鉄鉱石・石材・銅鉱石が必要。銅は「確率」、燃料の石炭は「微分」の問題で手に入る。', prog: (s) => [count(s, 'power'), 1], reward: { coal: 20 },
      intro: ['鉱石が届きました！ キャプテン、天才ですね。', 'ただ、コアの発電量だけでは採掘機を何台も動かせません。発電所を建てましょう。燃料は石炭です。', 'それと…上のバーの🧠は「演算チャージ」。問題に正解するとたまって、工場がフル稼働します。切れると25%の速さに落ちるので、解き続けてくださいね。'] },
    { id: 'plates', ch: 2, title: '鉄を溶かせ', desc: '溶鉱炉で鉄板を10枚つくり、コアに届けよう。', where: 'factory', how: '採掘機(鉄) → 溶鉱炉 → ベルト → コア の順につなぐ。溶鉱炉の出口(▲)の向きに注意！', prog: (s) => [Math.min(10, prod(s, 'ironPlate')), 10], reward: { rp: 20 },
      intro: ['電気が通りました！ 次は製錬です。', '鉄鉱石を溶鉱炉に流しこむと鉄板になります。鉄板があれば、もっと高度な設備がつくれます。'] },
    { id: 'research1', ch: 3, title: '研究を始めよう', desc: '研究を1つ完了しよう。', where: 'research', how: '「研究」画面で研究ポイントを払って研究を始め、指定された分野の問題に正解すると完了。おすすめは「自動化の基礎」。', prog: (s) => [s.research.done.length, 1], reward: { rp: 15 },
      intro: ['船のデータベースが復旧しました。失われた技術を、数学の力で取りもどしましょう。', '研究には研究ポイントと、特定の分野の問題への正解が必要です。'] },
    { id: 'review', ch: 3, title: 'まちがいは宝物', desc: '復習モードで弱点の問題に1問正解しよう。', where: 'study', how: '「受験」→「弱点リスト」→「復習スタート」。まちがえた問題がもう一度出る。', prog: (s) => [(s.story.reviewOk || 0) > 0 || s.study.weak.length === 0 ? 1 : 0, 1], reward: { rp: 15, iron: 10 },
      intro: ['キャプテン、まちがえた問題は「弱点リスト」に記録されています。', '同じ問題を時間をあけて解き直すと、本当の力になります。3回クリアで「卒業」です。'] },
    { id: 'assembler', ch: 3, title: '組立ラインを作れ', desc: '研究「自動化の基礎」を完了し、組立機を建てよう。', where: 'research', how: '組立機は鉄板と銅板でつくれる。銅板は銅鉱石を溶鉱炉に流すとできる。', prog: (s) => [(MF.Research.has(s, 'automation') ? 1 : 0) + Math.min(1, count(s, 'assembler')), 2], reward: { ironPlate: 10, copperPlate: 10 },
      intro: ['組立機があれば、歯車や電子回路が自動でつくれます。工場らしくなってきましたね！'] },
    { id: 'hatch', ch: 4, title: '不思議な卵', desc: '卵を孵化させよう。', where: 'pals', how: '卵は問題に正解するとたまに手に入る。持っている卵は、正解を重ねるとかえる。「相棒」画面で孵化！', prog: (s) => [Math.min(1, Object.keys(s.pals.dex).length), 1], reward: { rp: 20 },
      onStart: (s, now) => { if (!s.pals.eggs.length && !s.pals.list.length) MF.Pals.addEgg(s, U.randPick(s, MF.Questions.HOME_TOPICS), now, 0); },
      intro: ['キャプテン！ 倉庫に…卵がありました。何かが中で動いています。', 'この星の生き物でしょうか。問題を解いて、あたためてあげましょう。'] },
    { id: 'assign', ch: 4, title: '相棒と働こう', desc: '相棒を工場の設備に配置しよう。', where: 'factory', how: '工場で設備をタップ →「🐾 相棒を配置」。得意な作業の設備に置くと速くなる。同じ分野の問題を解くと相棒が育つ。', prog: (s) => [Math.min(1, s.pals.list.filter((p) => p.at).length), 1], reward: { coal: 20, copper: 20 },
      intro: ['かわいい…！ この子たちは数学の力を食べて育つみたいです。', '得意な作業があるので、工場を手伝ってもらいましょう。'] },
    { id: 'raid', ch: 5, title: '赤い群れを撃退せよ', desc: '襲撃してきた赤い異星生物を撃退しよう。', where: 'defense', how: '正解を続けると群れが近づく。警告が出たら「防衛」→「迎え撃つ」。カードを使うには問題に正解！', prog: (s) => [Math.min(1, s.battle.raidWins), 1], reward: { rp: 30, iron: 30 },
      onStart: (s) => { s.battle.forceRaids = true; s.battle.raid.meter = Math.max(s.battle.raid.meter, MF.Balance.battle.raidMeter - 5); },
      intro: ['警報！ 赤い異星生物の群れが、工場の熱に引き寄せられています！', '防衛システムは数学カードで動きます。カードを使うたびに問題が出るので、正解して撃退してください！', '敵の頭の上の予告を見て、攻めるか守るか決めるのがコツです。'] },
    { id: 'exam', ch: 5, title: '実力をはかれ', desc: '模試を1回受けよう。', where: 'study', how: '「受験」→「模試」→「ミニ模試」。時間内に複数分野の問題を解く。試験日を設定するとおすすめメニューも出る。', prog: (s) => [Math.min(1, s.study.exams.length), 1], reward: { rp: 30 },
      intro: ['群れを追いはらいました！ キャプテン、かなり実力がついてきましたね。', 'ここで一度、模試で今の実力をはかってみましょう。苦手な分野がわかれば、作戦も立てやすくなります。'] },
    { id: 'labs', ch: 6, title: '研究を自動化せよ', desc: '研究所で研究パックを使い、研究ポイントをかせごう。', where: 'factory', how: '研究「研究施設」で研究所を解放。組立機で歯車と電子回路→研究パック→研究所 と流す。', prog: (s) => [Math.min(1, s.factory.produced.rp || 0), 1], reward: { rp: 40 },
      intro: ['脱出に必要なロケットをつくるには、たくさんの研究が必要です。', '研究所を建てて、研究パックを自動でつくれるようにしましょう。'] },
    { id: 'rocketry', ch: 6, title: 'ロケット工学', desc: '研究「ロケット工学」を完了しよう。', where: 'research', how: 'ロケット工学には「核燃料」「設備改良Ⅱ」が先に必要。ふるさとの7分野すべての問題に正解しよう。', prog: (s) => [MF.Research.has(s, 'rocketry') ? 1 : 0, 1], reward: { rp: 50 },
      intro: ['ついに見えてきました。ロケット工学の研究です！', 'すべての分野の力を合わせなければ完成しません。弱点もここで克服しましょう。'] },
    { id: 'silo', ch: 6, title: '発射台の建設', desc: 'ロケット発射台を建てよう。', where: 'factory', how: '発射台は鉄板・レンガ・電子回路・歯車でつくる。', prog: (s) => [Math.min(1, count(s, 'silo')), 1], reward: { gear: 10 } },
    { id: 'launch', ch: 6, title: '星を脱出せよ', desc: 'ロケット部品をそろえ、問題に正解して燃料を充填し、打ち上げよう。', where: 'galaxy', how: 'ロケット部品 = 演算チップ3 + 燃料棒1 + レンガ5 + 歯車4（組立機。供給ポートを使うと楽）。部品がそろったら、問題に正解するたびに燃料がたまる。', prog: (s) => [s.galaxy.unlocked ? 1 : 0, 1], reward: { rp: 100 },
      intro: ['発射台が完成しました！ あとはロケット部品をそろえるだけ。', 'キャプテン…ここまで本当にお疲れさまでした。最後のひと押しです！'] },
    { id: 'colonize', ch: 7, title: '新しい星へ', desc: 'となりの星に植民しよう。', where: 'galaxy', how: 'コロニー船（ロケット部品5個）を打ち上げて、銀河マップで航路がつながった空いている星をえらぶ。', prog: (s) => [Math.min(1, s.galaxy.unlocked ? MF.Galaxy.owned(s, 'player').length - 1 : 0), 1], reward: { rp: 60 },
      intro: ['銀河には、ふるさとにはなかった数学の分野が眠っています。', '植民した星の問題を解くと、その星の資源が手に入ります。帝国たちとの付き合い方も、キャプテン次第です。'] },
  ];
  S.byId = {};
  S.MISSIONS.forEach((m) => { S.byId[m.id] = m; });
  S.current = function (s) { return S.MISSIONS[s.story.idx] || null; };
  S.progress = function (s, m) { m = m || S.current(s); if (!m) return null; const [have, need] = m.prog(s); return { have: Math.min(have, need), need }; };
  /** ミッションの達成を確認して次へ進める */
  S.check = function (s, now) {
    let advanced = false, guard = 0;
    while (guard++ < 30) {
      const m = S.current(s);
      if (!m) break;
      if (!s.story.started[m.id]) { s.story.started[m.id] = now || 1; if (m.onStart) m.onStart(s, now || Date.now()); }
      const p = S.progress(s, m);
      if (p.have < p.need) break;
      s.story.done.push(m.id);
      s.story.idx++;
      G.give(s, m.reward || {});
      G.notice(s, { type: 'mission', text: '🎯 ミッション達成：' + m.title, id: m.id });
      G.emit(s, 'mission', { id: m.id });
      advanced = true;
      const next = S.current(s);
      if (next && next.ch !== m.ch) G.notice(s, { type: 'chapter', ch: next.ch });
    }
    return advanced;
  };
  S.chapterOf = function (s) { const m = S.current(s); return m ? m.ch : 8; };
  S.finished = (s) => s.story.idx >= S.MISSIONS.length;

  G.on('answer', (s, d) => { if (d.ok && (d.mode === 'review' || d.source === 'weak')) s.story.reviewOk = (s.story.reviewOk || 0) + 1; });
  let acc = 0;
  G.register({
    id: 'story',
    init(s) { s.story = { idx: 0, done: [], started: {}, introSeen: false, seen: {}, reviewOk: 0, endingSeen: false }; },
    tick(s, dt, now) { acc += dt; if (acc >= 1) { acc = 0; S.check(s, now); } },
  });
  MF.Story = S;
})(globalThis.MF = globalThis.MF || {});
