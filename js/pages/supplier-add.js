document.addEventListener('DOMContentLoaded', async () => {
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
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <div class="add-form">

      <div class="form-group" style="position:relative;">
        <label>المورد (لكل المنتجات)</label>
        <input type="text" id="supplier-input" placeholder="اكتب اسم المورد..." autocomplete="off">
        <div id="supplier-suggestions" class="suggestions-box"></div>
        <input type="hidden" id="supplier_id">
      </div>

      <div class="product-input-card">
        <div class="form-grid">
          <div class="form-group">
            <label>اسم المنتج *</label>
            <input type="text" id="product-name" placeholder="اسم المنتج...">
          </div>
          <div class="form-group">
            <label>الكمية *</label>
            <input type="number" id="product-qty" value="1" min="0">
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

        <button type="button" class="btn-primary add-product-btn" id="add-product-btn">
          <i class="fas fa-plus"></i>
          <span>إضافة المنتج</span>
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
        <button type="button" class="btn-primary" id="save-btn">
          <i class="fas fa-check"></i>
          <span>حفظ الكل</span>
        </button>
        <a href="list.html" class="btn-secondary">إلغاء</a>
      </div>

    </div>
  `;

  // ============================================
  // متغيرات
  // ============================================
  const addedProducts = [];
  const supplierInput = document.getElementById('supplier-input');
  const supplierIdInput = document.getElementById('supplier_id');
  const suggestions = document.getElementById('supplier-suggestions');
  const addedContainer = document.getElementById('added-products');
  const nameInput = document.getElementById('product-name');
  const qtyInput = document.getElementById('product-qty');
  const priceInput = document.getElementById('product-price');
  const categoryInput = document.getElementById('product-category');
  let selectedSupplier = null;

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

    if (html === '') {
      suggestions.innerHTML = '<div class="suggestion-empty">لا توجد نتائج</div>';
    } else {
      suggestions.innerHTML = html;
    }
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

          // الفئة تلقائياً من إختصاص المورد
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
    showSuggestions(supplierInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#supplier-input') && !e.target.closest('#supplier-suggestions')) {
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
            <b>${p.price.toFixed(2)}</b>
          </div>
          <div class="stat-mini highlight">
            <span>المجموع</span>
            <b>${(p.qty * p.price).toFixed(2)}</b>
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
    let totalValue = 0;

    addedProducts.forEach(p => {
      totalQty += p.qty;
      totalValue += p.qty * p.price;
    });

    document.getElementById('sum-rows').textContent = addedProducts.length;
    document.getElementById('sum-qty').textContent = totalQty;
    document.getElementById('sum-total').textContent = totalValue.toFixed(2);
  }

  // ============================================
  // زر إضافة المنتج
  // ============================================
  document.getElementById('add-product-btn').addEventListener('click', () => {
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
      return;
    }

    if (qty <= 0) {
      errBox.textContent = 'الكمية يجب أن تكون أكبر من صفر';
      errBox.style.display = 'block';
      qtyInput.focus();
      return;
    }

    addedProducts.push({
      name,
      qty,
      price,
      category,
      sku: 'SKU-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    });

    // تفريغ الحقول (الفئة تبقى ← لأنها من المورد)
    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '0';
    nameInput.focus();

    renderAddedProducts();
  });

  [nameInput, qtyInput, priceInput, categoryInput].forEach(input => {
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

    // معالجة المورد
    let finalSupplierId = supplierIdInput.value || null;
    const isNewSupplier = supplierInput.dataset.isNew === 'true';
    const newSupplierName = supplierInput.dataset.newName || supplierInput.value.trim();

    if (!finalSupplierId && newSupplierName) {
      const { data: createdSupplier, error: supplierError } = await db
        .from('suppliers')
        .insert({
          organization_id: profile.organization_id,
          name: newSupplierName,
          specialty: categoryInput.value.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (!supplierError && createdSupplier) {
        finalSupplierId = createdSupplier.id;
      }
    }

    const products = addedProducts.map(p => ({
      organization_id: profile.organization_id,
      name: p.name,
      supplier_id: finalSupplierId,
      sku: p.sku,
      qty: p.qty,
      price: p.price,
      category: p.category || null,
      created_by: user.id,
    }));

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';

    const { data: newProducts, error: insertError } = await db
      .from('products')
      .insert(products)
      .select();

    if (insertError) {
      errBox.textContent = 'خطأ: ' + insertError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ الكل';
      return;
    }

    const movements = newProducts
      .filter(p => (p.qty ?? 0) > 0)
      .map(p => ({
        organization_id: profile.organization_id,
        product_id: p.id,
        type: 'in',
        method: 'manual',
        quantity: p.qty,
        performed_by: user.id,
      }));

    if (movements.length > 0) {
      await db.from('stock_movements').insert(movements);
    }

    if (typeof notifyOrganization === 'function') {
      const count = products.length;
      const title = count === 1 ? 'إضافة منتج' : `إضافة ${count} منتجات`;
      const supplierInfo = newSupplierName ? ` من "${newSupplierName}"` : '';
      const message = `${profile.full_name || 'مستخدم'} أضاف ${count} منتج${supplierInfo}`;

      await notifyOrganization({
        orgId: profile.organization_id,
        title,
        message,
        type: 'success',
        link: '/products/list.html',
        userName: profile.full_name || null,
      });
    }

    successBox.textContent = `✅ تم إضافة ${products.length} منتج بنجاح!`;
    successBox.style.display = 'block';

    setTimeout(() => {
      window.location.href = 'list.html';
    }, 1200);
  });

  renderAddedProducts();
});