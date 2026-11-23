// ============================================
// صفحة التقارير (Reports)
// ✅ تقرير إضافة المنتجات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('reports.html');
  if (window.applyLanguage) window.applyLanguage();
  const tr = (key, fallback) => (window.t ? (window.t(key) || fallback) : (fallback || key));

  document.title = tr('reports_title', 'Reports');

  const main = document.getElementById('main-content');
  const { data: profile } = await db.from('profiles').select('organization_id').eq('id', user.id).single();
  
  if (!profile?.organization_id) {
    main.innerHTML = `<div class="alert alert-error">Organization not found</div>`;
    return;
  }

  const orgId = profile.organization_id;

  let currentPeriod = 'month'; // 'today', 'week', 'month', 'year'
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let totalItems = 0;
  let currentStartDate, currentEndDate;

  // ✅ بناء هيكل الصفحة
  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('reports_title', 'Reports')}</h2>
    </div>

    <div class="reports-wrapper">
      
      <!-- بطاقة الفلاتر -->
      <div class="filters-card">
        <h3 class="filters-title">
          <i class="fas fa-chart-pie" style="color: #2563eb;"></i>
          ${tr('reports_add_products', 'Product Addition Report')}
        </h3>
        
        <div class="period-tabs">
          <button class="period-tab" data-period="today">${tr('reports_today', 'Today')}</button>
          <button class="period-tab" data-period="week">${tr('reports_week', 'Week')}</button>
          <button class="period-tab active" data-period="month">${tr('reports_month', 'Month')}</button>
          <button class="period-tab" data-period="year">${tr('reports_year', 'Year')}</button>
        </div>

        <div class="date-range-display" id="date-range-display">
          <i class="fas fa-calendar-alt"></i>
          <span id="date-range-text">—</span>
        </div>
      </div>

      <!-- بطاقات الإحصائيات -->
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

      <!-- بطاقة الجدول -->
      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">${tr('reports_details_table', 'Details Table')}</h3>
        </div>
        <div class="table-wrapper">
          <table class="reports-table">
            <thead>
              <tr>
                <th>${tr('reports_supplier', 'Supplier')}</th>
                <th>${tr('reports_product', 'Product')}</th>
                <th>${tr('reports_category', 'Category')}</th>
                <th>${tr('reports_qty', 'Quantity')}</th>
                <th>${tr('reports_unit', 'Unit')}</th>
              </tr>
            </thead>
            <tbody id="reports-tbody">
              <tr><td colspan="5" style="text-align:center; padding:40px; color:#a3a3a3;">${tr('loading', 'Loading...')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pagination" id="pagination">
          <!-- سيتم بناؤه برمجياً -->
        </div>
      </div>

    </div>
  `;

  const tbody = document.getElementById('reports-tbody');
  const dateRangeText = document.getElementById('date-range-text');
  const paginationContainer = document.getElementById('pagination');

  // ✅ دالة حساب الفترة الزمنية
  function getDateRange(period) {
    const now = new Date();
    let start, end;
    
    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }
    
    return { start, end };
  }

  // ✅ تنسيق التاريخ
  function formatDate(d) {
    return d.toLocaleDateString('fr-FR'); // 01/11/2026
  }

  // ✅ جلب البيانات وعرضها
  async function loadReport() {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#a3a3a3;"><i class="fas fa-spinner fa-spin"></i> ${tr('loading', 'Loading...')}</td></tr>`;
    paginationContainer.innerHTML = '';

    const { start, end } = getDateRange(currentPeriod);
    currentStartDate = start;
    currentEndDate = end;

    // تحديث نص الفترة
    dateRangeText.textContent = `${formatDate(start)} — ${formatDate(end)}`;

    try {
      // 1. جلب حركات الإضافة في الفترة المحددة
      const { data: movements, error: movError } = await db
        .from('stock_movements')
        .select('*, products(id, name, category, sku, suppliers(name))')
        .eq('organization_id', orgId)
        .eq('type', 'in')
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (movError) throw movError;

      const allItems = movements || [];
      totalItems = allItems.length;

      // 2. حساب الإحصائيات
      let totalQty = 0;
      let totalValue = 0;
      allItems.forEach(m => {
        const qty = Number(m.quantity || 0);
        const price = Number(m.products?.price || 0);
        totalQty += qty;
        totalValue += qty * price;
      });

      document.getElementById('sum-ops').textContent = totalItems.toLocaleString();
      document.getElementById('sum-total').textContent = `${totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

      if (totalItems === 0) {
        tbody.innerHTML = `
          <tr><td colspan="5">
            <div class="reports-empty">
              <i class="fas fa-chart-bar"></i>
              <p>${tr('reports_no_data', 'No data for this period')}</p>
            </div>
          </td></tr>
        `;
        paginationContainer.innerHTML = '';
        return;
      }

      // 3. ترقيم الصفحات
      const totalPages = Math.ceil(totalItems / PAGE_SIZE);
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const pageItems = allItems.slice(startIndex, startIndex + PAGE_SIZE);

      // 4. رسم الجدول
      tbody.innerHTML = pageItems.map(m => {
        const p = m.products || {};
        const supplierName = p.suppliers?.name || '—';
        const productName = p.name || '—';
        const category = p.category || '—';
        const qty = Number(m.quantity || 0);
        const unit = 'قطعة'; // افتراضي (يمكن جلبه من المنتج)

        return `
          <tr>
            <td>${supplierName}</td>
            <td>${productName}</td>
            <td><span class="category-badge">${category}</span></td>
            <td class="qty-cell">${qty}</td>
            <td class="unit-cell">${unit}</td>
          </tr>
        `;
      }).join('');

      // 5. رسم الترقيم
      renderPagination(totalPages, startIndex, pageItems.length);

    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="5" class="alert alert-error">${err.message}</td></tr>`;
    }
  }

  // ✅ دالة رسم الترقيم
  function renderPagination(totalPages, startIndex, pageItemsCount) {
    const startNum = startIndex + 1;
    const endNum = startIndex + pageItemsCount;

    let paginationHtml = `
      <div class="pagination-info">
        ${tr('reports_showing', 'Showing')} ${startNum}–${endNum} ${tr('reports_of', 'of')} ${totalItems} ${tr('reports_operations', 'operations')}
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-${window.getCurrentLang && window.getCurrentLang() === 'ar' ? 'right' : 'left'}"></i>
        </button>
    `;

    // إظهار 5 صفحات كحد أقصى (مثل جوجل)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
      paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) paginationHtml += `<span style="align-self:center; color:#737373;">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) paginationHtml += `<span style="align-self:center; color:#737373;">...</span>`;
      paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `
        <button class="pagination-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>
          <i class="fas fa-chevron-${window.getCurrentLang && window.getCurrentLang() === 'ar' ? 'left' : 'right'}"></i>
        </button>
      </div>
    `;

    paginationContainer.innerHTML = paginationHtml;

    // ربط الأحداث
    paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'prev') currentPage = Math.max(1, currentPage - 1);
        else if (page === 'next') currentPage = Math.min(totalPages, currentPage + 1);
        else currentPage = Number(page);
        
        loadReport();
      });
    });
  }

  // ✅ أحداث التبويبات
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      currentPage = 1;
      loadReport();
    });
  });

  // ✅ التحميل الأولي
  await loadReport();
});