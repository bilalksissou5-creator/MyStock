// ============================================
// صفحة سلة المحذوفات (Trash)
// ✅ سجل حذف احترافي (منتجات، موردين، حركات مخزون)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('trash.html');
  if (window.applyLanguage) window.applyLanguage();
  const tr = (key, fallback) => (window.t ? (window.t(key) || fallback) : (fallback || key));
  
  document.title = tr('nav_trash', 'Trash');

  const main = document.getElementById('main-content');
  const { data: profile } = await db.from('profiles').select('organization_id, full_name').eq('id', user.id).single();
  
  if (!profile?.organization_id) {
    main.innerHTML = `<div class="alert alert-error">Organization not found</div>`;
    return;
  }

  const orgId = profile.organization_id;

  main.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-trash-can" style="color: #dc2626; margin-inline-end: 8px;"></i> ${tr('nav_trash', 'Trash')}</h2>
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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.trash-menu-container')) {
      document.querySelectorAll('.trash-dropdown').forEach(el => el.classList.remove('show'));
    }
  });

  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " " + tr('years_ago', 'years ago');
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " " + tr('months_ago', 'months ago');
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " " + tr('days_ago', 'days ago');
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " " + tr('hours_ago', 'hours ago');
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " " + tr('minutes_ago', 'mins ago');
    return tr('just_now', 'Just now');
  }

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
      itemMeta = `<span><i class="fas fa-barcode"></i> ${item.sku || '—'}</span><span><i class="fas fa-cubes"></i> ${tr('products_qty', 'Qty')}: ${item.qty || 0}</span>`;
      imageHtml = item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : `<i class="fas fa-box"></i>`;
    } else if (isSupplier) {
      sourceTitle = tr('search_group_suppliers', 'Suppliers');
      itemName = item.name;
      itemMeta = `<span><i class="fas fa-phone"></i> ${item.phone || '—'}</span>`;
      imageHtml = `<i class="fas fa-truck"></i>`;
    } else if (isMovement) {
      sourceTitle = tr('nav_movements', 'Stock Movements');
      itemName = item.products?.name || 'Unknown Product';
      itemMeta = `<span><i class="fas fa-plus-circle" style="color: #16a34a;"></i> +${item.quantity}</span><span><i class="fas fa-file-invoice"></i> ${item.invoice_id || '—'}</span>`;
      imageHtml = item.products?.image_url ? `<img src="${item.products.image_url}">` : `<i class="fas fa-box"></i>`;
    }

    const deletedByName = item.deleted_by && userMap.has(item.deleted_by) 
      ? userMap.get(item.deleted_by) 
      : tr('unknown_user', 'Unknown');
      
    const deletedAtTime = timeAgo(item.deleted_at);

    const safeName = (itemName || '').replace(/'/g, "\\'");

    return `
      <div class="trash-log-card">
        <div class="trash-image-box">${imageHtml}</div>
        <div class="trash-content-area">
          <div class="trash-top-line">
            <div class="trash-item-name">${itemName || '—'}</div>
            <div class="trash-col-user">
              <span style="color: #dc2626;"><i class="fas fa-user-xmark"></i> ${deletedByName}</span>
            </div>
          </div>
          <div class="trash-bottom-line">
            <div class="trash-item-meta">${itemMeta}</div>
            <div class="trash-item-time"><i class="fas fa-clock"></i> ${deletedAtTime}</div>
          </div>
        </div>

        <div class="trash-col-actions">
          <div class="trash-menu-container">
            <button class="trash-menu-btn" onclick="toggleDropdown(event, '${item._table}-${item.id}')">
              <i class="fas fa-ellipsis-vertical"></i>
            </button>
            <div class="trash-dropdown" id="dropdown-${item._table}-${item.id}">
              <button class="btn-restore-text" onclick="restoreItem('${item.id}', '${item._table}', '${item.product_id || ''}', ${item.quantity || 0}, '${item.invoice_id || ''}')">
                <i class="fas fa-rotate-left"></i> 
                <span class="dropdown-text">${tr('trash_restore', 'Restore')}</span>
              </button>
              <button class="btn-delete-text" onclick="permanentDelete('${item.id}', '${item._table}', '${safeName}')">
                <i class="fas fa-trash"></i> 
                <span class="dropdown-text">${tr('trash_delete_forever', 'Delete Permanently')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function loadTrash() {
    listContainer.innerHTML = `<div class="trash-empty"><i class="fas fa-spinner fa-spin"></i><p>${tr('loading', 'Loading...')}</p></div>`;

    try {
      const [productsRes, suppliersRes, movementsRes, profilesRes] = await Promise.all([
        db.from('products').select('*').eq('organization_id', orgId).not('deleted_at', 'is', null),
        db.from('suppliers').select('*').eq('organization_id', orgId).not('deleted_at', 'is', null),
        db.from('stock_movements').select('*, products(name, image_url, price)').eq('organization_id', orgId).not('deleted_at', 'is', null),
        db.from('profiles').select('id, full_name').eq('organization_id', orgId)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (movementsRes.error) throw movementsRes.error;

      const userMap = new Map();
      (profilesRes.data || []).forEach(p => userMap.set(p.id, p.full_name));

      let products = (productsRes.data || []).map(i => ({ ...i, _table: 'products' }));
      let suppliers = (suppliersRes.data || []).map(i => ({ ...i, _table: 'suppliers' }));
      let movements = (movementsRes.data || []).map(i => ({ ...i, _table: 'stock_movements' }));

      products.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
      suppliers.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
      movements.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

      if (products.length === 0 && suppliers.length === 0 && movements.length === 0) {
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
        html += `<div class="trash-section-title"><i class="fas fa-box"></i> ${tr('search_group_products', 'Products')}</div>`;
        html += products.map(p => renderTrashCard(p, userMap)).join('');
      }

      if (movements.length > 0) {
        html += `<div class="trash-section-title"><i class="fas fa-history"></i> ${tr('nav_movements', 'Stock Movements')}</div>`;
        html += movements.map(m => renderTrashCard(m, userMap)).join('');
      }

      if (suppliers.length > 0) {
        html += `<div class="trash-section-title"><i class="fas fa-truck"></i> ${tr('search_group_suppliers', 'Suppliers')}</div>`;
        html += suppliers.map(s => renderTrashCard(s, userMap)).join('');
      }

      listContainer.innerHTML = html;

    } catch (err) {
      console.error(err);
      listContainer.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }

  window.toggleDropdown = (event, uniqueId) => {
    event.stopPropagation(); 
    const dropdown = document.getElementById(`dropdown-${uniqueId}`);
    
    document.querySelectorAll('.trash-dropdown').forEach(el => {
      if (el.id !== `dropdown-${uniqueId}`) el.classList.remove('show');
    });

    dropdown.classList.toggle('show');
  };

  // ✅ دالة الاستعادة الشاملة (للمنتجات، الموردين، وحركات المخزون)
  window.restoreItem = async (id, table, productId, qty, invoiceId) => {
    if (!confirm(tr('trash_confirm_restore', 'Are you sure you want to restore this item?'))) return;

    try {
      if (table === 'stock_movements') {
        // 1. استعادة الحركة
        await db.from('stock_movements').update({ deleted_at: null }).eq('id', id);
        
        // 2. إرجاع الكمية للمنتج
        const { data: prod } = await db.from('products').select('qty, price').eq('id', productId).single();
        if (prod) {
          await db.from('products').update({ qty: Number(prod.qty) + Number(qty) }).eq('id', productId);
        }

        // 3. استعادة الفاتورة
        if (invoiceId) {
          const { data: invoice } = await db.from('invoices').select('*').eq('invoice_number', invoiceId).single();
          if (invoice) {
            if (invoice.deleted_at) {
              // إذا كانت الفاتورة محذوفة، نعيدها
              await db.from('invoices').update({ 
                deleted_at: null, 
                total_qty: qty, 
                total_value: Number(qty) * Number(prod?.price || 0) 
              }).eq('id', invoice.id);
              
              await db.from('invoice_items').update({ 
                deleted_at: null, 
                qty: qty, 
                total: Number(qty) * Number(prod?.price || 0) 
              }).eq('invoice_id', invoice.id).eq('product_id', productId);
            } else {
              // إذا كانت الفاتورة موجودة، نضيف لها
              await db.from('invoices').update({ 
                total_qty: Number(invoice.total_qty) + Number(qty), 
                total_value: Number(invoice.total_value) + (Number(qty) * Number(prod?.price || 0)) 
              }).eq('id', invoice.id);

              const { data: item } = await db.from('invoice_items').select('*').eq('invoice_id', invoice.id).eq('product_id', productId).single();
              if (item) {
                if (item.deleted_at) {
                  await db.from('invoice_items').update({ deleted_at: null, qty: qty, total: Number(qty) * Number(item.price) }).eq('id', item.id);
                } else {
                  await db.from('invoice_items').update({ qty: Number(item.qty) + Number(qty), total: (Number(item.qty) + Number(qty)) * Number(item.price) }).eq('id', item.id);
                }
              }
            }
          }
        }
      } else {
        // استعادة منتج أو مورد عادي
        await db.from(table).update({ deleted_at: null, deleted_by: null }).eq('id', id);
      }
      
      loadTrash();
    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  window.permanentDelete = async (id, table, name) => {
    if (!confirm(`${tr('trash_confirm_delete', 'Are you sure you want to PERMANENTLY delete')} "${name}"?\n\n${tr('trash_warning', 'This action cannot be undone!')}`)) return;

    try {
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) throw error;
      
      loadTrash();
    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  loadTrash();
});