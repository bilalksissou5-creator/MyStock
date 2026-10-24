// ============================================
// صفحة تحديث التطبيق
// ✅ إذا لم يوجد تحديث: يظهر "التطبيق محدث" ويختفي الزر
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('update.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('update_title') || 'Update App';

  const main = document.getElementById('main-content');

  // 1. جلب الإصدار المحلي (الحالي)
  let localVersion = localStorage.getItem('app_version') || '1.0.0';
  
  // 2. جلب الإصدار من السيرفر
  let serverVersion = localVersion;
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      serverVersion = data.version || serverVersion;
    }
  } catch (e) {}

  // 3. هل يوجد تحديث؟
  const hasUpdate = serverVersion !== localVersion;

  // تجهيز النصوص والأيقونات
  const pageTitle = hasUpdate ? tr('update_page_title') : tr('update_up_to_date');
  const pageDesc = hasUpdate ? tr('update_page_desc') : '';
  
  const iconHtml = hasUpdate 
    ? `<i class="fas fa-arrow-down"></i>` 
    : `<i class="fas fa-check-circle" style="color: #16a34a;"></i>`; // علامة صح خضراء
  
  const containerStyle = hasUpdate ? '' : 'background: #dcfce7;'; // خلفية خضراء فاتحة

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('update_title')}</h2>
      <a href="/settings.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="update-wrapper">
      <!-- الأيقونة تتغير حسب الحالة -->
      <div class="update-icon-container" id="update-icon" style="${containerStyle}">
        ${iconHtml}
      </div>

      <h1 class="update-title" id="update-title">${pageTitle}</h1>
      
      <!-- الشرح يختفي إذا كان التطبيق محدثاً -->
      <p class="update-desc" id="update-desc" style="${!hasUpdate ? 'display:none;' : ''}">
        ${pageDesc}
      </p>

      <div class="update-version" id="version-box">
        <span>${tr('update_current_version')}</span>
        <span id="app-version">v${localVersion}</span>
      </div>

      <!-- شريط التقدم (مخفي مبدئياً) -->
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

      <!-- ✅ زر التحديث يظهر فقط إذا كان هناك تحديث -->
      ${hasUpdate ? `
        <button class="btn-primary update-btn" id="update-btn">
          <i class="fas fa-sync-alt"></i>
          <span>${tr('update_now')}</span>
        </button>
      ` : ''}

      <div class="update-status" id="update-status"></div>
    </div>
  `;

  // إذا لم يكن هناك تحديث، لا نحتاج لتفعيل أي أزرار، ونكتفي بالعرض
  if (!hasUpdate) return;

  // ============================================
  // منطق التحديث (يعمل فقط إذا كان هناك تحديث)
  // ============================================
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
      progressText.textContent = tr('update_checking_size') || 'جارٍ حساب الحجم...';
      
      for (const file of filesToUpdate) {
        const res = await fetch(file + '?t=' + Date.now(), { method: 'HEAD' });
        const size = parseInt(res.headers.get('content-length') || '0', 10);
        totalBytes += size;
      }
      if (totalBytes === 0) totalBytes = 2 * 1024 * 1024; 

      progressText.textContent = tr('update_downloading') || 'جارٍ التحميل...';

      for (const file of filesToUpdate) {
        const res = await fetch(file + '?t=' + Date.now());
        const reader = res.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          loadedBytes += value.length;
          
          const percent = Math.min(100, Math.floor((loadedBytes / totalBytes) * 100));
          progressFill.style.width = `${percent}%`;
          progressPercent.textContent = `${percent}%`;
          progressSize.textContent = `${(loadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
        }
      }

      // مسح الكاش
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // تحديث الإصدار المحلي ليطابق السيرفر
      localStorage.setItem('app_version', serverVersion);

      // إظهار النجاح
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
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