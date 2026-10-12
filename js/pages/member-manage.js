// ============================================
// صفحة إدارة عضو (للمدير فقط)
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('mm_title_full');

  const main = document.getElementById('main-content');

  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    main.innerHTML = `<div class="alert alert-error">${tr('mm_no_permission')}</div>`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id');

  if (!memberId) {
    main.innerHTML = `<div class="alert alert-error">${tr('mm_no_id')}</div>`;
    return;
  }

  const { data: member, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    main.innerHTML = `<div class="alert alert-error">${tr('mm_not_found')}</div>`;
    return;
  }

  if (member.organization_id !== myProfile.organization_id) {
    main.innerHTML = `<div class="alert alert-error">${tr('mm_not_in_org')}</div>`;
    return;
  }

  if (member.role === 'admin') {
    main.innerHTML = `<div class="alert alert-error">${tr('mm_cant_manage_admin')}</div>`;
    return;
  }

  const roleLabel = member.role === 'deputy' ? tr('wk_role_deputy') : tr('wk_role_worker');

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('mm_title')}</h2>
      <a href="/member-profile.html?id=${member.id}" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="mm-wrapper">

      <div class="mm-member-card">
        <div class="mm-avatar">
          ${member.avatar_url
            ? `<img src="${member.avatar_url}" alt="${member.full_name}">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <div class="mm-info">
          <div class="mm-name">${member.full_name ?? tr('products_no_name')}</div>
          <div class="mm-role">${roleLabel}</div>
        </div>
      </div>

      <div class="alert alert-error" id="mm-error" style="display:none;"></div>
      <div class="alert alert-success" id="mm-success" style="display:none;"></div>

      <div class="mm-section">
        <h3>${tr('mm_change_role_title')}</h3>
        <p class="mm-hint">${tr('mm_change_role_hint')}</p>

        <button type="button" class="btn-primary full-width" id="change-role-btn">
          <i class="fas fa-arrows-rotate"></i>
          <span>${member.role === 'deputy' ? tr('mm_demote') : tr('mm_promote')}</span>
        </button>
      </div>

      <div class="mm-section mm-danger">
        <h3>${tr('mm_remove_title')}</h3>
        <p class="mm-hint">${tr('mm_remove_hint')}</p>

        <button type="button" class="btn-danger full-width" id="remove-btn">
          <i class="fas fa-user-minus"></i>
          <span>${tr('mm_remove_btn')}</span>
        </button>
      </div>

    </div>
  `;

  const errBox = document.getElementById('mm-error');
  const successBox = document.getElementById('mm-success');

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
  }

  document.getElementById('change-role-btn').addEventListener('click', async () => {
    const newRole = member.role === 'deputy' ? 'worker' : 'deputy';
    const roleLabelNew = newRole === 'deputy' ? tr('wk_role_deputy') : tr('wk_role_worker');

    if (!confirm(`${tr('mm_confirm_role')} ${member.full_name} ${tr('prod_detail_to')} ${roleLabelNew}?`)) return;

    const btn = document.getElementById('change-role-btn');
    btn.disabled = true;
    btn.querySelector('span').textContent = tr('mm_changing');

    const { error } = await db.rpc('change_member_role', {
      member_id: member.id,
      new_role: newRole,
    });

    btn.disabled = false;
    btn.querySelector('span').textContent = member.role === 'deputy' ? tr('mm_demote') : tr('mm_promote');

    if (error) {
      showError(tr('prod_detail_err') + ' ' + error.message);
    } else {
      showSuccess(`${tr('mm_success_role')} ${roleLabelNew}`);
      setTimeout(() => {
        window.location.href = `/member-profile.html?id=${member.id}`;
      }, 1500);
    }
  });

  document.getElementById('remove-btn').addEventListener('click', async () => {
    if (!confirm(`${tr('mm_confirm_remove_1')} ${member.full_name} ${tr('mm_confirm_remove_1b')}`)) return;
    if (!confirm(`${tr('mm_confirm_remove_2')} ${member.full_name}.`)) return;

    const btn = document.getElementById('remove-btn');
    btn.disabled = true;
    btn.querySelector('span').textContent = tr('mm_removing');

    const { error } = await db.rpc('remove_member', {
      member_id: member.id,
    });

    btn.disabled = false;
    btn.querySelector('span').textContent = tr('mm_remove_btn');

    if (error) {
      showError(tr('prod_detail_err') + ' ' + error.message);
    } else {
      showSuccess(tr('mm_success_remove'));
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1500);
    }
  });

});