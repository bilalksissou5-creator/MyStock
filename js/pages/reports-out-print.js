
// ============================================
// طباعة تقرير إخراج المنتجات
// MyStock - Reports Out Print
// ✅ اسم المؤسسة في أعلى التقرير
// ✅ نفس تنسيق تقرير إضافة المنتجات
// ✅ A4 Portrait
// ✅ ملخص العمليات
// ✅ جدول الإخراج
// ✅ التوقيع والختم
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('print-container');

  if (!container) return;

  // ============================================
  // الترجمة
  // ============================================

  const tr = (key, fallback) =>
    (window.t ? (window.t(key) || fallback) : (fallback || key));

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
  // قراءة الفترة من الرابط
  // ============================================

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
    // ============================================
    // التحقق من تسجيل الدخول
    // ============================================

    const user = await requireAuth();

    if (!user) return;

    if (window.applyLanguage) {
      window.applyLanguage();
    }

    // ============================================
    // جلب المؤسسة المرتبطة بالمستخدم
    // ============================================

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
    // جلب اسم المؤسسة
    // ============================================

    const { data: organization, error: orgError } = await db
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    if (orgError) throw orgError;

    const organizationName = organization?.name || '—';

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
    // تنسيق التاريخ والوقت والأرقام
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
          <td>${formatTime(date)}</td>

          <td>${formatDate(date)}</td>

          <td>
            ${escapeHTML(m.profiles?.full_name || '—')}
          </td>

          <td class="product-name">
            ${escapeHTML(product.name || '—')}
          </td>

          <td>${formatQuantity(qty)}</td>

          <td>
            ${escapeHTML(product.unit || '—')}
          </td>

          <td>
            ${formatNumber(price)}
            <span class="currency-symbol">DH</span>
          </td>

          <td>
            ${formatNumber(total)}
            <span class="currency-symbol">DH</span>
          </td>
        </tr>
      `;
    }).join('');

    // ============================================
    // عرض التقرير
    // ============================================

    container.innerHTML = `
      <!-- رأس التقرير -->

      <div class="print-header">

        <h1>${escapeHTML(organizationName)}</h1>

        <h2>
          ${tr(
            'reports_out_title',
            'Outgoing Products Report'
          )}
        </h2>

        <div class="print-meta">

          <span>
            <strong>
              ${tr('reports_period', 'Report Period')}:
            </strong>

            ${formatDate(start)} — ${formatDate(end)}
          </span>

          <span>
            <strong>
              ${tr('reports_print_date', 'Print Date')}:
            </strong>

            ${formatDate(new Date())}
          </span>

        </div>

      </div>

      <!-- ملخص التقرير -->

      <div class="summary-row">

        <div class="summary-box">

          <div class="summary-title">
            ${tr(
              'reports_out_total_qty',
              'Total Outgoing Quantity'
            )}
          </div>

          <div class="summary-val">
            ${formatQuantity(totalQty)}
          </div>

        </div>

        <div class="summary-box">

          <div class="summary-title">
            ${tr(
              'reports_out_total_value',
              'Total Outgoing Value'
            )}
          </div>

          <div class="summary-val" dir="ltr">
            ${formatNumber(totalValue)}

            <span class="currency-symbol">DH</span>
          </div>

        </div>

      </div>

      <!-- جدول العمليات -->

      <table class="report-table">

        <thead>
          <tr>
            <th>
              ${tr('reports_time', 'الوقت')}
            </th>

            <th>
              ${tr('reports_date_only', 'التاريخ')}
            </th>

            <th>
              ${tr('reports_user', 'المستخدم')}
            </th>

            <th>
              ${tr('reports_product', 'المنتج')}
            </th>

            <th>
              ${tr('reports_qty', 'الكمية')}
            </th>

            <th>
              ${tr('reports_unit', 'الوحدة')}
            </th>

            <th>
              ${tr('reports_sell_price', 'سعر البيع')}
            </th>

            <th>
              ${tr('reports_total_value', 'إجمالي القيمة')}
            </th>
          </tr>
        </thead>

        <tbody>
          ${
            rows ||
            `
              <tr>
                <td colspan="8" class="no-data">
                  ${tr(
                    'reports_no_data',
                    'No data for this period'
                  )}
                </td>
              </tr>
            `
          }
        </tbody>

        <tfoot>
          <tr>

            <td colspan="4">
              ${tr(
                'reports_grand_total',
                'المجموع الكلي'
              )}
            </td>

            <td>
              ${formatQuantity(totalQty)}
            </td>

            <td></td>

            <td></td>

            <td>
              ${formatNumber(totalValue)}
              <span class="currency-symbol">DH</span>
            </td>

          </tr>
        </tfoot>

      </table>

      <!-- التوقيع والختم -->

      <table class="sig-table">

        <tr>

          <td>
            <div class="sig-line">
              <p>
                ${tr(
                  'reports_manager_sig',
                  'توقيع المسؤول'
                )}
              </p>
            </div>
          </td>

          <td>
            <div class="stamp-circle">
              <p>
                ${tr(
                  'reports_org_stamp',
                  'ختم المؤسسة'
                )}
              </p>
            </div>
          </td>

        </tr>

      </table>

      <!-- زر الطباعة -->

      <div class="no-print" style="text-align:center; margin-top:20px;">

        <button
          type="button"
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

      </div>
    `;

    // ============================================
    // عنوان الصفحة
    // ============================================

    document.title = tr(
      'reports_out_title',
      'Outgoing Products Report'
    );

  } catch (err) {

    console.error('Reports Out Print Error:', err);

    container.innerHTML = `
      <div class="no-data">

        ${tr(
          'reports_error_loading',
          'Error loading report'
        )}

        <br>

        ${escapeHTML(err.message)}

      </div>
    `;
  }
});
