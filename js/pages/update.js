// ============================================
// صفحة تحديث التطبيق (Update App)
// ✅ مسح الكاش وتحديث Service Worker
// ✅ إعادة تحميل قوية لتجاوز الكاش
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('update.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('update_title') || 'Update App';

  const main = document.getElementById('main-content');

  // ✅ محاولة قراءة إصدار التطبيق الحالي من ملف version.json
  let currentAppVersion = localStorage.getItem('app_version') || '1.0.0';
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      currentAppVersion = data.version || currentAppVersion;
      // تحديث الذاكرة المحلية بالإصدار الجديد
      localStorage.setItem('app_version', currentAppVersion);
    }
  } catch (e) {
    console.warn('ملف version.json غير موجود، سيتم استخدام الإصدار الافتراضي.');
  }

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('update_title')}</h2>
      <a href="/settings.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="update-wrapper">
      <!-- الحاوية ثابتة، والسهم هو الذي يتحرك -->
      <div class="update-icon-container" id="update-icon">
        <i class="fas fa-arrow-down"></i>
      </div>

      <h1 class="update-title">${tr('update_page_title')}</h1>
      
      <p class="update-desc">
        ${tr('update_page_desc')}
      </p>

      <div class="update-version">
        <span>${tr('update_current_version')}</span>
        <span id="app-version">v${currentAppVersion}</span>
      </div>

      <button class="btn-primary update-btn" id="update-btn">
        <i class="fas fa-sync-alt"></i>
        <span>${tr('update_now')}</span>
      </button>

      <div class="update-status" id="update-status"></div>
    </div>
  `;

  const updateBtn = document.getElementById('update-btn');
  const updateIcon = document.getElementById('update-icon');
  const statusMsg = document.getElementById('update-status');
  const versionEl = document.getElementById('app-version');

  updateBtn.addEventListener('click', async () => {
    updateBtn.disabled = true;
    updateBtn.querySelector('span').textContent = tr('update_checking');
    
    // ✅ إضافة كلاس الحركة للسهم
    updateIcon.classList.add('spinning');
    statusMsg.textContent = '';
    
    try {
      // 1. مسح الكاش (Cache Storage) إذا كان المتصفح يدعم ذلك
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ تم مسح الكاش بنجاح');
      }

      // 2. تحديث Service Worker إذا كان التطبيق يستخدمه (PWA)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.update();
        }
        console.log('✅ تم تحديث Service Worker');
      }

      // 3. إظهار رسالة النجاح
      statusMsg.textContent = tr('update_success');
      statusMsg.className = 'update-status status-success';
      
      // حفظ الإصدار الجديد في الذاكرة
      localStorage.setItem('app_version', currentAppVersion);

      // 4. إعادة تحميل الصفحة بقوة (تجاوز الكاش تماماً) بعد ثانية ونصف
      setTimeout(() => {
        // هذه الطريقة تضمن إعادة التحميل مع تجاهل الكاش في جميع المتصفحات
        const baseUrl = window.location.href.split('?')[0];
        window.location.replace(baseUrl + '?updated=' + new Date().getTime());
      }, 1500);

    } catch (error) {
      console.error('Update Error:', error);
      statusMsg.textContent = tr('update_error');
      statusMsg.className = 'update-status status-error';
      
      // إعادة الزر والأيقونة لحالتها الطبيعية
      updateBtn.disabled = false;
      updateBtn.querySelector('span').textContent = tr('update_now');
      updateIcon.classList.remove('spinning');
    }
  });
});