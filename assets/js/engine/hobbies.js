// 趣味：最大3つまで。続けるほど腕が上がり、節目の出来事や、まれにプロへの道が開ける。
// kind: sport / music / art / write / game / media / craft / outdoor / food / learn / social
// cost: 1年あたりの費用の目安（円）  pro: プロへの道（dreams.js ではなくこのファイルの PRO で扱う）
export const HOBBY_LIST = [
  // スポーツ
  { id: 'baseball', name: '野球', kind: 'sport', cost: 40000, pro: 'baseball', minAge: 6 },
  { id: 'soccer', name: 'サッカー', kind: 'sport', cost: 30000, pro: 'soccer', minAge: 5 },
  { id: 'basketball', name: 'バスケットボール', kind: 'sport', cost: 25000, minAge: 8 },
  { id: 'volleyball', name: 'バレーボール', kind: 'sport', cost: 20000, minAge: 9 },
  { id: 'tennis', name: 'テニス', kind: 'sport', cost: 60000, minAge: 8 },
  { id: 'tabletennis', name: '卓球', kind: 'sport', cost: 15000, minAge: 6 },
  { id: 'badminton', name: 'バドミントン', kind: 'sport', cost: 15000, minAge: 8 },
  { id: 'swim', name: '水泳', kind: 'sport', cost: 60000, minAge: 3 },
  { id: 'run', name: 'ランニング', kind: 'sport', cost: 20000, minAge: 10 },
  { id: 'kendo', name: '剣道', kind: 'sport', cost: 30000, minAge: 6 },
  { id: 'judo', name: '柔道', kind: 'sport', cost: 30000, minAge: 6 },
  { id: 'karate', name: '空手', kind: 'sport', cost: 40000, minAge: 5 },
  { id: 'kyudo', name: '弓道', kind: 'sport', cost: 40000, minAge: 15 },
  { id: 'ski', name: 'スキー・スノーボード', kind: 'sport', cost: 80000, minAge: 6 },
  { id: 'golf', name: 'ゴルフ', kind: 'sport', cost: 150000, minAge: 20 },
  { id: 'cycling', name: 'サイクリング', kind: 'sport', cost: 40000, minAge: 12 },
  { id: 'surf', name: 'サーフィン', kind: 'sport', cost: 60000, minAge: 15 },
  { id: 'gym', name: 'ジム・筋トレ', kind: 'sport', cost: 80000, minAge: 16 },
  { id: 'yoga', name: 'ヨガ', kind: 'sport', cost: 50000, minAge: 16 },
  { id: 'dance', name: 'ダンス', kind: 'sport', cost: 50000, pro: 'dance', minAge: 5 },
  { id: 'gateball', name: 'グラウンド・ゴルフ', kind: 'sport', cost: 5000, minAge: 55 },
  // 音楽
  { id: 'piano', name: 'ピアノ', kind: 'music', cost: 60000, pro: 'music', minAge: 4 },
  { id: 'guitar', name: 'ギター', kind: 'music', cost: 30000, pro: 'music', minAge: 12 },
  { id: 'brass', name: '吹奏楽', kind: 'music', cost: 20000, minAge: 10 },
  { id: 'chorus', name: '合唱', kind: 'music', cost: 10000, minAge: 8 },
  { id: 'band', name: 'バンド', kind: 'music', cost: 40000, pro: 'music', minAge: 14 },
  { id: 'karaoke', name: 'カラオケ', kind: 'music', cost: 20000, minAge: 10 },
  { id: 'idol', name: '推し活', kind: 'media', cost: 80000, minAge: 10 },
  // 描く・書く・作る
  { id: 'draw', name: '絵を描くこと', kind: 'art', cost: 15000, pro: 'illust', minAge: 4 },
  { id: 'manga', name: 'マンガを描くこと', kind: 'art', cost: 15000, pro: 'manga', minAge: 10 },
  { id: 'write', name: '小説を書くこと', kind: 'write', cost: 5000, pro: 'novel', minAge: 12 },
  { id: 'haiku', name: '俳句・短歌', kind: 'write', cost: 5000, minAge: 10 },
  { id: 'photo', name: '写真', kind: 'art', cost: 50000, pro: 'photo', minAge: 12 },
  { id: 'calligraphy', name: '書道', kind: 'art', cost: 20000, minAge: 6 },
  { id: 'pottery', name: '陶芸', kind: 'craft', cost: 40000, minAge: 15 },
  { id: 'knit', name: '手芸・編み物', kind: 'craft', cost: 15000, minAge: 8 },
  { id: 'diy', name: 'DIY', kind: 'craft', cost: 30000, minAge: 18 },
  { id: 'ikebana', name: '生け花', kind: 'craft', cost: 40000, minAge: 15 },
  { id: 'tea', name: '茶道', kind: 'craft', cost: 50000, minAge: 15 },
  { id: 'comedy', name: 'お笑い', kind: 'stage', cost: 10000, pro: 'comedy', minAge: 14 },
  { id: 'acting', name: '演劇', kind: 'stage', cost: 20000, pro: 'acting', minAge: 10 },
  // 遊ぶ・考える
  { id: 'shogi', name: '将棋', kind: 'game', cost: 5000, pro: 'shogi', minAge: 5 },
  { id: 'go', name: '囲碁', kind: 'game', cost: 5000, minAge: 6 },
  { id: 'mahjong', name: '麻雀', kind: 'game', cost: 10000, minAge: 18 },
  { id: 'videogame', name: 'テレビゲーム', kind: 'game', cost: 30000, pro: 'esports', minAge: 6 },
  { id: 'cardgame', name: 'カードゲーム', kind: 'game', cost: 20000, minAge: 8 },
  { id: 'streaming', name: '動画配信', kind: 'media', cost: 20000, pro: 'streamer', minAge: 13 },
  // 見る・読む
  { id: 'read', name: '読書', kind: 'media', cost: 15000, minAge: 6 },
  { id: 'anime', name: 'アニメ', kind: 'media', cost: 15000, minAge: 5 },
  { id: 'mangaread', name: '漫画を読むこと', kind: 'media', cost: 15000, minAge: 6 },
  { id: 'movie', name: '映画', kind: 'media', cost: 20000, minAge: 8 },
  { id: 'sportswatch', name: 'スポーツ観戦', kind: 'media', cost: 30000, minAge: 6 },
  { id: 'history', name: '歴史めぐり', kind: 'learn', cost: 30000, minAge: 12 },
  { id: 'english', name: '英語の勉強', kind: 'learn', cost: 40000, minAge: 10 },
  { id: 'astronomy', name: '天体観測', kind: 'learn', cost: 20000, minAge: 8 },
  // 外へ出る
  { id: 'fishing', name: '釣り', kind: 'outdoor', cost: 30000, minAge: 7 },
  { id: 'hiking', name: '登山', kind: 'outdoor', cost: 40000, minAge: 10 },
  { id: 'camp', name: 'キャンプ', kind: 'outdoor', cost: 60000, minAge: 12 },
  { id: 'travel', name: '旅行', kind: 'outdoor', cost: 120000, minAge: 18 },
  { id: 'onsen', name: '温泉めぐり', kind: 'outdoor', cost: 60000, minAge: 20 },
  { id: 'train', name: '鉄道', kind: 'outdoor', cost: 30000, minAge: 5 },
  { id: 'castle', name: '城めぐり', kind: 'outdoor', cost: 30000, minAge: 12 },
  { id: 'goshuin', name: '御朱印めぐり', kind: 'outdoor', cost: 20000, minAge: 20 },
  { id: 'birdwatch', name: 'バードウォッチング', kind: 'outdoor', cost: 20000, minAge: 10 },
  { id: 'garden', name: '家庭菜園', kind: 'outdoor', cost: 15000, minAge: 20 },
  // 食べる・つくる
  { id: 'cook', name: '料理', kind: 'food', cost: 20000, pro: 'restaurant', minAge: 10 },
  { id: 'sweets', name: 'お菓子づくり', kind: 'food', cost: 20000, pro: 'restaurant', minAge: 8 },
  { id: 'cafe', name: 'カフェめぐり', kind: 'food', cost: 40000, minAge: 15 },
  { id: 'sake', name: '日本酒めぐり', kind: 'food', cost: 50000, minAge: 20 },
  { id: 'ramen', name: 'ラーメン食べ歩き', kind: 'food', cost: 40000, minAge: 12 },
  // 人と
  { id: 'volunteer', name: 'ボランティア', kind: 'social', cost: 5000, minAge: 13 },
  { id: 'festival', name: '地元の祭り', kind: 'social', cost: 10000, minAge: 6 },
];
export const HOBBY = Object.fromEntries(HOBBY_LIST.map((h) => [h.id, h]));
export const MAX_HOBBIES = 3;

// 腕前の節目（30・55・75・90）で出る出来事。種類ごとの文章（{h} は趣味の名前）
export const HOBBY_MILESTONES = {
  sport: [
    '{h}の練習を続けて、まわりからうまくなったと言われるようになりました。',
    '{h}の地区大会でベスト8に入りました。',
    '{h}の県大会に出場しました。応援に来た家族の声がよく聞こえました。',
    '{h}で全国大会に出場しました。人生でいちばん緊張した日でした。',
  ],
  music: [
    '{h}で、最後まで止まらずに1曲弾けるようになりました。',
    '{h}の発表会で、拍手をもらいました。',
    '{h}のコンクールで入賞しました。',
    '{h}の腕前は、もう人に教えられるほどになりました。',
  ],
  art: [
    '{h}で描いたものを、家族が冷蔵庫に貼ってくれました。',
    '{h}の作品が、地域の展覧会に飾られました。',
    '{h}の作品が、公募展で入選しました。',
    '{h}の作品に、知らない人から「ほしい」と声がかかりました。',
  ],
  write: [
    '{h}で書いたものを、初めて人に読んでもらいました。',
    '{h}の作品が、地元の新聞の投稿欄に載りました。',
    '{h}のコンテストで佳作に選ばれました。',
    '{h}の作品集を自分でつくり、即売会で手に取ってもらいました。',
  ],
  game: [
    '{h}で、近所に相手がいなくなってきました。',
    '{h}の大会で、初めて賞状をもらいました。',
    '{h}で段位（ランク）が上がり、上級者の仲間入りをしました。',
    '{h}の全国規模の大会で上位に入りました。',
  ],
  media: [
    '{h}の話ができる友だちができました。',
    '{h}のために、休日の予定を立てるのが楽しみになりました。',
    '{h}について語りだすと止まらない、と家族に言われました。',
    '{h}の知識で、ちょっとした有名人になりました。',
  ],
  craft: [
    '{h}で、はじめて人に見せられるものができました。',
    '{h}でつくったものを、友だちに贈りました。',
    '{h}の作品が、手づくり市で売れました。',
    '{h}の教室で、先生の代わりを頼まれるようになりました。',
  ],
  stage: [
    '{h}で、初めて人前に立ちました。足が震えました。',
    '{h}で、客席から大きな笑いと拍手が起きました。',
    '{h}の大会で、予選を突破しました。',
    '{h}で、地元のイベントに呼ばれるようになりました。',
  ],
  outdoor: [
    '{h}の楽しさに目覚めました。週末が待ち遠しくなりました。',
    '{h}で、行ってみたかった場所にとうとう行けました。',
    '{h}の記録を写真とノートにまとめています。もう何冊にもなりました。',
    '{h}で、仲間を案内する側になりました。',
  ],
  food: [
    '{h}で、家族においしいと言われました。',
    '{h}の腕前が上がり、友人を招いてふるまいました。',
    '{h}の味が評判になり、レシピをよく聞かれるようになりました。',
    '{h}の腕は、もうお店が開けると言われるほどです。',
  ],
  learn: [
    '{h}で、知らなかった世界が少しずつ見えてきました。',
    '{h}で、検定に合格しました。',
    '{h}について、人前で話す機会がありました。',
    '{h}は、もう立派な専門分野になりました。',
  ],
  social: [
    '{h}で、顔なじみが増えました。',
    '{h}の仲間から頼りにされるようになりました。',
    '{h}で、地域の人から感謝状をもらいました。',
    '{h}の中心となって、若い人を迎えるようになりました。',
  ],
};
export const HOBBY_THRESHOLDS = [30, 55, 75, 90];

// プロへの道（夢の仕事）。腕前・年齢がそろうと決断カードが出る。
// p: 挑戦したときにプロになれる確率の目安（腕前90以上の場合。統計の注釈から作った推計）
export const PRO = {
  baseball: { title: 'プロ野球選手', ages: [18, 22], skill: 85, p: 0.12, fact: 'draft2025', job: 'pro_baseball', ask: 'プロ志望届を出してみる？', fail: 'ドラフト会議の日、名前は呼ばれませんでした。野球は社会人のチームで続けることにしました。', ok: 'ドラフト会議で名前が呼ばれました。プロ野球選手になりました。' },
  soccer: { title: 'プロサッカー選手', ages: [18, 22], skill: 85, p: 0.1, job: 'pro_soccer', ask: 'プロのチームの練習に参加してみる？', fail: '練習参加のあと、契約の話はありませんでした。サッカーは地域のクラブで続けます。', ok: 'Jリーグのクラブと契約しました。プロサッカー選手になりました。' },
  dance: { title: 'プロのダンサー', ages: [17, 28], skill: 85, p: 0.15, job: 'dancer', ask: 'ダンスで食べていこうか？', fail: 'オーディションを受け続けましたが、仕事にはつながりませんでした。ダンスは趣味として続けます。', ok: 'ダンサーとして、舞台やミュージックビデオの仕事が入るようになりました。' },
  music: { title: '音楽家', ages: [18, 30], skill: 85, p: 0.1, job: 'musician', ask: '音楽で食べていこうか？', fail: '何度かライブをしましたが、音楽だけで暮らすのは難しく、趣味として続けることにしました。', ok: '曲が配信で少しずつ聴かれるようになり、音楽の仕事で暮らせるようになりました。' },
  illust: { title: 'イラストレーター', ages: [18, 35], skill: 80, p: 0.2, job: 'illustrator', ask: '絵を仕事にしてみる？', fail: '依頼はときどき来ましたが、暮らせるほどではありませんでした。絵は趣味として続けます。', ok: 'イラストの仕事が途切れなく来るようになりました。' },
  manga: { title: '漫画家', ages: [18, 32], skill: 85, p: 0.08, job: 'mangaka', ask: '漫画の新人賞に投稿してみる？', fail: '投稿作は選外でした。それでも描くことはやめませんでした。', ok: '新人賞を受け、雑誌で連載が始まりました。漫画家になりました。' },
  novel: { title: '小説家', ages: [20, 60], skill: 85, p: 0.06, job: 'novelist', ask: '小説の新人賞に応募してみる？', fail: '一次選考は通りましたが、受賞はかないませんでした。また書きます。', ok: '新人賞を受賞し、本が書店に並びました。' },
  photo: { title: '写真家', ages: [20, 45], skill: 85, p: 0.12, job: 'photographer', ask: '写真を仕事にしてみる？', fail: '仕事の依頼は少なく、写真は趣味として続けることにしました。', ok: '写真の仕事で暮らせるようになりました。' },
  comedy: { title: 'お笑い芸人', ages: [18, 30], skill: 75, p: 0.05, fact: 'm1_2025', job: 'comedian', ask: '芸人をめざして、養成所に入る？', fail: '何年も舞台に立ちましたが、売れることはありませんでした。あのころの仲間とは、今も笑い話をします。', ok: '漫才の大会で勝ち進み、テレビに呼ばれるようになりました。' },
  acting: { title: '俳優', ages: [18, 30], skill: 85, p: 0.06, job: 'actor', ask: '俳優をめざしてみる？', fail: 'オーディションに落ち続け、別の道を選びました。演劇は趣味で続けます。', ok: 'ドラマの役をもらい、俳優として暮らせるようになりました。' },
  shogi: { title: 'プロ棋士', ages: [10, 15], skill: 80, p: 0.2, fact: 'shogi', job: 'shogi_pro', ask: '奨励会（プロ棋士の養成機関）を受けてみる？', fail: '奨励会で何年も戦いましたが、年齢制限までに四段には届きませんでした。将棋は一生の趣味になりました。', ok: '奨励会の三段リーグを勝ち抜き、四段に昇段しました。プロ棋士になりました。', delay: 10 },
  esports: { title: 'プロゲーマー', ages: [16, 25], skill: 90, p: 0.06, job: 'progamer', ask: 'プロゲーマーをめざす？', fail: 'チームのテストには受かりませんでした。ゲームは友だちと楽しむ趣味に戻りました。', ok: 'プロチームと契約しました。プロゲーマーになりました。' },
  streamer: { title: '配信者', ages: [16, 40], skill: 80, p: 0.08, job: 'streamer', ask: '動画配信を仕事にしてみる？', fail: '登録者は思うように増えず、配信は趣味として続けることにしました。', ok: '登録者が増え、広告や案件の収入で暮らせるようになりました。' },
  restaurant: { title: '自分の店', ages: [28, 55], skill: 80, p: 0.5, job: 'shopowner_food', ask: '自分の店を開いてみる？', fail: '開店の準備を進めましたが、資金と場所が見つからず、見送りました。', ok: '小さな店を開きました。開店の日、常連になってくれそうなお客さんが来ました。', cost: 5000000 },
};
