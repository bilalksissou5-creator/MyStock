// ============================================
// صفحة الإيصال (نمط سوبر ماركت)
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('rcpt_title_full');

  const params = new URLSearchParams(window.location.search);
  const receiptId = params.get('id');

  if (!receiptId) {
    document.getElementById('receipt-content').innerHTML = `
      <div class="alert alert-error">${tr('rcpt_no_id')}</div>
    `;
    return;
  }

  const { data: receipt, error } = await db
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    document.getElementById('receipt-content').innerHTML = `
      <div class="alert alert-error">${tr('rcpt_not_found')}</div>
    `;
    return;
  }

  const { data: org } = await db
    .from('organizations')
    .select('name, logo_url, logo_shape, show_org_name, currency_code, currency_symbol, show_currency')
    .eq('id', receipt.organization_id)
    .single();

  const { data: items } = await db
    .from('receipt_items')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: true });

  receipt.organizations = org;

  renderReceipt({
    receipt,
    items: items ?? [],
  });
});

function renderReceipt({ receipt, items }) {
  const tr = (key) => (window.t ? window.t(key) : key);
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  const container = document.getElementById('receipt-content');

  const org = receipt.organizations;

  const totalValue = Number(receipt.total_value ?? 0);

  const date = new Date(receipt.created_at);
  const dateStr = date.toLocaleDateString(locale);
  const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const logoShape = org?.logo_shape || 'circle';
  const showOrgName = org?.show_org_name !== false;

  const currencySymbol = org?.currency_symbol || '';
  const showCurrency = org?.show_currency !== false;
  const fmtCurrency = (v) => CurrencyUtils.formatCurrency(v, currencySymbol, showCurrency);

  container.innerHTML = `
    <div class="rc-logo-wrap">
      <div class="rc-logo shape-${logoShape}">
        ${org?.logo_url
          ? `<img src="${org.logo_url}" alt="logo">`
          : `<div class="rc-logo-placeholder"><i class="fas fa-boxes-stacked"></i></div>`}
      </div>
    </div>

    ${showOrgName ? `
      <div class="rc-org-name">${org?.name ?? 'MyStock'}</div>
    ` : ''}

    <div class="rc-divider"></div>

    <div class="rc-receipt-num">${tr('rcpt_number')} <strong>${receipt.receipt_number}</strong></div>

    <div class="rc-divider-dashed"></div>

    <div class="rc-table">
      ${items.length === 0 ? `
        <div class="rc-empty">${tr('rcpt_no_items')}</div>
      ` : items.map(item => `
        <div class="rc-line">
          <span class="rc-name">${item.product_name}</span>
          <span class="rc-qty">${item.qty}</span>
          <span class="rc-price">${fmtCurrency(item.price)}</span>
          <span class="rc-total">${fmtCurrency(item.total)}</span>
        </div>
      `).join('')}
    </div>

    <div class="rc-divider"></div>

    <div class="rc-total-row">
      ${tr('rcpt_total')} <strong>${fmtCurrency(totalValue)}</strong>
    </div>

    <div class="rc-divider"></div>

    <div class="rc-date">${tr('rcpt_date')} ${dateStr}</div>
    <div class="rc-time">${tr('rcpt_time')} ${timeStr}</div>

    <div class="rc-divider-dashed"></div>

    <div class="rc-thanks">${tr('rcpt_thanks')}</div>

    <div class="rc-actions no-print">
      <button class="btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i>
        <span>${tr('rcpt_print')}</span>
      </button>
      <a href="/movements/list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('rcpt_back')}</span>
      </a>
    </div>
  `;
}