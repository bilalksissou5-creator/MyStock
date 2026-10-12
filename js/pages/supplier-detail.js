// ============================================
// صفحة تفاصيل المورد
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('suppliers/detail.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('sup_det_title_full');

  const params = new URLSearchParams(window.location.search);
  const supplierId = params.get('id');
  const main = document.getElementById('main-content');

  if (!supplierId) {
    main.innerHTML = `<div class="alert alert-error">${tr('sup_det_no_id')}</div>`;
    return;
  }

  const { data: supplier, error } = await db
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();

  if (error || !supplier) {
    main.innerHTML = `<div class="alert alert-error">${tr('sup_det_not_found')}</div>`;
    return;
  }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  const { data: invoices } = await db
    .from('invoices')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  const totalInvoices = invoices?.length ?? 0;
  const totalValue = invoices?.reduce((sum, inv) => sum + (inv.total_value ?? 0), 0) ?? 0;
  const totalQty = invoices?.reduce((sum, inv) => sum + (inv.total_qty ?? 0), 0) ?? 0;

  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('sup_det_title')}</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
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
            <span>${tr('sup_specialty')}</span>
            <strong class="edit-field" id="f-specialty" data-value="${supplier.specialty ?? ''}"></strong>
          </div>
          <div class="row">
            <span>${tr('inv_page_supplier_phone').replace(':', '')}</span>
            <strong class="edit-field" id="f-phone" data-value="${supplier.phone ?? ''}"></strong>
          </div>
          <div class="row">
            <span>${tr('register_email').replace(' *', '')}</span>
            <strong class="edit-field" id="f-email" data-value="${supplier.email ?? ''}"></strong>
          </div>
          <div class="row">
            <span>${tr('sup_address')}</span>
            <strong class="edit-field" id="f-address" data-value="${supplier.address ?? ''}"></strong>
          </div>
          <div class="row">
            <span>${tr('sup_notes')}</span>
            <strong class="edit-field" id="f-notes" data-value="${supplier.notes ?? ''}"></strong>
          </div>
        </div>

        <div class="actions">
          <button class="btn-danger" id="delete-btn">
            <i class="fas fa-trash"></i>
            <span>${tr('sup_det_delete')}</span>
          </button>
        </div>
      </div>

      <div class="supplier-stats">
        <div class="stat">
          <div class="stat-label">${tr('inv_title')}</div>
          <div class="stat-value">${totalInvoices}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${tr('rpt_total_qty')}</div>
          <div class="stat-value">${totalQty}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${tr('inv_stat_total')}</div>
          <div class="stat-value">${totalValue.toFixed(2)}</div>
        </div>
      </div>

      <div class="supplier-products">
        <h3>${tr('sup_det_invoices')}</h3>
        ${totalInvoices === 0 ? `
          <div class="empty-state">
            <i class="fas fa-file-invoice"></i>
            <p>${tr('sup_det_no_invoices')}</p>
          </div>
        ` : `
          <div class="invoices-list-simple">
            ${invoices.map(inv => {
              const date = new Date(inv.created_at);
              const dateStr = date.toLocaleDateString(locale);
              const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

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
                    <span>${tr('inv_stat_products')}: <b>${inv.total_qty ?? 0}</b></span>
                    <span>${tr('inv_stat_total')}: <b>${(inv.total_value ?? 0).toFixed(2)}</b></span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;

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

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm(tr('sup_det_confirm_del'))) return;

    const { error } = await db.from('suppliers').delete().eq('id', supplierId);

    if (error) {
      alert(tr('prod_detail_err') + ' ' + error.message);
      return;
    }

    if (typeof notifyOrganization === 'function' && profile?.organization_id) {
      await notifyOrganization({
        orgId: profile.organization_id,
        title: tr('sup_det_notif_del_title'),
        message: `${profile.full_name || tr('prod_detail_user')} ${tr('sup_det_notif_del_msg')} "${supplier.name}"`,
        type: 'danger',
        link: '/suppliers/list.html',
        userName: profile.full_name || null,
      });
    }

    window.location.href = 'list.html';
  });
});