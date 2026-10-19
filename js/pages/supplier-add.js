// ============================================
// صفحة تفاصيل المورد (Supplier Details)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  // ✅ قراءة معرف المورد من الرابط
  const urlParams = new URLSearchParams(window.location.search);
  const supplierId = urlParams.get('id');

  renderLayout('suppliers/detail.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('sup_detail_title_full') || 'Supplier Details';

  const main = document.getElementById('main-content');

  if (!supplierId) {
    main.innerHTML = `<div class="alert alert-error">${tr('sup_err_not_found') || 'Supplier ID not found'}</div>`;
    return;
  }

  // جلب بيانات المورد من قاعدة البيانات
  const { data: supplier, error } = await db
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();

  if (error || !supplier) {
    main.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')} ${error?.message || 'Supplier not found'}</div>`;
    return;
  }

  // ✅ بناء واجهة عرض تفاصيل المورد
  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('sup_detail_title') || 'Supplier Details'}</h2>
      <a href="/suppliers/list.html" class="btn-secondary" target="_parent">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back') || 'Back'}</span>
      </a>
    </div>

    <div class="product-input-card" style="margin-top: 16px;">
      <div class="form-group">
        <label style="font-weight: bold; color: #171717;">${tr('sup_name') || 'Name'}</label>
        <div style="padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5;">
          ${supplier.name || '—'}
        </div>
      </div>

      <div class="form-group">
        <label style="font-weight: bold; color: #171717;">${tr('sup_specialty') || 'Specialty'}</label>
        <div style="padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5;">
          ${supplier.specialty || '—'}
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label style="font-weight: bold; color: #171717;">${tr('inv_page_supplier_phone')?.replace(':', '') || 'Phone'}</label>
          <div style="padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5;" dir="ltr">
            ${supplier.phone || '—'}
          </div>
        </div>

        <div class="form-group">
          <label style="font-weight: bold; color: #171717;">${tr('register_email')?.replace(' *', '') || 'Email'}</label>
          <div style="padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5;" dir="ltr">
            ${supplier.email || '—'}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label style="font-weight: bold; color: #171717;">${tr('sup_address') || 'Address'}</label>
        <div style="padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5;">
          ${supplier.address || '—'}
        </div>
      </div>

      <div class="form-group">
        <label style="font-weight: bold; color: #171717;">${tr('sup_notes') || 'Notes'}</label>
        <div style="padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5; min-height: 60px;">
          ${supplier.notes || '—'}
        </div>
      </div>
    </div>
  `;
});