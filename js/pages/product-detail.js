// ============================================
// صفحة تفاصيل المنتج - النسخة النهائية المستقرة
// ✅ تقسيم الصفحة إلى 3 بطاقات منفصلة (المعلومات، سعر البيع، المخزون)
// ✅ إصلاح اتجاه العملة (LTR) لتظهر 30.00 DH بدلاً من DH 30.00
// ✅ إشعار واحد فقط لكل عملية تعديل (بدون تكرار)
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
    if (main) main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_no_id')}</div>`;
    return;
  }

  const { data: product, error } = await db
    .from('products')
    .select('*, suppliers(name, specialty)')
    .eq('id', productId)
    .single();

  if (error || !product) {
    if (main) main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_not_found')}</div>`;
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
  const lowStockThreshold = Number(product.low_stock_threshold ?? 10);
  const isLowStock = Number(product.qty ?? 0) <= lowStockThreshold;

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('prod_detail_title')}</h2>
    </div>

    <div style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 24px;">

      <!-- ══════════════════════════════════════ -->
      <!-- ✅ البطاقة الأولى: معلومات المنتج الأساسية -->
      <!-- ══════════════════════════════════════ -->
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
            <div class="stat-value ${isLowStock ? 'low' : ''}" id="qty-stat-value">
              <span class="edit-field center" id="f-qty" data-value="${product.qty ?? 0}"></span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('prod_detail_buy_price')}</div>
            <div class="stat-value">
              <span dir="ltr" style="display: inline-flex; align-items: center; gap: 4px;">
                <span class="edit-field center" id="f-price" data-value="${product.price ?? 0}"></span>
                ${currencySymbol ? `<span style="font-size: 0.9em; color: #171717; font-weight: 500;">${currencySymbol}</span>` : ''}
              </span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('products_total')}</div>
            <div class="stat-value" id="f-total"><span dir="ltr">${total} ${currencySymbol}</span></div>
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

      </div>

      <!-- ══════════════════════════════════════ -->
      <!-- ✅ البطاقة الثانية: سعر البيع -->
      <!-- ══════════════════════════════════════ -->
      <div class="product-card-detail" style="padding-top: 16px; padding-bottom: 16px;">
        <div class="sell-price-section" style="margin: 0;">
          <h3 class="sell-price-title">💰 ${tr('prod_detail_sell_price')}</h3>

          <div class="switch-item" style="margin-bottom: 16px;">
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
      </div>

      <!-- ══════════════════════════════════════ -->
      <!-- ✅ البطاقة الثالثة: المخزون المنخفض -->
      <!-- ══════════════════════════════════════ -->
      <div class="product-card-detail" style="padding-top: 16px; padding-bottom: 16px;">
        <div class="sell-price-section" style="margin: 0;">
          <h3 class="sell-price-title">${tr('low_stock_section_title')}</h3>

          <div class="sell-price-input-group">
            <label>${tr('low_stock_field_label')}</label>
            <input type="number" id="low-stock-input" value="${lowStockThreshold}" min="0" step="1" dir="ltr" placeholder="10">
            <small class="field-hint">${tr('low_stock_field_hint')}</small>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════ -->
      <!-- ✅ أزرار التحكم (حذف المنتج) -->
      <!-- ══════════════════════════════════════ -->
      <div class="actions" style="margin-top: 8px;">
        <button class="btn-danger" id="delete-btn">
          <i class="fas fa-trash"></i>
          <span>${tr('prod_detail_delete')}</span>
        </button>
      </div>

    </div>
  `;

  function updateQtyStyle() {
    const qtyEl = document.getElementById('qty-stat-value');
    if (!qtyEl) return;
    const qty = Number(document.getElementById('f-qty')?.dataset.value ?? 0);
    const threshold = Number(product.low_stock_threshold ?? 10);
    if (qty <= threshold) qtyEl.classList.add('low');
    else qtyEl.classList.remove('low');
  }

  function recalcTotal() {
    const qty = Number(document.getElementById('f-qty')?.dataset.value ?? 0);
    const price = Number(document.getElementById('f-price')?.dataset.value ?? 0);
    const totalVal = (qty * price).toFixed(2);
    const totalEl = document.getElementById('f-total');
    if (totalEl) totalEl.innerHTML = `<span dir="ltr">${totalVal} ${currencySymbol}</span>`;
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

  const initialFieldValues = {};

  async function sendNotification(field, value) {
    if (typeof notifyOrganization !== 'function' || !profile?.organization_id) return;

    const threshold = Number(product.low_stock_threshold ?? 10);
    const isLow = field === 'qty' && Number(value) <= threshold;

    try {
      if (isLow) {
        await notifyOrganization({
          orgId: profile.organization_id,
          title: tr('low_stock_alert_title'),
          message: tr('low_stock_alert_single')
            .replace('{name}', product.name)
            .replace('{qty}', value)
            .replace('{threshold}', threshold),
          type: 'warning',
          link: `/products/detail.html?id=${productId}`,
          userName: profile.full_name || null,
        });
      } else {
        await notifyOrganization({
          orgId: profile.organization_id,
          title: tr('prod_detail_notif_edit_title'),
          message: `${profile.full_name || tr('prod_detail_user')} ${tr('prod_detail_notif_edit_msg')} ${fieldLabels[field] || field} "${product.name}" ${tr('prod_detail_to')} "${value}"`,
          type: 'info',
          link: `/products/detail.html?id=${productId}`,
          userName: profile.full_name || null,
        });
      }
    } catch (e) { console.warn(e); }
  }

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
    const el = document.getElementById(id);
    if (!el) return;

    initialFieldValues[field] = String(el.dataset.value || '');

    inlineEdit({
      el,
      table: 'products',
      id: productId,
      field,
      type,
      onSave: async (savedField, newValue) => {
        if (savedField === 'qty' || savedField === 'price') recalcTotal();
        if (savedField === 'qty') {
          el.dataset.value = newValue;
          updateQtyStyle();
        }

        if (String(newValue) !== String(initialFieldValues[field])) {
          await sendNotification(field, newValue);
          initialFieldValues[field] = String(newValue); 
        }
      },
    });
  });

  let lowStockSaveTimeout = null;
  const lowStockInput = document.getElementById('low-stock-input');

  if (lowStockInput) {
    lowStockInput.addEventListener('input', () => {
      clearTimeout(lowStockSaveTimeout);
      lowStockSaveTimeout = setTimeout(async () => {
        const newThreshold = Math.max(0, Number(lowStockInput.value) || 0);

        try {
          const { error: updateError } = await db
            .from('products')
            .update({ low_stock_threshold: newThreshold })
            .eq('id', productId);

          if (updateError) throw new Error(updateError.message);

          product.low_stock_threshold = newThreshold;
          updateQtyStyle();

          const currentQty = Number(product.qty ?? 0);
          if (currentQty <= newThreshold && typeof notifyOrganization === 'function' && profile?.organization_id) {
            await notifyOrganization({
              orgId: profile.organization_id,
              title: tr('low_stock_alert_title'),
              message: tr('low_stock_alert_already')
                .replace('{name}', product.name)
                .replace('{qty}', currentQty)
                .replace('{threshold}', newThreshold),
              type: 'warning',
              link: `/products/detail.html?id=${productId}`,
              userName: profile.full_name || null,
            });
          }
        } catch (err) {
          console.error('فشل حفظ حد التنبيه:', err);
        }
      }, 800);
    });
  }

  const imgContainer = document.getElementById('product-image-container');
  if (imgContainer && typeof attachImageUpload === 'function') {
    attachImageUpload(productId, imgContainer, product.image_url);
  }

  const sellPriceToggle = document.getElementById('sell-price-toggle');
  const sellPriceStatus = document.getElementById('sell-price-status');
  const sellPriceInput = document.getElementById('sell-price-input');

  if (sellPriceToggle && sellPriceStatus) {
    sellPriceToggle.addEventListener('change', async () => {
      const newValue = sellPriceToggle.checked;
      sellPriceToggle.disabled = true;

      try {
        const { error: updateError } = await db
          .from('products')
          .update({ sell_price_enabled: newValue })
          .eq('id', productId);

        if (updateError) throw new Error(updateError.message);

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
  }

  let sellPriceSaveTimeout = null;
  if (sellPriceInput) {
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
  }

  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
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
  }
});