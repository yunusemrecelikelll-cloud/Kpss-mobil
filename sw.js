// Service Worker — KPSS Hazırlık PWA
// Cache adını değiştirince iOS eski cache'i temizler
const CACHE = 'kpss-v3';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './src/css/styles.css',
  './src/js/storage.js',
  './src/js/sounds.js',
  './src/js/timer.js',
  './src/js/badges.js',
  './src/js/missions.js',
  './src/js/leaderboard.js',
  './src/js/charts.js',
  './src/js/quiz.js',
  './src/js/app.js',
  './src/js/particles.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './data/turkce.json',
  './data/matematik.json',
  './data/tarih.json',
  './data/cografya.json',
  './data/vatandaslik.json',
  './data/guncel.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // hemen aktif ol, bekletme
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // açık sekmeleri hemen devral
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const isData = url.pathname.endsWith('.json');

  if (isHTML) {
    // HTML: önce ağdan dene, olmadığında cache
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  if (isData) {
    // JSON data: stale-while-revalidate — önce cache'i ver, arka planda güncelle
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // JS/CSS/resimler: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
