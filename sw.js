const CACHE_NAME = 'mystock-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/common.css',
  '/assets/css/pages/landing.css'
];

// 1. تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // تخزين الملفات (إذا فشل ملف واحد، لا يتوقف الباقي)
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((err) => console.warn('فشل تخزين:', url));
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. تفعيل الـ Service Worker ومسح الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. جلب الملفات (الشبكة أولاً، وإذا انقطع الإنترنت نستخدم الكاش)
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات قاعدة البيانات (Supabase) لأنها تحتاج إنترنت دائماً
  if (event.request.url.includes('supabase') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // حفظ نسخة جديدة في الكاش إذا نجح الاتصال
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // إذا فشل الاتصال، جلب الملف من الكاش
        return caches.match(event.request);
      })
  );
});