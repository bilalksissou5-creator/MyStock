// ============================================
// صفحة الدفع — إتمام الاشتراك
// ✅ محاكاة دفع (تجريبي)
// ✅ تفعيل الاشتراك بعد "الدفع"
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('payment-content');

  // 1. جلب البروفايل
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id || profile.role !== 'admin') {
    container.innerHTML = `
      <div class="pay-box">
        <div class="alert alert-error">هذه الصفحة للمدير فقط</div>
        <a href="/subscription.html" class="btn-secondary full-width">
          <i class="fas fa-arrow-right"></i>
          <span>العودة</span>
        </a>
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

  // 3. بناء الواجهة
  container.innerHTML = `
    <div class="pay-box">

      <!-- ══════ الرأس ══════ -->
      <div class="pay-header">
        <div class="pay-logo">MyStock</div>
        <h2>إتمام الدفع</h2>
        <p class="pay-subtitle">أدخل بيانات بطاقتك البنكية لتفعيل الاشتراك</p>
      </div>

      <!-- ══════ ملخص الطلب ══════ -->
      <div class="pay-summary">
        <h3>ملخص الطلب</h3>
        <div class="summary-row">
          <span>الخطة</span>
          <strong>الأساسية</strong>
        </div>
        <div class="summary-row">
          <span>المدة</span>
          <strong>شهرياً</strong>
        </div>
        <div class="summary-row total">
          <span>المبلغ الإجمالي</span>
          <strong>150.00 DH</strong>
        </div>
      </div>

      <!-- ══════ تنبيهات ══════ -->
      <div class="alert alert-error" id="pay-error" style="display:none;"></div>
      <div class="alert alert-success" id="pay-success" style="display:none;"></div>

      <!-- ══════ بيانات البطاقة ══════ -->
      <div class="pay-card">
        <h3>
          <i class="fas fa-credit-card"></i>
          بيانات البطاقة
        </h3>

        <!-- رقم البطاقة -->
        <div class="form-group">
          <label>رقم البطاقة</label>
          <div class="input-wrap">
            <input
              type="text"
              id="card-number"
              placeholder="0000 0000 0000 0000"
              inputmode="numeric"
              maxlength="19"
              dir="ltr"
              autocomplete="cc-number">
            <span class="card-brand" id="card-brand">
              <i class="fas fa-credit-card"></i>
            </span>
          </div>
        </div>

        <!-- تاريخ الانتهاء + CVV -->
        <div class="pay-row">
          <div class="form-group">
            <label>تاريخ الانتهاء</label>
            <input
              type="text"
              id="card-expiry"
              placeholder="MM/YY"
              inputmode="numeric"
              maxlength="5"
              dir="ltr"
              autocomplete="cc-exp">
          </div>
          <div class="form-group">
            <label>CVV</label>
            <input
              type="text"
              id="card-cvv"
              placeholder="123"
              inputmode="numeric"
              maxlength="4"
              dir="ltr"
              autocomplete="cc-csc">
          </div>
        </div>

        <!-- اسم حامل البطاقة -->
        <div class="form-group">
          <label>اسم حامل البطاقة</label>
          <input
            type="text"
            id="card-name"
            placeholder="الاسم كما هو على البطاقة"
            autocomplete="cc-name">
        </div>
      </div>

      <!-- ══════ شارة الأمان ══════ -->
      <div class="pay-security">
        <i class="fas fa-lock"></i>
        <span>دفع آمن ومشفّر بالكامل</span>
      </div>

      <!-- ══════ زر الدفع ══════ -->
      <button type="button" class="btn-pay" id="pay-btn">
        <i class="fas fa-lock"></i>
        <span>ادفع 150.00 DH</span>
      </button>

      <a href="/subscription.html" class="btn-cancel">
        <i class="fas fa-arrow-right"></i>
        <span>إلغاء والعودة</span>
      </a>

      <!-- ══════ تحذير تجريبي ══════ -->
      <p class="pay-warning">
        <i class="fas fa-info-circle"></i>
        هذه صفحة تجريبية — لن يتم خصم أي مبلغ فعلياً
      </p>

    </div>
  `;

  // ============================================
  // المراجع
  // ============================================
  const numberInput = document.getElementById('card-number');
  const expiryInput = document.getElementById('card-expiry');
  const cvvInput = document.getElementById('card-cvv');
  const nameInput = document.getElementById('card-name');
  const brandEl = document.getElementById('card-brand');
  const payBtn = document.getElementById('pay-btn');
  const errBox = document.getElementById('pay-error');
  const successBox = document.getElementById('pay-success');

  // ============================================
  // تنسيق رقم البطاقة (1234 5678 9012 3456)
  // ============================================
  numberInput.addEventListener('input', () => {
    let value = numberInput.value.replace(/\D/g, '');
    value = value.slice(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    numberInput.value = value;

    // ✅ نوع البطاقة
    const firstDigit = value.charAt(0);
    const first2 = value.replace(/\s/g, '').slice(0, 2);

    if (firstDigit === '4') {
      brandEl.innerHTML = '<i class="fab fa-cc-visa" style="color:#1a1f71;"></i>';
    } else if (first2 >= '51' && first2 <= '55') {
      brandEl.innerHTML = '<i class="fab fa-cc-mastercard" style="color:#eb001b;"></i>';
    } else if (first2 === '34' || first2 === '37') {
      brandEl.innerHTML = '<i class="fab fa-cc-amex" style="color:#2e77bc;"></i>';
    } else {
      brandEl.innerHTML = '<i class="fas fa-credit-card" style="color:#a3a3a3;"></i>';
    }
  });

  // ============================================
  // تنسيق تاريخ الانتهاء (MM/YY)
  // ============================================
  expiryInput.addEventListener('input', () => {
    let value = expiryInput.value.replace(/\D/g, '');
    value = value.slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    expiryInput.value = value;
  });

  // ============================================
  // CVV (أرقام فقط)
  // ============================================
  cvvInput.addEventListener('input', () => {
    cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4);
  });

  // ============================================
  // الدفع
  // ============================================
  payBtn.addEventListener('click', async () => {
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const number = numberInput.value.replace(/\s/g, '');
    const expiry = expiryInput.value;
    const cvv = cvvInput.value;
    const holderName = nameInput.value.trim();

    // ✅ التحقق
    if (number.length !== 16) {
      showError('رقم البطاقة يجب أن يكون 16 رقماً');
      numberInput.focus();
      return;
    }

    if (expiry.length !== 5) {
      showError('تاريخ الانتهاء يجب أن يكون MM/YY');
      expiryInput.focus();
      return;
    }

    if (cvv.length < 3) {
      showError('CVV يجب أن يكون 3 أرقام على الأقل');
      cvvInput.focus();
      return;
    }

    if (!holderName) {
      showError('اسم حامل البطاقة مطلوب');
      nameInput.focus();
      return;
    }

    // ✅ بدء "الدفع"
    payBtn.disabled = true;
    payBtn.querySelector('span').textContent = 'جارٍ معالجة الدفع...';
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جارٍ معالجة الدفع...</span>';

    try {
      // ✅ محاكاة تأخير (2 ثانية)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ✅ تفعيل الاشتراك
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 يوم

      if (subscription?.id) {
        // تحديث الاشتراك الموجود
        const { error } = await db
          .from('subscriptions')
          .update({
            status: 'active',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
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
            status: 'active',
            price: 150,
            currency: 'MAD',
            billing_cycle: 'monthly',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (error) throw error;
      }

      // ✅ إشعار النجاح
      successBox.textContent = '✅ تم الدفع بنجاح! جارٍ تحويلك...';
      successBox.style.display = 'block';

      payBtn.innerHTML = '<i class="fas fa-check"></i> <span>تم الدفع بنجاح</span>';

      // ✅ تحويل إلى dashboard
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);

    } catch (err) {
      payBtn.disabled = false;
      payBtn.innerHTML = '<i class="fas fa-lock"></i> <span>ادفع 150.00 DH</span>';
      showError('خطأ: ' + err.message);
    }
  });

  function showError(msg) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
});