
// ============================================
// صفحة سجل المنتج (Product History)
// ✅ حذف صف الفاتورة فعلياً
// ✅ حفظ نسخة صف الفاتورة لاستعادته
// ✅ نقل الحركة إلى سلة المحذوفات
// ✅ خصم الكمية من بطاقة المنتج
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('product-history.html');

  if (window.applyLanguage) window.applyLanguage();

  const tr = (key, fallback) =>
    (window.t ? (window.t(key) || fallback) : (fallback || key));

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const main = document.getElementById('main-content');

  if (!productId) {
    main.innerHTML = `
      <div class="alert alert-error">
        ${tr('prod_detail_no_id', 'Product ID missing')}
      </div>
    `;
    return;
  }

  // جلب بيانات المنتج
  const { data: product, error: productError } = await db
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    main.innerHTML = `
      <div class="alert alert-error">
        ${tr('prod_detail_not_found', 'Product not found')}
      </div>
    `;
    return;
  }

  document.title =
    `${tr('prod_history_title', 'Product History')} - ${product.name}`;

  main.innerHTML = `
    <div class="page-header" style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      flex-wrap:wrap;
      gap:10px;
    ">
      <h2 style="
        margin:0;
        display:flex;
        align-items:center;
        gap:8px;
      ">
        <i class="fas fa-history" style="color:#2563eb;"></i>
        ${tr('prod_history_title', 'Product History')}
      </h2>

      <a href="/products/detail.html?id=${productId}"
         class="btn-secondary"
         style="
           display:flex;
           align-items:center;
           gap:8px;
           padding:8px 16px;
           font-size:13px;
           font-weight:700;
           border-radius:8px;
           text-decoration:none;
         ">
        <i class="fas fa-arrow-left"></i>
        <span>${tr('prod_detail_back', 'Back')}</span>
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

  // ============================================
  // تحميل سجل المنتج
  // ============================================

  async function loadHistory() {
    listContainer.innerHTML = `
      <div class="history-empty">
        <i class="fas fa-spinner fa-spin"></i>
        <p>${tr('loading', 'Loading...')}</p>
      </div>
    `;

    try {
      const { data: movements, error } = await db
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .eq('type', 'in')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!movements || movements.length === 0) {
        listContainer.innerHTML = `
          <div class="history-empty">
            <i class="fas fa-box-open"></i>
            <p>
              ${tr('prod_history_empty', 'No addition history found.')}
            </p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = movements.map(mov => {
        const date = new Date(mov.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });

        const imageHtml = product.image_url
          ? `<img src="${product.image_url}" alt="${product.name}">`
          : `<i class="fas fa-box"></i>`;

        return `
          <div class="history-card">
            <div class="history-image">
              ${imageHtml}
            </div>

            <div class="history-info">
              <div class="history-name">
                ${product.name || '—'}
              </div>

              <div class="history-meta">
                <span>
                  <i class="fas fa-barcode"></i>
                  ${product.sku || '—'}
                </span>

                <span>
                  <i class="fas fa-calendar"></i>
                  ${dateStr} • ${timeStr}
                </span>
              </div>
            </div>

            <div class="history-qty">
              +${mov.quantity}
            </div>

            <button
              class="history-delete-btn"
              onclick="deleteMovement('${mov.id}')"
              title="${tr('delete', 'Delete')}"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('Load history error:', err);

      listContainer.innerHTML = `
        <div class="alert alert-error">
          ${err.message}
        </div>
      `;
    }
  }

  // ============================================
  // حذف الحركة وحذف صف الفاتورة فعلياً
  // ============================================

  window.deleteMovement = async (movementId) => {

    if (!confirm(
      tr(
        'prod_history_confirm_del',
        'Are you sure you want to delete this quantity?'
      )
    )) return;

    try {

      // 1. جلب الحركة
      const { data: movement, error: movementError } = await db
        .from('stock_movements')
        .select('*')
        .eq('id', movementId)
        .eq('product_id', productId)
        .single();

      if (movementError) throw movementError;

      if (!movement) {
        throw new Error('لم يتم العثور على سجل الحركة.');
      }

      if (movement.deleted_at) {
        throw new Error('هذا السجل موجود بالفعل في سلة المحذوفات.');
      }

      const qty = Number(movement.quantity);

      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('كمية الحركة غير صحيحة.');
      }

      // 2. جلب بيانات المنتج
      const { data: prod, error: prodError } = await db
        .from('products')
        .select('qty, price')
        .eq('id', productId)
        .single();

      if (prodError) throw prodError;

      if (!prod) {
        throw new Error('لم يتم العثور على المنتج.');
      }

      // 3. البحث عن الفاتورة وصف المنتج
      let invoice = null;
      let invoiceItem = null;

      if (movement.invoice_id) {

        const { data, error } = await db
          .from('invoices')
          .select('*')
          .eq('invoice_number', movement.invoice_id)
          .maybeSingle();

        if (error) throw error;

        invoice = data;

        if (invoice) {

          const { data: item, error: itemError } = await db
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id)
            .eq('product_id', productId)
            .limit(1)
            .maybeSingle();

          if (itemError) throw itemError;

          invoiceItem = item;
        }
      }

      const deletedTime = new Date().toISOString();

      // 4. حفظ نسخة صف الفاتورة قبل حذفه
      if (invoiceItem) {

        const { error: snapshotError } = await db
          .from('stock_movements')
          .update({
            invoice_item_snapshot: invoiceItem
          })
          .eq('id', movementId)
          .eq('organization_id', movement.organization_id)
          .is('deleted_at', null);

        if (snapshotError) throw snapshotError;

      }

      // 5. حذف صف المنتج فعلياً من الفاتورة
      if (invoiceItem) {

        const { data: deletedItem, error: deleteItemError } = await db
          .from('invoice_items')
          .delete()
          .eq('id', invoiceItem.id)
          .select('id');

        if (deleteItemError) throw deleteItemError;

        if (!deletedItem || deletedItem.length === 0) {
          throw new Error('تعذر حذف صف المنتج من الفاتورة.');
        }

        // تحديث إجماليات الفاتورة
        const newInvQty = Math.max(
          0,
          Number(invoice.total_qty || 0) -
          Number(invoiceItem.qty || 0)
        );

        const newInvValue = Math.max(
          0,
          Number(invoice.total_value || 0) -
          Number(invoiceItem.total || 0)
        );

        const { error: invoiceUpdateError } = await db
          .from('invoices')
          .update({
            total_qty: newInvQty,
            total_value: newInvValue
          })
          .eq('id', invoice.id);

        if (invoiceUpdateError) throw invoiceUpdateError;
      }

      // 6. خصم الكمية من بطاقة المنتج
      const currentQty = Number(prod.qty || 0);

      const newQty = Math.max(
        0,
        currentQty - qty
      );

      const { error: updateProductError } = await db
        .from('products')
        .update({
          qty: newQty
        })
        .eq('id', productId);

      if (updateProductError) throw updateProductError;

      // 7. نقل الحركة إلى سلة المحذوفات
      const { data: updatedMovement, error: moveError } = await db
        .from('stock_movements')
        .update({
          deleted_at: deletedTime,
          deleted_by: user.id
        })
        .eq('id', movementId)
        .eq('organization_id', movement.organization_id)
        .is('deleted_at', null)
        .select('id');

      if (moveError) throw moveError;

      if (!updatedMovement || updatedMovement.length === 0) {
        throw new Error('تعذر نقل الحركة إلى سلة المحذوفات.');
      }

      // 8. تحديث الكمية المحلية
      product.qty = newQty;

      // 9. إعادة تحميل السجل
      await loadHistory();

      alert('تم حذف صف المنتج ونقل السجل إلى سلة المحذوفات بنجاح.');

    } catch (err) {

      console.error('Delete movement error:', err);

      alert(
        tr('error', 'Error') + ': ' + err.message
      );
    }
  };

  // ============================================
  // تشغيل الصفحة
  // ============================================

  loadHistory();

});
