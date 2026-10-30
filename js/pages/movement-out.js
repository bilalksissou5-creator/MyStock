// ============================================
// صفحة إخراج منتجات + طباعة حرارية (WebBluetooth/WebUSB)
// ✅ بدون RawBT
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

  async function loadHtml2Canvas() {
    if (window.html2canvas) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const Printer = {
    device: null,
    char: null,
    mode: null, // 'bt' أو 'usb'

    async loadSaved() {
      if (navigator.bluetooth) {
        try {
          const devices = await navigator.bluetooth.getDevices();
          if (devices.length > 0) { this.device = devices[0]; this.mode = 'bt'; return true; }
        } catch (e) {}
      }
      if (navigator.usb) {
        try {
          const devices = await navigator.usb.getDevices();
          if (devices.length > 0) { this.device = devices[0]; this.mode = 'usb'; return true; }
        } catch (e) {}
      }
      return false;
    },

    async pair() {
      if (navigator.bluetooth) {
        try {
          this.device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [0xFF00, 0x18F0, 0xFFE0, '0000ff00-0000-1000-8000-00805f9b34fb', '000018f0-0000-1000-8000-00805f9b34fb']
          });
          this.mode = 'bt';
          return 'bt';
        } catch (e) {}
      }
      if (navigator.usb) {
        try {
          this.device = await navigator.usb.requestDevice({ filters: [] });
          this.mode = 'usb';
          return 'usb';
        } catch (e) {}
      }
      return null;
    },

    canvasToESCPOS(canvas) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h).data;
      const bytesPerRow = Math.ceil(w / 8);
      const buffer = new Uint8Array(bytesPerRow * h);
      let off = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x += 8) {
          let b = 0;
          for (let bit = 0; bit < 8; bit++) {
            if (x + bit < w) {
              const i = (y * w + (x + bit)) * 4;
              if (img[i + 3] < 128) continue;
              const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
              if (lum < 128) b |= (1 << (7 - bit));
            }
          }
          buffer[off++] = b;
        }
      }
      const head = [0x1B, 0x40, 0x1B, 0x33, 0x00, 0x1D, 0x76, 0x30, 0x00, bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF, h & 0xFF, (h >> 8) & 0xFF];
      const tail = [0x1B, 0x64, 0x04, 0x1D, 0x56, 0x42, 0x00];
      const out = new Uint8Array(head.length + buffer.length + tail.length);
      out.set(head, 0); out.set(buffer, head.length); out.set(tail, head.length + buffer.length);
      return out;
    },

    async getBTChar() {
      if (this.char) return this.char;
      if (!this.device.gatt.connected) await this.device.gatt.connect();
      const services = await this.device.gatt.getPrimaryServices();
      for (const s of services) {
        const chars = await s.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) { this.char = c; return c; }
        }
      }
      throw new Error("No writable characteristic");
    },

    async print(canvas) {
      const data = this.canvasToESCPOS(canvas);

      if (this.mode === 'bt') {
        const char = await this.getBTChar();
        for (let i = 0; i < data.length; i += 100) {
          const chunk = data.slice(i, i + 100);
          if (char.properties.writeWithoutResponse) await char.writeValueWithoutResponse(chunk);
          else await char.writeValue(chunk);
        }
        return true;
      } 
      
      if (this.mode === 'usb') {
        if (!this.device.opened) await this.device.open();
        let iface = 0, ep = 1;
        for (const intf of this.device.configuration.interfaces) {
          for (const e of intf.alternates[0].endpoints) {
            if (e.direction === 'out') { iface = intf.interfaceNumber; ep = e.endpointNumber; break; }
          }
        }
        await this.device.claimInterface(iface);
        for (let i = 0; i < data.length; i += 1024) {
          await this.device.transferOut(ep, data.slice(i, i + 1024));
        }
        return true;
      }

      throw new Error("لا توجد طابعة متصلة.");
    }
  };

  async function receiptToCanvas(receiptId) {
    await loadHtml2Canvas();
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:80mm;border:0;pointer-events:none;';
      iframe.src = '/receipt.html?id=' + encodeURIComponent(receiptId);
      iframe.onload = async () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const start = Date.now();
          while (Date.now() - start < 10000) {
            if (doc.getElementById('receipt-content')?.querySelector('.rc-total-row')) break;
            await new Promise(r => setTimeout(r, 200));
          }
          doc.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
          if (doc.fonts) { try { await doc.fonts.ready; } catch (e) {} }
          
          const target = doc.getElementById('receipt-content');
          const canvas = await html2canvas(target, {
            backgroundColor: '#ffffff', scale: 2, useCORS: true, allowTaint: true,
            width: target.scrollWidth, height: target.scrollHeight
          });
          iframe.remove(); resolve(canvas);
        } catch (e) { iframe.remove(); reject(e); }
      };
      document.body.appendChild(iframe);
    });
  }

  const main = document.getElementById('main-content');
  const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();
  
  function getSellingPrice(product) {
    const s = Number(product.sell_price ?? 0), e = product.sell_price_enabled === true, b = Number(product.price ?? 0);
    return (e && s > 0) ? s : b;
  }
  
  const { data: products, error: productsError } = await db.from('products').select('*').order('name');
  if (productsError) { main.innerHTML = `<div class="alert alert-error">${productsError.message}</div>`; return; }

  await Printer.loadSaved(); // محاولة صامتة لتحميل طابعة محفوظة

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('mout_title')}</h2>
      <button type="button" class="btn-primary scan-btn" id="scan-btn">
        <i class="fas fa-barcode"></i><span>${tr('mout_scan')}</span>
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
  
  let selectedProduct = null, isAdding = false, isSaving = false, html5QrCode = null;

  function showSuggestions(filter) {
    const q = filter.trim().toLowerCase();
    if (!q) { suggestions.innerHTML = ''; suggestions.style.display = 'none'; return; }
    const filtered = (products ?? []).filter(p => (p.name ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)).slice(0, 5);
    if (!filtered.length) { suggestions.innerHTML = `<div class="suggestion-empty">${tr('mout_no_results')}</div>`; suggestions.style.display = 'block'; return; }
    suggestions.innerHTML = filtered.map(p => `
      <div class="suggestion-card" data-id="${p.id}">
        <div class="suggestion-image">${p.image_url ? `<img src="${p.image_url}">` : '<i class="fas fa-box-open"></i>'}</div>
        <div class="suggestion-info"><strong>${p.name ?? tr('products_no_name')}</strong><span class="suggestion-sku">${p.sku ?? '—'}</span></div>
        <div class="suggestion-stats"><span>${tr('products_qty')}: <b>${p.qty ?? 0}</b></span></div>
      </div>`).join('');
    suggestions.style.display = 'block';
    suggestions.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const found = products.find(p => p.id === card.dataset.id);
        if (found) { selectProduct(found); suggestions.style.display = 'none'; }
      });
    });
  }

  function selectProduct(f) {
    selectedProduct = f; productInput.value = `${f.name} (${f.sku ?? '—'})`; hiddenId.value = f.id; quantityInput.value = 1; priceInput.value = getSellingPrice(f).toFixed(2); availableQtyInput.value = f.qty ?? 0;
  }

  productInput.addEventListener('input', () => { selectedProduct = null; hiddenId.value = ''; availableQtyInput.value = '—'; showSuggestions(productInput.value); });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#product-input') && !e.target.closest('#product-suggestions')) suggestions.style.display = 'none'; });

  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') { alert(tr('prod_add_scanner_err')); return; }
    scannerModal.style.display = 'flex'; scannerReader.innerHTML = '';
    try {
      html5QrCode = new Html5Qrcode("scanner-reader");
      await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (t) => { await handleScan(t); await stopScanner(); }, () => {});
    } catch (err) { alert(tr('prod_add_camera_err') + ' ' + err.message); scannerModal.style.display = 'none'; }
  }

  async function stopScanner() {
    if (html5QrCode) { try { await html5QrCode.stop(); await html5QrCode.clear(); } catch (e) {} html5QrCode = null; }
    scannerModal.style.display = 'none';
  }

  async function handleScan(barcode) {
    const v = String(barcode).trim(); if (!v) return;
    let f = (products ?? []).find(p => p.sku === v || p.qr_code === v);
    if (!f) {
      const { data, error } = await db.from('products').select('*').eq('organization_id', profile?.organization_id).eq('sku', v).limit(1).maybeSingle();
      if (error) { alert(tr('prod_add_err_find') + ' ' + error.message); return; }
      f = data;
    }
    if (!f) {
      const { data: a } = await db.from('product_barcodes').select('product_id').eq('organization_id', profile?.organization_id).eq('barcode', v).limit(1).maybeSingle();
      if (a?.product_id) { const { data: p } = await db.from('products').select('*').eq('id', a.product_id).single(); if (p) f = p; }
    }
    if (!f) { alert(`${tr('mout_not_found')}\n${v}`); return; }
    if (Number(f.qty ?? 0) <= 0) { alert(`${tr('mout_no_stock')} "${f.name}"`); return; }
    selectProduct(f);
  }

  scanBtn.addEventListener('click', startScanner);
  scannerClose.addEventListener('click', stopScanner);
  scannerModal.addEventListener('click', (e) => { if (e.target === scannerModal) stopScanner(); });

  function renderAddedProducts() {
    if (!addedProducts.length) { addedContainer.innerHTML = `<div class="empty-added"><i class="fas fa-box-open"></i><p>${tr('mout_empty')}</p></div>`; updateSummary(); return; }
    addedContainer.innerHTML = addedProducts.map((p, i) => `
      <div class="added-product-card">
        <div class="added-product-image">${p.image_url ? `<img src="${p.image_url}">` : `<i class="fas fa-box-open"></i>`}</div>
        <div class="added-product-info"><strong>${p.name}</strong><span>${p.sku ?? '—'}</span></div>
        <div class="added-product-stats">
          <div class="stat-mini"><span>${tr('products_qty')}</span><b>${p.qty}</b></div>
          <div class="stat-mini"><span>${tr('products_price')}</span><b>${Number(p.price).toFixed(2)}</b></div>
          <div class="stat-mini highlight"><span>${tr('products_total')}</span><b>${(Number(p.qty) * Number(p.price)).toFixed(2)}</b></div>
        </div>
        <button type="button" class="added-product-delete" data-index="${i}"><i class="fas fa-xmark"></i></button>
      </div>`).join('');
    addedContainer.querySelectorAll('.added-product-delete').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); addedProducts.splice(Number(btn.dataset.index), 1); renderAddedProducts(); });
    });
    updateSummary();
  }

  function updateSummary() {
    let q = 0, v = 0;
    addedProducts.forEach(p => { q += Number(p.qty); v += Number(p.qty) * Number(p.price); });
    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = q;
    document.getElementById('sum-total').textContent = v.toFixed(2);
  }

  function addProduct() {
    if (isAdding || addBtn.disabled) return;
    isAdding = true; addBtn.disabled = true;
    const errBox = document.getElementById('form-error'); errBox.style.display = 'none';
    if (!selectedProduct) { errBox.textContent = tr('mout_err_select'); errBox.style.display = 'block'; productInput.focus(); isAdding = false; addBtn.disabled = false; return; }
    const qty = Number(quantityInput.value), price = Number(priceInput.value) || 0, av = Number(selectedProduct.qty ?? 0);
    if (!qty || qty <= 0) { errBox.textContent = tr('prod_add_err_qty'); errBox.style.display = 'block'; quantityInput.focus(); isAdding = false; addBtn.disabled = false; return; }
    if (qty > av) { errBox.textContent = `${tr('mout_err_max')} ${av}`; errBox.style.display = 'block'; quantityInput.focus(); isAdding = false; addBtn.disabled = false; return; }

    const cp = Number(selectedProduct.price ?? 0);
    const ex = addedProducts.find(p => p.id === selectedProduct.id);
    if (ex) { ex.qty += qty; ex.price = price; ex.costPrice = cp; }
    else { addedProducts.push({ id: selectedProduct.id, name: selectedProduct.name, sku: selectedProduct.sku, image_url: selectedProduct.image_url, qty, price, costPrice: cp, available: av }); }
    renderAddedProducts();
    productInput.value = ''; hiddenId.value = ''; availableQtyInput.value = '—'; quantityInput.value = ''; priceInput.value = '0'; selectedProduct = null; productInput.focus();
    setTimeout(() => { isAdding = false; addBtn.disabled = false; }, 400);
  }

  addBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); addProduct(); });
  [productInput, quantityInput, priceInput].forEach(input => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); } });
  });

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (isSaving || saveBtn.disabled) return;

    const errBox = document.getElementById('form-error'), successBox = document.getElementById('form-success');
    errBox.style.display = 'none'; successBox.style.display = 'none';

    if (!addedProducts.length) { errBox.textContent = tr('prod_add_err_empty'); errBox.style.display = 'block'; return; }
    isSaving = true; saveBtn.disabled = true; saveBtn.querySelector('span').textContent = tr('prod_add_saving');

    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      const { data: prof } = await db.from('profiles').select('organization_id, full_name').eq('id', authUser.id).single();
      if (!prof?.organization_id) throw new Error(tr('prod_add_err_org'));

      const { data: lastReceipt } = await db.from('receipts').select('receipt_number').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      let nextNumber = 1;
      if (lastReceipt?.receipt_number) { const m = lastReceipt.receipt_number.match(/RCP-(\d+)/); if (m) nextNumber = parseInt(m[1], 10) + 1; }
      const receiptNumber = 'RCP-' + String(nextNumber).padStart(3, '0');

      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

      const { data: newReceipt, error: receiptErr } = await db.from('receipts').insert({ receipt_number: receiptNumber, organization_id: prof.organization_id, total_qty: totalQty, total_value: totalValue, created_by: authUser.id }).select().single();
      if (receiptErr) throw new Error(tr('mout_err_receipt') + ' ' + receiptErr.message);

      const receiptItems = addedProducts.map(p => {
        const qty = Number(p.qty), price = Number(p.price), costPrice = Number(p.costPrice ?? 0);
        return { receipt_id: newReceipt.id, product_id: p.id, product_name: p.name, qty, price, cost_price: costPrice, profit: (price - costPrice) * qty, total: qty * price };
      });
      const { error: itemsErr } = await db.from('receipt_items').insert(receiptItems);
      if (itemsErr) throw new Error(tr('mout_err_items') + ' ' + itemsErr.message);

      const movements = addedProducts.map(p => ({ organization_id: prof.organization_id, product_id: p.id, type: 'out', method: 'manual', quantity: Number(p.qty), performed_by: authUser.id }));
      const { error: moveError } = await db.from('stock_movements').insert(movements);
      if (moveError) throw new Error(tr('mout_err_movements') + ' ' + moveError.message);

      for (const p of addedProducts) {
        const { data: fresh } = await db.from('products').select('qty').eq('id', p.id).single();
        const newQty = Math.max(0, Number(fresh?.qty || 0) - Number(p.qty));
        await db.from('products').update({ qty: newQty }).eq('id', p.id);
      }

      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({ orgId: prof.organization_id, title: addedProducts.length === 1 ? tr('mout_notif_title_1') : `${tr('mout_notif_title_n')} (${addedProducts.length})`, message: `${prof.full_name || tr('prod_detail_user')} ${tr('mout_notif_msg')} ${totalQty} ${tr('mout_notif_unit')} ${totalValue.toFixed(2)} — ${receiptNumber}`, type: 'warning', link: `/receipt.html?id=${newReceipt.id}`, userName: prof.full_name || null });
        } catch (e) {}
      }

      successBox.textContent = `تم الحفظ بنجاح ✅`;
      successBox.style.display = 'block';

      if (window.self !== window.top) {
        const updates = addedProducts.map(p => ({ id: p.id, newQty: Number(p.available) - Number(p.qty) }));
        window.parent.postMessage({ type: 'PRODUCT_INSTANT_UPDATE_QTY', updates }, '*');
      }

      addedProducts.length = 0;
      renderAddedProducts();
      document.getElementById('note').value = '';
      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = tr('mout_save');
      isSaving = false;

      // ==========================================
      // ✅ منطق الطابعة (بدون RawBT)
      // ==========================================
      
      if (!Printer.mode) {
        const wantToPair = confirm("لم يتم العثور على طابعة.\n\nهل تريد ربط طابعة الآن؟\n(ملاحظة: يجب أن تدعم طابعة البلوتوث تقنية BLE لكي تظهر).");
        
        if (wantToPair) {
          const pairedMode = await Printer.pair();
          
          if (!pairedMode) {
             const openSettings = confirm("لم يتم العثور على الطابعة.\n\nهل تريد فتح إعدادات البلوتوث في الهاتف الآن لإقران الطابعة؟");
             if (openSettings) {
                window.location.href = "intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end;";
                return;
             } else {
                errBox.textContent = 'تم الحفظ بدون طباعة. يرجى إقران الطابعة لاحقاً.';
                errBox.style.display = 'block';
                return;
             }
          }
        } else {
          errBox.textContent = 'تم الحفظ بدون طباعة.';
          errBox.style.display = 'block';
          return;
        }
      }

      try {
        const canvas = await receiptToCanvas(newReceipt.id);
        await Printer.print(canvas);
        successBox.textContent = `تم الحفظ والطباعة ✅ (${receiptNumber})`;
      } catch (err) {
        console.error("فشلت الطباعة:", err);
        errBox.textContent = 'تم الحفظ، لكن فشلت الطباعة: ' + err.message;
        errBox.style.display = 'block';
      }

      setTimeout(() => { successBox.style.display = 'none'; }, 5000);

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