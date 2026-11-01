// Service Worker：アプリ一式を事前キャッシュしてオフラインで動かす
// ファイルを更新したら VERSION を上げること（古いキャッシュが消えて新しい版が入る）
const VERSION = 'v1.0.0';
const CACHE = `angou-slide-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/engine.js',
  './js/storage.js',
  './js/audio.js',
  './js/haptics.js',
  './js/drag.js',
  './js/fx.js',
  './js/tiles.js',
  './js/play.js',
  './js/explain.js',
  './js/gimmicks/index.js',
  './js/gimmicks/slide.js',
  './js/gimmicks/dial.js',
  './js/gimmicks/stencil.js',
  './js/gimmicks/mirror.js',
  './data/puzzles.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('angou-slide-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 問題データはネット優先（更新をすぐ反映）、それ以外はキャッシュ優先
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('/data/puzzles.json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })),
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html'))),
  );
});
