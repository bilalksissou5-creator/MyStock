// ============================================
// صفحة الإعدادات
// ✅ دعم كامل للترجمة + إظهار التحديث الجديد باللون الأزرق
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('stg_title_full');

  const main = document.getElementById('main-content');

  // ✅ 1. جلب الإصدار المحفوظ في ذاكرة المستخدم (النسخة التي يستخدمها حالياً)
  const localVersion = localStorage.getItem('app_version') || '1.0.0';
  
  // ✅ 2. جلب الإصدار الجديد من السيرفر
  let serverVersion = localVersion;
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      serverVersion = data.version || serverVersion;
    }
  } catch (e) {
    console.warn('ملف version.json غير موجود.');
  }

  // ✅ 3. المقارنة: هل يوجد تحديث جديد؟
  const hasUpdate = serverVersion !== localVersion;
  
  // تجهيز شكل النص (أزرق إذا كان هناك تحديث، رمادي إذا كان محدثاً)
  const versionColor = hasUpdate ? '#2563eb' : '#737373';
  const versionText = hasUpdate 
    ? `${tr('stg_new_version') || 'جديد'}: v${serverVersion}` 
    : `${tr('stg_current_version')}: v${localVersion}`;

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

        <!-- ✅ بطاقة التحديث -->
        <a href="/update.html" class="settings-item" id="update-app-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-teal">
              <i class="fas fa-download"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_update')}</div>
              
              <!-- النص هنا يتغير لونه بناءً على وجود تحديث -->
              <div class="settings-subtitle" style="color: ${versionColor}; font-size: 12px; margin-top: 2px; font-weight: ${hasUpdate ? '700' : '500'};">
                ${versionText}
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