// ============================================
// صفحة إضافة منتجات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__productAddLoaded) return;
  window.__productAddLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_add_title_full') || 'Add Products';

  const main = document.getElementById('main-content');

  const { data: suppliers } = await db
    .from('suppliers')
    .select('*')
    .order('name');

  main.innerHTML = `
    <div class="workspace">
      <div class="workspace-panel workspace-panel-left">
        <div class="page-header">
          <h2>${tr('prod_add_title')}</h2>
          <button type="button" class="btn-primary scan-btn" id="scan-btn">
            <i class="fas fa-barcode"></i>
            <span>${tr('prod_add_scan')}</span>
          </button>
        </div>
        <div class="alert alert-error" id="form-error" style="display:none;"></div>
        <div class="alert alert-success" id="form-success" style="display:none;"></div>
        <div class="add-form">
          <div class="product-input-card card-supplier">
            <div class="form-group supplier-group">
              <label>${tr('prod_add_supplier')}</label>
              <input type="text" id="supplier-input" placeholder="${tr('prod_add_supplier_ph')}" autocomplete="off">
              <div id="supplier-suggestions" class="suggestions-box"></div>
              <input type="hidden" id="supplier_id">
            </div>
          </div>
          <div class="product-input-card card-fields">
            <div class="form-grid">
              <div class="form-group">
                <label>${tr('prod_add_name')}</label>
                <input type="text" id="product-name" placeholder="${tr('prod_add_name_ph')}">
              </div>
              <div class="form-group">
                <label>${tr('prod_add_qty')}</label>
                <input type="number" id="product-qty" value="1" min="1">
              </div>
              <div class="form-group">
                <label>${tr('prod_add_price')}</label>
                <input type="number" id="product-price" value="0" min="0" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label>${tr('prod_add_category')}</label>
              <input type="text" id="product-category" placeholder="${tr('prod_add_category_ph')}">
            </div>
            <div class="form-group">
              <label>${tr('prod_add_barcode')}</label>
              <input type="text" id="product-sku" placeholder="${tr('prod_add_barcode_ph')}" dir="ltr">
            </div>
            <button type="button" class="btn-primary add-product-btn" id="done-btn">
              <i class="fas fa-check"></i>
              <span>${tr('prod_add_done')}</span>
            </button>
          </div>
          <div class="added-products-section card-added">
            <label class="section-label">${tr('prod_add_added')}</label>
            <div id="added-products" class="added-products">
              <div class="empty-added">
                <i class="fas fa-box-open"></i>
                <p>${tr('prod_add_empty')}</p>
              </div>
            </div>
          </div>
          <div class="form-summary card-summary">
            <div class="summary-row"><span>${tr('prod_add_sum_count')}</span><strong id="sum-rows">0</strong></div>
            <div class="summary-row"><span>${tr('prod_add_sum_qty')}</span><strong id="sum-qty">0</strong></div>
            <div class="summary-row highlight"><span>${tr('prod_add_sum_total')}</span><strong id="sum-total">0.00</strong></div>
          </div>
          <div class="form-actions card-actions">
            <button type="button" class="btn-primary" id="save-all-btn">
              <i class="fas fa-save"></i>
              <span>${tr('prod_add_save')}</span>
            </button>
            <a href="/products/list.html" class="btn-secondary">${tr('prod_add_cancel')}</a>
          </div>
        </div>
      </div>
      <div class="workspace-panel workspace-panel-center">
        <iframe src="/products/list.html" class="workspace-iframe" id="products-list-iframe" title="Products List" loading="lazy" scrolling="yes"></iframe>
      </div>
      <div class="workspace-panel workspace-panel-right">
        <iframe src="about:blank" class="workspace-iframe workspace-iframe-detail" id="product-detail-iframe" title="Product Details" scrolling="yes"></iframe>
      </div>
    </div>
    <div class="scanner-modal" id="scanner-modal" style="display:none;">
      <div class="scanner-box">
        <div class="scanner-header"><h3>${tr('prod_add_scan_title')}</h3><button type="button" class="scanner-close" id="scanner-close"><i class="fas fa-xmark"></i></button></div>
        <div id="scanner-reader" class="scanner-reader"></div>
        <p class="scanner-hint" id="scanner-hint">${tr('prod_add_scan_hint')}</p>
      </div>
    </div>
  `;

  const addedProducts = [];
  const supplierInput = document.getElementById('supplier-input');
  const supplierIdInput = document.getElementById('supplier_id');
  const suggestions = document.getElementById('supplier-suggestions');
  const addedContainer = document.getElementById('added-products');
  const nameInput = document.getElementById('product-name');
  const qtyInput = document.getElementById('product-qty');
  const priceInput = document.getElementById('product-price');
  const categoryInput = document.getElementById('product-category');
  const skuInput = document.getElementById('product-sku');
  const doneBtn = document.getElementById('done-btn');
  const saveAllBtn = document.getElementById('save-all-btn');
  const scanBtn = document.getElementById('scan-btn');
  const scannerModal = document.getElementById('scanner-modal');
  const scannerReader = document.getElementById('scanner-reader');
  const scannerClose = document.getElementById('scanner-close');
  const scannerHint = document.getElementById('scanner-hint');
  const detailIframe = document.getElementById('product-detail-iframe');
  const listIframe = document.getElementById('products-list-iframe');

  // ✅ الحل الجذري: تعديل العناصر برمجياً باستخدام Inline Styles
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        // 1. إخفاء زر الإضافة
        const btn = iframeDoc.querySelector('.page-header a[href="add.html"]');
        if (btn) btn.style.display = 'none';

        // 2. جعل العنوان والبحث في سطر واحد (للشاشات الكبيرة فقط)
        if (window.innerWidth >= 1024) {
          const pageHeader = iframeDoc.querySelector('.page-header');
          const searchBar = iframeDoc.querySelector('.search-bar');
          
          if (pageHeader && searchBar) {
            // جلب حقل البحث ووضعه داخل رأس الصفحة
            pageHeader.appendChild(searchBar);
            
            // إجبار الحاوية على الترتيب الأفقي
            pageHeader.style.display = 'flex';
            pageHeader.style.flexDirection = 'row';
            pageHeader.style.alignItems = 'center';
            pageHeader.style.justifyContent = 'space-between';
            pageHeader.style.gap = '20px';
            pageHeader.style.marginBottom = '16px';

            // تنسيق شريط البحث ليمتد بجانب العنوان
            searchBar.style.margin = '0';
            searchBar.style.flex = '1';
            searchBar.style.maxWidth = '400px';
          }
        }
      }
    } catch (e) { console.warn('iframe access error', e); }
  });

  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `html, body { height: 100% !important; overflow: hidden !important; } .app { height: 100vh !important; overflow: hidden !important; } .body { height: calc(100vh - 60px) !important; overflow: hidden !important; } .main { height: 100% !important; overflow-y: auto !important; padding-bottom: 60px !important; }`;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('iframe access error', e); }
  });

  let selectedSupplier = null;
  let isAddingProduct = false;
  let isSaving = false;
  let html5QrCode = null;
  let scannedImageUrl = null;

  function showProductDetails(productId) {
    if (!productId) return;
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(productId)}`;
  }

  const lastAddedProductId = localStorage.getItem('last_added_product_id');
  if (lastAddedProductId) {
    setTimeout(() => { showProductDetails(lastAddedProductId); }, 500);
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRODUCT_SELECTED' && data.productId) showProductDetails(data.productId);
    if (data.type === 'PRODUCT_DELETED') {
      if (listIframe) listIframe.src = listIframe.src;
      detailIframe.src = 'about:blank';
      localStorage.removeItem('last_added_product_id');
    }
  });

  function showSuggestions(filter) {
    const q = filter.trim().toLowerCase();
    if (q.length < 1) { suggestions.innerHTML = ''; suggestions.style.display = 'none'; return; }
    const filtered = (suppliers ?? []).filter(s => (s.name ?? '').toLowerCase().includes(q)).slice(0, 5);
    const exactMatch = (suppliers ?? []).some(s => (s.name ?? '').toLowerCase() === q);
    let html = filtered.map(s => `<div class="suggestion-card" data-id="${s.id}" data-name="${s.name}" data-specialty="${s.specialty ?? ''}"><div class="suggestion-image"><i class="fas fa-truck"></i></div><div class="suggestion-info"><strong>${s.name}</strong>${s.specialty ? `<span class="suggestion-sku">${s.specialty}</span>` : ''}</div></div>`).join('');
    if (!exactMatch && filter.trim()) { html += `<div class="suggestion-card new-supplier" data-new="true" data-name="${filter.trim()}"><div class="suggestion-image" style="background:#dcfce7; color:#16a34a;"><i class="fas fa-plus"></i></div><div class="suggestion-info"><strong>${tr('prod_add_new_supplier')}</strong><span class="suggestion-sku">"${filter.trim()}"</span></div></div>`; }
    suggestions.innerHTML = html || `<div class="suggestion-empty">${tr('prod_add_no_results')}</div>`;
    suggestions.style.display = 'block';
    suggestions.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (card.dataset.new === 'true') { selectedSupplier = null; supplierInput.value = card.dataset.name; supplierIdInput.value = ''; supplierInput.dataset.isNew = 'true'; supplierInput.dataset.newName = card.dataset.name; categoryInput.value = ''; }
        else { selectedSupplier = suppliers.find(s => s.id === card.dataset.id); supplierInput.value = card.dataset.name; supplierIdInput.value = card.dataset.id; supplierInput.dataset.isNew = 'false'; supplierInput.dataset.newName = ''; if (selectedSupplier?.specialty) categoryInput.value = selectedSupplier.specialty; }
        suggestions.style.display = 'none';
      });
    });
  }

  supplierInput.addEventListener('input', () => { selectedSupplier = null; supplierIdInput.value = ''; supplierInput.dataset.isNew = 'false'; supplierInput.dataset.newName = ''; showSuggestions(supplierInput.value); });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.supplier-group')) suggestions.style.display = 'none'; });

  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') { alert(tr('prod_add_scanner_err')); return; }
    scannerModal.style.display = 'flex'; scannerReader.innerHTML = ''; scannerHint.textContent = tr('prod_add_scan_hint');
    try {
      html5QrCode = new Html5Qrcode("scanner-reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      await html5QrCode.start({ facingMode: "environment" }, config, async (decodedText) => { await handleScan(decodedText); await stopScanner(); }, () => { });
    } catch (err) { alert(tr('prod_add_camera_err') + ' ' + err.message); scannerModal.style.display = 'none'; }
  }

  async function stopScanner() {
    if (html5QrCode) { try { await html5QrCode.stop(); await html5QrCode.clear(); } catch (e) { } html5QrCode = null; }
    scannerModal.style.display = 'none';
  }

  async function handleScan(barcode) {
    const value = String(barcode).trim(); if (!value) return;
    const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();
    const { data: localProduct } = await db.from('products').select('*').eq('organization_id', profile?.organization_id).eq('sku', value).limit(1).maybeSingle();
    if (localProduct) {
      nameInput.value = localProduct.name ?? ''; priceInput.value = Number(localProduct.price ?? 0).toFixed(2);
      categoryInput.value = localProduct.category ?? ''; qtyInput.value = '1'; skuInput.value = localProduct.sku ?? value;
      scannedImageUrl = localProduct.image_url || null;
      nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
    }
    scannerHint.textContent = tr('prod_add_searching');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(value)}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const productName = p.product_name_ar || p.product_name || p.product_name_en || '';
        if (productName) nameInput.value = productName;
        if (p.categories) { const firstCategory = p.categories.split(',')[0].trim(); if (firstCategory) categoryInput.value = firstCategory; }
        if (p.image_url) scannedImageUrl = p.image_url;
        skuInput.value = value; qtyInput.value = '1';
        nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
    } catch (err) { console.warn('Open Food Facts error:', err); }
    skuInput.value = value; scannedImageUrl = null;
    nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  scanBtn.addEventListener('click', startScanner);
  scannerClose.addEventListener('click', stopScanner);
  scannerModal.addEventListener('click', (e) => { if (e.target === scannerModal) stopScanner(); });

  function renderAddedProducts() {
    if (addedProducts.length === 0) { addedContainer.innerHTML = `<div class="empty-added"><i class="fas fa-box-open"></i><p>${tr('prod_add_empty')}</p></div>`; updateSummary(); return; }
    addedContainer.innerHTML = addedProducts.map((p, index) => `
      <div class="added-product-card">
        <div class="added-product-image">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : `<i class="fas fa-box-open"></i>`}</div>
        <div class="added-product-info"><strong>${p.name}</strong><span>${p.category ? p.category + ' • ' : ''}${p.sku}</span></div>
        <div class="added-product-stats">
          <div class="stat-mini"><span>${tr('products_qty')}</span><b>${p.qty}</b></div>
          <div class="stat-mini"><span>${tr('products_price')}</span><b>${Number(p.price).toFixed(2)}</b></div>
          <div class="stat-mini highlight"><span>${tr('products_total')}</span><b>${(Number(p.qty) * Number(p.price)).toFixed(2)}</b></div>
        </div>
        <button type="button" class="added-product-delete" data-index="${index}" title="${tr('prod_add_delete')}"><i class="fas fa-xmark"></i></button>
      </div>
    `).join('');
    addedContainer.querySelectorAll('.added-product-delete').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); addedProducts.splice(Number(btn.dataset.index), 1); renderAddedProducts(); });
    });
    updateSummary();
  }

  function updateSummary() {
    let totalQty = 0; let totalValue = 0;
    addedProducts.forEach(p => { totalQty += Number(p.qty); totalValue += Number(p.qty) * Number(p.price); });
    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = totalQty;
    document.getElementById('sum-total').textContent = totalValue.toFixed(2);
  }

  function addToCart() {
    if (isAddingProduct || doneBtn.disabled) return;
    isAddingProduct = true; doneBtn.disabled = true;
    const errBox = document.getElementById('form-error'); errBox.style.display = 'none';
    const name = nameInput.value.trim(); const qty = Number(qtyInput.value) || 0; const price = Number(priceInput.value) || 0;
    const category = categoryInput.value.trim(); const sku = skuInput.value.trim() || ('SKU-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
    if (!name) { errBox.textContent = tr('prod_add_err_name'); errBox.style.display = 'block'; nameInput.focus(); isAddingProduct = false; doneBtn.disabled = false; return; }
    if (qty <= 0) { errBox.textContent = tr('prod_add_err_qty'); errBox.style.display = 'block'; qtyInput.focus(); isAddingProduct = false; doneBtn.disabled = false; return; }
    addedProducts.push({ name, qty, price, category, sku, image_url: scannedImageUrl });
    nameInput.value = ''; qtyInput.value = '1'; priceInput.value = '0'; skuInput.value = ''; scannedImageUrl = null; nameInput.focus();
    renderAddedProducts();
    setTimeout(() => { isAddingProduct = false; doneBtn.disabled = false; }, 400);
  }

  doneBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); addToCart(); });

  saveAllBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (isSaving || saveAllBtn.disabled) return;
    isSaving = true; saveAllBtn.disabled = true;
    const errBox = document.getElementById('form-error'); const successBox = document.getElementById('form-success');
    errBox.style.display = 'none'; successBox.style.display = 'none';
    if (addedProducts.length === 0) { errBox.textContent = tr('prod_add_err_empty'); errBox.style.display = 'block'; isSaving = false; saveAllBtn.disabled = false; return; }
    
    let lastSavedProductId = null; 

    saveAllBtn.querySelector('span').textContent = tr('prod_add_saving');
    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      const { data: profile } = await db.from('profiles').select('organization_id, full_name').eq('id', authUser.id).single();
      if (!profile?.organization_id) throw new Error(tr('prod_add_err_org'));
      let finalSupplierId = supplierIdInput.value || null;
      const isNewSupplier = supplierInput.dataset.isNew === 'true';
      const newSupplierName = isNewSupplier ? (supplierInput.dataset.newName || supplierInput.value.trim()) : '';
      if (!finalSupplierId && newSupplierName) {
        const { data: existingSupplier } = await db.from('suppliers').select('id').eq('organization_id', profile.organization_id).eq('name', newSupplierName).limit(1).maybeSingle();
        if (existingSupplier) { finalSupplierId = existingSupplier.id; }
        else {
          const { data: createdSupplier, error: supErr } = await db.from('suppliers').insert({ organization_id: profile.organization_id, name: newSupplierName, specialty: categoryInput.value.trim() || null, created_by: authUser.id }).select().single();
          if (supErr) throw new Error(tr('prod_add_err_supplier') + ' ' + supErr.message);
          if (createdSupplier) finalSupplierId = createdSupplier.id;
        }
      }
      const invoiceNumber = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      let insertedCount = 0; let updatedCount = 0; const processedKeys = new Set();
      for (const p of addedProducts) {
        const key = `${p.name}__${p.price}__${finalSupplierId ?? 'null'}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);
        let query = db.from('products').select('id').eq('organization_id', profile.organization_id).eq('name', p.name).eq('price', Number(p.price));
        if (finalSupplierId) { query = query.eq('supplier_id', finalSupplierId); } else { query = query.is('supplier_id', null); }
        const { data: matchedRows, error: findErr } = await query.order('created_at', { ascending: true }).limit(1);
        if (findErr) throw new Error(tr('prod_add_err_find') + ' ' + findErr.message);
        const matchedProduct = matchedRows?.[0] ?? null;
        let productId;
        if (matchedProduct) {
          productId = matchedProduct.id;
          const { error: linkErr } = await db.from('products').update({ invoice_id: invoiceNumber }).eq('id', productId);
          if (linkErr) throw new Error(tr('prod_add_err_link') + ' ' + linkErr.message);
          updatedCount++;
        } else {
          const { data: newProduct, error: insertError } = await db.from('products').insert({ organization_id: profile.organization_id, name: p.name, supplier_id: finalSupplierId, sku: p.sku, qty: 0, price: Number(p.price), category: p.category || null, image_url: p.image_url || null, invoice_id: invoiceNumber, created_by: authUser.id }).select().single();
          if (insertError) throw new Error(tr('prod_add_err_insert') + ' ' + insertError.message);
          productId = newProduct.id; insertedCount++;
        }
        await db.from('stock_movements').insert({ organization_id: profile.organization_id, product_id: productId, type: 'in', method: 'manual', quantity: Number(p.qty), performed_by: authUser.id });
        lastSavedProductId = productId;
      }
      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);
      const { data: newInvoice, error: invoiceErr } = await db.from('invoices').insert({ invoice_number: invoiceNumber, organization_id: profile.organization_id, supplier_id: finalSupplierId, created_by: authUser.id, total_qty: totalQty, total_value: totalValue }).select().single();
      if (invoiceErr) throw new Error(tr('prod_add_err_invoice') + ' ' + invoiceErr.message);
      const invoiceItems = addedProducts.map(p => ({ invoice_id: newInvoice.id, product_id: null, product_name: p.name, qty: Number(p.qty), price: Number(p.price), total: Number(p.qty) * Number(p.price) }));
      const { error: itemsErr } = await db.from('invoice_items').insert(invoiceItems);
      if (itemsErr) console.error('❌ invoice_items error:', itemsErr);
      if (typeof notifyOrganization === 'function') {
        try { await notifyOrganization({ orgId: profile.organization_id, title: tr('prod_add_notif_title'), message: `${profile.full_name || tr('prod_detail_user')} ${tr('prod_add_notif_msg')} ${invoiceNumber} (${totalQty} - ${totalValue.toFixed(2)})`, type: 'success', link: `/invoice.html?id=${encodeURIComponent(invoiceNumber)}`, userName: profile.full_name || null }); } catch (notifErr) { console.error('❌ Notification error:', notifErr); }
      }
      addedProducts.length = 0; renderAddedProducts();
      supplierInput.dataset.newName = ''; supplierInput.dataset.isNew = 'false'; supplierIdInput.value = finalSupplierId || '';
      if (listIframe) listIframe.src = listIframe.src;
      successBox.textContent = `${tr('prod_add_new_count')} ${insertedCount} | ${tr('prod_add_upd_count')} ${updatedCount} | ${tr('prod_add_invoice_count')} ${invoiceNumber}`;
      successBox.style.display = 'block';
      
      if (lastSavedProductId) {
        localStorage.setItem('last_added_product_id', lastSavedProductId);
        showProductDetails(lastSavedProductId);
      }
      
    } catch (error) {
      errBox.textContent = error.message; errBox.style.display = 'block';
      saveAllBtn.disabled = false; saveAllBtn.querySelector('span').textContent = tr('prod_add_save'); isSaving = false;
    }
  });

  renderAddedProducts();
});