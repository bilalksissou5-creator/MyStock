// ============================================
// صفحة الفاتورة الواحدة
// ✅ دعم كامل للترجمة + مشاركة عبر الطباعة
// ============================================

const ROWS_PER_PAGE = 13;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('inv_page_title_full');

  const { data: myProfile } = await db
    .from('profiles')
    .select('role, full_name, organization_id')
    .eq('id', user.id)
    .single();

  const canDelete = myProfile?.role === 'admin' || myProfile?.role === 'deputy';

  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('id');

  if (!invoiceId) {
    document.getElementById('invoice-content').innerHTML = `
      <div class="alert alert-error">${tr('inv_page_no_id')}</div>
    `;
    return;
  }

  const { data: invoice, error: invoiceError } = await db
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceId.trim())
    .single();

  if (invoiceError || !invoice) {
    document.getElementById('invoice-content').innerHTML = `
      <div class="alert alert-error">${tr('inv_page_not_found')}</div>
    `;
    return;
  }

  let supplier = null;
  if (invoice.supplier_id) {
    const { data: sup } = await db.from('suppliers').select('*').eq('id', invoice.supplier_id).single();
    supplier = sup;
  }

  let org = null;
  if (invoice.organization_id) {
    const { data: o } = await db.from('organizations').select('name, logo_url, logo_shape, show_org_name, currency_code, currency_symbol, show_currency').eq('id', invoice.organization_id).single();
    org = o;
  }

  let createdBy = null;
  if (invoice.created_by) {
    const { data: prof } = await db.from('profiles').select('full_name').eq('id', invoice.created_by).single();
    createdBy = prof;
  }

  const { data: items } = await db.from('invoice_items').select('*').eq('invoice_id', invoice.id).order('created_at', { ascending: true });

  renderInvoice({ invoice, supplier, org, createdBy, items: items ?? [], canDelete });

  if (canDelete) {
    const deleteBtn = document.getElementById('delete-invoice-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => handleDeleteInvoice(invoice));
    }
  }
});

function splitIntoPages(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    pages.push(items.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);
  return pages;
}

function buildPage({ pageNumber, totalPages, pageItems, invoice, supplier, org, createdBy, globalRowStart }) {
  const tr = (key) => (window.t ? window.t(key) : key);
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  const date = new Date(invoice.created_at);
  const dateStr = date.toLocaleDateString(locale);
  const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const logoShape = org?.logo_shape || 'circle';
  const showOrgName = org?.show_org_name !== false;

  const currencySymbol = org?.currency_symbol || '';
  const showCurrency = org?.show_currency !== false;
  const fmtCurrency = (v) => CurrencyUtils.formatCurrency(v, currencySymbol, showCurrency);

  const pageTotalQty = pageItems.reduce((s, it) => s + Number(it.qty ?? 0), 0);
  const pageTotalValue = pageItems.reduce((s, it) => s + Number(it.total ?? 0), 0);

  const grandTotalQty = invoice.total_qty ?? 0;
  const grandTotalValue = Number(invoice.total_value ?? 0);

  return `
    <div class="invoice-page">
      <div class="invoice-header">
        <div class="invoice-logo shape-${logoShape}">
          ${org?.logo_url ? `<img src="${org.logo_url}" alt="logo">` : `<div class="logo-placeholder"><i class="fas fa-boxes-stacked"></i></div>`}
        </div>
        ${showOrgName ? `<div class="invoice-org"><h1>${org?.name ?? 'MyStock'}</h1></div>` : ''}
      </div>

      <div class="invoice-info-row">
        <div class="info-box">
          <h3>${tr('inv_page_info_title')}</h3>
          <div class="info-row"><strong>${tr('inv_page_number')}</strong><span>${invoice.invoice_number}</span></div>
          <div class="info-row"><strong>${tr('inv_page_date')}</strong><span>${dateStr}</span></div>
          <div class="info-row"><strong>${tr('inv_page_time')}</strong><span>${timeStr}</span></div>
        </div>
        <div class="info-box">
          <h3>${tr('inv_page_supplier_title')}</h3>
          <div class="info-row"><strong>${tr('inv_page_supplier_name')}</strong><span>${supplier?.name ?? '—'}</span></div>
          <div class="info-row"><strong>${tr('inv_page_supplier_phone')}</strong><span dir="ltr">${supplier?.phone ?? '—'}</span></div>
          <div class="info-row"><strong>${tr('inv_page_supplier_specialty')}</strong><span>${supplier?.specialty ?? '—'}</span></div>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>${tr('inv_page_col_product')}</th>
            <th>${tr('inv_page_col_qty')}</th>
            <th>${tr('inv_page_col_price')}</th>
            <th>${tr('inv_page_col_total')}</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems.length === 0 ? `
            <tr><td colspan="5" style="text-align:center; color:#737373; padding:20px;">${tr('inv_page_no_items')}</td></tr>
          ` : pageItems.map((item, i) => `
            <tr>
              <td>${globalRowStart + i + 1}</td>
              <td>${item.product_name ?? '—'}</td>
              <td>${item.qty ?? 0}</td>
              <td>${fmtCurrency(item.price)}</td>
              <td>${fmtCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2"><strong>${tr('inv_page_page_total')}</strong></td>
            <td><strong>${pageTotalQty}</strong></td>
            <td>—</td>
            <td><strong>${fmtCurrency(pageTotalValue)}</strong></td>
          </tr>
          ${totalPages > 1 ? `
            <tr class="grand-total-row">
              <td colspan="2"><strong>${tr('inv_page_grand_total')}</strong></td>
              <td><strong>${grandTotalQty}</strong></td>
              <td>—</td>
              <td><strong>${fmtCurrency(grandTotalValue)}</strong></td>
            </tr>
          ` : ''}
        </tfoot>
      </table>

      <div class="invoice-footer">
        <div class="footer-signature">
          <p><strong>${tr('inv_page_responsible')}</strong></p>
          <p>${createdBy?.full_name ?? '—'}</p>
          <div class="signature-line"></div>
        </div>
        <div class="footer-signature">
          <p><strong>${tr('inv_page_supplier_sign')}</strong></p>
          <p class="supplier-name">${supplier?.name ?? '—'}</p>
          <div class="signature-line"></div>
        </div>
      </div>

      ${totalPages > 1 ? `<div class="page-number">${tr('inv_page_page')} ${pageNumber} ${tr('inv_page_of')} ${totalPages}</div>` : ''}
    </div>
  `;
}

function renderInvoice({ invoice, supplier, org, createdBy, items, canDelete }) {
  const tr = (key) => (window.t ? window.t(key) : key);

  const container = document.getElementById('invoice-content');
  const pages = splitIntoPages(items);
  const totalPages = pages.length;

  let html = '';

  pages.forEach((pageItems, idx) => {
    html += buildPage({
      pageNumber: idx + 1, totalPages, pageItems, invoice, supplier, org, createdBy, globalRowStart: idx * ROWS_PER_PAGE,
    });
  });

  html += `
    <div class="invoice-actions no-print">
      <button class="btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i>
        <span>${tr('inv_page_print')}</span>
      </button>
      
      <!-- ✅ زر المشاركة (عبر الطباعة) -->
      <button class="btn-secondary" id="share-pdf-btn">
        <i class="fas fa-file-pdf"></i>
        <span>${tr('inv_page_share') || 'مشاركة PDF'}</span>
      </button>
      
      ${canDelete ? `
        <button class="btn-danger" id="delete-invoice-btn">
          <i class="fas fa-trash"></i>
          <span>${tr('inv_page_delete')}</span>
        </button>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;

  // ✅ منطق المشاركة: فتح نافذة الطباعة
  const shareBtn = document.getElementById('share-pdf-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      // إخفاء الأزرار مؤقتاً لطباعة نظيفة
      const actionsDiv = document.querySelector('.invoice-actions');
      if (actionsDiv) actionsDiv.style.display = 'none';

      // استدعاء نافذة الطباعة (التي تتيح حفظ/مشاركة PDF)
      window.print();

      // إعادة إظهار الأزرار بعد الطباعة
      setTimeout(() => {
        if (actionsDiv) actionsDiv.style.display = 'flex';
      }, 1000);
    });
  }
}

async function handleDeleteInvoice(invoice) {
  const tr = (key) => (window.t ? window.t(key) : key);
  const confirmed = confirm(`${tr('inv_page_confirm_del')} "${invoice.invoice_number}"?\n\n${tr('inv_page_confirm_del_msg')}`);
  if (!confirmed) return;

  const btn = document.getElementById('delete-invoice-btn');
  if (btn) { btn.disabled = true; btn.querySelector('span').textContent = tr('inv_page_deleting'); }

  try {
    await db.from('invoice_items').delete().eq('invoice_id', invoice.id);
    await db.from('products').delete().eq('invoice_id', invoice.invoice_number);
    await db.from('invoices').delete().eq('id', invoice.id);
    alert(tr('inv_page_deleted'));
    window.location.href = '/invoices/list.html';
  } catch (err) {
    alert(tr('prod_detail_err') + ' ' + err.message);
    if (btn) { btn.disabled = false; btn.querySelector('span').textContent = tr('inv_page_delete'); }
  }
}