// ============================================
// صفحة الإعدادات
// ✅ تصميم Samsung One UI
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <h2>الإعدادات</h2>

    <div class="settings-list">

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

      <a href="/contacts-devices.html" class="settings-item">
        <div class="settings-icon icon-green">
          <i class="fas fa-phone"></i>
        </div>
        <div class="settings-text">
          <div class="settings-title">الاتصالات والأجهزة</div>
        </div>
        <i class="fas fa-chevron-left settings-arrow"></i>
      </a>

    </div>
  `;
});