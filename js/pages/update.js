// ============================================
// صفحة تحديث التطبيق (تحديث حقيقي 100%)
// ✅ تحميل الملفات الفعلية وتتبع البايتات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('update.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('update_title') || 'Update App';

  const main = document.getElementById('main-content');

  let currentAppVersion = localStorage.getItem('app_version') || '1.0.0';
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      currentAppVersion = data.version || currentAppVersion;
      localStorage.setItem('app_version', currentAppVersion);
    }
  } catch (e) {}

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('update_title')}</h2>
      <a href="/settings.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="update-wrapper">
      <div class="update-icon-container" id="update-icon">
        <i class="fas fa-arrow-down"></i>
      </div>

      <h1 class="update-title" id="update-title">${tr('update_page_title')}</h1>
      <p class="update-desc" id="update-desc">${tr('update_page_desc')}</p>

      <div class="update-version" id="version-box">
        <span>${tr('update_current_version')}</span>
        <span id="app-version">v${currentAppVersion}</span>
      </div>

      <!-- شريط التقدم -->
      <div class="progress-container" id="progress-container">
        <div class="progress-header">
          <span id="progress-text">${tr('update_downloading') || 'جارٍ التحميل...'}</span>
          <span class="progress-percent" id="progress-percent">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="progress-fill"></div>
        </div>
        <div class="progress-size" id="progress-size">0.00 MB / 0.00 MB</div>
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
  const progressContainer = document.getElementById('progress-container');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const progressSize = document.getElementById('progress-size');
  const progressText = document.getElementById('progress-text');
  const updateTitle = document.getElementById('update-title');
  const updateDesc = document.getElementById('update-desc');
  const versionBox = document.getElementById('version-box');

  // قائمة الملفات الحقيقية التي سيتم تحميلها للتحديث
  const filesToUpdate = [
    '/version.json',
    '/assets/css/common.css',
    '/assets/css/pages/update.css',
    '/assets/css/pages/settings.css',
    '/js/core/i18n.js',
    '/js/core/auth.js',
    '/js/components/layout.js',
    '/js/pages/update.js',
    '/js/pages/settings.js'
  ];

  updateBtn.addEventListener('click', async () => {
    updateBtn.style.display = 'none';
    updateTitle.textContent = tr('update_installing') || 'جارٍ تثبيت التحديث...';
    updateDesc.style.display = 'none';
    versionBox.style.display = 'none';
    progressContainer.style.display = 'block';
    updateIcon.classList.add('spinning');

    let totalBytes = 0;
    let loadedBytes = 0;

    try {
      // 1. حساب الحجم الإجمالي للملفات (طلب HEAD)
      progressText.textContent = tr('update_checking_size') || 'جارٍ حساب الحجم...';
      
      for (const file of filesToUpdate) {
        const res = await fetch(file + '?t=' + Date.now(), { method: 'HEAD' });
        const size = parseInt(res.headers.get('content-length') || '0', 10);
        totalBytes += size;
      }

      // في حال لم يرجع السيرفر حجم الملفات (بسبب الضغط Gzip)، نضع حجم افتراضي صغير لكي لا ينقسم على صفر
      if (totalBytes === 0) totalBytes = 2 * 1024 * 1024; // 2MB

      progressText.textContent = tr('update_downloading') || 'جارٍ التحميل...';

      // 2. تحميل الملفات فعلياً وحساب البايتات
      for (const file of filesToUpdate) {
        const res = await fetch(file + '?t=' + Date.now());
        const reader = res.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          loadedBytes += value.length;

          // تحديث الواجهة
          const percent = Math.min(100, Math.floor((loadedBytes / totalBytes) * 100));
          progressFill.style.width = `${percent}%`;
          progressPercent.textContent = `${percent}%`;
          progressSize.textContent = `${(loadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
        }
      }

      // 3. مسح الكاش بعد اكتمال التحميل
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 4. إظهار النجاح وإعادة التشغيل
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      progressSize.textContent = `${(totalBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
      
      updateTitle.textContent = tr('update_success') || '✅ تم التحديث بنجاح!';
      statusMsg.textContent = tr('update_restarting') || 'جارٍ إعادة التشغيل...';
      statusMsg.className = 'update-status status-success';
      updateIcon.classList.remove('spinning');

      setTimeout(() => {
        const baseUrl = window.location.href.split('?')[0];
        window.location.replace(baseUrl + '?updated=' + new Date().getTime());
      }, 1500);

    } catch (error) {
      console.error('Update Error:', error);
      statusMsg.textContent = tr('update_error') || '❌ حدث خطأ أثناء التحميل.';
      statusMsg.className = 'update-status status-error';
      updateIcon.classList.remove('spinning');
      
      // في حالة الخطأ، نعيد زر التحديث لكي يحاول المستخدم مرة أخرى
      setTimeout(() => {
        updateBtn.style.display = 'flex';
        progressContainer.style.display = 'none';
        updateDesc.style.display = 'block';
        versionBox.style.display = 'flex';
        updateTitle.textContent = tr('update_page_title');
      }, 2000);
    }
  });
});