// ✅ Service Worker لدعم الإشعارات والعمل بدون إنترنت
// ✅ مسح تلقائي للكاش القديم عند كل تحديث

const CACHE_NAME = 'mystock-v202611091640'; 

self.addEventListener('install', (e) => {
  self.skipWaiting(); // إجبار المتصفح على تفعيل النسخة الجديدة فوراً
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ حذف الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
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
    const baseUrl = self.location.origin;
    
    const options = {
      body: data.body,
      icon: baseUrl + '/assets/img/icon-192.png',
      image: data.image_url || (baseUrl + '/assets/img/receipt-banner.png'), 
      badge: baseUrl + '/assets/img/badge.png',
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

// ✅ التعديل هنا: عند الضغط على الإشعار، يفتح التطبيق بذكاء دون إغلاقه
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. إذا كان التطبيق مفتوحاً بالفعل في الخلفية
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          // إرسال رسالة للتطبيق للتنقل للصفحة المطلوبة (هذا يحافظ على سجل التصفح)
          client.postMessage({
            type: 'NAVIGATE',
            url: event.notification.data.url
          });
          return client.focus();
        }
      }
      // 2. إذا كان التطبيق مغلقاً تماماً
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});