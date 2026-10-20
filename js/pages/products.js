// ============================================
// صفحة المنتجات (مع التحديث الفوري)
// ✅ دعم كامل للترجمة
// ✅ توجيه ذكي (Workspace للحاسوب، Detail للهاتف)
// ============================================
let productsChannel = null; // متغير لحفظ قناة Realtime

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/list.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('products_title_full');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('products_title')}</h2>
      <a href="add.html" class="btn-primary">
        <i class="fas fa-plus"></i>
        <span>${tr('products_add')}</span>
      </a>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="search-products" placeholder="${tr('products_search_ph')}">
    </div>

    <div id="products" class="products">${tr('loading')}</div>
  `;

  await loadProducts();

  document.getElementById('search-products').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // ✅ 1. تفعيل التحديث الفوري من الأجهزة الأخرى (Supabase Realtime)
  productsChannel = db.channel('custom-products-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' }, // يراقب الإضافة، التعديل، والحذف
      (payload) => {
        console.log('تحديث فوري من جهاز آخر:', payload);
        loadProducts(); // إعادة جلب المنتجات فوراً دون تحديث الصفحة
      }
    )
    .subscribe();

  // ✅ 2. الاستماع لرسالة التحديث من الـ Workspace (عند الإضافة على نفس الشاشة)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REFRESH_PRODUCTS') {
      loadProducts();
    }
  });
});

async function loadProducts() {
  const tr = (key) => (window.t ? window.t(key) : key);

  const { data, error } = await db
    .from('products')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false });

  const container = document.getElementById('products');
  if (!container) return;

  if (error) {
    container.innerHTML = `<div class="alert alert-error">${tr('products_error')} ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <p>${tr('products_empty')}</p>
      </div>
    `;
    return;
  }

  const groupedMap = new Map();
  const grouped = [];

  for (const p of data) {
    const key = `${(p.name ?? '').trim()}|${p.supplier_id ?? ''}|${p.price ?? 0}`;

    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      existing.qty = (existing.qty ?? 0) + (p.qty ?? 0);
    } else {
      const copy = { ...p };
      copy.qty = p.qty ?? 0;
      groupedMap.set(key, copy);
      grouped.push(copy);
    }
  }

  // ✅ التوجيه الذكي
  const isDesktop = window.innerWidth >= 1024;

  container.innerHTML = grouped.map(p => {
    const total = ((p.qty ?? 0) * (p.price ?? 0)).toFixed(2);
    const lowClass = (p.qty ?? 0) < 10 ? 'low' : '';
    
    const targetUrl = isDesktop 
      ? `/products/detail-workspace.html?productId=${p.id}&userId=${p.created_by || ''}&supplierId=${p.supplier_id || ''}&invoiceId=${p.invoice_id || ''}` 
      : `detail.html?id=${p.id}`;

    return `
      <a href="${targetUrl}" class="product-card" data-product-id="${p.id}">
        <div class="product-card-image">
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}">`
            : `<i class="fas fa-box-open"></i>`}
        </div>
        <h3>${p.name ?? tr('products_no_name')}</h3>
        <p class="sku">${p.sku ?? '—'}</p>
        <div class="product-stats">
          <div class="stat">
            <div class="stat-label">${tr('products_qty')}</div>
            <div class="stat-value ${lowClass}">${p.qty ?? 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('products_price')}</div>
            <div class="stat-value">${p.price ?? 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('products_total')}</div>
            <div class="stat-value">${total}</div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // ✅ دعم iframe (إذا كانت الصفحة مفتوحة داخل الـ Workspace الأوسط)
  if (window.self !== window.top) {
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = card.dataset.productId;
        window.parent.postMessage({
          type: 'PRODUCT_SELECTED',
          productId: productId
        }, '*');
      });
    });
  }
}