// ============================================
// صفحة الاشتراك (One UI Style)
// ✅ 3 بطاقات اشتراك + Lemon Squeezy Checkout
// ✅ تأثير اختيار عند الضغط
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('sub_title_full');

  const container = document.getElementById('subscription-content');

  // ═══════════════════════════════════════════
  // ✅ روابط Lemon Squeezy الفعلية
  // ═══════════════════════════════════════════
  const PLAN_LINKS = {
    basic: 'https://mystock.lemonsqueezy.com/checkout/buy/8fbf8e0d-0f4d-486d-8873-d3506dd637f4',
    pro: 'https://mystock.lemonsqueezy.com/checkout/buy/9092659f-0002-49c8-8595-8babb4ea06d8',
    advanced: 'https://mystock.lemonsqueezy.com/checkout/buy/11270e93-e8d7-4a63-b6f7-a3424e168361',
  };

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, role, full_name')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  let subscription = null;
  if (profile?.organization_id) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    subscription = sub;
  }

  if (subscription?.status === 'active') {
    const expiresAt = subscription.expires_at
      ? new Date(subscription.expires_at)
      : null;
    const isExpired = expiresAt && expiresAt < new Date();

    if (!isExpired && isAdmin) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  if (!isAdmin) {
    container.innerHTML = `
      <div class="sub-box">
        <div class="sub-icon waiting">
          <i class="fas fa-clock"></i>
        </div>
        <h2>${tr('sub_wait_title')}</h2>
        <p class="sub-text">${tr('sub_wait_text')}</p>
        <button class="btn-secondary full-width" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i>
          <span>${tr('sub_logout')}</span>
        </button>
      </div>
    `;
    return;
  }

  if (subscription?.status === 'pending' && subscription.started_at) {
    renderPending(subscription);
    return;
  }

  renderPlans();

  function renderPlans() {
    container.innerHTML = `
      <div class="sub-header">
        <h2>${tr('sub_choose_plan')}</h2>
        <p>${tr('sub_choose_plan_desc')}</p>
      </div>

      ${buildPlanCard({
        id: 'basic',
        name: tr('sub_plan_basic'),
        price: '199',
        badge: null,
        features: [
          { icon: 'fa-users', label: tr('sub_feat_users'), value: '10' },
          { icon: 'fa-box', label: tr('sub_feat_products'), value: '500' },
          { icon: 'fa-file-invoice', label: tr('sub_feat_invoices'), value: '100' },
          { icon: 'fa-print', label: tr('sub_feat_export'), value: '✓' },
          { icon: 'fa-headset', label: tr('sub_feat_support'), value: tr('sub_support_email') },
        ],
      })}

      ${buildPlanCard({
        id: 'pro',
        name: tr('sub_plan_pro'),
        price: '299',
        badge: tr('sub_most_popular'),
        popular: true,
        features: [
          { icon: 'fa-users', label: tr('sub_feat_users'), value: '30' },
          { icon: 'fa-box', label: tr('sub_feat_products'), value: '5,000' },
          { icon: 'fa-file-invoice', label: tr('sub_feat_invoices'), value: '500' },
          { icon: 'fa-print', label: tr('sub_feat_export'), value: '✓' },
          { icon: 'fa-headset', label: tr('sub_feat_support'), value: tr('sub_support_email_wa') },
        ],
      })}

      ${buildPlanCard({
        id: 'advanced',
        name: tr('sub_plan_advanced'),
        price: '499',
        badge: null,
        features: [
          { icon: 'fa-users', label: tr('sub_feat_users'), value: tr('sub_unlimited'), unlimited: true },
          { icon: 'fa-box', label: tr('sub_feat_products'), value: tr('sub_unlimited'), unlimited: true },
          { icon: 'fa-file-invoice', label: tr('sub_feat_invoices'), value: tr('sub_unlimited'), unlimited: true },
          { icon: 'fa-print', label: tr('sub_feat_export'), value: '✓' },
          { icon: 'fa-headset', label: tr('sub_feat_support'), value: '24/7' },
        ],
      })}

      <button class="btn-secondary full-width" onclick="logout()" style="margin-top:12px;">
        <i class="fas fa-right-from-bracket"></i>
        <span>${tr('sub_logout')}</span>
      </button>
    `;

    container.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.plan-btn')) return;

        container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    container.querySelectorAll('[data-plan]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        const planId = btn.dataset.plan;
        const link = PLAN_LINKS[planId];

        const card = btn.closest('.plan-card');
        container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        setTimeout(() => {
          if (!link) {
            alert(tr('sub_link_missing'));
            return;
          }
          window.location.href = link;
        }, 300);
      });
    });
  }

  function buildPlanCard({ id, name, price, badge, popular, features }) {
    return `
      <div class="plan-card ${popular ? 'popular' : ''}">
        ${badge ? `
          <div class="plan-badge">
            <i class="fas fa-star"></i>
            <span>${badge}</span>
          </div>
        ` : ''}

        <div class="plan-header">
          <h3 class="plan-name">${name}</h3>
          <div class="plan-price">
            <span class="plan-price-value">${price}</span>
            <span class="plan-price-currency">MAD</span>
          </div>
          <span class="plan-price-period">${tr('sub_per_month')}</span>
        </div>

        <div class="plan-features">
          ${features.map(f => `
            <div class="feature-row">
              <i class="fas ${f.icon}"></i>
              <span class="feature-label">${f.label}</span>
              <span class="feature-value ${f.unlimited ? 'unlimited' : ''}">${f.value}</span>
            </div>
          `).join('')}
        </div>

        <button type="button" class="plan-btn" data-plan="${id}">
          <i class="fas fa-credit-card"></i>
          <span>${tr('sub_subscribe_now')}</span>
        </button>
      </div>
    `;
  }

  function renderPending(sub) {
    const sentAt = sub.started_at
      ? new Date(sub.started_at).toLocaleString()
      : '—';

    container.innerHTML = `
      <div class="sub-box">
        <div class="sub-icon waiting">
          <i class="fas fa-hourglass-half"></i>
        </div>

        <h2>${tr('sub_pending_title')}</h2>
        <p class="sub-text">${tr('sub_pending_text')}</p>

        <div class="pending-details">
          <div class="pending-row">
            <span>${tr('sub_pending_order')}</span>
            <strong>${sub.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div class="pending-row">
            <span>${tr('sub_pending_plan')}</span>
            <strong>${sub.plan || 'Basic'}</strong>
          </div>
          <div class="pending-row">
            <span>${tr('sub_pending_amount')}</span>
            <strong>${sub.price || 199} MAD</strong>
          </div>
          <div class="pending-row">
            <span>${tr('sub_pending_date')}</span>
            <strong>${sentAt}</strong>
          </div>
        </div>

        <button class="btn-secondary full-width" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i>
          <span>${tr('sub_logout')}</span>
        </button>
      </div>
    `;
  }
});