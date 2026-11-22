const CACHE = 'mps5-v1';
const FILES = ['./', 'index.html', 'manifest.json',
  'css/style.css', 'css/loading.css', 'css/home.css', 'css/controller.css',
  'js/app.js', 'js/device-analysis.js', 'js/user.js', 'js/library.js',
  'js/controller.js', 'js/settings.js', 'js/streaming.js', 'js/loading.js',
  'assets/icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Rede primeiro (atualizações chegam rápido); cache como reserva offline.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || u.searchParams.has('_')) return; // '_' = teste de latência
  e.respondWith(
    fetch(r).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(r, copy));
      return res;
    }).catch(() => caches.match(r).then(c => c || (r.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
