// ============================================
// صفحة الملف الشخصي — تصميم Facebook
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const currentRole = profile?.role;
  const isAdmin = currentRole === 'admin';
  const isAdminOrDeputy = currentRole === 'admin' || currentRole === 'deputy';

  // جلب أعضاء المنظمة
  let members = [];
  if (profile?.organization_id) {
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true });
    members = data ?? [];
  }

  // استبعاد المستخدم الحالي من كل الأقسام
  const others = members.filter(m => m.id !== user.id);
  const admin = others.find(m => m.role === 'admin');
  const deputies = others.filter(m => m.role === 'deputy');
  const workers = others.filter(m => m.role === 'worker');

  // ═══════════════════════════════════════════
  // ✅ بناء بطاقة عضو (قابلة للضغط للمدير)
  // ═══════════════════════════════════════════
  function buildMemberCard(member, type) {
    const isOnline = typeof isUserOnline === 'function' && isUserOnline(member);
    const starClass = type === 'deputy' ? 'deputy-star' : 'worker-star';
    const roleLabel = type === 'deputy' ? 'نائب' : 'عامل';

    const inner = `
      <div class="member-avatar-wrap">
        <div class="member-avatar">
          ${member.avatar_url
            ? `<img src="${member.avatar_url}" alt="${member.full_name}">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <span class="member-status-dot ${isOnline ? 'online' : 'offline'}"
              title="${isOnline ? 'متصل' : 'غير متصل'}"></span>
      </div>

      <div class="member-name-row">
        <span class="member-name">${member.full_name ?? 'بدون اسم'}</span>
        <i class="fas fa-star member-star-icon ${starClass}"></i>
      </div>

      <div class="member-role ${type}">${roleLabel}</div>
    `;

    // ✅ للمدير: رابط قابل للضغط
    if (isAdmin) {
      return `
        <a href="/member-profile.html?id=${member.id}" class="member-card member-card-link">
          ${inner}
        </a>
      `;
    }

    // لغير المدير: بطاقة عادية
    return `<div class="member-card">${inner}</div>`;
  }

  main.innerHTML = `
    <div class="profile-fb-wrapper">

      <!-- ══════ الغلاف ══════ -->
      <div class="profile-cover">
        ${profile?.cover_url
          ? `<img src="${profile.cover_url}" alt="cover">`
          : `<div class="cover-placeholder"></div>`}
      </div>

      <!-- ══════ الصورة الشخصية ══════ -->
      <div class="profile-avatar-fb-wrap">
        <div class="profile-avatar-fb">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="avatar">`
            : `<i class="fas fa-user"></i>`}
        </div>
      </div>

      <!-- ══════ معلومات المستخدم ══════ -->
      <div class="profile-fb-info">
        <h3>${profile?.full_name ?? 'بدون اسم'}</h3>
        <p class="profile-fb-email" dir="ltr">${user.email}</p>
        <div class="profile-fb-badges">
          <span class="badge-role">${currentRole === 'admin' ? 'مدير' : currentRole === 'deputy' ? 'نائب' : 'عامل'}</span>
        </div>
      </div>

      <!-- ══════ شريط الأزرار ══════ -->
      <div class="profile-actions-bar">
        ${isAdminOrDeputy ? `
          <a href="/add-worker.html" class="btn-secondary">
            <i class="fas fa-user-plus"></i>
            <span>إضافة عامل</span>
          </a>
        ` : ''}
        <a href="/profile-dashboard.html" class="btn-primary">
          <i class="fas fa-sliders"></i>
          <span>لوحة المعلومات</span>
        </a>
      </div>

      <!-- ═══════════════════════════════════════
           قسم المدير
           ═══════════════════════════════════════ -->
      ${admin ? `
        <div class="team-section">
          <h3 class="team-title">
            <i class="fas fa-crown" style="color:#fbbf24;"></i>
            المدير
          </h3>
          <div class="admin-card">
            <div class="admin-avatar-wrap">
              <div class="admin-avatar">
                ${admin.avatar_url
                  ? `<img src="${admin.avatar_url}" alt="${admin.full_name}">`
                  : `<i class="fas fa-user"></i>`}
              </div>
              <span class="member-status-dot ${isUserOnline(admin) ? 'online' : 'offline'}"></span>
            </div>
            <div class="admin-info">
              <div class="admin-name">${admin.full_name ?? 'بدون اسم'}</div>
              <div class="admin-badges">
                <span class="badge-crown">👑 مدير</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════
           قسم النواب
           ═══════════════════════════════════════ -->
      ${deputies.length > 0 ? `
        <div class="team-section">
          <h3 class="team-title">
            <i class="fas fa-star" style="color:#fbbf24;"></i>
            النواب (${deputies.length})
          </h3>

          <div class="team-grid">
            ${deputies.map(w => buildMemberCard(w, 'deputy')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════
           قسم العمال
           ═══════════════════════════════════════ -->
      ${workers.length > 0 ? `
        <div class="team-section">
          <h3 class="team-title">
            <i class="fas fa-users" style="color:#171717;"></i>
            العمال (${workers.length})
          </h3>

          <div class="team-grid">
            ${workers.map(w => buildMemberCard(w, 'worker')).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;

  // ============================================
  // ⚠️ دوال معطّلة (محفوظة للاستخدام المستقبلي)
  // ============================================
  /*
  async function makeDeputy(memberId) {
    if (!confirm('تعيين هذا العامل نائباً؟')) return;
    const { error } = await db
      .from('profiles')
      .update({ role: 'deputy' })
      .eq('id', memberId);
    if (error) { alert('خطأ: ' + error.message); return; }
    window.location.reload();
  }

  async function removeDeputy(memberId) {
    if (!confirm('إلغاء صفة النائب عن هذا العضو؟')) return;
    const { error } = await db
      .from('profiles')
      .update({ role: 'worker' })
      .eq('id', memberId);
    if (error) { alert('خطأ: ' + error.message); return; }
    window.location.reload();
  }
  */

});