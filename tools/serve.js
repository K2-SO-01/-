#!/usr/bin/env node
// =====================================================================
// tools/serve.js — スマホ実機確認用のローカルサーバー（依存パッケージなし）
//   node tools/serve.js            # ポート 8080
//   node tools/serve.js 3000       # ポート指定
// 同じ Wi-Fi のスマホで、表示された http://192.168.x.x:8080 を開く
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-cache', // 開発中は常に最新を取得
      });
      res.end(buf);
    });
    console.log(new Date().toLocaleTimeString(), req.method, p);
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`\n  あんごうスライド 開発サーバー\n`);
    console.log(`  PC:     http://localhost:${PORT}/`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  スマホ: http://${a.address}:${PORT}/`);
    }
    console.log('\n  ※ スマホは PC と同じ Wi-Fi に接続してください。終了は Ctrl+C\n');
  });
