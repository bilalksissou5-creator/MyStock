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
          <span class="badge-status">${profile?.status ?? 'offline'}</span>
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
            <div class="admin-avatar">
              ${admin.avatar_url
                ? `<img src="${admin.avatar_url}" alt="${admin.full_name}">`
                : `<i class="fas fa-user"></i>`}
            </div>
            <div class="admin-info">
              <div class="admin-name">${admin.full_name ?? 'بدون اسم'}</div>
              <div class="admin-badges">
                <span class="badge-crown">👑 مدير</span>
                <span class="badge-status-inline ${admin.status === 'online' ? 'online' : 'offline'}">
                  ${admin.status === 'online' ? 'متصل' : 'غير متصل'}
                </span>
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
            ${deputies.map(w => `
              <div class="member-card">
                <div class="member-star gold-star">⭐</div>
                <div class="member-avatar">
                  ${w.avatar_url
                    ? `<img src="${w.avatar_url}" alt="${w.full_name}">`
                    : `<i class="fas fa-user"></i>`}
                </div>
                <div class="member-name">${w.full_name ?? 'بدون اسم'}</div>
                <div class="member-role deputy">نائب</div>
                <div class="member-status ${w.status === 'online' ? 'online' : 'offline'}">
                  <span class="status-dot"></span>
                  ${w.status === 'online' ? 'متصل' : 'غير متصل'}
                </div>
                ${isAdmin ? `
                  <button type="button" class="member-action-btn remove-deputy-btn" data-id="${w.id}" title="إلغاء النيابة">
                    <i class="fas fa-xmark"></i>
                  </button>
                ` : ''}
              </div>
            `).join('')}
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
            ${workers.map(w => `
              <div class="member-card">
                <div class="member-star bronze-star">⭐</div>
                <div class="member-avatar">
                  ${w.avatar_url
                    ? `<img src="${w.avatar_url}" alt="${w.full_name}">`
                    : `<i class="fas fa-user"></i>`}
                </div>
                <div class="member-name">${w.full_name ?? 'بدون اسم'}</div>
                <div class="member-role worker">عامل</div>
                <div class="member-status ${w.status === 'online' ? 'online' : 'offline'}">
                  <span class="status-dot"></span>
                  ${w.status === 'online' ? 'متصل' : 'غير متصل'}
                </div>
                ${isAdmin ? `
                  <button type="button" class="member-action-btn make-deputy-btn" data-id="${w.id}" title="تعيين نائباً">
                    <i class="fas fa-crown"></i>
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;

  // ============================================
  // تعيين/إلغاء النيابة (المدير فقط)
  // ============================================
  document.querySelectorAll('.make-deputy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('تعيين هذا العامل نائباً؟')) return;
      const memberId = btn.dataset.id;

      const { error } = await db
        .from('profiles')
        .update({ role: 'deputy' })
        .eq('id', memberId);

      if (error) { alert('خطأ: ' + error.message); return; }
      window.location.reload();
    });
  });

  document.querySelectorAll('.remove-deputy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('إلغاء صفة النائب عن هذا العضو؟')) return;
      const memberId = btn.dataset.id;

      const { error } = await db
        .from('profiles')
        .update({ role: 'worker' })
        .eq('id', memberId);

      if (error) { alert('خطأ: ' + error.message); return; }
      window.location.reload();
    });
  });

});