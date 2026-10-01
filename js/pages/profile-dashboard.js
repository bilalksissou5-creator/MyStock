// ============================================
// لوحة معلومات المستخدم — البطاقات
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

  // ═══════════════════════════════════════════
  // بيانات البطاقات
  // ═══════════════════════════════════════════
  const cards = [
    {
      id: 'cover',
      icon: 'fa-image',
      title: 'صورة الغلاف',
      value: profile?.cover_url ? 'مُعدَّلة' : 'غير مُعدَّلة',
      hasValue: !!profile?.cover_url,
    },
    {
      id: 'avatar',
      icon: 'fa-user-circle',
      title: 'صورة المستخدم',
      value: profile?.avatar_url ? 'مُعدَّلة' : 'غير مُعدَّلة',
      hasValue: !!profile?.avatar_url,
    },
    {
      id: 'name',
      icon: 'fa-user-pen',
      title: 'الاسم',
      value: profile?.full_name || 'لم يُحدَّد',
      hasValue: !!profile?.full_name,
    },
    {
      id: 'email-password',
      icon: 'fa-envelope',
      title: 'البريد وكلمة المرور',
      value: user.email,
      hasValue: true,
    },
    {
      id: 'phone',
      icon: 'fa-phone',
      title: 'رقم الهاتف',
      value: profile?.phone || 'لم يُحدَّد',
      hasValue: !!profile?.phone,
    },
  ];

  // ═══════════════════════════════════════════
  // بناء الواجهة
  // ═══════════════════════════════════════════
  main.innerHTML = `
    <div class="page-header">
      <h2>لوحة المعلومات</h2>
      <a href="/profile.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="pd-wrapper">

      <!-- ══════ بطاقة المستخدم المصغّرة ══════ -->
      <div class="pd-user-card">
        <div class="pd-user-avatar">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="avatar">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <div class="pd-user-info">
          <div class="pd-user-name">${profile?.full_name ?? 'بدون اسم'}</div>
          <div class="pd-user-email" dir="ltr">${user.email}</div>
        </div>
      </div>

      <!-- ══════ البطاقات ══════ -->
      <div class="pd-cards-list">
        ${cards.map(card => `
          <a href="/profile-edit.html?section=${card.id}" class="pd-card">
            <div class="pd-card-icon">
              <i class="fas ${card.icon}"></i>
            </div>
            <div class="pd-card-body">
              <div class="pd-card-title">${card.title}</div>
              <div class="pd-card-value ${card.hasValue ? '' : 'empty'}" dir="auto">
                ${card.value}
              </div>
            </div>
            <div class="pd-card-arrow">
              <i class="fas fa-chevron-left"></i>
            </div>
          </a>
        `).join('')}
      </div>

    </div>
  `;
});