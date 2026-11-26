// ============================================
// مركز التقارير - MyStock
// ✅ تقارير الإضافة
// ✅ تقارير الإخراج (قيد الإعداد)
// ✅ تقارير الأرباح (قيد الإعداد)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('reports-dashboard.html');

  // الصفحة تعمل داخل إطار التطبيق
  if (window.self === window.top) return;

  const main = document.getElementById('main-content');
  if (!main) return;

  const lang = document.documentElement.lang || 'ar';
  const isArabic = lang === 'ar';

  const text = {
    title: isArabic ? 'مركز التقارير' : 'Reports Center',

    description: isArabic
      ? 'اختر نوع التقرير الذي تريد الاطلاع عليه'
      : 'Choose the type of report you want to view',

    addTitle: isArabic
      ? 'تقارير إضافة المنتجات'
      : 'Product Addition Reports',

    addDescription: isArabic
      ? 'عرض ومراجعة عمليات إضافة المنتجات إلى المخزون'
      : 'View and review products added to inventory',

    outTitle: isArabic
      ? 'تقارير إخراج المنتجات'
      : 'Product Withdrawal Reports',

    outDescription: isArabic
      ? 'عرض ومراجعة عمليات إخراج المنتجات من المخزون'
      : 'View and review products withdrawn from inventory',

    profitTitle: isArabic
      ? 'تقارير الأرباح'
      : 'Profit Reports',

    profitDescription: isArabic
      ? 'عرض تقارير الأرباح ومتابعة نتائج النشاط التجاري'
      : 'View profit reports and track business results',

    open: isArabic ? 'فتح التقرير' : 'Open report',
    comingSoon: isArabic ? 'قريباً' : 'Coming soon'
  };

  main.innerHTML = `
    <section class="reports-dashboard">

      <header class="reports-dashboard-header">
        <h1 class="reports-dashboard-title">
          <i class="fas fa-chart-line"></i>
          <span>${text.title}</span>
        </h1>

        <p class="reports-dashboard-description">
          ${text.description}
        </p>
      </header>

      <div class="reports-dashboard-grid">

        <!-- تقارير إضافة المنتجات -->

        <a
          href="/reports.html"
          class="report-category-card report-card-add"
        >
          <div class="report-card-icon">
            <i class="fas fa-boxes-stacked"></i>
          </div>

          <div class="report-card-content">
            <h2 class="report-card-title">
              ${text.addTitle}
            </h2>

            <p class="report-card-description">
              ${text.addDescription}
            </p>
          </div>

          <div class="report-card-footer">
            <span class="report-card-action">
              ${text.open}
            </span>

            <i class="fas fa-arrow-left report-card-arrow"></i>
          </div>
        </a>

        <!-- تقارير إخراج المنتجات -->

        <div
          class="report-category-card report-card-out is-disabled"
          aria-disabled="true"
        >
          <div class="report-card-icon">
            <i class="fas fa-box-open"></i>
          </div>

          <div class="report-card-content">
            <h2 class="report-card-title">
              ${text.outTitle}
            </h2>

            <p class="report-card-description">
              ${text.outDescription}
            </p>
          </div>

          <div class="report-card-footer">
            <span class="report-card-action">
              ${text.outTitle}
            </span>

            <span class="report-coming-soon">
              <i class="fas fa-clock"></i>
              ${text.comingSoon}
            </span>
          </div>
        </div>

        <!-- تقارير الأرباح -->

        <div
          class="report-category-card report-card-profit is-disabled"
          aria-disabled="true"
        >
          <div class="report-card-icon">
            <i class="fas fa-chart-line"></i>
          </div>

          <div class="report-card-content">
            <h2 class="report-card-title">
              ${text.profitTitle}
            </h2>

            <p class="report-card-description">
              ${text.profitDescription}
            </p>
          </div>

          <div class="report-card-footer">
            <span class="report-card-action">
              ${text.profitTitle}
            </span>

            <span class="report-coming-soon">
              <i class="fas fa-clock"></i>
              ${text.comingSoon}
            </span>
          </div>
        </div>

      </div>
    </section>
  `;

  if (window.applyLanguage) {
    window.applyLanguage();
  }
});