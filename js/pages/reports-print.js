
// ============================================
// صفحة طباعة التقارير (Reports Print)
// MyStock - Product Additions Report
// ✅ جلب جميع عمليات الإضافة على دفعات
// ✅ عدم التقيد بالحد الافتراضي لنتائج Supabase
// ✅ حساب إجمالي الكمية والقيمة لجميع العمليات
// ✅ إنشاء صفوف الجدول تدريجياً
// ✅ توقيع وختم داخل مستطيلين متطابقين
// ✅ زر الطباعة في أسفل التقرير
// ✅ نفس طريقة زر الطباعة في تقرير الإخراج
// ✅ عرض تاريخ ووقت الطباعة
// ============================================

document.addEventListener('DOMContentLoaded', async () => {

  const container = document.getElementById('print-content');
  if (!container) return;

  // ============================================
  // الترجمة
  // ============================================

  const tr = (key, fallback) => {
    if (window.t) {
      const value = window.t(key);
      if (value && value !== key) return value;
    }

    return fallback || key;
  };

  // ============================================
  // حماية النصوص
  // ============================================

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
  // انتظار إطار المتصفح
  // ============================================

  function nextFrame() {
    return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  }

  // ============================================
  // قراءة الفترة من الرابط
  // ============================================

  const params = new URLSearchParams(window.location.search);

  const startIso = params.get('start');
  const endIso = params.get('end');
  const periodKey = params.get('period');

  if (!startIso || !endIso) {
    container.innerHTML =
      '<h2 style="text-align:center;color:red;">خطأ: تواريخ غير صالحة</h2>';
    return;
  }

  const start = new Date(startIso);
  const end = new Date(endIso);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    container.innerHTML =
      '<h2 style="text-align:center;color:red;">خطأ: تواريخ غير صالحة</h2>';
    return;
  }

  try {

    // ============================================
    // التحقق من تسجيل الدخول
    // ============================================

    const user = await requireAuth();
    if (!user) return;

    if (window.applyLanguage) {
      window.applyLanguage();
    }

    // ============================================
    // جلب المؤسسة
    // ============================================

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const orgName = profile.organizations?.name || 'MyStock';

    // ============================================
    // جلب جميع عمليات الإضافة على دفعات
    // ============================================

    const batchSize = 500;
    let from = 0;
    const items = [];
    let hasMore = true;

    container.innerHTML = `
      <div class="loading" style="text-align:center;padding:30px;">
        <i class="fas fa-spinner fa-spin"
           style="font-size:30px;color:#2563eb;"></i>
        <p>${tr('reports_loading', 'جاري تحميل التقرير...')}</p>
      </div>
    `;

    while (hasMore) {

      const to = from + batchSize - 1;

      const { data: movements, error } = await db
        .from('stock_movements')
        .select(`
          id,
          quantity,
          created_at,
          performed_by,
          products (
            name,
            price,
            unit,
            suppliers (name)
          ),
          profiles (full_name)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('type', 'in')
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const batch = movements || [];

      items.push(...batch);

      from += batchSize;
      hasMore = batch.length === batchSize;

      await nextFrame();
    }

    // ============================================
    // حساب الإجماليات
    // ============================================

    let totalQty = 0;
    let totalVal = 0;

    items.forEach(m => {
      const quantity = Number(m.quantity || 0);
      const price = Number(m.products?.price || 0);

      totalQty += quantity;
      totalVal += quantity * price;
    });

    // ============================================
    // تنسيق التاريخ والوقت
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

    function formatQuantity(number) {
      return Number(number || 0).toLocaleString('fr-FR', {
        maximumFractionDigits: 2
      });
    }

    // ============================================
    // أسماء الفترات
    // ============================================

    const periodMap = {
      today: tr('reports_today', 'اليوم'),
      week: tr('reports_week', 'أسبوع'),
      month: tr('reports_month', 'شهر'),
      year: tr('reports_year', 'سنة'),
      custom: tr('reports_custom', 'مخصص')
    };

    // ============================================
    // تاريخ ووقت الطباعة
    // ============================================

    const printDate = new Date();

    // ============================================
    // إنشاء هيكل التقرير
    // ============================================

    container.innerHTML = `

      <div class="print-header">

        <h1>${escapeHTML(orgName)}</h1>

        <h2>
          ${tr('reports_add_products', 'تقرير إضافة المنتجات')}
        </h2>

        <div class="print-meta">

          <span>
            <strong>
              ${tr('reports_period_type', 'نوع الفترة')}:
            </strong>
            ${periodMap[periodKey] || '—'}
          </span>

          <span>
            <strong>
              ${tr('reports_date_range', 'الفترة المختارة')}:
            </strong>
            ${formatDate(start)} — ${formatDate(end)}
          </span>

          <span>
            <strong>
              ${tr('reports_print_date', 'تاريخ الطباعة')}:
            </strong>
            ${formatDate(printDate)} ${formatTime(printDate)}
          </span>

        </div>
      </div>

      <div class="summary-row">

        <div class="summary-box">
          <div class="summary-title">
            ${tr('reports_ops_count', 'عدد العمليات')}
          </div>

          <div class="summary-val">
            ${items.length}
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-title">
            ${tr('reports_total_added', 'إجمالي الإضافات')}
          </div>

          <div class="summary-val" dir="ltr">
            ${formatNumber(totalVal)}
            <span class="currency-symbol">DH</span>
          </div>
        </div>

      </div>

      <table class="report-table">

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

        <tbody id="report-rows"></tbody>

        <tfoot>
          <tr>
            <td colspan="5" style="text-align:end;">
              ${tr('reports_grand_total', 'المجموع الكلي')}
            </td>

            <td>${formatQuantity(totalQty)}</td>

            <td></td>

            <td dir="ltr">
              ${formatNumber(totalVal)}
              <span class="currency-symbol">DH</span>
            </td>
          </tr>
        </tfoot>

      </table>

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

      <!-- زر الطباعة -->

      <div class="no-print"
           style="text-align:center;margin-top:20px;">

        <button
          type="button"
          id="print-report-btn"
          onclick="window.print()"
          style="
            border:none;
            background:#000;
            color:#fff;
            padding:10px 25px;
            cursor:pointer;
            border-radius:4px;
            font-size:14px;
          "
        >
          <i class="fas fa-print"></i>
          ${tr('reports_print', 'Print')}
        </button>

        <p id="print-status"
           style="display:none;margin-top:10px;color:#b91c1c;">
        </p>

      </div>
    `;

    // ============================================
    // إنشاء صفوف الجدول تدريجياً
    // ============================================

    const tbody = document.getElementById('report-rows');

    if (items.length === 0) {

      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:20px;">
            ${tr('reports_no_data', 'لا توجد بيانات')}
          </td>
        </tr>
      `;

    } else {

      const renderBatchSize = 100;

      for (
        let i = 0;
        i < items.length;
        i += renderBatchSize
      ) {

        const batch = items.slice(i, i + renderBatchSize);

        const rowsHtml = batch.map(m => {

          const product = m.products || {};
          const date = new Date(m.created_at);

          const quantity = Number(m.quantity || 0);
          const price = Number(product.price || 0);
          const itemTotal = quantity * price;

          return `
            <tr>
              <td>${formatTime(date)}</td>
              <td>${formatDate(date)}</td>

              <td>
                ${escapeHTML(m.profiles?.full_name || '—')}
              </td>

              <td>
                ${escapeHTML(product.suppliers?.name || '—')}
              </td>

              <td>
                ${escapeHTML(product.name || '—')}
              </td>

              <td>
                ${formatQuantity(quantity)}
                ${escapeHTML(product.unit || '')}
              </td>

              <td dir="ltr">
                ${formatNumber(price)}
                <span class="currency-symbol">DH</span>
              </td>

              <td dir="ltr">
                ${formatNumber(itemTotal)}
                <span class="currency-symbol">DH</span>
              </td>
            </tr>
          `;

        }).join('');

        tbody.insertAdjacentHTML('beforeend', rowsHtml);

        await nextFrame();
      }
    }

    // ============================================
    // عنوان الصفحة
    // ============================================

    document.title = tr(
      'reports_add_products',
      'تقرير إضافة المنتجات'
    );

    // ============================================
    // التحقق من زر الطباعة
    // ============================================

    const printButton = document.getElementById('print-report-btn');
    const printStatus = document.getElementById('print-status');

    if (printButton) {

      // إظهار رسالة فقط إذا لم تكن الطباعة مدعومة
      printButton.onclick = function () {

        if (typeof window.print !== 'function') {

          if (printStatus) {
            printStatus.textContent =
              'الطباعة غير مدعومة في المتصفح الحالي.';
            printStatus.style.display = 'block';
          }

          return false;
        }

        if (printStatus) {
          printStatus.style.display = 'none';
        }

        window.print();

      };
    }

  } catch (err) {

    console.error('Reports Print Error:', err);

    container.innerHTML = `
      <h2 style="text-align:center;color:red;">
        ${tr('reports_error_loading', 'Error loading report')}
      </h2>

      <p style="text-align:center;">
        ${escapeHTML(err.message)}
      </p>
    `;

  }

});
