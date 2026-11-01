# GIRIGIRI — ギリギリ回避

スマホを縦に持って片手で遊ぶハイパーカジュアルゲームです。
画面のどこでもドラッグすれば自機が動きます。上から降ってくる壁・ブロック・回転バーの隙間を、**ギリギリ**ですり抜けてください。

- HTML5 Canvas と素のJavaScript（ES Modules）で作っています。ビルド不要、フレームワークもありません
- PWA に対応しています（manifest・Service Worker・オフライン動作・ホーム画面に追加）
- データは localStorage に保存します（ハイスコア・コイン・スキン・設定）

---

## すぐ遊ぶ

```bash
# リポジトリのルートで実行（Python 3 / Node のどちらでも OK）
python3 -m http.server 8080 --bind 0.0.0.0
# または
npx serve -l 8080 .
```

PC のブラウザで `http://localhost:8080/` を開きます。マウスでドラッグして操作し、Space / Enter でスタートまたはリトライできます。

> `index.html` をダブルクリックして `file://` で開いても動きません（ES Modules の制約）。必ずローカルサーバー経由で開いてください。

---

## スマホ実機での確認方法

### A. 同じ Wi-Fi から開く（いちばん手軽。各段階の確認はこれで足ります）

1. PC とスマホを同じ Wi-Fi につなぎます
2. PC の IP アドレスを調べます
   - macOS: `ipconfig getifaddr en0`
   - Windows: `ipconfig` を実行し「IPv4 アドレス」を見る
   - Linux: `hostname -I`
3. PC でサーバーを起動します: `python3 -m http.server 8080 --bind 0.0.0.0`
4. スマホのブラウザで `http://<PCのIP>:8080/` を開きます（例: `http://192.168.1.23:8080/`）

> つながらないときは、PC のファイアウォールでポート 8080 を許可してください。

ゲームそのもの（操作・演出・音・振動・保存）は、この http 接続ですべて確認できます。ただし Service Worker（オフライン動作・PWA インストール）は **HTTPS または localhost** でしか動かないので、http では自動で無効になります。PWA まで確かめるときは B か C を使ってください。

### B. Android：USB でつないで localhost 扱いにする（PWA も確認できます）

1. スマホで開発者オプションと USB デバッグを有効にし、PC と USB でつなぎます
2. PC の Chrome で `chrome://inspect/#devices` を開きます
3. 「Port forwarding…」で `8080` → `localhost:8080` を追加し、Enable にチェックを入れます
4. スマホの Chrome で `http://localhost:8080/` を開きます。localhost なので Service Worker が動きます
5. `chrome://inspect` の「inspect」から、実機のコンソールや FPS を PC で見られます

### C. iOS / Android：HTTPS トンネルを使う（PWA も確認できます）

```bash
# 例1: Cloudflare Tunnel（アカウント不要のクイックトンネル）
cloudflared tunnel --url http://localhost:8080
# 例2: ngrok
ngrok http 8080
```

表示された `https://…` の URL をスマホで開きます。iOS の場合は Safari の共有メニュー →「ホーム画面に追加」で、全画面のアプリとして起動できます。

iOS の実機デバッグは、iPhone の「設定 > Safari > 詳細 > Web インスペクタ」を ON にして Mac と USB でつなぎ、Mac の Safari の「開発」メニューから行います。

### デバッグ用 URL オプション

| URL | 内容 |
|---|---|
| `?debug` | FPS・devicePixelRatio・経過時間・難易度 d・速度・緩和度を画面下に表示します。自機の**当たり判定円**も表示します |
| `?debug&god` | 無敵モードです。難易度カーブや障害物パターンを最後まで眺めたいときに使います |
| `?nosw` | Service Worker とキャッシュを解除します（開発中に古いファイルが出るとき用） |

---

## 段階ごとの確認ポイント

依頼いただいた 3 段階の順に作り、すべて実装済みです。どの段階も、上の **A** の方法で実機確認できます。

### 1. 操作とコア（自機・障害物）

- `http://<IP>:8080/?debug` を開き、タイトル画面の好きな場所に指を置いてそのままドラッグします
- 確認すること
  - 画面のどこを触っても、指の**移動量**だけ自機が動くこと（相対ドラッグなので、指で自機が隠れない）
  - 遅れを感じないこと。気になる場合は `input.follow` を上げます（`0` にすると補間なし）
  - 白い円で表示される当たり判定が、見た目より小さいこと
  - FPS 表示が 60 前後で安定していること
  - スクロール・ピンチズーム・長押しメニュー・ダブルタップズームが起きないこと
- 関係するファイル: `js/input.js`, `js/obstacles.js`, `js/game.js`

### 2. 演出・スコア・難易度カーブ

- 確認すること
  - 障害物の縁すれすれを抜けると「NEAR / PERFECT」が出て、画面揺れ・ヒットストップ・振動が起きること。振動は Android のみです
  - 極端に近づいた瞬間だけスローになること（画面の縁がうっすら白くなります）
  - コンボが続くと倍率が上がること（`x1.5`, `x2.0` …）
  - `?debug&god` で 13 秒ごとに `relief` が 1 に近づき、速度が一瞬落ちること（緩和の波）
- 関係するファイル: `js/difficulty.js`, `js/effects.js`, `js/game.js`, `js/audio.js`

### 3. 画面遷移・スキン・設定・PWA

- 確認すること
  - タイトル → プレイ → 結果 → スキン選択と画面が移り変わること
  - RETRY を押した指でそのまま操作を続けられること（ワンタップで即リトライ）
  - ハイスコアを更新したとき、プレイ中は「NEW BEST」バナー、結果画面ではバッジと紙吹雪が出ること
  - コインでスキンを解放できること。結果画面に「次のスキンまであと N COIN」が出ること
  - 設定（視覚効果・サウンド・振動・感度）を変えて、再読み込みしても残っていること
  - B か C の方法で開き、ホーム画面に追加したあと機内モードでも起動できること
- 関係するファイル: `index.html`, `css/style.css`, `js/ui.js`, `js/main.js`, `js/storage.js`, `manifest.webmanifest`, `sw.js`

---

## ファイル構成

```
.
├── index.html             画面の骨組み（canvas と、タイトル・結果・スキン・設定・一時停止の各画面）
├── manifest.webmanifest   PWA の定義（縦向き固定・全画面・アイコン）
├── sw.js                  Service Worker（プリキャッシュ・オフライン・音声のキャッシュ）
├── css/style.css          UI のスタイル、セーフエリア対応、タッチ操作の抑止
├── js/
│   ├── config.js          ★ 調整用パラメータをまとめたファイル
│   ├── main.js            エントリポイント（結線・画面遷移・メインループ・SW 登録）
│   ├── game.js            ゲーム本体（更新・当たり判定・ニアミス・スロー・ヒットストップ・描画）
│   ├── difficulty.js      難易度カーブ（急上昇＋緩和の波）
│   ├── obstacles.js       障害物（壁・動く壁・ブロック・回転バー・ジグザグ）とパターン生成
│   ├── effects.js         パーティクル・波紋・浮遊テキスト・画面揺れ・フラッシュ・紙吹雪
│   ├── input.js           相対ドラッグ入力（Pointer Events）とジェスチャ抑止
│   ├── audio.js           効果音と BGM（素材ファイル優先、無いときは Web Audio で合成、iOS の制限解除）
│   ├── haptics.js         振動（navigator.vibrate が無い端末では何もしない）
│   ├── skins.js           自機スキンの形と解放コスト
│   ├── storage.js         localStorage への保存と読み込み
│   └── ui.js              DOM の画面表示（結果・スキン・設定）
├── icons/                 PWA 用アイコン（192 / 512 / maskable / apple-touch-icon）
└── assets/audio/          音声素材を置く場所（下記）
```

---

## 調整用パラメータの場所

**ほぼすべて `js/config.js` の `CONFIG` オブジェクトにまとめています。** 長さの単位は「画面幅を 360 とした設計 px」、時間の単位は秒です。

| 調整したいこと | 場所 |
|---|---|
| 操作の感度（初期値・スライダーの範囲） | `CONFIG.input.sensitivity` / `sensitivityMin` / `sensitivityMax` |
| 追従の速さ・補間の強さ | `CONFIG.input.follow`（大きいほど即追従、`0` で補間なし） |
| 自機の見た目の大きさと当たり判定 | `CONFIG.player.radius` / `hitRadius` |
| 自機が動ける範囲・開始位置 | `CONFIG.player.topLimit` / `bottomMargin` / `startY` |
| ニアミスの距離・得点・コンボ | `CONFIG.nearMiss.*` |
| 生存 1 秒あたりの得点 | `CONFIG.score.perSecond` |
| コインの獲得レート | `CONFIG.coins.*` |
| ヒットストップ・画面揺れ・スロー・警告リング | `CONFIG.effects.*` |
| 振動パターン | `CONFIG.vibration.*` |
| 音量・BPM・音声ファイル名 | `CONFIG.audio.*` |
| **難易度カーブ**（速度・間隔・序盤の急上昇・長期の上昇） | `CONFIG.difficulty.*` |
| **緩和の波**（周期・長さ・強さ） | `CONFIG.difficulty.wave.*` |
| 障害物の出現の重み・解禁される時間 | `CONFIG.obstacles.weights` / `unlockAt` |
| 壁の隙間の幅・厚み・横ずれ | `CONFIG.obstacles.wall.*` |
| 動く壁・ブロック・回転バー・ジグザグの細かい値 | `CONFIG.obstacles.slider` / `blocks` / `rotor` / `zigzag` |
| スキンの種類と解放コスト | `js/skins.js` の `SKINS` |

### 難易度カーブのしくみ

```
d(t) = surgeShare × (1 − e^(−t/surgeTau)) + (1 − surgeShare) × (1 − e^(−t/growthTau))
速度 = lerp(speedStart, speedMax, d) × 波の倍率
```

- **序盤の急上昇**: 最初の 5 秒ほどで、難易度の 45% ぶんまで一気に上がります（`surgeTau`, `surgeShare`）
- **長期の上昇**: 残りは `growthTau` 秒かけてゆっくり上がり続けます
- **緩和の波**: `wave.period`（13 秒）ごとに速度がじわじわ最大 +12% まで上がり、最後の `reliefDuration`（2.8 秒）だけ速度・間隔・隙間がゆるみます。緩和中は簡単なパターンだけが出ます

`?debug&god` で開くと、`d`・`v`（速度）・`relief` がリアルタイムに表示されるので、それを見ながら調整できます。

---

## サウンド素材（`/assets/audio/`）

次の名前で `assets/audio/` に置くと、自動で読み込んで使います。**ファイルが無い音は Web Audio API の合成音で代用します。** 一部だけ置いても動きますし、何も置かなくてもエラーにはなりません。

| ファイル名 | 用途 | 目安 |
|---|---|---|
| `bgm.mp3` | プレイ中の BGM（ループ再生） | 30〜90 秒、ループの継ぎ目が切れないもの |
| `se_start.mp3` | ゲーム開始 | 〜0.3 秒 |
| `se_near.mp3` | ニアミス（NEAR） | 〜0.15 秒、軽い音 |
| `se_perfect.mp3` | ニアミス（PERFECT） | 〜0.3 秒、気持ちいい音 |
| `se_crash.mp3` | ミス（破砕） | 〜0.6 秒 |
| `se_best.mp3` | ハイスコア更新 | 〜1 秒 |
| `se_tap.mp3` | UI ボタン | 〜0.05 秒 |
| `se_unlock.mp3` | スキン解放 | 〜0.6 秒 |

- ファイル名と保存場所は `CONFIG.audio.files` / `CONFIG.audio.dir` で変えられます。mp3 なら iOS と Android の両方で再生できます
- 素材が無い間は、ブラウザのコンソールにその音声ファイルの 404 が表示されます。読み込みに失敗しただけなので、動作には影響しません
- **iOS の再生制限への対応**: 最初のタップの中で AudioContext を作って resume し、無音を 1 回鳴らして再生を許可させています
- iOS は**消音スイッチが ON だと Web Audio が鳴りません**（OS の仕様です）
- 素材を差し替えたら `sw.js` の `VERSION` を上げるか、`?nosw` で開き直してください（音声はキャッシュ優先で配信しているため）

---

## 実装メモ

- **入力**: Pointer Events を使っています。`touch-action: none` に加えて、touchmove・gesturestart・contextmenu・dblclick を抑止しています。2 本目の指が触れたら、その指に操作を引き継ぎます（相対ドラッグなので自機は飛びません）
- **遅延対策**: canvas を `desynchronized: true` で作っています。入力はスローやヒットストップの影響を受けず、常に実時間で追従します
- **delta time**: `requestAnimationFrame` の経過時間で更新します（1 フレームの上限は 1/20 秒）。高速時のすり抜けを防ぐため、移動量に応じてサブステップに分けて当たり判定をしています
- **高精細描画**: devicePixelRatio に対応しています（上限は `CONFIG.world.maxDpr`）。論理座標は幅 360 に固定しているので、どの端末でも同じ難易度になります
- **セーフエリア**: `viewport-fit=cover` と `env(safe-area-inset-*)` を使っています。canvas の HUD の位置も、プローブ用の要素からセーフエリアの値を読んで合わせています
- **縦画面固定**: manifest で `orientation: portrait` を指定し、`screen.orientation.lock` も試します（非対応なら何もしません）。タッチ端末を横向きにすると、案内を表示して一時停止します。PC では縦長の枠で表示します
- **一時停止**: アプリが裏に回ると自動で一時停止します。再開は画面を押してそのままドラッグします
- **視覚効果 OFF**: 画面揺れ・スロー・フラッシュを止め、残光を弱めます。OS で「視差効果を減らす」を設定している場合は、初回から OFF になります
- **Service Worker の更新**: ファイルを変えたら `sw.js` の `VERSION` を上げてください
