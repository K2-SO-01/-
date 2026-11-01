// 名前のある人たち（幼なじみ・親友・部活の仲間・同期・上司・ご近所など）と、その人たちとの出来事
// 文章はこの作品のために書いたもの。起こりやすさ（p）はゲームとしての設定です。
export const REL = {
  osana: '幼なじみ', best: '親友', club: '部活の仲間', uni: '大学の友人', doki: '同期', boss: '上司',
  mama: 'ママ友', papa: 'パパ友', neighbor: 'お隣', friend: '友人',
};
export const FRIEND_RELS = ['osana', 'best', 'club', 'uni', 'friend', 'doki'];
// 呼び方：友だちは下の名前、同期は名字、目上やご近所は「名字さん」
export const CALL = { osana: 'mei', best: 'mei', club: 'mei', uni: 'mei', friend: 'mei', doki: 'sei', boss: 'san', mama: 'san', papa: 'san', neighbor: 'san' };

const P = (id, who, a0, a1, p, tone, t, o = {}) => ({ id, who, a0, a1, p, tone, t: Array.isArray(t) ? t : [t], ...o });

// pact: その人への影響（close:+10 親しさ / married / kid / away 遠くへ / left 職場を去る）
export const PEOPLE_EVENTS = [
  // 幼なじみ
  P('pe_osana_play', 'osana', 4, 10, 0.12, 'g', ['幼なじみの{p}と、近所の公園で日が暮れるまで遊びました。', '幼なじみの{p}の家で、夕ごはんをごちそうになりました。', '幼なじみの{p}と、秘密基地をつくりました。'], { cd: 2, pact: 'close:+6' }),
  P('pe_osana_teen', 'osana', 13, 18, 0.08, 'n', ['幼なじみの{p}と帰り道が一緒になり、昔の話で笑いました。', '幼なじみの{p}に、急に敬語で話しかけられて戸惑いました。'], { cd: 3, pact: 'close:+3' }),
  P('pe_osana_seijin', 'osana', 20, 20, 0.5, 'g', ['二十歳のつどいで、幼なじみの{p}と再会しました。'], { once: true, pact: 'close:+8' }),
  P('pe_osana_home', 'osana', 25, 80, 0.06, 'g', ['帰省したとき、幼なじみの{p}とばったり会いました。'], { cd: 6, req: (L) => L.pref !== L.birthPref, pact: 'close:+6' }),
  // 親友
  P('pe_best_fight', 'best', 8, 17, 0.08, 'n', ['親友の{p}とけんかをして、三日間口をききませんでした。四日目に、どちらからともなく笑いました。'], { once: true, pact: 'close:+4' }),
  P('pe_best_talk', 'best', 10, 17, 0.1, 'g', ['親友の{p}と、夜遅くまで将来の話をしました。', '親友の{p}と、テスト前なのに漫画を読みふけりました。'], { cd: 2, pact: 'close:+5', fx: { happy: 2 } }),
  P('pe_best_split', 'best', 15, 15, 0.5, 'n', ['親友の{p}とは、違う高校に進むことになりました。'], { once: true, pact: 'close:-4' }),
  P('pe_best_wedding', 'best', 22, 40, 0.06, 'g', ['親友の{p}の結婚式で、友人代表のスピーチをしました。緊張で原稿が震えました。'], { once: true, pact: 'married', money: -30000, kankon: true, fx: { happy: 3 } }),
  P('pe_doki_wedding', 'doki', 24, 38, 0.05, 'g', ['同期の{p}の結婚式に招かれ、余興のダンスを三週間練習しました。'], { once: true, preq: (p) => !p.married && !p.left, pact: 'married', money: -30000, kankon: true, fx: { social: 2 } }),
  P('pe_best_baby', 'best', 25, 45, 0.06, 'g', ['親友の{p}に子どもが生まれ、お祝いを贈りました。'], { once: true, preq: (p) => p.married, pact: 'kid', money: -10000 }),
  P('pe_best_call', 'best', 20, 60, 0.06, 'g', ['{p}から「近くに来たから」と連絡があり、夜中まで話しこみました。'], { cd: 4, pact: 'close:+8', fx: { happy: 3 } }),
  P('pe_best_move', 'best', 25, 60, 0.03, 'n', ['親友の{p}が遠くへ引っ越すことになり、見送りに行きました。'], { once: true, pact: 'away' }),
  P('pe_best_health', 'best', 40, 65, 0.05, 'n', ['{p}と久しぶりに会い、健康診断の数値の話で盛りあがりました。'], { cd: 6, pact: 'close:+5' }),
  P('pe_best_trip', 'best', 60, 85, 0.05, 'g', ['{p}と、学生のころ以来の二人旅に出かけました。'], { once: true, pact: 'close:+10', fx: { happy: 4 }, money: -50000 }),
  // 部活
  P('pe_club_last', 'club', 14, 18, 0.25, 'g', ['部活の仲間の{p}と、最後の大会のあとに泣きながら笑いました。'], { once: true, pact: 'close:+8' }),
  P('pe_club_reunion', 'club', 25, 70, 0.04, 'g', ['部活の仲間の{p}から、同窓会の誘いが来ました。顧問の先生も来るそうです。'], { cd: 8, pact: 'close:+6' }),
  // 大学
  P('pe_uni_talk', 'uni', 18, 22, 0.15, 'g', ['大学の友人の{p}と、学食で何時間もしゃべりました。', '大学の友人の{p}と、試験の前の晩に一夜漬けをしました。'], { cd: 2, pact: 'close:+5' }),
  P('pe_uni_note', 'uni', 19, 22, 0.1, 'n', ['{p}に講義のノートを借り、試験をなんとか乗りきりました。'], { once: true, pact: 'close:+4' }),
  P('pe_uni_nabe', 'uni', 23, 40, 0.05, 'g', ['大学の友人の{p}の家に集まり、鍋をつつきました。'], { cd: 4, pact: 'close:+5' }),
  // 同期
  P('pe_doki_laugh', 'doki', 22, 32, 0.1, 'g', ['同期の{p}と、上司の口ぐせのものまねで笑いあいました。', '同期の{p}と、残業のあとにラーメンを食べて帰りました。'], { cd: 2, pact: 'close:+5' }),
  P('pe_doki_quit', 'doki', 23, 35, 0.06, 'n', ['同期の{p}が会社を辞めると打ち明けてきました。送別会で少し泣きました。'], { once: true, pact: 'left' }),
  P('pe_doki_promo', 'doki', 28, 45, 0.05, 'n', ['同期の{p}が先に昇進しました。悔しさ半分で、お祝いを言いました。'], { once: true }),
  P('pe_doki_old', 'doki', 50, 65, 0.06, 'g', ['同期の{p}と、入社式の写真を見て笑いました。ふたりとも、髪が減りました。'], { once: true, pact: 'close:+5' }),
  // 上司
  P('pe_boss_praise', 'boss', 22, 45, 0.08, 'g', ['上司の{p}に、仕事の進め方をほめられました。'], { cd: 3, fx: { happy: 2 } }),
  P('pe_boss_typo', 'boss', 22, 45, 0.08, 'b', ['上司の{p}に、資料の誤字を三か所指摘されました。'], { cd: 3 }),
  P('pe_boss_move', 'boss', 23, 60, 0.06, 'n', ['上司の{p}の異動が決まり、送別の色紙に寄せ書きをしました。'], { once: true, pact: 'left' }),
  // ママ友・パパ友
  P('pe_mama_info', 'mama', 25, 55, 0.1, 'g', ['ママ友の{p}と、子どもの習い事の情報を交換しました。', 'ママ友の{p}と公園で立ち話をしていたら、一時間たっていました。'], { cd: 2, pact: 'close:+4' }),
  P('pe_papa_info', 'papa', 25, 55, 0.1, 'g', ['パパ友の{p}と、子どもの運動会でビデオの場所取りをしました。', 'パパ友の{p}と、公園で子どもを遊ばせながら仕事の話をしました。'], { cd: 2, pact: 'close:+4' }),
  // ご近所
  P('pe_nb_gift', 'neighbor', 28, 95, 0.06, 'g', ['お隣の{p}から、旅行のお土産をもらいました。', 'お隣の{p}に、家庭菜園の野菜をおすそ分けしました。'], { cd: 3, pact: 'close:+4' }),
  P('pe_nb_trash', 'neighbor', 28, 95, 0.05, 'n', ['お隣の{p}と、ごみの分別について長い立ち話をしました。'], { cd: 4 }),
  P('pe_nb_watch', 'neighbor', 70, 100, 0.08, 'g', ['お隣の{p}が、ときどき様子を見に来てくれます。'], { cd: 4, pact: 'close:+5', fx: { happy: 2 } }),
  // 友人だれでも
  P('pe_any_help', 'any', 20, 70, 0.25, 'g', ['困っていたとき、{rel}の{p}が力を貸してくれました。'], { cd: 5, req: (L) => L.work.status === 'unemployed' || Object.keys(L.health.conditions).length > 0, pact: 'close:+8', fx: { happy: 4 } }),
  P('pe_any_class', 'any', 55, 85, 0.05, 'g', ['同級会で{p}と再会し、昔の担任のまねで盛りあがりました。'], { cd: 8, pact: 'close:+5' }),
  P('pe_any_nenga', 'any', 60, 95, 0.05, 'n', ['年賀状のやりとりだけになっていた{rel}の{p}に、思いきって電話をかけました。'], { once: true, pact: 'close:+10' }),
  P('pe_any_sns', 'any', 20, 60, 0.05, 'n', ['SNSで{rel}の{p}の近況を知り、「いいね」だけ押しました。'], { cd: 5 }),
];

// 人にまつわる決断カード（choices と同じ形。who で相手を選ぶ）
const C = (id, who, a0, a1, p, cat, title, options, o = {}) => ({ id, who, a0, a1, p, cat, title, options, ...o });
export const PEOPLE_CARDS = [
  C('pc_lend', 'any', 25, 75, 0.012, 'small', '{rel}の{p}から、お金を貸してほしいと頼まれた。', [
    { l: '貸す', money: -300000, roll: [[0.55, { t: '{p}は約束どおり、お金を返してくれました。', tone: 'g', money: 300000, pact: 'close:+6' }], [0.45, { t: '{p}にお金を返してもらえないまま、連絡が途絶えがちになりました。', tone: 'b', fx: { happy: -3 }, pact: 'close:-20' }]], w: 1 },
    { l: '断る', t: '貸せないと伝えました。{p}は「そうだよね」と笑いましたが、少し気まずくなりました。', tone: 'n', pact: 'close:-8', w: 1.2 },
  ], { once: true }),
  C('pc_reconnect', 'faded', 30, 90, 0.03, 'small', 'ふと、疎遠になった{rel}の{p}のことを思い出した。連絡してみる？', [
    { l: '連絡してみる', t: '{p}に連絡すると、すぐに返事が来ました。また会う約束をしました。', tone: 'g', fx: { happy: 3, social: 3 }, pact: 'close:+25', w: 1 },
    { l: 'そっとしておく', t: '', w: 1 },
  ], { cd: 8 }),
  C('pc_startup', 'friendlike', 28, 50, 0.006, 'big', '{rel}の{p}から、一緒に会社を立ち上げないかと誘われた。', [
    { l: '一緒にやる', money: -2000000, roll: [[0.3, { t: '{p}と立ち上げた会社が軌道に乗りました。', tone: 'g', fx: { happy: 8 }, act: 'job:founder', pact: 'close:+10' }], [0.7, { t: '{p}と立ち上げた会社は、3年で畳むことになりました。友情は、なんとか残りました。', tone: 'b', fx: { happy: -6 }, act: 'unemployed' }]], w: 0.5 },
    { l: '今の仕事を続ける', t: '誘いは断りましたが、{p}の挑戦は応援することにしました。', w: 1.5 },
  ], { once: true, req: (L) => L.work.status === 'employed' }),
  C('pc_visit', 'any', 50, 95, 0.02, 'small', '{rel}の{p}が入院したと聞いた。', [
    { l: 'お見舞いに行く', t: '{p}を見舞うと、思ったより元気そうで、病室で長話をしました。', tone: 'g', fx: { social: 2 }, pact: 'close:+8', w: 1.2 },
    { l: '手紙を送る', t: '{p}に手紙を送りました。', tone: 'n', pact: 'close:+4', w: 1 },
  ], { cd: 6 }),
  C('pc_matchmake', 'friendlike', 24, 42, 0.02, 'small', '{rel}の{p}が、知り合いを紹介してくれると言う。', [
    { l: '会ってみる', t: '{p}の紹介で、ある人と会いました。話してみると、思いのほか気が合いました。', tone: 'g', fx: { happy: 2 }, act: 'marriage_boost', w: 1.2 },
    { l: '遠慮しておく', t: '', w: 1 },
  ], { once: true, req: (L, Q) => !Q.married && !L.family.partner }),
  C('pc_speech', 'friendlike', 23, 40, 0.012, 'small', '{rel}の{p}から、結婚式の二次会の幹事を頼まれた。', [
    { l: '引き受ける', t: '二次会の幹事をつとめ、ビンゴの景品選びに三週間悩みました。会は大成功でした。', tone: 'g', fx: { social: 3, happy: 2 }, pact: 'married', w: 1.2 },
    { l: '断る', t: '幹事は断り、ゲストとして楽しみました。', tone: 'n', pact: 'married', w: 1 },
  ], { once: true, preq: (p) => !p.married }),
];
