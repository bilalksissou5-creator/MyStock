
// ============================================
// صفحة لوحة التحكم
// ✅ بطاقة حركات المخزون (خطان متزامنان)
// ✅ بطاقة الأرباح (أعمدة)
// ✅ دعم كامل للترجمة (تحديث فوري)
// ✅ تجميع البيانات (بالساعة/اليوم/الشهر) لضمان دقة الرسم
// ✅ منع تكرار requireAuth عند فتح لوحة التحكم
// ✅ معالجة أخطاء التهيئة ومنع توقف الصفحة بصمت
// ============================================

// ============================================
// 🔐 توحيد عملية التحقق من المصادقة
// ============================================
// dashboard.html يستدعي requireAuth أيضاً.
// نستخدم Promise واحدة حتى لا تنفذ عمليتا التحقق بالتزامن.
if (
  typeof window.requireAuth === 'function' &&
  !window.__mystockDashboardAuthWrapped
) {
  const originalRequireAuth = window.requireAuth;

  window.__mystockDashboardAuthPromise = null;

  window.requireAuth = function (...args) {
    if (!window.__mystockDashboardAuthPromise) {
      window.__mystockDashboardAuthPromise = Promise.resolve()
        .then(() => originalRequireAuth.apply(this, args))
        .catch(error => {
          console.error('Dashboard Auth Error:', error);
          window.__mystockDashboardAuthPromise = null;
          throw error;
        });
    }

    return window.__mystockDashboardAuthPromise;
  };

  window.__mystockDashboardAuthWrapped = true;
}

// ============================================
// 🚀 تشغيل لوحة التحكم
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. التحقق من المستخدم (عملية واحدة فقط)
    const user = await requireAuth();

    if (!user) return;

    // 2. إنشاء الهيكل الرئيسي
    if (typeof renderLayout === 'function') {
      renderLayout('dashboard.html');
    } else {
      throw new Error('renderLayout غير متوفرة');
    }

    // 3. تطبيق اللغة
    if (window.applyLanguage) {
      await window.applyLanguage();
    }

    const tr = (key) => (window.t ? window.t(key) : key);

    document.title = tr('dash_title') || 'Dashboard';

    const main = document.getElementById('main-content');

    if (!main) {
      throw new Error('لم يتم العثور على عنصر main-content');
    }

    // ============================================
    // محتوى لوحة التحكم
    // ============================================
    main.innerHTML = `
      <div class="page-header">
        <h2 data-i18n="dash_title">${tr('dash_title')}</h2>
      </div>

      <div class="stock-value-card">
        <div class="stock-top-row">
          <div class="stock-right-col">
            <div class="stock-title-section">
              <div class="stock-title-text">
                <h3 id="chart-title" data-i18n="dash_stock_moves">${tr('dash_stock_moves')}</h3>
                <p id="stock-subtitle">${tr('dash_last_30')}</p>
              </div>
              <div class="stock-title-icon">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>

            <div class="stock-stats-row">
              <div class="stock-stat-card">
                <div class="stat-mini-label" data-i18n="dash_in_qty">${tr('dash_in_qty')}</div>
                <div class="stat-mini-value" id="stat-min-value">—</div>
                <div class="stat-mini-icon up">
                  <i class="fas fa-arrow-up"></i>
                </div>
              </div>

              <div class="stock-stat-card">
                <div class="stat-mini-label" data-i18n="dash_total_moves">${tr('dash_total_moves')}</div>
                <div class="stat-mini-value" id="stat-avg-value">—</div>
                <div class="stat-mini-icon chart">
                  <i class="fas fa-chart-line"></i>
                </div>
              </div>

              <div class="stock-stat-card">
                <div class="stat-mini-label" data-i18n="dash_out_qty">${tr('dash_out_qty')}</div>
                <div class="stat-mini-value" id="stat-max-value">—</div>
                <div class="stat-mini-icon down">
                  <i class="fas fa-arrow-down"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="stock-hero-card">
            <div class="stock-hero-icon">
              <i class="fas fa-database"></i>
            </div>
            <div class="stock-hero-info">
              <div class="stock-hero-label" id="hero-label" data-i18n="dash_total_moves">${tr('dash_total_moves')}</div>
              <div class="stock-hero-value">
                <span id="hero-value">—</span>
              </div>
              <div class="stock-hero-trend" id="hero-trend">
                <i class="fas fa-arrow-up"></i>
                <span>—</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stock-chart-section">
          <div class="stock-chart-header">
            <h3 id="chart-section-title" data-i18n="dash_stock_moves">${tr('dash_stock_moves')}</h3>
            <span class="stock-chart-badge" id="chart-badge">
              <i class="fas fa-circle" style="color:#2563eb;"></i>
              <span data-i18n="dash_in">${tr('dash_in')}</span>
              &nbsp;&nbsp;
              <i class="fas fa-circle" style="color:#f97316;"></i>
              <span data-i18n="dash_out">${tr('dash_out')}</span>
            </span>
          </div>

          <div id="stock-chart"></div>

          <div class="stock-chart-filters">
            <div class="filters-left">
              <button type="button" class="filter-btn" data-days="1" data-i18n="dash_day">${tr('dash_day')}</button>
              <button type="button" class="filter-btn" data-days="7" data-i18n="dash_7days">${tr('dash_7days')}</button>
              <button type="button" class="filter-btn active" data-days="30" data-i18n="dash_30days">${tr('dash_30days')}</button>
              <button type="button" class="filter-btn" data-days="365" data-i18n="dash_year">${tr('dash_year')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="profit-card">
        <div class="stock-top-row">
          <div class="stock-right-col">
            <div class="stock-title-section">
              <div class="stock-title-text">
                <h3 data-i18n="dash_profit">${tr('dash_profit')}</h3>
                <p id="profit-subtitle">${tr('dash_last_30')}</p>
              </div>
              <div class="stock-title-icon" style="color:#16a34a;">
                <i class="fas fa-coins"></i>
              </div>
            </div>

            <div class="stock-stats-row">
              <div class="stock-stat-card">
                <div class="stat-mini-label" data-i18n="dash_min_period">${tr('dash_min_period')}</div>
                <div class="stat-mini-value" id="profit-min">—</div>
                <div class="stat-mini-icon down">
                  <i class="fas fa-arrow-down"></i>
                </div>
              </div>

              <div class="stock-stat-card">
                <div class="stat-mini-label" data-i18n="dash_avg_period">${tr('dash_avg_period')}</div>
                <div class="stat-mini-value" id="profit-avg">—</div>
                <div class="stat-mini-icon chart">
                  <i class="fas fa-chart-line"></i>
                </div>
              </div>

              <div class="stock-stat-card">
                <div class="stat-mini-label" data-i18n="dash_max_period">${tr('dash_max_period')}</div>
                <div class="stat-mini-value" id="profit-max">—</div>
                <div class="stat-mini-icon up">
                  <i class="fas fa-arrow-up"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="stock-hero-card profit-hero">
            <div class="stock-hero-icon">
              <i class="fas fa-coins"></i>
            </div>
            <div class="stock-hero-info">
              <div class="stock-hero-label" data-i18n="dash_total_profit">${tr('dash_total_profit')}</div>
              <div class="stock-hero-value">
                <span id="profit-total">—</span>
              </div>
              <div class="stock-hero-trend up" id="profit-trend">
                <i class="fas fa-coins"></i>
                <span>—</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stock-chart-section">
          <div class="stock-chart-header">
            <h3 data-i18n="dash_profit_evolution">${tr('dash_profit_evolution')}</h3>
            <span class="stock-chart-badge profit-badge">
              <i class="fas fa-circle" style="color:#16a34a;"></i>
              <span data-i18n="dash_profit">${tr('dash_profit')}</span>
            </span>
          </div>

          <div id="profit-chart"></div>

          <div class="stock-chart-filters">
            <div class="filters-left">
              <button type="button" class="profit-filter-btn" data-days="1" data-i18n="dash_day">${tr('dash_day')}</button>
              <button type="button" class="profit-filter-btn" data-days="7" data-i18n="dash_7days">${tr('dash_7days')}</button>
              <button type="button" class="profit-filter-btn active" data-days="30" data-i18n="dash_30days">${tr('dash_30days')}</button>
              <button type="button" class="profit-filter-btn" data-days="365" data-i18n="dash_year">${tr('dash_year')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label" data-i18n="dash_products">${tr('dash_products')}</div>
          <div class="stat-value" id="stat-products">—</div>
        </div>

        <div class="stat-card">
          <div class="stat-label" data-i18n="dash_movements">${tr('dash_movements')}</div>
          <div class="stat-value" id="stat-movements">—</div>
        </div>

        <div class="stat-card">
          <div class="stat-label" data-i18n="dash_users">${tr('dash_users')}</div>
          <div class="stat-value" id="stat-users">—</div>
        </div>

        <div class="stat-card">
          <div class="stat-label" data-i18n="dash_low_stock">${tr('dash_low_stock')}</div>
          <div class="stat-value" id="stat-low">—</div>
        </div>

        <div class="stat-card">
          <div class="stat-label" data-i18n="dash_today_moves">${tr('dash_today_moves')}</div>
          <div class="stat-value" id="stat-today">—</div>
        </div>
      </div>
    `;

    // 4. تحديث الترجمة بعد إنشاء المحتوى
    if (window.applyLanguage) {
      await window.applyLanguage();
    }

    // 5. تحميل البيانات والرسوم البيانية
    await loadStats();
    await loadStockChart(30);
    await loadProfitChart(30);

    // 6. تفعيل أزرار الفلاتر
    setupChartFilters();
    setupProfitFilters();

  } catch (error) {
    console.error('Dashboard Initialization Error:', error);

    const main = document.getElementById('main-content');

    if (main) {
      main.innerHTML = `
        <div style="
          padding:24px;
          margin:20px;
          text-align:center;
          color:#b91c1c;
          background:#fef2f2;
          border-radius:12px;
          direction:rtl;
        ">
          <i class="fas fa-triangle-exclamation"></i>
          <p>تعذر تحميل لوحة التحكم. تحقق من اتصال الإنترنت ثم أعد المحاولة.</p>
          <button
            type="button"
            onclick="window.location.reload()"
            style="
              padding:10px 18px;
              border:0;
              border-radius:8px;
              background:#2563eb;
              color:white;
              cursor:pointer;
            "
          >
            إعادة المحاولة
          </button>
        </div>
      `;
    }
  }
});

// ============================================
// الإحصائيات العامة
// ============================================
async function loadStats() {
  const { data: products } = await db
    .from('products')
    .select('qty, price');

  const { count: movements } = await db
    .from('stock_movements')
    .select('*', { count: 'exact', head: true });

  const { count: users } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { data: allMovements } = await db
    .from('stock_movements')
    .select('created_at');

  const productsCount = products?.length ?? 0;
  const lowStock = products?.filter(p => (p.qty ?? 0) < 10).length ?? 0;

  const today = new Date().toISOString().slice(0, 10);

  const todayMovements = allMovements?.filter(
    m => m.created_at?.slice(0, 10) === today
  ).length ?? 0;

  const el = (id) => document.getElementById(id);

  if (el('stat-products')) el('stat-products').textContent = productsCount;
  if (el('stat-movements')) el('stat-movements').textContent = movements ?? 0;
  if (el('stat-users')) el('stat-users').textContent = users ?? 0;
  if (el('stat-low')) el('stat-low').textContent = lowStock;
  if (el('stat-today')) el('stat-today').textContent = todayMovements;
}

// ============================================
// تجميع بيانات حركات المخزون
// ============================================
async function computeMovementsHistory(days) {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    return { dates: [], inSeries: [], outSeries: [] };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return { dates: [], inSeries: [], outSeries: [] };
  }

  const now = new Date();

  const startDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      0, 0, 0, 0
    )
  );

  const { data: movements } = await db
    .from('stock_movements')
    .select('type, quantity, created_at')
    .eq('organization_id', profile.organization_id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  const dates = [];
  const inSeries = [];
  const outSeries = [];

  // 1. اليوم: تجميع بالساعات
  if (days === 1) {
    const hourMap = {};

    (movements ?? []).forEach(m => {
      const date = new Date(m.created_at);
      const hour = date.getUTCHours();

      if (!hourMap[hour]) {
        hourMap[hour] = { in: 0, out: 0 };
      }

      if (m.type === 'in') {
        hourMap[hour].in += Number(m.quantity ?? 0);
      } else if (m.type === 'out') {
        hourMap[hour].out += Number(m.quantity ?? 0);
      }
    });

    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      )
    );

    for (let i = 0; i < 24; i++) {
      const time = startOfDay.getTime() + (i * 60 * 60 * 1000);

      dates.push(time);
      inSeries.push(hourMap[i]?.in || 0);
      outSeries.push(hourMap[i]?.out || 0);
    }

    return { dates, inSeries, outSeries };
  }

  // 2. السنة: تجميع بالشهر
  if (days >= 365) {
    const monthMap = {};

    (movements ?? []).forEach(m => {
      const month = m.created_at.slice(0, 7);

      if (!monthMap[month]) {
        monthMap[month] = { in: 0, out: 0 };
      }

      if (m.type === 'in') {
        monthMap[month].in += Number(m.quantity ?? 0);
      } else if (m.type === 'out') {
        monthMap[month].out += Number(m.quantity ?? 0);
      }
    });

    for (let i = 11; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
      );

      const monthKey = d.toISOString().slice(0, 7);

      dates.push(d.getTime());
      inSeries.push(monthMap[monthKey]?.in || 0);
      outSeries.push(monthMap[monthKey]?.out || 0);
    }

    return { dates, inSeries, outSeries };
  }

  // 3. سبعة أو ثلاثون يوماً: تجميع باليوم
  const dayMap = {};

  (movements ?? []).forEach(m => {
    const day = m.created_at.slice(0, 10);

    if (!dayMap[day]) {
      dayMap[day] = { in: 0, out: 0 };
    }

    if (m.type === 'in') {
      dayMap[day].in += Number(m.quantity ?? 0);
    } else if (m.type === 'out') {
      dayMap[day].out += Number(m.quantity ?? 0);
    }
  });

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const data = dayMap[key] ?? { in: 0, out: 0 };

    dates.push(date.getTime());
    inSeries.push(data.in);
    outSeries.push(data.out);
  }

  return { dates, inSeries, outSeries };
}

// ============================================
// رسم مخطط حركات المخزون
// ============================================
let stockChart = null;

async function loadStockChart(days) {
  const tr = (key) => (window.t ? window.t(key) : key);
  const data = await computeMovementsHistory(days);

  const subtitleMap = {
    1: tr('dash_sub_1'),
    7: tr('dash_sub_7'),
    30: tr('dash_sub_30'),
    365: tr('dash_sub_365'),
  };

  const subtitle = document.getElementById('stock-subtitle');
  const sectionTitle = document.getElementById('chart-section-title');
  const badge = document.getElementById('chart-badge');
  const heroLabel = document.getElementById('hero-label');

  if (!subtitle || !sectionTitle || !badge || !heroLabel) return;

  subtitle.textContent = subtitleMap[days] ?? tr('dash_stock_moves');
  sectionTitle.textContent = tr('dash_stock_moves');

  badge.innerHTML =
    `<i class="fas fa-circle" style="color:#2563eb;"></i> ${tr('dash_in')} &nbsp;&nbsp; ` +
    `<i class="fas fa-circle" style="color:#f97316;"></i> ${tr('dash_out')}`;

  heroLabel.textContent = tr('dash_total_moves');

  let totalIn = 0;
  let totalOut = 0;
  let countIn = 0;
  let countOut = 0;

  data.inSeries.forEach(v => {
    totalIn += v;
    if (v > 0) countIn++;
  });

  data.outSeries.forEach(v => {
    totalOut += v;
    if (v > 0) countOut++;
  });

  const heroValue = document.getElementById('hero-value');
  const trendEl = document.getElementById('hero-trend');
  const statMin = document.getElementById('stat-min-value');
  const statAvg = document.getElementById('stat-avg-value');
  const statMax = document.getElementById('stat-max-value');

  if (heroValue) heroValue.textContent = String(countIn + countOut);

  if (trendEl) {
    trendEl.className = 'stock-hero-trend up';
    trendEl.innerHTML =
      `<i class="fas fa-arrow-up"></i> ` +
      `<span>${totalIn} ${tr('dash_in')} | ${totalOut} ${tr('dash_out')}</span>`;
  }

  if (statMin) statMin.textContent = String(totalIn);
  if (statAvg) statAvg.textContent = String(countIn + countOut);
  if (statMax) statMax.textContent = String(totalOut);

  const chartElement = document.getElementById('stock-chart');

  if (!chartElement) return;

  const hasData =
    data.inSeries.some(v => v > 0) ||
    data.outSeries.some(v => v > 0);

  if (!hasData) {
    if (stockChart) {
      stockChart.destroy();
      stockChart = null;
    }

    chartElement.innerHTML =
      `<div style="text-align:center; padding:40px; color:#a3a3a3;">${tr('dash_no_moves')}</div>`;

    return;
  }

  if (typeof ApexCharts === 'undefined') {
    chartElement.innerHTML =
      `<div style="text-align:center; padding:40px; color:#a3a3a3;">تعذر تحميل مكتبة الرسوم البيانية</div>`;
    return;
  }

  const series = [
    { name: tr('dash_in'), data: data.inSeries },
    { name: tr('dash_out'), data: data.outSeries },
  ];

  let format = 'dd MMM';

  if (days === 1) format = 'HH:mm';
  if (days >= 365) format = 'MMM yyyy';

  const options = {
    series,

    chart: {
      type: 'line',
      height: 380,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 900,
      },
    },

    colors: ['#2563eb', '#f97316'],

    dataLabels: {
      enabled: false,
    },

    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#2563eb', '#f97316'],
    },

    markers: {
      size: 5,
      colors: ['#ffffff', '#ffffff'],
      strokeColors: ['#2563eb', '#f97316'],
      strokeWidth: 2,
      hover: { size: 7 },
      shape: 'circle',
    },

    xaxis: {
      type: 'datetime',
      categories: data.dates,

      labels: {
        style: {
          fontSize: '11px',
          colors: '#a3a3a3',
        },
        datetimeUTC: true,
        format,
      },

      axisBorder: { show: false },
      axisTicks: { show: false },
    },

    yaxis: {
      labels: {
        style: {
          fontSize: '11px',
          colors: '#a3a3a3',
        },

        formatter: (val) => Math.round(val).toString(),
      },

      title: {
        text: tr('dash_qty'),

        style: {
          fontSize: '11px',
          color: '#a3a3a3',
          fontWeight: 500,
        },
      },
    },

    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4,

      xaxis: {
        lines: { show: false },
      },

      yaxis: {
        lines: { show: true },
      },

      padding: {
        left: 8,
        right: 8,
      },
    },

    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',

      markers: {
        radius: 12,
      },

      itemMargin: {
        horizontal: 10,
        vertical: 0,
      },
    },

    tooltip: {
      theme: 'light',

      x: {
        format,
      },

      y: {
        formatter: (val) => val.toString(),
      },
    },
  };

  if (stockChart) {
    stockChart.destroy();
    stockChart = null;
  }

  stockChart = new ApexCharts(chartElement, options);
  await stockChart.render();
}

// ============================================
// تجميع بيانات الأرباح
// ============================================
async function computeProfitHistory(days) {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    return { mode: 'daily', dates: [], profits: [] };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return { mode: 'daily', dates: [], profits: [] };
  }

  const now = new Date();

  const startDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      0, 0, 0, 0
    )
  );

  const { data: receipts } = await db
    .from('receipts')
    .select('id, created_at')
    .eq('organization_id', profile.organization_id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (!receipts || receipts.length === 0) {
    return { mode: 'daily', dates: [], profits: [] };
  }

  const receiptIds = receipts.map(r => r.id);

  const { data: items } = await db
    .from('receipt_items')
    .select('receipt_id, profit')
    .in('receipt_id', receiptIds);

  const receiptCreatedMap = {};

  receipts.forEach(r => {
    receiptCreatedMap[r.id] = r.created_at;
  });

  const dayMap = {};

  (items ?? []).forEach(it => {
    const created = receiptCreatedMap[it.receipt_id];

    if (!created) return;

    const day = created.slice(0, 10);

    if (!dayMap[day]) {
      dayMap[day] = 0;
    }

    dayMap[day] += Number(it.profit ?? 0);
  });

  if (days === 1) {
    const hourMap = {};

    (items ?? []).forEach(it => {
      const created = receiptCreatedMap[it.receipt_id];

      if (!created) return;

      const hourKey = created.slice(0, 13);

      if (!hourMap[hourKey]) {
        hourMap[hourKey] = 0;
      }

      hourMap[hourKey] += Number(it.profit ?? 0);
    });

    const hours = Object.keys(hourMap).sort();

    const dates = hours.map(
      h => new Date(h + ':00:00Z').getTime()
    );

    const profits = hours.map(
      h => Number(hourMap[h].toFixed(2))
    );

    return { mode: 'hourly', dates, profits };
  }

  if (days >= 365) {
    const monthMap = {};

    Object.keys(dayMap).forEach(day => {
      const month = day.slice(0, 7);

      if (!monthMap[month]) {
        monthMap[month] = 0;
      }

      monthMap[month] += dayMap[day];
    });

    const months = Object.keys(monthMap).sort();

    const dates = months.map(
      m => new Date(m + '-01T00:00:00Z').getTime()
    );

    const profits = months.map(
      m => Number(monthMap[m].toFixed(2))
    );

    return { mode: 'monthly', dates, profits };
  }

  const dates = [];
  const profits = [];

  for (let i = 0; i <= days; i++) {
    const date = new Date(
      startDate.getTime() + i * 24 * 60 * 60 * 1000
    );

    const key = date.toISOString().slice(0, 10);

    dates.push(date.getTime());
    profits.push(Number((dayMap[key] ?? 0).toFixed(2)));
  }

  return { mode: 'daily', dates, profits };
}

// ============================================
// رسم مخطط الأرباح
// ============================================
let profitChart = null;

async function loadProfitChart(days) {
  const tr = (key) => (window.t ? window.t(key) : key);
  const data = await computeProfitHistory(days);

  const subtitleMap = {
    1: tr('dash_prof_sub_1'),
    7: tr('dash_prof_sub_7'),
    30: tr('dash_prof_sub_30'),
    365: tr('dash_prof_sub_365'),
  };

  const subtitle = document.getElementById('profit-subtitle');

  if (!subtitle) return;

  subtitle.textContent = subtitleMap[days] ?? tr('dash_profit');

  const profits = data.profits;

  const totalProfit = profits.reduce((s, v) => s + v, 0);
  const minProfit = profits.length > 0 ? Math.min(...profits) : 0;
  const maxProfit = profits.length > 0 ? Math.max(...profits) : 0;
  const avgProfit = profits.length > 0 ? totalProfit / profits.length : 0;

  const totalEl = document.getElementById('profit-total');
  const minEl = document.getElementById('profit-min');
  const avgEl = document.getElementById('profit-avg');
  const maxEl = document.getElementById('profit-max');
  const trendEl = document.getElementById('profit-trend');

  if (totalEl) totalEl.textContent = totalProfit.toFixed(2);
  if (minEl) minEl.textContent = minProfit.toFixed(2);
  if (avgEl) avgEl.textContent = avgProfit.toFixed(2);
  if (maxEl) maxEl.textContent = maxProfit.toFixed(2);

  if (trendEl) {
    trendEl.className = 'stock-hero-trend up';
    trendEl.innerHTML =
      `<i class="fas fa-coins"></i> ` +
      `<span>${data.dates.length} ${tr('dash_periods')}</span>`;
  }

  const chartElement = document.getElementById('profit-chart');

  if (!chartElement) return;

  const hasData = profits.some(v => v > 0);

  if (!hasData) {
    if (profitChart) {
      profitChart.destroy();
      profitChart = null;
    }

    chartElement.innerHTML =
      `<div style="text-align:center; padding:40px; color:#a3a3a3;">${tr('dash_no_profit')}</div>`;

    return;
  }

  if (typeof ApexCharts === 'undefined') {
    chartElement.innerHTML =
      `<div style="text-align:center; padding:40px; color:#a3a3a3;">تعذر تحميل مكتبة الرسوم البيانية</div>`;
    return;
  }

  const options = {
    series: [
      {
        name: tr('dash_profit'),
        data: profits,
      },
    ],

    chart: {
      type: 'bar',
      height: 380,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'system-ui, -apple-system, sans-serif',

      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 900,
      },
    },

    colors: ['#16a34a'],

    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
        columnWidth: '70%',
        distributed: false,
        horizontal: false,
      },
    },

    dataLabels: {
      enabled: false,
    },

    xaxis: {
      type: 'datetime',
      categories: data.dates,

      labels: {
        style: {
          fontSize: '11px',
          colors: '#a3a3a3',
        },

        datetimeUTC: true,

        format: days === 1
          ? 'HH:mm'
          : days >= 365
            ? 'MMM yyyy'
            : 'dd MMM',
      },

      axisBorder: { show: false },
      axisTicks: { show: false },
    },

    yaxis: {
      labels: {
        style: {
          fontSize: '11px',
          colors: '#a3a3a3',
        },

        formatter: (val) => {
          if (val >= 1000) {
            return (val / 1000).toFixed(1) + 'k';
          }

          return val.toFixed(0);
        },
      },

      title: {
        text: tr('dash_profit'),

        style: {
          fontSize: '11px',
          color: '#a3a3a3',
          fontWeight: 500,
        },
      },
    },

    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4,

      xaxis: {
        lines: { show: false },
      },

      yaxis: {
        lines: { show: true },
      },

      padding: {
        left: 8,
        right: 8,
      },
    },

    tooltip: {
      theme: 'light',

      x: {
        format: days === 1 ? 'HH:mm' : 'dd MMM yyyy',
      },

      y: {
        formatter: (val) => val.toFixed(2),

        title: {
          formatter: () => tr('dash_profit') + ': ',
        },
      },
    },
  };

  if (profitChart) {
    profitChart.destroy();
    profitChart = null;
  }

  profitChart = new ApexCharts(chartElement, options);
  await profitChart.render();
}

// ============================================
// أزرار فلاتر حركات المخزون
// ============================================
function setupChartFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
      });

      btn.classList.add('active');

      const days = Number(btn.dataset.days);

      try {
        await loadStockChart(days);
      } catch (error) {
        console.error('Stock Chart Filter Error:', error);
      }
    });
  });
}

// ============================================
// أزرار فلاتر الأرباح
// ============================================
function setupProfitFilters() {
  document.querySelectorAll('.profit-filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.profit-filter-btn').forEach(b => {
        b.classList.remove('active');
      });

      btn.classList.add('active');

      const days = Number(btn.dataset.days);

      try {
        await loadProfitChart(days);
      } catch (error) {
        console.error('Profit Chart Filter Error:', error);
      }
    });
  });
}
