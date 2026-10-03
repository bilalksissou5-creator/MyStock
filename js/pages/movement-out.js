// ============================================
// صفحة إخراج منتجات (متعددة) — بنمط product-add
// ⚠️ قاعدة ذهبية:
// - لا تُحدّث products.qty يدوياً أبداً
// - استخدم stock_movements.insert() فقط
// - الـ Trigger on_stock_movement_created سيتولى تحديث qty
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__movementOutLoaded) return;
  window.__movementOutLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/out.html');

  const main = document.getElementById('main-content');

  // جلب المنتجات
  const { data: products } = await db
    .from('products')
    .select('*')
    .order('name');

  main.innerHTML = `
    <div class="page-header">
      <h2>إخراج منتجات</h2>
      <a href="/movements/list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <div class="out-form">

      <!-- ══════ ملاحظة عامة ══════ -->
      <div class="product-input-card">
        <div class="form-group">
          <label>ملاحظة عامة (اختياري)</label>
          <input type="text" id="note" placeholder="سبب الإخراج...">
        </div>
      </div>

      <!-- ══════ إضافة منتج ══════ -->
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
            <input type="number" id="quantity" value="1" min="1">
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

      <!-- ══════ المنتجات المضافة ══════ -->
      <div class="added-products-section">
        <label class="section-label">المنتجات المُخرَجة</label>
        <div id="added-products" class="added-products">
          <div class="empty-added">
            <i class="fas fa-box-open"></i>
            <p>لم تتم إضافة منتجات بعد</p>
          </div>
        </div>
      </div>

      <!-- ══════ الإجماليات ══════ -->
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

      <!-- ══════ الأزرار ══════ -->
      <div class="form-actions">
        <button type="button" class="btn-primary" id="save-btn">
          <i class="fas fa-save"></i>
          <span>حفظ الإخراج</span>
        </button>
        <a href="/movements/list.html" class="btn-secondary">إلغاء</a>
      </div>

    </div>
  `;

  // ============================================
  // متغيرات
  // ============================================
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

  let selectedProduct = null;
  let isAdding = false;
  let isSaving = false;

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
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        selectedProduct = products.find(p => p.id === id);
        if (selectedProduct) {
          productInput.value = `${selectedProduct.name} (${selectedProduct.sku ?? '—'})`;
          hiddenId.value = selectedProduct.id;
          availableQtyInput.value = selectedProduct.qty ?? 0;
          priceInput.value = Number(selectedProduct.price ?? 0).toFixed(2);
          suggestions.style.display = 'none';
        }
      });
    });
  }

  productInput.addEventListener('input', () => {
    selectedProduct = null;
    hiddenId.value = '';
    availableQtyInput.value = '—';
    showSuggestions(productInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#product-input') && !e.target.closest('#product-suggestions')) {
      suggestions.style.display = 'none';
    }
  });

  // ============================================
  // عرض المنتجات المضافة (نفس تصميم product-add)
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

    if (qty <= 0) {
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

    // منع تكرار نفس المنتج
    if (addedProducts.find(p => p.id === selectedProduct.id)) {
      errBox.textContent = 'هذا المنتج مضاف مسبقاً';
      errBox.style.display = 'block';
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

    // تفريغ الحقول
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
  // ✅ حفظ الإخراج — stock_movements فقط
  // الـ Trigger on_stock_movement_created يُحدّث qty
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
      const { data: { user } } = await db.auth.getUser();
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('لا يمكن تحديد المنظمة');
      }

      // ✅ إدراج الحركات فقط — الـ Trigger يتولى qty
      const movements = addedProducts.map(p => ({
        organization_id: profile.organization_id,
        product_id: p.id,
        type: 'out',
        method: 'manual',
        quantity: Number(p.qty),
        performed_by: user.id,
      }));

      const { error: moveError } = await db
        .from('stock_movements')
        .insert(movements);

      if (moveError) throw new Error('فشل تسجيل الحركات: ' + moveError.message);

      // الإشعار
      if (typeof notifyOrganization === 'function') {
        try {
          const count = addedProducts.length;
          const totalQty = addedProducts.reduce((s, p) => s + Number(p.qty), 0);
          const totalValue = addedProducts.reduce((s, p) => s + Number(p.qty) * Number(p.price), 0);
          const namesList = addedProducts.map(p => p.name).join('، ');

          await notifyOrganization({
            orgId: profile.organization_id,
            title: count === 1 ? 'إخراج منتج' : `إخراج ${count} منتجات`,
            message: `${profile.full_name || 'مستخدم'} أخرج ${totalQty} وحدة (قيمة ${totalValue.toFixed(2)}) من: ${namesList}`,
            type: 'warning',
            link: '/movements/list.html',
            userName: profile.full_name || null,
          });
        } catch (notifErr) {
          console.error('❌ Notification error:', notifErr);
        }
      }

      // نجاح — إعادة تعيين
      addedProducts.length = 0;
      renderAddedProducts();
      document.getElementById('note').value = '';

      successBox.textContent = '✅ تم حفظ الإخراج بنجاح!';
      successBox.style.display = 'block';

      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = 'حفظ الإخراج';
      isSaving = false;

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