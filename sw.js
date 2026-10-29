// Service Worker - يجعل التطبيق يعمل بدون إنترنت
const CACHE_NAME = 'mystock-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/common.css',
  '/assets/css/pages/landing.css'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// تفعيل وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استراتيجية: جرب الشبكة أولاً، وإذا فشلت ارجع للكاش
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});