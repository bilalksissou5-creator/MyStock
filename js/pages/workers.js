// ============================================
// صفحة العمال — النواب + العمال فقط
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('workers/list.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('wk_title_full');

  const main = document.getElementById('main-content');

  const { data: myProfile } = await db
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!myProfile?.organization_id) {
    main.innerHTML = `<div class="alert alert-error">${tr('sub_no_org')}</div>`;
    return;
  }

  const { data: members, error } = await db
    .from('profiles')
    .select('*')
    .eq('organization_id', myProfile.organization_id)
    .order('created_at', { ascending: true });

  if (error) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')} ${error.message}</div>`;
    return;
  }

  const nonAdminMembers = (members ?? []).filter(m => m.role !== 'admin');
  const deputies = nonAdminMembers.filter(m => m.role === 'deputy');
  const workers = nonAdminMembers.filter(m => m.role === 'worker');

  function buildMemberCard(m, type) {
    const isOnline = typeof isUserOnline === 'function' && isUserOnline(m);
    const starClass = type === 'deputy' ? 'deputy-star' : 'worker-star';
    const roleLabel = type === 'deputy' ? tr('wk_role_deputy') : tr('wk_role_worker');
    const statusTitle = isOnline ? tr('wk_online') : tr('wk_offline');

    return `
      <a href="/member-profile.html?id=${m.id}" class="member-card member-card-link">
        <div class="member-avatar-wrap">
          <div class="member-avatar">
            ${m.avatar_url
              ? `<img src="${m.avatar_url}" alt="${m.full_name}">`
              : `<i class="fas fa-user"></i>`}
          </div>
          <span class="member-status-dot ${isOnline ? 'online' : 'offline'}"
                title="${statusTitle}"></span>
        </div>

        <div class="member-name-row">
          <span class="member-name">${m.full_name ?? tr('products_no_name')}</span>
          <i class="fas fa-star member-star-icon ${starClass}"></i>
        </div>

        <div class="member-role ${type}">${roleLabel}</div>
      </a>
    `;
  }

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

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('wk_title')}</h2>
    </div>

    ${deputies.length > 0 ? buildTeamSection({
      id: 'deputies',
      icon: 'fa-star',
      iconColor: '#fbbf24',
      label: tr('wk_deputies'),
      count: deputies.length,
      content: `<div class="team-grid">${deputies.map(w => buildMemberCard(w, 'deputy')).join('')}</div>`,
    }) : `
      <div class="empty-state">
        <i class="fas fa-star" style="color:#d4d4d4;"></i>
        <p>${tr('wk_no_deputies')}</p>
      </div>
    `}

    ${workers.length > 0 ? buildTeamSection({
      id: 'workers',
      icon: 'fa-users',
      iconColor: '#171717',
      label: tr('wk_workers'),
      count: workers.length,
      content: `<div class="team-grid">${workers.map(w => buildMemberCard(w, 'worker')).join('')}</div>`,
    }) : `
      <div class="empty-state">
        <i class="fas fa-users" style="color:#d4d4d4;"></i>
        <p>${tr('wk_no_workers')}</p>
      </div>
    `}
  `;
});