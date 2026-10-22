// ============================================
// صفحة المنتجات (مع التحديث الفوري وإظهار العملة)
// ============================================
let productsChannel = null; 
let cachedProducts = []; 
let orgCurrencySymbol = ''; 
let orgShowCurrency = false; 

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/list.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('products_title_full');

  // ✅ [التغيير 1]: جلب إعدادات العملة من قاعدة البيانات
  try {
    const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();
    if (profile?.organization_id) {
      const { data: org } = await db.from('organizations').select('currency_symbol, show_currency').eq('id', profile.organization_id).single();
      if (org) {
        orgCurrencySymbol = org.currency_symbol || '';
        orgShowCurrency = org.show_currency !== false;
        console.log("✅ تم جلب إعدادات العملة:", orgCurrencySymbol, orgShowCurrency);
      }
    }
  } catch (err) {
    console.warn('❌ فشل جلب العملة:', err);
  }

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

  await loadProductsFromDB();

  document.getElementById('search-products').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  productsChannel = db.channel('custom-products-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        loadProductsFromDB(); 
      }
    )
    .subscribe();

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'PRODUCT_INSTANT_ADD' && data.products) {
      data.products.forEach(p => cachedProducts.unshift(p));
      renderProductsToDOM();
    }

    if (data.type === 'PRODUCT_INSTANT_UPDATE_QTY' && data.updates) {
      data.updates.forEach(update => {
        const index = cachedProducts.findIndex(p => p.id === update.id);
        if (index !== -1) cachedProducts[index].qty = update.newQty;
      });
      renderProductsToDOM();
    }
  });
});

async function loadProductsFromDB() {
  const { data, error } = await db
    .from('products')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false });

  const container = document.getElementById('products');
  if (error) {
    container.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    return;
  }

  cachedProducts = data || [];
  renderProductsToDOM();
}

// ✅ [التغيير 2]: دالة تنسيق السعر مع العملة
function formatPrice(price) {
  const val = Number(price || 0);
  const formattedNum = val.toFixed(2);

  // إذا لم تكن هناك عملة محددة، نعرض الرقم فقط
  if (!orgShowCurrency || !orgCurrencySymbol) {
    return formattedNum;
  }
  
  // استخدام مكتبة CurrencyUtils إذا كانت موجودة
  if (typeof CurrencyUtils !== 'undefined' && CurrencyUtils.formatCurrency) {
    return CurrencyUtils.formatCurrency(val, orgCurrencySymbol, orgShowCurrency);
  }
  
  // الخيار الاحتياطي: عرض الرقم ثم الرمز (مثال: 150.00 DH)
  return `${formattedNum} ${orgCurrencySymbol}`;
}

function renderProductsToDOM() {
  const tr = (key) => (window.t ? window.t(key) : key);
  const container = document.getElementById('products');
  if (!container) return;

  if (cachedProducts.length === 0) {
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

  for (const p of cachedProducts) {
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

  const isDesktop = window.innerWidth >= 1024;

  container.innerHTML = grouped.map(p => {
    const total = (Number(p.qty ?? 0) * Number(p.price ?? 0));
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
            <!-- ✅ [التغيير 3]: استدعاء دالة التنسيق هنا -->
            <div class="stat-value">${formatPrice(p.price)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${tr('products_total')}</div>
            <!-- ✅ [التغيير 4]: استدعاء دالة التنسيق هنا -->
            <div class="stat-value">${formatPrice(total)}</div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  if (window.self !== window.top) {
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = card.dataset.productId;
        window.parent.postMessage({ type: 'PRODUCT_SELECTED', productId: productId }, '*');
      });
    });
  }
}