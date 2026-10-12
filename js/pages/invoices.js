// ============================================
// صفحة الفواتير
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('invoices/list.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('inv_title_full');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('inv_title')}</h2>
      <a href="/products/add.html" class="btn-primary">
        <i class="fas fa-plus"></i>
        <span>${tr('inv_add_products')}</span>
      </a>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="search-invoices" placeholder="${tr('inv_search_ph')}">
    </div>

    <div id="invoices-list" class="invoices-list">
      <p style="text-align:center; color:#737373;">${tr('loading')}</p>
    </div>
  `;

  await autoGenerateInvoices();
  await loadInvoices();

  document.getElementById('search-invoices').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.invoice-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
});

// ============================================
// إنشاء الفواتير تلقائياً
// ============================================
async function autoGenerateInvoices() {
  const tr = (key) => (window.t ? window.t(key) : key);

  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) return;

  const { data: unlinkedProducts, error } = await db
    .from('products')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .is('invoice_id', null);

  if (error || !unlinkedProducts || unlinkedProducts.length === 0) {
    return;
  }

  const groups = {};
  for (const p of unlinkedProducts) {
    const key = p.supplier_id ?? 'no-supplier';
    if (!groups[key]) {
      groups[key] = {
        supplier_id: p.supplier_id,
        products: [],
      };
    }
    groups[key].products.push(p);
  }

  for (const key of Object.keys(groups)) {
    const group = groups[key];

    let totalQty = 0;
    let totalValue = 0;
    for (const p of group.products) {
      totalQty += Number(p.qty ?? 0);
      totalValue += Number(p.qty ?? 0) * Number(p.price ?? 0);
    }

    const invoiceId = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const { error: invoiceError } = await db
      .from('invoices')
      .insert({
        invoice_number: invoiceId,
        organization_id: profile.organization_id,
        supplier_id: group.supplier_id,
        created_by: user.id,
        total_qty: totalQty,
        total_value: totalValue,
      });

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      continue;
    }

    const productIds = group.products.map(p => p.id);

    const { error: updateError } = await db
      .from('products')
      .update({ invoice_id: invoiceId })
      .in('id', productIds);

    if (updateError) {
      console.error('Products update error:', updateError);
      continue;
    }

    if (typeof notifyOrganization === 'function') {
      await notifyOrganization({
        orgId: profile.organization_id,
        title: tr('inv_notif_title'),
        message: `${profile.full_name || tr('prod_detail_user')} ${tr('inv_notif_msg')} ${invoiceId} (${totalQty} ${tr('inv_notif_unit')} - ${totalValue.toFixed(2)})`,
        type: 'info',
        link: `/invoice.html?id=${invoiceId}`,
        userName: profile.full_name || null,
      });
    }
  }
}

// ============================================
// تحميل وعرض الفواتير
// ============================================
async function loadInvoices() {
  const tr = (key) => (window.t ? window.t(key) : key);
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';

  const container = document.getElementById('invoices-list');

  const { data, error } = await db
    .from('invoices')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="alert alert-error">${tr('products_error')} ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-invoice"></i>
        <p>${tr('inv_empty')}</p>
        <p style="font-size:12px; margin-top:8px; color:#a3a3a3;">
          ${tr('inv_empty_hint')}
        </p>
      </div>
    `;
    return;
  }

  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  container.innerHTML = data.map(inv => {
    const date = new Date(inv.created_at);
    const dateStr = date.toLocaleDateString(locale);
    const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    return `
      <a href="/invoice.html?id=${inv.invoice_number}" class="invoice-card">
        <div class="invoice-icon">
          <i class="fas fa-file-invoice"></i>
        </div>
        <div class="invoice-info">
          <strong>${inv.invoice_number}</strong>
          <span class="invoice-supplier">
            <i class="fas fa-truck"></i>
            ${inv.suppliers?.name ?? tr('inv_no_supplier')}
          </span>
          <span class="invoice-date">
            <i class="fas fa-clock"></i>
            ${dateStr} • ${timeStr}
          </span>
        </div>
        <div class="invoice-stats">
          <div class="stat-mini">
            <span>${tr('inv_stat_products')}</span>
            <b>${inv.total_qty ?? 0}</b>
          </div>
          <div class="stat-mini highlight">
            <span>${tr('inv_stat_total')}</span>
            <b>${(inv.total_value ?? 0).toFixed(2)}</b>
          </div>
        </div>
      </a>
    `;
  }).join('');
}