// ============================================
// صفحة الاشتراك
// ✅ تُعرض للمدير فقط (بعد التسجيل أو عند انتهاء الاشتراك)
// ✅ تتيح حفظ طلب اشتراك (بحالة pending)
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

  // ✅ غير المدير → لا يفعل شيئاً هنا (يُوجَّه لاحقاً)
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
  // 4. المدير: عرض حالات مختلفة
  // ═══════════════════════════════════════════

  // ✅ الحالة: active → انتقل إلى dashboard
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
    // المستخدم أرسل الطلب بالفعل
    renderPending({ subscription });
    return;
  }

  // ✅ الحالة: none أو pending (بدون طلب)
  renderPlan({ subscription, profile, user });

  // ═══════════════════════════════════════════
  // 5. الدوال المساعدة
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

        <div class="alert alert-error" id="sub-error" style="display:none;"></div>
        <div class="alert alert-success" id="sub-success" style="display:none;"></div>

        <button class="btn-primary full-width" id="subscribe-btn">
          <i class="fas fa-paper-plane"></i>
          <span>طلب الاشتراك</span>
        </button>

        <button class="btn-secondary full-width" onclick="logout()" style="margin-top:8px;">
          <i class="fas fa-right-from-bracket"></i>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    `;

    const btn = document.getElementById('subscribe-btn');
    const errBox = document.getElementById('sub-error');
    const successBox = document.getElementById('sub-success');

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      successBox.style.display = 'none';
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الإرسال...';

      try {
        if (subscription?.id) {
          // تحديث الصف الموجود
          const { error } = await db
            .from('subscriptions')
            .update({
              status: 'pending',
              started_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          if (error) throw error;
        } else {
          // إنشاء جديد
          const { error } = await db
            .from('subscriptions')
            .insert({
              organization_id: profile.organization_id,
              owner_id: user.id,
              plan: 'basic',
              status: 'pending',
              price: 150,
              currency: 'MAD',
              billing_cycle: 'monthly',
              started_at: new Date().toISOString(),
            });

          if (error) throw error;
        }

        // إعادة التحميل
        window.location.reload();

      } catch (err) {
        errBox.textContent = 'خطأ: ' + err.message;
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.querySelector('span').textContent = 'طلب الاشتراك';
      }
    });
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
          سيتم التواصل معك في أقرب وقت لتفعيل الحساب.
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
          <button class="btn-primary full-width" onclick="window.location.reload()">
            <i class="fas fa-rotate"></i>
            <span>تحديث الحالة</span>
          </button>

          <a href="https://wa.me/212651306537" target="_blank" class="btn-secondary full-width">
            <i class="fab fa-whatsapp"></i>
            <span>تواصل عبر واتساب</span>
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