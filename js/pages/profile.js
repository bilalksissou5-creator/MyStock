// ============================================
// صفحة الملف الشخصي — تصميم Facebook + Accordion
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

  let members = [];
  if (profile?.organization_id) {
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true });
    members = data ?? [];
  }

  const others = members.filter(m => m.id !== user.id);
  const admin = others.find(m => m.role === 'admin');
  const deputies = others.filter(m => m.role === 'deputy');
  const workers = others.filter(m => m.role === 'worker');

  // ═══════════════════════════════════════════
  // بناء بطاقة عضو
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

    if (isAdmin) {
      return `
        <a href="/member-profile.html?id=${member.id}" class="member-card member-card-link">
          ${inner}
        </a>
      `;
    }

    return `<div class="member-card">${inner}</div>`;
  }

  function buildAdminCard(member) {
    const isOnline = typeof isUserOnline === 'function' && isUserOnline(member);

    return `
      <div class="member-card member-card-admin">
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
          <i class="fas fa-crown member-star-icon crown-star"></i>
        </div>

        <div class="member-role admin">مدير</div>
      </div>
    `;
  }

  function buildTeamSection({ id, icon, iconColor, label, count, content }) {
    return `
      <div class="team-accordion" data-section="${id}">
        <button type="button" class="team-accordion-header" data-toggle="${id}">
          <div class="team-accordion-title">
            <i class="fas ${icon}" ${iconColor ? `style="color:${iconColor};"` : ''}></i>
            <span>${label}${count !== undefined ? ` (${count})` : ''}</span>
          </div>
          <i class="fas fa-chevron-left team-accordion-arrow"></i>
        </button>

        <div class="team-accordion-body" data-body="${id}" style="display:none;">
          <div class="team-grid">
            ${content}
          </div>
        </div>
      </div>
    `;
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

      <!-- ══════ قسم المدير ══════ -->
      ${admin ? buildTeamSection({
        id: 'admin',
        icon: 'fa-crown',
        iconColor: '#fbbf24',
        label: 'المدير',
        count: undefined,
        content: buildAdminCard(admin),
      }) : ''}

      <!-- ══════ قسم النواب ══════ -->
      ${deputies.length > 0 ? buildTeamSection({
        id: 'deputies',
        icon: 'fa-star',
        iconColor: '#fbbf24',
        label: 'النواب',
        count: deputies.length,
        content: deputies.map(w => buildMemberCard(w, 'deputy')).join(''),
      }) : ''}

      <!-- ══════ قسم العمال ══════ -->
      ${workers.length > 0 ? buildTeamSection({
        id: 'workers',
        icon: 'fa-users',
        iconColor: '#171717',
        label: 'العمال',
        count: workers.length,
        content: workers.map(w => buildMemberCard(w, 'worker')).join(''),
      }) : ''}

      <!-- ═══════════════════════════════════════
           السجلات
           ═══════════════════════════════════════ -->
      <div class="records-row">
        <a href="#" class="record-item" data-record="log">
          <i class="fas fa-clipboard-list"></i>
          <span>السجل</span>
        </a>

        <div class="records-left">
          <a href="#" class="record-item" data-record="invoices">
            <i class="fas fa-file-invoice"></i>
            <span>الفواتير</span>
          </a>

          <a href="#" class="record-item" data-record="out">
            <i class="fas fa-arrow-up-from-bracket"></i>
            <span>إخراج</span>
          </a>
        </div>
      </div>

    </div>
  `;

  // ═══════════════════════════════════════════
  // Accordion (فتح حصري)
  // ═══════════════════════════════════════════
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      const body = document.querySelector(`[data-body="${id}"]`);
      const accordion = btn.closest('.team-accordion');

      if (!body) return;

      const isOpen = body.style.display !== 'none';

      document.querySelectorAll('.team-accordion-body').forEach(b => {
        b.style.display = 'none';
      });
      document.querySelectorAll('.team-accordion').forEach(a => {
        a.classList.remove('open');
      });

      if (!isOpen) {
        body.style.display = 'block';
        accordion.classList.add('open');
      }
    });
  });

  // ═══════════════════════════════════════════
  // ✅ إضافة/إزالة .pressed على الفواتير + إخراج
  // لضمان ظهور الخط والخلفية معاً أثناء الضغط
  // ═══════════════════════════════════════════
  document.querySelectorAll('.record-item[data-record="invoices"], .record-item[data-record="out"]').forEach(el => {
    const press = () => el.classList.add('pressed');
    const release = () => el.classList.remove('pressed');

    el.addEventListener('touchstart', press, { passive: true });
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);

    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
  });
});