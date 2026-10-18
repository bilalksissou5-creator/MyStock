// ============================================
// صفحة تفاصيل المنتج (التقسيم الثلاثي)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/detail.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_detail_title_full') || 'Product Details';

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const main = document.getElementById('main-content');

  if (!productId) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_no_id')}</div>`;
    return;
  }

  // 1. جلب بيانات المنتج + المورد
  const { data: product, error } = await db
    .from('products')
    .select('*, suppliers(name, specialty, phone)')
    .eq('id', productId)
    .single();

  if (error || !product) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_not_found')}</div>`;
    return;
  }

  // 2. جلب بيانات المستخدم (العامل/النائب) الذي أضاف المنتج
  let creatorName = tr('prod_detail_unknown_user') || 'غير معروف';
  let creatorRole = '';
  if (product.created_by) {
    const { data: creatorProfile } = await db
      .from('profiles')
      .select('full_name, role')
      .eq('id', product.created_by)
      .single();
    if (creatorProfile) {
      creatorName = creatorProfile.full_name || creatorName;
      creatorRole = creatorProfile.role || '';
    }
  }

  // 3. جلب العملة
  const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();
  let currencySymbol = '';
  if (profile?.organization_id) {
    const { data: org } = await db.from('organizations').select('currency_symbol').eq('id', profile.organization_id).single();
    currencySymbol = org?.currency_symbol || '';
  }

  const total = ((product.qty ?? 0) * (product.price ?? 0)).toFixed(2);

  // ✅ بناء التقسيم الثلاثي باستخدام كلاسات الـ CSS الجديدة
  main.innerHTML = `
    <div class="detail-workspace">
      
      <!-- القسم الأول: معلومات المستخدم (العامل) -->
      <div class="detail-panel">
        <h3>${tr('prod_detail_user_info') || 'معلومات المستخدم'}</h3>
        <div class="product-extra">
          <div class="row">
            <span>${tr('prod_detail_added_by') || 'أضيف بواسطة'}:</span>
            <strong>${creatorName} ${creatorRole ? `(${creatorRole})` : ''}</strong>
          </div>
          <div class="row">
            <span>${tr('prod_detail_date') || 'التاريخ'}:</span>
            <strong>${new Date(product.created_at).toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      <!-- القسم الثاني: تفاصيل المنتج -->
      <div class="product-card-detail" style="order: 2; margin: 0; max-width: 100%;">
        
        <div class="product-image" id="product-image-container">
          ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : `<i class="fas fa-box-open"></i>`}
          <button class="image-edit-btn" title="${tr('prod_detail_edit_image')}">
            <i class="fas fa-camera"></i>
          </button>
        </div>

        <h1 class="detail-title">
          <span class="edit-field" id="f-name" data-value="${product.name ?? ''}">${product.name ?? ''}</span>
        </h1>
        <p class="detail-sku">
          <span class="edit-field" id="f-sku" data-value="${product.sku ?? ''}">${product.sku ?? ''}</span>
        </p>

        <div class="product-stats">
          <div class="stat">
            <div class="stat-label">${tr('products_qty')}</div>
            <div class="stat-value ${(product.qty ?? 0) < 10 ? 'low' : ''}">
              <span class="edit-field center" id="f-qty" data-value="${product.qty ?? 0}">${product.qty ?? 0}</span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('prod_detail_buy_price')}</div>
            <div class="stat-value">
              <span class="edit-field center" id="f-price" data-value="${product.price ?? 0}">${product.price ?? 0} ${currencySymbol}</span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('products_total')}</div>
            <div class="stat-value" id="f-total">${total} ${currencySymbol}</div>
          </div>
        </div>

        <div class="product-extra">
          <div class="row">
            <span>${tr('prod_detail_category')}:</span>
            <strong class="edit-field" id="f-category" data-value="${product.category ?? ''}">${product.category ?? '—'}</strong>
          </div>
        </div>

      </div>

      <!-- القسم الثالث: تفاصيل المورد -->
      <div class="detail-panel">
        <h3>${tr('prod_detail_supplier_info') || 'معلومات المورد'}</h3>
        <div class="product-extra">
          <div class="row">
            <span>${tr('prod_detail_supplier')}:</span>
            <strong>${product.suppliers?.name || '—'}</strong>
          </div>
          <div class="row">
            <span>${tr('prod_detail_specialty') || 'التخصص'}:</span>
            <strong>${product.suppliers?.specialty || '—'}</strong>
          </div>
          <div class="row">
            <span>${tr('prod_detail_phone') || 'الهاتف'}:</span>
            <strong>${product.suppliers?.phone || '—'}</strong>
          </div>
        </div>
      </div>

    </div>
  `;
});