
// ============================================
// صفحة طباعة التقارير (Reports Print)
// MyStock - Product Additions Report
//
// ✅ جلب جميع عمليات الإضافة على دفعات
// ✅ عدم التقيد بالحد الافتراضي لنتائج Supabase
// ✅ حساب إجمالي الكمية والقيمة لجميع العمليات
// ✅ جدول متواصل عبر صفحات A4
// ✅ تكرار عناوين الأعمدة في الصفحات التالية
// ✅ التوقيع والختم في نهاية التقرير
// ✅ زر طباعة يدوي
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('print-content');

  if (!container) {
    console.error('Print container not found.');
    return;
  }

  // ==========================================
  // أدوات مساعدة
  // ==========================================

  const tr = (key, fallback) => {
    try {
      if (window.t) {
        const value = window.t(key);

        if (value && value !== key) {
          return value;
        }
      }
    } catch (error) {
      console.warn('Translation error:', key, error);
    }

    return fallback;
  };

  const escapeHTML = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const nextFrame = () => {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve());
    });
  };

  const getRelation = (value) => {
    if (Array.isArray(value)) {
      return value[0] || null;
    }

    return value || null;
  };

  const formatNumber = (value) => {
    const number = Number(value || 0);

    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2
    }).format(number);
  };

  const formatQuantity = (value) => {
    const number = Number(value || 0);

    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 3
    }).format(number);
  };

  const formatDate = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString(
      document.documentElement.lang || 'ar',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    );
  };

  const formatTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString(
      document.documentElement.lang || 'ar',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };

  const showError = (message) => {
    container.innerHTML = `
      <div style="
        padding: 30px;
        text-align: center;
        color: #b91c1c;
        font-size: 15px;
      ">
        ${escapeHTML(message)}
      </div>
    `;
  };

  // ==========================================
  // قراءة الفترة من الرابط
  // ==========================================

  try {
    const params = new URLSearchParams(window.location.search);

    const startParam = params.get('start');
    const endParam = params.get('end');
    const period = params.get('period') || 'today';

    if (!startParam || !endParam) {
      throw new Error('لم يتم تحديد فترة التقرير.');
    }

    const start = new Date(startParam);
    const end = new Date(endParam);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      throw new Error('فترة التقرير غير صحيحة.');
    }

    // ==========================================
    // التحقق من المستخدم
    // ==========================================

    const user = await requireAuth();

    if (!user) return;

    if (window.applyLanguage) {
      await window.applyLanguage();
    }

    // ==========================================
    // جلب بيانات المؤسسة
    // ==========================================

    const {
      data: profile,
      error: profileError
    } = await db
      .from('profiles')
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile || !profile.organization_id) {
      throw new Error('تعذر تحديد المؤسسة الخاصة بالمستخدم.');
    }

    const organization = getRelation(profile.organizations);
    const orgName = organization?.name || 'MyStock';

    // ==========================================
    // جلب جميع عمليات الإضافة
    // على دفعات لتجاوز حد النتائج
    // ==========================================

    const items = [];

    const batchSize = 500;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + batchSize - 1;

      const {
        data: batch,
        error
      } = await db
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

      if (error) {
        throw error;
      }

      const currentBatch = batch || [];

      items.push(...currentBatch);

      if (currentBatch.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }

      // إتاحة فرصة للمتصفح بين الدفعات
      await nextFrame();
    }

    // ==========================================
    // حساب الإجماليات
    // ==========================================

    let totalQty = 0;
    let totalVal = 0;

    items.forEach(item => {
      const product = getRelation(item.products);

      const quantity = Number(item.quantity || 0);
      const price = Number(product?.price || 0);

      totalQty += quantity;
      totalVal += quantity * price;
    });

    // ==========================================
    // معلومات الفترة
    // ==========================================

    const periodMap = {
      today: tr('reports_today', 'اليوم'),
      week: tr('reports_week', 'هذا الأسبوع'),
      month: tr('reports_month', 'هذا الشهر'),
      year: tr('reports_year', 'هذه السنة'),
      custom: tr('reports_custom', 'فترة مخصصة')
    };

    const periodText = periodMap[period] || periodMap.custom;

    const printDate = new Date();

    // ==========================================
    // تجهيز التقرير
    // ==========================================

    container.innerHTML = `
      <div class="print-header">
        <h1>${escapeHTML(orgName)}</h1>

        <h2>
          ${escapeHTML(
            tr('reports_title', 'تقرير إضافة المنتجات')
          )}
        </h2>

        <div class="print-meta">
          <span>
            <strong>
              ${escapeHTML(
                tr('reports_period_type', 'نوع الفترة')
              )}:
            </strong>
            ${escapeHTML(periodText)}
          </span>

          <span>
            <strong>
              ${escapeHTML(
                tr('reports_date_range', 'الفترة')
              )}:
            </strong>
            ${escapeHTML(formatDate(start))}
            -
            ${escapeHTML(formatDate(end))}
          </span>

          <span>
            <strong>
              ${escapeHTML(
                tr('reports_print_date', 'تاريخ الطباعة')
              )}:
            </strong>
            ${escapeHTML(formatDate(printDate))}
            ${escapeHTML(formatTime(printDate))}
          </span>
        </div>
      </div>

      <div class="summary-row">
        <div class="summary-box">
          <div class="summary-title">
            ${escapeHTML(
              tr('reports_total_operations', 'عدد العمليات')
            )}
          </div>

          <div class="summary-val">
            ${formatNumber(items.length)}
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-title">
            ${escapeHTML(
              tr('reports_total_quantity', 'إجمالي الكمية')
            )}
          </div>

          <div class="summary-val">
            ${formatQuantity(totalQty)}
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-title">
            ${escapeHTML(
              tr('reports_total_value', 'إجمالي القيمة')
            )}
          </div>

          <div class="summary-val">
            ${formatNumber(totalVal)}
            <span class="currency-symbol">DH</span>
          </div>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>${escapeHTML(
              tr('reports_time', 'الوقت')
            )}</th>

            <th>${escapeHTML(
              tr('reports_date_only', 'التاريخ')
            )}</th>

            <th>${escapeHTML(
              tr('reports_user', 'المستخدم')
            )}</th>

            <th>${escapeHTML(
              tr('reports_supplier', 'المورد')
            )}</th>

            <th>${escapeHTML(
              tr('reports_product', 'المنتج')
            )}</th>

            <th>${escapeHTML(
              tr('reports_qty', 'الكمية')
            )}</th>

            <th>${escapeHTML(
              tr('reports_unit', 'الوحدة')
            )}</th>

            <th>${escapeHTML(
              tr('reports_unit_price', 'سعر الشراء')
            )}</th>

            <th>${escapeHTML(
              tr('reports_total_value', 'القيمة الإجمالية')
            )}</th>
          </tr>
        </thead>

        <tbody id="report-rows"></tbody>

        <tfoot>
          <tr>
            <td colspan="5">
              ${escapeHTML(
                tr('reports_grand_total', 'الإجمالي')
              )}
            </td>

            <td>${formatQuantity(totalQty)}</td>

            <td>-</td>

            <td>-</td>

            <td>
              ${formatNumber(totalVal)}
              <span class="currency-symbol">DH</span>
            </td>
          </tr>
        </tfoot>
      </table>

      <table class="sig-table">
        <tr>
          <td>
            <p>
              ${escapeHTML(
                tr('reports_manager_sig', 'توقيع المسؤول')
              )}
            </p>

            <div class="sig-line"></div>
          </td>

          <td>
            <p>
              ${escapeHTML(
                tr('reports_org_stamp', 'ختم المؤسسة')
              )}
            </p>

            <div class="stamp-circle"></div>
          </td>
        </tr>
      </table>

      <div class="no-print" style="
        text-align: center;
        margin: 25px 0;
      ">
        <button
          type="button"
          id="print-report-btn"
          style="
            background: #111827;
            color: #fff;
            border: none;
            border-radius: 7px;
            padding: 12px 30px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
          "
        >
          <i class="fa-solid fa-print"></i>
          ${escapeHTML(
            tr('reports_print', 'طباعة التقرير')
          )}
        </button>

        <p
          id="print-status"
          style="
            display: none;
            margin-top: 10px;
            color: #b91c1c;
            font-size: 13px;
          "
        ></p>
      </div>
    `;

    // ==========================================
    // إدراج العمليات على دفعات في الجدول
    // لا نضع حداً لعدد الصفوف في الصفحة.
    // المتصفح يتولى استمرار الجدول على صفحات A4.
    // ==========================================

    const tbody = document.getElementById('report-rows');

    const renderBatchSize = 100;

    for (
      let index = 0;
      index < items.length;
      index += renderBatchSize
    ) {
      const currentItems = items.slice(
        index,
        index + renderBatchSize
      );

      const rowsHTML = currentItems.map(item => {
        const product = getRelation(item.products);
        const supplier = getRelation(product?.suppliers);
        const movementProfile = getRelation(item.profiles);

        const quantity = Number(item.quantity || 0);
        const price = Number(product?.price || 0);
        const total = quantity * price;

        const date = item.created_at;

        return `
          <tr>
            <td>${escapeHTML(formatTime(date))}</td>

            <td>${escapeHTML(formatDate(date))}</td>

            <td>
              ${escapeHTML(
                movementProfile?.full_name || '-'
              )}
            </td>

            <td>
              ${escapeHTML(
                supplier?.name || '-'
              )}
            </td>

            <td>
              ${escapeHTML(
                product?.name || '-'
              )}
            </td>

            <td>${formatQuantity(quantity)}</td>

            <td>
              ${escapeHTML(product?.unit || '-')}
            </td>

            <td>${formatNumber(price)}</td>

            <td>${formatNumber(total)}</td>
          </tr>
        `;
      }).join('');

      tbody.insertAdjacentHTML('beforeend', rowsHTML);

      // إتاحة فرصة للمتصفح لمعالجة الجدول الطويل
      await nextFrame();
    }

    // ==========================================
    // عنوان الصفحة
    // ==========================================

    document.title =
      `${orgName} - ${tr(
        'reports_title',
        'تقرير إضافة المنتجات'
      )}`;

    // ==========================================
    // زر الطباعة
    // استدعاء الطباعة مباشرة من ضغطة المستخدم
    // دون setTimeout أو Promise
    // ==========================================

    const printButton = document.getElementById(
      'print-report-btn'
    );

    const printStatus = document.getElementById(
      'print-status'
    );

    if (printButton) {
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

        window.focus();
        window.print();

        return false;
      };
    }

  } catch (error) {
    console.error('Reports Print Error:', error);

    showError(
      error?.message ||
      'حدث خطأ أثناء تحضير التقرير للطباعة.'
    );
  }
});
