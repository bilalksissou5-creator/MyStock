// ============================================
// صفحة سجل المنتج (Product History)
// ✅ حذف الحركة والكمية والفاتورة (نقل للمحذوفات)
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

  const { data: product, error: productError } = await db.from('products').select('*').eq('id', productId).single();
  if (productError || !product) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_not_found', 'Product not found')}</div>`;
    return;
  }

  document.title = `${tr('prod_history_title', 'Product History')} - ${product.name}`;

  main.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <h2 style="margin: 0; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-history" style="color: #2563eb;"></i> 
        ${tr('prod_history_title', 'Product History')}
      </h2>
      <a href="/products/detail.html?id=${productId}" class="btn-secondary" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 13px; font-weight: 700; border-radius: 8px; text-decoration: none;">
        <i class="fas fa-arrow-left"></i> <span>${tr('prod_detail_back', 'Back')}</span>
      </a>
    </div>
    
    <div class="history-wrapper">
      <div class="history-list" id="history-list">
        <div class="history-empty"><i class="fas fa-spinner fa-spin"></i><p>${tr('loading', 'Loading...')}</p></div>
      </div>
    </div>
  `;

  const listContainer = document.getElementById('history-list');

  async function loadHistory() {
    listContainer.innerHTML = `<div class="history-empty"><i class="fas fa-spinner fa-spin"></i><p>${tr('loading', 'Loading...')}</p></div>`;

    try {
      // جلب الحركات غير المحذوفة فقط
      const { data: movements, error } = await db.from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .eq('type', 'in')
        .is('deleted_at', null) // ✅ فقط السجلات النشطة (غير المحذوفة)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!movements || movements.length === 0) {
        listContainer.innerHTML = `<div class="history-empty"><i class="fas fa-box-open"></i><p>${tr('prod_history_empty', 'No addition history found.')}</p></div>`;
        return;
      }

      listContainer.innerHTML = movements.map(mov => {
        const date = new Date(mov.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const imageHtml = product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : `<i class="fas fa-box"></i>`;

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
            <div class="history-qty">+${mov.quantity}</div>
            <button class="history-delete-btn" onclick="deleteMovement('${mov.id}', ${mov.quantity}, '${mov.invoice_id || ''}')" title="${tr('delete', 'Delete')}">
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

  // دالة الحذف والتراجع الشامل
  window.deleteMovement = async (movementId, qtyToRemove, invoiceId) => {
    if (!confirm(tr('prod_history_confirm_del', 'Are you sure you want to delete this quantity? It will be deducted from stock and invoice.'))) return;

    try {
      // 1. نقل الحركة إلى سلة المحذوفات (Soft Delete)
      const { error: moveErr } = await db.from('stock_movements').update({ deleted_at: new Date().toISOString() }).eq('id', movementId);
      if (moveErr) throw moveErr;

      // 2. خصم الكمية من بطاقة المنتج
      const currentQty = Number(product.qty || 0);
      const newQty = Math.max(0, currentQty - Number(qtyToRemove));
      await db.from('products').update({ qty: newQty }).eq('id', productId);

      // 3. تعديل الفاتورة
      if (invoiceId) {
        const { data: invoice } = await db.from('invoices').select('*').eq('invoice_number', invoiceId).single();
        
        if (invoice) {
          const newInvQty = Math.max(0, Number(invoice.total_qty || 0) - Number(qtyToRemove));
          const newInvValue = Math.max(0, Number(invoice.total_value || 0) - (Number(qtyToRemove) * Number(product.price || 0)));

          if (newInvQty <= 0) {
            // إذا أصبحت الفاتورة فارغة، ننقلها لسلة المحذوفات
            await db.from('invoices').update({ deleted_at: new Date().toISOString(), total_qty: 0, total_value: 0 }).eq('id', invoice.id);
            await db.from('invoice_items').update({ deleted_at: new Date().toISOString(), qty: 0, total: 0 }).eq('invoice_id', invoice.id);
          } else {
            // إذا تبقى شيء في الفاتورة، نحدث الإجماليات
            await db.from('invoices').update({ total_qty: newInvQty, total_value: newInvValue }).eq('id', invoice.id);
            
            // تحديث عنصر الفاتورة المرتبط بالمنتج
            const { data: item } = await db.from('invoice_items').select('*').eq('invoice_id', invoice.id).eq('product_id', productId).single();
            if (item) {
              const itemNewQty = Math.max(0, Number(item.qty) - Number(qtyToRemove));
              if (itemNewQty <= 0) {
                await db.from('invoice_items').update({ deleted_at: new Date().toISOString(), qty: 0, total: 0 }).eq('id', item.id);
              } else {
                await db.from('invoice_items').update({ qty: itemNewQty, total: itemNewQty * Number(item.price) }).eq('id', item.id);
              }
            }
          }
        }
      }

      product.qty = newQty; 
      loadHistory();

    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  loadHistory();
});