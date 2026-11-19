
// ============================================
// صفحة سجل المنتج (Product History)
// ✅ حذف الحركة ونقلها إلى سلة المحذوفات
// ✅ تسجيل المستخدم الذي قام بالحذف
// ✅ التحقق من نجاح التحديث في Supabase
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
              onclick="deleteMovement(
                '${mov.id}',
                ${Number(mov.quantity)},
                '${mov.invoice_id || ''}'
              )"
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
  // حذف الحركة ونقلها إلى سلة المحذوفات
  // ============================================

  window.deleteMovement = async (
    movementId,
    qtyToRemove,
    invoiceId
  ) => {

    if (!confirm(
      tr(
        'prod_history_confirm_del',
        'Are you sure you want to delete this quantity? It will be deducted from stock and invoice.'
      )
    )) return;

    try {

      // 1. التحقق من الحركة قبل الحذف
      const { data: movement, error: fetchError } = await db
        .from('stock_movements')
        .select('id, organization_id, quantity, deleted_at')
        .eq('id', movementId)
        .eq('product_id', productId)
        .single();

      if (fetchError) throw fetchError;

      if (!movement) {
        throw new Error('لم يتم العثور على سجل الحركة.');
      }

      if (movement.deleted_at) {
        throw new Error('هذا السجل موجود بالفعل في سلة المحذوفات.');
      }

      // 2. نقل الحركة إلى سلة المحذوفات
      const deletedTime = new Date().toISOString();

      const { data: updatedMovement, error: moveErr } = await db
        .from('stock_movements')
        .update({
          deleted_at: deletedTime,
          deleted_by: user.id
        })
        .eq('id', movementId)
        .eq('organization_id', movement.organization_id)
        .is('deleted_at', null)
        .select('id, deleted_at, deleted_by');

      console.log('Movement update:', {
        updatedMovement,
        moveErr
      });

      if (moveErr) throw moveErr;

      // التأكد من أن Supabase حدّث الحركة فعلاً
      if (!updatedMovement || updatedMovement.length === 0) {
        throw new Error(
          'لم يتم نقل الحركة إلى سلة المحذوفات. تحقق من صلاحيات RLS.'
        );
      }

      // اعتماد الكمية المسجلة في قاعدة البيانات
      const qty = Number(movement.quantity);

      // 3. خصم الكمية من بطاقة المنتج
      const currentQty = Number(product.qty || 0);
      const newQty = Math.max(0, currentQty - qty);

      const { error: productError } = await db
        .from('products')
        .update({ qty: newQty })
        .eq('id', productId);

      if (productError) {
        throw new Error(
          'تم نقل الحركة إلى المحذوفات، لكن تعذر تحديث كمية المنتج: ' +
          productError.message
        );
      }

      // 4. تعديل الفاتورة المرتبطة
      if (invoiceId) {

        const { data: invoice, error: invoiceError } = await db
          .from('invoices')
          .select('*')
          .eq('invoice_number', invoiceId)
          .maybeSingle();

        if (invoiceError) throw invoiceError;

        if (invoice) {

          const newInvQty = Math.max(
            0,
            Number(invoice.total_qty || 0) - qty
          );

          const newInvValue = Math.max(
            0,
            Number(invoice.total_value || 0) -
            (qty * Number(product.price || 0))
          );

          if (newInvQty <= 0) {

            // الفاتورة أصبحت فارغة
            const { error: invUpdateError } = await db
              .from('invoices')
              .update({
                deleted_at: deletedTime,
                total_qty: 0,
                total_value: 0
              })
              .eq('id', invoice.id);

            if (invUpdateError) throw invUpdateError;

            const { error: itemsError } = await db
              .from('invoice_items')
              .update({
                deleted_at: deletedTime,
                qty: 0,
                total: 0
              })
              .eq('invoice_id', invoice.id);

            if (itemsError) throw itemsError;

          } else {

            // تحديث إجماليات الفاتورة
            const { error: invUpdateError } = await db
              .from('invoices')
              .update({
                total_qty: newInvQty,
                total_value: newInvValue
              })
              .eq('id', invoice.id);

            if (invUpdateError) throw invUpdateError;

            // تحديث عنصر الفاتورة المرتبط بالمنتج
            const { data: item, error: itemError } = await db
              .from('invoice_items')
              .select('*')
              .eq('invoice_id', invoice.id)
              .eq('product_id', productId)
              .maybeSingle();

            if (itemError) throw itemError;

            if (item) {

              const itemNewQty = Math.max(
                0,
                Number(item.qty) - qty
              );

              if (itemNewQty <= 0) {

                const { error: deleteItemError } = await db
                  .from('invoice_items')
                  .update({
                    deleted_at: deletedTime,
                    qty: 0,
                    total: 0
                  })
                  .eq('id', item.id);

                if (deleteItemError) throw deleteItemError;

              } else {

                const { error: updateItemError } = await db
                  .from('invoice_items')
                  .update({
                    qty: itemNewQty,
                    total: itemNewQty * Number(item.price)
                  })
                  .eq('id', item.id);

                if (updateItemError) throw updateItemError;
              }
            }
          }
        }
      }

      // 5. تحديث كمية المنتج محلياً
      product.qty = newQty;

      // 6. إعادة تحميل السجل
      await loadHistory();

      alert(
        'تم نقل السجل إلى سلة المحذوفات بنجاح.'
      );

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
