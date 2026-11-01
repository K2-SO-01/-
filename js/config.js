// =====================================================================
//  調整用パラメータ（ここだけ触ればゲームの手触りが変わる）
//  単位: 長さ = 「設計px」（画面幅を 360 とした座標系）/ 時間 = 秒
// =====================================================================
export const CONFIG = {
  world: {
    width: 360,            // 論理幅。実画面幅に合わせて拡大縮小される
    maxAspect: 0.62,       // PCなど横長画面では 幅 = 高さ × この値 の縦長枠で表示
    maxDpr: 3,             // devicePixelRatio の上限（重い端末なら 2 に）
  },

  // ---- 操作感 -------------------------------------------------------
  input: {
    sensitivity: 1.3,      // 指の移動量 → 自機の移動量 の倍率（設定画面の初期値）
    sensitivityMin: 0.6,   // 設定画面スライダーの範囲
    sensitivityMax: 2.2,
    follow: 55,            // 自機の追従の速さ(1/秒)。大きいほど即追従。0 で補間なし
  },

  player: {
    radius: 12,            // 見た目の半径
    hitRadius: 6,          // 当たり判定の半径（見た目より小さく＝理不尽死を防ぐ）
    startY: 0.72,          // 開始位置（画面高さに対する比）
    topLimit: 0.2,         // これより上には行けない（画面高さ比）
    bottomMargin: 16,      // 下端からの余白
    trailCount: 7,         // 残像の数
    tiltByVelocity: 0.0015 // 横移動速度による傾き
  },

  // ---- ニアミス（快感の核） -----------------------------------------
  nearMiss: {
    nearClear: 20,         // 当たり判定とのすき間がこれ以下で NEAR
    perfectClear: 7,       // これ以下で PERFECT
    nearScore: 20,
    perfectScore: 50,
    comboWindow: 1.8,      // この秒数以内に次のニアミスでコンボ継続
    comboStep: 0.5,        // コンボ1段ごとの倍率加算
    comboMax: 5,           // 倍率上限
  },

  score: {
    perSecond: 10,         // 生存1秒あたりの得点
  },

  coins: {
    scorePerCoin: 25,      // スコア何点で 1 コイン
    perPerfect: 1,         // PERFECT 1回ごとの追加コイン
  },

  // ---- 演出 ---------------------------------------------------------
  effects: {
    hitstopNear: 0.03,     // ニアミス時の停止秒数
    hitstopPerfect: 0.07,
    hitstopDeath: 0.14,
    shakeNear: 2.5,        // 画面揺れの強さ
    shakePerfect: 6,
    shakeDeath: 12,
    shakeDecay: 10,        // 揺れの減衰速度
    slowClear: 9,          // すき間がこれ以下になった瞬間スローモーション
    slowScale: 0.3,        // スロー中の時間倍率
    slowMaxDuration: 0.35, // スローの最大継続(実時間)
    slowCooldown: 1.0,     // 次のスローまでの待ち
    slowIn: 22,            // スローへ入る速さ
    slowOut: 5,            // スローから戻る速さ
    deathDelay: 0.75,      // ミスから結果画面までの秒数
    dangerRing: 32,        // すき間がこれ以下で自機の周りに警告リング
  },

  // navigator.vibrate のパターン(ms)。iOSは非対応なので何も起きない
  vibration: {
    near: 8,
    perfect: 18,
    death: [30, 40, 70],
    best: [12, 40, 12],
    unlock: [10, 30, 10, 30, 10],
  },

  audio: {
    master: 0.9,
    sfx: 0.8,
    bgm: 0.45,
    bpm: 128,              // 合成BGMのテンポ
    dir: 'assets/audio/',
    // 素材ファイル名（このファイルが無ければ合成音で代用）
    files: {
      bgm: 'bgm.mp3',
      start: 'se_start.mp3',
      near: 'se_near.mp3',
      perfect: 'se_perfect.mp3',
      crash: 'se_crash.mp3',
      best: 'se_best.mp3',
      tap: 'se_tap.mp3',
      unlock: 'se_unlock.mp3',
    },
  },

  // ---- 難易度カーブ「急上昇＋緩和の波」 ------------------------------
  //  d(t) = surgeShare*(1-e^(-t/surgeTau)) + (1-surgeShare)*(1-e^(-t/growthTau))
  //  序盤 surgeTau 秒で一気に上がり、その後 growthTau でゆっくり上がり続ける。
  //  さらに wave.period 秒ごとに「じわじわ上昇 → reliefDuration 秒だけ緩む」を繰り返す。
  difficulty: {
    surgeTau: 5,
    surgeShare: 0.45,
    growthTau: 60,
    speedStart: 320,       // 障害物の落下速度（設計px/秒）
    speedMax: 720,
    spacingStart: 290,     // 障害物どうしの縦間隔
    spacingMin: 160,
    firstSpawnDelay: 60,   // 開始直後、最初の障害物までの距離（小さいほどすぐ来る）
    wave: {
      period: 13,          // 波1周期（秒）
      reliefDuration: 2.8, // 周期の最後に来る「緩和区間」の長さ
      peakBoost: 0.12,     // 緩和直前に向けて速度を最大 +12%
      reliefSpeedMul: 0.72,// 緩和中の速度倍率
      reliefSpacingMul: 1.7,// 緩和中の間隔倍率
      reliefGapMul: 1.25,  // 緩和中の壁の隙間倍率
    },
  },

  // ---- 障害物 -------------------------------------------------------
  obstacles: {
    // 出現の重み（unlockAt 秒を過ぎると出現解禁）
    weights: { wall: 3, blocks: 2.5, slider: 2, rotor: 1.4, zigzag: 1.2 },
    unlockAt: { wall: 0, blocks: 0, slider: 5, rotor: 9, zigzag: 16 },
    wall: {
      thickness: 16,
      gapStart: 130,       // 隙間の幅（序盤）
      gapMin: 72,          // 隙間の幅（最難）
      maxShift: 190,       // 前の壁から隙間が横にずれる最大量
    },
    slider: { ampMin: 28, ampMax: 70, freqMin: 0.45, freqMax: 1.0 },
    blocks: { sizeMin: 22, sizeMax: 38, countMin: 2, countMax: 4, stepY: 70, spinMax: 2.5, driftMax: 26 },
    rotor: { halfLen: 92, thickness: 12, spinMin: 1.3, spinMax: 2.8, offsetX: 25 },
    zigzag: { timeGap: 0.34, minGapY: 130 }, // 2枚の壁の間隔 = 速度×timeGap
  },
};
