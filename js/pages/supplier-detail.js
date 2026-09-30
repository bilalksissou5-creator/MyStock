// ============================================
// صفحة تفاصيل المورد
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('suppliers/detail.html');

  const params = new URLSearchParams(window.location.search);
  const supplierId = params.get('id');
  const main = document.getElementById('main-content');

  if (!supplierId) {
    main.innerHTML = `<div class="alert alert-error">لم يتم تحديد المورد</div>`;
    return;
  }

  // جلب بيانات المورد
  const { data: supplier, error } = await db
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();

  if (error || !supplier) {
    main.innerHTML = `<div class="alert alert-error">المورد غير موجود</div>`;
    return;
  }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  // جلب الفواتير
  const { data: invoices } = await db
    .from('invoices')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  const totalInvoices = invoices?.length ?? 0;
  const totalValue = invoices?.reduce((sum, inv) => sum + (inv.total_value ?? 0), 0) ?? 0;
  const totalQty = invoices?.reduce((sum, inv) => sum + (inv.total_qty ?? 0), 0) ?? 0;

  main.innerHTML = `
    <div class="page-header">
      <h2>تفاصيل المورد</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="supplier-detail">

      <div class="supplier-card-detail">
        <div class="supplier-header">
          <div class="supplier-avatar-large">
            <i class="fas fa-truck"></i>
          </div>
          <h1 class="detail-title">
            <span class="edit-field" id="f-name" data-value="${supplier.name ?? ''}"></span>
          </h1>
          ${supplier.specialty ? `<p class="supplier-specialty"><i class="fas fa-tag"></i> ${supplier.specialty}</p>` : ''}
        </div>

        <div class="supplier-extra">
          <div class="row">
            <span>الإختصاص</span>
            <strong class="edit-field" id="f-specialty" data-value="${supplier.specialty ?? ''}"></strong>
          </div>
          <div class="row">
            <span>الهاتف</span>
            <strong class="edit-field" id="f-phone" data-value="${supplier.phone ?? ''}"></strong>
          </div>
          <div class="row">
            <span>البريد الإلكتروني</span>
            <strong class="edit-field" id="f-email" data-value="${supplier.email ?? ''}"></strong>
          </div>
          <div class="row">
            <span>العنوان</span>
            <strong class="edit-field" id="f-address" data-value="${supplier.address ?? ''}"></strong>
          </div>
          <div class="row">
            <span>ملاحظات</span>
            <strong class="edit-field" id="f-notes" data-value="${supplier.notes ?? ''}"></strong>
          </div>
        </div>

        <div class="actions">
          <button class="btn-danger" id="delete-btn">
            <i class="fas fa-trash"></i>
            <span>حذف المورد</span>
          </button>
        </div>
      </div>

      <div class="supplier-stats">
        <div class="stat">
          <div class="stat-label">الفواتير</div>
          <div class="stat-value">${totalInvoices}</div>
        </div>
        <div class="stat">
          <div class="stat-label">إجمالي الكمية</div>
          <div class="stat-value">${totalQty}</div>
        </div>
        <div class="stat">
          <div class="stat-label">القيمة الإجمالية</div>
          <div class="stat-value">${totalValue.toFixed(2)}</div>
        </div>
      </div>

      <div class="supplier-products">
        <h3>فواتير المورد</h3>
        ${totalInvoices === 0 ? `
          <div class="empty-state">
            <i class="fas fa-file-invoice"></i>
            <p>لا توجد فواتير لهذا المورد</p>
          </div>
        ` : `
          <div class="invoices-list-simple">
            ${invoices.map(inv => {
              const date = new Date(inv.created_at);
              const dateStr = date.toLocaleDateString('ar-MA');
              const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

              return `
                <a href="/invoice.html?id=${inv.invoice_number}" class="invoice-row-simple">
                  <div class="invoice-icon-small">
                    <i class="fas fa-file-invoice"></i>
                  </div>
                  <div class="invoice-info-simple">
                    <strong>${inv.invoice_number}</strong>
                    <span>${dateStr} • ${timeStr}</span>
                  </div>
                  <div class="invoice-stats-simple">
                    <span>المنتجات: <b>${inv.total_qty ?? 0}</b></span>
                    <span>الإجمالي: <b>${(inv.total_value ?? 0).toFixed(2)}</b></span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;

  // حقول التعديل المباشر
  const fields = [
    { id: 'f-name', field: 'name', type: 'text' },
    { id: 'f-specialty', field: 'specialty', type: 'text' },
    { id: 'f-phone', field: 'phone', type: 'text' },
    { id: 'f-email', field: 'email', type: 'text' },
    { id: 'f-address', field: 'address', type: 'text' },
    { id: 'f-notes', field: 'notes', type: 'text' },
  ];

  fields.forEach(({ id, field, type }) => {
    inlineEdit({
      el: document.getElementById(id),
      table: 'suppliers',
      id: supplierId,
      field,
      type,
    });
  });

  // زر الحذف
  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;

    const { error } = await db.from('suppliers').delete().eq('id', supplierId);

    if (error) {
      alert('خطأ: ' + error.message);
      return;
    }

    if (typeof notifyOrganization === 'function' && profile?.organization_id) {
      await notifyOrganization({
        orgId: profile.organization_id,
        title: 'حذف مورد',
        message: `${profile.full_name || 'مستخدم'} حذف المورد "${supplier.name}"`,
        type: 'danger',
        link: '/suppliers/list.html',
        userName: profile.full_name || null,
      });
    }

    window.location.href = 'list.html';
  });
});