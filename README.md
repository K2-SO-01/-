# あんごうスライド

スマホ縦持ち専用の謎解きゲームです。暗号表を **ずらす・回す・重ねる・裏返す** と読めるようになり、答えを文字タイルで組み立てます。

- HTML / CSS / 素の JavaScript（ES Modules）。ビルド不要、依存パッケージなし
- PWA 対応（manifest・Service Worker・オフライン動作）
- 全30問＋ボーナス2問。全問 `tools/verify.js` で「答えが一意に決まる」ことを総当たりで検証済み

---

## 1. ローカルサーバーで動かす（PC・スマホ実機）

Node.js 18 以上があれば、追加インストールなしで動きます。

```bash
node tools/serve.js          # ポート 8080（npm run serve でも可）
node tools/serve.js 3000     # ポートを指定する場合
```

起動すると次のように表示されます。

```
  PC:     http://localhost:8080/
  スマホ: http://192.168.1.23:8080/
```

### スマホ実機で確認する手順

1. PC とスマホを **同じ Wi-Fi** につなぐ
2. スマホのブラウザ（iOS Safari / Android Chrome）で「スマホ:」の URL を開く
3. つながらないときは、PC のファイアウォールでポート 8080 の受信を許可する

Node が無い場合は `python3 -m http.server 8080 --bind 0.0.0.0` でも動きます（その場合 IP アドレスは自分で調べてください）。

### PWA（ホーム画面に追加・オフライン）まで確認したいとき

Service Worker は **HTTPS か localhost** でしか動きません。`http://192.168.x.x` ではゲーム自体は遊べますが、オフライン化とインストールは無効です。次のどれかを使ってください。

| 方法 | 手順 |
| --- | --- |
| Android（いちばん手軽） | USB でつなぎ、PC の Chrome で `chrome://inspect` → Port forwarding で `8080 → localhost:8080` を設定。スマホで `http://localhost:8080/` を開く（localhost 扱いなので SW が動く） |
| HTTPS トンネル | `npx localtunnel --port 8080` や `cloudflared tunnel --url http://localhost:8080` で発行された https の URL をスマホで開く |
| iOS | 上記トンネルの URL を Safari で開き、共有 → 「ホーム画面に追加」 |

デバッグには、iOS は Mac の Safari「開発」メニュー → Web インスペクタ、Android は `chrome://inspect` が使えます。

### 段階ごとの確認ポイント

| 段階 | 実機で見るところ |
| --- | --- |
| 1. 帯＋タイル＋判定 | No.01 で下段を指でずらす → 1マスごとにカチッ（音＋Androidは振動）。タイルをタップ／ドラッグで欄へ、欄のタイルはタップで外れる。埋まった瞬間に判定、不正解は欄がプルッと揺れる |
| 2. 全ギミック | No.03 円盤（どこを触っても回る）、No.05 カード（ドラッグ＋↻）、No.08 フィルム（横スワイプ／タップで裏返る）、No.09 裏返し（⇋）、No.13 縦の帯 |
| 3. マップ・★・コンボ・ヒント・解説 | クリア時のタメ→タイルが弾ける→★がポンポン入る。ヒントは押す前に「★−1」を表示。ノーヒント・ノーミスでコンボ、段階的に派手に |
| 4. 30問＋検証 | `node tools/verify.js` が「エラー 0」 |
| 5. 設定・PWA | 設定でサウンド／振動／演出（通常・控えめ）。HTTPS で開き、機内モードにしても再起動できる |

---

## 2. ファイル構成

```
index.html              画面の土台（viewport・セーフエリア・PWA メタ）
manifest.webmanifest    PWA マニフェスト（縦画面固定）
sw.js                   Service Worker（事前キャッシュ・オフライン）
css/style.css           見た目すべて（配色トークンは :root に集約）
js/
  app.js                起動・画面遷移（タイトル／マップ／設定）、ズーム等の抑止
  play.js               問題画面：ギミック表示・タイル・判定・ヒント・クリア演出・★計算
  explain.js            解説画面：正しい状態のギミック図＋解読の流れ
  engine.js             ★暗号表のロジック（ブラウザと Node で共通）。状態→対応・総当たり
  config.js             ★調整用パラメータ
  gimmicks/
    index.js            ギミックの登録表
    slide.js            スライド式の帯（横／縦）
    dial.js             2重の回転円盤
    stencil.js          穴あきカード（ドラッグ・回転・裏返し）
    mirror.js           鏡文字フィルム（スワイプで裏返す）
  tiles.js              文字タイルと解答欄
  drag.js               Pointer Events のドラッグ補助・吸着（magnet）
  audio.js              Web Audio による効果音合成・iOS の音声ロック解除
  haptics.js            振動（非対応端末では何もしない）
  fx.js                 パーティクル・フラッシュ
  storage.js            localStorage への進行・設定保存
data/puzzles.json       問題データ（30問＋ボーナス）
tools/
  verify.js             全問の一意性検証
  encode.js             問題づくり補助（答え→暗号文の計算）
  serve.js              実機確認用のローカルサーバー
icons/                  アプリアイコン
```

---

## 3. 問題の追加方法

`data/puzzles.json` の `puzzles` 配列に1問足すだけで、マップに自動で並びます（並び順＝解放順）。追加したら必ず検証してください。

```bash
node tools/verify.js        # 全問
node tools/verify.js 31     # 追加した問題だけ
node tools/verify.js 31 --verbose   # 解読の途中経過も表示
```

### 1問の形

```jsonc
{
  "id": "31",                 // 一意な ID（ボーナスは "B3" のように）
  "bonus": false,             // true ならボーナス問題
  "requiredStars": 0,         // ボーナスの解放に必要な★
  "title": "ずらしの基本",
  "targetTime": 60,           // 目標タイム（秒）。★判定に使う
  "gimmicks": [ ... ],        // 使うギミック（下記）。画面下のタブはこの順
  "question": "上段の『あ』の真下に『か』…",   // 『』で囲むと強調表示
  "answer": "さくら",
  "tiles": ["さ","く","ら","か","う","め"],     // 答えの文字＋ダミー（12枚まで推奨）
  "hints": ["方向性", "ギミックの使い方", "ほぼ答え"],
  "explanation": "なぜその答えになるか",
  "steps": [ ... ],           // 解読手順（検証と解説図に使う）
  "constraints": [ ... ],     // 問題文が与える条件（検証に使う）
  "solution": { "s": 5 }      // 正しい状態（解説図に使う。verify が一致を確認）
}
```

### ギミック（`gimmicks`）

| type | 主なパラメータ | 状態（solution の値） |
| --- | --- | --- |
| `slide` | `a`（上段／左列）, `b`（下段／右列）, `axis`: `"x"` 横 / `"y"` 縦, `suffix`（「行」「段」など文字の後ろの小さな添え字）, `initial` | 整数 k：`a[i]` と `b[i+k]` が向かい合う |
| `dial` | `outer`（外円・固定）, `inner`（内円・回る）, `initial` | 整数 r：`outer[i]` と `inner[i+r]` が向かい合う |
| `stencil` | `grid`（表。1文字＝1マス、`●` 目印、`・` 空き）, `card`（正方形。`.` 不透明 / `o` 穴 / `1`〜`9` 番号つき穴 / `m` ◇の目印穴）, `allowRotate`, `allowFlip`, `initial` | `{x, y, rot, flip}`（rot は時計回り90°単位、反転→回転の順に適用） |
| `mirror` | `text`（行の配列。鏡文字で表示され、裏返すと読める） | 0 / 1 |

`a` / `b` / `outer` / `inner` には文字セット名か、配列（複数文字のトークン可）か、文字列を指定できます。

| 文字セット | 中身 |
| --- | --- |
| `KANA46` | あ〜ん（清音46字） |
| `IROHA46` | いろは順（ゐゑを除き、最後に ん） |
| `ALPHA` / `DIGIT10` | A〜Z / 0〜9 |
| `CONS10` / `VOW5` | 五十音の行（あかさたな…わ）/ 段（あいうえお） |
| `ETO12` / `CLOCK12` / `WEEK7` | 十二支 / 時計の数字（12,1,2…）/ 曜日（にち,げつ…） |

穴あきカードは「穴から見える文字」を **上の段から順（同じ段なら左から）** に読みます。番号つき穴があるときは番号順です。◇の穴は必ず `●` の上、普通の穴は文字の上にあるときだけ「成立する置き方」になります。

### 解読手順（`steps`）

前のステップの出力は `"$名前"`、その1番目だけなら `"$名前:0"` で参照します。最後に `answer` を出力します。

| type | 意味 |
| --- | --- |
| `const` | 問題文やフィルムに書いてある文字列（`value`） |
| `stencil` | カード `g` の穴から読む |
| `map` | 帯／円盤 `g` で読み替え。`from: "a"` なら上段・外円で探して反対側を読む、`"b"` なら逆 |
| `map2d` | かなを「行」と「段」に分け、`cons`（行の帯）と `vow`（段の帯）で別々に読み替え |
| `reverse` / `pick` / `concat` / `chars` | 逆順 / 一部を取り出す（`start`,`end`）/ つなぐ / トークンを1文字ずつに分解 |

### 条件（`constraints`）

| type | 意味 | 例 |
| --- | --- | --- |
| `crib` | ギミック `g` で `text` と `expect` が向かい合う | `{"type":"crib","g":"s","from":"a","text":"あ","expect":"か"}` |
| `offset` | ずらし量そのもの（数値か `"$N"`） | `{"type":"offset","g":"s","value":"$N"}` |
| `prop` | 途中の文字列の性質：`startsWith` / `endsWith` / `includes` / `equals` / `count`（`char`,`n`）/ `length` | `{"type":"prop","var":"answer","test":"endsWith","value":"ん"}` |

`crib` の文字は問題文かフィルムに実際に書かれている必要があります（検証でチェック）。「今日は日曜、あさって」のように言い換えて出す場合は `"indirect": "説明"` を付けます。

### 暗号文の作り方

答えと鍵から暗号文を計算する補助ツールがあります。

```bash
node tools/encode.js slide --a KANA46 --b KANA46 --crib あ=か --plain さくら
node tools/encode.js dial --a ETO12 --b CLOCK12 --crib うま=12 --plain うし,とら --from b
node tools/encode.js 2d --cons あ=た --vow あ=え --plain もみのき
```

穴あきカードの表は、手で作ったら `verify.js` が「成立する置き方が1つだけか」を確かめてくれます（◇が全部●に乗る位置が複数あれば別解としてエラー）。

### 検証の中身（`tools/verify.js`）

1. 形式チェック（必須項目、ヒント3段階、リングの文字の重複、カードが正方形 など）
2. 解答に関わるギミックの **全状態を総当たり**し、条件を満たす状態から得られる答えがちょうど1種類で `answer` と一致するか（＝矛盾・別解なし）
3. `solution` の状態で解読すると答えになり、条件も満たすか
4. 暗号文と鍵の文字が問題文・フィルムに実際に書かれているか、問題文に答えがそのまま出ていないか
5. タイルに答えの文字がそろっているか

現在の結果：**32問すべて OK（エラー 0・警告 0）**。最終問題は 357,696 通りの組み合わせを総当たりして、条件を満たすのは1通りだけです。

---

## 4. 調整用パラメータの場所

| 調整したいこと | 場所 |
| --- | --- |
| スナップの吸い付き具合・音の間隔・戻りアニメ時間 | `js/config.js` → `snap` |
| 帯のマスの大きさ、円盤の最大サイズ、カードの吸着範囲 | `js/config.js` → `slide` / `dial` / `stencil` |
| ★の基準（目標タイム比 1.0 / 1.6 / 2.5 倍、ヒント減点） | `js/config.js` → `stars` |
| コンボ演出（パーティクル量・色数・音程の上がり方） | `js/config.js` → `combo` |
| 正解演出のタメ・★が入る間隔 | `js/config.js` → `clearFx` |
| 振動パターン | `js/config.js` → `haptics` |
| 音量 | `js/config.js` → `audio.master`。音色そのものは `js/audio.js` の `sfx` |
| 配色・フォント・角丸 | `css/style.css` 冒頭の `:root` |
| 問題ごとの目標タイム・ボーナスの必要★ | `data/puzzles.json` の `targetTime` / `requiredStars` |
| マップの章の区切り | `js/app.js` → `CHAPTERS` |

★は「目標タイム以内で★3、1.6倍以内で★2、それ以上は★1」から、ヒント1回ごとに★−1（最低★0）。ヒントもミスもなしでクリアするとコンボがつながり、クリア演出の色数・パーティクル・ファンファーレの音程が5段階まで上がります。

## 5. 更新を配信するとき

`sw.js` の `VERSION` を上げてください。古いキャッシュが消えて新しいファイルが入ります（問題データ `puzzles.json` だけはネット優先なので、オンラインならすぐ反映されます）。新しいファイルを追加したら `sw.js` の `ASSETS` にも足します。

## 6. 端末ごとの注意

- iOS Safari は `navigator.vibrate` 非対応のため振動しません（エラーにはならず、設定画面にもそう表示）
- iOS は最初のタップまで音が出ない仕様のため、最初の操作で AudioContext を解放しています
- ブラウザでは画面の向きを固定できないので、横向きにすると「縦向きで遊んでね」を表示します（ホーム画面に追加した PWA は manifest で縦固定）
- 進行データは端末の localStorage に保存されます。プライベートブラウズでは保存されないことがあります
