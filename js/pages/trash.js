
// ============================================
// صفحة سلة المحذوفات (Trash)
// ✅ المنتجات والموردون وحركات المخزون
// ✅ استعادة صف الفاتورة المحذوف فعلياً
// ✅ استعادة البيانات الأصلية من JSONB
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
  // إغلاق القوائم المنسدلة
  // ============================================

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.trash-menu-container')) {
      document.querySelectorAll('.trash-dropdown')
        .forEach(el => el.classList.remove('show'));
    }
  });

  // ============================================
  // حساب الوقت
  // ============================================

  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;

    if (interval > 1)
      return Math.floor(interval) + ' ' +
        tr('years_ago', 'years ago');

    interval = seconds / 2592000;

    if (interval > 1)
      return Math.floor(interval) + ' ' +
        tr('months_ago', 'months ago');

    interval = seconds / 86400;

    if (interval > 1)
      return Math.floor(interval) + ' ' +
        tr('days_ago', 'days ago');

    interval = seconds / 3600;

    if (interval > 1)
      return Math.floor(interval) + ' ' +
        tr('hours_ago', 'hours ago');

    interval = seconds / 60;

    if (interval > 1)
      return Math.floor(interval) + ' ' +
        tr('minutes_ago', 'mins ago');

    return tr('just_now', 'Just now');
  }

  // ============================================
  // عرض بطاقة المحذوفات
  // ============================================

  function renderTrashCard(item, userMap) {
    const isProduct = item._table === 'products';
    const isSupplier = item._table === 'suppliers';
    const isMovement = item._table === 'stock_movements';

    let sourceTitle = '';
    let itemName = '';
    let itemMeta = '';
    let imageHtml = '';

    if (isProduct) {
      sourceTitle = tr('search_group_products', 'Products');
      itemName = item.name;

      itemMeta = `
        <span>
          <i class="fas fa-barcode"></i>
          ${item.sku || '—'}
        </span>
        <span>
          <i class="fas fa-cubes"></i>
          ${tr('products_qty', 'Qty')}: ${item.qty || 0}
        </span>
      `;

      imageHtml = item.image_url
        ? `<img src="${item.image_url}" alt="${item.name}">`
        : `<i class="fas fa-box"></i>`;

    } else if (isSupplier) {
      sourceTitle = tr('search_group_suppliers', 'Suppliers');
      itemName = item.name;

      itemMeta = `
        <span>
          <i class="fas fa-phone"></i>
          ${item.phone || '—'}
        </span>
      `;

      imageHtml = `<i class="fas fa-truck"></i>`;

    } else if (isMovement) {
      sourceTitle = tr('nav_movements', 'Stock Movements');

      itemName = item.products?.name || 'Unknown Product';

      itemMeta = `
        <span>
          <i class="fas fa-plus-circle" style="color:#16a34a;"></i>
          +${item.quantity}
        </span>
        <span>
          <i class="fas fa-file-invoice"></i>
          ${item.invoice_id || '—'}
        </span>
      `;

      imageHtml = item.products?.image_url
        ? `<img src="${item.products.image_url}">`
        : `<i class="fas fa-box"></i>`;
    }

    const deletedByName =
      item.deleted_by && userMap.has(item.deleted_by)
        ? userMap.get(item.deleted_by)
        : tr('unknown_user', 'Unknown');

    const deletedAtTime = timeAgo(item.deleted_at);

    const safeName = (itemName || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;');

    const safeId = String(item.id).replace(/'/g, "\\'");

    const safeProductId = String(item.product_id || '')
      .replace(/'/g, "\\'");

    const safeInvoiceId = String(item.invoice_id || '')
      .replace(/'/g, "\\'");

    return `
      <div class="trash-log-card">

        <div class="trash-image-box">
          ${imageHtml}
        </div>

        <div class="trash-content-area">

          <div class="trash-top-line">

            <div class="trash-item-name">
              ${itemName || '—'}
            </div>

            <div class="trash-col-user">
              <span style="color:#dc2626;">
                <i class="fas fa-user-xmark"></i>
                ${deletedByName}
              </span>
            </div>

          </div>

          <div class="trash-bottom-line">

            <div class="trash-item-meta">
              ${itemMeta}
            </div>

            <div class="trash-item-time">
              <i class="fas fa-clock"></i>
              ${deletedAtTime}
            </div>

          </div>

        </div>

        <div class="trash-col-actions">

          <div class="trash-menu-container">

            <button
              class="trash-menu-btn"
              onclick="toggleDropdown(event, '${item._table}-${safeId}')"
            >
              <i class="fas fa-ellipsis-vertical"></i>
            </button>

            <div
              class="trash-dropdown"
              id="dropdown-${item._table}-${safeId}"
            >

              <button
                class="btn-restore-text"
                onclick="restoreItem(
                  '${safeId}',
                  '${item._table}',
                  '${safeProductId}',
                  ${Number(item.quantity || 0)},
                  '${safeInvoiceId}'
                )"
              >
                <i class="fas fa-rotate-left"></i>
                <span class="dropdown-text">
                  ${tr('trash_restore', 'Restore')}
                </span>
              </button>

              <button
                class="btn-delete-text"
                onclick="permanentDelete(
                  '${safeId}',
                  '${item._table}',
                  '${safeName}'
                )"
              >
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
          .select('*, products(name, image_url, price)')
          .eq('organization_id', orgId)
          .not('deleted_at', 'is', null),

        db.from('profiles')
          .select('id, full_name')
          .eq('organization_id', orgId)

      ]);

      if (productsRes.error) throw productsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (movementsRes.error) throw movementsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const userMap = new Map();

      (profilesRes.data || []).forEach(p => {
        userMap.set(p.id, p.full_name);
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
          ${err.message}
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

      // ----------------------------------------
      // استعادة حركة المخزون
      // ----------------------------------------

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

        // ----------------------------------------
        // 3. إعادة صف الفاتورة
        // ----------------------------------------

        if (snapshot) {

          if (
            !snapshot.id ||
            !snapshot.invoice_id ||
            !snapshot.product_id
          ) {
            throw new Error('نسخة صف الفاتورة غير مكتملة.');
          }

          // التحقق من وجود الفاتورة
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

          // التحقق من عدم وجود صف مكرر
          const { data: existingItem, error: existingError } = await db
            .from('invoice_items')
            .select('id')
            .eq('id', snapshot.id)
            .maybeSingle();

          if (existingError) throw existingError;

          if (existingItem) {
            throw new Error('صف المنتج موجود بالفعل في الفاتورة.');
          }

          // إعادة إنشاء الصف الأصلي
          const { error: insertError } = await db
            .from('invoice_items')
            .insert(snapshot);

          if (insertError) throw insertError;

          // تحديث إجماليات الفاتورة
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

          // السجلات القديمة التي لا تحتوي نسخة محفوظة
          console.warn(
            'No invoice snapshot available for movement:',
            movement.id
          );

        }

        // ----------------------------------------
        // 4. إعادة الكمية إلى المنتج
        // ----------------------------------------

        const newQty =
          Number(prod.qty || 0) + movementQty;

        const { error: updateProductError } = await db
          .from('products')
          .update({
            qty: newQty
          })
          .eq('id', movement.product_id)
          .eq('organization_id', orgId);

        if (updateProductError) throw updateProductError;

        // ----------------------------------------
        // 5. استعادة الحركة
        // ----------------------------------------

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

        // ----------------------------------------
        // استعادة منتج أو مورد عادي
        // ----------------------------------------

        const { error } = await db
          .from(table)
          .update({
            deleted_at: null,
            deleted_by: null
          })
          .eq('id', id)
          .eq('organization_id', orgId);

        if (error) throw error;
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

    if (!confirm(
      `${tr('trash_confirm_delete', 'Are you sure you want to PERMANENTLY delete')} "${name}"?\n\n${tr('trash_warning', 'This action cannot be undone!')}`
    )) return;

    try {

      const { error } = await db
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) throw error;

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
