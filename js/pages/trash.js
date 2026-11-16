// ============================================
// صفحة سلة المحذوفات (Trash)
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
  let currentTab = 'products'; // 'products' or 'suppliers'

  // بناء هيكل الصفحة
  main.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-trash-can" style="color: #dc2626; margin-inline-end: 8px;"></i> ${tr('nav_trash', 'Trash')}</h2>
    </div>
    
    <div class="trash-wrapper">
      <!-- التبويبات -->
      <div class="trash-tabs">
        <button class="trash-tab active" id="tab-products">
          <i class="fas fa-box"></i> ${tr('search_group_products', 'Products')}
        </button>
        <button class="trash-tab" id="tab-suppliers">
          <i class="fas fa-truck"></i> ${tr('search_group_suppliers', 'Suppliers')}
        </button>
      </div>

      <!-- قائمة العناصر -->
      <div class="trash-list" id="trash-list">
        <div class="trash-empty">
          <i class="fas fa-spinner fa-spin"></i>
          <p>${tr('loading', 'Loading...')}</p>
        </div>
      </div>
    </div>
  `;

  const listContainer = document.getElementById('trash-list');
  const tabProducts = document.getElementById('tab-products');
  const tabSuppliers = document.getElementById('tab-suppliers');

  // دالة جلب وعرض البيانات
  async function loadTrash() {
    listContainer.innerHTML = `<div class="trash-empty"><i class="fas fa-spinner fa-spin"></i><p>${tr('loading', 'Loading...')}</p></div>`;

    try {
      let query = db.from(currentTab).select('*').eq('organization_id', orgId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      
      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        listContainer.innerHTML = `
          <div class="trash-empty">
            <i class="fas fa-check-circle" style="color: #16a34a;"></i>
            <p>${tr('trash_empty', 'Trash is empty')}</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data.map(item => {
        const isProduct = currentTab === 'products';
        const title = item.name;
        const subtitle = isProduct 
          ? `SKU: ${item.sku || '—'} | Qty: ${item.qty || 0}` 
          : `Phone: ${item.phone || '—'}`;
        
        const dateDeleted = new Date(item.deleted_at).toLocaleDateString();
        
        return `
          <div class="trash-card">
            <div class="trash-card-info">
              <div class="trash-card-icon">
                <i class="fas ${isProduct ? 'fa-box' : 'fa-truck'}"></i>
              </div>
              <div class="trash-card-text">
                <div class="trash-card-title">${title}</div>
                <div class="trash-card-subtitle">${subtitle}</div>
                <div class="trash-card-subtitle" style="font-size: 10px; color: #a3a3a3; margin-top: 4px;">
                  ${tr('trash_deleted_on', 'Deleted on')}: ${dateDeleted}
                </div>
              </div>
            </div>
            
            <div class="trash-actions">
              <button class="btn-icon btn-restore" onclick="restoreItem('${item.id}', '${currentTab}')" title="${tr('trash_restore', 'Restore')}">
                <i class="fas fa-rotate-left"></i>
              </button>
              <button class="btn-icon btn-delete-forever" onclick="permanentDelete('${item.id}', '${currentTab}', '${title.replace(/'/g, "\\'")}')" title="${tr('trash_delete_forever', 'Delete Permanently')}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error(err);
      listContainer.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }

  // دالة الاستعادة
  window.restoreItem = async (id, table) => {
    if (!confirm(tr('trash_confirm_restore', 'Are you sure you want to restore this item?'))) return;

    try {
      // إعادة العنصر للحياة (مسح تاريخ الحذف)
      const { error } = await db.from(table).update({ deleted_at: null, deleted_by: null }).eq('id', id);
      if (error) throw error;
      
      // إشعار
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

      loadTrash(); // إعادة تحميل القائمة
    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  // دالة الحذف النهائي
  window.permanentDelete = async (id, table, name) => {
    if (!confirm(`${tr('trash_confirm_delete', 'Are you sure you want to PERMANENTLY delete')} "${name}"?\n\n${tr('trash_warning', 'This action cannot be undone!')}`)) return;

    try {
      // الحذف النهائي من قاعدة البيانات
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) throw error;
      
      // إشعار
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

      loadTrash(); // إعادة تحميل القائمة
    } catch (err) {
      alert(tr('error', 'Error') + ': ' + err.message);
    }
  };

  // أحداث التبويبات
  tabProducts.addEventListener('click', () => {
    currentTab = 'products';
    tabProducts.classList.add('active');
    tabSuppliers.classList.remove('active');
    loadTrash();
  });

  tabSuppliers.addEventListener('click', () => {
    currentTab = 'suppliers';
    tabSuppliers.classList.add('active');
    tabProducts.classList.remove('active');
    loadTrash();
  });

  // التحميل الأولي
  loadTrash();
});