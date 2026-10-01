// ============================================
// صفحة ملف عضو آخر (للمدير)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  // جلب بروفايل المستخدم الحالي
  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    main.innerHTML = `<div class="alert alert-error">ليس لديك صلاحية عرض ملفات الأعضاء</div>`;
    return;
  }

  // قراءة id العضو من الرابط
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id');

  if (!memberId) {
    main.innerHTML = `<div class="alert alert-error">لم يتم تحديد العضو</div>`;
    return;
  }

  // جلب بيانات العضو
  const { data: member, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    main.innerHTML = `<div class="alert alert-error">لم يتم العثور على العضو</div>`;
    return;
  }

  // التحقق أن العضو في نفس المنظمة
  if (member.organization_id !== myProfile.organization_id) {
    main.innerHTML = `<div class="alert alert-error">هذا العضو ليس في منظمتك</div>`;
    return;
  }

  const isOnline = typeof isUserOnline === 'function' && isUserOnline(member);
  const roleLabel = member.role === 'admin' ? 'مدير' : member.role === 'deputy' ? 'نائب' : 'عامل';

  main.innerHTML = `
    <div class="mp-wrapper">

      <!-- ══════ معلومات العضو ══════ -->
      <div class="mp-card">
        <div class="mp-avatar-wrap">
          <div class="mp-avatar">
            ${member.avatar_url
              ? `<img src="${member.avatar_url}" alt="${member.full_name}">`
              : `<i class="fas fa-user"></i>`}
          </div>
          <span class="mp-status-dot ${isOnline ? 'online' : 'offline'}"></span>
        </div>

        <h2 class="mp-name">${member.full_name ?? 'بدون اسم'}</h2>
        <p class="mp-role">${roleLabel}</p>
        <p class="mp-status-text">${isOnline ? '🟢 متصل الآن' : '⚪ غير متصل'}</p>
      </div>

      <!-- ══════ الأزرار ══════ -->
      <div class="mp-actions">
        <a href="/profile-dashboard.html" class="btn-secondary">
          <i class="fas fa-sliders"></i>
          <span>لوحة المعلومات</span>
        </a>
        <a href="/member-manage.html?id=${member.id}" class="btn-primary">
          <i class="fas fa-ellipsis-vertical"></i>
          <span>إدارة</span>
        </a>
      </div>

      <!-- ══════ معلومات إضافية ══════ -->
      <div class="mp-info-section">
        <h3>معلومات</h3>

        <div class="mp-info-row">
          <i class="fas fa-phone"></i>
          <span dir="ltr">${member.phone ?? 'غير متوفر'}</span>
        </div>

        <div class="mp-info-row">
          <i class="fas fa-calendar"></i>
          <span>عضو منذ: ${new Date(member.created_at).toLocaleDateString('ar')}</span>
        </div>

        <div class="mp-info-row">
          <i class="fas fa-circle-check"></i>
          <span>الحالة: ${member.status === 'online' ? 'متصل' : 'غير متصل'}</span>
        </div>
      </div>

    </div>
  `;
});