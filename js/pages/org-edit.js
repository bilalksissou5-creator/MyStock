// ============================================
// صفحة تعديل المنظمة (للمدير فقط)
// ✅ قسم العملة (اختيار + رمز + إظهار)
// ✅ إظهار اسم المنظمة
// ✅ الأشكال الصغيرة تحت الصورة
// ✅ زر الحفظ ثابت بأسفل الشاشة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    main.innerHTML = `<div class="alert alert-error">ليس لديك صلاحية تعديل المنظمة</div>`;
    return;
  }

  const { data: org, error } = await db
    .from('organizations')
    .select('*')
    .eq('id', myProfile.organization_id)
    .single();

  if (error || !org) {
    main.innerHTML = `<div class="alert alert-error">لم يتم العثور على المنظمة</div>`;
    return;
  }

  let currentShape = org.logo_shape || 'circle';
  let showOrgName = org.show_org_name !== false;
  let currencyCode = org.currency_code || 'MAD';
  let currencySymbol = org.currency_symbol || 'DH';
  let showCurrency = org.show_currency !== false;
  let pendingLogoFile = null;

  const currenciesList = Object.entries(CurrencyUtils.CURRENCIES)
    .map(([code, info]) => `<option value="${code}" data-symbol="${info.symbol}">${info.name} (${code})</option>`)
    .join('');

  main.innerHTML = `
    <div class="page-header">
      <h2>تعديل المنظمة</h2>
      <a href="/profile-dashboard.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="alert alert-error" id="org-error" style="display:none;"></div>
    <div class="alert alert-success" id="org-success" style="display:none;"></div>

    <div class="org-edit-wrapper">

      <!-- ══════ الشعار ══════ -->
      <div class="org-section">
        <h3>شعار المنظمة</h3>

        <!-- ✅ الصورة أولاً -->
        <div class="org-logo-preview" id="org-logo-preview">
          ${org.logo_url
            ? `<img src="${org.logo_url}" alt="logo" id="logo-img">`
            : `<i class="fas fa-building" id="logo-placeholder"></i>`}
        </div>

        <!-- ✅ الأشكال الصغيرة تحتها -->
        <div class="shape-picker">
          <button type="button" class="shape-option" data-shape="circle" title="دائري">
            <div class="shape-preview shape-circle"></div>
          </button>
          <button type="button" class="shape-option" data-shape="square" title="مربع">
            <div class="shape-preview shape-square"></div>
          </button>
          <button type="button" class="shape-option" data-shape="rectangle" title="مستطيل">
            <div class="shape-preview shape-rectangle"></div>
          </button>
        </div>

        <input type="file" id="logo-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-logo-btn">
          <i class="fas fa-camera"></i>
          <span>اختيار صورة</span>
        </button>
      </div>

      <!-- ══════ اسم المنظمة + إظهاره ══════ -->
      <div class="org-section">
        <h3>اسم المنظمة</h3>
        <div class="form-group">
          <label>الاسم</label>
          <input type="text" id="org-name" value="${org.name ?? ''}" placeholder="اسم المنظمة">
        </div>

        <div class="switch-item">
          <div class="switch-content">
            <div class="switch-header">
              <strong class="switch-title">إظهار اسم المنظمة في الفواتير</strong>
              <span class="switch-status ${showOrgName ? 'on' : 'off'}" id="show-org-name-status">
                ${showOrgName ? 'مفعّل' : 'غير مفعّل'}
              </span>
            </div>
            <p class="switch-desc">سيظهر الاسم في الفواتير والإيصالات المطبوعة</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="show-org-name-toggle" ${showOrgName ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>

      <!-- ══════ العملة ══════ -->
      <div class="org-section">
        <h3>💰 العملة</h3>
        <p class="org-hint">اختر العملة ورمزها المستخدم في الفواتير</p>

        <div class="form-group">
          <label>العملة</label>
          <select id="currency-code" class="form-select">
            ${currenciesList}
          </select>
        </div>

        <div class="form-group">
          <label>رمز العملة (قابل للتعديل)</label>
          <input type="text" id="currency-symbol" value="${currencySymbol}" placeholder="DH" dir="ltr">
          <small class="field-hint">مثال: DH، $، €، ر.س</small>
        </div>

        <div class="switch-item">
          <div class="switch-content">
            <div class="switch-header">
              <strong class="switch-title">إظهار رمز العملة في الفواتير</strong>
              <span class="switch-status ${showCurrency ? 'on' : 'off'}" id="show-currency-status">
                ${showCurrency ? 'مفعّل' : 'غير مفعّل'}
              </span>
            </div>
            <p class="switch-desc">سيظهر الرمز بجانب السعر والمجموع (بدون الكمية)</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="show-currency-toggle" ${showCurrency ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>

        <div class="currency-preview">
          <span class="preview-label">معاينة:</span>
          <span class="preview-value" id="currency-preview-value">
            ${CurrencyUtils.formatCurrency(1500, currencySymbol, showCurrency)}
          </span>
        </div>
      </div>

    </div>

    <!-- ══════ زر الحفظ ══════ -->
    <div class="org-save-bar">
      <button type="button" class="btn-primary full-width" id="save-btn">
        <i class="fas fa-check"></i>
        <span>حفظ التعديلات</span>
      </button>
    </div>
  `;

  const errBox = document.getElementById('org-error');
  const successBox = document.getElementById('org-success');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('org-logo-preview');
  const nameInput = document.getElementById('org-name');
  const showOrgNameToggle = document.getElementById('show-org-name-toggle');
  const showOrgNameStatus = document.getElementById('show-org-name-status');
  const currencyCodeSelect = document.getElementById('currency-code');
  const currencySymbolInput = document.getElementById('currency-symbol');
  const showCurrencyToggle = document.getElementById('show-currency-toggle');
  const showCurrencyStatus = document.getElementById('show-currency-status');
  const currencyPreviewValue = document.getElementById('currency-preview-value');

  currencyCodeSelect.value = currencyCode;

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
    setTimeout(() => { errBox.style.display = 'none'; }, 4000);
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
    setTimeout(() => { successBox.style.display = 'none'; }, 3000);
  }

  function applyShape(shape) {
    logoPreview.classList.remove('shape-circle', 'shape-square', 'shape-rectangle');
    logoPreview.classList.add('shape-' + shape);
  }

  applyShape(currentShape);

  document.querySelectorAll('.shape-option').forEach(btn => {
    if (btn.dataset.shape === currentShape) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentShape = btn.dataset.shape;
      document.querySelectorAll('.shape-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyShape(currentShape);
    });
  });

  showOrgNameToggle.addEventListener('change', () => {
    showOrgName = showOrgNameToggle.checked;
    showOrgNameStatus.textContent = showOrgName ? 'مفعّل' : 'غير مفعّل';
    showOrgNameStatus.classList.toggle('on', showOrgName);
    showOrgNameStatus.classList.toggle('off', !showOrgName);
  });

  showCurrencyToggle.addEventListener('change', () => {
    showCurrency = showCurrencyToggle.checked;
    showCurrencyStatus.textContent = showCurrency ? 'مفعّل' : 'غير مفعّل';
    showCurrencyStatus.classList.toggle('on', showCurrency);
    showCurrencyStatus.classList.toggle('off', !showCurrency);
    updateCurrencyPreview();
  });

  currencyCodeSelect.addEventListener('change', () => {
    currencyCode = currencyCodeSelect.value;
    const selectedOption = currencyCodeSelect.options[currencyCodeSelect.selectedIndex];
    const autoSymbol = selectedOption.dataset.symbol || '';

    if (!currencySymbolInput.value.trim() || currencySymbolInput.dataset.auto === 'true') {
      currencySymbolInput.value = autoSymbol;
      currencySymbolInput.dataset.auto = 'true';
    }

    currencySymbol = currencySymbolInput.value;
    updateCurrencyPreview();
  });

  currencySymbolInput.addEventListener('input', () => {
    currencySymbol = currencySymbolInput.value.trim() || CurrencyUtils.getCurrencySymbol(currencyCode);
    currencySymbolInput.dataset.auto = 'false';
    updateCurrencyPreview();
  });

  function updateCurrencyPreview() {
    currencyPreviewValue.textContent = CurrencyUtils.formatCurrency(1500, currencySymbol, showCurrency);
  }

  document.getElementById('choose-logo-btn').addEventListener('click', () => {
    logoInput.click();
  });

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم الصورة يتجاوز 5 ميغابايت');
      logoInput.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showError('الملف ليس صورة');
      logoInput.value = '';
      return;
    }

    pendingLogoFile = file;
    const previewUrl = URL.createObjectURL(file);
    logoPreview.innerHTML = `<img src="${previewUrl}" alt="logo">`;
  });

  async function uploadLogo(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${org.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('organizations')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw new Error('فشل الرفع: ' + uploadError.message);

    const { data: urlData } = db.storage.from('organizations').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    const newName = nameInput.value.trim();

    if (!newName) {
      showError('اسم المنظمة مطلوب');
      return;
    }

    if (!currencySymbolInput.value.trim()) {
      showError('رمز العملة مطلوب');
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';

    try {
      let logoUrl = org.logo_url;

      if (pendingLogoFile) {
        logoUrl = await uploadLogo(pendingLogoFile);
      }

      const updates = {
        name: newName,
        logo_url: logoUrl,
        logo_shape: currentShape,
        show_org_name: showOrgName,
        currency_code: currencyCode,
        currency_symbol: currencySymbolInput.value.trim(),
        show_currency: showCurrency,
      };

      const { error: updateError } = await db
        .from('organizations')
        .update(updates)
        .eq('id', org.id);

      if (updateError) throw new Error(updateError.message);

      showSuccess('✅ تم حفظ التعديلات بنجاح');
      pendingLogoFile = null;

      setTimeout(() => {
        window.location.href = '/profile-dashboard.html';
      }, 1500);

    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ التعديلات';
    }
  });
});