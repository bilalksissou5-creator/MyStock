// ============================================
// صفحة إخراج منتجات (متعددة) + إيصال بيع
// ✅ خصم qty مباشرة
// ✅ بحث في product_barcodes
// ✅ طباعة تلقائية بدون تحويل لصفحة الإيصال
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
    if (sellEnabled && sellPrice > 0) return sellPrice;
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
            <input type="number" id="quantity" value="" placeholder="1" min="0.01" step="0.01">
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

  // ============================================
  // طباعة
  // ============================================
  function isAndroid() { return /Android/i.test(navigator.userAgent); }
  function isIOS() {
    return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function buildRawBTText(receiptNumber, items, totalQty, totalValue) {
    const L = [];
    L.push('\x1B\x61\x01');
    L.push('\x1B\x21\x30');
    L.push('MyStock');
    L.push('\x1B\x21\x00');
    L.push('================================');
    L.push('رقم الإيصال: ' + receiptNumber);
    L.push(new Date().toLocaleString('ar'));
    L.push('--------------------------------');
    items.forEach(p => {
      const qty = Number(p.qty);
      const price = Number(p.price);
      L.push(p.name);
      L.push('  ' + qty + ' x ' + price.toFixed(2) + ' = ' + (qty * price).toFixed(2));
    });
    L.push('--------------------------------');
    L.push('عدد القطع: ' + totalQty);
    L.push('\x1B\x21\x30');
    L.push('الإجمالي: ' + totalValue.toFixed(2));
    L.push('\x1B\x21\x00');
    L.push('\x1B\x61\x01');
    L.push('شكراً لتعاملكم معنا');
    L.push('');
    L.push('');
    L.push('');
    L.push('\x1D\x56\x42\x00');
    return L.join('\n');
  }

  function printViaRawBT(receiptNumber, items, totalQty, totalValue) {
    try {
      const text = buildRawBTText(receiptNumber, items, totalQty, totalValue);
      const url = 'intent:' + encodeURIComponent(text) +
                  '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => { try { iframe.remove(); } catch (e) {} }, 3500);
    } catch (err) { console.warn('RawBT error:', err); }
  }

  function printViaPopup(receiptId, printWin) {
    if (!printWin || printWin.closed) return false;
    try {
      printWin.location.href = '/receipt.html?id=' + encodeURIComponent(receiptId);
      printWin.addEventListener('load', function onLoad() {
        printWin.removeEventListener('load', onLoad);
        setTimeout(() => {
          try { printWin.focus(); printWin.print(); }
          catch (e) { console.warn('print error:', e); }
        }, 1200);
      });
      try {
        printWin.onafterprint = () => {
          setTimeout(() => { try { printWin.close(); } catch (e) {} }, 800);
        };
      } catch (e) {}
      return true;
    } catch (err) {
      console.warn('Popup print error:', err);
      return false;
    }
  }

  function printViaIframe(receiptId) {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;';
      iframe.src = '/receipt.html?id=' + encodeURIComponent(receiptId);
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
          catch (e) { console.warn('iframe print error:', e); }
          setTimeout(() => { try { iframe.remove(); } catch (e) {} }, 3000);
        }, 1200);
      };
      return true;
    } catch (err) {
      console.warn('iframe setup error:', err);
      return false;
    }
  }

  function autoPrintReceipt(receiptId, receiptNumber, items, printWin) {
    const totalQty = items.reduce((s, p) => s + Number(p.qty), 0);
    const totalValue = items.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

    if (isAndroid()) { printViaRawBT(receiptNumber, items, totalQty, totalValue); return; }
    if (isIOS()) return;
    if (!printViaPopup(receiptId, printWin)) printViaIframe(receiptId);
  }

  // ============================================
  // المنتجات
  // ============================================
  function showSuggestions(filter) {
    const q = filter.trim().toLowerCase();
    if (q.length < 1) { suggestions.innerHTML = ''; suggestions.style.display = 'none'; return; }

    const filtered = (products ?? []).filter(p =>
      (p.name ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
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
        e.preventDefault(); e.stopPropagation();
        const found = products.find(p => p.id === card.dataset.id);
        if (found) { selectProduct(found); suggestions.style.display = 'none'; }
      });
    });
  }

  function selectProduct(found) {
    selectedProduct = found;
    productInput.value = `${found.name} (${found.sku ?? '—'})`;
    hiddenId.value = found.id;
    quantityInput.value = 1;
    priceInput.value = getSellingPrice(found).toFixed(2);
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

  // ============================================
  // الماسح
  // ============================================
  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') { alert(tr('prod_add_scanner_err')); return; }
    scannerModal.style.display = 'flex';
    scannerReader.innerHTML = '';
    try {
      html5QrCode = new Html5Qrcode("scanner-reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      await html5QrCode.start(
        { facingMode: "environment" }, config,
        async (decodedText) => { await handleScan(decodedText); await stopScanner(); },
        () => {}
      );
    } catch (err) {
      alert(tr('prod_add_camera_err') + ' ' + err.message);
      scannerModal.style.display = 'none';
    }
  }

  async function stopScanner() {
    if (html5QrCode) {
      try { await html5QrCode.stop(); await html5QrCode.clear(); } catch (e) {}
      html5QrCode = null;
    }
    scannerModal.style.display = 'none';
  }

  async function handleScan(barcode) {
    const value = String(barcode).trim();
    if (!value) return;

    let found = (products ?? []).find(p => p.sku === value || p.qr_code === value);

    if (!found) {
      const { data: dbFound, error } = await db.from('products').select('*')
        .eq('organization_id', profile?.organization_id)
        .eq('sku', value).limit(1).maybeSingle();
      if (error) { alert(tr('prod_add_err_find') + ' ' + error.message); return; }
      found = dbFound;
    }

    if (!found) {
      const { data: aliasRow } = await db.from('product_barcodes').select('product_id')
        .eq('organization_id', profile?.organization_id)
        .eq('barcode', value).limit(1).maybeSingle();
      if (aliasRow?.product_id) {
        const { data: prod } = await db.from('products').select('*').eq('id', aliasRow.product_id).single();
        if (prod) found = prod;
      }
    }

    if (!found) { alert(`${tr('mout_not_found')}\n${value}`); return; }
    if (Number(found.qty ?? 0) <= 0) { alert(`${tr('mout_no_stock')} "${found.name}"`); return; }
    selectProduct(found);
  }

  scanBtn.addEventListener('click', startScanner);
  scannerClose.addEventListener('click', stopScanner);
  scannerModal.addEventListener('click', (e) => { if (e.target === scannerModal) stopScanner(); });

  // ============================================
  // السلة
  // ============================================
  function renderAddedProducts() {
    if (addedProducts.length === 0) {
      addedContainer.innerHTML = `<div class="empty-added"><i class="fas fa-box-open"></i><p>${tr('mout_empty')}</p></div>`;
      updateSummary();
      return;
    }

    addedContainer.innerHTML = addedProducts.map((p, index) => `
      <div class="added-product-card">
        <div class="added-product-image">
          ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : `<i class="fas fa-box-open"></i>`}
        </div>
        <div class="added-product-info">
          <strong>${p.name}</strong>
          <span>${p.sku ?? '—'}</span>
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
    `).join('');

    addedContainer.querySelectorAll('.added-product-delete').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
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

  function addProduct() {
    if (isAdding || addBtn.disabled) return;
    isAdding = true; addBtn.disabled = true;

    const errBox = document.getElementById('form-error');
    errBox.style.display = 'none';

    if (!selectedProduct) {
      errBox.textContent = tr('mout_err_select'); errBox.style.display = 'block';
      productInput.focus(); isAdding = false; addBtn.disabled = false; return;
    }

    const qty = Number(quantityInput.value);
    const price = Number(priceInput.value) || 0;
    const available = Number(selectedProduct.qty ?? 0);

    if (!qty || qty <= 0) {
      errBox.textContent = tr('prod_add_err_qty'); errBox.style.display = 'block';
      quantityInput.focus(); isAdding = false; addBtn.disabled = false; return;
    }
    if (qty > available) {
      errBox.textContent = `${tr('mout_err_max')} ${available}`; errBox.style.display = 'block';
      quantityInput.focus(); isAdding = false; addBtn.disabled = false; return;
    }

    const costPrice = Number(selectedProduct.price ?? 0);
    const existing = addedProducts.find(p => p.id === selectedProduct.id);

    if (existing) {
      existing.qty += qty;
      existing.price = price;
      existing.costPrice = costPrice;
    } else {
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
    }
    renderAddedProducts();

    productInput.value = '';
    hiddenId.value = '';
    availableQtyInput.value = '—';
    quantityInput.value = '';
    priceInput.value = '0';
    selectedProduct = null;
    productInput.focus();

    setTimeout(() => { isAdding = false; addBtn.disabled = false; }, 400);
  }

  addBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); addProduct(); });

  [productInput, quantityInput, priceInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
    });
  });

  // ============================================
  // الحفظ + الطباعة (بدون تحويل)
  // ============================================
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();

    if (isSaving || saveBtn.disabled) return;

    const errBox = document.getElementById('form-error');
    const successBox = document.getElementById('form-success');
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    if (addedProducts.length === 0) {
      errBox.textContent = tr('prod_add_err_empty');
      errBox.style.display = 'block';
      return;
    }

    let printWin = null;
    if (!isAndroid() && !isIOS()) {
      try {
        printWin = window.open('', '_blank', 'width=400,height=650');
        if (printWin && printWin.document) {
          printWin.document.write(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print</title></head>' +
            '<body style="font-family:sans-serif;text-align:center;padding:40px;color:#555;">' +
            '<p>جارٍ تجهيز الإيصال...</p></body></html>'
          );
          printWin.document.close();
        }
      } catch (err) { printWin = null; }
    }

    isSaving = true;
    saveBtn.disabled = true;
    saveBtn.querySelector('span').textContent = tr('prod_add_saving');

    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      const { data: prof } = await db
        .from('profiles').select('organization_id, full_name').eq('id', authUser.id).single();
      if (!prof?.organization_id) throw new Error(tr('prod_add_err_org'));

      const { data: lastReceipt } = await db
        .from('receipts').select('receipt_number')
        .eq('organization_id', prof.organization_id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      let nextNumber = 1;
      if (lastReceipt?.receipt_number) {
        const match = lastReceipt.receipt_number.match(/RCP-(\d+)/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const receiptNumber = 'RCP-' + String(nextNumber).padStart(3, '0');

      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

      const { data: newReceipt, error: receiptErr } = await db.from('receipts').insert({
        receipt_number: receiptNumber,
        organization_id: prof.organization_id,
        total_qty: totalQty,
        total_value: totalValue,
        created_by: authUser.id,
      }).select().single();
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
      const { error: itemsErr } = await db.from('receipt_items').insert(receiptItems);
      if (itemsErr) throw new Error(tr('mout_err_items') + ' ' + itemsErr.message);

      const movements = addedProducts.map(p => ({
        organization_id: prof.organization_id,
        product_id: p.id,
        type: 'out',
        method: 'manual',
        quantity: Number(p.qty),
        performed_by: authUser.id,
      }));
      const { error: moveError } = await db.from('stock_movements').insert(movements);
      if (moveError) throw new Error(tr('mout_err_movements') + ' ' + moveError.message);

      // ✅ خصم qty مباشرة
      for (const p of addedProducts) {
        const { data: fresh } = await db.from('products').select('qty').eq('id', p.id).single();
        const newQty = Math.max(0, Number(fresh?.qty || 0) - Number(p.qty));
        const { error: qtyErr } = await db.from('products').update({ qty: newQty }).eq('id', p.id);
        if (qtyErr) throw new Error(tr('mout_err_movements') + ' ' + qtyErr.message);
      }

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
        } catch (notifErr) { console.error('Notification error:', notifErr); }
      }

      successBox.textContent = `${tr('mout_success')} ${receiptNumber}`;
      successBox.style.display = 'block';

      if (window.self !== window.top) {
        const updates = addedProducts.map(p => ({
          id: p.id,
          newQty: Number(p.available) - Number(p.qty)
        }));
        window.parent.postMessage({ type: 'PRODUCT_INSTANT_UPDATE_QTY', updates }, '*');
      }

      const itemsSnapshot = addedProducts.map(p => ({ ...p }));

      // ✅ طباعة فقط — لا تحويل
      autoPrintReceipt(newReceipt.id, receiptNumber, itemsSnapshot, printWin);

      // تفريغ
      addedProducts.length = 0;
      renderAddedProducts();
      document.getElementById('note').value = '';

      // ✅ إعادة تفعيل الزر للبيع التالي
      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = tr('mout_save');
      isSaving = false;

      // إخفاء رسالة النجاح بعد 5 ثوانٍ
      setTimeout(() => { successBox.style.display = 'none'; }, 5000);

    } catch (error) {
      if (printWin && !printWin.closed) { try { printWin.close(); } catch (e) {} }
      errBox.textContent = error.message;
      errBox.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = tr('mout_save');
      isSaving = false;
    }
  });

  renderAddedProducts();
});