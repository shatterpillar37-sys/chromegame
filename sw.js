// Offline cache for the installed app. Bump CACHE when files change.
const CACHE = 'otoole-v5';
const FILES = ['./', 'index.html', 'css/game.css', 'js/assets.js', 'js/data.js', 'js/core.js', 'js/art.js', 'js/audio.js', 'js/stage.js', 'js/ui.js', 'js/intro.js', 'js/main.js',
  'img/otoole-stand.png', 'img/otoole-walk.png', 'img/otoole-no.png', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // cache-first, and keep a copy of Google Fonts so text looks right offline
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(e.request.url)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
