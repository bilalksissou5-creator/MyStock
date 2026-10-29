// ============================================
// صفحة إخراج منتجات + طباعة حرارية تلقائية شاملة
// ✅ WebUSB (كمبيوتر/أندرويد)
// ✅ WebBluetooth (كمبيوتر/أندرويد)
// ✅ RawBT (أندرويد - بديل)
// ✅ طباعة المتصفح (iOS/ديسكتوب)
// ✅ التصميم مطابق 100% لـ receipt.html
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

  // تحميل html2canvas ديناميكياً
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

  // ============================================
  // محرك الطباعة الحرارية الموحد
  // ============================================
  class ThermalPrinter {
    constructor() {
      this.usbDevice = null;
      this.btDevice = null;
      this.btChar = null;
      this.mode = null; // 'usb', 'bt', 'rawbt', 'native'
      this.saved = false;
      this.loadSavedDevices();
    }

    async loadSavedDevices() {
      if (navigator.usb) {
        try {
          const devices = await navigator.usb.getDevices();
          if (devices.length > 0) {
            this.usbDevice = devices[0];
            this.mode = 'usb';
            this.saved = true;
          }
        } catch (e) {}
      }
      if (!this.mode && navigator.bluetooth) {
        try {
          const devices = await navigator.bluetooth.getDevices();
          if (devices.length > 0) {
            this.btDevice = devices[0];
            this.mode = 'bt';
            this.saved = true;
          }
        } catch (e) {}
      }
    }

    async connectUSB() {
      if (!navigator.usb) return false;
      try {
        this.usbDevice = await navigator.usb.requestDevice({ filters: [] });
        this.mode = 'usb';
        return true;
      } catch (e) { return false; }
    }

    async connectBluetooth() {
      if (!navigator.bluetooth) return false;
      try {
        this.btDevice = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            0xFF00, 0x18F0, 0xFFE0, 
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '000018f0-0000-1000-8000-00805f9b34fb',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
          ]
        });
        this.mode = 'bt';
        return true;
      } catch (e) { return false; }
    }

    async getBTCharacteristic() {
      if (this.btChar) return this.btChar;
      if (!this.btDevice.gatt.connected) await this.btDevice.gatt.connect();
      const services = await this.btDevice.gatt.getPrimaryServices();
      for (const s of services) {
        try {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              this.btChar = c;
              return c;
            }
          }
        } catch(e) {}
      }
      throw new Error("No writable characteristic found");
    }

    // تحويل canvas إلى أوامر ESC/POS (Bitmap)
    canvasToESCPOS(canvas) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const imageData = ctx.getImageData(0, 0, width, height).data;
      
      const bytesPerRow = Math.ceil(width / 8);
      const buffer = new Uint8Array(bytesPerRow * height);
      let offset = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += 8) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            if (x + bit < width) {
              const idx = (y * width + (x + bit)) * 4;
              const a = imageData[idx + 3];
              if (a < 128) continue;
              const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2];
              const lum = 0.299*r + 0.587*g + 0.114*b;
              if (lum < 128) byte |= (1 << (7 - bit));
            }
          }
          buffer[offset++] = byte;
        }
      }

      const cmds = [0x1B, 0x40, 0x1B, 0x33, 0x00]; // init + line spacing 0
      const xL = bytesPerRow & 0xFF, xH = (bytesPerRow >> 8) & 0xFF;
      const yL = height & 0xFF, yH = (height >> 8) & 0xFF;
      cmds.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);
      
      const finalBuffer = new Uint8Array(cmds.length + buffer.length + 5);
      finalBuffer.set(cmds, 0);
      finalBuffer.set(buffer, cmds.length);
      
      let tailIdx = cmds.length + buffer.length;
      finalBuffer.set([0x1B, 0x64, 0x03], tailIdx); // feed 3
      finalBuffer.set([0x1D, 0x56, 0x42, 0x00], tailIdx + 3); // cut
      
      return finalBuffer;
    }

    async printViaUSB(canvas) {
      if (!this.usbDevice.opened) await this.usbDevice.open();
      if (this.usbDevice.configuration === null) await this.usbDevice.selectConfiguration(1);
      
      let iface = 0, ep = 1;
      for (const intf of this.usbDevice.configuration.interfaces) {
        for (const e of intf.alternates[0].endpoints) {
          if (e.direction === 'out') { iface = intf.interfaceNumber; ep = e.endpointNumber; break; }
        }
      }
      await this.usbDevice.claimInterface(iface);
      
      const data = this.canvasToESCPOS(canvas);
      const CHUNK = 1024;
      for (let i = 0; i < data.length; i += CHUNK) {
        await this.usbDevice.transferOut(ep, data.slice(i, i + CHUNK));
      }
      await this.usbDevice.close();
    }

    async printViaBT(canvas) {
      const char = await this.getBTCharacteristic();
      const data = this.canvasToESCPOS(canvas);
      const CHUNK = 100;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        if (char.properties.writeWithoutResponse) {
          await char.writeValueWithoutResponse(chunk);
        } else {
          await char.writeValue(chunk);
        }
      }
    }

    printViaRawBT(canvas) {
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      const url = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.autoprint=true;end;`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => { try { iframe.remove(); } catch(e) {} }, 10000);
    }

    async print(canvas, receiptId) {
      try {
        if (this.mode === 'usb' && this.usbDevice) {
          await this.printViaUSB(canvas);
          return true;
        }
        if (this.mode === 'bt' && this.btDevice) {
          await this.printViaBT(canvas);
          return true;
        }
      } catch (err) {
        console.warn("Direct print failed, falling back:", err);
      }
      
      if (/Android/i.test(navigator.userAgent)) {
        this.printViaRawBT(canvas);
        return true;
      }
      
      return false; // Fallback to native
    }
  }

  const printer = new ThermalPrinter();

  // ============================================
  // تحويل receipt.html إلى Canvas
  // ============================================
  async function renderReceiptToCanvas(receiptId) {
    await loadHtml2Canvas();
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      // عرض 80mm ليخرج التصميم مطابقاً للطابعة
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:80mm;min-height:297mm;border:0;pointer-events:none;';
      iframe.src = '/receipt.html?id=' + encodeURIComponent(receiptId);

      iframe.onload = async () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          
          // انتظار حتى ينتهي receipt.js من رسم البيانات
          const start = Date.now();
          while (Date.now() - start < 10000) {
            const content = doc.getElementById('receipt-content');
            if (content && content.querySelector('.rc-total-row')) break;
            await new Promise(r => setTimeout(r, 200));
          }

          // إخفاء أزرار الطباعة والرجوع
          doc.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
          
          // انتظار الخطوط والصور
          if (doc.fonts) { try { await doc.fonts.ready; } catch(e) {} }
          const imgs = Array.from(doc.querySelectorAll('img'));
          await Promise.all(imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(res => {
              img.addEventListener('load', res);
              img.addEventListener('error', res);
              setTimeout(res, 2000);
            });
          }));
          
          await new Promise(r => setTimeout(r, 400)); // استقرار التصميم

          const target = doc.getElementById('receipt-content');
          if (!target) throw new Error("Target not found");

          const canvas = await html2canvas(target, {
            backgroundColor: '#ffffff',
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: target.scrollWidth,
            height: target.scrollHeight,
            windowWidth: target.scrollWidth,
            windowHeight: target.scrollHeight
          });

          iframe.remove();
          resolve(canvas);
        } catch (err) {
          iframe.remove();
          reject(err);
        }
      };
      
      iframe.onerror = () => { iframe.remove(); reject(new Error("Iframe load failed")); };
      document.body.appendChild(iframe);
    });
  }

  function printNative(receiptId) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:80mm;height:297mm;border:0;opacity:0;pointer-events:none;';
    iframe.src = '/receipt.html?id=' + encodeURIComponent(receiptId);
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) { console.warn(e); }
        setTimeout(() => { try { iframe.remove(); } catch (e) {} }, 5000);
      }, 1500);
    };
    document.body.appendChild(iframe);
  }

  async function autoPrintReceipt(receiptId) {
    try {
      const canvas = await renderReceiptToCanvas(receiptId);
      const direct = await printer.print(canvas, receiptId);
      if (!direct) printNative(receiptId);
    } catch (err) {
      console.warn("Print failed, using native fallback:", err);
      printNative(receiptId);
    }
  }

  // ============================================
  // إعدادات الواجهة والمنتجات
  // ============================================
  const main = document.getElementById('main-content');
  const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();

  function getSellingPrice(product) {
    const sellPrice = Number(product.sell_price ?? 0);
    const sellEnabled = product.sell_price_enabled === true;
    const basePrice = Number(product.price ?? 0);
    if (sellEnabled && sellPrice > 0) return sellPrice;
    return basePrice;
  }

  const { data: products, error: productsError } = await db.from('products').select('*').order('name');
  if (productsError) {
    main.innerHTML = `<div class="alert alert-error">${productsError.message}</div>`;
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('mout_title')}</h2>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn-secondary" id="setup-printer-btn" title="ربط الطابعة">
          <i class="fas fa-print"></i>
        </button>
        <button type="button" class="btn-primary scan-btn" id="scan-btn">
          <i class="fas fa-barcode"></i><span>${tr('mout_scan')}</span>
        </button>
      </div>
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
          <div class="form-group"><label>${tr('mout_qty')}</label><input type="number" id="quantity" placeholder="1" min="0.01" step="0.01"></div>
          <div class="form-group"><label>${tr('mout_price')}</label><input type="number" id="price" value="0" min="0" step="0.01"></div>
          <div class="form-group"><label>${tr('mout_available')}</label><input type="text" id="available-qty" value="—" disabled></div>
        </div>
        <button type="button" class="btn-primary add-product-btn" id="add-product-btn">
          <i class="fas fa-plus"></i><span>${tr('mout_add_product')}</span>
        </button>
      </div>

      <div class="added-products-section">
        <label class="section-label">${tr('mout_added')}</label>
        <div id="added-products" class="added-products">
          <div class="empty-added"><i class="fas fa-box-open"></i><p>${tr('mout_empty')}</p></div>
        </div>
      </div>

      <div class="form-summary">
        <div class="summary-row"><span>${tr('mout_sum_count')}</span><strong id="sum-rows">0</strong></div>
        <div class="summary-row"><span>${tr('mout_sum_qty')}</span><strong id="sum-qty">0</strong></div>
        <div class="summary-row highlight"><span>${tr('mout_sum_total')}</span><strong id="sum-total">0.00</strong></div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-primary" id="save-btn">
          <i class="fas fa-save"></i><span>${tr('mout_save')}</span>
        </button>
        <a href="/movements/list.html" class="btn-secondary">${tr('mout_cancel')}</a>
      </div>
    </div>

    <div class="scanner-modal" id="scanner-modal" style="display:none;">
      <div class="scanner-box">
        <div class="scanner-header">
          <h3>${tr('mout_scan_title')}</h3>
          <button type="button" class="scanner-close" id="scanner-close"><i class="fas fa-xmark"></i></button>
        </div>
        <div id="scanner-reader" class="scanner-reader"></div>
        <p class="scanner-hint">${tr('mout_scan_hint')}</p>
      </div>
    </div>
  `;

  // ربط الطابعة (مرة واحدة)
  document.getElementById('setup-printer-btn').addEventListener('click', async () => {
    if (navigator.usb) {
      const ok = await printer.connectUSB();
      if (ok) return alert("تم ربط طابعة USB بنجاح ✅");
    }
    if (navigator.bluetooth) {
      const ok = await printer.connectBluetooth();
      if (ok) return alert("تم ربط طابعة Bluetooth بنجاح ✅");
    }
    alert("لم يتم ربط طابعة. سيتم استخدام نافذة الطباعة العادية عند الحفظ.");
  });

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
    
    if (!filtered.length) {
      suggestions.innerHTML = `<div class="suggestion-empty">${tr('mout_no_results')}</div>`;
      suggestions.style.display = 'block'; return;
    }
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

  function selectProduct(found) {
    selectedProduct = found;
    productInput.value = `${found.name} (${found.sku ?? '—'})`;
    hiddenId.value = found.id;
    quantityInput.value = 1;
    priceInput.value = getSellingPrice(found).toFixed(2);
    availableQtyInput.value = found.qty ?? 0;
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
    const value = String(barcode).trim(); if (!value) return;
    let found = (products ?? []).find(p => p.sku === value || p.qr_code === value);
    if (!found) {
      const { data, error } = await db.from('products').select('*').eq('organization_id', profile?.organization_id).eq('sku', value).limit(1).maybeSingle();
      if (error) { alert(tr('prod_add_err_find') + ' ' + error.message); return; }
      found = data;
    }
    if (!found) {
      const { data: alias } = await db.from('product_barcodes').select('product_id').eq('organization_id', profile?.organization_id).eq('barcode', value).limit(1).maybeSingle();
      if (alias?.product_id) {
        const { data: prod } = await db.from('products').select('*').eq('id', alias.product_id).single();
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
    const qty = Number(quantityInput.value), price = Number(priceInput.value) || 0, available = Number(selectedProduct.qty ?? 0);
    if (!qty || qty <= 0) { errBox.textContent = tr('prod_add_err_qty'); errBox.style.display = 'block'; quantityInput.focus(); isAdding = false; addBtn.disabled = false; return; }
    if (qty > available) { errBox.textContent = `${tr('mout_err_max')} ${available}`; errBox.style.display = 'block'; quantityInput.focus(); isAdding = false; addBtn.disabled = false; return; }

    const costPrice = Number(selectedProduct.price ?? 0);
    const existing = addedProducts.find(p => p.id === selectedProduct.id);
    if (existing) { existing.qty += qty; existing.price = price; existing.costPrice = costPrice; }
    else { addedProducts.push({ id: selectedProduct.id, name: selectedProduct.name, sku: selectedProduct.sku, image_url: selectedProduct.image_url, qty, price, costPrice, available }); }
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
        const { error: qtyErr } = await db.from('products').update({ qty: newQty }).eq('id', p.id);
        if (qtyErr) throw new Error(tr('mout_err_movements') + ' ' + qtyErr.message);
      }

      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({ orgId: prof.organization_id, title: addedProducts.length === 1 ? tr('mout_notif_title_1') : `${tr('mout_notif_title_n')} (${addedProducts.length})`, message: `${prof.full_name || tr('prod_detail_user')} ${tr('mout_notif_msg')} ${totalQty} ${tr('mout_notif_unit')} ${totalValue.toFixed(2)} — ${receiptNumber}`, type: 'warning', link: `/receipt.html?id=${newReceipt.id}`, userName: prof.full_name || null });
        } catch (e) { console.error(e); }
      }

      successBox.textContent = `تم الحفظ بنجاح ✅ — جاري الطباعة...`;
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

      // ✅ الطباعة
      await autoPrintReceipt(newReceipt.id);

      successBox.textContent = `تم الحفظ بنجاح ✅`;
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