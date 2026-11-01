// ゲーム内の文章・選択肢・職業などの定義（文章はすべてこのゲームのために書いたもの）

// ---------------------------------------------------------------- 今年の重点
export const FOCUS = {
  child: [
    { id: 'study', label: '勉強', hint: '知識↑ 幸福が少し↓' },
    { id: 'friends', label: '友だち・遊び', hint: '人間関係↑ 幸福↑' },
    { id: 'home', label: '家の手伝い', hint: '家族との絆↑ 知識が少し↓' },
    { id: 'sports', label: '運動', hint: '健康↑' },
    { id: 'hobby', label: '好きなこと', hint: '幸福↑ 得意なことが育つ' },
    { id: 'parttime', label: 'アルバイト', hint: 'お金が少し · 知識↓', minAge: 16 },
  ],
  adult: [
    { id: 'work', label: '仕事に打ち込む', hint: '収入・昇進↑ 健康・人間関係↓' },
    { id: 'balance', label: 'バランスよく', hint: '少しずつまんべんなく' },
    { id: 'family', label: '家族・友人', hint: '人間関係↑ 幸福↑' },
    { id: 'health', label: '健康づくり', hint: '健康↑ お金が少し↓' },
    { id: 'learn', label: '学び直し', hint: '知識↑ 転職の誘い↑' },
    { id: 'community', label: '地域・ボランティア', hint: '人間関係↑ 幸福が少し↑' },
    { id: 'rest', label: '休む', hint: '健康↑ 幸福↑ 収入が少し↓' },
    { id: 'hobby', label: '趣味', hint: '幸福↑ 腕が上がる' },
  ],
  senior: [
    { id: 'health', label: '健康づくり', hint: '健康↑' },
    { id: 'family', label: '家族・友人', hint: '人間関係↑ 幸福↑' },
    { id: 'brain', label: '学び・頭の体操', hint: '知識↑ 記憶力を保つ' },
    { id: 'community', label: '地域・ボランティア', hint: '人間関係↑ 幸福が少し↑' },
    { id: 'hobby', label: '趣味', hint: '幸福↑' },
    { id: 'rest', label: 'のんびり過ごす', hint: '健康↑ 幸福↑' },
    { id: 'work', label: 'もう少し働く', hint: '収入↑ 健康が少し↓', maxAge: 80 },
  ],
};
export function focusGroup(age) {
  if (age < 6) return null;
  if (age < 18) return 'child';
  if (age < 65) return 'adult';
  return 'senior';
}

// ---------------------------------------------------------------- 気質（0〜5歳）
export const TEMPER = {
  curious: { label: '好奇心のかたまり', trait: '好奇心' },
  kind: { label: 'やさしい子', trait: 'やさしさ' },
  grit: { label: 'がんばり屋', trait: '粘り強さ' },
  active: { label: '元気いっぱいの子', trait: '元気' },
  calm: { label: 'おっとりした子', trait: 'おだやかさ' },
};
export const TODDLER_CARDS = [
  {
    age: 1, title: '初めての公園。最初に向かったのは？', options: [
      ['砂場の砂をすくっては、じっと眺める', 'curious'],
      ['泣いている子のそばに、ちょこんと座る', 'kind'],
      ['低い段差を、何度でもよじ登ろうとする', 'grit'],
      ['鳩を追いかけて走り出す', 'active'],
    ],
  },
  {
    age: 2, title: '積み木がくずれてしまいました。', options: [
      ['くずれ方がおもしろくて、もう一度くずす', 'curious'],
      ['くずれた積み木を、隣の子にも分ける', 'kind'],
      ['黙って一つめから積み直す', 'grit'],
      ['気にせず、もう外へ行きたがる', 'active'],
      ['しばらく眺めて、ゆっくり別の遊びへ', 'calm'],
    ],
  },
  {
    age: 3, title: '保育園の帰り道、寄り道をせがむなら。', options: [
      ['知らない路地の先を見たがる', 'curious'],
      ['ねこに「ばいばい」を言いに行く', 'kind'],
      ['自分で歩くと言って、抱っこを断る', 'grit'],
      ['公園でもうひと遊び', 'active'],
      ['空の雲を指さして、立ち止まる', 'calm'],
    ],
  },
  {
    age: 4, title: '初めての「おつかい」ごっこ。', options: [
      ['お店の人に、品物の名前を次々にたずねる', 'curious'],
      ['弟や妹、友だちの分のおやつも選ぶ', 'kind'],
      ['言われたものを、最後まできちんと覚えている', 'grit'],
      ['お店まで走って行って、走って帰る', 'active'],
    ],
  },
];

// ---------------------------------------------------------------- 大学で学ぶこと
export const MAJORS = [
  { id: 'hum', label: '文学・語学・人文', w: 0.15 },
  { id: 'soc', label: '経済・経営・法律', w: 0.32 },
  { id: 'sci', label: '理学・工学', w: 0.16 },
  { id: 'info', label: '情報', w: 0.06 },
  { id: 'med', label: '医療・看護・薬学', w: 0.1 },
  { id: 'edu', label: '教育', w: 0.07 },
  { id: 'agri', label: '農学・環境', w: 0.03 },
  { id: 'art', label: '芸術・デザイン', w: 0.05 },
  { id: 'home', label: '家政・生活', w: 0.06 },
];
export const VOC_TRACKS = [
  { id: 'nurse', label: '看護', job: 'nurse', w: 0.12 },
  { id: 'care', label: '介護福祉', job: 'care', w: 0.06 },
  { id: 'nursery', label: '保育', job: 'nursery', w: 0.06 },
  { id: 'beauty', label: '美容', job: 'hairdresser', w: 0.1 },
  { id: 'cook', label: '調理・製菓', job: 'cook', w: 0.09 },
  { id: 'it', label: '情報処理', job: 'it', w: 0.1 },
  { id: 'design', label: 'デザイン・アニメ', job: 'designer', w: 0.1 },
  { id: 'tech', label: '工業・整備', job: 'mechanic', w: 0.1 },
  { id: 'medtech', label: '医療技術（リハビリ・検査）', job: 'therapist', w: 0.1 },
  { id: 'biz', label: '経理・ビジネス', job: 'office', w: 0.09 },
  { id: 'travel', label: '観光・ホテル', job: 'hotel', w: 0.08 },
];

// ---------------------------------------------------------------- 職業
// s: 産業（1=第1次, 2=第2次, 3=第3次） w: 産業内のおおよその比重（推計） edu: 必要な学歴の目安
// wf: 賃金の係数  f: 女性の比率の目安  self: 自営が多い  pub: 公務
export const JOBS = [
  { id: 'farmer', t: '農家', s: 1, w: 0.6, edu: 'none', wf: 0.62, f: 0.4, self: true },
  { id: 'dairy', t: '酪農家', s: 1, w: 0.08, edu: 'none', wf: 0.75, f: 0.3, self: true },
  { id: 'fisher', t: '漁師', s: 1, w: 0.18, edu: 'none', wf: 0.75, f: 0.1, self: true, coast: true },
  { id: 'forestry', t: '林業の作業員', s: 1, w: 0.08, edu: 'none', wf: 0.75, f: 0.06 },
  { id: 'agricorp', t: '農業法人の従業員', s: 1, w: 0.12, edu: 'hs', wf: 0.72, f: 0.35 },

  { id: 'factory', t: '工場の製造スタッフ', s: 2, w: 0.42, edu: 'none', wf: 0.86, f: 0.3 },
  { id: 'engineer', t: 'メーカーの技術者', s: 2, w: 0.14, edu: 'univ', wf: 1.22, f: 0.15, majors: ['sci', 'info'] },
  { id: 'construction', t: '建設現場の職人', s: 2, w: 0.16, edu: 'none', wf: 0.95, f: 0.03 },
  { id: 'carpenter', t: '大工', s: 2, w: 0.05, edu: 'none', wf: 0.92, f: 0.02, self: true },
  { id: 'electrician', t: '電気工事士', s: 2, w: 0.06, edu: 'hs', wf: 1.0, f: 0.03 },
  { id: 'sitemanager', t: '施工管理の技術者', s: 2, w: 0.07, edu: 'hs', wf: 1.15, f: 0.08 },
  { id: 'food', t: '食品工場の従業員', s: 2, w: 0.1, edu: 'none', wf: 0.78, f: 0.55 },

  { id: 'retail', t: 'スーパーの販売員', s: 3, w: 0.09, edu: 'none', wf: 0.78, f: 0.65 },
  { id: 'shop', t: '専門店の販売員', s: 3, w: 0.04, edu: 'hs', wf: 0.82, f: 0.6 },
  { id: 'office', t: '会社の事務', s: 3, w: 0.12, edu: 'hs', wf: 0.9, f: 0.68 },
  { id: 'sales', t: '営業職', s: 3, w: 0.08, edu: 'hs', wf: 1.1, f: 0.3 },
  { id: 'care', t: '介護職', s: 3, w: 0.07, edu: 'none', wf: 0.82, f: 0.72 },
  { id: 'nurse', t: '看護師', s: 3, w: 0.05, edu: 'voc', wf: 1.08, f: 0.9, req: ['nurse', 'med'] },
  { id: 'therapist', t: '理学療法士', s: 3, w: 0.012, edu: 'voc', wf: 1.0, f: 0.45, req: ['medtech', 'med'] },
  { id: 'nursery', t: '保育士', s: 3, w: 0.025, edu: 'voc', wf: 0.82, f: 0.95, req: ['nursery', 'edu', 'home'] },
  { id: 'teacher', t: '学校の先生', s: 3, w: 0.03, edu: 'univ', wf: 1.2, f: 0.5, pub: true, req: ['edu', 'hum', 'sci'] },
  { id: 'civil', t: '市役所の職員', s: 3, w: 0.03, edu: 'hs', wf: 1.05, f: 0.4, pub: true },
  { id: 'prefstaff', t: '県庁の職員', s: 3, w: 0.01, edu: 'univ', wf: 1.15, f: 0.35, pub: true },
  { id: 'police', t: '警察官', s: 3, w: 0.01, edu: 'hs', wf: 1.12, f: 0.12, pub: true },
  { id: 'fire', t: '消防士', s: 3, w: 0.006, edu: 'hs', wf: 1.08, f: 0.03, pub: true },
  { id: 'sdf', t: '自衛官', s: 3, w: 0.008, edu: 'hs', wf: 1.0, f: 0.08, pub: true },
  { id: 'it', t: 'システムエンジニア', s: 3, w: 0.04, edu: 'voc', wf: 1.18, f: 0.22, urban: true, req: ['it', 'info', 'sci', 'soc'] },
  { id: 'bank', t: '銀行員', s: 3, w: 0.018, edu: 'univ', wf: 1.22, f: 0.45 },
  { id: 'insurance', t: '保険会社の社員', s: 3, w: 0.012, edu: 'univ', wf: 1.15, f: 0.55 },
  { id: 'cook', t: '料理人', s: 3, w: 0.025, edu: 'none', wf: 0.8, f: 0.3 },
  { id: 'restaurant', t: '飲食店のスタッフ', s: 3, w: 0.04, edu: 'none', wf: 0.68, f: 0.6 },
  { id: 'hairdresser', t: '美容師', s: 3, w: 0.012, edu: 'voc', wf: 0.78, f: 0.65, req: ['beauty'] },
  { id: 'driver', t: 'トラックの運転手', s: 3, w: 0.028, edu: 'none', wf: 0.98, f: 0.03 },
  { id: 'delivery', t: '配送ドライバー', s: 3, w: 0.02, edu: 'none', wf: 0.88, f: 0.08 },
  { id: 'warehouse', t: '倉庫の作業スタッフ', s: 3, w: 0.028, edu: 'none', wf: 0.75, f: 0.45 },
  { id: 'mechanic', t: '自動車整備士', s: 3, w: 0.012, edu: 'voc', wf: 0.9, f: 0.04, req: ['tech', 'sci'] },
  { id: 'cleaning', t: '清掃スタッフ', s: 3, w: 0.018, edu: 'none', wf: 0.66, f: 0.6 },
  { id: 'security', t: '警備員', s: 3, w: 0.012, edu: 'none', wf: 0.72, f: 0.08 },
  { id: 'hotel', t: 'ホテルの従業員', s: 3, w: 0.014, edu: 'hs', wf: 0.78, f: 0.55 },
  { id: 'callcenter', t: 'コールセンターのオペレーター', s: 3, w: 0.012, edu: 'hs', wf: 0.75, f: 0.7 },
  { id: 'realestate', t: '不動産会社の営業', s: 3, w: 0.012, edu: 'hs', wf: 1.1, f: 0.3 },
  { id: 'doctor', t: '医師', s: 3, w: 0.005, edu: 'univ', wf: 2.3, f: 0.25, req: ['med'], doctor: true },
  { id: 'pharmacist', t: '薬剤師', s: 3, w: 0.005, edu: 'univ', wf: 1.35, f: 0.6, req: ['med'] },
  { id: 'researcher', t: '研究者', s: 3, w: 0.004, edu: 'grad', wf: 1.3, f: 0.2, req: ['sci', 'info', 'agri', 'hum', 'med'] },
  { id: 'designer', t: 'デザイナー', s: 3, w: 0.007, edu: 'voc', wf: 0.95, f: 0.55, urban: true, req: ['design', 'art'] },
  { id: 'editor', t: '記者・編集者', s: 3, w: 0.004, edu: 'univ', wf: 1.1, f: 0.45, urban: true, req: ['hum', 'soc'] },
  { id: 'consultant', t: 'コンサルタント', s: 3, w: 0.004, edu: 'univ', wf: 1.6, f: 0.3, urban: true, req: ['soc', 'sci', 'info'] },
  { id: 'accountant', t: '経理・会計の担当', s: 3, w: 0.015, edu: 'hs', wf: 1.0, f: 0.6 },
  { id: 'tourism', t: '観光案内・旅館の仕事', s: 3, w: 0.008, edu: 'hs', wf: 0.75, f: 0.6 },
  { id: 'shopowner', t: '小さな店の店主', s: 3, w: 0.02, edu: 'none', wf: 0.85, f: 0.4, self: true },
  { id: 'temple', t: 'お寺・神社の仕事', s: 3, w: 0.002, edu: 'univ', wf: 0.85, f: 0.15 },
];
export const EDU_RANK = { none: 0, jhs: 0, hs: 1, voc: 2, jc: 2, univ: 3, grad: 4 };
export const EDU_LABEL = { none: '中学校', jhs: '中学校', hs: '高校', voc: '専門学校', jc: '短期大学', univ: '大学', grad: '大学院' };

// ---------------------------------------------------------------- 暮らし向き（全国の所得5分位）
export const QUINTILE = ['', '暮らしがかなり苦しい家', '余裕の少ない家', 'ふつうの家', 'ゆとりのある家', 'とても恵まれた家'];

// ---------------------------------------------------------------- 趣味
export const HOBBIES = ['写真', '釣り', '家庭菜園', '登山', 'ピアノ', 'ギター', '料理', '読書', 'ランニング', '書道', '陶芸', '将棋', '囲碁', 'お菓子づくり', 'キャンプ', '絵を描くこと', '俳句', '手芸', 'バードウォッチング', '御朱印めぐり', '温泉めぐり', 'カラオケ', 'ゲーム', '野球観戦', 'サッカー観戦', '鉄道旅行'];
export const CLUBS = {
  sports: ['サッカー部', '野球部', 'バスケットボール部', 'バレーボール部', '陸上部', 'ソフトテニス部', '卓球部', '剣道部', '水泳部', 'バドミントン部'],
  culture: ['吹奏楽部', '美術部', '科学部', '合唱部', 'パソコン部', '写真部', '文芸部', '茶道部', '放送部'],
};

// ---------------------------------------------------------------- ひと息（問いかけ）
// すべてこのゲームのためのオリジナル。人生の状況に合わせて選ぶ。
export const REFLECTIONS = {
  5: [
    { when: (L) => !L.family.father, q: 'この子のそばにいる大人は、ひとりです。あなたが小さかったころ、いちばん頼りにしていた大人は誰でしたか。' },
    { when: (L) => L.household.quintile <= 2, q: 'この家には、余裕があまりありません。それでも、この子が毎日笑う理由は何だと思いますか。' },
    { when: (L) => L.family.siblings.length >= 2, q: 'きょうだいに囲まれて育っています。あなたの記憶のいちばん奥には、誰の声が残っていますか。' },
    { when: () => true, q: '五年が過ぎました。この子はまだ、自分がどこに生まれたのかを知りません。あなたが「自分の町」を意識したのは、いつごろでしたか。' },
    { when: () => true, q: 'この子が初めて覚えた「うれしい」は、どんな形をしていたと思いますか。あなたの最初の記憶には、何が映っていますか。' },
  ],
  15: [
    { when: (L) => L.flags.bullied || L.flags.futoko, q: '学校がつらい時期がありました。あの日々、この子が逃げこめた場所はあったでしょうか。あなたの15歳には、ありましたか。' },
    { when: (L) => L.household.quintile <= 2, q: '家の事情で、口にしなかった望みがあるかもしれません。あなたが15歳のとき、言わずにのみこんだことは何でしたか。' },
    { when: (L) => L.pref !== L.birthPref, q: '生まれた県とは違う場所で15歳を迎えました。あなたにとって「地元」と呼べる場所は、いくつありますか。' },
    { when: () => true, q: '15歳。行く高校も、進む道も、まわりの大人の考えや住んでいる町で変わります。あなたが15歳のとき、自分で選べたことはどれくらいありましたか。' },
    { when: () => true, q: 'この子の部屋の窓から見える景色を想像してみてください。あなたの15歳の窓からは、何が見えていましたか。' },
  ],
  30: [
    { when: (L) => L.pref !== L.birthPref, q: '生まれた{birthPref}を離れて暮らしています。あなたは、生まれた場所からどれくらい遠くまで来ましたか。それは選んだ距離でしたか。' },
    { when: (L) => L.family.children.length > 0, q: '30歳で、子どもがいます。あなたが30歳のころ（あるいは30歳になったら）、いちばん時間を使いたいものは何ですか。' },
    { when: (L) => !L.family.spouse && L.work.status !== 'employed', q: '30歳。肩書きも、決まった相手も、いまはありません。あなたは、何があれば「自分の人生は大丈夫だ」と思えますか。' },
    { when: () => true, q: 'この人の30年は、生まれた県の数字とどれくらい似ているでしょう。あなたの30年のなかで、偶然だったと思うものを一つ挙げるとしたら。' },
    { when: () => true, q: '30歳。この人はいま、誰の名前をいちばん多く口にしているでしょう。あなたの場合は、誰ですか。' },
  ],
  50: [
    { when: (L) => L.flags.caring, q: '親の老いと向き合う年ごろになりました。あなたは、誰に支えられて大人になりましたか。その人に、いま何を返したいですか。' },
    { when: (L) => L.health.conditions.cancer || L.stats.health < 45, q: '体が思うようにいかない日が増えました。あなたが元気なうちに、会っておきたい人はいますか。' },
    { when: (L) => (L.moved || []).length >= 2, q: 'いくつもの土地で暮らしてきました。どの町の、どんな音を覚えていますか。' },
    { when: () => true, q: '50年。この人が手に入れたものと、手放したもの。あなたなら、どちらを先に数えますか。' },
    { when: () => true, q: '人生のなかほどを過ぎました。この人が20歳のときに思い描いた50歳と、いまの姿は似ているでしょうか。あなたはどうですか。' },
  ],
  70: [
    { when: (L) => L.family.spouse && !L.family.spouse.alive, q: '連れ合いを見送りました。あなたが「ありがとう」をまだ伝えていない人は、誰ですか。' },
    { when: (L) => L.family.children.length === 0, q: '70歳。この人のことを覚えているのは、誰でしょう。あなたは、自分の何を覚えていてほしいですか。' },
    { when: () => true, q: '70年。同じ年に同じ県で生まれた人の多くが、まだここにいます。あなたが70歳になったとき、隣にいてほしいのは誰ですか。' },
    { when: () => true, q: 'この人の一日の終わりに、窓の外から聞こえてくるのはどんな音でしょう。あなたは、どんな音の中で年をとりたいですか。' },
  ],
};

// ---------------------------------------------------------------- 文章の小道具
export const SEASONS = ['春', '夏', '秋', '冬'];
export const ordinalChild = (n) => ['第一子', '第二子', '第三子', '第四子', '第五子', '第六子'][n] || `第${n + 1}子`;
