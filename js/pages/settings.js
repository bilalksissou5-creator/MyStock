// ============================================
// صفحة الإعدادات
// ✅ دعم كامل للترجمة + عرض إصدار التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('stg_title_full');

  const main = document.getElementById('main-content');

  // ✅ جلب إصدار التطبيق الحالي
  let appVersion = localStorage.getItem('app_version') || '1.0.0';
  try {
    // محاولة قراءة الإصدار من ملف version.json إذا كان موجوداً
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      appVersion = data.version || appVersion;
      // تحديث الذاكرة المؤقتة
      localStorage.setItem('app_version', appVersion);
    }
  } catch (e) {
    console.warn('ملف version.json غير موجود، سيتم استخدام الإصدار الافتراضي.');
  }

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('stg_title')}</h2>
    </div>

    <div class="settings-wrapper">

      <div class="settings-card">
        <a href="/profile-dashboard.html" class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-blue">
              <i class="fas fa-user"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_profile')}</div>
              <div class="settings-subtitle">${tr('stg_profile_sub')}</div>
            </div>
          </div>
          <i class="fas fa-chevron-right settings-arrow"></i>
        </a>
      </div>

      <div class="settings-card">
        <a href="/times.html" class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-purple">
              <i class="fas fa-sliders"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_admin_panel')}</div>
            </div>
          </div>
          <i class="fas fa-chevron-right settings-arrow"></i>
        </a>
      </div>

      <div class="settings-card">
        <div class="settings-item" id="notifications-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-red">
              <i class="fas fa-bell"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_notifications')}</div>
            </div>
          </div>
          <i class="fas fa-chevron-right settings-arrow"></i>
        </div>
      </div>

      <div class="settings-card">

        <!-- ✅ بطاقة التحديث مع عرض الإصدار تحتها -->
        <a href="/update.html" class="settings-item" id="update-app-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-teal">
              <i class="fas fa-download"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_update')}</div>
              <!-- هنا يظهر الإصدار تحت العنوان -->
              <div class="settings-subtitle" style="color: #737373; font-size: 12px; margin-top: 2px;">
                ${tr('stg_current_version')}: v${appVersion}
              </div>
            </div>
          </div>
          <i class="fas fa-chevron-right settings-arrow"></i>
        </a>

        <div class="settings-item" id="about-app-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-gray">
              <i class="fas fa-info-circle"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_about')}</div>
            </div>
          </div>
          <i class="fas fa-chevron-right settings-arrow"></i>
        </div>

      </div>

    </div>
  `;
});