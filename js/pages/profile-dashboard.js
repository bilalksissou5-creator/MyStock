// ============================================
// لوحة معلومات المستخدم — البطاقات
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('pd_title_full');

  const main = document.getElementById('main-content');

  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!myProfile) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')}</div>`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('id') || user.id;
  const isMe = targetId === user.id;
  const isAdmin = myProfile.role === 'admin';

  if (!isMe && !isAdmin) {
    main.innerHTML = `<div class="alert alert-error">${tr('pd_no_permission')}</div>`;
    return;
  }

  const { data: target, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .single();

  if (error || !target) {
    main.innerHTML = `<div class="alert alert-error">${tr('mp_not_found')}</div>`;
    return;
  }

  if (target.organization_id !== myProfile.organization_id) {
    main.innerHTML = `<div class="alert alert-error">${tr('mm_not_in_org')}</div>`;
    return;
  }

  const { data: org } = await db
    .from('organizations')
    .select('*')
    .eq('id', myProfile.organization_id)
    .single();

  const isOnline = typeof isUserOnline === 'function' && isUserOnline(target);

  const cards = [];

  if (isAdmin) {
    cards.push({
      href: '/org-edit.html',
      icon: 'fa-building',
      title: tr('pd_org'),
      value: org?.name ?? tr('pd_my_org'),
      disabled: false,
    });
  } else {
    cards.push({
      href: null,
      icon: 'fa-building',
      title: tr('pd_org'),
      value: org?.name ?? tr('pd_my_org'),
      disabled: true,
    });
  }

  const otherCards = [
    {
      id: 'cover',
      icon: 'fa-image',
      title: tr('pd_cover'),
      value: target?.cover_url ? tr('pd_edited') : tr('pd_not_edited'),
      empty: !target?.cover_url,
    },
    {
      id: 'avatar',
      icon: 'fa-user-circle',
      title: tr('pd_avatar'),
      value: target?.avatar_url ? tr('pd_edited') : tr('pd_not_edited'),
      empty: !target?.avatar_url,
    },
    {
      id: 'name',
      icon: 'fa-user-pen',
      title: tr('pd_name'),
      value: target?.full_name || tr('pd_not_set'),
      empty: !target?.full_name,
    },
    {
      id: 'email-password',
      icon: 'fa-envelope',
      title: tr('pd_email_pwd'),
      value: isMe ? user.email : tr('pd_protected'),
      empty: false,
      disabled: !isMe,
    },
    {
      id: 'phone',
      icon: 'fa-phone',
      title: tr('rw_phone').replace(' *', ''),
      value: target?.phone || tr('pd_not_set'),
      empty: !target?.phone,
    },
  ];

  otherCards.forEach(c => {
    if (c.disabled) {
      cards.push({
        href: null,
        icon: c.icon,
        title: c.title,
        value: c.value,
        empty: c.empty,
        disabled: true,
      });
    } else {
      const canEdit = isMe;
      cards.push({
        href: canEdit
          ? `/profile-edit.html?section=${c.id}`
          : `/member-profile.html?id=${target.id}`,
        icon: c.icon,
        title: c.title,
        value: c.value,
        empty: c.empty,
        disabled: false,
      });
    }
  });

  function buildCard(card) {
    const content = `
      <div class="pd-card-left">
        <div class="pd-card-icon">
          <i class="fas ${card.icon}"></i>
        </div>
        <div class="pd-card-body">
          <div class="pd-card-title">${card.title}</div>
          <div class="pd-card-value ${card.empty ? 'empty' : ''}" dir="auto">${card.value}</div>
        </div>
      </div>
      <div class="pd-card-arrow">
        <i class="fas ${card.disabled ? 'fa-lock' : 'fa-chevron-right'}"></i>
      </div>
    `;

    if (card.disabled) {
      return `<div class="pd-card pd-card-disabled">${content}</div>`;
    }

    return `<a href="${card.href}" class="pd-card">${content}</a>`;
  }

  const title = isMe ? tr('pd_title') : `${tr('pd_title_of')} ${target.full_name ?? tr('products_no_name')}`;

  main.innerHTML = `
    <div class="page-header">
      <h2>${title}</h2>
      <a href="${isMe ? '/profile.html' : `/member-profile.html?id=${target.id}`}" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="pd-wrapper">

      <div class="pd-user-card">
        <div class="pd-user-avatar">
          ${target?.avatar_url
            ? `<img src="${target.avatar_url}" alt="avatar">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <div class="pd-user-info">
          <div class="pd-user-name">${target?.full_name ?? tr('products_no_name')}</div>
          <div class="pd-user-email">${isMe ? user.email : (target.phone ?? tr('pd_team_member'))}</div>
        </div>
      </div>

      <div class="pd-cards-list">
        ${cards.map(buildCard).join('')}
      </div>

    </div>
  `;
});