// ============================================
// صفحة الاشتراك (One UI Style)
// ✅ 3 بطاقات اشتراك + Gumroad Checkout
// ✅ دعم وضع "تغيير البطاقة" (?change=1)
// ✅ دعم كامل للترجمة + إشعار إضافة بطاقة
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
  // ✅ روابط Gumroad
  // ═══════════════════════════════════════════
  const PLAN_LINKS = {
    basic: 'https://sissou7.gumroad.com/l/bpqhes?wanted=true',
    pro: 'https://sissou7.gumroad.com/l/fzfypg?wanted=true',
    advanced: 'https://sissou7.gumroad.com/l/gobrys?wanted=true',
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
  // ✅ قراءة URL params
  // ═══════════════════════════════════════════
  const urlParams = new URLSearchParams(window.location.search);
  const isPaidReturn = urlParams.get('paid') === '1';
  const isChangeMode = urlParams.get('change') === '1';

  // ═══════════════════════════════════════════
  // ✅ التحقق من العودة من Gumroad (?paid=1)
  // ═══════════════════════════════════════════
  if (isPaidReturn && isAdmin && profile?.organization_id) {
    container.innerHTML = `
      <div class="sub-box" style="text-align:center; padding:60px 24px;">
        <div class="sub-icon" style="background:#dcfce7; margin:0 auto 20px; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-spinner fa-spin" style="font-size:32px; color:#22c55e;"></i>
        </div>
        <h2 style="margin:0 0 12px; font-size:1.4rem; font-weight:800;">${tr('sub_activating')}</h2>
        <p class="sub-text" style="color:#6b7280; font-size:14px;">${tr('sub_activating_desc')}</p>
      </div>
    `;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: updateError } = await db
      .from('subscriptions')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      // ✅✅✅ إضافة إشعار إضافة بطاقة جديدة هنا
      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({
            orgId: profile.organization_id,
            title: tr('bc_notif_new_card_title') || 'بطاقة بنكية جديدة',
            message: `${profile.full_name || tr('prod_detail_user')} ${tr('bc_notif_new_card_msg') || 'قام بإضافة بطاقة بنكية جديدة وتفعيل الاشتراك'}`,
            type: 'success',
            link: '/bank-card.html',
            userName: profile.full_name || null,
          });
        } catch (e) { console.warn(e); }
      }
    }

    setTimeout(() => {
      window.location.replace('/dashboard.html');
    }, 1500);

    return;
  }

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

  // ✅ إذا كان الاشتراك نشطاً → حول إلى لوحة التحكم (إلا في وضع التغيير)
  if (subscription?.status === 'active' && !isChangeMode) {
    const expiresAt = subscription.expires_at
      ? new Date(subscription.expires_at)
      : null;
    const isExpired = expiresAt && expiresAt < new Date();

    if (!isExpired && isAdmin) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  // ✅ إذا لم يكن المدير → انتظار
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

  // ✅ إذا كان الاشتراك pending
  if (subscription?.status === 'pending' && subscription.started_at) {
    renderPending(subscription);
    return;
  }

  // ✅ عرض البطاقات الثلاث
  renderPlans();

  // ═══════════════════════════════════════════
  // الدوال
  // ═══════════════════════════════════════════

  function renderPlans() {
    container.innerHTML = `
      <div class="sub-header">
        <h2>${isChangeMode ? tr('sub_change_plan') : tr('sub_choose_plan')}</h2>
        <p>${isChangeMode ? tr('sub_change_plan_desc') : tr('sub_choose_plan_desc')}</p>
      </div>

      ${buildPlanCard({
        id: 'basic',
        name: tr('sub_plan_basic'),
        price: '20', /* ✅ السعر الجديد */
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
        price: '30', /* ✅ السعر الجديد */
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
        price: '50', /* ✅ السعر الجديد */
        badge: null,
        features: [
          { icon: 'fa-users', label: tr('sub_feat_users'), value: tr('sub_unlimited'), unlimited: true },
          { icon: 'fa-box', label: tr('sub_feat_products'), value: tr('sub_unlimited'), unlimited: true },
          { icon: 'fa-file-invoice', label: tr('sub_feat_invoices'), value: tr('sub_unlimited'), unlimited: true },
          { icon: 'fa-print', label: tr('sub_feat_export'), value: '✓' },
          { icon: 'fa-headset', label: tr('sub_feat_support'), value: '24/7' },
        ],
      })}

      ${isChangeMode ? `
        <a href="/bank-card.html" class="btn-secondary full-width" style="margin-top:12px;">
          <i class="fas fa-arrow-right"></i>
          <span>${tr('prod_detail_back')}</span>
        </a>
      ` : `
        <button class="btn-secondary full-width" onclick="logout()" style="margin-top:12px;">
          <i class="fas fa-right-from-bracket"></i>
          <span>${tr('sub_logout')}</span>
        </button>
      `}
    `;

    // ✅ الضغط على البطاقة → تحديد
    container.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.plan-btn')) return;

        container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // ✅ أزرار الاشتراك
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
            <!-- ✅ استخدام رمز العملة من ملف الترجمة -->
            <span class="plan-price-currency">${tr('currency_symbol')}</span>
            <span class="plan-price-value">${price}</span>
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
            <!-- ✅ استخدام رمز العملة من ملف الترجمة هنا أيضاً -->
            <strong>${tr('currency_symbol')}${sub.price || 20}</strong>
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