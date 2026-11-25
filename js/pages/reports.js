// ============================================
// صفحة التقارير (Reports)
// ✅ تصميم طباعة متكامل ومطابق للمواصفات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('reports.html');
  if (window.applyLanguage) window.applyLanguage();

  const tr = (key, fallback) => (window.t ? (window.t(key) || fallback) : (fallback || key));
  document.title = tr('reports_title', 'Reports');

  const main = document.getElementById('main-content');
  const { data: profile } = await db.from('profiles').select('organization_id, organizations(name)').eq('id', user.id).single();
  
  if (!profile?.organization_id) {
    main.innerHTML = `<div class="alert alert-error">Organization not found</div>`;
    return;
  }

  const orgId = profile.organization_id;
  const orgName = profile.organizations?.name || 'MyStock';

  let currentPeriod = 'today';
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let totalItems = 0;
  let allReportItems = [];
  
  let anchorDate = new Date();
  let currentStartDate, currentEndDate;
  let fp = null;

  main.innerHTML = `
    <div class="page-header no-print">
      <h2>${tr('reports_title', 'Reports')}</h2>
    </div>

    <div class="reports-wrapper">

      <div class="filters-card no-print">
        <h3 class="filters-title">
          <i class="fas fa-chart-pie" style="color:#2563eb;"></i>
          ${tr('reports_add_products', 'Product Addition Report')}
        </h3>

        <div class="period-tabs">
          <button class="period-tab active" data-period="today">${tr('reports_today', 'Today')}</button>
          <button class="period-tab" data-period="week">${tr('reports_week', 'Week')}</button>
          <button class="period-tab" data-period="month">${tr('reports_month', 'Month')}</button>
          <button class="period-tab" data-period="year">${tr('reports_year', 'Year')}</button>
          <button class="period-tab" data-period="custom"><i class="fas fa-calendar-alt" style="margin-inline-end:4px;"></i>${tr('reports_custom', 'Custom')}</button>
        </div>

        <div class="custom-date-range" id="custom-date-range" style="display:none;">
          <label>${tr('reports_date_range', 'Date Range')}</label>
          <input type="text" id="date-picker" placeholder="${tr('reports_select_dates', 'Select dates...')}" readonly>
        </div>

        <div class="date-range-display" id="date-range-display">
          <i class="fas fa-calendar-alt"></i>
          <span id="date-range-text">—</span>
        </div>
      </div>

      <!-- ✅ رأس التقرير للطباعة فقط (يظهر أولاً) -->
      <div class="print-only-header">
        <h1>${orgName}</h1>
        <h2>${tr('reports_add_products', 'Product Addition Report')}</h2>
        <div class="print-header-info">
          <p><strong>${tr('reports_period_type', 'نوع الفترة')}:</strong> <span id="print-period-name">—</span></p>
          <p><strong>${tr('reports_date_range', 'الفترة')}:</strong> <span id="print-date-range">—</span></p>
        </div>
      </div>

      <!-- ✅ بطاقات الإحصائيات (تظهر في الشاشة والطباعة) -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">${tr('reports_ops_count', 'Number of Operations')}</div>
          <div class="summary-value" id="sum-ops">—</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">${tr('reports_total_added', 'Total Additions')}</div>
          <div class="summary-value highlight" id="sum-total">—</div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-header no-print">
          <h3 class="table-title">${tr('reports_details_table', 'Details Table')}</h3>
          <button class="btn-primary" id="print-btn" style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-print"></i> ${tr('reports_print', 'Print')}
          </button>
        </div>

        <div class="table-wrapper">
          <table class="reports-table">
            <thead>
              <tr>
                <th>${tr('reports_time', 'الوقت')}</th>
                <th>${tr('reports_date_only', 'التاريخ')}</th>
                <th>${tr('reports_user', 'المستخدم')}</th>
                <th>${tr('reports_supplier', 'المورد')}</th>
                <th>${tr('reports_product', 'المنتج')}</th>
                <th>${tr('reports_qty_unit', 'الكمية والوحدة')}</th>
                <th>${tr('reports_unit_price', 'سعر الشراء')}</th>
                <th>${tr('reports_total_value', 'إجمالي القيمة')}</th>
              </tr>
            </thead>
            <tbody id="reports-tbody">
              <tr><td colspan="8" style="text-align:center;padding:40px;color:#a3a3a3;">${tr('loading', 'Loading...')}</td></tr>
            </tbody>
            <tfoot id="reports-tfoot">
              <tr>
                <td colspan="5" class="footer-label">${tr('reports_grand_total', 'المجموع الكلي')}</td>
                <td class="footer-total" id="footer-qty">0</td>
                <td></td>
                <td class="footer-total highlight" id="footer-value" dir="ltr">0.00 <span class="currency-symbol">DH</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="pagination no-print" id="pagination"></div>
      </div>
      
      <!-- ✅ منطقة التوقيعات (تظهر فقط عند الطباعة) -->
      <div class="print-only-signatures">
        <div class="signature-box">
          <p>${tr('reports_manager_sig', 'توقيع المسؤول')}</p>
          <div class="sig-line"></div>
        </div>
        <div class="signature-box">
          <p>${tr('reports_org_stamp', 'ختم المؤسسة')}</p>
          <div class="stamp-circle"></div>
        </div>
      </div>

    </div>
  `;

  const tbody = document.getElementById('reports-tbody');
  const dateRangeText = document.getElementById('date-range-text');
  const printDateRange = document.getElementById('print-date-range');
  const printPeriodName = document.getElementById('print-period-name');
  const paginationContainer = document.getElementById('pagination');
  const customDateRange = document.getElementById('custom-date-range');
  const datePickerInput = document.getElementById('date-picker');
  const printBtn = document.getElementById('print-btn');

  // ... (دوال getDateRange, formatDate, formatTime, movePeriod تبقى كما هي) ...
  function getDateRange(period) {
    if (period === 'custom') return { start: currentStartDate, end: currentEndDate };
    const now = new Date(anchorDate);
    let start, end;
    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    return { start, end };
  }

  function formatDate(d) { return d.toLocaleDateString('fr-FR'); }
  function formatTime(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }

  function getPeriodName(period) {
    switch (period) {
      case 'today': return tr('reports_today', 'Today');
      case 'week': return tr('reports_week', 'Week');
      case 'month': return tr('reports_month', 'Month');
      case 'year': return tr('reports_year', 'Year');
      case 'custom': return tr('reports_custom', 'Custom');
      default: return '—';
    }
  }

  // ✅ دالة بناء صف الجدول
  function buildTableRow(m) {
    const p = m.products || {};
    const supplierName = p.suppliers?.name || '—';
    const productName = p.name || '—';
    const qty = Number(m.quantity || 0);
    const unit = p.unit || '—';
    const price = Number(p.price || 0);
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
        <td class="supplier-cell">${supplierName}</td>
        <td class="product-cell">${productName}</td>
        <td class="qty-unit-cell">${qty} ${unit}</td>
        <td class="price-cell" dir="ltr">${price.toFixed(2)} <span class="currency-symbol">DH</span></td>
        <td class="total-cell" dir="ltr">${total.toFixed(2)} <span class="currency-symbol">DH</span></td>
      </tr>
    `;
  }

  async function loadReport() {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#a3a3a3;"><i class="fas fa-spinner fa-spin"></i> ${tr('loading', 'Loading...')}</td></tr>`;
    paginationContainer.innerHTML = '';

    const { start, end } = getDateRange(currentPeriod);
    if (!start || !end) return;

    currentStartDate = start;
    currentEndDate = end;
    
    const rangeStr = `${formatDate(start)} — ${formatDate(end)}`;
    dateRangeText.textContent = rangeStr;
    if(printDateRange) printDateRange.textContent = rangeStr;
    if(printPeriodName) printPeriodName.textContent = getPeriodName(currentPeriod);

    try {
      const { data: movements, error } = await db
        .from('stock_movements')
        .select(`
          id, quantity, created_at, performed_by,
          products (id, name, category, sku, price, unit, suppliers (name)),
          profiles (full_name)
        `)
        .eq('organization_id', orgId)
        .eq('type', 'in')
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      allReportItems = movements || [];
      totalItems = allReportItems.length;

      let totalValue = 0;
      let totalQtyAll = 0;
      allReportItems.forEach(m => {
        const qty = Number(m.quantity || 0);
        const price = Number(m.products?.price || 0);
        totalValue += qty * price;
        totalQtyAll += qty;
      });

      document.getElementById('sum-ops').textContent = totalItems.toLocaleString();
      document.getElementById('sum-total').innerHTML = `
        <span dir="ltr" style="display:inline-flex;align-items:baseline;gap:4px;">
          ${totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span class="summary-currency">DH</span>
        </span>
      `;

      document.getElementById('footer-qty').textContent = totalQtyAll.toLocaleString();
      document.getElementById('footer-value').innerHTML = `${totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="currency-symbol">DH</span>`;

      if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="reports-empty"><i class="fas fa-chart-bar"></i><p>${tr('reports_no_data', 'No data for this period')}</p></div></td></tr>`;
        renderPagination(0, 0, 0);
        return;
      }

      const totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (currentPage > totalPages) currentPage = totalPages;
      
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const pageItems = allReportItems.slice(startIndex, startIndex + PAGE_SIZE);

      tbody.innerHTML = pageItems.map(buildTableRow).join('');
      renderPagination(totalPages, startIndex, pageItems.length);

    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="8" class="alert alert-error">${err.message}</td></tr>`;
      renderPagination(0, 0, 0);
    }
  }

  function renderPagination(totalPages, startIndex, pageItemsCount) {
    const isArabic = window.getCurrentLang && window.getCurrentLang() === 'ar';
    const prevIcon = isArabic ? 'right' : 'left';
    const nextIcon = isArabic ? 'left' : 'right';
    let html = `<div class="pagination-controls"><button class="pagination-btn period-nav-btn" data-period-nav="prev"><i class="fas fa-chevron-${prevIcon}"></i></button>`;
    if (totalPages > 1) {
      html += `<div class="pagination-pages">`;
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      if (startPage > 1) { html += `<button class="pagination-btn" data-page="1">1</button>`; if (startPage > 2) html += `<span style="align-self:center;color:#737373;">...</span>`; }
      for (let i = startPage; i <= endPage; i++) html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      if (endPage < totalPages) { if (endPage < totalPages - 1) html += `<span style="align-self:center;color:#737373;">...</span>`; html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`; }
      html += `</div>`;
    }
    html += `<button class="pagination-btn period-nav-btn" data-period-nav="next"><i class="fas fa-chevron-${nextIcon}"></i></button></div>`;
    if (totalItems > 0) html += `<div class="pagination-info">${tr('reports_showing', 'عرض')} ${startIndex + 1}–${startIndex + pageItemsCount} ${tr('reports_of', 'من')} ${totalItems} ${tr('reports_operations', 'عملية')}</div>`;
    
    paginationContainer.innerHTML = html;
    paginationContainer.querySelector('[data-period-nav="prev"]').addEventListener('click', () => movePeriod(-1));
    paginationContainer.querySelector('[data-period-nav="next"]').addEventListener('click', () => movePeriod(1));
    paginationContainer.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); loadReport(); });
    });
  }

  function movePeriod(direction) {
    if (currentPeriod === 'custom') {
      if (!currentStartDate || !currentEndDate) return;
      const days = Math.round((new Date(currentEndDate.getFullYear(), currentEndDate.getMonth(), currentEndDate.getDate()) - new Date(currentStartDate.getFullYear(), currentStartDate.getMonth(), currentStartDate.getDate())) / 86400000);
      const shiftDays = days + 1;
      currentStartDate.setDate(currentStartDate.getDate() + direction * shiftDays);
      currentEndDate.setDate(currentEndDate.getDate() + direction * shiftDays);
      if (fp) fp.setDate([currentStartDate, currentEndDate], false);
    } else if (currentPeriod === 'today') {
      anchorDate.setDate(anchorDate.getDate() + direction);
    } else if (currentPeriod === 'week') {
      anchorDate.setDate(anchorDate.getDate() + (direction * 7));
    } else if (currentPeriod === 'month') {
      anchorDate.setMonth(anchorDate.getMonth() + direction);
    } else if (currentPeriod === 'year') {
      anchorDate.setFullYear(anchorDate.getFullYear() + direction);
    }
    currentPage = 1;
    loadReport();
  }

  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      currentPage = 1;
      if (currentPeriod === 'custom') {
        customDateRange.style.display = 'block';
        if (!fp) { if (typeof flatpickr !== 'undefined') initDatePicker(); }
        fp.open();
      } else {
        customDateRange.style.display = 'none';
        anchorDate = new Date();
        loadReport();
      }
    });
  });

  function initDatePicker() {
    if (fp) fp.destroy();
    const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
    const locale = (lang === 'ar' && flatpickr.l10ns.ar) ? flatpickr.l10ns.ar : 'default';
    fp = flatpickr(datePickerInput, {
      mode: 'range', dateFormat: 'Y-m-d', locale: locale,
      onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
          currentPeriod = 'custom'; currentPage = 1;
          currentStartDate = new Date(selectedDates[0]); currentStartDate.setHours(0, 0, 0, 0);
          currentEndDate = new Date(selectedDates[1]); currentEndDate.setHours(23, 59, 59, 999);
          loadReport();
        }
      }
    });
  }

  // ✅ دالة الطباعة الذكية
  function printReport() {
    if (!allReportItems || allReportItems.length === 0) {
      alert(tr('reports_no_data', 'No data to print'));
      return;
    }

    const originalBody = tbody.innerHTML;
    const originalPagination = paginationContainer.innerHTML;

    // عرض كل الصفوف للطباعة
    tbody.innerHTML = allReportItems.map(buildTableRow).join('');
    paginationContainer.innerHTML = '';

    document.body.classList.add('printing-mode');
    window.print();

    window.onafterprint = () => {
      tbody.innerHTML = originalBody;
      paginationContainer.innerHTML = originalPagination;
      document.body.classList.remove('printing-mode');
      
      // إعادة ربط أحداث الترقيم
      paginationContainer.querySelector('[data-period-nav="prev"]')?.addEventListener('click', () => movePeriod(-1));
      paginationContainer.querySelector('[data-period-nav="next"]')?.addEventListener('click', () => movePeriod(1));
      paginationContainer.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); loadReport(); });
      });

      window.onafterprint = null;
    };
  }

  printBtn.addEventListener('click', printReport);

  if (typeof flatpickr !== 'undefined') initDatePicker();
  await loadReport();
});