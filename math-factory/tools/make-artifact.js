// index.html から、claude.ai の Artifact 用のページ（artifact.html）をつくる。
// Artifact は公開時に <!doctype>・<head>・<body> を自動でつけるので、中身だけを書き出す。
//   node tools/make-artifact.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>')).trim();
const scripts = body.match(/<script src="[^"]+"><\/script>/g) || [];
const markup = body.replace(/<!--[\s\S]*?-->\s*/g, '').replace(/<script src="[^"]+"><\/script>\s*/g, '').trim();
const out = [
  '<title>数学ファクトリー</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<meta name="theme-color" content="#111316">',
  '<meta name="description" content="高校数学の問題を解いて工場を動かす、自動化×カードバトル×宇宙進出の受験勉強ゲーム">',
  '<link rel="stylesheet" href="style.css">',
  '<!-- このファイルは tools/make-artifact.js が index.html から作ったもの。直接は編集しない -->',
  markup,
  '<script>window.MF_ARTIFACT = true;</script>',
  ...scripts,
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'artifact.html'), out);
const files = ['style.css'].concat(scripts.map((t) => t.match(/src="([^"]+)"/)[1]));
fs.writeFileSync(path.join(root, 'artifact-files.json'), JSON.stringify(files, null, 1) + '\n');
console.log('artifact.html を書き出しました（スクリプト ' + scripts.length + ' 本）');
