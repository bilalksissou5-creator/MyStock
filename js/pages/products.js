// ============================================
// صفحة المنتجات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/list.html');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>المنتجات</h2>
      <a href="add.html" class="btn-primary">
        <i class="fas fa-plus"></i>
        <span>إضافة منتج</span>
      </a>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="search-products" placeholder="بحث بالاسم أو SKU...">
    </div>

    <div id="products" class="products">جارٍ التحميل...</div>
  `;

  await loadProducts();

  document.getElementById('search-products').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
});

// ============================================
// جلب المنتجات وتجميعها
// ============================================
async function loadProducts() {
  const { data, error } = await db
    .from('products')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false });

  const container = document.getElementById('products');
  if (!container) return;

  if (error) {
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <p>لا توجد منتجات بعد</p>
      </div>
    `;
    return;
  }

  // تجميع: نفس (اسم + مورد + سعر)
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

  container.innerHTML = grouped.map(p => {
    const total = ((p.qty ?? 0) * (p.price ?? 0)).toFixed(2);
    const lowClass = (p.qty ?? 0) < 10 ? 'low' : '';

    return `
      <a href="detail.html?id=${p.id}" class="product-card">
        <div class="product-card-image">
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}">`
            : `<i class="fas fa-box-open"></i>`}
        </div>
        <h3>${p.name ?? 'بدون اسم'}</h3>
        <p class="sku">${p.sku ?? '—'}</p>
        <div class="product-stats">
          <div class="stat">
            <div class="stat-label">الكمية</div>
            <div class="stat-value ${lowClass}">${p.qty ?? 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">الثمن</div>
            <div class="stat-value">${p.price ?? 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">المجموع</div>
            <div class="stat-value">${total}</div>
          </div>
        </div>
      </a>
    `;
  }).join('');
}