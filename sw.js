// Service Worker — KPSS Hazırlık PWA
const CACHE = 'kpss-v1';

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
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Sadece GET istekleri
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
