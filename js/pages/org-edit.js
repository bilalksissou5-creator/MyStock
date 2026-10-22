// ============================================
// صفحة تعديل المنظمة (للمدير فقط)
// ✅ دعم كامل للترجمة + تحديث فوري
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('oe_title_full');

  const main = document.getElementById('main-content');

  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    main.innerHTML = `<div class="alert alert-error">${tr('oe_no_permission')}</div>`;
    return;
  }

  const { data: org, error } = await db
    .from('organizations')
    .select('*')
    .eq('id', myProfile.organization_id)
    .single();

  if (error || !org) {
    main.innerHTML = `<div class="alert alert-error">${tr('oe_not_found')}</div>`;
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
      <h2>${tr('oe_title')}</h2>
      <a href="/profile-dashboard.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="alert alert-error" id="org-error" style="display:none;"></div>
    <div class="alert alert-success" id="org-success" style="display:none;"></div>

    <div class="org-edit-wrapper">

      <div class="org-section">
        <h3>${tr('oe_logo_title')}</h3>

        <div class="org-logo-preview" id="org-logo-preview">
          ${org.logo_url
            ? `<img src="${org.logo_url}" alt="logo" id="logo-img">`
            : `<i class="fas fa-building" id="logo-placeholder"></i>`}
        </div>

        <div class="shape-picker">
          <button type="button" class="shape-option" data-shape="circle" title="${tr('oe_shape_circle')}">
            <div class="shape-preview shape-circle"></div>
          </button>
          <button type="button" class="shape-option" data-shape="square" title="${tr('oe_shape_square')}">
            <div class="shape-preview shape-square"></div>
          </button>
          <button type="button" class="shape-option" data-shape="rectangle" title="${tr('oe_shape_rectangle')}">
            <div class="shape-preview shape-rectangle"></div>
          </button>
        </div>

        <input type="file" id="logo-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-logo-btn">
          <i class="fas fa-camera"></i>
          <span>${tr('pe_choose_image')}</span>
        </button>
      </div>

      <div class="org-section">
        <h3>${tr('oe_name_title')}</h3>
        <div class="form-group">
          <label>${tr('pd_name')}</label>
          <input type="text" id="org-name" value="${org.name ?? ''}" placeholder="${tr('oe_name_ph')}">
        </div>

        <div class="switch-item">
          <div class="switch-content">
            <div class="switch-header">
              <strong class="switch-title">${tr('oe_show_name')}</strong>
              <span class="switch-status ${showOrgName ? 'on' : 'off'}" id="show-org-name-status">
                ${showOrgName ? tr('prod_detail_enabled') : tr('prod_detail_disabled')}
              </span>
            </div>
            <p class="switch-desc">${tr('oe_show_name_desc')}</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="show-org-name-toggle" ${showOrgName ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>

      <div class="org-section">
        <h3>💰 ${tr('oe_currency_title')}</h3>
        <p class="org-hint">${tr('oe_currency_hint')}</p>

        <div class="form-group">
          <label>${tr('oe_currency')}</label>
          <select id="currency-code" class="form-select">
            ${currenciesList}
          </select>
        </div>

        <div class="form-group">
          <label>${tr('oe_symbol')}</label>
          <input type="text" id="currency-symbol" value="${currencySymbol}" placeholder="DH" dir="ltr">
          <small class="field-hint">${tr('oe_symbol_hint')}</small>
        </div>

        <div class="switch-item">
          <div class="switch-content">
            <div class="switch-header">
              <strong class="switch-title">${tr('oe_show_currency')}</strong>
              <span class="switch-status ${showCurrency ? 'on' : 'off'}" id="show-currency-status">
                ${showCurrency ? tr('prod_detail_enabled') : tr('prod_detail_disabled')}
              </span>
            </div>
            <p class="switch-desc">${tr('oe_show_currency_desc')}</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="show-currency-toggle" ${showCurrency ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>

        <div class="currency-preview">
          <span class="preview-label">${tr('oe_preview')}</span>
          <span class="preview-value" id="currency-preview-value">
            ${CurrencyUtils.formatCurrency(1500, currencySymbol, showCurrency)}
          </span>
        </div>
      </div>

    </div>

    <div class="org-save-bar">
      <button type="button" class="btn-primary full-width" id="save-btn">
        <i class="fas fa-check"></i>
        <span>${tr('pe_save')}</span>
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
    showOrgNameStatus.textContent = showOrgName ? tr('prod_detail_enabled') : tr('prod_detail_disabled');
    showOrgNameStatus.classList.toggle('on', showOrgName);
    showOrgNameStatus.classList.toggle('off', !showOrgName);
  });

  showCurrencyToggle.addEventListener('change', () => {
    showCurrency = showCurrencyToggle.checked;
    showCurrencyStatus.textContent = showCurrency ? tr('prod_detail_enabled') : tr('prod_detail_disabled');
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
      showError(tr('pe_err_size'));
      logoInput.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showError(tr('pe_err_not_image'));
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

    if (uploadError) throw new Error(tr('pe_err_upload') + ' ' + uploadError.message);

    const { data: urlData } = db.storage.from('organizations').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    const newName = nameInput.value.trim();

    if (!newName) {
      showError(tr('oe_err_name'));
      return;
    }

    if (!currencySymbolInput.value.trim()) {
      showError(tr('oe_err_symbol'));
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = tr('pe_saving');

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

      showSuccess(tr('oe_success'));
      pendingLogoFile = null;

      setTimeout(() => {
        window.location.href = '/profile-dashboard.html';
      }, 1500);

    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.querySelector('span').textContent = tr('pe_save');
    }
  });

  // ═══════════════════════════════════════════
  // ✅ التحديث الفوري (Realtime)
  // ═══════════════════════════════════════════
  db.channel('org-edit-sync-' + org.id)
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'organizations',
      filter: `id=eq.${org.id}` 
    }, (payload) => {
      const updatedOrg = payload.new;
      console.log('⚡ تم تحديث بيانات المنظمة من جهاز آخر:', updatedOrg);

      // تحديث الاسم
      if (updatedOrg.name && nameInput.value !== updatedOrg.name) {
        nameInput.value = updatedOrg.name;
      }

      // تحديث الشعار
      if (updatedOrg.logo_url && updatedOrg.logo_url !== org.logo_url) {
        logoPreview.innerHTML = `<img src="${updatedOrg.logo_url}" alt="logo">`;
        org.logo_url = updatedOrg.logo_url;
      }

      // تحديث الشكل
      if (updatedOrg.logo_shape && updatedOrg.logo_shape !== currentShape) {
        currentShape = updatedOrg.logo_shape;
        document.querySelectorAll('.shape-option').forEach(b => {
          b.classList.toggle('active', b.dataset.shape === currentShape);
        });
        applyShape(currentShape);
      }

      // تحديث العملة
      if (updatedOrg.currency_symbol) {
        currencySymbolInput.value = updatedOrg.currency_symbol;
        currencySymbol = updatedOrg.currency_symbol;
      }
      if (updatedOrg.currency_code) {
        currencyCodeSelect.value = updatedOrg.currency_code;
        currencyCode = updatedOrg.currency_code;
      }

      // تحديث المفاتيح
      showOrgName = updatedOrg.show_org_name !== false;
      showOrgNameToggle.checked = showOrgName;
      showOrgNameStatus.textContent = showOrgName ? tr('prod_detail_enabled') : tr('prod_detail_disabled');
      showOrgNameStatus.classList.toggle('on', showOrgName);
      showOrgNameStatus.classList.toggle('off', !showOrgName);

      showCurrency = updatedOrg.show_currency !== false;
      showCurrencyToggle.checked = showCurrency;
      showCurrencyStatus.textContent = showCurrency ? tr('prod_detail_enabled') : tr('prod_detail_disabled');
      showCurrencyStatus.classList.toggle('on', showCurrency);
      showCurrencyStatus.classList.toggle('off', !showCurrency);

      updateCurrencyPreview();
    })
    .subscribe();
});