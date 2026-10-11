// ============================================
// صفحة الاشتراك
// ✅ تُعرض للمدير فقط (بعد التسجيل أو عند انتهاء الاشتراك)
// ✅ زر "طلب الاشتراك" → يُحوّل إلى payment.html
// ✅ يدعم الترجمة (عربية / فرنسية / إنجليزية)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // ✅ تطبيق اللغة
  if (window.applyLanguage) window.applyLanguage();

  const container = document.getElementById('subscription-content');
  const tr = (key) => (window.t ? window.t(key) : key);

  // 1. جلب بروفايل المستخدم
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    container.innerHTML = `
      <div class="sub-box">
        <div class="alert alert-error">${tr('sub_no_org')}</div>
        <button class="btn-secondary full-width" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i>
          <span>${tr('sub_logout')}</span>
        </button>
      </div>
    `;
    return;
  }

  // 2. جلب الاشتراك
  const { data: subscription } = await db
    .from('subscriptions')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  const role = profile.role;
  const isAdmin = role === 'admin';

  // ═══════════════════════════════════════════
  // 3. تحديد الحالة
  // ═══════════════════════════════════════════
  const status = subscription?.status ?? 'none';

  // ✅ غير المدير → انتظار
  if (!isAdmin) {
    container.innerHTML = `
      <div class="sub-box">
        <div class="sub-icon waiting">
          <i class="fas fa-clock"></i>
        </div>
        <h2>${tr('sub_wait_title')}</h2>
        <p class="sub-text">
          ${tr('sub_wait_text')}
        </p>
        <button class="btn-secondary full-width" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i>
          <span>${tr('sub_logout')}</span>
        </button>
      </div>
    `;
    return;
  }

  // ═══════════════════════════════════════════
  // 4. المدير
  // ═══════════════════════════════════════════

  // ✅ الحالة: active → تحقق من الانتهاء
  if (status === 'active') {
    const expiresAt = subscription.expires_at
      ? new Date(subscription.expires_at)
      : null;
    const isExpired = expiresAt && expiresAt < new Date();

    if (!isExpired) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  // ✅ الحالة: pending (طلب مُرسل)
  if (status === 'pending' && subscription.started_at) {
    renderPending({ subscription });
    return;
  }

  // ✅ الحالة: none أو pending (بدون طلب)
  renderPlan({ subscription, profile, user });

  // ═══════════════════════════════════════════
  // 5. الدوال
  // ═══════════════════════════════════════════

  // ✅ عرض الخطة
  function renderPlan({ subscription, profile, user }) {
    container.innerHTML = `
      <div class="sub-box">
        <div class="sub-icon plan">
          <i class="fas fa-crown" style="color:#fbbf24;"></i>
        </div>

        <h2>${tr('sub_plan_title')}</h2>
        <p class="sub-text">${tr('sub_plan_text')}</p>

        <div class="plan-card">
          <div class="plan-header">
            <h3>${tr('sub_plan_name')}</h3>
            <div class="plan-price">
              <span class="price-value">150</span>
              <span class="price-currency">${tr('sub_plan_price')}</span>
            </div>
          </div>

          <ul class="plan-features">
            <li><i class="fas fa-check"></i> ${tr('sub_feature_1')}</li>
            <li><i class="fas fa-check"></i> ${tr('sub_feature_2')}</li>
            <li><i class="fas fa-check"></i> ${tr('sub_feature_3')}</li>
            <li><i class="fas fa-check"></i> ${tr('sub_feature_4')}</li>
            <li><i class="fas fa-check"></i> ${tr('sub_feature_5')}</li>
            <li><i class="fas fa-check"></i> ${tr('sub_feature_6')}</li>
          </ul>
        </div>

        <a href="/payment.html" class="btn-primary full-width">
          <i class="fas fa-credit-card"></i>
          <span>${tr('sub_subscribe_now')}</span>
        </a>

        <button class="btn-secondary full-width" onclick="logout()" style="margin-top:8px;">
          <i class="fas fa-right-from-bracket"></i>
          <span>${tr('sub_logout')}</span>
        </button>
      </div>
    `;
  }

  // ✅ عرض "قيد الانتظار"
  function renderPending({ subscription }) {
    const sentAt = subscription.started_at
      ? new Date(subscription.started_at).toLocaleString()
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
            <strong>${subscription.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div class="pending-row">
            <span>${tr('sub_pending_plan')}</span>
            <strong>${tr('sub_plan_name')}</strong>
          </div>
          <div class="pending-row">
            <span>${tr('sub_pending_amount')}</span>
            <strong>150 DH</strong>
          </div>
          <div class="pending-row">
            <span>${tr('sub_pending_date')}</span>
            <strong>${sentAt}</strong>
          </div>
        </div>

        <div class="sub-actions">
          <a href="/payment.html" class="btn-primary full-width">
            <i class="fas fa-credit-card"></i>
            <span>${tr('sub_pay_now')}</span>
          </a>

          <button class="btn-secondary full-width" onclick="logout()">
            <i class="fas fa-right-from-bracket"></i>
            <span>${tr('sub_logout')}</span>
          </button>
        </div>
      </div>
    `;
  }
});