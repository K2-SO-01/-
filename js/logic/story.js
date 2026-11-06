/* 数学ファクトリー：ストーリーとチュートリアルを兼ねたミッション
 * 遭難した調査船（船名はゲームごとにランダム）から始まり、ロケットで星を脱出するまでの物語。
 * 案内役は船載AI「ナビ」：正直さ90%・ユーモア60%の辛口。プレイヤーは「船長」。 */
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
      intro: ['…再起動完了。船長、生きていますね。わたしも生きています。船載AIのナビです。', '本船「{ship}」は、未知の星に不時着しました。船体は大破、エネルギーはほぼゼロ。航海日誌の最後の記録は「たぶん大丈夫」です。', 'この船の演算コアは数学で動きます。船長が問題を解けば、エネルギーと資源が生まれます。つまり燃料は船長の頭です。心配ですね。', 'まずは3問、正解してください。3問です。数えられますね？'] },
    { id: 'miner', ch: 1, title: '最初の採掘機', desc: '鉱脈の上に採掘機を1台建てよう。', where: 'factory', how: '「工場」→「建てる」→「採掘」をえらび、色のついたマス（鉱脈）をタップ。鉄鉱石は二次関数、石材は数列の問題で手に入る。', prog: (s) => [count(s, 'miner'), 1], reward: { iron: 8, stone: 6 },
      intro: ['コアに出力がもどりました。正直、もっとかかると思っていました。', '外をスキャンしました。まわりは鉱石だらけです。採掘機を建てれば、自動で掘ってくれます。船長が素手で掘るより、ずっと効率的です。'] },
    { id: 'belt', ch: 1, title: 'ベルトでつなげ', desc: '採掘機からコアまでベルトを引いて、鉱石を届けよう。', where: 'factory', how: '採掘機のオレンジの▲が出口。「建てる」→「ベルト」で、出口のとなりからコアまでドラッグ（スマホは指でなぞる）。', prog: (s) => [Math.min(1, rawDelivered(s)), 1], reward: { iron: 15, copper: 10 },
      intro: ['採掘機が動いています。ただし、掘った鉱石は運ばないと持ち物に入りません。置きっぱなしは船長の宿題と同じ運命をたどります。', 'ベルトコンベアで、採掘機の出口からコア🛸までつないでください。まっすぐで結構です。芸術性は求めていません。'] },
    { id: 'power', ch: 2, title: '電力を確保せよ', desc: '発電所を1つ建てよう。', where: 'factory', how: '発電所には鉄鉱石・石材・銅鉱石が必要。銅は「確率」、燃料の石炭は「微分」の問題で手に入る。', prog: (s) => [count(s, 'power'), 1], reward: { coal: 20 },
      intro: ['鉱石が届きました。船長、やればできるんですね。航海日誌に記録しておきます。', 'ただ、コアの発電量では採掘機を何台も動かせません。発電所を建ててください。燃料は石炭です。', '上のバーの🧠は「演算チャージ」。正解でたまり、工場がフル稼働します。切れると25%の速さに落ちます。船長がサボると工場もサボる。わかりやすい仕組みです。'] },
    { id: 'plates', ch: 2, title: '鉄を溶かせ', desc: '溶鉱炉で鉄板を10枚つくり、コアに届けよう。', where: 'factory', how: '採掘機(鉄) → 溶鉱炉 → ベルト → コア の順につなぐ。溶鉱炉の出口(▲)の向きに注意！', prog: (s) => [Math.min(10, prod(s, 'ironPlate')), 10], reward: { rp: 20 },
      intro: ['電気が通りました。次は製錬です。', '鉄鉱石を溶鉱炉に流すと鉄板になります。溶鉱炉の出口の向きは確認してください。逆向きに置く船長を、わたしは何度も見てきました。船長は一人しかいませんが。'] },
    { id: 'research1', ch: 3, title: '研究を始めよう', desc: '研究を1つ完了しよう。', where: 'research', how: '「研究」画面で研究ポイントを払って研究を始め、指定された分野の問題に正解すると完了。おすすめは「自動化の基礎」。', prog: (s) => [s.research.done.length, 1], reward: { rp: 15 },
      intro: ['船のデータベースが一部復旧しました。失われた技術を、数学で取りもどします。', '研究には研究ポイントと、指定された分野への正解が必要です。お金と努力の両方がいる。人間の社会と同じですね。'] },
    { id: 'review', ch: 3, title: 'まちがいは宝物', desc: '復習モードで弱点の問題に1問正解しよう。', where: 'study', how: '「受験」→「弱点リスト」→「復習スタート」。まちがえた問題がもう一度出る。', prog: (s) => [(s.story.reviewOk || 0) > 0 || s.study.weak.length === 0 ? 1 : 0, 1], reward: { rp: 15, iron: 10 },
      intro: ['船長、まちがえた問題はすべて「弱点リスト」に記録してあります。一問残らず。', '時間をあけて解き直すと、本当に身につきます。3回クリアで「卒業」です。卒業できない問題がたまると、わたしのメモリが圧迫されます。'] },
    { id: 'assembler', ch: 3, title: '組立ラインを作れ', desc: '研究「自動化の基礎」を完了し、組立機を建てよう。', where: 'research', how: '組立機は鉄板と銅板でつくれる。銅板は銅鉱石を溶鉱炉に流すとできる。', prog: (s) => [(MF.Research.has(s, 'automation') ? 1 : 0) + Math.min(1, count(s, 'assembler')), 2], reward: { ironPlate: 10, copperPlate: 10 },
      intro: ['組立機があれば、歯車や電子回路を自動でつくれます。ようやく工場らしくなってきました。ここまでは長い前置きでした。'] },
    { id: 'hatch', ch: 4, title: '不思議な卵', desc: '卵を孵化させよう。', where: 'pals', how: '卵は問題に正解するとたまに手に入る。持っている卵は、正解を重ねるとかえる。「相棒」画面で孵化！', prog: (s) => [Math.min(1, Object.keys(s.pals.dex).length), 1], reward: { rp: 20 },
      onStart: (s, now) => { if (!s.pals.eggs.length && !s.pals.list.length) MF.Pals.addEgg(s, U.randPick(s, MF.Questions.HOME_TOPICS), now, 0); },
      intro: ['船長、倉庫に卵がありました。中で何かが動いています。食料ではないことを祈ります。', 'この星の生き物でしょう。問題を解いて、あたためてください。船長の正解には保温効果があるようです。科学的な根拠はありません。'] },
    { id: 'assign', ch: 4, title: '相棒と働こう', desc: '相棒を工場の設備に配置しよう。', where: 'factory', how: '工場で設備をタップ →「🐾 相棒を配置」。得意な作業の設備に置くと速くなる。同じ分野の問題を解くと相棒が育つ。', prog: (s) => [Math.min(1, s.pals.list.filter((p) => p.at).length), 1], reward: { coal: 20, copper: 20 },
      intro: ['孵化しました。…「かわいい」という感想は、記録の対象外です。', 'この子たちには得意な作業があります。工場の設備に配置すると、その設備が速くなります。船長より働き者かもしれません。'] },
    { id: 'raid', ch: 5, title: '赤い群れを撃退せよ', desc: '襲撃してきた赤い異星生物を撃退しよう。', where: 'defense', how: '正解を続けると群れが近づく。警告が出たら「防衛」→「迎え撃つ」。カードを使うには問題に正解！', prog: (s) => [Math.min(1, s.battle.raidWins), 1], reward: { rp: 30, iron: 30 },
      onStart: (s) => { s.battle.forceRaids = true; s.battle.raid.meter = Math.max(s.battle.raid.meter, MF.Balance.battle.raidMeter - 5); },
      intro: ['警報。赤い異星生物の群れが、工場の熱に引き寄せられて接近中です。', '防衛システムは数学カードで動きます。カードを使うたびに問題が出ます。不正解ならカードは不発です。当然ですね。', '敵の頭の上に、次の行動の予告が出ます。読んでから動いてください。問題文と同じです。'] },
    { id: 'exam', ch: 5, title: '実力をはかれ', desc: '模試を1回受けよう。', where: 'study', how: '「受験」→「模試」→「ミニ模試」。時間内に複数分野の問題を解く。試験日を設定するとおすすめメニューも出る。', prog: (s) => [Math.min(1, s.study.exams.length), 1], reward: { rp: 30 },
      intro: ['群れを撃退しました。船長、思ったより使えますね。訂正します。かなり使えます。', 'ここで模試を受けて、実力を測りましょう。数字は嘘をつきません。わたしもつきませんが。'] },
    { id: 'labs', ch: 6, title: '研究を自動化せよ', desc: '研究所で研究パックを使い、研究ポイントをかせごう。', where: 'factory', how: '研究「研究施設」で研究所を解放。組立機で歯車と電子回路→研究パック→研究所 と流す。', prog: (s) => [Math.min(1, s.factory.produced.rp || 0), 1], reward: { rp: 40 },
      intro: ['ロケットをつくるには、大量の研究が必要です。船長の手作業だと、救助より先に寿命が来ます。', '研究所を建てて、研究パックを自動でつくらせましょう。'] },
    { id: 'rocketry', ch: 6, title: 'ロケット工学', desc: '研究「ロケット工学」を完了しよう。', where: 'research', how: 'ロケット工学には「核燃料」「設備改良Ⅱ」が先に必要。ふるさとの7分野すべての問題に正解しよう。', prog: (s) => [MF.Research.has(s, 'rocketry') ? 1 : 0, 1], reward: { rp: 50 },
      intro: ['ロケット工学の研究です。ついに、ここまで来ました。', 'すべての分野の正解が必要です。苦手な分野から逃げてきた船長には、つらい時間になります。がんばってください。これは本気です。'] },
    { id: 'silo', ch: 6, title: '発射台の建設', desc: 'ロケット発射台を建てよう。', where: 'factory', how: '発射台は鉄板・レンガ・電子回路・歯車でつくる。', prog: (s) => [Math.min(1, count(s, 'silo')), 1], reward: { gear: 10 } },
    { id: 'launch', ch: 6, title: '星を脱出せよ', desc: 'ロケット部品をそろえ、問題に正解して燃料を充填し、打ち上げよう。', where: 'galaxy', how: 'ロケット部品 = 演算チップ3 + 燃料棒1 + レンガ5 + 歯車4（組立機。供給ポートを使うと楽）。部品がそろったら、問題に正解するたびに燃料がたまる。', prog: (s) => [s.galaxy.unlocked ? 1 : 0, 1], reward: { rp: 100 },
      intro: ['発射台が完成しました。あとはロケット部品と燃料だけです。', '船長。ここまで、よくやりました。これは皮肉ではありません。最後のひと押しです。'] },
    { id: 'colonize', ch: 7, title: '新しい星へ', desc: 'となりの星に植民しよう。', where: 'galaxy', how: 'コロニー船（ロケット部品5個）を打ち上げて、銀河マップで航路がつながった空いている星をえらぶ。', prog: (s) => [Math.min(1, s.galaxy.unlocked ? MF.Galaxy.owned(s, 'player').length - 1 : 0), 1], reward: { rp: 60 },
      intro: ['銀河には、ふるさとにはなかった数学の分野が眠っています。', '植民した星の問題を解くと、その星の資源が手に入ります。帝国との付き合い方は船長しだい。外交でも計算ミスはしないでください。'] },
  ];
  S.byId = {};
  S.MISSIONS.forEach((m) => { S.byId[m.id] = m; });

  // ---------- 船名（漁船ふうの「第○ ＿＿丸」。哲学や科学の言葉をもじる。ゲームごとにランダム） ----------
  S.SHIP_WORDS = ['タブラ・ラサ', 'トリアエズ・エルゴ・スム', 'カルペ・アトデ', 'シュレーディンガー', 'エントロピー増大', 'オッカムのカミソリ負け', 'ソクラテスのムチ', 'ゼノンのカメ',
    'ラプラスのアクビ', 'メビウスのワ', 'ユリイカ・タブン', 'ホモ・ネムイエンス', 'シシュポス', 'プラシーボ', 'マーフィーの法則', 'アキレスのカカト', 'フカクテイ性原理', 'カンガエナイ・アシ',
    'イデア・ダケ', 'パンタ・レイ・タブン', 'コペルニクス的テンカイ', 'アプリオリ・ナント', 'テーゼ・アンチテーゼ・ネボウ', 'ニュートンのリンゴ落ち', 'ガリレオ・ソレデモ', 'ハノイのトウ', 'パブロフのイヌ'];
  S.SHIP_NUMS = ['一', '二', '三', '五', '七', '八', '十一', '十三', '十八', '二十一'];
  /** 種から船名をつくる（同じ種なら同じ名前） */
  S.makeShipName = function (seed) {
    const r = U.rng((seed | 0) || 1);
    return '第' + r.pick(S.SHIP_NUMS) + ' ' + r.pick(S.SHIP_WORDS) + '丸';
  };
  S.shipName = (s) => (s.story && s.story.ship) || '本船';
  /** 会話の文に船名などを入れる（{ship}） */
  S.fmt = (s, text) => String(text).replace(/\{ship\}/g, S.shipName(s));
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
    init(s) { s.story = { idx: 0, done: [], started: {}, introSeen: false, seen: {}, reviewOk: 0, endingSeen: false, ship: S.makeShipName((s.createdAt || 0) ^ (s.rngState || 0)) }; },
    migrate(s) { if (!s.story.ship) s.story.ship = S.makeShipName((s.createdAt || 0) ^ (s.rngState || 7)); },
    tick(s, dt, now) { acc += dt; if (acc >= 1) { acc = 0; S.check(s, now); } },
  });
  MF.Story = S;
})(globalThis.MF = globalThis.MF || {});
