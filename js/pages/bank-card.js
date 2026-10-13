// ============================================
// صفحة البطاقة البنكية
// ✅ عرض + إلغاء/إعادة تفعيل + إضافة جديدة
// ✅ إعادة تعيين التحذيرات عند إعادة التفعيل
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('bc_title_full');

  const main = document.getElementById('main-content');

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const errBox = document.createElement('div');
  errBox.className = 'alert alert-error';
  errBox.style.display = 'none';

  const successBox = document.createElement('div');
  successBox.className = 'alert alert-success';
  successBox.style.display = 'none';

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { successBox.style.display = 'none'; }, 3000);
  }

  function getBrandIcon(brandName) {
    const b = (brandName || '').toLowerCase();
    if (b.includes('visa')) return '<i class="fab fa-cc-visa"></i>';
    if (b.includes('mastercard')) return '<i class="fab fa-cc-mastercard"></i>';
    if (b.includes('amex') || b.includes('american')) return '<i class="fab fa-cc-amex"></i>';
    if (b.includes('discover')) return '<i class="fab fa-cc-discover"></i>';
    if (b.includes('apple')) return '<i class="fab fa-apple-pay"></i>';
    if (b.includes('google')) return '<i class="fab fa-google-pay"></i>';
    return '<i class="fas fa-credit-card"></i>';
  }

  // ═══════════════════════════════════════════
  // عرض الصفحة
  // ═══════════════════════════════════════════
  function render() {
    const hasCard = !!profile?.bank_card_last4;
    const isActive = profile?.bank_card_active === true;

    // ⚠️ تحقق إذا كان المستخدم قادماً من إعادة توجيه "blocked"
    const params = new URLSearchParams(window.location.search);
    const isBlocked = params.get('blocked') === '1';

    main.innerHTML = `
      <div class="page-header">
        <h2>${tr('bc_title')}</h2>
        <a href="/profile-dashboard.html" class="btn-secondary">
          <i class="fas fa-arrow-right"></i>
          <span>${tr('prod_detail_back')}</span>
        </a>
      </div>
    `;

    // ✅ إذا قادم من "blocked"، اعرض تنبيهاً
    if (isBlocked) {
      const blockedMsg = document.createElement('div');
      blockedMsg.className = 'alert alert-error';
      blockedMsg.style.background = '#fef2f2';
      blockedMsg.style.border = '2px solid #dc2626';
      blockedMsg.style.color = '#991b1b';
      blockedMsg.style.fontWeight = '600';
      blockedMsg.innerHTML = `
        <i class="fas fa-lock" style="font-size:18px;"></i>
        <strong style="margin-inline-start:6px;">${tr('bc_blocked_msg')}</strong>
      `;
      main.appendChild(blockedMsg);
    }

    main.appendChild(errBox);
    main.appendChild(successBox);

    const wrapper = document.createElement('div');
    wrapper.className = 'bank-card-wrapper';

    if (hasCard) {
      // ═══════════ عرض البطاقة ═══════════
      const last4 = profile.bank_card_last4;
      const brand = profile.bank_card_brand || 'Card';
      const holder = profile.bank_card_holder || '—';
      const expiry = profile.bank_card_expiry || 'MM/YY';

      const statusBadge = isActive
        ? `<div class="bc-default-badge">
             <i class="fas fa-check-circle"></i>
             <span>${tr('bc_default')}</span>
           </div>`
        : `<div class="bc-inactive-badge">
             <i class="fas fa-exclamation-circle"></i>
             <span>${tr('bc_inactive')}</span>
           </div>`;

      const actions = isActive
        ? `<button type="button" class="btn-danger full-width" id="deactivate-btn">
             <i class="fas fa-ban"></i>
             <span>${tr('bc_deactivate')}</span>
           </button>`
        : `<button type="button" class="btn-primary full-width" id="reactivate-btn">
             <i class="fas fa-check"></i>
             <span>${tr('bc_reactivate')}</span>
           </button>
           <a href="/payment.html" class="btn-secondary full-width" style="margin-top:8px;">
             <i class="fas fa-plus"></i>
             <span>${tr('bc_add_new')}</span>
           </a>`;

      wrapper.innerHTML = `
        <div class="bank-card-container">
          <div class="bank-card-visual ${isActive ? '' : 'inactive'}">
            <div class="bank-card-front">
              <div class="bc-top">
                <span class="bc-brand">${getBrandIcon(brand)}</span>
                <span class="bc-label">${brand}</span>
              </div>
              <div class="bc-number">•••• •••• •••• ${last4}</div>
              <div class="bc-bottom">
                <div class="bc-field">
                  <span class="bc-field-label">${tr('pay_card_holder')}</span>
                  <span class="bc-field-value">${holder}</span>
                </div>
                <div class="bc-field">
                  <span class="bc-field-label">${tr('pay_card_expires')}</span>
                  <span class="bc-field-value">${expiry}</span>
                </div>
              </div>
              ${!isActive ? `<div class="bc-inactive-overlay"><i class="fas fa-ban"></i></div>` : ''}
            </div>

            <div class="bank-card-back">
              <div class="bc-stripe"></div>
              <div class="bc-cvv-box">
                <span class="bc-cvv-label">CVV</span>
                <span class="bc-cvv-value">•••</span>
              </div>
              <div class="bc-back-note">${tr('pay_card_test_note')}</div>
            </div>
          </div>
        </div>

        ${statusBadge}

        <div class="bank-card-actions">
          ${actions}
        </div>
      `;
    } else {
      // ═══════════ لا توجد بطاقة ═══════════
      wrapper.innerHTML = `
        <div class="bank-card-empty">
          <i class="fas fa-credit-card"></i>
          <p>${tr('bc_empty')}</p>
          <small>${tr('bc_empty_hint')}</small>
        </div>

        <div class="bank-card-actions">
          <a href="/payment.html" class="btn-primary full-width">
            <i class="fas fa-plus"></i>
            <span>${tr('bc_add')}</span>
          </a>
        </div>
      `;
    }

    main.appendChild(wrapper);

    // ═══════════════════════════════════════════
    // زر إلغاء التفعيل
    // ═══════════════════════════════════════════
    document.getElementById('deactivate-btn')?.addEventListener('click', async () => {
      if (!confirm(tr('bc_confirm_deactivate'))) return;

      const btn = document.getElementById('deactivate-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db
        .from('profiles')
        .update({
          bank_card_active: false,
          bank_card_deactivated_at: new Date().toISOString(),
          card_warning_sent: 0,
        })
        .eq('id', user.id);

      if (error) {
        showError(error.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = tr('bc_deactivate');
      } else {
        profile.bank_card_active = false;
        profile.bank_card_deactivated_at = new Date().toISOString();
        profile.card_warning_sent = 0;

        showSuccess(tr('bc_deactivated'));
        setTimeout(() => render(), 800);
      }
    });

    // ═══════════════════════════════════════════
    // زر إعادة التفعيل
    // ═══════════════════════════════════════════
    document.getElementById('reactivate-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('reactivate-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db
        .from('profiles')
        .update({
          bank_card_active: true,
          bank_card_deactivated_at: null,
          card_warning_sent: 0,
        })
        .eq('id', user.id);

      // ✅ فك القفل من المنظمة
      if (profile?.organization_id) {
        await db
          .from('organizations')
          .update({ payment_blocked: false })
          .eq('id', profile.organization_id);
      }

      if (error) {
        showError(error.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = tr('bc_reactivate');
      } else {
        profile.bank_card_active = true;
        profile.bank_card_deactivated_at = null;
        profile.card_warning_sent = 0;

        showSuccess(tr('bc_reactivated'));
        setTimeout(() => render(), 800);
      }
    });
  }

  render();
});