// ============================================
// صفحة تفاصيل المنتج
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

  const total = ((product.qty ?? 0) * (product.price ?? 0)).toFixed(2);

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
          <div class="stat-label">الثمن</div>
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
    price: 'الثمن',
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