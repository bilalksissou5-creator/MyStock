
 // ============================================
 // صفحة طباعة التقارير (Reports Print)
 // ✅ جلب جميع عمليات الإضافة
 // ✅ حساب إجمالي الكمية والقيمة
 // ✅ توقيع وختم داخل مستطيلين متطابقين
 // ✅ زر الطباعة أسفل التقرير
 // ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  if (window.applyLanguage) window.applyLanguage();

  const tr = (key, fallback) => {
    if (window.t) {
      const val = window.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  const params = new URLSearchParams(window.location.search);
  const startIso = params.get('start');
  const endIso = params.get('end');
  const periodKey = params.get('period');

  const container = document.getElementById('print-content');
  if (!container) return;

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
    // جلب اسم المؤسسة
    // ============================================

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const orgName = profile.organizations?.name || 'MyStock';

    // ============================================
    // جلب عمليات الإضافة
    // ============================================

    const { data: movements, error } = await db
      .from('stock_movements')
      .select(`
        id, quantity, created_at, performed_by,
        products (name, price, unit, suppliers (name)),
        profiles (full_name)
      `)
      .eq('organization_id', profile.organization_id)
      .eq('type', 'in')
      .is('deleted_at', null)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const items = movements || [];

    // ============================================
    // حساب المجاميع
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

    const formatDate = d => d.toLocaleDateString('fr-FR');

    const formatTime = d => d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

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
    // بناء صفوف الجدول
    // ============================================

    let rowsHtml = items.map(m => {
      const p = m.products || {};
      const date = new Date(m.created_at);
      const quantity = Number(m.quantity || 0);
      const price = Number(p.price || 0);
      const itemTotal = quantity * price;

      return `
        <tr>
          <td>${formatTime(date)}</td>
          <td>${formatDate(date)}</td>
          <td>${escapeHTML(m.profiles?.full_name || '—')}</td>
          <td>${escapeHTML(p.suppliers?.name || '—')}</td>
          <td>${escapeHTML(p.name || '—')}</td>
          <td>${quantity} ${escapeHTML(p.unit || '')}</td>
          <td dir="ltr">
            ${price.toFixed(2)}
            <span class="currency-symbol">DH</span>
          </td>
          <td dir="ltr">
            ${itemTotal.toFixed(2)}
            <span class="currency-symbol">DH</span>
          </td>
        </tr>
      `;
    }).join('');

    if (items.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="8" style="text-align:center;padding:20px;">
            ${tr('reports_no_data', 'لا توجد بيانات')}
          </td>
        </tr>
      `;
    }

    // ============================================
    // بناء التقرير
    // ============================================

    container.innerHTML = `
      <div class="print-header">
        <h1>${escapeHTML(orgName)}</h1>

        <h2>
          ${tr('reports_add_products', 'تقرير إضافة المنتجات')}
        </h2>

        <div class="print-meta">
          <span>
            <strong>${tr('reports_period_type', 'نوع الفترة')}:</strong>
            ${periodMap[periodKey] || '—'}
          </span>

          <span>
            <strong>${tr('reports_date_range', 'الفترة المختارة')}:</strong>
            ${formatDate(start)} — ${formatDate(end)}
          </span>
        </div>
      </div>

      <div class="summary-row">
        <div class="summary-box">
          <div class="summary-title">
            ${tr('reports_ops_count', 'عدد العمليات')}
          </div>
          <div class="summary-val">${items.length}</div>
        </div>

        <div class="summary-box">
          <div class="summary-title">
            ${tr('reports_total_added', 'إجمالي الإضافات')}
          </div>
          <div class="summary-val" dir="ltr">
            ${totalVal.toFixed(2)}
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

        <tbody>
          ${rowsHtml}
        </tbody>

        <tfoot>
          <tr>
            <td colspan="5" style="text-align:end;">
              ${tr('reports_grand_total', 'المجموع الكلي')}
            </td>

            <td>${totalQty}</td>
            <td></td>

            <td dir="ltr">
              ${totalVal.toFixed(2)}
              <span class="currency-symbol">DH</span>
            </td>
          </tr>
        </tfoot>
      </table>

      <table class="sig-table">
        <tr>
          <td>
            <div class="sig-line">
              <p>${tr('reports_manager_sig', 'توقيع المسؤول')}</p>
            </div>
          </td>

          <td>
            <div class="stamp-circle">
              <p>${tr('reports_org_stamp', 'ختم المؤسسة')}</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- زر الطباعة -->
      <div class="no-print" style="text-align:center; margin-top:20px;">
        <button
          type="button"
          id="print-report-btn"
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
          ${tr('reports_print', 'طباعة')}
        </button>
      </div>
    `;

    // ============================================
    // ربط زر الطباعة بعد إنشاء التقرير
    // ============================================

    const printButton = document.getElementById('print-report-btn');

    if (printButton) {
      printButton.addEventListener('click', function () {
        window.focus();
        window.print();
      });
    }

    // ============================================
    // عنوان الصفحة
    // ============================================

    document.title = tr(
      'reports_add_products',
      'تقرير إضافة المنتجات'
    );

  } catch (err) {
    console.error('Reports Print Error:', err);

    container.innerHTML = `
      <h2 style="text-align:center;color:red;">
        ${tr('reports_error_loading', 'خطأ في تحميل التقرير')}
      </h2>
      <p style="text-align:center;">
        ${escapeHTML(err.message)}
      </p>
    `;
  }
});
