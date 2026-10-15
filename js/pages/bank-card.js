// ============================================
// صفحة البطاقة البنكية (Lemon Squeezy)
// ✅ عرض البطاقة من profiles (يُملأ عبر Webhook)
// ✅ إذا لا توجد بطاقة → زر "اشترك الآن"
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

  // جلب الاشتراك
  let subscription = null;
  if (profile?.organization_id) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    subscription = sub;
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

  function render() {
    const hasCard = !!profile?.bank_card_last4;
    const isActive = profile?.bank_card_active !== false && hasCard;

    main.innerHTML = `
      <div class="page-header">
        <h2>${tr('bc_title')}</h2>
        <a href="/profile-dashboard.html" class="btn-secondary">
          <i class="fas fa-arrow-right"></i>
          <span>${tr('prod_detail_back')}</span>
        </a>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'bank-card-wrapper';

    if (hasCard) {
      // ═══════════ عرض البطاقة ═══════════
      const last4 = profile.bank_card_last4;
      const brand = profile.bank_card_brand || 'Card';
      const holder = profile.bank_card_holder || '—';
      const expiry = profile.bank_card_expiry || 'MM/YY';

      wrapper.innerHTML = `
        <div class="bank-card-container">
          <div class="bank-card-visual">
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

        <div class="bc-default-badge">
          <i class="fas fa-check-circle"></i>
          <span>${tr('bc_default')}</span>
        </div>

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
          <a href="/subscription.html" class="btn-secondary full-width">
            <i class="fas fa-sliders"></i>
            <span>${tr('bc_manage_subscription')}</span>
          </a>
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
          <a href="/subscription.html" class="btn-primary full-width">
            <i class="fas fa-credit-card"></i>
            <span>${tr('bc_subscribe_now')}</span>
          </a>
        </div>
      `;
    }

    main.appendChild(wrapper);
  }

  render();
});