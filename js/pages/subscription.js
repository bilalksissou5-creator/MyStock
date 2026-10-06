// ============================================
// صفحة الاشتراك
// ✅ تُعرض للمدير فقط (بعد التسجيل أو عند انتهاء الاشتراك)
// ✅ زر "طلب الاشتراك" → يُحوّل إلى payment.html
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('subscription-content');

  // 1. جلب بروفايل المستخدم
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    container.innerHTML = `
      <div class="sub-box">
        <div class="alert alert-error">لا يمكن تحديد المنظمة</div>
        <button class="btn-secondary full-width" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i>
          <span>تسجيل الخروج</span>
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
        <h2>بانتظار تفعيل الاشتراك</h2>
        <p class="sub-text">
          مدير المنظمة لم يُفعّل الاشتراك بعد.
          <br>
          يرجى التواصل معه.
        </p>
        <button class="btn-secondary full-width" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i>
          <span>تسجيل الخروج</span>
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

        <h2>اشترك في MyStock</h2>
        <p class="sub-text">
          للاستفادة من جميع الميزات، يرجى تفعيل الاشتراك الشهري.
        </p>

        <div class="plan-card">
          <div class="plan-header">
            <h3>الخطة الأساسية</h3>
            <div class="plan-price">
              <span class="price-value">150</span>
              <span class="price-currency">DH / شهرياً</span>
            </div>
          </div>

          <ul class="plan-features">
            <li><i class="fas fa-check"></i> عدد غير محدود من العمال</li>
            <li><i class="fas fa-check"></i> عدد غير محدود من المنتجات</li>
            <li><i class="fas fa-check"></i> إيصالات بيع غير محدودة</li>
            <li><i class="fas fa-check"></i> إدارة الموردين والفواتير</li>
            <li><i class="fas fa-check"></i> إشعارات فورية</li>
            <li><i class="fas fa-check"></i> دعم فني</li>
          </ul>
        </div>

        <a href="/payment.html" class="btn-primary full-width">
          <i class="fas fa-credit-card"></i>
          <span>الاشتراك الآن (150 DH)</span>
        </a>

        <button class="btn-secondary full-width" onclick="logout()" style="margin-top:8px;">
          <i class="fas fa-right-from-bracket"></i>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    `;
  }

  // ✅ عرض "قيد الانتظار"
  function renderPending({ subscription }) {
    const sentAt = subscription.started_at
      ? new Date(subscription.started_at).toLocaleString('ar-MA')
      : '—';

    container.innerHTML = `
      <div class="sub-box">
        <div class="sub-icon waiting">
          <i class="fas fa-hourglass-half"></i>
        </div>

        <h2>طلبك قيد المراجعة</h2>
        <p class="sub-text">
          تم استلام طلب الاشتراك بنجاح.
          <br>
          سيتم التواصل معك في أقرب وقت.
        </p>

        <div class="pending-details">
          <div class="pending-row">
            <span>رقم الطلب:</span>
            <strong>${subscription.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div class="pending-row">
            <span>الخطة:</span>
            <strong>الخطة الأساسية</strong>
          </div>
          <div class="pending-row">
            <span>المبلغ:</span>
            <strong>150 DH / شهرياً</strong>
          </div>
          <div class="pending-row">
            <span>تاريخ الطلب:</span>
            <strong>${sentAt}</strong>
          </div>
        </div>

        <div class="sub-actions">
          <a href="/payment.html" class="btn-primary full-width">
            <i class="fas fa-credit-card"></i>
            <span>إتمام الدفع الآن</span>
          </a>

          <button class="btn-secondary full-width" onclick="logout()">
            <i class="fas fa-right-from-bracket"></i>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    `;
  }
});