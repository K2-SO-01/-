// 「お金を使う・投資」の選択肢。auto: true のものは「毎年続ける」をオンにできる
// cost は円（kids: 子ども1人あたり）。fx は状態の変化。act は特別な処理
export const SPEND = [
  // ---- つながり
  { id: 'dinner', cat: 'つながり', l: '家族や友人にごちそうする', cost: 30000, fx: { social: 4, happy: 2 }, t: '家族や友人に、ちょっといい夕食をごちそうしました。' },
  { id: 'gift_parent', cat: 'つながり', l: '親にプレゼントを贈る', cost: 20000, fx: { social: 3, happy: 1 }, req: 'parentAlive', t: '親にプレゼントを贈りました。電話の声が少しはずんでいました。' },
  { id: 'trip_parent', cat: 'つながり', l: '親を温泉旅行に連れて行く', cost: 150000, fx: { social: 5, happy: 3 }, req: 'parentAlive', t: '親を温泉旅行に連れて行きました。同じ話を三回聞きましたが、楽しそうでした。' },
  { id: 'send_parents', cat: 'つながり', l: '親に仕送りする（年24万円）', cost: 240000, fx: { social: 2 }, auto: true, req: 'parentAlive', t: '親への仕送りを続けています。' },
  { id: 'gift_friend', cat: 'つながり', l: '友人の誕生日に贈り物をする', cost: 10000, fx: { social: 2 }, t: '友人の誕生日に贈り物をしました。' },
  { id: 'donate', cat: 'つながり', l: '寄付をする', cost: 10000, fx: { happy: 1 }, t: '災害支援の募金に寄付しました。' },
  // ---- 楽しむ
  { id: 'trip_dom', cat: '楽しむ', l: '国内旅行に行く', cost: 80000, fx: { happy: 4 }, t: '{place}へ旅行に行きました。' },
  { id: 'trip_abroad', cat: '楽しむ', l: '海外旅行に行く', cost: 350000, fx: { happy: 7, know: 1 }, t: '{abroad}へ旅行に行きました。' },
  { id: 'live', cat: '楽しむ', l: 'ライブ・スポーツ観戦に行く', cost: 15000, fx: { happy: 3 }, t: 'ライブに行き、帰り道もずっと鼻歌を歌っていました。' },
  { id: 'gourmet', cat: '楽しむ', l: 'ちょっといいレストランへ', cost: 20000, fx: { happy: 2 }, t: 'ちょっといいレストランで、コース料理を食べました。' },
  { id: 'oshi', cat: '楽しむ', l: '推し活（年6万円）', cost: 60000, fx: { happy: 3 }, auto: true, t: '推しの活動を応援しています。' },
  { id: 'appliance', cat: '楽しむ', l: '家電を新しくする', cost: 150000, fx: { happy: 2 }, t: '最新の家電に買い替えました。説明書は読んでいません。' },
  // ---- 自分に投資
  { id: 'gym', cat: '自分に投資', l: 'ジムに通う（年8万円）', cost: 80000, fx: { health: 2 }, auto: true, t: 'ジムに通っています。' },
  { id: 'checkup', cat: '自分に投資', l: '人間ドックを受ける', cost: 40000, fx: { health: 1 }, act: 'checkup', t: '人間ドックを受けました。' },
  { id: 'course', cat: '自分に投資', l: '資格講座を受ける（年10万円）', cost: 100000, fx: { know: 3 }, auto: true, act: 'boost', t: '資格講座に通っています。' },
  { id: 'hobby_gear', cat: '自分に投資', l: '趣味の道具とレッスン（年5万円）', cost: 50000, fx: { happy: 1 }, auto: true, act: 'hobbySkill', req: 'hasHobby', t: '趣味の道具とレッスンにお金をかけています。' },
  { id: 'dental', cat: '自分に投資', l: '歯の定期検診（年2万円）', cost: 20000, fx: { health: 1 }, auto: true, t: '歯の定期検診に通っています。' },
  // ---- 子ども
  { id: 'kids_juku', cat: '子ども', l: '子どもを塾に通わせる（1人年30万円）', cost: 300000, kids: [10, 17], fx: { happy: -1 }, auto: true, req: 'kidsSchool', t: '子どもを塾に通わせています。' },
  { id: 'kids_lesson', cat: '子ども', l: '子どもの習い事（1人年6万円）', cost: 60000, kids: [4, 12], fx: { social: 1 }, auto: true, req: 'kidsYoung', t: '子どもの習い事を続けています。' },
  // ---- 運試し・税
  { id: 'jumbo', cat: '運試し', l: '年末ジャンボを30枚買う', cost: 9000, act: 'jumbo', note: 'jumbo', t: '年末ジャンボを30枚買いました。' },
  { id: 'furusato', cat: '税', l: 'ふるさと納税をする（毎年）', cost: 2000, fx: { happy: 2 }, auto: true, act: 'furusato', req: 'income300', note: 'furusato2025', t: 'ふるさと納税をしました。' },
  // ---- お金を育てる
  { id: 'nisa', cat: 'お金を育てる', l: 'NISAで積立投資をする', invest: 'nisa', note: null },
  { id: 'ideco', cat: 'お金を育てる', l: 'iDeCo（月2.3万円・60歳まで引き出せない）', invest: 'ideco' },
  { id: 'stock', cat: 'お金を育てる', l: '個別株を100万円ぶん買う', cost: 1000000, act: 'stock', t: '個別株を100万円ぶん買いました。毎朝、株価を見るのが習慣になりました。' },
  { id: 'sell_stock', cat: 'お金を育てる', l: '持っている株を売る', act: 'sell_stock', req: 'hasStock' },
  { id: 'prepay', cat: 'お金を育てる', l: '住宅ローンを100万円繰上げ返済する', cost: 1000000, act: 'prepay', req: 'hasMortgage', t: '住宅ローンを100万円繰上げ返済しました。' },
  { id: 'repay', cat: 'お金を育てる', l: '借金を返す', act: 'repay', req: 'hasDebt' },
];
export const SPEND_BY_ID = Object.fromEntries(SPEND.map((s) => [s.id, s]));
export const NISA_STEPS = [0, 10000, 30000, 50000, 100000];

// 「暮らし方」の設定（シートの最後の区分）
// 投資の値動き（平均・標準偏差）は過去の長期的な水準をもとにした想定で、将来を約束するものではありません（推計）
export const FUNDS = [
  { id: 'balance', l: 'バランス型（株と債券を半々）', hint: '想定：平均で年3%前後 · 値動きは小さめ', mu: 0.03, sd: 0.09 },
  { id: 'domestic', l: '国内株式のインデックス', hint: '想定：平均で年4〜5% · 値動きは大きい', mu: 0.045, sd: 0.18 },
  { id: 'global', l: '全世界株式のインデックス', hint: '想定：平均で年5%前後 · 為替でも動く', mu: 0.05, sd: 0.16 },
];
export const FUND_BY_ID = Object.fromEntries(FUNDS.map((f) => [f.id, f]));
export const LIFESTYLE = {
  kankon: { label: '冠婚葬祭のお金', help: '友人の結婚式のご祝儀や、お葬式の香典です。少なくすると節約になりますが、相手との仲が少し遠くなることがあります。', opts: [['full', 'きちんと包む'], ['half', '無理のない範囲で'], ['token', '気持ちだけ']] },
  diet: { label: '食生活', help: '食事に気を配ると食費が年6万円ほど増えますが、高血圧や糖尿病になりにくく、健康が少しずつ上向きます。外食が多いと年18万円ほどかかり、病気も少しなりやすくなります。', opts: [['normal', 'ふつうに食べる'], ['careful', '野菜と薄味を心がける'], ['eatout', '外食・出前が多め']] },
  ins: { label: '保険', help: '「しっかり」は医療保険・がん保険・生命保険に入り、20〜69歳のあいだ保険料が年15万円かかります。がんなどの治療費の大部分が保険でまかなわれ、70歳より前に亡くなったときは家族に保険金が出ます。払う保険料の合計は、たいてい受け取る額より多くなります。', opts: [['basic', '公的な保険だけ'], ['full', 'しっかり入る']] },
};
export const DIET_COST = { normal: 0, careful: 60000, eatout: 180000 };
export const INS_PREMIUM = 150000;
export const KANKON_RATE = { full: 1, half: 0.5, token: 0.2 };

export const PLACES = ['北海道', '沖縄', '京都', '金沢', '長崎', '箱根', '伊勢', '松山', '別府', '仙台', '高山', '宮島', '奈良', '日光', '屋久島', '小樽', '軽井沢', '道後温泉'];
export const ABROAD = ['台湾', '韓国', 'ハワイ', 'タイ', 'ベトナム', 'イタリア', 'フランス', 'オーストラリア', 'シンガポール', 'スペイン', 'カナダ', 'トルコ', 'ニュージーランド', 'イギリス', 'メキシコ', 'エジプト'];
export const FURUSATO_GIFTS = ['いくら', 'ホタテ', 'シャインマスカット', '和牛', 'うなぎ', 'お米20キロ', 'トイレットペーパー1年分', 'カニ', 'メロン', '日本酒', '桃', '牛タン'];
