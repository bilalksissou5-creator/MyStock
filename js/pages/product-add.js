// ============================================
// صفحة إضافة منتجات
// ✅ دعم باركودات متعددة لنفس المنتج
// ✅ دمج ذكي (SKU / اسم+سعر)
// ✅ ربط invoice_items بالمنتجات الصحيحة
// ✅ حماية من XSS و race condition
// ✅ حفظ المورد المكتوب يدوياً
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__productAddLoaded) return;
  window.__productAddLoaded = true;

  // ========== Auth ==========
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add.html');
  if (window.applyLanguage) window.applyLanguage();

  // ========== Utilities ==========
  const tr = (key, fallback) => {
    if (window.t) {
      const val = window.t(key);
      if (val && val !== key) return val;
    }
    return fallback !== undefined ? fallback : key;
  };

  // 🔧 حماية من XSS
  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const normalizeName = (s) => String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u0640\u064B-\u065F]/g, '');

  const pricesEqual = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

  document.title = tr('prod_add_title_full', 'Add Products');

  // ========== Pre-fetch ==========
  const { data: userProfile, error: profileErr } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (profileErr || !userProfile?.organization_id) {
    alert(tr('prod_add_err_org', 'Organization not found'));
    return;
  }

  const organizationId = userProfile.organization_id;

  const { data: suppliers, error: suppliersErr } = await db
    .from('suppliers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (suppliersErr) console.error('Suppliers fetch error:', suppliersErr);

  // 🔧 اكتشاف وجود جدول product_barcodes
  let hasBarcodeTable = false;
  try {
    const { error } = await db.from('product_barcodes').select('id').limit(1);
    hasBarcodeTable = !error;
    if (error) console.warn('⚠️ product_barcodes غير متاح، سيُستخدم products.sku فقط:', error.message);
  } catch (e) {
    hasBarcodeTable = false;
    console.warn('⚠️ فحص product_barcodes فشل:', e);
  }

  // ========== Render ==========
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('prod_add_title')}</h2>
      <button type="button" class="btn-primary scan-btn" id="scan-btn">
        <i class="fas fa-barcode"></i>
        <span>${tr('prod_add_scan')}</span>
      </button>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>
    <div class="alert alert-warning" id="form-warning" style="display:none;"></div>

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
        <div class="summary-row">
          <span>${tr('prod_add_sum_count')}</span>
          <strong id="sum-rows">0</strong>
        </div>
        <div class="summary-row">
          <span>${tr('prod_add_sum_qty')}</span>
          <strong id="sum-qty">0</strong>
        </div>
        <div class="summary-row highlight">
          <span>${tr('prod_add_sum_total')}</span>
          <strong id="sum-total">0.00</strong>
        </div>
      </div>

      <div class="form-actions card-actions">
        <button type="button" class="btn-primary" id="save-all-btn">
          <i class="fas fa-save"></i>
          <span>${tr('prod_add_save')}</span>
        </button>
        <a href="/products/list.html" class="btn-secondary">${tr('prod_add_cancel')}</a>
      </div>
    </div>

    <div class="scanner-modal" id="scanner-modal" style="display:none;">
      <div class="scanner-box">
        <div class="scanner-header">
          <h3>${tr('prod_add_scan_title')}</h3>
          <button type="button" class="scanner-close" id="scanner-close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div id="scanner-reader" class="scanner-reader"></div>
        <p class="scanner-hint" id="scanner-hint">${tr('prod_add_scan_hint')}</p>
      </div>
    </div>
  `;

  // ========== Element refs ==========
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
  const errBox = document.getElementById('form-error');
  const successBox = document.getElementById('form-success');
  const warnBox = document.getElementById('form-warning');

  // ========== State ==========
  const addedProducts = [];
  let selectedSupplier = null;
  let currentSupplierId = null;
  let isAddingProduct = false;
  let isSaving = false;
  let isScanning = false;
  let html5QrCode = null;
  let scannedImageUrl = null;

  // ========== Alerts ==========
  function showErr(msg) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
    successBox.style.display = 'none';
    warnBox.style.display = 'none';
  }
  function showSuccess(msg) {
    successBox.textContent = msg;
    successBox.style.display = 'block';
    errBox.style.display = 'none';
    warnBox.style.display = 'none';
  }
  function hideAlerts() {
    errBox.style.display = 'none';
    successBox.style.display = 'none';
    warnBox.style.display = 'none';
  }

  // ========== Supplier Suggestions ==========
  function showSuggestions(filter) {
    const q = filter.trim().toLowerCase();
    if (q.length < 1) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      return;
    }
    const filtered = (suppliers ?? [])
      .filter(s => (s.name ?? '').toLowerCase().includes(q))
      .slice(0, 5);
    const exactMatch = (suppliers ?? []).some(s => (s.name ?? '').toLowerCase() === q);

    let html = filtered.map(s => `
      <div class="suggestion-card" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name)}" data-specialty="${escapeHtml(s.specialty ?? '')}">
        <div class="suggestion-image"><i class="fas fa-truck"></i></div>
        <div class="suggestion-info">
          <strong>${escapeHtml(s.name)}</strong>
          ${s.specialty ? `<span class="suggestion-sku">${escapeHtml(s.specialty)}</span>` : ''}
        </div>
      </div>
    `).join('');

    if (!exactMatch && filter.trim()) {
      html += `
        <div class="suggestion-card new-supplier" data-new="true" data-name="${escapeHtml(filter.trim())}">
          <div class="suggestion-image" style="background:#dcfce7; color:#16a34a;">
            <i class="fas fa-plus"></i>
          </div>
          <div class="suggestion-info">
            <strong>${tr('prod_add_new_supplier')}</strong>
            <span class="suggestion-sku">"${escapeHtml(filter.trim())}"</span>
          </div>
        </div>
      `;
    }

    suggestions.innerHTML = html || `<div class="suggestion-empty">${tr('prod_add_no_results')}</div>`;
    suggestions.style.display = 'block';

    suggestions.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const newId = card.dataset.new === 'true' ? null : card.dataset.id;
        const newName = card.dataset.name;

        // 🔧 تحذير عند تغيير المورد والسلة غير فارغة
        if (currentSupplierId !== newId && addedProducts.length > 0) {
          const ok = confirm(tr('prod_add_supplier_change_warn', 'تغيير المورد سيمسح المنتجات المضافة. متابعة؟'));
          if (!ok) {
            suggestions.style.display = 'none';
            return;
          }
          addedProducts.length = 0;
          renderAddedProducts();
        }

        if (card.dataset.new === 'true') {
          selectedSupplier = null;
          supplierInput.value = newName;
          supplierIdInput.value = '';
          supplierInput.dataset.isNew = 'true';
          supplierInput.dataset.newName = newName;
          currentSupplierId = null;
          categoryInput.value = '';
        } else {
          selectedSupplier = (suppliers ?? []).find(s => s.id === newId) || null;
          supplierInput.value = newName;
          supplierIdInput.value = newId;
          supplierInput.dataset.isNew = 'false';
          supplierInput.dataset.newName = '';
          currentSupplierId = newId;
          if (selectedSupplier?.specialty) categoryInput.value = selectedSupplier.specialty;
        }
        suggestions.style.display = 'none';
      });
    });
  }

  supplierInput.addEventListener('input', () => {
    selectedSupplier = null;
    supplierIdInput.value = '';
    supplierInput.dataset.isNew = 'false';
    supplierInput.dataset.newName = '';
    showSuggestions(supplierInput.value);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.supplier-group')) suggestions.style.display = 'none';
  });

  // ========== Scanner ==========
  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      showErr(tr('prod_add_scanner_err', 'Scanner library not loaded'));
      return;
    }
    scannerModal.style.display = 'flex';
    scannerReader.innerHTML = '';
    scannerHint.textContent = tr('prod_add_scan_hint');

    try {
      html5QrCode = new Html5Qrcode("scanner-reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // 🔧 حماية من استدعاء multiple
          if (isScanning) return;
          isScanning = true;
          try {
            await handleScan(decodedText);
          } finally {
            await stopScanner();
            isScanning = false;
          }
        },
        () => {}
      );
    } catch (err) {
      showErr(tr('prod_add_camera_err', 'Camera error') + ' ' + (err.message || ''));
      scannerModal.style.display = 'none';
      // 🔧 تصفير html5QrCode عند الفشل
      if (html5QrCode) {
        try { await html5QrCode.clear(); } catch (e) {}
        html5QrCode = null;
      }
    }
  }

  async function stopScanner() {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (e) {}
      html5QrCode = null;
    }
    scannerModal.style.display = 'none';
  }

  async function handleScan(barcode) {
    const value = String(barcode).trim();
    if (!value) return;

    hideAlerts();

    // 1️⃣ البحث في products.sku
    let { data: localProduct } = await db
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('sku', value)
      .limit(1)
      .maybeSingle();

    // 2️⃣ البحث في product_barcodes
    if (!localProduct && hasBarcodeTable) {
      const { data: aliasRow } = await db
        .from('product_barcodes')
        .select('product_id')
        .eq('organization_id', organizationId)
        .eq('barcode', value)
        .limit(1)
        .maybeSingle();

      if (aliasRow?.product_id) {
        const { data: prod } = await db
          .from('products')
          .select('*')
          .eq('id', aliasRow.product_id)
          .single();
        if (prod) localProduct = prod;
      }
    }

    if (localProduct) {
      nameInput.value = localProduct.name ?? '';
      priceInput.value = Number(localProduct.price ?? 0).toFixed(2);
      categoryInput.value = localProduct.category ?? '';
      qtyInput.value = '1';
      skuInput.value = value;
      scannedImageUrl = localProduct.image_url || null;
      nameInput.focus();
      nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 3️⃣ Open Food Facts
    scannerHint.textContent = tr('prod_add_searching');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(value)}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const productName = p.product_name_ar || p.product_name || p.product_name_en || '';
        if (productName) nameInput.value = productName;
        if (p.categories) {
          const firstCategory = p.categories.split(',')[0].trim();
          if (firstCategory) categoryInput.value = firstCategory;
        }
        if (p.image_url) scannedImageUrl = p.image_url;
        skuInput.value = value;
        qtyInput.value = '1';
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    } catch (err) {
      console.warn('Open Food Facts error:', err);
    }

    skuInput.value = value;
    scannedImageUrl = null;
    nameInput.focus();
    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  scanBtn.addEventListener('click', startScanner);
  scannerClose.addEventListener('click', stopScanner);
  scannerModal.addEventListener('click', (e) => {
    if (e.target === scannerModal) stopScanner();
  });

  // ========== Render Added Products ==========
  function renderAddedProducts() {
    if (addedProducts.length === 0) {
      addedContainer.innerHTML = `
        <div class="empty-added">
          <i class="fas fa-box-open"></i>
          <p>${tr('prod_add_empty')}</p>
        </div>
      `;
      updateSummary();
      return;
    }

    addedContainer.innerHTML = addedProducts.map((p, index) => {
      const barcodes = (p.skus && p.skus.length) ? p.skus : (p.sku ? [p.sku] : []);
      const barcodeTags = barcodes.map(b => `<code class="barcode-tag">${escapeHtml(b)}</code>`).join(' ');
      const imgHtml = p.image_url
        ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none';var n=this.nextElementSibling;if(n)n.style.display='inline';"><i class="fas fa-box-open" style="display:none;"></i>`
        : `<i class="fas fa-box-open"></i>`;

      return `
        <div class="added-product-card">
          <div class="added-product-image">${imgHtml}</div>
          <div class="added-product-info">
            <strong>${escapeHtml(p.name)}</strong>
            <span>
              ${p.category ? escapeHtml(p.category) + ' • ' : ''}
              ${barcodeTags}
            </span>
          </div>
          <div class="added-product-stats">
            <div class="stat-mini"><span>${tr('products_qty')}</span><b>${p.qty}</b></div>
            <div class="stat-mini"><span>${tr('products_price')}</span><b>${Number(p.price).toFixed(2)}</b></div>
            <div class="stat-mini highlight"><span>${tr('products_total')}</span><b>${(Number(p.qty) * Number(p.price)).toFixed(2)}</b></div>
          </div>
          <button type="button" class="added-product-delete" data-index="${index}" title="${tr('prod_add_delete')}">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      `;
    }).join('');

    addedContainer.querySelectorAll('.added-product-delete').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addedProducts.splice(Number(btn.dataset.index), 1);
        renderAddedProducts();
      });
    });
    updateSummary();
  }

  function updateSummary() {
    let totalQty = 0, totalValue = 0;
    addedProducts.forEach(p => {
      totalQty += Number(p.qty);
      totalValue += Number(p.qty) * Number(p.price);
    });
    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = totalQty;
    document.getElementById('sum-total').textContent = totalValue.toFixed(2);
  }

  // ========== Add to Cart ==========
  function addToCart() {
    if (isAddingProduct || doneBtn.disabled) return;
    isAddingProduct = true;
    doneBtn.disabled = true;
    hideAlerts();

    const name = nameInput.value.trim();
    const qty = Number(qtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;
    const category = categoryInput.value.trim();
    const skuValue = skuInput.value.trim();

    if (!name) {
      showErr(tr('prod_add_err_name'));
      nameInput.focus();
      isAddingProduct = false;
      doneBtn.disabled = false;
      return;
    }
    if (qty <= 0) {
      showErr(tr('prod_add_err_qty'));
      qtyInput.focus();
      isAddingProduct = false;
      doneBtn.disabled = false;
      return;
    }

    // ✅ منطق الدمج: SKU متطابق OR (اسم + سعر)
    const existingIndex = addedProducts.findIndex(p => {
      const pSkus = (p.skus && p.skus.length) ? p.skus : (p.sku ? [p.sku] : []);
      if (skuValue && pSkus.includes(skuValue)) return true;
      if (skuValue && p.sku === skuValue) return true;
      return normalizeName(p.name) === normalizeName(name) && pricesEqual(p.price, price);
    });

    if (existingIndex !== -1) {
      const item = addedProducts[existingIndex];
      item.qty += qty;
      // ✅ الاحتفاظ بالباركودات كـ aliases
      item.skus = item.skus || (item.sku ? [item.sku] : []);
      if (skuValue && !item.skus.includes(skuValue)) {
        item.skus.push(skuValue);
      }
      if (skuValue) item.sku = skuValue;
      if (scannedImageUrl && !item.image_url) item.image_url = scannedImageUrl;
    } else {
      const finalSku = skuValue || ('SKU-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
      addedProducts.push({
        name,
        qty,
        price,
        category,
        sku: finalSku,
        skus: skuValue ? [skuValue] : [finalSku],
        image_url: scannedImageUrl,
      });
    }

    // تفريغ
    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '0';
    skuInput.value = '';
    scannedImageUrl = null;
    nameInput.focus();
    renderAddedProducts();

    setTimeout(() => {
      isAddingProduct = false;
      doneBtn.disabled = false;
    }, 300);
  }

  doneBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart();
  });

  // ========== Save All ==========
  saveAllBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving || saveAllBtn.disabled) return;
    if (addedProducts.length === 0) {
      showErr(tr('prod_add_err_empty'));
      return;
    }

    isSaving = true;
    saveAllBtn.disabled = true;
    hideAlerts();
    saveAllBtn.querySelector('span').textContent = tr('prod_add_saving', '...');

    try {
      // 🔧 تفكيك آمن لـ getUser
      const { data: authData, error: authErr } = await db.auth.getUser();
      const authUser = authData?.user;
      if (authErr || !authUser) {
        throw new Error(tr('prod_add_err_auth', 'Authentication error'));
      }

      const { data: profile, error: profErr } = await db
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', authUser.id)
        .single();

      if (profErr || !profile?.organization_id) {
        throw new Error(tr('prod_add_err_org', 'Organization not found'));
      }

      // ✅ معالجة المورد (حتى المكتوب يدوياً دون اختيار اقتراح)
      let finalSupplierId = supplierIdInput.value || null;
      let finalSupplierName = null;

      const typedSupplierName = supplierInput.value.trim();
      const isNewFlag = supplierInput.dataset.isNew === 'true';
      const savedNewName = supplierInput.dataset.newName || '';
      const candidateNewName = isNewFlag ? (savedNewName || typedSupplierName) : typedSupplierName;

      if (!finalSupplierId && candidateNewName) {
        finalSupplierName = candidateNewName;

        const { data: existingSupplier, error: findSupErr } = await db
          .from('suppliers')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .ilike('name', finalSupplierName)
          .limit(1)
          .maybeSingle();

        if (findSupErr) throw new Error(tr('prod_add_err_find') + ' ' + findSupErr.message);

        if (existingSupplier) {
          finalSupplierId = existingSupplier.id;
        } else {
          const { data: createdSupplier, error: supErr } = await db
            .from('suppliers')
            .insert({
              organization_id: profile.organization_id,
              name: finalSupplierName,
              specialty: categoryInput.value.trim() || null,
              created_by: authUser.id,
            })
            .select()
            .single();

          if (supErr) throw new Error(tr('prod_add_err_supplier') + ' ' + supErr.message);
          if (createdSupplier) finalSupplierId = createdSupplier.id;
        }
      }

      const invoiceNumber = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const itemResults = []; // ✅ لتتبع productId لكل عنصر

      for (const p of addedProducts) {
        const allBarcodes = (p.skus && p.skus.length) ? p.skus : (p.sku ? [p.sku] : []);
        let matchedProduct = null;

        // 1️⃣ البحث في product_barcodes
        if (hasBarcodeTable && allBarcodes.length) {
          const { data: aliasRows, error: aliasErr } = await db
            .from('product_barcodes')
            .select('product_id')
            .eq('organization_id', profile.organization_id)
            .in('barcode', allBarcodes)
            .limit(1);

          if (aliasErr) console.warn('barcode search err:', aliasErr);

          if (aliasRows?.[0]?.product_id) {
            const { data: prod } = await db
              .from('products')
              .select('*')
              .eq('id', aliasRows[0].product_id)
              .single();
            if (prod) matchedProduct = prod;
          }
        }

        // 2️⃣ البحث في products.sku
        if (!matchedProduct && allBarcodes.length) {
          const { data: bySku, error: skuErr } = await db
            .from('products')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .in('sku', allBarcodes)
            .limit(1);

          if (skuErr) console.warn('sku search err:', skuErr);
          if (bySku?.[0]) matchedProduct = bySku[0];
        }

        // 3️⃣ البحث بالاسم + السعر + المورد
        if (!matchedProduct) {
          let q = db
            .from('products')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .eq('price', Number(p.price))
            .ilike('name', p.name.trim());
          q = finalSupplierId ? q.eq('supplier_id', finalSupplierId) : q.is('supplier_id', null);

          const { data: byName, error: nameErr } = await q
            .order('created_at', { ascending: true })
            .limit(1);

          if (nameErr) throw new Error(tr('prod_add_err_find') + ' ' + nameErr.message);
          if (byName?.[0]) matchedProduct = byName[0];
        }

        let productId;
        let inserted = false;

        if (matchedProduct) {
          productId = matchedProduct.id;
          // ⚠️ ملاحظة: نفترض وجود trigger يحدّث products.qty من stock_movements
          const { error: linkErr } = await db
            .from('products')
            .update({ invoice_id: invoiceNumber })
            .eq('id', productId);
          if (linkErr) throw new Error(tr('prod_add_err_link') + ' ' + linkErr.message);
        } else {
          // ⚠️ qty: 0 — يُفترض أن trigger stock_movements يرفعه
          const { data: newProduct, error: insertError } = await db
            .from('products')
            .insert({
              organization_id: profile.organization_id,
              name: p.name,
              supplier_id: finalSupplierId,
              sku: p.sku,
              qty: 0,
              price: Number(p.price),
              category: p.category || null,
              image_url: p.image_url || null,
              invoice_id: invoiceNumber,
              created_by: authUser.id,
            })
            .select()
            .single();

          if (insertError) throw new Error(tr('prod_add_err_insert') + ' ' + insertError.message);
          productId = newProduct.id;
          inserted = true;
        }

        // ✅ حفظ كل الباركودات كـ aliases
        if (hasBarcodeTable && allBarcodes.length) {
          const aliasRows = allBarcodes.map((bc, i) => ({
            organization_id: profile.organization_id,
            product_id: productId,
            barcode: bc,
            is_primary: i === 0,
            source: 'scan',
          }));
          const { error: bcErr } = await db
            .from('product_barcodes')
            .upsert(aliasRows, { onConflict: 'organization_id,barcode', ignoreDuplicates: true });
          if (bcErr) console.warn('barcode upsert err:', bcErr);
        }

        // حركة المخزون
        const { error: stockErr } = await db
          .from('stock_movements')
          .insert({
            organization_id: profile.organization_id,
            product_id: productId,
            type: 'in',
            method: 'manual',
            quantity: Number(p.qty),
            performed_by: authUser.id,
          });
        if (stockErr) console.warn('stock movement err:', stockErr);

        itemResults.push({
          productId,
          name: p.name,
          qty: Number(p.qty),
          price: Number(p.price),
          inserted,
        });
      }

      // إنشاء الفاتورة
      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

      const { data: newInvoice, error: invoiceErr } = await db
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          organization_id: profile.organization_id,
          supplier_id: finalSupplierId,
          created_by: authUser.id,
          total_qty: totalQty,
          total_value: totalValue,
        })
        .select()
        .single();

      if (invoiceErr) throw new Error(tr('prod_add_err_invoice') + ' ' + invoiceErr.message);

      // ✅ invoice_items مع product_id الصحيح
      const invoiceItems = itemResults.map(r => ({
        invoice_id: newInvoice.id,
        product_id: r.productId,
        product_name: r.name,
        qty: r.qty,
        price: r.price,
        total: r.qty * r.price,
      }));

      const { error: itemsErr } = await db.from('invoice_items').insert(invoiceItems);
      // 🔧 فشل invoice_items يوقف الحفظ
      if (itemsErr) {
        throw new Error(tr('prod_add_err_items', 'Failed to save invoice items') + ' ' + itemsErr.message);
      }

      // إشعار
      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({
            orgId: profile.organization_id,
            title: tr('prod_add_notif_title'),
            message: `${profile.full_name || tr('prod_detail_user')} ${tr('prod_add_notif_msg')} ${invoiceNumber} (${totalQty} - ${totalValue.toFixed(2)})`,
            type: 'success',
            link: `/invoice.html?id=${encodeURIComponent(invoiceNumber)}`,
            userName: profile.full_name || null,
          });
        } catch (notifErr) {
          console.error('Notification error:', notifErr);
        }
      }

      const insertedCount = itemResults.filter(r => r.inserted).length;
      const updatedCount = itemResults.filter(r => !r.inserted).length;

      // تفريغ
      addedProducts.length = 0;
      renderAddedProducts();
      supplierInput.dataset.newName = '';
      supplierInput.dataset.isNew = 'false';
      supplierIdInput.value = finalSupplierId || '';

      showSuccess(`${tr('prod_add_new_count')} ${insertedCount} | ${tr('prod_add_upd_count')} ${updatedCount} | ${tr('prod_add_invoice_count')} ${invoiceNumber}`);

      // ✅ إرسال كل المنتجات للأب
      if (window.self !== window.top && itemResults.length) {
        window.parent.postMessage({
          type: 'NEW_PRODUCTS_SAVED',
          productIds: itemResults.map(r => r.productId),
        }, '*');
      }

      setTimeout(() => {
        window.location.replace(`/invoice.html?id=${encodeURIComponent(invoiceNumber)}`);
      }, 1500);

    } catch (error) {
      console.error('Save error:', error);
      showErr(error.message || 'Save failed');
      saveAllBtn.disabled = false;
      saveAllBtn.querySelector('span').textContent = tr('prod_add_save');
      isSaving = false;
    }
  });

  // ========== Parent message ==========
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      const detailIframe = document.getElementById('detail-iframe');
      if (detailIframe) {
        detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
      }
    }
  });

  renderAddedProducts();
});