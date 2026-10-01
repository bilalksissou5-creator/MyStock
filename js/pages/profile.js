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
  // بيانات بطاقات التعديل
  // ═══════════════════════════════════════════
  const editCards = [
    {
      id: 'cover',
      icon: 'fa-image',
      title: 'صورة الغلاف',
      value: profile?.cover_url ? 'مُعدَّلة' : 'غير مُعدَّلة',
    },
    {
      id: 'avatar',
      icon: 'fa-user-circle',
      title: 'صورة المستخدم',
      value: profile?.avatar_url ? 'مُعدَّلة' : 'غير مُعدَّلة',
    },
    {
      id: 'name',
      icon: 'fa-user-pen',
      title: 'الاسم',
      value: profile?.full_name || 'لم يُحدَّد',
    },
    {
      id: 'email-password',
      icon: 'fa-envelope',
      title: 'البريد وكلمة المرور',
      value: user.email,
    },
    {
      id: 'phone',
      icon: 'fa-phone',
      title: 'رقم الهاتف',
      value: profile?.phone || 'لم يُحدَّد',
    },
  ];

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

      <!-- ══════ زر إضافة عامل (للمدير والنائب) ══════ -->
      ${isAdminOrDeputy ? `
        <div class="profile-actions-bar">
          <a href="/add-worker.html" class="btn-primary full-width">
            <i class="fas fa-user-plus"></i>
            <span>إضافة عامل</span>
          </a>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════
           بطاقات تعديل المعلومات
           ═══════════════════════════════════════ -->
      <div class="edit-cards-section">
        <h3 class="edit-cards-title">معلوماتي</h3>
        <div class="edit-cards-list">
          ${editCards.map(card => `
            <a href="/profile-edit.html?section=${card.id}" class="edit-card">
              <div class="edit-card-icon">
                <i class="fas ${card.icon}"></i>
              </div>
              <div class="edit-card-body">
                <div class="edit-card-title">${card.title}</div>
                <div class="edit-card-value" dir="auto">${card.value}</div>
              </div>
              <div class="edit-card-arrow">
                <i class="fas fa-chevron-left"></i>
              </div>
            </a>
          `).join('')}
        </div>
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