// ============================================
// صفحة الإعدادات
// ✅ بطاقة الملف الشخصي
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <h2>الإعدادات</h2>

    <div class="settings-cards-list">

      <!-- ✅ بطاقة الملف الشخصي -->
      <a href="/profile-dashboard.html" class="settings-card">
        <div class="settings-card-icon">
          <i class="fas fa-user"></i>
        </div>
        <div class="settings-card-body">
          <div class="settings-card-title">الملف الشخصي</div>
          <div class="settings-card-subtitle">تعديل معلوماتك الشخصية</div>
        </div>
        <div class="settings-card-arrow">
          <i class="fas fa-chevron-left"></i>
        </div>
      </a>

    </div>
  `;
});