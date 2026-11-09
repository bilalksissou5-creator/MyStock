// ============================================
// صفحة البطاقة البنكية (Gumroad Integration)
// ============================================

// ⚠️ رابط الباقة الأساسية (الذي يفتح عند إضافة بطاقة جديدة)
const GUMROAD_LINK = 'https://sissou7.gumroad.com/l/bpqhes'; 

document.addEventListener('DOMContentLoaded', async () => {
  const session = await window.authReadyPromise;
  const user = session?.user;

  if (!user) {
    window.location.replace('/login.html');
    return;
  }

  renderLayout('profile.html');
  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('bc_title_full');

  const main = document.getElementById('main-content');
  if (!main) return;

  const { data: profile } = await db.from('profiles').select('organization_id, full_name, role').eq('id', user.id).maybeSingle();
  const { data: card } = await db.from('bank_cards').select('*').eq('profile_id', user.id).maybeSingle();
  
  let subscription = null;
  if (profile?.organization_id) {
    const { data: sub } = await db.from('subscriptions').select('*').eq('organization_id', profile.organization_id).maybeSingle();
    subscription = sub;
  }

  // ✅ معالجة العودة من Gumroad بنجاح
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success' && profile?.organization_id) {
    main.innerHTML = `<div style="text-align:center; padding: 50px;"><i class="fas fa-spinner fa-spin" style="font-size:40px; color:#2563eb;"></i><h3 style="margin-top:20px;">جاري تفعيل الاشتراك...</h3></div>`;

    try {
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 يوم

      await db.from('subscriptions').upsert({
        organization_id: profile.organization_id,
        owner_id: user.id,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        plan: 'basic',
        price: 150,
        currency: 'MAD',
        billing_cycle: 'monthly'
      }, { onConflict: 'organization_id' });

      await db.from('bank_cards').upsert({
        profile_id: user.id,
        organization_id: profile.organization_id,
        last4: 'GUMR',
        brand: 'Gumroad',
        holder: profile.full_name || 'User',
        expiry: '**/**',
        active: true,
        deactivated_at: null
      }, { onConflict: 'profile_id' });

      await db.from('organizations').update({ payment_blocked: false }).eq('id', profile.organization_id);

      alert('✅ تم تفعيل اشتراكك بنجاح عبر Gumroad!');
      window.location.href = '/bank-card.html';
      return;
    } catch (err) {
      console.error('Activation error:', err);
      alert('حدث خطأ أثناء تفعيل الاشتراك.');
    }
  }

  const errBox = document.createElement('div');
  errBox.className = 'alert alert-error';
  errBox.style.display = 'none';

  const successBox = document.createElement('div');
  successBox.className = 'alert alert-success';
  successBox.style.display = 'none';

  function showError(msg) { errBox.textContent = msg; errBox.style.display = 'block'; }
  function showSuccess(msg) { successBox.textContent = msg; successBox.style.display = 'block'; setTimeout(() => { successBox.style.display = 'none'; }, 3000); }

  function getBrandIcon(brandName) {
    const b = (brandName || '').toLowerCase();
    if (b.includes('visa')) return '<i class="fab fa-cc-visa"></i>';
    if (b.includes('mastercard')) return '<i class="fab fa-cc-mastercard"></i>';
    if (b.includes('gumroad')) return '<i class="fas fa-shopping-bag"></i>';
    return '<i class="fas fa-credit-card"></i>';
  }

  function getGumroadUrl() {
    return `${GUMROAD_LINK}?email=${encodeURIComponent(user.email)}&wanted=true`;
  }

  function render() {
    const hasCard = !!card?.last4;
    const isActive = card?.active !== false;
    const isBlocked = new URLSearchParams(window.location.search).get('blocked') === '1';

    main.innerHTML = `
      <div class="page-header">
        <h2>${tr('bc_title')}</h2>
        <a href="/profile-dashboard.html" class="btn-secondary">
          <i class="fas fa-arrow-right"></i>
          <span>${tr('prod_detail_back')}</span>
        </a>
      </div>
    `;

    if (isBlocked) {
      const blockedMsg = document.createElement('div');
      blockedMsg.className = 'alert alert-error';
      blockedMsg.style.background = '#fef2f2'; blockedMsg.style.border = '2px solid #dc2626';
      blockedMsg.style.color = '#991b1b'; blockedMsg.style.fontWeight = '600';
      blockedMsg.innerHTML = `<i class="fas fa-lock"></i> <strong>${tr('bc_blocked_msg')}</strong>`;
      main.appendChild(blockedMsg);
    }

    main.appendChild(errBox);
    main.appendChild(successBox);

    const wrapper = document.createElement('div');
    wrapper.className = 'bank-card-wrapper';

    if (hasCard) {
      const statusBadge = isActive
        ? `<div class="bc-default-badge"><i class="fas fa-check-circle"></i><span>${tr('bc_default')}</span></div>`
        : `<div class="bc-inactive-badge"><i class="fas fa-exclamation-circle"></i><span>${tr('bc_inactive')}</span></div>`;

      const actions = isActive
        ? `<button type="button" class="btn-danger full-width" id="deactivate-btn">
             <i class="fas fa-ban"></i>
             <span>${tr('bc_deactivate')}</span>
           </button>
           <a href="${getGumroadUrl()}" class="btn-secondary full-width" style="margin-top:8px;">
             <i class="fas fa-plus"></i>
             <span>${tr('bc_add_new')}</span>
           </a>`
        : `<a href="${getGumroadUrl()}" class="btn-primary full-width" style="margin-top:8px;">
             <i class="fas fa-plus"></i>
             <span>${tr('bc_add_new')}</span>
           </a>`;

      wrapper.innerHTML = `
        <div class="bank-card-container">
          <div class="bank-card-visual ${isActive ? '' : 'inactive'}">
            <div class="bank-card-front">
              <div class="bc-top">
                <span class="bc-brand">${getBrandIcon(card.brand)}</span>
                <span class="bc-label">${card.brand || 'Card'}</span>
              </div>
              <div class="bc-number">•••• •••• •••• ${card.last4}</div>
              <div class="bc-bottom">
                <div class="bc-field">
                  <span class="bc-field-label">${tr('pay_card_holder')}</span>
                  <span class="bc-field-value">${card.holder || '—'}</span>
                </div>
                <div class="bc-field">
                  <span class="bc-field-label">${tr('pay_card_expires')}</span>
                  <span class="bc-field-value">${card.expiry || 'MM/YY'}</span>
                </div>
              </div>
              ${!isActive ? `<div class="bc-inactive-overlay"><i class="fas fa-ban"></i></div>` : ''}
            </div>
          </div>
        </div>

        ${statusBadge}

        ${subscription?.status === 'active' ? `
          <div class="bc-subscription-info">
            <div class="bc-info-row">
              <i class="fas fa-crown"></i>
              <span>${tr('bc_sub_status')}: <strong>${tr('bc_sub_active')}</strong></span>
            </div>
            ${subscription.expires_at ? `
              <div class="bc-info-row">
                <i class="fas fa-calendar"></i>
                <span>${tr('bc_sub_expires')}: <strong>${new Date(subscription.expires_at).toLocaleDateString()}</strong></span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="bank-card-actions">
          ${actions}
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="bank-card-empty">
          <i class="fas fa-credit-card"></i>
          <p>${tr('bc_empty')}</p>
          <small>${tr('bc_empty_hint')}</small>
        </div>

        <div class="bank-card-actions">
          <a href="/subscription.html" class="btn-primary full-width">
            <i class="fas fa-credit-card"></i>
            <span>${tr('bc_subscribe_now')}</span>
          </a>
        </div>
      `;
    }

    main.appendChild(wrapper);

    document.getElementById('deactivate-btn')?.addEventListener('click', async () => {
      if (!confirm(tr('bc_confirm_deactivate'))) return;

      const btn = document.getElementById('deactivate-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const now = new Date().toISOString();
      const { error } = await db.from('bank_cards').update({ active: false, deactivated_at: now, warning_sent: 0 }).eq('profile_id', user.id);

      if (error) {
        showError(error.message); btn.disabled = false; btn.querySelector('span').textContent = tr('bc_deactivate');
      } else {
        card.active = false; card.deactivated_at = now;
        showSuccess(tr('bc_deactivated'));
        setTimeout(() => render(), 800);
      }
    });
  }

  render();
});