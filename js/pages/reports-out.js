
// ============================================
// تقرير إخراج المنتجات (Reports Out)
// ✅ فلترة حسب اليوم / الأسبوع / الشهر / السنة
// ✅ فترة مخصصة باستخدام Flatpickr
// ✅ التنقل بين الفترات السابقة والتالية
// ✅ ترقيم الصفحات: 20 عملية
// ✅ حساب القيمة باستخدام سعر البيع sell_price
// ✅ فتح صفحة الطباعة المستقلة
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('reports-out.html');
  if (window.applyLanguage) window.applyLanguage();

  const tr = (key, fallback) =>
    (window.t ? (window.t(key) || fallback) : (fallback || key));

  document.title = tr('reports_out_title', 'Outgoing Products Report');

  const main = document.getElementById('main-content');

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    main.innerHTML = `<div class="alert alert-error">Organization not found</div>`;
    return;
  }

  const orgId = profile.organization_id;

  let currentPeriod = 'today';
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let totalItems = 0;

  let anchorDate = new Date();
  let currentStartDate, currentEndDate;
  let fp = null;

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('reports_out_title', 'Outgoing Products Report')}</h2>
    </div>

    <div class="reports-wrapper">

      <div class="filters-card">
        <h3 class="filters-title">
          <i class="fas fa-arrow-right-from-bracket" style="color:#dc2626;"></i>
          ${tr('reports_out_products', 'Product Out Report')}
        </h3>

        <div class="period-tabs">
          <button class="period-tab active" data-period="today">
            ${tr('reports_today', 'Today')}
          </button>

          <button class="period-tab" data-period="week">
            ${tr('reports_week', 'Week')}
          </button>

          <button class="period-tab" data-period="month">
            ${tr('reports_month', 'Month')}
          </button>

          <button class="period-tab" data-period="year">
            ${tr('reports_year', 'Year')}
          </button>

          <button class="period-tab" data-period="custom">
            <i class="fas fa-calendar-alt" style="margin-inline-end:4px;"></i>
            ${tr('reports_custom', 'Custom')}
          </button>
        </div>

        <div class="custom-date-range" id="custom-date-range" style="display:none;">
          <label>${tr('reports_date_range', 'Date Range')}</label>
          <input
            type="text"
            id="date-picker"
            placeholder="${tr('reports_select_dates', 'Select dates...')}"
            readonly
          >
        </div>

        <div class="date-range-display" id="date-range-display">
          <i class="fas fa-calendar-alt"></i>
          <span id="date-range-text">—</span>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">
            ${tr('reports_out_total_qty', 'Total Outgoing Quantity')}
          </div>
          <div class="summary-value" id="sum-qty">—</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">
            ${tr('reports_out_total_value', 'Total Outgoing Value')}
          </div>
          <div class="summary-value highlight" id="sum-total">—</div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">
            ${tr('reports_details_table', 'Details Table')}
          </h3>

          <button
            class="btn-primary"
            id="print-btn"
            style="display:flex;align-items:center;gap:8px;"
          >
            <i class="fas fa-print"></i>
            ${tr('reports_print', 'Print')}
          </button>
        </div>

        <div class="table-wrapper">
          <table class="reports-table">
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

            <tbody id="reports-tbody">
              <tr>
                <td colspan="8" style="text-align:center;padding:40px;color:#a3a3a3;">
                  ${tr('loading', 'Loading...')}
                </td>
              </tr>
            </tbody>

            <tfoot id="reports-tfoot">
              <tr>
                <td colspan="4" class="footer-label">
                  ${tr('reports_grand_total', 'المجموع الكلي')}
                </td>

                <td class="footer-total" id="footer-qty">0</td>

                <td></td>
                <td></td>

                <td
                  class="footer-total highlight"
                  id="footer-value"
                  dir="ltr"
                >
                  0.00 <span class="currency-symbol">DH</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="pagination" id="pagination"></div>
      </div>

    </div>
  `;

  const tbody = document.getElementById('reports-tbody');
  const dateRangeText = document.getElementById('date-range-text');
  const paginationContainer = document.getElementById('pagination');
  const customDateRange = document.getElementById('custom-date-range');
  const datePickerInput = document.getElementById('date-picker');
  const printBtn = document.getElementById('print-btn');

  // ============================================
  // تحديد نطاق التاريخ
  // ============================================

  function getDateRange(period) {
    if (period === 'custom') {
      return {
        start: currentStartDate,
        end: currentEndDate
      };
    }

    const now = new Date(anchorDate);
    let start, end;

    if (period === 'today') {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );

    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;

      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        diff,
        0, 0, 0
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        diff + 6,
        23, 59, 59, 999
      );

    } else if (period === 'month') {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0, 0, 0
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23, 59, 59, 999
      );

    } else if (period === 'year') {
      start = new Date(
        now.getFullYear(),
        0,
        1,
        0, 0, 0
      );

      end = new Date(
        now.getFullYear(),
        11,
        31,
        23, 59, 59, 999
      );
    }

    return { start, end };
  }

  function formatDate(d) {
    return d.toLocaleDateString('fr-FR');
  }

  function formatTime(d) {
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ============================================
  // إنشاء صف في الجدول
  // ============================================

  function buildTableRow(m) {
    const p = m.products || {};

    const productName = p.name || '—';
    const qty = Number(m.quantity || 0);
    const unit = p.unit || '—';

    const price = Number(p.sell_price || 0);
    const total = qty * price;

    const userName = m.profiles?.full_name || '—';

    const dateObj = new Date(m.created_at);
    const dateStr = formatDate(dateObj);
    const timeStr = formatTime(dateObj);

    return `
      <tr>
        <td class="time-cell" dir="ltr">${timeStr}</td>

        <td class="date-cell">${dateStr}</td>

        <td class="user-cell">${userName}</td>

        <td class="product-cell">${productName}</td>

        <td class="qty-cell">${qty}</td>

        <td class="unit-cell">${unit}</td>

        <td class="price-cell" dir="ltr">
          ${price.toFixed(2)}
          <span class="currency-symbol">DH</span>
        </td>

        <td class="total-cell" dir="ltr">
          ${total.toFixed(2)}
          <span class="currency-symbol">DH</span>
        </td>
      </tr>
    `;
  }

  // ============================================
  // تحميل التقرير
  // ============================================

  async function loadReport() {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px;color:#a3a3a3;">
          <i class="fas fa-spinner fa-spin"></i>
          ${tr('loading', 'Loading...')}
        </td>
      </tr>
    `;

    paginationContainer.innerHTML = '';

    const { start, end } = getDateRange(currentPeriod);

    if (!start || !end) return;

    currentStartDate = start;
    currentEndDate = end;

    const rangeStr = `${formatDate(start)} — ${formatDate(end)}`;
    dateRangeText.textContent = rangeStr;

    try {
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
            sell_price_enabled,
            unit
          ),
          profiles (full_name)
        `)
        .eq('organization_id', orgId)
        .eq('type', 'out')
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allItems = movements || [];

      totalItems = allItems.length;

      let totalValue = 0;
      let totalQtyAll = 0;

      allItems.forEach(m => {
        const qty = Number(m.quantity || 0);
        const price = Number(m.products?.sell_price || 0);

        totalValue += qty * price;
        totalQtyAll += qty;
      });

      // إجمالي الكميات
      document.getElementById('sum-qty').textContent =
        totalQtyAll.toLocaleString();

      // إجمالي قيمة الإخراج
      document.getElementById('sum-total').innerHTML = `
        <span dir="ltr" style="display:inline-flex;align-items:baseline;gap:4px;">
          ${totalValue.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
          <span class="summary-currency">DH</span>
        </span>
      `;

      document.getElementById('footer-qty').textContent =
        totalQtyAll.toLocaleString();

      document.getElementById('footer-value').innerHTML = `
        ${totalValue.toLocaleString('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
        <span class="currency-symbol">DH</span>
      `;

      if (totalItems === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="reports-empty">
                <i class="fas fa-chart-bar"></i>
                <p>${tr('reports_no_data', 'No data for this period')}</p>
              </div>
            </td>
          </tr>
        `;

        renderPagination(0, 0, 0);
        return;
      }

      const totalPages = Math.ceil(totalItems / PAGE_SIZE);

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      const startIndex = (currentPage - 1) * PAGE_SIZE;

      const pageItems = allItems.slice(
        startIndex,
        startIndex + PAGE_SIZE
      );

      tbody.innerHTML = pageItems.map(buildTableRow).join('');

      renderPagination(
        totalPages,
        startIndex,
        pageItems.length
      );

    } catch (err) {
      console.error(err);

      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="alert alert-error">
            ${err.message}
          </td>
        </tr>
      `;

      renderPagination(0, 0, 0);
    }
  }

  // ============================================
  // ترقيم الصفحات والتنقل
  // ============================================

  function renderPagination(totalPages, startIndex, pageItemsCount) {
    const isArabic =
      window.getCurrentLang &&
      window.getCurrentLang() === 'ar';

    const prevIcon = isArabic ? 'right' : 'left';
    const nextIcon = isArabic ? 'left' : 'right';

    let html = `
      <div class="pagination-controls">
        <button
          class="pagination-btn period-nav-btn"
          data-period-nav="prev"
        >
          <i class="fas fa-chevron-${prevIcon}"></i>
        </button>
    `;

    if (totalPages > 1) {
      html += `<div class="pagination-pages">`;

      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (startPage > 1) {
        html += `
          <button class="pagination-btn" data-page="1">1</button>
        `;

        if (startPage > 2) {
          html += `<span style="align-self:center;color:#737373;">...</span>`;
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        html += `
          <button
            class="pagination-btn ${i === currentPage ? 'active' : ''}"
            data-page="${i}"
          >
            ${i}
          </button>
        `;
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          html += `<span style="align-self:center;color:#737373;">...</span>`;
        }

        html += `
          <button class="pagination-btn" data-page="${totalPages}">
            ${totalPages}
          </button>
        `;
      }

      html += `</div>`;
    }

    html += `
        <button
          class="pagination-btn period-nav-btn"
          data-period-nav="next"
        >
          <i class="fas fa-chevron-${nextIcon}"></i>
        </button>
      </div>
    `;

    if (totalItems > 0) {
      html += `
        <div class="pagination-info">
          ${tr('reports_showing', 'عرض')}
          ${startIndex + 1}–${startIndex + pageItemsCount}
          ${tr('reports_of', 'من')}
          ${totalItems}
          ${tr('reports_operations', 'عملية')}
        </div>
      `;
    }

    paginationContainer.innerHTML = html;

    paginationContainer
      .querySelector('[data-period-nav="prev"]')
      .addEventListener('click', () => movePeriod(-1));

    paginationContainer
      .querySelector('[data-period-nav="next"]')
      .addEventListener('click', () => movePeriod(1));

    paginationContainer
      .querySelectorAll('[data-page]')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = Number(btn.dataset.page);
          loadReport();
        });
      });
  }

  // ============================================
  // تحريك الفترة السابقة والتالية
  // ============================================

  function movePeriod(direction) {
    if (currentPeriod === 'custom') {
      if (!currentStartDate || !currentEndDate) return;

      const days = Math.round(
        (
          new Date(
            currentEndDate.getFullYear(),
            currentEndDate.getMonth(),
            currentEndDate.getDate()
          ) -
          new Date(
            currentStartDate.getFullYear(),
            currentStartDate.getMonth(),
            currentStartDate.getDate()
          )
        ) / 86400000
      );

      const shiftDays = days + 1;

      currentStartDate.setDate(
        currentStartDate.getDate() + direction * shiftDays
      );

      currentEndDate.setDate(
        currentEndDate.getDate() + direction * shiftDays
      );

      if (fp) {
        fp.setDate(
          [currentStartDate, currentEndDate],
          false
        );
      }

    } else if (currentPeriod === 'today') {
      anchorDate.setDate(
        anchorDate.getDate() + direction
      );

    } else if (currentPeriod === 'week') {
      anchorDate.setDate(
        anchorDate.getDate() + (direction * 7)
      );

    } else if (currentPeriod === 'month') {
      anchorDate.setMonth(
        anchorDate.getMonth() + direction
      );

    } else if (currentPeriod === 'year') {
      anchorDate.setFullYear(
        anchorDate.getFullYear() + direction
      );
    }

    currentPage = 1;
    loadReport();
  }

  // ============================================
  // أزرار الفترات
  // ============================================

  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document
        .querySelectorAll('.period-tab')
        .forEach(t => t.classList.remove('active'));

      tab.classList.add('active');

      currentPeriod = tab.dataset.period;
      currentPage = 1;

      if (currentPeriod === 'custom') {
        customDateRange.style.display = 'block';

        if (!fp && typeof flatpickr !== 'undefined') {
          initDatePicker();
        }

        if (fp) fp.open();

      } else {
        customDateRange.style.display = 'none';
        anchorDate = new Date();
        loadReport();
      }
    });
  });

  // ============================================
  // التقويم المخصص
  // ============================================

  function initDatePicker() {
    if (fp) fp.destroy();

    const lang = window.getCurrentLang
      ? window.getCurrentLang()
      : 'ar';

    const locale =
      (lang === 'ar' && flatpickr.l10ns.ar)
        ? flatpickr.l10ns.ar
        : 'default';

    fp = flatpickr(datePickerInput, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      locale: locale,

      onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
          currentPeriod = 'custom';
          currentPage = 1;

          currentStartDate = new Date(selectedDates[0]);
          currentStartDate.setHours(0, 0, 0, 0);

          currentEndDate = new Date(selectedDates[1]);
          currentEndDate.setHours(23, 59, 59, 999);

          loadReport();
        }
      }
    });
  }

  // ============================================
  // الطباعة
  // ============================================

  function printReport() {
    if (!currentStartDate || !currentEndDate) {
      alert(tr('reports_no_data', 'No data to print'));
      return;
    }

    const startIso = currentStartDate.toISOString();
    const endIso = currentEndDate.toISOString();

    const url =
      `/reports-out-print.html?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&period=${encodeURIComponent(currentPeriod)}`;

    window.open(url, '_blank');
  }

  printBtn.addEventListener('click', printReport);

  // ============================================
  // تشغيل التقرير
  // ============================================

  if (typeof flatpickr !== 'undefined') {
    initDatePicker();
  }

  await loadReport();
});
