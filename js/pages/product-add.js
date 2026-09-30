// ============================================
// صفحة إضافة منتجات
// - "تم"    ← نقل الحقول إلى بطاقة المنتجات المضافة فقط
// - "حفظ"   ← إدراج المنتجات + إنشاء فاتورة واحدة تلقائية
// ============================================
// ⚠️ قاعدة ذهبية:
// - لا تُحدّث products.qty يدوياً أبداً
// - استخدم stock_movements.insert() فقط
// - الـ Trigger on_stock_movement_created سيتولى تحديث qty
// - كل عملية حفظ = فاتورة واحدة موحّدة + إشعار لكل عضو
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // ✅ حماية من التهيئة المزدوجة
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
      <a href="/products/list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
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
  const doneBtn = document.getElementById('done-btn');
  const saveAllBtn = document.getElementById('save-all-btn');

  let selectedSupplier = null;
  let isAddingProduct = false;
  let isSaving = false;

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
      card.addEventListener('click', () => {
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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.supplier-group')) {
      suggestions.style.display = 'none';
    }
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
          <i class="fas fa-box-open"></i>
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
      btn.addEventListener('click', () => {
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
  // زر "تم" — نقل فقط إلى بطاقة المنتجات المضافة
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
      sku: 'SKU-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    });

    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '0';
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
  // ✅ لا نُحدّث qty يدوياً — الـ Trigger يفعل ذلك
  // ✅ الفاتورة واحدة لكل عملية حفظ
  // ✅ كل منتج يُربط بـ invoice_id
  // ✅ إشعارات لكل عضو في المنظمة
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
      // 1. جلب المستخدم
      const { data: { user } } = await db.auth.getUser();
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('لا يمكن تحديد المنظمة');
      }

      // 2. معالجة المورد
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
              created_by: user.id,
            })
            .select()
            .single();

          if (supErr) throw new Error('فشل إنشاء المورد: ' + supErr.message);
          if (createdSupplier) finalSupplierId = createdSupplier.id;
        }
      }

      // 3. توليد رقم الفاتورة (نحتاجه لكل منتج)
      const invoiceNumber = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

      // 4. لكل منتج: أنشئ + اربط بالفاتورة + سجّل الحركة
      let insertedCount = 0;
      let updatedCount = 0;

      const processedKeys = new Set();

      for (const p of addedProducts) {
        const key = `${p.name}__${p.price}__${finalSupplierId ?? 'null'}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        // ابحث عن منتج مطابق
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
          // ✅ موجود → اربطه بالفاتورة الجديدة (لا تلمس qty)
          productId = matchedProduct.id;

          const { error: linkErr } = await db
            .from('products')
            .update({ invoice_id: invoiceNumber })
            .eq('id', productId);

          if (linkErr) throw new Error('فشل ربط المنتج بالفاتورة: ' + linkErr.message);
          updatedCount++;
        } else {
          // ✅ جديد → أدرجه مع qty = 0 و invoice_id
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
              created_by: user.id,
            })
            .select()
            .single();

          if (insertError) throw new Error('فشل إدراج المنتج: ' + insertError.message);
          productId = newProduct.id;
          insertedCount++;
        }

        // ✅ سجّل الحركة — الـ Trigger سيضيف qty تلقائياً
        await db.from('stock_movements').insert({
          organization_id: profile.organization_id,
          product_id: productId,
          type: 'in',
          method: 'manual',
          quantity: Number(p.qty),
          performed_by: user.id,
        });
      }

      // 5. إنشاء الفاتورة (رأس)
      const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
      const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);

      const { error: invoiceErr } = await db
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          organization_id: profile.organization_id,
          supplier_id: finalSupplierId,
          created_by: user.id,
          total_qty: totalQty,
          total_value: totalValue,
        });

      if (invoiceErr) {
        throw new Error('فشل إنشاء الفاتورة: ' + invoiceErr.message);
      }

      // ════════════════════════════════════════
      // ✅ 6. الإشعارات — تُرسل لكل عضو في المنظمة
      // ════════════════════════════════════════
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
          // لا نوقف العملية بسبب الإشعار
        }
      }

      // 7. تنظيف شامل بعد النجاح
      addedProducts.length = 0;
      renderAddedProducts();

      supplierInput.dataset.newName = '';
      supplierInput.dataset.isNew = 'false';
      supplierIdInput.value = finalSupplierId || '';

      successBox.textContent = `✅ جديد: ${insertedCount} | محدّث: ${updatedCount} | فاتورة: ${invoiceNumber}`;
      successBox.style.display = 'block';

      // ✅ الانتقال لصفحة الفاتورة
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