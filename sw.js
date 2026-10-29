// Service Worker
const CACHE_NAME = 'mystock-v3'; 

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// معالج fetch (شرط أساسي لكي يقبل المتصفح تثبيت التطبيق)
self.addEventListener('fetch', (event) => {
  // تمرير الطلبات للشبكة مباشرة (بدون تعقيدات الكاش لتجنب أي أخطاء)
  event.respondWith(fetch(event.request));
});