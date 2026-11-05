// ============================================
// صفحة تفاصيل المنتج (مع إظهار العملة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/detail.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_detail_title_full');

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const main = document.getElementById('main-content');

  if (!productId) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_no_id')}</div>`;
    return;
  }

  const { data: product, error } = await db
    .from('products')
    .select('*, suppliers(name, specialty)')
    .eq('id', productId)
    .single();

  if (error || !product) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_not_found')}</div>`;
    return;
  }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  let currencySymbol = '';
  if (profile?.organization_id) {
    const { data: org } = await db
      .from('organizations')
      .select('currency_symbol, show_currency')
      .eq('id', profile.organization_id)
      .single();
    
    if (org?.show_currency !== false) {
      currencySymbol = org?.currency_symbol || '';
    }
  }

  const total = ((product.qty ?? 0) * (product.price ?? 0)).toFixed(2);
  const sellPrice = Number(product.sell_price ?? 0);
  const sellPriceEnabled = product.sell_price_enabled === true;

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('prod_detail_title')}</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="product-card-detail">

      <div class="product-image" id="product-image-container">
        ${product.image_url
          ? `<img src="${product.image_url}" alt="${product.name ?? tr('products_no_name')}">`
          : `<i class="fas fa-box-open"></i>`}
        <button class="image-edit-btn" title="${tr('prod_detail_edit_image')}">
          <i class="fas fa-camera"></i>
        </button>
      </div>

      <h1 class="detail-title">
        <span class="edit-field" id="f-name" data-value="${product.name ?? ''}"></span>
      </h1>
      <p class="detail-sku">
        <span class="edit-field" id="f-sku" data-value="${product.sku ?? ''}"></span>
      </p>

      <div class="product-stats">
        <div class="stat">
          <div class="stat-label">${tr('products_qty')}</div>
          <div class="stat-value ${(product.qty ?? 0) < 10 ? 'low' : ''}">
            <span class="edit-field center" id="f-qty" data-value="${product.qty ?? 0}"></span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">${tr('prod_detail_buy_price')}</div>
          <div class="stat-value">
            <span class="edit-field center" id="f-price" data-value="${product.price ?? 0}"></span>
            ${currencySymbol ? `<span style="font-size: 0.9em; color: #171717; font-weight: 500;">${currencySymbol}</span>` : ''}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">${tr('products_total')}</div>
          <div class="stat-value" id="f-total">${total} ${currencySymbol}</div>
        </div>
      </div>

      <div class="product-extra">
        <div class="row">
          <span>${tr('prod_detail_category')}</span>
          <strong class="edit-field" id="f-category" data-value="${product.category ?? product.suppliers?.specialty ?? ''}"></strong>
        </div>
        <div class="row">
          <span>${tr('prod_detail_supplier')}</span>
          <strong>${product.suppliers?.name ?? '—'}</strong>
        </div>
        <div class="row">
          <span>${tr('prod_detail_unit')}</span>
          <strong class="edit-field" id="f-unit" data-value="${product.unit ?? ''}"></strong>
        </div>
        <div class="row">
          <span>${tr('prod_detail_barcode')}</span>
          <strong class="edit-field" id="f-qr_code" data-value="${product.qr_code ?? ''}"></strong>
        </div>
      </div>

      <div class="sell-price-section">
        <h3 class="sell-price-title">💰 ${tr('prod_detail_sell_price')}</h3>

        <div class="switch-item">
          <div class="switch-content">
            <div class="switch-header">
              <strong class="switch-title">${tr('prod_detail_enable_sell')}</strong>
              <span class="switch-status ${sellPriceEnabled ? 'on' : 'off'}" id="sell-price-status">
                ${sellPriceEnabled ? tr('prod_detail_enabled') : tr('prod_detail_disabled')}
              </span>
            </div>
            <p class="switch-desc">${tr('prod_detail_sell_desc')}</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="sell-price-toggle" ${sellPriceEnabled ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>

        <div class="sell-price-input-group">
          <label>${tr('prod_detail_sell_input')} (${currencySymbol || 'DH'})</label>
          <input type="number" id="sell-price-input" value="${sellPrice}" min="0" step="0.01" dir="ltr" placeholder="0.00">
          <small class="field-hint">${tr('prod_detail_sell_hint')}</small>
        </div>
      </div>

      <div class="actions">
        <button class="btn-danger" id="delete-btn">
          <i class="fas fa-trash"></i>
          <span>${tr('prod_detail_delete')}</span>
        </button>
      </div>

    </div>
  `;

  function recalcTotal() {
    const qty = Number(document.getElementById('f-qty').dataset.value ?? 0);
    const price = Number(document.getElementById('f-price').dataset.value ?? 0);
    const totalVal = (qty * price).toFixed(2);
    document.getElementById('f-total').textContent = `${totalVal} ${currencySymbol}`.trim();
  }

  const fieldLabels = {
    name: tr('prod_detail_field_name'),
    sku: tr('prod_detail_field_sku'),
    qty: tr('products_qty'),
    price: tr('prod_detail_buy_price'),
    category: tr('prod_detail_category'),
    unit: tr('prod_detail_unit'),
    qr_code: tr('prod_detail_barcode'),
  };

  const fields = [
    { id: 'f-name', field: 'name', type: 'text' },
    { id: 'f-sku', field: 'sku', type: 'text' },
    { id: 'f-qty', field: 'qty', type: 'number' },
    { id: 'f-price', field: 'price', type: 'number' },
    { id: 'f-category', field: 'category', type: 'text' },
    { id: 'f-unit', field: 'unit', type: 'text' },
    { id: 'f-qr_code', field: 'qr_code', type: 'text' },
  ];

  fields.forEach(({ id, field, type }) => {
    inlineEdit({
      el: document.getElementById(id),
      table: 'products',
      id: productId,
      field,
      type,
      onSave: async (savedField, newValue) => {
        if (savedField === 'qty' || savedField === 'price') recalcTotal();

        if (typeof notifyOrganization === 'function' && profile?.organization_id) {
          await notifyOrganization({
            orgId: profile.organization_id,
            title: tr('prod_detail_notif_edit_title'),
            message: `${profile.full_name || tr('prod_detail_user')} ${tr('prod_detail_notif_edit_msg')} ${fieldLabels[savedField] || savedField} "${product.name}" ${tr('prod_detail_to')} "${newValue}"`,
            type: 'info',
            link: `/products/detail.html?id=${productId}`,
            userName: profile.full_name || null,
          });
        }
      },
    });
  });

  const imgContainer = document.getElementById('product-image-container');
  attachImageUpload(productId, imgContainer, product.image_url);

  const sellPriceToggle = document.getElementById('sell-price-toggle');
  const sellPriceStatus = document.getElementById('sell-price-status');
  const sellPriceInput = document.getElementById('sell-price-input');

  let currentSellPriceEnabled = sellPriceEnabled;

  sellPriceToggle.addEventListener('change', async () => {
    const newValue = sellPriceToggle.checked;
    sellPriceToggle.disabled = true;

    try {
      const { error: updateError } = await db
        .from('products')
        .update({ sell_price_enabled: newValue })
        .eq('id', productId);

      if (updateError) throw new Error(updateError.message);

      currentSellPriceEnabled = newValue;
      sellPriceStatus.textContent = newValue ? tr('prod_detail_enabled') : tr('prod_detail_disabled');
      sellPriceStatus.classList.toggle('on', newValue);
      sellPriceStatus.classList.toggle('off', !newValue);

      if (typeof notifyOrganization === 'function' && profile?.organization_id) {
        await notifyOrganization({
          orgId: profile.organization_id,
          title: tr('prod_detail_notif_sell_title'),
          message: `${profile.full_name || tr('prod_detail_user')} ${newValue ? tr('prod_detail_notif_sell_on') : tr('prod_detail_notif_sell_off')} "${product.name}"`,
          type: 'info',
          link: `/products/detail.html?id=${productId}`,
          userName: profile.full_name || null,
        });
      }
    } catch (err) {
      alert(tr('prod_detail_err') + ' ' + err.message);
      sellPriceToggle.checked = !newValue;
    } finally {
      sellPriceToggle.disabled = false;
    }
  });

  let sellPriceSaveTimeout = null;

  sellPriceInput.addEventListener('input', () => {
    clearTimeout(sellPriceSaveTimeout);

    sellPriceSaveTimeout = setTimeout(async () => {
      const newPrice = Number(sellPriceInput.value) || 0;

      try {
        const { error: updateError } = await db
          .from('products')
          .update({ sell_price: newPrice })
          .eq('id', productId);

        if (updateError) throw new Error(updateError.message);

        if (typeof notifyOrganization === 'function' && profile?.organization_id) {
          await notifyOrganization({
            orgId: profile.organization_id,
            title: tr('prod_detail_notif_sell_title'),
            message: `${profile.full_name || tr('prod_detail_user')} ${tr('prod_detail_notif_sell_edit')} "${product.name}" ${tr('prod_detail_to')} "${newPrice}"`,
            type: 'info',
            link: `/products/detail.html?id=${productId}`,
            userName: profile.full_name || null,
          });
        }
      } catch (err) {
        console.error('فشل حفظ سعر البيع:', err);
      }
    }, 800);
  });

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm(tr('prod_detail_confirm_delete'))) return;

    const { error } = await db.from('products').delete().eq('id', productId);

    if (error) {
      alert(tr('prod_detail_err') + ' ' + error.message);
      return;
    }

    if (typeof notifyOrganization === 'function' && profile?.organization_id) {
      await notifyOrganization({
        orgId: profile.organization_id,
        title: tr('prod_detail_notif_del_title'),
        message: `${profile.full_name || tr('prod_detail_user')} ${tr('prod_detail_notif_del_msg')} "${product.name}"`,
        type: 'danger',
        link: '/products/list.html',
        userName: profile.full_name || null,
      });
    }

    window.location.href = 'list.html';
  });
});