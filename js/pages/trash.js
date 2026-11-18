// ============================================
// صفحة سلة المحذوفات (Trash)
// ✅ سجل حذف احترافي (توزيع أفقي دقيق)
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
    
    const deletedByName = item.deleted_by && userMap.has(item.deleted_by) 
      ? userMap.get(item.deleted_by) 
      : tr('unknown_user', 'Unknown');
      
    const deletedAtTime = timeAgo(item.deleted_at);

    let metaHtml = '';
    if (isProduct) {
      metaHtml = `
        <span><i class="fas fa-barcode"></i> ${item.sku || '—'}</span>
        <span><i class="fas fa-cubes"></i> ${tr('products_qty', 'Qty')}: ${item.qty || 0}</span>
      `;
    } else {
      metaHtml = `
        <span><i class="fas fa-phone"></i> ${item.phone || '—'}</span>
      `;
    }

    const imageHtml = (isProduct && item.image_url) 
      ? `<img src="${item.image_url}" alt="${item.name}">` 
      : `<i class="fas ${isProduct ? 'fa-box' : 'fa-truck'}"></i>`;

    const safeName = (item.name || '').replace(/'/g, "\\'");

    // ✅ تم إعادة هيكلة العناصر لتطابق توزيع الشبكة المطلوب
    return `
      <div class="trash-log-card">
        
        <!-- 1. الصورة -->
        <div class="trash-image-box">${imageHtml}</div>
        
        <!-- 2. الاسم والكمية (الجهة اليمنى) -->
        <div class="trash-col-name">
          <div class="trash-item-name">${item.name || '—'}</div>
          <div class="trash-item-meta">
            ${metaHtml}
          </div>
        </div>

        <!-- 3. اسم المستخدم الذي حذف (في الوسط مقابل الاسم) -->
        <div class="trash-col-user">
          <span style="color: #dc2626;"><i class="fas fa-user-xmark"></i> ${deletedByName}</span>
        </div>

        <!-- 4. زر الثلاث نقاط والوقت (الجهة اليسرى) -->
        <div class="trash-col-actions">
          <div class="trash-menu-container">
            <button class="trash-menu-btn" onclick="toggleDropdown(event, '${item._table}-${item.id}')">
              <i class="fas fa-ellipsis-vertical"></i>
            </button>
            <div class="trash-dropdown" id="dropdown-${item._table}-${item.id}">
              <button class="btn-restore-text" onclick="restoreItem('${item.id}', '${item._table}')">
                <i class="fas fa-rotate-left"></i> 
                <span class="dropdown-text">${tr('trash_restore', 'Restore')}</span>
              </button>
              <button class="btn-delete-text" onclick="permanentDelete('${item.id}', '${item._table}', '${safeName}')">
                <i class="fas fa-trash"></i> 
                <span class="dropdown-text">${tr('trash_delete_forever', 'Delete Permanently')}</span>
              </button>
            </div>
          </div>
          
          <div class="trash-item-time">
            <i class="fas fa-clock"></i> ${deletedAtTime}
          </div>
        </div>

      </div>
    `;
  }

  async function loadTrash() {
    listContainer.innerHTML = `<div class="trash-empty"><i class="fas fa-spinner fa-spin"></i><p>${tr('loading', 'Loading...')}</p></div>`;

    try {
      const [productsRes, suppliersRes, profilesRes] = await Promise.all([
        db.from('products').select('*').eq('organization_id', orgId).not('deleted_at', 'is', null),
        db.from('suppliers').select('*').eq('organization_id', orgId).not('deleted_at', 'is', null),
        db.from('profiles').select('id, full_name').eq('organization_id', orgId)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const userMap = new Map();
      (profilesRes.data || []).forEach(p => userMap.set(p.id, p.full_name));

      let products = (productsRes.data || []).map(i => ({ ...i, _table: 'products' }));
      let suppliers = (suppliersRes.data || []).map(i => ({ ...i, _table: 'suppliers' }));

      products.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
      suppliers.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

      if (products.length === 0 && suppliers.length === 0) {
        listContainer.innerHTML = `
          <div class="trash-empty">
            <i class="fas fa-check-circle" style="color: #16a34a;"></i>
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

  window.restoreItem = async (id, table) => {
    if (!confirm(tr('trash_confirm_restore', 'Are you sure you want to restore this item?'))) return;

    try {
      const { error } = await db.from(table).update({ deleted_at: null, deleted_by: null }).eq('id', id);
      if (error) throw error;
      
      if (typeof notifyOrganization === 'function') {
        await notifyOrganization({
          orgId: orgId,
          title: tr('trash_restored_title', 'Item Restored'),
          message: `${profile.full_name} ${tr('trash_restored_msg', 'restored an item from Trash.')}`,
          type: 'success',
          link: `/trash.html`,
          userName: profile.full_name
        });
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
      
      if (typeof notifyOrganization === 'function') {
        await notifyOrganization({
          orgId: orgId,
          title: tr('trash_deleted_title', 'Item Permanently Deleted'),
          message: `${profile.full_name} ${tr('trash_deleted_msg', 'permanently deleted')} "${name}".`,
          type: 'danger',
          link: `/trash.html`,
          userName: profile.full_name
        });
      }

      loadTrash();
    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  loadTrash();
});