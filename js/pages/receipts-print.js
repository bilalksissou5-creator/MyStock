// ============================================
// صفحة طباعة الإيصالات المجمّعة (80mm)
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('rpt_title_full');

  const container = document.getElementById('print-content');

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    container.innerHTML = `<div class="alert alert-error">${tr('sub_no_org')}</div>`;
    return;
  }

  const { data: org } = await db
    .from('organizations')
    .select('name, logo_url, logo_shape')
    .eq('id', profile.organization_id)
    .single();

  const { data: receipts, error } = await db
    .from('receipts')
    .select('*')
    .eq('created_by', user.id)
    .is('printed_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')} ${error.message}</div>`;
    return;
  }

  if (!receipts || receipts.length === 0) {
    container.innerHTML = `
      <div class="print-empty">
        <i class="fas fa-check-circle" style="color:#22c55e; font-size:40px; margin-bottom:12px;"></i>
        <p style="font-size:16px; font-weight:700;">${tr('rpt_no_new')}</p>
        <p style="color:#737373;">${tr('rpt_no_new_msg')}</p>
        <a href="/profile.html" class="btn-secondary" style="margin-top:16px; display:inline-flex;">
          <i class="fas fa-arrow-right"></i>
          <span>${tr('prod_detail_back')}</span>
        </a>
      </div>
    `;
    return;
  }

  const receiptIds = receipts.map(r => r.id);
  const { data: allItems } = await db
    .from('receipt_items')
    .select('*')
    .in('receipt_id', receiptIds)
    .order('created_at', { ascending: true });

  const itemsByReceipt = {};
  (allItems ?? []).forEach(item => {
    if (!itemsByReceipt[item.receipt_id]) {
      itemsByReceipt[item.receipt_id] = [];
    }
    itemsByReceipt[item.receipt_id].push(item);
  });

  renderPrint({
    receipts,
    itemsByReceipt,
    org,
    profile,
  });

  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', async () => {
      const now = new Date().toISOString();
      await db
        .from('receipts')
        .update({ printed_at: now })
        .in('id', receiptIds);

      const totalReceipts = receipts.length;
      const totalQty = receipts.reduce((s, r) => s + Number(r.total_qty ?? 0), 0);
      const totalValue = receipts.reduce((s, r) => s + Number(r.total_value ?? 0), 0);

      const { data: lastReport } = await db
        .from('daily_reports')
        .select('report_number')
        .eq('organization_id', profile.organization_id)
        .order('printed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNum = 1;
      if (lastReport?.report_number) {
        const match = lastReport.report_number.match(/DR-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const reportNumber = 'DR-' + String(nextNum).padStart(3, '0');

      await db.from('daily_reports').insert({
        report_number: reportNumber,
        organization_id: profile.organization_id,
        created_by: user.id,
        total_receipts: totalReceipts,
        total_qty: totalQty,
        total_value: totalValue,
        receipt_ids: receiptIds,
      });

      window.print();
    });
  }
});

function renderPrint({ receipts, itemsByReceipt, org, profile }) {
  const tr = (key) => (window.t ? window.t(key) : key);
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  const container = document.getElementById('print-content');

  const logoShape = org?.logo_shape || 'circle';

  const totalReceipts = receipts.length;
  const totalQty = receipts.reduce((s, r) => s + Number(r.total_qty ?? 0), 0);
  const totalValue = receipts.reduce((s, r) => s + Number(r.total_value ?? 0), 0);

  let receiptsHTML = '';
  let lastTime = '';

  receipts.forEach((receipt, idx) => {
    const date = new Date(receipt.created_at);
    const dateStr = date.toLocaleDateString(locale);
    const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    const items = itemsByReceipt[receipt.id] ?? [];
    const total = Number(receipt.total_value ?? 0);

    let separator = '';
    if (idx > 0 && timeStr !== lastTime) {
      separator = `
        <div class="rp-separator">
          <div class="rp-separator-line"></div>
          <div class="rp-separator-time">${timeStr}</div>
          <div class="rp-separator-line"></div>
        </div>
      `;
    }
    lastTime = timeStr;

    const isFirst = idx === 0;

    receiptsHTML += `
      ${separator}

      <div class="rp-receipt">
        ${isFirst ? `
          <div class="rp-logo-wrap">
            <div class="rp-logo shape-${logoShape}">
              ${org?.logo_url
                ? `<img src="${org.logo_url}" alt="logo">`
                : `<div class="rp-logo-placeholder"><i class="fas fa-boxes-stacked"></i></div>`}
            </div>
          </div>
          <div class="rp-org-name">${org?.name ?? 'MyStock'}</div>
          <div class="rp-divider-solid"></div>
        ` : ''}

        <div class="rp-receipt-num">${tr('rcpt_number')} <strong>${receipt.receipt_number}</strong></div>
        <div class="rp-divider-dashed"></div>

        <div class="rp-table">
          ${items.length === 0 ? `
            <div class="rp-empty">${tr('rcpt_no_items')}</div>
          ` : items.map(item => `
            <div class="rp-line">
              <span class="rp-name">${item.product_name}</span>
              <span class="rp-qty">${item.qty}</span>
              <span class="rp-price">${Number(item.price).toFixed(2)}</span>
              <span class="rp-total">${Number(item.total).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="rp-divider-solid"></div>

        <div class="rp-total-row">
          ${tr('rcpt_total')} <strong>${total.toFixed(2)}</strong>
        </div>

        <div class="rp-divider-solid"></div>

        <div class="rp-date">${tr('rcpt_date')} ${dateStr}</div>
        <div class="rp-time">${tr('rcpt_time')} ${timeStr}</div>
      </div>
    `;
  });

  const summaryHTML = `
    <div class="rp-separator-final">
      <div class="rp-separator-line"></div>
    </div>

    <div class="rp-summary">
      <div class="rp-summary-row">
        <span>${tr('rcpt_total')}</span>
        <strong>${totalValue.toFixed(2)}</strong>
      </div>
      <div class="rp-summary-row">
        <span>${tr('rpt_count')}</span>
        <strong>${totalReceipts}</strong>
      </div>
      <div class="rp-summary-row">
        <span>${tr('rpt_total_qty')}</span>
        <strong>${totalQty}</strong>
      </div>
    </div>

    <div class="rp-separator-final">
      <div class="rp-separator-line"></div>
    </div>
  `;

  const actionsHTML = `
    <div class="rp-actions no-print">
      <button class="btn-primary full-width" id="print-btn">
        <i class="fas fa-print"></i>
        <span>${tr('rpt_print_all')}</span>
      </button>
      <a href="/profile.html" class="btn-secondary full-width">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('mout_cancel')}</span>
      </a>
    </div>
  `;

  container.innerHTML = `
    <div class="rp-paper">
      ${receiptsHTML}
      ${summaryHTML}
    </div>
    ${actionsHTML}
  `;
}