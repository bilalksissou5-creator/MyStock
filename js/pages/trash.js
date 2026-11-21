
// ============================================
// صفحة سلة المحذوفات (Trash)
// ✅ المنتجات والموردون وحركات المخزون
// ✅ بطاقة قريبة من بطاقة سجل المنتج
// ✅ عرض اسم المستخدم الذي قام بالحذف
// ✅ عرض الصورة والاسم والباركود والتاريخ والكمية
// ✅ استعادة صف الفاتورة من JSONB
// ✅ إعادة حساب إجماليات الفاتورة
// ✅ التحقق من نجاح عمليات Supabase
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('trash.html');

  if (window.applyLanguage) window.applyLanguage();

  const tr = (key, fallback) =>
    (window.t ? (window.t(key) || fallback) : (fallback || key));

  document.title = tr('nav_trash', 'Trash');

  const main = document.getElementById('main-content');

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    main.innerHTML = `
      <div class="alert alert-error">${profileError.message}</div>
    `;
    return;
  }

  if (!profile?.organization_id) {
    main.innerHTML = `
      <div class="alert alert-error">Organization not found</div>
    `;
    return;
  }

  const orgId = profile.organization_id;

  main.innerHTML = `
    <div class="page-header">
      <h2>
        <i class="fas fa-trash-can"
           style="color:#dc2626; margin-inline-end:8px;"></i>
        ${tr('nav_trash', 'Trash')}
      </h2>
    </div>

    <div class="trash-wrapper">
      <div class="trash-log-list" id="trash-list">
        <div class="trash-empty">
          <i class="fas fa-spinner fa-spin"></i>
          <p>${tr('loading', 'Loading...')}</p>
        </div>
      </div>
    </div>
  `;

  const listContainer = document.getElementById('trash-list');

  // ============================================
  // أدوات مساعدة
  // ============================================

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  function encodeValue(value) {
    return encodeURIComponent(String(value ?? ''))
      .replace(/'/g, '%27');
  }

  function formatDate(dateString) {
    if (!dateString) return '—';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return '—';

    const datePart = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const timePart = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${datePart} • ${timePart}`;
  }

  // ============================================
  // إغلاق القوائم المنسدلة
  // ============================================

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.trash-menu-container')) {
      document.querySelectorAll('.trash-dropdown')
        .forEach(el => el.classList.remove('show'));
    }
  });

  // ============================================
  // عرض بطاقة المحذوفات
  // ============================================

  function renderTrashCard(item, userMap) {
    const isProduct = item._table === 'products';
    const isSupplier = item._table === 'suppliers';
    const isMovement = item._table === 'stock_movements';

    let itemName = '';
    let barcode = '';
    let imageHtml = '';
    let quantity = null;
    let operationDate = item.created_at || item.deleted_at;

    if (isProduct) {
      itemName = item.name || '—';
      barcode = item.sku || '—';
      quantity = item.qty;

      imageHtml = item.image_url
        ? `<img src="${escapeHTML(item.image_url)}"
                alt="${escapeHTML(itemName)}"
                style="width:100%;height:100%;object-fit:cover;">`
        : `<i class="fas fa-box"></i>`;

    } else if (isSupplier) {
      itemName = item.name || '—';
      barcode = item.phone || '—';

      imageHtml = `<i class="fas fa-truck"></i>`;

    } else if (isMovement) {
      itemName = item.products?.name || 'Unknown Product';
      barcode = item.products?.sku || '—';

      quantity = item.quantity;

      operationDate =
        item.created_at ||
        item.movement_date ||
        item.deleted_at;

      imageHtml = item.products?.image_url
        ? `<img src="${escapeHTML(item.products.image_url)}"
                alt="${escapeHTML(itemName)}"
                style="width:100%;height:100%;object-fit:cover;">`
        : `<i class="fas fa-box"></i>`;
    }

    // اسم المستخدم الذي قام بالحذف
    const deletedByName =
      item.deleted_by && userMap.has(item.deleted_by)
        ? userMap.get(item.deleted_by)
        : tr('unknown_user', 'Unknown user');

    const safeDeletedByName = escapeHTML(deletedByName);

    const safeName = escapeHTML(itemName);
    const safeBarcode = escapeHTML(barcode);
    const displayDate = formatDate(operationDate);

    const safeId = encodeValue(item.id);
    const safeProductId = encodeValue(item.product_id || '');
    const safeInvoiceId = encodeValue(item.invoice_id || '');
    const safeItemName = encodeValue(itemName);

    const uniqueId = `${item._table}-${item.id}`;

    let quantityHtml = '';

    if (quantity !== null && quantity !== undefined) {
      let quantityText = quantity;

      if (isMovement) {
        const sign = item.movement_type === 'out' ? '-' : '+';
        quantityText = `${sign}${Math.abs(Number(quantity) || 0)}`;
      }

      quantityHtml = `
        <span class="trash-quantity-badge"
          style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            min-width:58px;
            padding:9px 12px;
            border-radius:14px;
            background:#dcfce7;
            color:#16a34a;
            font-weight:700;
            white-space:nowrap;
          ">
          ${escapeHTML(quantityText)}
        </span>
      `;
    }

    return `
      <div class="trash-log-card"
        style="
          display:flex;
          align-items:center;
          gap:12px;
          padding:14px;
          margin-bottom:12px;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:20px;
          box-shadow:0 2px 5px rgba(0,0,0,.03);
          min-width:0;
        ">

        <div class="trash-image-box"
          style="
            width:78px;
            height:78px;
            min-width:78px;
            border-radius:15px;
            overflow:hidden;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#f3f4f6;
            color:#9ca3af;
            font-size:25px;
          ">
          ${imageHtml}
        </div>

        <div class="trash-content-area"
          style="
            flex:1;
            min-width:0;
            display:flex;
            flex-direction:column;
            gap:8px;
          ">

          <div class="trash-item-name"
            style="
              font-size:18px;
              font-weight:700;
              color:#171717;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
            ">
            ${safeName}
          </div>

          <div class="trash-item-meta"
            style="
              display:flex;
              flex-direction:column;
              gap:5px;
              color:#888;
              font-size:14px;
              min-width:0;
            ">

            <span style="overflow:hidden;text-overflow:ellipsis;">
              <i class="fas ${isSupplier ? 'fa-phone' : 'fa-barcode'}"></i>
              ${safeBarcode}
            </span>

            <span>
              <i class="fas fa-calendar"></i>
              ${escapeHTML(displayDate)}
            </span>

            <span style="
              display:flex;
              align-items:center;
              gap:5px;
              color:#dc2626;
              font-weight:600;
              overflow:hidden;
              text-overflow:ellipsis;
            ">
              <i class="fas fa-user-xmark"></i>
              <span>${safeDeletedByName}</span>
            </span>

          </div>

        </div>

        <div class="trash-col-actions"
          style="
            display:flex;
            align-items:center;
            gap:8px;
            flex-shrink:0;
          ">

          ${quantityHtml}

          <div class="trash-menu-container"
            style="position:relative;">

            <button
              class="trash-menu-btn"
              type="button"
              aria-label="Trash options"
              onclick="toggleDropdown(event, '${escapeHTML(uniqueId)}')"
              style="
                width:44px;
                height:48px;
                border:0;
                background:transparent;
                color:#777;
                font-size:21px;
                cursor:pointer;
              ">
              <i class="fas fa-ellipsis-vertical"></i>
            </button>

            <div
              class="trash-dropdown"
              id="dropdown-${escapeHTML(uniqueId)}"
              style="
                min-width:190px;
                right:0;
                z-index:100;
              ">

              <button
                class="btn-restore-text"
                type="button"
                onclick="restoreItem(
                  decodeURIComponent('${safeId}'),
                  '${item._table}',
                  decodeURIComponent('${safeProductId}'),
                  ${Number(item.quantity || 0)},
                  decodeURIComponent('${safeInvoiceId}')
                )">

                <i class="fas fa-rotate-left"></i>

                <span class="dropdown-text">
                  ${tr('trash_restore', 'Restore')}
                </span>
              </button>

              <button
                class="btn-delete-text"
                type="button"
                onclick="permanentDelete(
                  decodeURIComponent('${safeId}'),
                  '${item._table}',
                  decodeURIComponent('${safeItemName}')
                )">

                <i class="fas fa-trash"></i>

                <span class="dropdown-text">
                  ${tr('trash_delete_forever', 'Delete Permanently')}
                </span>
              </button>

            </div>

          </div>

        </div>

      </div>
    `;
  }

  // ============================================
  // تحميل سلة المحذوفات
  // ============================================

  async function loadTrash() {
    listContainer.innerHTML = `
      <div class="trash-empty">
        <i class="fas fa-spinner fa-spin"></i>
        <p>${tr('loading', 'Loading...')}</p>
      </div>
    `;

    try {
      const [
        productsRes,
        suppliersRes,
        movementsRes,
        profilesRes
      ] = await Promise.all([

        db.from('products')
          .select('*')
          .eq('organization_id', orgId)
          .not('deleted_at', 'is', null),

        db.from('suppliers')
          .select('*')
          .eq('organization_id', orgId)
          .not('deleted_at', 'is', null),

        db.from('stock_movements')
          .select('*, products(name, image_url, price, sku)')
          .eq('organization_id', orgId)
          .not('deleted_at', 'is', null),

        // جلب أسماء مستخدمي المؤسسة
        db.from('profiles')
          .select('id, full_name')
          .eq('organization_id', orgId)

      ]);

      if (productsRes.error) throw productsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (movementsRes.error) throw movementsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      // إنشاء خريطة أسماء المستخدمين
      const userMap = new Map();

      (profilesRes.data || []).forEach(p => {
        userMap.set(
          p.id,
          p.full_name || tr('unknown_user', 'Unknown user')
        );
      });

      const products = (productsRes.data || [])
        .map(i => ({ ...i, _table: 'products' }));

      const suppliers = (suppliersRes.data || [])
        .map(i => ({ ...i, _table: 'suppliers' }));

      const movements = (movementsRes.data || [])
        .map(i => ({ ...i, _table: 'stock_movements' }));

      products.sort((a, b) =>
        new Date(b.deleted_at) - new Date(a.deleted_at)
      );

      suppliers.sort((a, b) =>
        new Date(b.deleted_at) - new Date(a.deleted_at)
      );

      movements.sort((a, b) =>
        new Date(b.deleted_at) - new Date(a.deleted_at)
      );

      if (
        products.length === 0 &&
        suppliers.length === 0 &&
        movements.length === 0
      ) {
        listContainer.innerHTML = `
          <div class="trash-empty">
            <i class="fas fa-trash-can"></i>
            <p>${tr('trash_empty', 'Trash is empty')}</p>
          </div>
        `;

        return;
      }

      let html = '';

      if (products.length > 0) {
        html += `
          <div class="trash-section-title">
            <i class="fas fa-box"></i>
            ${tr('search_group_products', 'Products')}
          </div>
        `;

        html += products
          .map(p => renderTrashCard(p, userMap))
          .join('');
      }

      if (movements.length > 0) {
        html += `
          <div class="trash-section-title">
            <i class="fas fa-history"></i>
            ${tr('nav_movements', 'Stock Movements')}
          </div>
        `;

        html += movements
          .map(m => renderTrashCard(m, userMap))
          .join('');
      }

      if (suppliers.length > 0) {
        html += `
          <div class="trash-section-title">
            <i class="fas fa-truck"></i>
            ${tr('search_group_suppliers', 'Suppliers')}
          </div>
        `;

        html += suppliers
          .map(s => renderTrashCard(s, userMap))
          .join('');
      }

      listContainer.innerHTML = html;

    } catch (err) {
      console.error('Load trash error:', err);

      listContainer.innerHTML = `
        <div class="alert alert-error">
          ${escapeHTML(err.message)}
        </div>
      `;
    }
  }

  // ============================================
  // القائمة المنسدلة
  // ============================================

  window.toggleDropdown = (event, uniqueId) => {
    event.stopPropagation();

    const dropdown = document.getElementById(
      `dropdown-${uniqueId}`
    );

    if (!dropdown) return;

    document.querySelectorAll('.trash-dropdown')
      .forEach(el => {
        if (el !== dropdown) {
          el.classList.remove('show');
        }
      });

    dropdown.classList.toggle('show');
  };

  // ============================================
  // استعادة الحركة وصف الفاتورة
  // ============================================

  window.restoreItem = async (
    id,
    table,
    productId,
    qty,
    invoiceId
  ) => {
    if (!confirm(
      tr(
        'trash_confirm_restore',
        'Are you sure you want to restore this item?'
      )
    )) return;

    try {
      if (table === 'stock_movements') {

        // 1. جلب الحركة
        const { data: movement, error: movementError } = await db
          .from('stock_movements')
          .select('*')
          .eq('id', id)
          .eq('organization_id', orgId)
          .single();

        if (movementError) throw movementError;

        if (!movement || !movement.deleted_at) {
          throw new Error('السجل غير موجود في سلة المحذوفات.');
        }

        const movementQty = Number(movement.quantity);
        const snapshot = movement.invoice_item_snapshot;

        if (!Number.isFinite(movementQty) || movementQty <= 0) {
          throw new Error('كمية الحركة غير صحيحة.');
        }

        // 2. جلب المنتج
        const { data: prod, error: prodError } = await db
          .from('products')
          .select('id, qty, price')
          .eq('id', movement.product_id)
          .eq('organization_id', orgId)
          .single();

        if (prodError) throw prodError;

        if (!prod) {
          throw new Error('المنتج الأصلي غير موجود.');
        }

        // 3. إعادة صف الفاتورة
        if (snapshot) {

          if (
            !snapshot.id ||
            !snapshot.invoice_id ||
            !snapshot.product_id
          ) {
            throw new Error('نسخة صف الفاتورة غير مكتملة.');
          }

          const { data: invoice, error: invoiceError } = await db
            .from('invoices')
            .select('*')
            .eq('id', snapshot.invoice_id)
            .eq('organization_id', orgId)
            .maybeSingle();

          if (invoiceError) throw invoiceError;

          if (!invoice) {
            throw new Error('الفاتورة الأصلية غير موجودة.');
          }

          const { data: existingItem, error: existingError } = await db
            .from('invoice_items')
            .select('id')
            .eq('id', snapshot.id)
            .maybeSingle();

          if (existingError) throw existingError;

          if (existingItem) {
            throw new Error('صف المنتج موجود بالفعل في الفاتورة.');
          }

          const { error: insertError } = await db
            .from('invoice_items')
            .insert(snapshot);

          if (insertError) throw insertError;

          const { error: invoiceUpdateError } = await db
            .from('invoices')
            .update({
              deleted_at: null,
              total_qty:
                Number(invoice.total_qty || 0) +
                Number(snapshot.qty || 0),

              total_value:
                Number(invoice.total_value || 0) +
                Number(snapshot.total || 0)
            })
            .eq('id', invoice.id);

          if (invoiceUpdateError) throw invoiceUpdateError;

        } else if (movement.invoice_id) {
          console.warn(
            'No invoice snapshot available for movement:',
            movement.id
          );
        }

        // 4. إعادة الكمية إلى المنتج
        const newQty =
          Number(prod.qty || 0) + movementQty;

        const { error: updateProductError } = await db
          .from('products')
          .update({ qty: newQty })
          .eq('id', movement.product_id)
          .eq('organization_id', orgId);

        if (updateProductError) throw updateProductError;

        // 5. استعادة الحركة
        const { data: restored, error: restoreError } = await db
          .from('stock_movements')
          .update({
            deleted_at: null,
            deleted_by: null
          })
          .eq('id', id)
          .eq('organization_id', orgId)
          .not('deleted_at', 'is', null)
          .select('id');

        if (restoreError) throw restoreError;

        if (!restored || restored.length === 0) {
          throw new Error('تعذرت استعادة سجل الحركة.');
        }

      } else {

        const allowedTables = ['products', 'suppliers'];

        if (!allowedTables.includes(table)) {
          throw new Error('نوع السجل غير مسموح.');
        }

        const { data: restored, error } = await db
          .from(table)
          .update({
            deleted_at: null,
            deleted_by: null
          })
          .eq('id', id)
          .eq('organization_id', orgId)
          .not('deleted_at', 'is', null)
          .select('id');

        if (error) throw error;

        if (!restored || restored.length === 0) {
          throw new Error('تعذرت استعادة السجل.');
        }
      }

      alert('تمت استعادة البيانات بنجاح.');

      await loadTrash();

    } catch (err) {
      console.error('Restore error:', err);

      alert(
        tr('error', 'Error') + ': ' + err.message
      );
    }
  };

  // ============================================
  // الحذف النهائي
  // ============================================

  window.permanentDelete = async (id, table, name) => {
    const allowedTables = [
      'products',
      'suppliers',
      'stock_movements'
    ];

    if (!allowedTables.includes(table)) {
      alert('نوع السجل غير مسموح.');
      return;
    }

    if (!confirm(
      `${tr('trash_confirm_delete', 'Are you sure you want to PERMANENTLY delete')} "${name}"?\n\n${tr('trash_warning', 'This action cannot be undone!')}`
    )) return;

    try {
      const { data: deleted, error } = await db
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('id');

      if (error) throw error;

      if (!deleted || deleted.length === 0) {
        throw new Error('لم يتم العثور على السجل للحذف.');
      }

      alert('تم الحذف النهائي بنجاح.');

      await loadTrash();

    } catch (err) {
      console.error('Permanent delete error:', err);

      alert(
        tr('error', 'Error') + ': ' + err.message
      );
    }
  };

  // ============================================
  // تشغيل الصفحة
  // ============================================

  await loadTrash();

});
