// ✅ Service Worker لدعم الإشعارات والعمل بدون إنترنت
// ✅ مسح تلقائي للكاش القديم عند كل تحديث

const CACHE_NAME = 'mystock-v202611071606';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // إجبار المتصفح على تفعيل النسخة الجديدة فوراً
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // مسح أي كاش قديم لا يطابق النسخة الحالية
          if (key !== CACHE_NAME) {
            console.log('🗑️ حذف الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة فوراً
  );
});

self.addEventListener('fetch', (e) => {
  // استراتيجية: جلب من الشبكة أولاً، وإذا فشل (لا يوجد إنترنت) نستخدم الكاش
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});

// ✅ استقبال الإشعارات من الخادم
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/img/icon-192.png',
      badge: '/assets/img/icon-192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// ✅ عند الضغط على الإشعار، يفتح التطبيق في الرابط المحدد
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});