// ============================================
// لوحة معلومات المستخدم — البطاقات
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

  if (!myProfile) {
    main.innerHTML = `<div class="alert alert-error">خطأ في تحميل البيانات</div>`;
    return;
  }

  // قراءة id من الرابط
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('id') || user.id;
  const isMe = targetId === user.id;
  const isAdmin = myProfile.role === 'admin';

  if (!isMe && !isAdmin) {
    main.innerHTML = `<div class="alert alert-error">ليس لديك صلاحية</div>`;
    return;
  }

  // جلب بروفايل العضو المستهدف
  const { data: target, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .single();

  if (error || !target) {
    main.innerHTML = `<div class="alert alert-error">لم يتم العثور على العضو</div>`;
    return;
  }

  if (target.organization_id !== myProfile.organization_id) {
    main.innerHTML = `<div class="alert alert-error">هذا العضو ليس في منظمتك</div>`;
    return;
  }

  // جلب بيانات المنظمة
  const { data: org } = await db
    .from('organizations')
    .select('*')
    .eq('id', myProfile.organization_id)
    .single();

  const isOnline = typeof isUserOnline === 'function' && isUserOnline(target);

  // ═══════════════════════════════════════════
  // ✅ بطاقة المنظمة (تظهر للجميع)
  // ═══════════════════════════════════════════
  const orgCard = `
    ${isAdmin ? `
      <a href="/org-edit.html" class="pd-card">
        <div class="pd-card-icon">
          <i class="fas fa-building"></i>
        </div>
        <div class="pd-card-body">
          <div class="pd-card-title">المنظمة</div>
          <div class="pd-card-value" dir="auto">
            ${org?.name ?? 'منظمتي'}
          </div>
        </div>
        <div class="pd-card-arrow">
          <i class="fas fa-chevron-left"></i>
        </div>
      </a>
    ` : `
      <div class="pd-card pd-card-disabled">
        <div class="pd-card-icon">
          <i class="fas fa-building"></i>
        </div>
        <div class="pd-card-body">
          <div class="pd-card-title">المنظمة</div>
          <div class="pd-card-value" dir="auto">
            ${org?.name ?? 'منظمتي'}
          </div>
        </div>
        <div class="pd-card-arrow">
          <i class="fas fa-lock"></i>
        </div>
      </div>
    `}
  `;

  // ═══════════════════════════════════════════
  // بيانات البطاقات العادية
  // ═══════════════════════════════════════════
  const cards = [
    {
      id: 'cover',
      icon: 'fa-image',
      title: 'صورة الغلاف',
      value: target?.cover_url ? 'مُعدَّلة' : 'غير مُعدَّلة',
      hasValue: !!target?.cover_url,
    },
    {
      id: 'avatar',
      icon: 'fa-user-circle',
      title: 'صورة المستخدم',
      value: target?.avatar_url ? 'مُعدَّلة' : 'غير مُعدَّلة',
      hasValue: !!target?.avatar_url,
    },
    {
      id: 'name',
      icon: 'fa-user-pen',
      title: 'الاسم',
      value: target?.full_name || 'لم يُحدَّد',
      hasValue: !!target?.full_name,
    },
    {
      id: 'email-password',
      icon: 'fa-envelope',
      title: 'البريد وكلمة المرور',
      value: isMe ? user.email : 'محمي',
      hasValue: true,
      disabled: !isMe,
    },
    {
      id: 'phone',
      icon: 'fa-phone',
      title: 'رقم الهاتف',
      value: target?.phone || 'لم يُحدَّد',
      hasValue: !!target?.phone,
    },
  ];

  const title = isMe ? 'لوحة المعلومات' : `لوحة ${target.full_name ?? 'العضو'}`;

  main.innerHTML = `
    <div class="page-header">
      <h2>${title}</h2>
      <a href="${isMe ? '/profile.html' : `/member-profile.html?id=${target.id}`}" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="pd-wrapper">

      <!-- ══════ بطاقة المستخدم المصغّرة ══════ -->
      <div class="pd-user-card">
        <div class="pd-user-avatar">
          ${target?.avatar_url
            ? `<img src="${target.avatar_url}" alt="avatar">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <div class="pd-user-info">
          <div class="pd-user-name">${target?.full_name ?? 'بدون اسم'}</div>
          <div class="pd-user-email">${isMe ? user.email : (target.phone ?? 'عضو في الفريق')}</div>
        </div>
      </div>

      <!-- ══════ بطاقة المنظمة + البطاقات ══════ -->
      <div class="pd-cards-list">
        ${orgCard}

        ${cards.map(card => {
          if (card.disabled) {
            return `
              <div class="pd-card pd-card-disabled">
                <div class="pd-card-icon">
                  <i class="fas ${card.icon}"></i>
                </div>
                <div class="pd-card-body">
                  <div class="pd-card-title">${card.title}</div>
                  <div class="pd-card-value" dir="auto">${card.value}</div>
                </div>
                <div class="pd-card-arrow">
                  <i class="fas fa-lock"></i>
                </div>
              </div>
            `;
          }

          const canEdit = isMe;
          const href = canEdit
            ? `/profile-edit.html?section=${card.id}`
            : `/member-profile.html?id=${target.id}`;

          return `
            <a href="${href}" class="pd-card">
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
          `;
        }).join('')}
      </div>

    </div>
  `;
});