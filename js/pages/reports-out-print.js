
// ============================================
// طباعة تقرير إخراج المنتجات
// MyStock - Reports Out Print
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('print-container');

  const tr = (key, fallback) =>
    (window.t ? (window.t(key) || fallback) : (fallback || key));

  const params = new URLSearchParams(window.location.search);

  const startParam = params.get('start');
  const endParam = params.get('end');

  if (!startParam || !endParam) {
    container.innerHTML = `
      <div class="no-data">
        ${tr('reports_no_data', 'No data to print')}
      </div>
    `;
    return;
  }

  const start = new Date(startParam);
  const end = new Date(endParam);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    container.innerHTML = `
      <div class="no-data">
        ${tr('reports_no_data', 'Invalid date range')}
      </div>
    `;
    return;
  }

  try {
    const user = await requireAuth();

    if (!user) return;

    if (window.applyLanguage) {
      window.applyLanguage();
    }

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const orgId = profile.organization_id;

    // ============================================
    // جلب عمليات إخراج المنتجات
    // ============================================

    const { data: movements, error } = await db
      .from('stock_movements')
      .select(`
        id,
        quantity,
        created_at,
        performed_by,
        products (
          id,
          name,
          sell_price,
          unit
        ),
        profiles (full_name)
      `)
      .eq('organization_id', orgId)
      .eq('type', 'out')
      .is('deleted_at', null)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const items = movements || [];

    // ============================================
    // حساب الإجماليات
    // ============================================

    let totalQty = 0;
    let totalValue = 0;

    items.forEach(m => {
      const qty = Number(m.quantity || 0);
      const price = Number(m.products?.sell_price || 0);

      totalQty += qty;
      totalValue += qty * price;
    });

    // ============================================
    // تنسيق الأرقام والتواريخ
    // ============================================

    function formatDate(date) {
      return date.toLocaleDateString('fr-FR');
    }

    function formatTime(date) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function formatNumber(number) {
      return Number(number || 0).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function escapeHTML(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]);
    }

    // ============================================
    // بناء صفوف الجدول
    // ============================================

    const rows = items.map(m => {
      const product = m.products || {};

      const date = new Date(m.created_at);
      const qty = Number(m.quantity || 0);
      const price = Number(product.sell_price || 0);
      const total = qty * price;

      return `
        <tr>
          <td class="number-cell">${formatTime(date)}</td>

          <td>${formatDate(date)}</td>

          <td>${escapeHTML(m.profiles?.full_name || '—')}</td>

          <td class="product-name">
            ${escapeHTML(product.name || '—')}
          </td>

          <td class="number-cell">${qty.toLocaleString('fr-FR')}</td>

          <td>${escapeHTML(product.unit || '—')}</td>

          <td class="number-cell">${formatNumber(price)} DH</td>

          <td class="number-cell">${formatNumber(total)} DH</td>
        </tr>
      `;
    }).join('');

    // ============================================
    // عرض التقرير
    // ============================================

    container.innerHTML = `
      <div class="report-header">
        <h1>
          ${tr('reports_out_title', 'Outgoing Products Report')}
        </h1>

        <p>${tr('reports_period', 'Report Period')}</p>

        <div class="report-period">
          ${formatDate(start)} — ${formatDate(end)}
        </div>

        <p>
          ${tr('reports_print_date', 'Print Date')}:
          ${formatDate(new Date())}
        </p>
      </div>

      <div class="report-summary">
        <div class="summary-box">
          <div class="summary-label">
            ${tr('reports_out_total_qty', 'Total Outgoing Quantity')}
          </div>

          <div class="summary-value">
            ${totalQty.toLocaleString('fr-FR')}
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-label">
            ${tr('reports_out_total_value', 'Total Outgoing Value')}
          </div>

          <div class="summary-value" dir="ltr">
            ${formatNumber(totalValue)} DH
          </div>
        </div>
      </div>

      <div class="report-table-wrapper">
        <table class="report-table">
          <thead>
            <tr>
              <th>${tr('reports_time', 'الوقت')}</th>
              <th>${tr('reports_date_only', 'التاريخ')}</th>
              <th>${tr('reports_user', 'المستخدم')}</th>
              <th>${tr('reports_product', 'المنتج')}</th>
              <th>${tr('reports_qty', 'الكمية')}</th>
              <th>${tr('reports_unit', 'الوحدة')}</th>
              <th>${tr('reports_sell_price', 'سعر البيع')}</th>
              <th>${tr('reports_total_value', 'إجمالي القيمة')}</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
              `<tr>
                <td colspan="8" class="no-data">
                  ${tr('reports_no_data', 'No data for this period')}
                </td>
              </tr>`
            }
          </tbody>

          <tfoot>
            <tr>
              <td colspan="4">
                ${tr('reports_grand_total', 'المجموع الكلي')}
              </td>

              <td>${totalQty.toLocaleString('fr-FR')}</td>

              <td></td>
              <td></td>

              <td dir="ltr">
                ${formatNumber(totalValue)} DH
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="signature-section">
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-line">
                <p>
                  ${tr('reports_manager_sig', 'توقيع المسؤول')}
                </p>
              </div>
            </td>

            <td>
              <div class="stamp-circle">
                <p>
                  ${tr('reports_org_stamp', 'ختم المؤسسة')}
                </p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <div class="print-actions">
        <button onclick="window.print()">
          <i class="fas fa-print"></i>
          ${tr('reports_print', 'Print')}
        </button>
      </div>
    `;

    document.title = tr(
      'reports_out_title',
      'Outgoing Products Report'
    );

  } catch (err) {
    console.error('Reports Out Print Error:', err);

    container.innerHTML = `
      <div class="no-data">
        ${tr('reports_error_loading', 'Error loading report')}
        <br>
        ${escapeHTML(err.message)}
      </div>
    `;
  }
});
