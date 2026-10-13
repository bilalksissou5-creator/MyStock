// ============================================
// صفحة البطاقة البنكية
// ✅ عرض + تعديل + حذف
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

  function detectCardBrand(number) {
    const clean = number.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6/.test(clean)) return 'discover';
    return null;
  }

  function getBrandName(brand) {
    switch (brand) {
      case 'visa': return 'Visa';
      case 'mastercard': return 'Mastercard';
      case 'amex': return 'Amex';
      case 'discover': return 'Discover';
      default: return 'Card';
    }
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

    main.innerHTML = `
      <div class="page-header">
        <h2>${tr('bc_title')}</h2>
        <a href="/profile-dashboard.html" class="btn-secondary">
          <i class="fas fa-arrow-right"></i>
          <span>${tr('prod_detail_back')}</span>
        </a>
      </div>
    `;

    main.appendChild(errBox);
    main.appendChild(successBox);

    const wrapper = document.createElement('div');
    wrapper.className = 'bank-card-wrapper';

    if (hasCard) {
      // ═══════════ عرض البطاقة + التعديل ═══════════
      const last4 = profile.bank_card_last4;
      const brand = profile.bank_card_brand || 'Card';
      const holder = profile.bank_card_holder || '—';
      const expiry = profile.bank_card_expiry || 'MM/YY';

      wrapper.innerHTML = `
        <div class="bank-card-container">
          <div class="bank-card-visual" id="bank-card-visual">
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

        <div class="bank-card-form">
          <div class="form-group">
            <label>${tr('pe_bank_holder')}</label>
            <input type="text" id="bank-holder" value="${holder}">
          </div>

          <div class="form-group">
            <label>${tr('pe_bank_number')}</label>
            <input type="text" id="bank-number" dir="ltr" inputmode="numeric" maxlength="19"
                   placeholder="${tr('pe_bank_number_ph')}" value="">
          </div>

          <div class="form-group">
            <label>${tr('pe_bank_expiry')}</label>
            <input type="text" id="bank-expiry" dir="ltr" inputmode="numeric" maxlength="5"
                   placeholder="${tr('pe_bank_expiry_ph')}" value="${expiry}">
          </div>
        </div>

        <div class="bank-card-actions">
          <button type="button" class="btn-primary full-width" id="save-btn">
            <i class="fas fa-check"></i>
            <span>${tr('pe_bank_save')}</span>
          </button>
          <button type="button" class="btn-danger full-width" id="remove-btn">
            <i class="fas fa-trash"></i>
            <span>${tr('pe_bank_remove')}</span>
          </button>
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

        <div class="bank-card-form">
          <div class="form-group">
            <label>${tr('pe_bank_holder')}</label>
            <input type="text" id="bank-holder" placeholder="${tr('pe_bank_holder_ph')}" value="">
          </div>

          <div class="form-group">
            <label>${tr('pe_bank_number')}</label>
            <input type="text" id="bank-number" dir="ltr" inputmode="numeric" maxlength="19"
                   placeholder="${tr('pe_bank_number_ph')}" value="">
          </div>

          <div class="form-group">
            <label>${tr('pe_bank_expiry')}</label>
            <input type="text" id="bank-expiry" dir="ltr" inputmode="numeric" maxlength="5"
                   placeholder="${tr('pe_bank_expiry_ph')}" value="">
          </div>
        </div>

        <div class="bank-card-actions">
          <button type="button" class="btn-primary full-width" id="save-btn">
            <i class="fas fa-plus"></i>
            <span>${tr('bc_add')}</span>
          </button>
        </div>
      `;
    }

    main.appendChild(wrapper);

    // ═══════════════════════════════════════════
    // التنسيق التلقائي للحقول
    // ═══════════════════════════════════════════
    const numberInput = document.getElementById('bank-number');
    const expiryInput = document.getElementById('bank-expiry');

    if (numberInput) {
      numberInput.addEventListener('input', () => {
        let value = numberInput.value.replace(/\D/g, '').slice(0, 16);
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        numberInput.value = value;
      });
    }

    if (expiryInput) {
      expiryInput.addEventListener('input', () => {
        let value = expiryInput.value.replace(/\D/g, '').slice(0, 4);
        if (value.length >= 3) {
          value = value.slice(0, 2) + '/' + value.slice(2);
        }
        expiryInput.value = value;
      });
    }

    // ═══════════════════════════════════════════
    // زر الحفظ
    // ═══════════════════════════════════════════
    document.getElementById('save-btn')?.addEventListener('click', async () => {
      const holder = document.getElementById('bank-holder').value.trim();
      const number = numberInput.value.replace(/\s/g, '');
      const expiry = expiryInput.value.trim();

      if (!holder) {
        showError(tr('pe_bank_err_holder'));
        return;
      }

      if (number.length !== 16) {
        showError(tr('pe_bank_err_number'));
        return;
      }

      if (!expiry || expiry.length !== 5) {
        showError(tr('pe_bank_err_expiry'));
        return;
      }

      const last4 = number.slice(-4);
      const brand = getBrandName(detectCardBrand(number));

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db
        .from('profiles')
        .update({
          bank_card_last4: last4,
          bank_card_brand: brand,
          bank_card_holder: holder,
          bank_card_expiry: expiry,
        })
        .eq('id', user.id);

      btn.disabled = false;

      if (error) {
        showError(error.message);
      } else {
        profile.bank_card_last4 = last4;
        profile.bank_card_brand = brand;
        profile.bank_card_holder = holder;
        profile.bank_card_expiry = expiry;

        showSuccess(tr('pe_success_bank'));
        setTimeout(() => render(), 1200);
      }
    });

    // ═══════════════════════════════════════════
    // زر الحذف
    // ═══════════════════════════════════════════
    document.getElementById('remove-btn')?.addEventListener('click', async () => {
      if (!confirm(tr('pe_bank_confirm_remove'))) return;

      const btn = document.getElementById('remove-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db
        .from('profiles')
        .update({
          bank_card_last4: null,
          bank_card_brand: null,
          bank_card_holder: null,
          bank_card_expiry: null,
        })
        .eq('id', user.id);

      if (error) {
        showError(error.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = tr('pe_bank_remove');
      } else {
        profile.bank_card_last4 = null;
        profile.bank_card_brand = null;
        profile.bank_card_holder = null;
        profile.bank_card_expiry = null;

        showSuccess(tr('pe_success_bank_remove'));
        setTimeout(() => render(), 1200);
      }
    });
  }

  render();
});