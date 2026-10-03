// ============================================
// صفحة إخراج منتجات (متعددة) — بنمط product-add
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
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
        <span>الحركات</span>
      </a>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <div class="out-form">

      <!-- ══════ ملاحظة عامة ══════ -->
      <div class="form-group">
        <label>ملاحظة عامة (اختياري)</label>
        <input type="text" id="note" placeholder="سبب الإخراج...">
      </div>

      <!-- ══════ إضافة منتج ══════ -->
      <div class="product-input-card">
        <div class="form-group" style="position:relative;">
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
        <div class="summary-row highlight">
          <span>إجمالي الكمية</span>
          <strong id="sum-qty">0</strong>
        </div>
      </div>

      <!-- ══════ الأزرار ══════ -->
      <div class="form-actions">
        <button type="button" class="btn-primary" id="save-btn">
          <i class="fas fa-check"></i>
          <span>حفظ الكل</span>
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
  const availableQtyInput = document.getElementById('available-qty');
  const addedContainer = document.getElementById('added-products');
  let selectedProduct = null;

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
          ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : '<i class="fas fa-box-open"></i>'}
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
            <span>المتوفر بعد</span>
            <b class="${(p.available - p.qty) < 10 ? 'low' : ''}">${p.available - p.qty}</b>
          </div>
        </div>
        <button type="button" class="added-product-delete" data-index="${index}" title="حذف">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    `).join('');

    addedContainer.querySelectorAll('.added-product-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index);
        addedProducts.splice(index, 1);
        renderAddedProducts();
      });
    });

    updateSummary();
  }

  function updateSummary() {
    let totalQty = 0;
    addedProducts.forEach(p => { totalQty += p.qty; });

    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = totalQty;
  }

  // ============================================
  // زر إضافة المنتج
  // ============================================
  document.getElementById('add-product-btn').addEventListener('click', () => {
    const errBox = document.getElementById('form-error');
    errBox.style.display = 'none';

    if (!selectedProduct) {
      errBox.textContent = 'اختر منتجاً من القائمة';
      errBox.style.display = 'block';
      productInput.focus();
      return;
    }

    const qty = Number(quantityInput.value);
    const available = Number(selectedProduct.qty ?? 0);

    if (qty <= 0) {
      errBox.textContent = 'الكمية يجب أن تكون أكبر من صفر';
      errBox.style.display = 'block';
      quantityInput.focus();
      return;
    }

    if (qty > available) {
      errBox.textContent = `الكمية المتوفرة ${available} فقط`;
      errBox.style.display = 'block';
      quantityInput.focus();
      return;
    }

    // تحقق: هل المنتج مضاف مسبقاً؟
    const existing = addedProducts.findIndex(p => p.id === selectedProduct.id);
    if (existing !== -1) {
      errBox.textContent = 'هذا المنتج مضاف مسبقاً';
      errBox.style.display = 'block';
      return;
    }

    addedProducts.push({
      id: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      image_url: selectedProduct.image_url,
      qty: qty,
      available: available,
    });

    // تفريغ الحقول
    productInput.value = '';
    hiddenId.value = '';
    availableQtyInput.value = '—';
    quantityInput.value = '1';
    selectedProduct = null;
    productInput.focus();

    renderAddedProducts();
  });

  // Enter يضيف المنتج
  [productInput, quantityInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('add-product-btn').click();
      }
    });
  });

  // ============================================
  // حفظ الكل
  // ============================================
  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    const errBox = document.getElementById('form-error');
    const successBox = document.getElementById('form-success');

    errBox.style.display = 'none';
    successBox.style.display = 'none';

    if (addedProducts.length === 0) {
      errBox.textContent = 'أضف منتجاً واحداً على الأقل';
      errBox.style.display = 'block';
      return;
    }

    const { data: { user } } = await db.auth.getUser();
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      errBox.textContent = 'لا يمكن تحديد المنظمة';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';

    const note = document.getElementById('note').value.trim() || null;

    try {
      // 1. إنشاء stock_movements لكل منتج
      const movements = addedProducts.map(p => ({
        organization_id: profile.organization_id,
        product_id: p.id,
        type: 'out',
        method: 'manual',
        quantity: p.qty,
        performed_by: user.id,
      }));

      const { error: moveError } = await db
        .from('stock_movements')
        .insert(movements);

      if (moveError) throw new Error('فشل تسجيل الحركات: ' + moveError.message);

      // 2. تحديث كميات المنتجات
      for (const p of addedProducts) {
        const newQty = p.available - p.qty;
        const { error: updateError } = await db
          .from('products')
          .update({ qty: newQty })
          .eq('id', p.id);

        if (updateError) throw new Error(`فشل تحديث "${p.name}": ${updateError.message}`);
      }

      // 3. إشعار
      if (typeof notifyOrganization === 'function') {
        const count = addedProducts.length;
        const title = count === 1 ? 'إخراج منتج' : `إخراج ${count} منتجات`;
        const totalQty = addedProducts.reduce((s, p) => s + p.qty, 0);
        const namesList = addedProducts.map(p => p.name).join('، ');
        const message = `${profile.full_name || 'مستخدم'} أخرج ${totalQty} وحدة من: ${namesList}`;

        await notifyOrganization({
          orgId: profile.organization_id,
          title,
          message,
          type: 'warning',
          link: '/movements/list.html',
          userName: profile.full_name || null,
        });
      }

      successBox.textContent = `✅ تم إخراج ${addedProducts.length} منتج بنجاح!`;
      successBox.style.display = 'block';

      // إعادة تعيين
      addedProducts.length = 0;
      renderAddedProducts();
      document.getElementById('note').value = '';

      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ الكل';

    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ الكل';
    }
  });

  renderAddedProducts();
});