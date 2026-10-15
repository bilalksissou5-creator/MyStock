// ============================================
// صفحة الاشتراك (One UI Style)
// ✅ 3 بطاقات اشتراك + Lemon Squeezy Checkout
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
  // ✅ روابط Lemon Squeezy لكل باقة
  // ⚠️ استبدل هذه الروابط بروابطك الفعلية
  // ═══════════════════════════════════════════
  const PLAN_LINKS = {
    basic: 'https://mystock.lemonsqueezy.com/checkout/buy/BASIC_LINK_HERE',
    pro: 'https://mystock.lemonsqueezy.com/checkout/buy/PRO_LINK_HERE',
    advanced: 'https://mystock.lemonsqueezy.com/checkout/buy/ADVANCED_LINK_HERE',
  };

  // ═══════════════════════════════════════════
  // جلب بروفايل المستخدم
  // ═══════════════════════════════════════════
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, role, full_name')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // ═══════════════════════════════════════════
  // جلب الاشتراك الحالي
  // ═══════════════════════════════════════════
  let subscription = null;
  if (profile?.organization_id) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    subscription = sub;
  }

  // ═══════════════════════════════════════════
  // ✅ إذا كان الاشتراك نشطاً → حول إلى لوحة التحكم
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // ✅ إذا لم يكن المدير → انتظار
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // ✅ إذا كان الاشتراك pending
  // ═══════════════════════════════════════════
  if (subscription?.status === 'pending' && subscription.started_at) {
    renderPending(subscription);
    return;
  }

  // ═══════════════════════════════════════════
  // ✅ عرض البطاقات الثلاث
  // ═══════════════════════════════════════════
  renderPlans();

  // ═══════════════════════════════════════════
  // الدوال
  // ═══════════════════════════════════════════

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

    // ✅ ربط أزرار الاشتراك
    container.querySelectorAll('[data-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const planId = btn.dataset.plan;
        const link = PLAN_LINKS[planId];

        if (!link || link.includes('LINK_HERE')) {
          alert(tr('sub_link_missing'));
          return;
        }

        window.location.href = link;
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

  // ═══════════════════════════════════════════
  // عرض "قيد الانتظار"
  // ═══════════════════════════════════════════
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