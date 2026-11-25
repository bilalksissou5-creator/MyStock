// ============================================
// صفحة طباعة التقارير (Reports Print)
// ✅ تصحيح اتجاه العملة والترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  if (window.applyLanguage) window.applyLanguage();
  
  // ✅ دالة ترجمة محسنة (تتعامل مع المفاتيح الناقصة)
  const tr = (key, fallback) => {
    if (window.t) {
      const val = window.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  };

  const params = new URLSearchParams(window.location.search);
  const startIso = params.get('start');
  const endIso = params.get('end');
  const periodKey = params.get('period');

  const container = document.getElementById('print-content');

  if (!startIso || !endIso) {
    container.innerHTML = '<h2 style="text-align:center; color:red;">خطأ: تواريخ غير صالحة</h2>';
    return;
  }

  const start = new Date(startIso);
  const end = new Date(endIso);

  // جلب اسم المنظمة
  const { data: profile } = await db.from('profiles').select('organization_id, organizations(name)').eq('id', user.id).single();
  if (!profile?.organization_id) {
    container.innerHTML = '<h2 style="text-align:center; color:red;">Organization not found</h2>';
    return;
  }
  
  const orgName = profile.organizations?.name || 'MyStock';

  // جلب جميع البيانات في الفترة المحددة
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

  if (error) {
    container.innerHTML = `<h2 style="text-align:center; color:red;">${error.message}</h2>`;
    return;
  }

  // حساب المجاميع
  let totalQty = 0;
  let totalVal = 0;
  movements.forEach(m => {
    const q = Number(m.quantity || 0);
    const p = Number(m.products?.price || 0);
    totalQty += q;
    totalVal += q * p;
  });

  const formatDate = d => d.toLocaleDateString('fr-FR');
  const formatTime = d => d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit'});
  
  const periodMap = {
    'today': tr('reports_today', 'اليوم'),
    'week': tr('reports_week', 'أسبوع'),
    'month': tr('reports_month', 'شهر'),
    'year': tr('reports_year', 'سنة'),
    'custom': tr('reports_custom', 'مخصص')
  };

  // بناء صفوف الجدول
  let rowsHtml = movements.map(m => {
    const p = m.products || {};
    const date = new Date(m.created_at);
    const itemTotal = Number(m.quantity || 0) * Number(p.price || 0);
    
    return `
      <tr>
        <td>${formatTime(date)}</td>
        <td>${formatDate(date)}</td>
        <td>${m.profiles?.full_name || '—'}</td>
        <td>${p.suppliers?.name || '—'}</td>
        <td>${p.name || '—'}</td>
        <td>${m.quantity} ${p.unit || ''}</td>
        <!-- ✅ التصحيح: إضافة dir="ltr" للخلايا التي تحتوي على أرقام وعملة -->
        <td dir="ltr">${Number(p.price || 0).toFixed(2)} <span class="currency-symbol">DH</span></td>
        <td dir="ltr">${itemTotal.toFixed(2)} <span class="currency-symbol">DH</span></td>
      </tr>
    `;
  }).join('');

  if (movements.length === 0) {
    rowsHtml = `<tr><td colspan="8" style="text-align:center; padding:20px;">${tr('reports_no_data', 'لا توجد بيانات')}</td></tr>`;
  }

  // بناء الصفحة
  container.innerHTML = `
    <div class="print-header">
      <h1>${orgName}</h1>
      <h2>${tr('reports_add_products', 'تقرير إضافة المنتجات')}</h2>
      <div class="print-meta">
        <span><strong>${tr('reports_period_type', 'نوع الفترة')}:</strong> ${periodMap[periodKey] || '—'}</span>
        <span><strong>${tr('reports_date_range', 'الفترة المختارة')}:</strong> ${formatDate(start)} — ${formatDate(end)}</span>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-box">
        <div class="summary-title">${tr('reports_ops_count', 'عدد العمليات')}</div>
        <div class="summary-val">${movements.length}</div>
      </div>
      <div class="summary-box">
        <div class="summary-title">${tr('reports_total_added', 'إجمالي الإضافات')}</div>
        <!-- ✅ التصحيح: إضافة dir="ltr" هنا أيضاً -->
        <div class="summary-val" dir="ltr">${totalVal.toFixed(2)} <span class="currency-symbol">DH</span></div>
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
          <td colspan="5" style="text-align:end;">${tr('reports_grand_total', 'المجموع الكلي')}</td>
          <td>${totalQty}</td>
          <td></td>
          <td dir="ltr">${totalVal.toFixed(2)} <span class="currency-symbol">DH</span></td>
        </tr>
      </tfoot>
    </table>

    <div class="signatures">
      <div class="sig-box">
        <p>${tr('reports_manager_sig', 'توقيع المسؤول')}</p>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <p>${tr('reports_org_stamp', 'ختم المؤسسة')}</p>
        <div class="stamp-circle"></div>
      </div>
    </div>
  `;

  // فتح نافذة الطباعة تلقائياً بعد تحميل الصفحة
  setTimeout(() => {
    window.print();
  }, 800);
});