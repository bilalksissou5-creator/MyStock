// ============================================
// صفحة إخراج منتجات (متعددة) + إيصال بيع
// ✅ يدعم اللمس + الفأرة + القلم (pointerdown)
// ✅ ماسح باركود (html5-qrcode)
// ✅ تعديل الكمية بعد المسح يُحدّث البطاقة
// ✅ يدعم الكميات العشرية (0.5، 1.75...)
// ✅ نسبة الربح من المنظمة تُطبَّق تلقائياً (0-50%)
// ✅ تُحفظ النسبة في receipts.profit_percentage
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__movementOutLoaded) return;
  window.__movementOutLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/out.html');

  const main = document.getElementById('main-content');

  // ═══════════════════════════════════════════
  // جلب بيانات المنظمة (نسبة الربح)
  // ═══════════════════════════════════════════
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  let profitEnabled = false;
  let profitPercentage = 0;

  if (profile?.organization_id) {
    const { data: org } = await db
      .from('organizations')
      .select('profit_enabled, profit_percentage')
      .eq('id', profile.organization_id)
      .single();

    profitEnabled = org?.profit_enabled === true;
    profitPercentage = Number(org?.profit_percentage) || 0;
  }

  // ✅ تطبيق نسبة الربح على السعر
  function applyProfit(basePrice) {
    const base = Number(basePrice) || 0;
    if (!profitEnabled || profitPercentage <= 0) return base;

    let finalPrice = base + (base * profitPercentage / 100);

    // الحد الأقصى 50%
    const maxPrice = base + (base * 50 / 100);
    if (finalPrice > maxPrice) finalPrice = maxPrice;

    return finalPrice;
  }

  // ═══════════════════════════════════════════
  // جلب المنتجات
  // ═══════════════════════════════════════════
  const { data: products, error: productsError } = await db
    .from('products')
    .select('*')
    .order('name');

  if (productsError) {
    main.innerHTML = `
      <div class="alert alert-error">
        <strong>خطأ في تحميل المنتجات:</strong>
        <br>
        <small>${productsError.message}</small>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <h2>إخراج منتجات</h2>
      <button type="button" class="btn-primary scan-btn" id="scan-btn">
        <i class="fas fa-barcode"></i>
        <span>مسح</span>
      </button>
    </div>

    ${profitEnabled && profitPercentage > 0 ? `
      <div class="alert alert-success" style="display:block; margin-bottom:12px;">
        📈 نسبة الربح: <strong>${profitPercentage}%</strong>
      </div>
    ` : ''}

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <div class="out-form">

      <div class="product-input-card">
        <div class="form-group">
          <label>ملاحظة عامة (اختياري)</label>
          <input type="text" id="note" placeholder="سبب الإخراج...">
        </div>
      </div>

      <div class="product-input-card">
        <div class="form-group" style="position:relative;margin-bottom:12px;">
          <label>المنتج *</label>
          <input type="text" id="product-input" placeholder="اكتب اسم المنتج..." autocomplete="off">
          <div id="product-suggestions" class="suggestions-box"></div>
          <input type="hidden" id="product_id">
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>الكمية *</label>
            <input type="number" id="quantity" value="1" min="0.01" step="0.01">
          </div>
          <div class="form-group">
            <label>السعر *</label>
            <input type="number" id="price" value="0" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>المتوفر</label>
            <input type="text" id="available-qty" value="—" disabled>
          </div>
        </div>

        <button type="button" class="btn-primary add-product-btn" id="add-product-btn">
          <i class="fas fa-plus"></i>
          <span>إضافة المنتج</span>
        </button>
      </div>

      <div class="added-products-section">
        <label class="section-label">المنتجات المُخرَجة</label>
        <div id="added-products" class="added-products">
          <div class="empty-added">
            <i class="fas fa-box-open"></i>
            <p>لم تتم إضافة منتجات بعد</p>
          </div>
        </div>
      </div>

      <div class="form-summary">
        <div class="summary-row">
          <span>عدد المنتجات</span>
          <strong id="sum-rows">0</strong>
        </div>
        <div class="summary-row">
          <span>إجمالي الكمية</span>
          <strong id="sum-qty">0</strong>
        </div>
        <div class="summary-row highlight">
          <span>القيمة الإجمالية</span>
          <strong id="sum-total">0.00</strong>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-primary" id="save-btn">
          <i class="fas fa-save"></i>
          <span>حفظ الإخراج</span>
        </button>
        <a href="/movements/list.html" class="btn-secondary">إلغاء</a>
      </div>

    </div>

    <!-- ✅ Modal الماسح -->
    <div class="scanner-modal" id="scanner-modal" style="display:none;">
      <div class="scanner-box">
        <div class="scanner-header">
          <h3>امسح الباركود</h3>
          <button type="button" class="scanner-close" id="scanner-close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div id="scanner-reader" class="scanner-reader"></div>
        <p class="scanner-hint">وجّه الكاميرا نحو الباركود</p>
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
  // اقتراحات المنتج
  // ============================================
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
      suggestions.innerHTML = '<div class="suggestion-empty">لا توجد نتائج</div>';
      suggestions.style.display = 'block';
      return;
    }

    suggestions.innerHTML = filtered.map(p => `
      <div class="suggestion-card" data-id="${p.id}">
        <div class="suggestion-image">
          ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : '<i class="fas fa-box-open"></i>'}
        </div>
        <div class="suggestion-info">
          <strong>${p.name ?? 'بدون اسم'}</strong>
          <span class="suggestion-sku">${p.sku ?? '—'}</span>
        </div>
        <div class="suggestion-stats">
          <span>الكمية: <b class="${(p.qty ?? 0) < 10 ? 'low' : ''}">${p.qty ?? 0}</b></span>
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

  // ✅ اختيار منتج + تطبيق الربح
  function selectProduct(found) {
    selectedProduct = found;
    productInput.value = `${found.name} (${found.sku ?? '—'})`;
    hiddenId.value = found.id;
    quantityInput.value = '1';

    const basePrice = Number(found.price ?? 0);
    const finalPrice = applyProfit(basePrice);
    priceInput.value = finalPrice.toFixed(2);

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
  // عند تغيير الكمية
  // ============================================
  quantityInput.addEventListener('input', () => {
    if (!selectedProduct) return;
    const idx = addedProducts.findIndex(p => p.id === selectedProduct.id);
    if (idx === -1) return;

    const newQty = Number(quantityInput.value);
    if (!newQty || newQty <= 0) return;

    addedProducts[idx].qty = newQty;
    renderAddedProducts();
  });

  // ============================================
  // الماسح
  // ============================================
  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      alert('مكتبة الماسح غير محمّلة');
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
        () => { /* تجاهل */ }
      );
    } catch (err) {
      alert('تعذّر فتح الكاميرا: ' + err.message);
      scannerModal.style.display = 'none';
    }
  }

  async function stopScanner() {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (e) { /* تجاهل */ }
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
        alert('خطأ في البحث: ' + error.message);
        return;
      }
      found = dbFound;
    }

    if (!found) {
      alert(`منتج غير موجود بهذا الباركود:\n${value}`);
      return;
    }

    const available = Number(found.qty ?? 0);

    if (available <= 0) {
      alert(`المنتج "${found.name}" غير متوفر في المخزون`);
      return;
    }

    const existing = addedProducts.find(p => p.id === found.id);

    if (existing) {
      selectProduct(found);
      quantityInput.value = existing.qty;
      return;
    }

    const basePrice = Number(found.price ?? 0);
    const finalPrice = applyProfit(basePrice);

    addedProducts.push({
      id: found.id,
      name: found.name,
      sku: found.sku,
      image_url: found.image_url,
      qty: 1,
      price: finalPrice,
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

  // ============================================
  // عرض المنتجات المضافة
  // ============================================
  function renderAddedProducts() {
    if (addedProducts.length === 0) {
      addedContainer.innerHTML = `
        <div class="empty-added">
          <i class="fas fa-box-open"></i>
          <p>لم تتم إضافة منتجات بعد</p>
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
            <span>الكمية</span>
            <b>${p.qty}</b>
          </div>
          <div class="stat-mini">
            <span>السعر</span>
            <b>${Number(p.price).toFixed(2)}</b>
          </div>
          <div class="stat-mini highlight">
            <span>المجموع</span>
            <b>${(Number(p.qty) * Number(p.price)).toFixed(2)}</b>
          </div>
        </div>
        <button type="button" class="added-product-delete" data-index="${index}" title="حذف">
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

  // ============================================
  // زر "إضافة المنتج"
  // ============================================
  function addProduct() {
    if (isAdding || addBtn.disabled) return;
    isAdding = true;
    addBtn.disabled = true;

    const errBox = document.getElementById('form-error');
    errBox.style.display = 'none';

    if (!selectedProduct) {
      errBox.textContent = 'اختر منتجاً من القائمة';
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
      errBox.textContent = 'الكمية يجب أن تكون أكبر من صفر';
      errBox.style.display = 'block';
      quantityInput.focus();
      isAdding = false;
      addBtn.disabled = false;
      return;
    }

    if (qty > available) {
      errBox.textContent = `الكمية المتوفرة ${available} فقط`;
      errBox.style.display = 'block';
      quantityInput.focus();
      isAdding = false;
      addBtn.disabled = false;
      return;
    }

    const existing = addedProducts.find(p => p.id === selectedProduct.id);

    if (existing) {
      existing.qty = qty;
      existing.price = price;
      renderAddedProducts();
      isAdding = false;
      addBtn.disabled = false;
      return;
    }

    addedProducts.push({
      id: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      image_url: selectedProduct.image_url,
      qty: qty,
      price: price,
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

  // ============================================
  // حفظ الإخراج
  // ============================================
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
      errBox.textContent = 'أضف منتجاً واحداً على الأقل';
      errBox.style.display = 'block';
      isSaving = false;
      saveBtn.disabled = false;
      return;
    }

    saveBtn.querySelector('span').textContent = 'جارٍ الحفظ...';

    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      const { data: prof } = await db
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', authUser.id)
        .single();

      if (!prof?.organization_id) {
        throw new Error('لا يمكن تحديد المنظمة');
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
          profit_percentage: profitEnabled ? profitPercentage : 0,
        })
        .select()
        .single();

      if (receiptErr) throw new Error('فشل إنشاء الإيصال: ' + receiptErr.message);

      const receiptItems = addedProducts.map(p => ({
        receipt_id: newReceipt.id,
        product_id: p.id,
        product_name: p.name,
        qty: Number(p.qty),
        price: Number(p.price),
        total: Number(p.qty) * Number(p.price),
      }));

      const { error: itemsErr } = await db
        .from('receipt_items')
        .insert(receiptItems);

      if (itemsErr) throw new Error('فشل حفظ عناصر الإيصال: ' + itemsErr.message);

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

      if (moveError) throw new Error('فشل تسجيل الحركات: ' + moveError.message);

      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({
            orgId: prof.organization_id,
            title: addedProducts.length === 1 ? 'إيصال بيع' : `إيصال بيع (${addedProducts.length} منتجات)`,
            message: `${prof.full_name || 'مستخدم'} أخرج ${totalQty} وحدة بقيمة ${totalValue.toFixed(2)} — ${receiptNumber}`,
            type: 'warning',
            link: `/receipt.html?id=${newReceipt.id}`,
            userName: prof.full_name || null,
          });
        } catch (notifErr) {
          console.error('❌ Notification error:', notifErr);
        }
      }

      successBox.textContent = `✅ تم إنشاء الإيصال ${receiptNumber}`;
      successBox.style.display = 'block';

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
      saveBtn.querySelector('span').textContent = 'حفظ الإخراج';
      isSaving = false;
    }
  });

  renderAddedProducts();
});