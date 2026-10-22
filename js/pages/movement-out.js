// ============================================
// صفحة إخراج منتجات (متعددة) + إيصال بيع
// ✅ دعم كامل للترجمة + تجميع الكميات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__movementOutLoaded) return;
  window.__movementOutLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/out.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('mout_title_full');

  const main = document.getElementById('main-content');

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  function getSellingPrice(product) {
    const sellPrice = Number(product.sell_price ?? 0);
    const sellEnabled = product.sell_price_enabled === true;
    const basePrice = Number(product.price ?? 0);

    if (sellEnabled && sellPrice > 0) {
      return sellPrice;
    }
    return basePrice;
  }

  const { data: products, error: productsError } = await db
    .from('products')
    .select('*')
    .order('name');

  if (productsError) {
    main.innerHTML = `
      <div class="alert alert-error">
        <strong>${tr('mout_load_err')}</strong>
        <br>
        <small>${productsError.message}</small>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('mout_title')}</h2>
      <button type="button" class="btn-primary scan-btn" id="scan-btn">
        <i class="fas fa-barcode"></i>
        <span>${tr('mout_scan')}</span>
      </button>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <div class="out-form">

      <div class="product-input-card">
        <div class="form-group">
          <label>${tr('mout_note')}</label>
          <input type="text" id="note" placeholder="${tr('mout_note_ph')}">
        </div>
      </div>

      <div class="product-input-card">
        <div class="form-group" style="position:relative;margin-bottom:12px;">
          <label>${tr('mout_product')}</label>
          <input type="text" id="product-input" placeholder="${tr('mout_product_ph')}" autocomplete="off">
          <div id="product-suggestions" class="suggestions-box"></div>
          <input type="hidden" id="product_id">
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>${tr('mout_qty')}</label>
            <input type="number" id="quantity" value="1" min="0.01" step="0.01">
          </div>
          <div class="form-group">
            <label>${tr('mout_price')}</label>
            <input type="number" id="price" value="0" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>${tr('mout_available')}</label>
            <input type="text" id="available-qty" value="—" disabled>
          </div>
        </div>

        <button type="button" class="btn-primary add-product-btn" id="add-product-btn">
          <i class="fas fa-plus"></i>
          <span>${tr('mout_add_product')}</span>
        </button>
      </div>

      <div class="added-products-section">
        <label class="section-label">${tr('mout_added')}</label>
        <div id="added-products" class="added-products">
          <div class="empty-added">
            <i class="fas fa-box-open"></i>
            <p>${tr('mout_empty')}</p>
          </div>
        </div>
      </div>

      <div class="form-summary">
        <div class="summary-row">
          <span>${tr('mout_sum_count')}</span>
          <strong id="sum-rows">0</strong>
        </div>
        <div class="summary-row">
          <span>${tr('mout_sum_qty')}</span>
          <strong id="sum-qty">0</strong>
        </div>
        <div class="summary-row highlight">
          <span>${tr('mout_sum_total')}</span>
          <strong id="sum-total">0.00</strong>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-primary" id="save-btn">
          <i class="fas fa-save"></i>
          <span>${tr('mout_save')}</span>
        </button>
        <a href="/movements/list.html" class="btn-secondary">${tr('mout_cancel')}</a>
      </div>

    </div>

    <div class="scanner-modal" id="scanner-modal" style="display:none;">
      <div class="scanner-box">
        <div class="scanner-header">
          <h3>${tr('mout_scan_title')}</h3>
          <button type="button" class="scanner-close" id="scanner-close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div id="scanner-reader" class="scanner-reader"></div>
        <p class="scanner-hint">${tr('mout_scan_hint')}</p>
      </div>
    </div>
  `;

  const addedProducts = [];
  const productInput = document.getElementById('product-input');
  const hiddenId = document.getElementById('product_id');
  const suggestions = document.getElementById('product-suggestions');
  const quantityInput = document.getElementById('quantity');
  const priceInput = document.getElementById('price');
  const availableQtyInput = document.getElementById('available-qty');
  const addedContainer = document.getElementById('added-products');
  const addBtn = document.getElementById('add-product-btn');
  const saveBtn = document.getElementById('save-btn');
  const scanBtn = document.getElementById('scan-btn');
  const scannerModal = document.getElementById('scanner-modal');
  const scannerReader = document.getElementById('scanner-reader');
  const scannerClose = document.getElementById('scanner-close');

  let selectedProduct = null;
  let isAdding = false;
  let isSaving = false;
  let html5QrCode = null;

  function showSuggestions(filter) {
    const q = filter.trim().toLowerCase();
    if (q.length < 1) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      return;
    }

    const filtered = (products ?? []).filter(p =>
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q)
    ).slice(0, 5);

    if (filtered.length === 0) {
      suggestions.innerHTML = `<div class="suggestion-empty">${tr('mout_no_results')}</div>`;
      suggestions.style.display = 'block';
      return;
    }

    suggestions.innerHTML = filtered.map(p => `
      <div class="suggestion-card" data-id="${p.id}">
        <div class="suggestion-image">
          ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : '<i class="fas fa-box-open"></i>'}
        </div>
        <div class="suggestion-info">
          <strong>${p.name ?? tr('products_no_name')}</strong>
          <span class="suggestion-sku">${p.sku ?? '—'}</span>
        </div>
        <div class="suggestion-stats">
          <span>${tr('products_qty')}: <b class="${(p.qty ?? 0) < 10 ? 'low' : ''}">${p.qty ?? 0}</b></span>
        </div>
      </div>
    `).join('');

    suggestions.style.display = 'block';

    suggestions.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const id = card.dataset.id;
        const found = products.find(p => p.id === id);

        if (found) {
          selectProduct(found);
          suggestions.style.display = 'none';
        }
      });
    });
  }

  function selectProduct(found) {
    selectedProduct = found;
    productInput.value = `${found.name} (${found.sku ?? '—'})`;
    hiddenId.value = found.id;
    quantityInput.value = '1';

    const sellingPrice = getSellingPrice(found);
    priceInput.value = sellingPrice.toFixed(2);

    availableQtyInput.value = found.qty ?? 0;
  }

  productInput.addEventListener('input', () => {
    selectedProduct = null;
    hiddenId.value = '';
    availableQtyInput.value = '—';
    showSuggestions(productInput.value);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#product-input') && !e.target.closest('#product-suggestions')) {
      suggestions.style.display = 'none';
    }
  });

  quantityInput.addEventListener('input', () => {
    if (!selectedProduct) return;
    const idx = addedProducts.findIndex(p => p.id === selectedProduct.id);
    if (idx === -1) return;

    const newQty = Number(quantityInput.value);
    if (!newQty || newQty <= 0) return;

    addedProducts[idx].qty = newQty;
    renderAddedProducts();
  });

  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      alert(tr('prod_add_scanner_err'));
      return;
    }

    scannerModal.style.display = 'flex';
    scannerReader.innerHTML = '';

    try {
      html5QrCode = new Html5Qrcode("scanner-reader");

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          await handleScan(decodedText);
          await stopScanner();
        },
        () => { }
      );
    } catch (err) {
      alert(tr('prod_add_camera_err') + ' ' + err.message);
      scannerModal.style.display = 'none';
    }
  }

  async function stopScanner() {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (e) { }
      html5QrCode = null;
    }
    scannerModal.style.display = 'none';
  }

  async function handleScan(barcode) {
    const value = String(barcode).trim();
    if (!value) return;

    let found = (products ?? []).find(p => p.sku === value);

    if (!found) {
      const { data: dbFound, error } = await db
        .from('products')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .eq('sku', value)
        .limit(1)
        .maybeSingle();

      if (error) {
        alert(tr('prod_add_err_find') + ' ' + error.message);
        return;
      }
      found = dbFound;
    }

    if (!found) {
      alert(`${tr('mout_not_found')}\n${value}`);
      return;
    }

    const available = Number(found.qty ?? 0);

    if (available <= 0) {
      alert(`${tr('mout_no_stock')} "${found.name}"`);
      return;
    }

    const existing = addedProducts.find(p => p.id === found.id);

    if (existing) {
      selectProduct(found);
      // في حالة المسح، نضع الكمية الحالية في الحقل لكي يراها المستخدم
      quantityInput.value = existing.qty; 
      return;
    }

    const sellingPrice = getSellingPrice(found);
    const costPrice = Number(found.price ?? 0);

    addedProducts.push({
      id: found.id,
      name: found.name,
      sku: found.sku,
      image_url: found.image_url,
      qty: 1,
      price: sellingPrice,
      costPrice: costPrice,
      available: available,
    });

    renderAddedProducts();
    selectProduct(found);
  }

  scanBtn.addEventListener('click', startScanner);
  scannerClose.addEventListener('click', stopScanner);
  scannerModal.addEventListener('click', (e) => {
    if (e.target === scannerModal) stopScanner();
  });

  function renderAddedProducts() {
    if (addedProducts.length === 0) {
      addedContainer.innerHTML = `
        <div class="empty-added">
          <i class="fas fa-box-open"></i>
          <p>${tr('mout_empty')}</p>
        </div>
      `;
      updateSummary();
      return;
    }

    addedContainer.innerHTML = addedProducts.map((p, index) => `
      <div class="added-product-card">
        <div class="added-product-image">
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}">`
            : `<i class="fas fa-box-open"></i>`}
        </div>
        <div class="added-product-info">
          <strong>${p.name}</strong>
          <span>${p.sku ?? '—'}</span>
        </div>
        <div class="added-product-stats">
          <div class="stat-mini">
            <span>${tr('products_qty')}</span>
            <b>${p.qty}</b>
          </div>
          <div class="stat-mini">
            <span>${tr('products_price')}</span>
            <b>${Number(p.price).toFixed(2)}</b>
          </div>
          <div class="stat-mini highlight">
            <span>${tr('products_total')}</span>
            <b>${(Number(p.qty) * Number(p.price)).toFixed(2)}</b>
          </div>
        </div>
        <button type="button" class="added-product-delete" data-index="${index}" title="${tr('prod_add_delete')}">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    `).join('');

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
    let totalQty = 0;
    let totalValue = 0;
    addedProducts.forEach(p => {
      totalQty += Number(p.qty);
      totalValue += Number(p.qty) * Number(p.price);
    });
    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = totalQty;
    document.getElementById('sum-total').textContent = totalValue.toFixed(2);
  }

  function addProduct() {
    if (isAdding || addBtn.disabled) return;
    isAdding = true;
    addBtn.disabled = true;

    const errBox = document.getElementById('form-error');
    errBox.style.display = 'none';

    if (!selectedProduct) {
      errBox.textContent = tr('mout_err_select');
      errBox.style.display = 'block';
      productInput.focus();
      isAdding = false;
      addBtn.disabled = false;
      return;
    }

    const qty = Number(quantityInput.value);
    const price = Number(priceInput.value) || 0;
    const available = Number(selectedProduct.qty ?? 0);

    if (!qty || qty <= 0) {
      errBox.textContent = tr('prod_add_err_qty');
      errBox.style.display = 'block';
      quantityInput.focus();
      isAdding = false;
      addBtn.disabled = false;
      return;
    }

    if (qty > available) {
      errBox.textContent = `${tr('mout_err_max')} ${available}`;
      errBox.style.display = 'block';
      quantityInput.focus();
      isAdding = false;
      addBtn.disabled = false;
      return;
    }

    const costPrice = Number(selectedProduct.price ?? 0);
    const existing = addedProducts.find(p => p.id === selectedProduct.id);

    if (existing) {
      // ✅ التعديل هنا: إضافة الكمية الجديدة بدلاً من استبدالها
      existing.qty += qty; 
      existing.price = price;
      existing.costPrice = costPrice;
      renderAddedProducts();
      isAdding = false;
      addBtn.disabled = false;
      
      // تفريغ الحقل
      productInput.value = '';
      hiddenId.value = '';
      availableQtyInput.value = '—';
      quantityInput.value = '1';
      priceInput.value = '0';
      selectedProduct = null;
      return;
    }

    addedProducts.push({
      id: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      image_url: selectedProduct.image_url,
      qty: qty,
      price: price,
      costPrice: costPrice,
      available: available,
    });

    productInput.value = '';
    hiddenId.value = '';
    availableQtyInput.value = '—';
    quantityInput.value = '1';
    priceInput.value = '0';
    selectedProduct = null;
    productInput.focus();

    renderAddedProducts();

    setTimeout(() => {
      isAdding = false;
      addBtn.disabled = false;
    }, 400);
  }

  addBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addProduct();
  });

  [productInput, quantityInput, priceInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  });

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSaving || saveBtn.disabled) return;
    isSaving = true;
    saveBtn.disabled = true;

    const errBox = document.getElementById('form-error');
    const successBox = document.getElementById('form-success');

    errBox.style.display = 'none';
    successBox.style.display = 'none';

    if (addedProducts.length === 0) {
      errBox.textContent = tr('prod_add_err_empty');
      errBox.style.display = 'block';
      isSaving = false;
      saveBtn.disabled = false;
      return;
    }

    saveBtn.querySelector('span').textContent = tr('prod_add_saving');

    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      const { data: prof } = await db
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', authUser.id)
        .single();

      if (!prof?.organization_id) {
        throw new Error(tr('prod_add_err_org'));
      }

      const { data: lastReceipt } = await db
        .from('receipts')
        .select('receipt_number')
        .eq('organization_id', prof.organization_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastReceipt?.receipt_number) {
        const match = lastReceipt.receipt_number.match(/RCP-(\d+)/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const receiptNumber = 'RCP-' + String(nextNumber).padStart(3, '0');

      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

      const { data: newReceipt, error: receiptErr } = await db
        .from('receipts')
        .insert({
          receipt_number: receiptNumber,
          organization_id: prof.organization_id,
          total_qty: totalQty,
          total_value: totalValue,
          created_by: authUser.id,
        })
        .select()
        .single();

      if (receiptErr) throw new Error(tr('mout_err_receipt') + ' ' + receiptErr.message);

      const receiptItems = addedProducts.map(p => {
        const qty = Number(p.qty);
        const price = Number(p.price);
        const costPrice = Number(p.costPrice ?? 0);

        return {
          receipt_id: newReceipt.id,
          product_id: p.id,
          product_name: p.name,
          qty: qty,
          price: price,
          cost_price: costPrice,
          profit: (price - costPrice) * qty,
          total: qty * price,
        };
      });

      const { error: itemsErr } = await db
        .from('receipt_items')
        .insert(receiptItems);

      if (itemsErr) throw new Error(tr('mout_err_items') + ' ' + itemsErr.message);

      const movements = addedProducts.map(p => ({
        organization_id: prof.organization_id,
        product_id: p.id,
        type: 'out',
        method: 'manual',
        quantity: Number(p.qty),
        performed_by: authUser.id,
      }));

      const { error: moveError } = await db
        .from('stock_movements')
        .insert(movements);

      if (moveError) throw new Error(tr('mout_err_movements') + ' ' + moveError.message);

      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({
            orgId: prof.organization_id,
            title: addedProducts.length === 1 ? tr('mout_notif_title_1') : `${tr('mout_notif_title_n')} (${addedProducts.length})`,
            message: `${prof.full_name || tr('prod_detail_user')} ${tr('mout_notif_msg')} ${totalQty} ${tr('mout_notif_unit')} ${totalValue.toFixed(2)} — ${receiptNumber}`,
            type: 'warning',
            link: `/receipt.html?id=${newReceipt.id}`,
            userName: prof.full_name || null,
          });
        } catch (notifErr) {
          console.error('❌ Notification error:', notifErr);
        }
      }

      successBox.textContent = `${tr('mout_success')} ${receiptNumber}`;
      successBox.style.display = 'block';

      if (window.self !== window.top) {
        const updates = addedProducts.map(p => ({
          id: p.id,
          newQty: Number(p.available) - Number(p.qty)
        }));
        
        window.parent.postMessage({
          type: 'PRODUCT_INSTANT_UPDATE_QTY',
          updates: updates
        }, '*');
      }

      addedProducts.length = 0;
      renderAddedProducts();
      document.getElementById('note').value = '';

      setTimeout(() => {
        window.location.href = `/receipt.html?id=${newReceipt.id}`;
      }, 1200);

    } catch (error) {
      errBox.textContent = error.message;
      errBox.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = tr('mout_save');
      isSaving = false;
    }
  });

  renderAddedProducts();
});