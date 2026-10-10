// ============================================
// صفحة الإعدادات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <h2>الإعدادات</h2>

    <div class="settings-wrapper">

      <!-- ══════ بطاقة 1: الملف الشخصي ══════ -->
      <div class="settings-card">
        <a href="/profile-dashboard.html" class="settings-item">
          <div class="settings-icon icon-blue">
            <i class="fas fa-user"></i>
          </div>
          <div class="settings-text">
            <div class="settings-title">الملف الشخصي</div>
            <div class="settings-subtitle">تعديل معلوماتك الشخصية</div>
          </div>
          <i class="fas fa-chevron-left settings-arrow"></i>
        </a>
      </div>

      <!-- ══════ بطاقة 2: الإدارة العامة ══════ -->
      <div class="settings-card">
        <div class="settings-item" id="admin-panel-item">
          <div class="settings-icon icon-purple">
            <i class="fas fa-sliders"></i>
          </div>
          <div class="settings-text">
            <div class="settings-title">الإدارة العامة</div>
          </div>
          <i class="fas fa-chevron-left settings-arrow"></i>
        </div>
      </div>

      <!-- ══════ بطاقة 3: الإشعارات ══════ -->
      <div class="settings-card">
        <div class="settings-item" id="notifications-item">
          <div class="settings-icon icon-red">
            <i class="fas fa-bell"></i>
          </div>
          <div class="settings-text">
            <div class="settings-title">الإشعارات</div>
          </div>
          <i class="fas fa-chevron-left settings-arrow"></i>
        </div>
      </div>

      <!-- ══════ بطاقة 4: تحديث التطبيق + حول التطبيق ══════ -->
      <div class="settings-card">

        <div class="settings-item" id="update-app-item">
          <div class="settings-icon icon-teal">
            <i class="fas fa-download"></i>
          </div>
          <div class="settings-text">
            <div class="settings-title">تحديث التطبيق</div>
          </div>
          <i class="fas fa-chevron-left settings-arrow"></i>
        </div>

        <div class="settings-item" id="about-app-item">
          <div class="settings-icon icon-gray">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="settings-text">
            <div class="settings-title">حول التطبيق</div>
          </div>
          <i class="fas fa-chevron-left settings-arrow"></i>
        </div>

      </div>

    </div>
  `;
});