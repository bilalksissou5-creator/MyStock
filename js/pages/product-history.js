// ============================================
// صفحة سجل المنتج (Product History)
// ✅ عرض سجل الإضافات وحذف الكميات الخاطئة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('product-history.html');
  if (window.applyLanguage) window.applyLanguage();
  const tr = (key, fallback) => (window.t ? (window.t(key) || fallback) : (fallback || key));

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const main = document.getElementById('main-content');

  if (!productId) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_no_id', 'Product ID missing')}</div>`;
    return;
  }

  // 1. جلب بيانات المنتج الأساسية
  const { data: product, error: productError } = await db
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_not_found', 'Product not found')}</div>`;
    return;
  }

  document.title = `${tr('prod_history_title', 'Product History')} - ${product.name}`;

  // 2. بناء هيكل الصفحة
  main.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <h2 style="margin: 0; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-history" style="color: #2563eb;"></i> 
        ${tr('prod_history_title', 'Product History')}
      </h2>
      <a href="/products/detail.html?id=${productId}" class="btn-secondary" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 13px; font-weight: 700; border-radius: 8px; text-decoration: none;">
        <i class="fas fa-arrow-left"></i>
        <span>${tr('prod_detail_back', 'Back to Product')}</span>
      </a>
    </div>
    
    <div class="history-wrapper">
      <div class="history-list" id="history-list">
        <div class="history-empty">
          <i class="fas fa-spinner fa-spin"></i>
          <p>${tr('loading', 'Loading...')}</p>
        </div>
      </div>
    </div>
  `;

  const listContainer = document.getElementById('history-list');

  // 3. دالة جلب وعرض السجل
  async function loadHistory() {
    listContainer.innerHTML = `<div class="history-empty"><i class="fas fa-spinner fa-spin"></i><p>${tr('loading', 'Loading...')}</p></div>`;

    try {
      // جلب الحركات من جدول stock_movements (فقط حركات الإدخال in)
      const { data: movements, error } = await db
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .eq('type', 'in')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!movements || movements.length === 0) {
        listContainer.innerHTML = `
          <div class="history-empty">
            <i class="fas fa-box-open"></i>
            <p>${tr('prod_history_empty', 'No addition history found for this product.')}</p>
          </div>
        `;
        return;
      }

      // عرض البطاقات
      listContainer.innerHTML = movements.map(mov => {
        const date = new Date(mov.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const imageHtml = product.image_url 
          ? `<img src="${product.image_url}" alt="${product.name}">` 
          : `<i class="fas fa-box"></i>`;

        return `
          <div class="history-card">
            <div class="history-image">${imageHtml}</div>
            
            <div class="history-info">
              <div class="history-name">${product.name || '—'}</div>
              <div class="history-meta">
                <span><i class="fas fa-barcode"></i> ${product.sku || '—'}</span>
                <span><i class="fas fa-calendar"></i> ${dateStr} • ${timeStr}</span>
              </div>
            </div>

            <!-- الكمية التي أضيفت -->
            <div class="history-qty">+${mov.quantity}</div>

            <!-- زر الحذف -->
            <button class="history-delete-btn" onclick="deleteMovement('${mov.id}', ${mov.quantity})" title="${tr('delete', 'Delete')}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error(err);
      listContainer.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }

  // 4. دالة حذف الكمية (تصحيح الخطأ)
  window.deleteMovement = async (movementId, qtyToRemove) => {
    const confirmMsg = tr('prod_history_confirm_del', 'Are you sure you want to delete this quantity? It will be deducted from the total stock.');
    if (!confirm(confirmMsg)) return;

    try {
      // حساب الكمية الجديدة (مع التأكد من عدم النزول تحت الصفر)
      const currentQty = Number(product.qty || 0);
      const newQty = Math.max(0, currentQty - Number(qtyToRemove));
      
      // أ. تحديث كمية المنتج في جدول products
      const { error: updateError } = await db
        .from('products')
        .update({ qty: newQty })
        .eq('id', productId);
        
      if (updateError) throw updateError;

      // ب. حذف سجل الحركة من جدول stock_movements
      const { error: deleteError } = await db
        .from('stock_movements')
        .delete()
        .eq('id', movementId);
        
      if (deleteError) throw deleteError;

      // ج. تحديث الكمية في الذاكرة (حتى لا يحدث خطأ إذا تم الحذف أكثر من مرة بدون تحديث)
      product.qty = newQty; 

      // د. إعادة تحميل القائمة لتعكس الحذف
      loadHistory();

    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  // تشغيل جلب البيانات عند فتح الصفحة
  loadHistory();
});