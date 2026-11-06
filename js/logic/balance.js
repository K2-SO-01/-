/* 数学ファクトリー：バランス調整用の数値（ここだけ変えればゲーム全体の難しさが変わる） */
(function (MF) {
  'use strict';
  MF.Balance = {
    quiz: {
      baseReward: [5, 9, 15],       // 正解でもらえる資源（易・普・難）
      rpReward: [1, 2, 3],          // 正解でもらえる研究ポイント
      comboStep: 0.1,               // コンボ1つにつき +10%
      comboCap: 20,                 // コンボ倍率の上限（20コンボ = 3倍）
      retryFactor: [1, 0.5, 0.25],  // 1回目・2回目・3回目で正解したときの報酬倍率
      hintFactor: 0.6,              // 解答前にヒントを見たときの報酬倍率
      speedSec: 25,                 // この秒数以内に正解すると速さボーナス
      speedBonus: 0.2,
      autoWindow: 8,                // 難易度自動調整に使う直近の問題数
      autoMin: 5,
      autoUp: 0.8,                  // 正答率がこれ以上なら難しく
      autoDown: 0.4,                // これ以下ならやさしく
    },
  };
})(globalThis.MF = globalThis.MF || {});
