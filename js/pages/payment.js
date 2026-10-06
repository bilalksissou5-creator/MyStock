// ============================================
// صفحة الدفع — تصميم احترافي
// ✅ بطاقة ثلاثية الأبعاد
// ✅ مؤشر تقدم (3 خطوات)
// ✅ تحقق حي من الرقم
// ✅ Apple Pay / Google Pay (محاكاة)
// ✅ بريد إلكتروني
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
    .select('organization_id, full_name, role, phone')
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

  const userName = profile.full_name || '';

  // 3. بناء الواجهة
  container.innerHTML = `
    <div class="pay-box">

      <!-- ══════ الرأس ══════ -->
      <div class="pay-header">
        <div class="pay-logo">MyStock</div>
        <h2>إتمام الدفع الآمن</h2>
        <p class="pay-subtitle">أدخل بيانات بطاقتك البنكية لتفعيل الاشتراك</p>
      </div>

      <!-- ══════ مؤشر التقدم ══════ -->
      <div class="progress-bar">
        <div class="progress-step active" data-step="1">
          <div class="step-circle">1</div>
          <span>الملخص</span>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="2">
          <div class="step-circle">2</div>
          <span>الدفع</span>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="3">
          <div class="step-circle">3</div>
          <span>التأكيد</span>
        </div>
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

      <!-- ══════ البطاقة ثلاثية الأبعاد ══════ -->
      <div class="credit-card-container">
        <div class="credit-card" id="credit-card">
          <!-- الوجه الأمامي -->
          <div class="credit-card-front">
            <div class="cc-top">
              <span class="cc-brand">
                <i class="fas fa-credit-card" id="cc-brand-icon"></i>
              </span>
              <span class="cc-label">بطاقة بنكية</span>
            </div>
            <div class="cc-number" id="cc-number-display">
              •••• •••• •••• ••••
            </div>
            <div class="cc-bottom">
              <div class="cc-field">
                <span class="cc-field-label">حامل البطاقة</span>
                <span class="cc-field-value" id="cc-name-display">${userName || 'الاسم هنا'}</span>
              </div>
              <div class="cc-field">
                <span class="cc-field-label">تاريخ الانتهاء</span>
                <span class="cc-field-value" id="cc-expiry-display">MM/YY</span>
              </div>
            </div>
          </div>

          <!-- الوجه الخلفي (CVV) -->
          <div class="credit-card-back">
            <div class="cc-stripe"></div>
            <div class="cc-cvv-box">
              <span class="cc-cvv-label">CVV</span>
              <span class="cc-cvv-value" id="cc-cvv-display">•••</span>
            </div>
            <div class="cc-back-note">هذه البطاقة للاختبار فقط</div>
          </div>
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
            <span class="card-valid-icon" id="valid-icon"></span>
          </div>
        </div>

        <!-- تاريخ + CVV -->
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
            value="${userName}"
            autocomplete="cc-name">
        </div>
      </div>

      <!-- ══════ البريد الإلكتروني ══════ -->
      <div class="pay-card">
        <h3>
          <i class="fas fa-envelope"></i>
          البريد الإلكتروني
        </h3>
        <div class="form-group">
          <label>سيصلك إشعار على هذا البريد</label>
          <input
            type="email"
            id="billing-email"
            placeholder="you@example.com"
            dir="ltr"
            value="${user.email || ''}"
            autocomplete="email">
        </div>
      </div>

      <!-- ══════ أو ادفع بـ ══════ -->
      <div class="pay-divider">
        <span>أو ادفع بـ</span>
      </div>

      <div class="pay-quick-actions">
        <button type="button" class="quick-pay-btn apple-pay" id="apple-pay-btn">
          <i class="fab fa-apple"></i>
          <span>Apple Pay</span>
        </button>
        <button type="button" class="quick-pay-btn google-pay" id="google-pay-btn">
          <i class="fab fa-google-pay"></i>
          <span>Google Pay</span>
        </button>
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

      <!-- ══════ شارة الأمان ══════ -->
      <div class="pay-security-badges">
        <div class="security-badge">
          <i class="fas fa-lock"></i>
          <span>SSL 256-bit</span>
        </div>
        <div class="security-badge">
          <i class="fas fa-shield-alt"></i>
          <span>PCI DSS</span>
        </div>
        <div class="security-badge">
          <i class="fas fa-check-circle"></i>
          <span>3D Secure</span>
        </div>
      </div>

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
  const emailInput = document.getElementById('billing-email');
  const payBtn = document.getElementById('pay-btn');
  const errBox = document.getElementById('pay-error');
  const successBox = document.getElementById('pay-success');
  const creditCard = document.getElementById('credit-card');
  const ccNumberDisplay = document.getElementById('cc-number-display');
  const ccNameDisplay = document.getElementById('cc-name-display');
  const ccExpiryDisplay = document.getElementById('cc-expiry-display');
  const ccCvvDisplay = document.getElementById('cc-cvv-display');
  const ccBrandIcon = document.getElementById('cc-brand-icon');
  const validIcon = document.getElementById('valid-icon');

  // ============================================
  // ✅ نوع البطاقة
  // ============================================
  function detectCardBrand(number) {
    const clean = number.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6/.test(clean)) return 'discover';
    return null;
  }

  function getBrandIcon(brand) {
    switch (brand) {
      case 'visa': return '<i class="fab fa-cc-visa" style="color:#1a1f71;"></i>';
      case 'mastercard': return '<i class="fab fa-cc-mastercard" style="color:#eb001b;"></i>';
      case 'amex': return '<i class="fab fa-cc-amex" style="color:#2e77bc;"></i>';
      case 'discover': return '<i class="fab fa-cc-discover" style="color:#f27712;"></i>';
      default: return '<i class="fas fa-credit-card"></i>';
    }
  }

  // ============================================
  // ✅ Luhn Algorithm (التحقق من رقم البطاقة)
  // ============================================
  function isValidCardNumber(number) {
    const clean = number.replace(/\s/g, '');
    if (clean.length < 13 || clean.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  // ============================================
  // ✅ تنسيق رقم البطاقة
  // ============================================
  numberInput.addEventListener('input', () => {
    let value = numberInput.value.replace(/\D/g, '');
    value = value.slice(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    numberInput.value = value;

    // ✅ تحديث البطاقة البصرية
    const clean = value.replace(/\s/g, '');
    const masked = clean.padEnd(16, '•').replace(/(.{4})(?=.)/g, '$1 ');
    ccNumberDisplay.textContent = masked;

    // ✅ نوع البطاقة
    const brand = detectCardBrand(value);
    ccBrandIcon.outerHTML = getBrandIcon(brand);
    document.getElementById('cc-brand-icon').outerHTML = getBrandIcon(brand);

    // ✅ التحقق
    if (clean.length === 16) {
      if (isValidCardNumber(clean)) {
        validIcon.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e;"></i>';
      } else {
        validIcon.innerHTML = '<i class="fas fa-times-circle" style="color:#dc2626;"></i>';
      }
    } else {
      validIcon.innerHTML = '';
    }
  });

  // ============================================
  // ✅ تاريخ الانتهاء
  // ============================================
  expiryInput.addEventListener('input', () => {
    let value = expiryInput.value.replace(/\D/g, '');
    value = value.slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    expiryInput.value = value;
    ccExpiryDisplay.textContent = value || 'MM/YY';
  });

  // ============================================
  // ✅ CVV
  // ============================================
  cvvInput.addEventListener('input', () => {
    cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4);
    const val = cvvInput.value;
    ccCvvDisplay.textContent = val ? val.padEnd(3, '•') : '•••';
  });

  // ✅ قلب البطاقة عند التركيز على CVV
  cvvInput.addEventListener('focus', () => {
    creditCard.classList.add('flipped');
  });

  cvvInput.addEventListener('blur', () => {
    creditCard.classList.remove('flipped');
  });

  // ============================================
  // ✅ اسم حامل البطاقة
  // ============================================
  nameInput.addEventListener('input', () => {
    ccNameDisplay.textContent = nameInput.value || 'الاسم هنا';
  });

  // ============================================
  // ✅ الدفع
  // ============================================
  async function processPayment() {
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const number = numberInput.value.replace(/\s/g, '');
    const expiry = expiryInput.value;
    const cvv = cvvInput.value;
    const holderName = nameInput.value.trim();
    const email = emailInput.value.trim();

    // ✅ التحقق
    if (number.length !== 16 || !isValidCardNumber(number)) {
      showError('رقم البطاقة غير صحيح');
      numberInput.focus();
      return;
    }

    if (expiry.length !== 5) {
      showError('تاريخ الانتهاء غير صحيح');
      expiryInput.focus();
      return;
    }

    if (cvv.length < 3) {
      showError('CVV غير صحيح');
      cvvInput.focus();
      return;
    }

    if (!holderName) {
      showError('اسم حامل البطاقة مطلوب');
      nameInput.focus();
      return;
    }

    if (!email || !email.includes('@')) {
      showError('البريد الإلكتروني غير صحيح');
      emailInput.focus();
      return;
    }

    // ✅ بدء "الدفع"
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جارٍ معالجة الدفع...</span>';

    try {
      // ✅ محاكاة تأخير (2 ثانية)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ✅ تفعيل الاشتراك
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (subscription?.id) {
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
  }

  payBtn.addEventListener('click', processPayment);

  // ✅ Apple Pay
  document.getElementById('apple-pay-btn').addEventListener('click', async () => {
    if (!confirm('تأكيد الدفع عبر Apple Pay؟\n(محاكاة)')) return;
    await simulateQuickPay('Apple Pay');
  });

  // ✅ Google Pay
  document.getElementById('google-pay-btn').addEventListener('click', async () => {
    if (!confirm('تأكيد الدفع عبر Google Pay؟\n(محاكاة)')) return;
    await simulateQuickPay('Google Pay');
  });

  async function simulateQuickPay(method) {
    payBtn.disabled = true;
    payBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>جارٍ الدفع عبر ${method}...</span>`;

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (subscription?.id) {
        await db.from('subscriptions').update({
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        }).eq('id', subscription.id);
      } else {
        await db.from('subscriptions').insert({
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
      }

      successBox.textContent = `✅ تم الدفع عبر ${method} بنجاح!`;
      successBox.style.display = 'block';

      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);

    } catch (err) {
      payBtn.disabled = false;
      payBtn.innerHTML = '<i class="fas fa-lock"></i> <span>ادفع 150.00 DH</span>';
      showError('خطأ: ' + err.message);
    }
  }

  function showError(msg) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
});