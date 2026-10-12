// ============================================
// صفحة تفاصيل المنتج
// ✅ قسم سعر البيع (Switch + قيمة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/detail.html');

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const main = document.getElementById('main-content');

  if (!productId) {
    main.innerHTML = `<div class="alert alert-error">لم يتم تحديد المنتج</div>`;
    return;
  }

  const { data: product, error } = await db
    .from('products')
    .select('*, suppliers(name, specialty)')
    .eq('id', productId)
    .single();

  if (error || !product) {
    main.innerHTML = `<div class="alert alert-error">المنتج غير موجود</div>`;
    return;
  }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  // إعدادات العملة
  let currencySymbol = '';
  if (profile?.organization_id) {
    const { data: org } = await db
      .from('organizations')
      .select('currency_symbol')
      .eq('id', profile.organization_id)
      .single();
    currencySymbol = org?.currency_symbol || '';
  }

  const total = ((product.qty ?? 0) * (product.price ?? 0)).toFixed(2);
  const sellPrice = Number(product.sell_price ?? 0);
  const sellPriceEnabled = product.sell_price_enabled === true;

  main.innerHTML = `
    <div class="page-header">
      <h2>تفاصيل المنتج</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="product-card-detail">

      <div class="product-image" id="product-image-container">
        ${product.image_url
          ? `<img src="${product.image_url}" alt="${product.name ?? 'منتج'}">`
          : `<i class="fas fa-box-open"></i>`}
        <button class="image-edit-btn" title="تعديل الصورة">
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
          <div class="stat-label">الكمية</div>
          <div class="stat-value ${(product.qty ?? 0) < 10 ? 'low' : ''}">
            <span class="edit-field center" id="f-qty" data-value="${product.qty ?? 0}"></span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">سعر الشراء</div>
          <div class="stat-value">
            <span class="edit-field center" id="f-price" data-value="${product.price ?? 0}"></span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">المجموع</div>
          <div class="stat-value" id="f-total">${total}</div>
        </div>
      </div>

      <div class="product-extra">
        <div class="row">
          <span>الفئة</span>
          <strong class="edit-field" id="f-category" data-value="${product.category ?? product.suppliers?.specialty ?? ''}"></strong>
        </div>
        <div class="row">
          <span>المورد</span>
          <strong>${product.suppliers?.name ?? '—'}</strong>
        </div>
        <div class="row">
          <span>الوحدة</span>
          <strong class="edit-field" id="f-unit" data-value="${product.unit ?? ''}"></strong>
        </div>
        <div class="row">
          <span>الباركود</span>
          <strong class="edit-field" id="f-qr_code" data-value="${product.qr_code ?? ''}"></strong>
        </div>
      </div>

      <!-- ══════ سعر البيع ══════ -->
      <div class="sell-price-section">
        <h3 class="sell-price-title">💰 سعر البيع</h3>

        <div class="switch-item">
          <div class="switch-content">
            <div class="switch-header">
              <strong class="switch-title">تفعيل سعر بيع خاص</strong>
              <span class="switch-status ${sellPriceEnabled ? 'on' : 'off'}" id="sell-price-status">
                ${sellPriceEnabled ? 'مفعّل' : 'غير مفعّل'}
              </span>
            </div>
            <p class="switch-desc">عند التفعيل يُستخدم هذا السعر في إيصال البيع (بدلاً من سعر الشراء)</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="sell-price-toggle" ${sellPriceEnabled ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>

        <div class="sell-price-input-group">
          <label>سعر البيع (${currencySymbol || 'DH'})</label>
          <input type="number" id="sell-price-input" value="${sellPrice}" min="0" step="0.01" dir="ltr" placeholder="0.00">
          <small class="field-hint">أدخل السعر الذي تريد بيع المنتج به</small>
        </div>
      </div>

      <div class="actions">
        <button class="btn-danger" id="delete-btn">
          <i class="fas fa-trash"></i>
          <span>حذف المنتج</span>
        </button>
      </div>

    </div>
  `;

  function recalcTotal() {
    const qty = Number(document.getElementById('f-qty').dataset.value ?? 0);
    const price = Number(document.getElementById('f-price').dataset.value ?? 0);
    document.getElementById('f-total').textContent = (qty * price).toFixed(2);
  }

  const fieldLabels = {
    name: 'الاسم',
    sku: 'SKU',
    qty: 'الكمية',
    price: 'سعر الشراء',
    category: 'الفئة',
    unit: 'الوحدة',
    qr_code: 'الباركود',
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
            title: 'تعديل منتج',
            message: `${profile.full_name || 'مستخدم'} عدّل ${fieldLabels[savedField] || savedField} "${product.name}" إلى "${newValue}"`,
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

  // ═══════════════════════════════════════════
  // ✅ Switch: تفعيل سعر البيع
  // ═══════════════════════════════════════════
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
      sellPriceStatus.textContent = newValue ? 'مفعّل' : 'غير مفعّل';
      sellPriceStatus.classList.toggle('on', newValue);
      sellPriceStatus.classList.toggle('off', !newValue);

      // إشعار
      if (typeof notifyOrganization === 'function' && profile?.organization_id) {
        await notifyOrganization({
          orgId: profile.organization_id,
          title: 'تعديل سعر البيع',
          message: `${profile.full_name || 'مستخدم'} ${newValue ? 'فعّل' : 'أوقف'} سعر البيع الخاص بـ "${product.name}"`,
          type: 'info',
          link: `/products/detail.html?id=${productId}`,
          userName: profile.full_name || null,
        });
      }
    } catch (err) {
      alert('خطأ: ' + err.message);
      // إرجاع الحالة السابقة
      sellPriceToggle.checked = !newValue;
    } finally {
      sellPriceToggle.disabled = false;
    }
  });

  // ═══════════════════════════════════════════
  // ✅ حفظ سعر البيع عند تغيير القيمة
  // ═══════════════════════════════════════════
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

        // إشعار
        if (typeof notifyOrganization === 'function' && profile?.organization_id) {
          await notifyOrganization({
            orgId: profile.organization_id,
            title: 'تعديل سعر البيع',
            message: `${profile.full_name || 'مستخدم'} عدّل سعر البيع الخاص بـ "${product.name}" إلى "${newPrice}"`,
            type: 'info',
            link: `/products/detail.html?id=${productId}`,
            userName: profile.full_name || null,
          });
        }
      } catch (err) {
        console.error('فشل حفظ سعر البيع:', err);
      }
    }, 800); // ✅ ينتظر 800ms بعد آخر إدخال
  });

  // ═══════════════════════════════════════════
  // حذف المنتج
  // ═══════════════════════════════════════════
  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const { error } = await db.from('products').delete().eq('id', productId);

    if (error) {
      alert('خطأ: ' + error.message);
      return;
    }

    if (typeof notifyOrganization === 'function' && profile?.organization_id) {
      await notifyOrganization({
        orgId: profile.organization_id,
        title: 'حذف منتج',
        message: `${profile.full_name || 'مستخدم'} حذف "${product.name}"`,
        type: 'danger',
        link: '/products/list.html',
        userName: profile.full_name || null,
      });
    }

    window.location.href = 'list.html';
  });
});