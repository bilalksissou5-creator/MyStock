// ============================================
// صفحة الإعدادات
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('stg_title_full');

  const main = document.getElementById('main-content');

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

        <!-- ✅ تم تحويل البطاقة إلى رابط يفتح صفحة التحديث -->
        <a href="/update.html" class="settings-item" id="update-app-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-teal">
              <i class="fas fa-download"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('stg_update')}</div>
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