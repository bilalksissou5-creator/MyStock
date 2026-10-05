// ============================================
// صفحة إضافة منتجات
// ✅ يدعم اللمس + الفأرة + القلم (pointerdown)
// ✅ ماسح باركود (html5-qrcode)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__productAddLoaded) return;
  window.__productAddLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add.html');

  const main = document.getElementById('main-content');

  const { data: suppliers } = await db
    .from('suppliers')
    .select('*')
    .order('name');

  main.innerHTML = `
    <div class="page-header">
      <h2>إضافة منتجات</h2>
      <button type="button" class="btn-primary scan-btn" id="scan-btn">
        <i class="fas fa-barcode"></i>
        <span>مسح</span>
      </button>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <div class="add-form">

      <div class="product-input-card">
        <div class="form-group supplier-group">
          <label>المورد (لكل المنتجات)</label>
          <input type="text" id="supplier-input" placeholder="اكتب اسم المورد..." autocomplete="off">
          <div id="supplier-suggestions" class="suggestions-box"></div>
          <input type="hidden" id="supplier_id">
        </div>
      </div>

      <div class="product-input-card">
        <div class="form-grid">
          <div class="form-group">
            <label>اسم المنتج *</label>
            <input type="text" id="product-name" placeholder="اسم المنتج...">
          </div>
          <div class="form-group">
            <label>الكمية *</label>
            <input type="number" id="product-qty" value="1" min="1">
          </div>
          <div class="form-group">
            <label>السعر *</label>
            <input type="number" id="product-price" value="0" min="0" step="0.01">
          </div>
        </div>

        <div class="form-group">
          <label>الفئة (تلقائياً من إختصاص المورد)</label>
          <input type="text" id="product-category" placeholder="الفئة...">
        </div>

        <div class="form-group">
          <label>الباركود (SKU)</label>
          <input type="text" id="product-sku" placeholder="امسح الباركود أو اكتبه..." dir="ltr">
        </div>

        <button type="button" class="btn-primary add-product-btn" id="done-btn">
          <i class="fas fa-check"></i>
          <span>تم</span>
        </button>
      </div>

      <div class="added-products-section">
        <label class="section-label">المنتجات المضافة</label>
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
        <button type="button" class="btn-primary" id="save-all-btn">
          <i class="fas fa-save"></i>
          <span>حفظ المنتجات</span>
        </button>
        <a href="/products/list.html" class="btn-secondary">إلغاء</a>
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

  let selectedSupplier = null;
  let isAddingProduct = false;
  let isSaving = false;
  let html5QrCode = null;

  // ============================================
  // اقتراحات المورد
  // ============================================
  function showSuggestions(filter) {
    const q = filter.trim().toLowerCase();
    if (q.length < 1) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      return;
    }

    const filtered = (suppliers ?? []).filter(s =>
      (s.name ?? '').toLowerCase().includes(q)
    ).slice(0, 5);

    const exactMatch = (suppliers ?? []).some(
      s => (s.name ?? '').toLowerCase() === q
    );

    let html = filtered.map(s => `
      <div class="suggestion-card" data-id="${s.id}" data-name="${s.name}" data-specialty="${s.specialty ?? ''}">
        <div class="suggestion-image">
          <i class="fas fa-truck"></i>
        </div>
        <div class="suggestion-info">
          <strong>${s.name}</strong>
          ${s.specialty ? `<span class="suggestion-sku">${s.specialty}</span>` : ''}
        </div>
      </div>
    `).join('');

    if (!exactMatch && filter.trim()) {
      html += `
        <div class="suggestion-card new-supplier" data-new="true" data-name="${filter.trim()}">
          <div class="suggestion-image" style="background:#dcfce7; color:#16a34a;">
            <i class="fas fa-plus"></i>
          </div>
          <div class="suggestion-info">
            <strong>إضافة مورد جديد</strong>
            <span class="suggestion-sku">"${filter.trim()}"</span>
          </div>
        </div>
      `;
    }

    suggestions.innerHTML = html || '<div class="suggestion-empty">لا توجد نتائج</div>';
    suggestions.style.display = 'block';

    suggestions.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (card.dataset.new === 'true') {
          selectedSupplier = null;
          supplierInput.value = card.dataset.name;
          supplierIdInput.value = '';
          supplierInput.dataset.isNew = 'true';
          supplierInput.dataset.newName = card.dataset.name;
          categoryInput.value = '';
        } else {
          selectedSupplier = suppliers.find(s => s.id === card.dataset.id);
          supplierInput.value = card.dataset.name;
          supplierIdInput.value = card.dataset.id;
          supplierInput.dataset.isNew = 'false';
          supplierInput.dataset.newName = '';
          if (selectedSupplier?.specialty) {
            categoryInput.value = selectedSupplier.specialty;
          }
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
    if (!e.target.closest('.supplier-group')) {
      suggestions.style.display = 'none';
    }
  });

  // ============================================
  // ✅ الماسح (html5-qrcode)
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
          // ✅ تم المسح
          await handleScan(decodedText);
          await stopScanner();
        },
        () => { /* تجاهل الأخطاء الفرعية */ }
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

  // ✅ عند مسح باركود
  async function handleScan(barcode) {
    const value = String(barcode).trim();
    if (!value) return;

    // 🔍 ابحث في المنتجات بـ sku
    const { data: found, error } = await db
      .from('products')
      .select('*')
      .eq('organization_id', (await db.from('profiles').select('organization_id').eq('id', user.id).single()).data?.organization_id)
      .eq('sku', value)
      .limit(1)
      .maybeSingle();

    if (error) {
      alert('خطأ في البحث: ' + error.message);
      return;
    }

    if (found) {
      // ✅ وُجد → املأ الحقول
      nameInput.value = found.name ?? '';
      priceInput.value = Number(found.price ?? 0).toFixed(2);
      categoryInput.value = found.category ?? '';
      qtyInput.value = '1';
      skuInput.value = found.sku ?? value;

      nameInput.focus();
      nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // ❌ لم يوجد → ضع الباركود في sku
      skuInput.value = value;
      nameInput.focus();
      nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
          <span>${p.category ? p.category + ' • ' : ''}${p.sku}</span>
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
  // زر "تم"
  // ============================================
  function addToCart() {
    if (isAddingProduct || doneBtn.disabled) return;
    isAddingProduct = true;
    doneBtn.disabled = true;

    const errBox = document.getElementById('form-error');
    errBox.style.display = 'none';

    const name = nameInput.value.trim();
    const qty = Number(qtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;
    const category = categoryInput.value.trim();
    const sku = skuInput.value.trim() || ('SKU-' + Date.now() + '-' + Math.floor(Math.random() * 10000));

    if (!name) {
      errBox.textContent = 'اسم المنتج مطلوب';
      errBox.style.display = 'block';
      nameInput.focus();
      isAddingProduct = false;
      doneBtn.disabled = false;
      return;
    }

    if (qty <= 0) {
      errBox.textContent = 'الكمية يجب أن تكون أكبر من صفر';
      errBox.style.display = 'block';
      qtyInput.focus();
      isAddingProduct = false;
      doneBtn.disabled = false;
      return;
    }

    addedProducts.push({
      name,
      qty,
      price,
      category,
      sku,
      image_url: null,
    });

    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '0';
    skuInput.value = '';
    nameInput.focus();

    renderAddedProducts();

    setTimeout(() => {
      isAddingProduct = false;
      doneBtn.disabled = false;
    }, 400);
  }

  doneBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart();
  });

  // ============================================
  // زر "حفظ"
  // ============================================
  saveAllBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSaving || saveAllBtn.disabled) return;
    isSaving = true;
    saveAllBtn.disabled = true;

    const errBox = document.getElementById('form-error');
    const successBox = document.getElementById('form-success');

    errBox.style.display = 'none';
    successBox.style.display = 'none';

    if (addedProducts.length === 0) {
      errBox.textContent = 'أضف منتجاً واحداً على الأقل';
      errBox.style.display = 'block';
      isSaving = false;
      saveAllBtn.disabled = false;
      return;
    }

    saveAllBtn.querySelector('span').textContent = 'جارٍ الحفظ...';

    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', authUser.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('لا يمكن تحديد المنظمة');
      }

      let finalSupplierId = supplierIdInput.value || null;
      const isNewSupplier = supplierInput.dataset.isNew === 'true';
      const newSupplierName = isNewSupplier
        ? (supplierInput.dataset.newName || supplierInput.value.trim())
        : '';

      if (!finalSupplierId && newSupplierName) {
        const { data: existingSupplier } = await db
          .from('suppliers')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('name', newSupplierName)
          .limit(1)
          .maybeSingle();

        if (existingSupplier) {
          finalSupplierId = existingSupplier.id;
        } else {
          const { data: createdSupplier, error: supErr } = await db
            .from('suppliers')
            .insert({
              organization_id: profile.organization_id,
              name: newSupplierName,
              specialty: categoryInput.value.trim() || null,
              created_by: authUser.id,
            })
            .select()
            .single();

          if (supErr) throw new Error('فشل إنشاء المورد: ' + supErr.message);
          if (createdSupplier) finalSupplierId = createdSupplier.id;
        }
      }

      const invoiceNumber = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

      let insertedCount = 0;
      let updatedCount = 0;
      const processedKeys = new Set();

      for (const p of addedProducts) {
        const key = `${p.name}__${p.price}__${finalSupplierId ?? 'null'}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        let query = db
          .from('products')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('name', p.name)
          .eq('price', Number(p.price));

        if (finalSupplierId) {
          query = query.eq('supplier_id', finalSupplierId);
        } else {
          query = query.is('supplier_id', null);
        }

        const { data: matchedRows, error: findErr } = await query
          .order('created_at', { ascending: true })
          .limit(1);

        if (findErr) throw new Error('فشل البحث: ' + findErr.message);
        const matchedProduct = matchedRows?.[0] ?? null;

        let productId;

        if (matchedProduct) {
          productId = matchedProduct.id;

          const { error: linkErr } = await db
            .from('products')
            .update({ invoice_id: invoiceNumber })
            .eq('id', productId);

          if (linkErr) throw new Error('فشل ربط المنتج بالفاتورة: ' + linkErr.message);
          updatedCount++;
        } else {
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
              invoice_id: invoiceNumber,
              created_by: authUser.id,
            })
            .select()
            .single();

          if (insertError) throw new Error('فشل إدراج المنتج: ' + insertError.message);
          productId = newProduct.id;
          insertedCount++;
        }

        await db.from('stock_movements').insert({
          organization_id: profile.organization_id,
          product_id: productId,
          type: 'in',
          method: 'manual',
          quantity: Number(p.qty),
          performed_by: authUser.id,
        });
      }

      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

      const { error: invoiceErr } = await db
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          organization_id: profile.organization_id,
          supplier_id: finalSupplierId,
          created_by: authUser.id,
          total_qty: totalQty,
          total_value: totalValue,
        });

      if (invoiceErr) {
        throw new Error('فشل إنشاء الفاتورة: ' + invoiceErr.message);
      }

      if (typeof notifyOrganization === 'function') {
        try {
          await notifyOrganization({
            orgId: profile.organization_id,
            title: 'فاتورة جديدة',
            message: `${profile.full_name || 'مستخدم'} أنشأ فاتورة ${invoiceNumber} (${totalQty} قطعة - ${totalValue.toFixed(2)})`,
            type: 'success',
            link: `/invoice.html?id=${encodeURIComponent(invoiceNumber)}`,
            userName: profile.full_name || null,
          });
        } catch (notifErr) {
          console.error('❌ Notification error:', notifErr);
        }
      }

      addedProducts.length = 0;
      renderAddedProducts();

      supplierInput.dataset.newName = '';
      supplierInput.dataset.isNew = 'false';
      supplierIdInput.value = finalSupplierId || '';

      successBox.textContent = `✅ جديد: ${insertedCount} | محدّث: ${updatedCount} | فاتورة: ${invoiceNumber}`;
      successBox.style.display = 'block';

      setTimeout(() => {
        window.location.replace(`/invoice.html?id=${encodeURIComponent(invoiceNumber)}`);
      }, 1500);

    } catch (error) {
      errBox.textContent = error.message;
      errBox.style.display = 'block';
      saveAllBtn.disabled = false;
      saveAllBtn.querySelector('span').textContent = 'حفظ المنتجات';
      isSaving = false;
    }
  });

  renderAddedProducts();
});