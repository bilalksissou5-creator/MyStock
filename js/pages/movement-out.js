document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/out.html');

  const main = document.getElementById('main-content');

  const { data: products } = await db
    .from('products')
    .select('*')
    .order('name');

  main.innerHTML = `
    <div class="page-header">
      <h2>إخراج منتج</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>الحركات</span>
      </a>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <form id="out-form" class="out-form">
      <div class="form-group" style="position:relative;">
        <label>المنتج *</label>
        <input type="text" id="product-input" placeholder="اكتب اسم المنتج..." autocomplete="off" required>
        <div id="product-suggestions" class="suggestions-box"></div>
        <input type="hidden" id="product_id">
      </div>

      <div class="form-group">
        <label>الكمية المُخرجة *</label>
        <input type="number" id="quantity" min="1" value="1" required>
      </div>

      <div class="form-group">
        <label>ملاحظة</label>
        <input type="text" id="note" placeholder="سبب الإخراج (اختياري)">
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" id="save-btn">
          <i class="fas fa-check"></i>
          <span>تأكيد الإخراج</span>
        </button>
      </div>
    </form>
  `;

  const input = document.getElementById('product-input');
  const hiddenId = document.getElementById('product_id');
  const suggestions = document.getElementById('product-suggestions');
  let selectedProduct = null;

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
          <span>السعر: <b>${p.price ?? 0}</b></span>
        </div>
      </div>
    `).join('');

    suggestions.style.display = 'block';

    suggestions.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        selectedProduct = products.find(p => p.id === id);
        if (selectedProduct) {
          input.value = `${selectedProduct.name} (${selectedProduct.sku ?? '—'})`;
          hiddenId.value = selectedProduct.id;
          suggestions.style.display = 'none';
        }
      });
    });
  }

  input.addEventListener('input', () => {
    selectedProduct = null;
    hiddenId.value = '';
    showSuggestions(input.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#product-input') && !e.target.closest('#product-suggestions')) {
      suggestions.style.display = 'none';
    }
  });

  document.getElementById('out-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('form-error');
    const successBox = document.getElementById('form-success');
    const btn = document.getElementById('save-btn');
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    if (!selectedProduct) {
      errBox.textContent = 'اختر منتجاً من القائمة';
      errBox.style.display = 'block';
      return;
    }

    const quantity = Number(document.getElementById('quantity').value);
    const availableQty = Number(selectedProduct.qty ?? 0);

    if (quantity <= 0) {
      errBox.textContent = 'الكمية يجب أن تكون أكبر من صفر';
      errBox.style.display = 'block';
      return;
    }
    if (quantity > availableQty) {
      errBox.textContent = `الكمية المتوفرة ${availableQty} فقط`;
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ التنفيذ...';

    const { data: { user } } = await db.auth.getUser();
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      errBox.textContent = 'لا يمكن تحديد المنظمة';
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تأكيد الإخراج';
      return;
    }

    const { error: moveError } = await db.from('stock_movements').insert({
      organization_id: profile.organization_id,
      product_id: selectedProduct.id,
      type: 'out',
      method: 'manual',
      quantity: quantity,
      performed_by: user.id,
    });

    if (moveError) {
      errBox.textContent = 'خطأ: ' + moveError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تأكيد الإخراج';
      return;
    }

    const newQty = availableQty - quantity;
    const { error: updateError } = await db
      .from('products')
      .update({ qty: newQty })
      .eq('id', selectedProduct.id);

    if (updateError) {
      errBox.textContent = 'خطأ في تحديث الكمية: ' + updateError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تأكيد الإخراج';
      return;
    }

    // إشعار لكل عمال المنظمة
    if (typeof notifyOrganization === 'function') {
      await notifyOrganization({
        orgId: profile.organization_id,
        title: 'إخراج منتج',
        message: `${profile.full_name || 'مستخدم'} أخرج ${quantity} من "${selectedProduct.name}"`,
        type: 'warning',
        link: '/movements/list.html',
        userName: profile.full_name || null,
      });
    }

    successBox.textContent = `✅ تم إخراج ${quantity} من "${selectedProduct.name}"`;
    successBox.style.display = 'block';

    setTimeout(() => {
      window.location.href = 'list.html';
    }, 1500);
  });
});