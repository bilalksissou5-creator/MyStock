// ============================================
// صفحة العمال — النواب + العمال فقط
// ✅ لا يظهر المدير
// ✅ عند الضغط → /member-profile.html?id=UUID
// ✅ المحتوى ظاهر دائماً بدون Accordion
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('workers/list.html');

  const main = document.getElementById('main-content');

  // جلب بروفايل المستخدم
  const { data: myProfile } = await db
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!myProfile?.organization_id) {
    main.innerHTML = `<div class="alert alert-error">لا يمكن تحديد المنظمة</div>`;
    return;
  }

  // جلب كل أعضاء المنظمة
  const { data: members, error } = await db
    .from('profiles')
    .select('*')
    .eq('organization_id', myProfile.organization_id)
    .order('created_at', { ascending: true });

  if (error) {
    main.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  // ✅ استبعاد المدير (لا يظهر)
  const nonAdminMembers = (members ?? []).filter(m => m.role !== 'admin');
  const deputies = nonAdminMembers.filter(m => m.role === 'deputy');
  const workers = nonAdminMembers.filter(m => m.role === 'worker');

  // ═══════════════════════════════════════════
  // بناء بطاقة عضو
  // ═══════════════════════════════════════════
  function buildMemberCard(m, type) {
    const isOnline = typeof isUserOnline === 'function' && isUserOnline(m);
    const starClass = type === 'deputy' ? 'deputy-star' : 'worker-star';
    const roleLabel = type === 'deputy' ? 'نائب' : 'عامل';

    return `
      <a href="/member-profile.html?id=${m.id}" class="member-card member-card-link">
        <div class="member-avatar-wrap">
          <div class="member-avatar">
            ${m.avatar_url
              ? `<img src="${m.avatar_url}" alt="${m.full_name}">`
              : `<i class="fas fa-user"></i>`}
          </div>
          <span class="member-status-dot ${isOnline ? 'online' : 'offline'}"
                title="${isOnline ? 'متصل' : 'غير متصل'}"></span>
        </div>

        <div class="member-name-row">
          <span class="member-name">${m.full_name ?? 'بدون اسم'}</span>
          <i class="fas fa-star member-star-icon ${starClass}"></i>
        </div>

        <div class="member-role ${type}">${roleLabel}</div>
      </a>
    `;
  }

  // ═══════════════════════════════════════════
  // بناء قسم (بدون Accordion — ظاهر دائماً)
  // ═══════════════════════════════════════════
  function buildTeamSection({ id, icon, iconColor, label, count, content }) {
    return `
      <div class="team-section" data-section="${id}">
        <div class="team-section-header">
          <i class="fas ${icon}" ${iconColor ? `style="color:${iconColor};"` : ''}></i>
          <span>${label}${count !== undefined ? ` (${count})` : ''}</span>
        </div>

        <div class="team-section-body">
          ${content}
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════
  // بناء الواجهة
  // ═══════════════════════════════════════════
  main.innerHTML = `
    <div class="page-header">
      <h2>العمال</h2>
    </div>

    <!-- ══════ قسم النواب ══════ -->
    ${deputies.length > 0 ? buildTeamSection({
      id: 'deputies',
      icon: 'fa-star',
      iconColor: '#fbbf24',
      label: 'النواب',
      count: deputies.length,
      content: `<div class="team-grid">${deputies.map(w => buildMemberCard(w, 'deputy')).join('')}</div>`,
    }) : `
      <div class="empty-state">
        <i class="fas fa-star" style="color:#d4d4d4;"></i>
        <p>لا يوجد نواب</p>
      </div>
    `}

    <!-- ══════ قسم العمال ══════ -->
    ${workers.length > 0 ? buildTeamSection({
      id: 'workers',
      icon: 'fa-users',
      iconColor: '#171717',
      label: 'العمال',
      count: workers.length,
      content: `<div class="team-grid">${workers.map(w => buildMemberCard(w, 'worker')).join('')}</div>`,
    }) : `
      <div class="empty-state">
        <i class="fas fa-users" style="color:#d4d4d4;"></i>
        <p>لا يوجد عمال</p>
      </div>
    `}
  `;
});