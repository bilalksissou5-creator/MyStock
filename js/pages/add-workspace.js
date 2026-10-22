// ============================================
// Workspace (تقسيم صفحة الإضافة) - إصدار Grid
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  if (window.innerWidth <= 1024) {
    window.location.replace('/products/add.html');
    return; 
  }

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add-workspace.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_add_title_full') || 'Workspace';

  const main = document.getElementById('main-content');

  // جلب بيانات المنظمة (للعملة)
  const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();
  let orgCurrencySymbol = '';
  if (profile?.organization_id) {
    const { data: org } = await db.from('organizations').select('currency_symbol').eq('id', profile.organization_id).single();
    orgCurrencySymbol = org?.currency_symbol || '';
  }

  // ✅ بناء الهيكل الأساسي
  main.innerHTML = `
    <div class="workspace-grid">
      
      <!-- 1. قسم الإضافة -->
      <div class="panel-add">
        <div class="panel-content" id="add-panel">
          <div class="page-header">
            <h2>${tr('prod_add_title')}</h2>
            <button type="button" class="btn-primary scan-btn" id="scan-btn">
              <i class="fas fa-barcode"></i> <span>${tr('prod_add_scan')}</span>
            </button>
          </div>
          <div class="alert alert-error" id="form-error" style="display:none;"></div>
          <div class="alert alert-success" id="form-success" style="display:none;"></div>
          <div class="add-form" id="form-fields-container">
            <!-- سيتم بناء النموذج هنا -->
          </div>
        </div>
      </div>

      <!-- 2. قسم القائمة -->
      <div class="panel-list">
        <div class="panel-content" id="list-panel">
          <div class="page-header">
            <h2>${tr('products_title')}</h2>
          </div>
          <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="search-products" placeholder="${tr('products_search_ph')}">
          </div>
          <div id="products-list-container" class="products">
            ${tr('loading')}
          </div>
        </div>
      </div>

      <!-- 3. قسم التفاصيل -->
      <div class="panel-detail">
        <div class="panel-content" id="detail-panel">
          <div class="empty-state" style="margin-top:20px;">
            <i class="fas fa-box-open"></i>
            <p>${tr('prod_detail_title') || 'Select a product'}</p>
          </div>
        </div>
      </div>

    </div>
  `;

  // ============================================
  // 1. منطق قسم الإضافة
  // ============================================
  let addedProducts = [];
  let isSaving = false;
  let scannedImageUrl = null;

  document.getElementById('form-fields-container').innerHTML = `
    <div class="product-input-card">
      <div class="form-group">
        <label>${tr('prod_add_supplier')}</label>
        <input type="text" id="supplier-input" placeholder="${tr('prod_add_supplier_ph')}" autocomplete="off">
      </div>
    </div>
    <div class="product-input-card">
      <div class="form-group"><label>${tr('prod_add_name')}</label><input type="text" id="product-name"></div>
      <div class="form-group"><label>${tr('prod_add_qty')}</label><input type="number" id="product-qty" value="1" min="1"></div>
      <div class="form-group"><label>${tr('prod_add_price')}</label><input type="number" id="product-price" value="0" step="0.01"></div>
      <div class="form-group"><label>${tr('prod_add_category')}</label><input type="text" id="product-category"></div>
      <div class="form-group"><label>${tr('prod_add_barcode')}</label><input type="text" id="product-sku" dir="ltr"></div>
      <button type="button" class="btn-primary" id="done-btn" style="width:100%; justify-content:center;">
        <i class="fas fa-check"></i> <span>${tr('prod_add_done')}</span>
      </button>
    </div>
    
    <div class="added-products-section" style="padding:0; box-shadow:none;">
      <div id="added-products" class="added-products"></div>
      <div class="form-summary" style="margin-top:12px;">
        <div class="summary-row"><span>${tr('prod_add_sum_count')}</span><strong id="sum-rows">0</strong></div>
        <div class="summary-row"><span>${tr('prod_add_sum_qty')}</span><strong id="sum-qty">0</strong></div>
        <div class="summary-row highlight"><span>${tr('prod_add_sum_total')}</span><strong id="sum-total">0.00 ${orgCurrencySymbol}</strong></div>
      </div>
      <button type="button" class="btn-primary" id="save-all-btn" style="width:100%; margin-top:12px; justify-content:center; background:#2563eb;">
        <i class="fas fa-save"></i> <span>${tr('prod_add_save')}</span>
      </button>
    </div>
  `;

  const nameInput = document.getElementById('product-name');
  const qtyInput = document.getElementById('product-qty');
  const priceInput = document.getElementById('product-price');
  const skuInput = document.getElementById('product-sku');
  const categoryInput = document.getElementById('product-category');
  const doneBtn = document.getElementById('done-btn');
  const addedContainer = document.getElementById('added-products');

  doneBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const qty = Number(qtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;
    if(!name || qty <= 0) return alert('أدخل الاسم والكمية');

    addedProducts.push({ name, qty, price, category: categoryInput.value, sku: skuInput.value || 'SKU-'+Date.now(), image_url: scannedImageUrl });
    nameInput.value = ''; qtyInput.value = '1'; priceInput.value = '0'; skuInput.value = '';
    renderCart();
  });

  function renderCart() {
    if(addedProducts.length === 0) {
      addedContainer.innerHTML = `<p style="text-align:center; color:#a3a3a3; font-size:12px;">${tr('prod_add_empty')}</p>`;
    } else {
      addedContainer.innerHTML = addedProducts.map((p, i) => `
        <div class="added-product-card" style="padding:8px; margin-bottom:8px;">
          <div class="added-product-info"><strong>${p.name}</strong><span>${p.qty} × ${p.price}</span></div>
          <button class="added-product-delete" onclick="removeItem(${i})"><i class="fas fa-xmark"></i></button>
        </div>
      `).join('');
    }
    let tq = 0, tv = 0;
    addedProducts.forEach(p => { tq += p.qty; tv += p.qty * p.price; });
    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = tq;
    document.getElementById('sum-total').textContent = `${tv.toFixed(2)} ${orgCurrencySymbol}`;
  }
  window.removeItem = (i) => { addedProducts.splice(i, 1); renderCart(); };
  renderCart();

  document.getElementById('save-all-btn').addEventListener('click', async () => {
    if(addedProducts.length === 0 || isSaving) return;
    isSaving = true;
    const btn = document.getElementById('save-all-btn');
    btn.innerHTML = '...';
    try {
      alert('تم الحفظ (ضع كود Supabase الخاص بك هنا)');
      addedProducts = []; renderCart(); 
      loadProductList();
    } catch (e) { alert(e.message); }
    isSaving = false; btn.innerHTML = 'Save';
  });

  // ============================================
  // 2. منطق قسم القائمة
  // ============================================
  let cachedProducts = [];

  async function loadProductList() {
    const { data } = await db.from('products').select('*').order('created_at', { ascending: false });
    cachedProducts = data || [];
    renderList();
  }

  function renderList() {
    const container = document.getElementById('products-list-container');
    if(cachedProducts.length === 0) { container.innerHTML = `<p>لا توجد منتجات</p>`; return; }
    
    const grouped = [];
    const map = new Map();
    for(const p of cachedProducts) {
      const key = `${p.name}_${p.price}_${p.supplier_id}`;
      if(map.has(key)) { map.get(key).qty += p.qty; } 
      else { const c = {...p}; map.set(key, c); grouped.push(c); }
    }

    container.innerHTML = grouped.map(p => `
      <a href="#" class="product-card" onclick="openDetail('${p.id}'); return false;">
        <div class="product-card-image">
          ${p.image_url ? `<img src="${p.image_url}">` : `<i class="fas fa-box"></i>`}
        </div>
        <h3>${p.name}</h3>
        <p class="sku">${p.sku || '—'}</p>
        <div class="product-stats">
           <div class="stat"><div class="stat-label">Qty</div><div class="stat-value">${p.qty}</div></div>
           <div class="stat"><div class="stat-label">Price</div><div class="stat-value">${p.price} ${orgCurrencySymbol}</div></div>
        </div>
      </a>
    `).join('');
  }

  document.getElementById('search-products').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('#products-list-container .product-card').forEach(c => {
      c.style.display = c.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  });

  db.channel('ws-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
    loadProductList();
  }).subscribe();

  // ============================================
  // 3. منطق قسم التفاصيل
  // ============================================
  window.openDetail = async (productId) => {
    const detailPanel = document.getElementById('detail-panel');
    detailPanel.innerHTML = `<p style="text-align:center;">${tr('loading')}</p>`;
    
    const { data: product } = await db.from('products').select('*, suppliers(name)').eq('id', productId).single();
    
    if(!product) { detailPanel.innerHTML = `<p>المنتج غير موجود</p>`; return; }

    detailPanel.innerHTML = `
      <div class="page-header" style="margin-bottom:12px;">
        <h2>${tr('prod_detail_title')}</h2>
        <button class="btn-secondary" onclick="document.getElementById('detail-panel').innerHTML='<div class=\\'empty-state\\'><p>Select a product</p></div>'">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="product-image" style="height:150px; margin-bottom:12px;">
        ${product.image_url ? `<img src="${product.image_url}">` : `<i class="fas fa-box"></i>`}
      </div>
      <h3 style="margin-bottom:4px;">${product.name}</h3>
      <p style="color:#737373; font-size:12px; margin-bottom:12px;">${product.sku}</p>
      
      <div class="product-stats" style="margin-bottom:12px;">
        <div class="stat"><div class="stat-label">Qty</div><div class="stat-value">${product.qty}</div></div>
        <div class="stat"><div class="stat-label">Buy Price</div><div class="stat-value">${product.price} ${orgCurrencySymbol}</div></div>
      </div>
      <div class="product-extra" style="font-size:13px; margin-bottom:12px;">
        <div class="row"><span>Category</span><strong>${product.category || '—'}</strong></div>
        <div class="row"><span>Supplier</span><strong>${product.suppliers?.name || '—'}</strong></div>
      </div>
      <button class="btn-danger" style="width:100%; justify-content:center;" onclick="deleteProduct('${product.id}')">
        <i class="fas fa-trash"></i> ${tr('prod_detail_delete')}
      </button>
    `;
  };

  window.deleteProduct = async (id) => {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    await db.from('products').delete().eq('id', id);
    document.getElementById('detail-panel').innerHTML = `<p>تم الحذف</p>`;
    loadProductList();
  };

  loadProductList();
});