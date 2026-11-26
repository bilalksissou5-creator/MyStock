
/* ============================================
   MyStock - Reports Dashboard
   مركز التقارير
   ✅ إصلاح ظهور البطاقات
   ✅ إصلاح التنقل بين صفحات التقارير
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('reports-dashboard.html');

  const main = document.getElementById('main-content');
  if (!main) {
    console.error('Reports Dashboard: main-content غير موجود');
    return;
  }

  main.innerHTML = `
    <section class="reports-dashboard">

      <header class="reports-dashboard-header">
        <h1 data-i18n="reports_dashboard_title">مركز التقارير</h1>
        <p data-i18n="reports_dashboard_subtitle">
          اختر نوع التقرير الذي تريد الاطلاع عليه
        </p>
      </header>

      <div class="reports-dashboard-grid">

        <!-- تقارير الإضافة -->
        <a
          href="/reports.html"
          class="report-dashboard-card add-report"
        >
          <div class="report-icon">
            <i class="fa-solid fa-circle-plus"></i>
          </div>

          <h2 data-i18n="reports_add_title">
            تقارير إضافة المنتجات
          </h2>

          <p data-i18n="reports_add_description">
            عرض ومتابعة عمليات إضافة المنتجات إلى المخزون.
          </p>

          <span class="report-arrow">
            <i class="fa-solid fa-chevron-left"></i>
          </span>
        </a>

        <!-- تقارير الإخراج -->
        <a
          href="/reports-out.html"
          class="report-dashboard-card remove-report"
        >
          <div class="report-icon">
            <i class="fa-solid fa-box-open"></i>
          </div>

          <h2 data-i18n="reports_remove_title">
            تقارير إخراج المنتجات
          </h2>

          <p data-i18n="reports_remove_description">
            عرض ومتابعة عمليات إخراج المنتجات من المخزون.
          </p>

          <span class="report-arrow">
            <i class="fa-solid fa-chevron-left"></i>
          </span>
        </a>

        <!-- تقارير الأرباح -->
        <a
          href="/reports-profit.html"
          class="report-dashboard-card profit-report"
        >
          <div class="report-icon">
            <i class="fa-solid fa-chart-line"></i>
          </div>

          <h2 data-i18n="reports_profit_title">
            تقارير الأرباح
          </h2>

          <p data-i18n="reports_profit_description">
            متابعة الأرباح الناتجة عن عمليات البيع.
          </p>

          <span class="report-arrow">
            <i class="fa-solid fa-chevron-left"></i>
          </span>
        </a>

      </div>
    </section>
  `;

  // تطبيق الترجمات
  if (window.applyLanguage) {
    window.applyLanguage();
  }

  // ضبط اتجاه الأسهم حسب اللغة
  const isArabic = document.documentElement.dir === 'rtl';

  main.querySelectorAll('.report-arrow i').forEach(icon => {
    icon.className = isArabic
      ? 'fa-solid fa-chevron-left'
      : 'fa-solid fa-chevron-right';
  });
});
