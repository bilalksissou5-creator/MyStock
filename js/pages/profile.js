// ============================================
// صفحة الملف الشخصي — تصميم Facebook + Accordion
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('pf_title_full');

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

  const isMeOnline = typeof isUserOnline === 'function' && isUserOnline(profile);

  function buildMemberCard(member, type) {
    const isOnline = typeof isUserOnline === 'function' && isUserOnline(member);
    const starClass = type === 'deputy' ? 'deputy-star' : 'worker-star';
    const roleLabel = type === 'deputy' ? tr('wk_role_deputy') : tr('wk_role_worker');
    const statusTitle = isOnline ? tr('wk_online') : tr('wk_offline');

    return `
      <a href="/member-profile.html?id=${member.id}" class="member-card member-card-link">
        <div class="member-avatar-wrap">
          <div class="member-avatar">
            ${member.avatar_url
              ? `<img src="${member.avatar_url}" alt="${member.full_name}">`
              : `<i class="fas fa-user"></i>`}
          </div>
          <span class="member-status-dot ${isOnline ? 'online' : 'offline'}"
                title="${statusTitle}"></span>
        </div>

        <div class="member-name-row">
          <span class="member-name">${member.full_name ?? tr('products_no_name')}</span>
          <i class="fas fa-star member-star-icon ${starClass}"></i>
        </div>

        <div class="member-role ${type}">${roleLabel}</div>
      </a>
    `;
  }

  function buildAdminCard(member) {
    const isOnline = typeof isUserOnline === 'function' && isUserOnline(member);
    const statusTitle = isOnline ? tr('wk_online') : tr('wk_offline');

    return `
      <a href="/member-profile.html?id=${member.id}" class="member-card member-card-admin member-card-link">
        <div class="member-avatar-wrap">
          <div class="member-avatar">
            ${member.avatar_url
              ? `<img src="${member.avatar_url}" alt="${member.full_name}">`
              : `<i class="fas fa-user"></i>`}
          </div>
          <span class="member-status-dot ${isOnline ? 'online' : 'offline'}"
                title="${statusTitle}"></span>
        </div>

        <div class="member-name-row">
          <span class="member-name">${member.full_name ?? tr('products_no_name')}</span>
          <i class="fas fa-crown member-star-icon crown-star"></i>
        </div>

        <div class="member-role admin">${tr('mp_role_admin')}</div>
      </a>
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
          ${content}
        </div>
      </div>
    `;
  }

  const roleIcon = currentRole === 'admin'
    ? '<i class="fas fa-crown info-icon" style="color:#fbbf24;"></i>'
    : currentRole === 'deputy'
      ? '<i class="fas fa-star info-icon" style="color:#fbbf24;"></i>'
      : '<i class="fas fa-users info-icon"></i>';

  const roleLabel = currentRole === 'admin'
    ? tr('mp_role_admin')
    : currentRole === 'deputy'
      ? tr('wk_role_deputy')
      : tr('wk_role_worker');

  const personalInfoContent = `
    <div class="info-list">
      <div class="info-row">
        <i class="fas fa-user info-icon"></i>
        <span class="info-text">${profile?.full_name ?? tr('products_no_name')}</span>
      </div>

      <div class="info-row">
        <i class="fas fa-envelope info-icon"></i>
        <span class="info-text" dir="ltr">${user.email}</span>
      </div>

      <div class="info-row">
        <i class="fab fa-whatsapp info-icon" style="color:#25d366;"></i>
        <span class="info-text" dir="ltr">${profile?.phone ?? '—'}</span>
      </div>

      <div class="info-row">
        ${roleIcon}
        <span class="info-text">${roleLabel}</span>
      </div>
    </div>
  `;

  main.innerHTML = `
    <div class="profile-fb-wrapper">

      <div class="profile-cover">
        ${profile?.cover_url
          ? `<img src="${profile.cover_url}" alt="cover">`
          : `<div class="cover-placeholder"></div>`}
      </div>

      <div class="profile-avatar-fb-wrap">
        <div class="profile-avatar-fb">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="avatar">`
            : `<i class="fas fa-user"></i>`}
          <span class="profile-status-dot ${isMeOnline ? 'online' : 'offline'}"
                title="${isMeOnline ? tr('wk_online') : tr('wk_offline')}"></span>
        </div>
      </div>

      <div class="profile-fb-info">
        <h3>${profile?.full_name ?? tr('products_no_name')}</h3>
        <p class="profile-fb-email" dir="ltr">${user.email}</p>
        <div class="profile-fb-badges">
          <span class="badge-role">${roleLabel}</span>
        </div>
      </div>

      <div class="profile-actions-bar">
        ${isAdminOrDeputy ? `
          <a href="/add-worker.html" class="btn-secondary">
            <i class="fas fa-user-plus"></i>
            <span>${tr('pf_add_worker')}</span>
          </a>
        ` : ''}
        <a href="/profile-dashboard.html" class="btn-primary">
          <i class="fas fa-sliders"></i>
          <span>${tr('pf_dashboard')}</span>
        </a>
      </div>

      ${buildTeamSection({
        id: 'personal-info',
        icon: 'fa-user',
        label: tr('mp_personal_info'),
        count: undefined,
        content: personalInfoContent,
      })}

      ${admin ? buildTeamSection({
        id: 'admin',
        icon: 'fa-crown',
        iconColor: '#fbbf24',
        label: tr('mp_admin'),
        count: undefined,
        content: `<div class="team-grid">${buildAdminCard(admin)}</div>`,
      }) : ''}

      ${deputies.length > 0 ? buildTeamSection({
        id: 'deputies',
        icon: 'fa-star',
        iconColor: '#fbbf24',
        label: tr('wk_deputies'),
        count: deputies.length,
        content: `<div class="team-grid">${deputies.map(w => buildMemberCard(w, 'deputy')).join('')}</div>`,
      }) : ''}

      ${workers.length > 0 ? buildTeamSection({
        id: 'workers',
        icon: 'fa-users',
        iconColor: '#171717',
        label: tr('wk_workers'),
        count: workers.length,
        content: `<div class="team-grid">${workers.map(w => buildMemberCard(w, 'worker')).join('')}</div>`,
      }) : ''}

      <div class="records-row">
        <a href="#" class="record-item" data-record="log">
          <i class="fas fa-clipboard-list"></i>
          <span>${tr('mp_log')}</span>
        </a>

        <div class="records-left">
          <a href="#" class="record-item" data-record="invoices">
            <i class="fas fa-file-invoice"></i>
            <span>${tr('mp_invoices')}</span>
          </a>

          <a href="#" class="record-item" data-record="out">
            <i class="fas fa-arrow-up-from-bracket"></i>
            <span>${tr('mp_out')}</span>
          </a>
        </div>
      </div>

      <div id="log-invoices" class="log-panel" style="display:none;">
        <div class="log-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>${tr('loading')}</span>
        </div>
      </div>

      <div id="log-out" class="log-panel" style="display:none;">
        <div class="log-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>${tr('loading')}</span>
        </div>
      </div>

    </div>
  `;

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

  const logInvoices = document.getElementById('log-invoices');
  const logOut = document.getElementById('log-out');

  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  async function loadInvoices() {
    logInvoices.innerHTML = `
      <div class="log-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>${tr('loading')}</span>
      </div>
    `;

    const { data, error } = await db
      .from('invoices')
      .select('id, invoice_number, total_qty, total_value, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logInvoices.innerHTML = `<div class="log-empty">${tr('prod_detail_err')} ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      logInvoices.innerHTML = `<div class="log-empty">${tr('inv_empty')}</div>`;
      return;
    }

    logInvoices.innerHTML = `
      <div class="log-list">
        ${data.map(inv => `
          <a href="/invoice.html?id=${encodeURIComponent(inv.invoice_number)}" class="log-row log-row-link">
            <div class="log-row-main">
              <strong>${inv.invoice_number}</strong>
              <span>${inv.total_qty ?? 0} ${tr('inv_notif_unit')} • ${Number(inv.total_value ?? 0).toFixed(2)}</span>
            </div>
            <div class="log-row-date">${new Date(inv.created_at).toLocaleDateString(locale)}</div>
          </a>
        `).join('')}
      </div>
    `;
  }

  async function loadOut() {
    logOut.innerHTML = `
      <div class="log-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>${tr('loading')}</span>
      </div>
    `;

    const { data, error } = await db
      .from('receipts')
      .select('id, receipt_number, total_qty, total_value, created_at, printed_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logOut.innerHTML = `<div class="log-empty">${tr('prod_detail_err')} ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      logOut.innerHTML = `<div class="log-empty">${tr('mp_no_out')}</div>`;
      return;
    }

    const unprintedCount = data.filter(r => !r.printed_at).length;

    logOut.innerHTML = `
      ${unprintedCount > 0 ? `
        <a href="/receipts-print.html" class="print-all-btn">
          <i class="fas fa-print"></i>
          <span>${tr('pf_print_all')} (${unprintedCount} ${tr('pf_new')})</span>
        </a>
      ` : `
        <div class="print-all-info">
          <i class="fas fa-check-circle"></i>
          <span>${tr('pf_all_printed')}</span>
        </div>
      `}

      <div class="log-list">
        ${data.map(r => `
          <a href="/receipt.html?id=${r.id}" class="log-row log-row-link">
            <div class="log-row-main">
              <strong>${r.receipt_number}</strong>
              <span>${r.total_qty ?? 0} ${tr('inv_notif_unit')} • ${Number(r.total_value ?? 0).toFixed(2)}</span>
            </div>
            <div class="log-row-date">
              ${new Date(r.created_at).toLocaleDateString(locale)}
              ${r.printed_at ? '<i class="fas fa-check" style="color:#22c55e; margin-right:4px;" title="' + tr('pf_printed') + '"></i>' : ''}
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  const btnInvoices = document.querySelector('.record-item[data-record="invoices"]');
  const btnOut = document.querySelector('.record-item[data-record="out"]');

  btnInvoices.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = logInvoices.style.display !== 'none';

    logInvoices.style.display = 'none';
    logOut.style.display = 'none';
    document.querySelectorAll('.record-item.active').forEach(x => x.classList.remove('active'));

    if (!isOpen) {
      logInvoices.style.display = 'block';
      btnInvoices.classList.add('active');
      loadInvoices();
    }
  });

  btnOut.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = logOut.style.display !== 'none';

    logInvoices.style.display = 'none';
    logOut.style.display = 'none';
    document.querySelectorAll('.record-item.active').forEach(x => x.classList.remove('active'));

    if (!isOpen) {
      logOut.style.display = 'block';
      btnOut.classList.add('active');
      loadOut();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.record-item[data-record="invoices"]')) return;
    if (e.target.closest('.record-item[data-record="out"]')) return;
    if (e.target.closest('#log-invoices')) return;
    if (e.target.closest('#log-out')) return;

    logInvoices.style.display = 'none';
    logOut.style.display = 'none';
    document.querySelectorAll('.record-item.active').forEach(x => x.classList.remove('active'));
  });
});