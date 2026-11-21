
 // ============================================
 // صفحة المنتجات (مع التحديث الفوري والعملة)
 // ✅ دعم كامل للترجمة
 // ✅ إصلاح اتجاه العملة (LTR) لمنع انزياحها
 // ✅ إخفاء المنتجات المحذوفة (deleted_at)
 // ✅ Skeleton مطابق لأبعاد بطاقات المنتجات الأصلية
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

  const main = document.getElementById('main-content');
  if (!main) return;

  // ============================================
  // ✅ CSS الخاص بعناصر Skeleton فقط
  // ============================================
  if (!document.getElementById('products-skeleton-style')) {
    const style = document.createElement('style');
    style.id = 'products-skeleton-style';

    style.textContent = `
      /* البطاقة الوهمية تحتفظ بتصميم البطاقة الأصلية */
      .product-skeleton {
        pointer-events: none;
      }

      /* العناصر الرمادية فقط */
      .product-skeleton .skeleton-shape {
        position: relative;
        overflow: hidden;
        background: #e5e5e5;
        border-radius: 4px;
      }

      /* حركة التحميل */
      .product-skeleton .skeleton-shape::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255,255,255,0.65),
          transparent
        );
        animation: productSkeletonShimmer 1.4s infinite;
      }

      @keyframes productSkeletonShimmer {
        100% {
          transform: translateX(100%);
        }
      }

      /* الصورة الوهمية: تحتفظ بارتفاع الصورة الأصلي */
      .product-skeleton .product-card-image {
        position: relative;
        background: #e5e5e5;
      }

      /* مكان اسم المنتج */
      .product-skeleton .skeleton-title {
        width: 65%;
        height: 15px;
        margin: 0 5px 6px;
      }

      /* مكان SKU */
      .product-skeleton .skeleton-sku {
        width: 40%;
        height: 12px;
        margin: 0 5px 12px;
      }

      /* مكان عناوين الإحصائيات */
      .product-skeleton .skeleton-stat-label {
        width: 65%;
        height: 9px;
        margin: 3px auto 4px;
      }

      /* مكان قيم الإحصائيات */
      .product-skeleton .skeleton-stat-value {
        width: 50%;
        height: 12px;
        margin: 4px auto;
      }

      /* الهاتف العمودي */
      @media (max-width: 768px) and (orientation: portrait) {
        .product-skeleton .skeleton-title {
          height: 13px;
          margin-bottom: 4px;
        }

        .product-skeleton .skeleton-sku {
          height: 11px;
          margin-bottom: 8px;
        }

        .product-skeleton .skeleton-stat-label {
          height: 8px;
        }

        .product-skeleton .skeleton-stat-value {
          height: 11px;
        }
      }

      /* الهاتف الأفقي */
      @media (orientation: landscape) and (max-height: 500px) {
        .product-skeleton .skeleton-title {
          height: 12px;
          margin-bottom: 2px;
        }

        .product-skeleton .skeleton-sku {
          height: 10px;
          margin-bottom: 6px;
        }

        .product-skeleton .skeleton-stat-label {
          height: 7px;
        }

        .product-skeleton .skeleton-stat-value {
          height: 10px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .product-skeleton .skeleton-shape::after {
          animation: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ============================================
  // ✅ عرض هيكل الصفحة فوراً
  // ============================================
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
      <input
        type="text"
        id="search-products"
        placeholder="${tr('products_search_ph')}"
      >
    </div>

    <div id="products" class="products" aria-busy="true">
      ${Array.from({ length: 6 }).map(() => `
        <div class="product-card product-skeleton" aria-hidden="true">

          <div class="product-card-image skeleton-shape"></div>

          <div class="skeleton-shape skeleton-title"></div>

          <div class="skeleton-shape skeleton-sku"></div>

          <div class="product-stats">

            <div class="stat">
              <div class="skeleton-shape skeleton-stat-label"></div>
              <div class="skeleton-shape skeleton-stat-value"></div>
            </div>

            <div class="stat">
              <div class="skeleton-shape skeleton-stat-label"></div>
              <div class="skeleton-shape skeleton-stat-value"></div>
            </div>

            <div class="stat">
              <div class="skeleton-shape skeleton-stat-label"></div>
              <div class="skeleton-shape skeleton-stat-value"></div>
            </div>

          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ============================================
  // ✅ 1. جلب العملة من إعدادات المنظمة
  // ============================================
  try {
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      const { data: org } = await db
        .from('organizations')
        .select('currency_symbol, show_currency')
        .eq('id', profile.organization_id)
        .single();

      if (org) {
        orgCurrencySymbol = org.currency_symbol || '';
        orgShowCurrency = org.show_currency !== false;
      }
    }
  } catch (err) {
    console.warn('Failed to load currency settings:', err);
  }

  // ============================================
  // ✅ جلب المنتجات
  // ============================================
  await loadProductsFromDB();

  // ============================================
  // ✅ البحث في المنتجات
  // ============================================
  const searchInput = document.getElementById('search-products');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();

      document.querySelectorAll(
        '.product-card:not(.product-skeleton)'
      ).forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // ============================================
  // ✅ الاستماع لكل التغييرات في المنتجات
  // ============================================
  productsChannel = db.channel('custom-products-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      async (payload) => {

        if (payload.eventType === 'UPDATE') {
          const index = cachedProducts.findIndex(
            p => p.id === payload.new.id
          );

          // إذا تم حذف المنتج
          if (payload.new.deleted_at) {
            if (index !== -1) {
              cachedProducts.splice(index, 1);
              renderProductsToDOM();
            }
          }

          // إذا تم تعديله أو استعادته
          else {
            if (index !== -1) {
              cachedProducts[index] = {
                ...cachedProducts[index],
                ...payload.new
              };

              renderProductsToDOM();
            } else {
              const { data: restoredProduct } = await db
                .from('products')
                .select('*, suppliers(name)')
                .eq('id', payload.new.id)
                .is('deleted_at', null)
                .single();

              if (restoredProduct) {
                cachedProducts.unshift(restoredProduct);
                renderProductsToDOM();
              }
            }
          }
        }

        // إضافة منتج جديد
        else if (payload.eventType === 'INSERT') {
          const { data: newProduct } = await db
            .from('products')
            .select('*, suppliers(name)')
            .eq('id', payload.new.id)
            .is('deleted_at', null)
            .single();

          if (
            newProduct &&
            !cachedProducts.some(p => p.id === newProduct.id)
          ) {
            cachedProducts.unshift(newProduct);
            renderProductsToDOM();
          }
        }

        // الحذف النهائي
        else if (payload.eventType === 'DELETE') {
          cachedProducts = cachedProducts.filter(
            p => p.id !== payload.old.id
          );

          renderProductsToDOM();
        }
      }
    )
    .subscribe();

  // ============================================
  // ✅ استقبال التحديثات من الصفحات الأخرى
  // ============================================
  window.addEventListener('message', (event) => {
    const data = event.data;

    if (!data || typeof data !== 'object') return;

    if (data.type === 'PRODUCT_INSTANT_ADD' && data.products) {
      data.products.forEach(p => cachedProducts.unshift(p));
      renderProductsToDOM();
    }

    if (data.type === 'PRODUCT_INSTANT_UPDATE_QTY' && data.updates) {
      data.updates.forEach(update => {
        const index = cachedProducts.findIndex(
          p => p.id === update.id
        );

        if (index !== -1) {
          cachedProducts[index].qty = update.newQty;
        }
      });

      renderProductsToDOM();
    }
  });
});

// ============================================
// ✅ جلب المنتجات من Supabase
// ============================================
async function loadProductsFromDB() {
  const container = document.getElementById('products');
  if (!container) return;

  container.setAttribute('aria-busy', 'true');

  const { data, error } = await db
    .from('products')
    .select('*, suppliers(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    container.setAttribute('aria-busy', 'false');

    container.innerHTML = `
      <div class="alert alert-error">
        ${error.message}
      </div>
    `;

    return;
  }

  cachedProducts = data || [];

  renderProductsToDOM();
}

// ============================================
// ✅ تنسيق السعر مع العملة
// ============================================
function formatPrice(price) {
  const val = Number(price || 0).toFixed(2);

  if (!orgShowCurrency || !orgCurrencySymbol) {
    return val;
  }

  return `${val} ${orgCurrencySymbol}`;
}

// ============================================
// ✅ رسم بطاقات المنتجات
// ============================================
function renderProductsToDOM() {
  const tr = (key) => (window.t ? window.t(key) : key);

  const container = document.getElementById('products');
  if (!container) return;

  container.setAttribute('aria-busy', 'false');

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

  // اكتشاف عرض الشاشة الحقيقي حتى لو كنا داخل إطار
  const isDesktop = (
    window.self !== window.top
      ? window.parent.innerWidth
      : window.innerWidth
  ) >= 1024;

  container.innerHTML = grouped.map(p => {
    const total = Number(p.qty ?? 0) * Number(p.price ?? 0);
    const lowClass = (p.qty ?? 0) < 10 ? 'low' : '';

    // تحديد الرابط بناءً على نوع الشاشة
    const targetUrl = isDesktop
      ? `/products/detail-workspace.html?productId=${p.id}&userId=${p.created_by || ''}&supplierId=${p.supplier_id || ''}&invoiceId=${p.invoice_id || ''}`
      : `detail.html?id=${p.id}`;

    return `
      <a
        href="${targetUrl}"
        class="product-card"
        data-product-id="${p.id}"
      >
        <div class="product-card-image">
          ${
            p.image_url
              ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">`
              : `<i class="fas fa-box-open"></i>`
          }
        </div>

        <h3>${p.name ?? tr('products_no_name')}</h3>

        <p class="sku">${p.sku ?? '—'}</p>

        <div class="product-stats">

          <div class="stat">
            <div class="stat-label">${tr('products_qty')}</div>
            <div class="stat-value ${lowClass}">
              ${p.qty ?? 0}
            </div>
          </div>

          <div class="stat">
            <div class="stat-label">${tr('products_price')}</div>
            <div class="stat-value" dir="ltr">
              ${formatPrice(p.price)}
            </div>
          </div>

          <div class="stat">
            <div class="stat-label">${tr('products_total')}</div>
            <div class="stat-value" dir="ltr">
              ${formatPrice(total)}
            </div>
          </div>

        </div>
      </a>
    `;
  }).join('');
}
