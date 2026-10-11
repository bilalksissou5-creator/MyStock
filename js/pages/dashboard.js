// ============================================
// صفحة لوحة التحكم
// ✅ بطاقة قيمة المخزون + مبيان ApexCharts
// ✅ استخدام UTC لتفادي فرق التوقيت
// ✅ خطان (إضافة/إخراج) لكل الأزرار
// ✅ الأزرار: يوم / 7 أيام / 30 يوم / سنة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('dashboard.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <h2>لوحة التحكم</h2>

    <!-- ══════════════════════════════════════
         بطاقة قيمة المخزون
         ══════════════════════════════════════ -->
    <div class="stock-value-card">

      <div class="stock-top-row">

        <div class="stock-right-col">

          <div class="stock-title-section">
            <div class="stock-title-text">
              <h3 id="chart-title">حركات المخزون</h3>
              <p id="stock-subtitle">آخر 30 يوم</p>
            </div>
            <div class="stock-title-icon">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>

          <div class="stock-stats-row">
            <div class="stock-stat-card">
              <div class="stat-mini-label">إضافة (كمية)</div>
              <div class="stat-mini-value" id="stat-min-value">—</div>
              <div class="stat-mini-icon up">
                <i class="fas fa-arrow-up"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label">إجمالي الحركات</div>
              <div class="stat-mini-value" id="stat-avg-value">—</div>
              <div class="stat-mini-icon chart">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label">إخراج (كمية)</div>
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
            <div class="stock-hero-label" id="hero-label">إجمالي الحركات</div>
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
          <h3 id="chart-section-title">حركات المخزون</h3>
          <span class="stock-chart-badge" id="chart-badge">
            <i class="fas fa-circle" style="color:#2563eb;"></i> إضافة &nbsp;&nbsp;
            <i class="fas fa-circle" style="color:#f97316;"></i> إخراج
          </span>
        </div>
        <div id="stock-chart"></div>

        <div class="stock-chart-filters">
          <div class="filters-left">
            <button type="button" class="filter-btn" data-days="1">يوم</button>
            <button type="button" class="filter-btn" data-days="7">7 أيام</button>
            <button type="button" class="filter-btn active" data-days="30">30 يوم</button>
            <button type="button" class="filter-btn" data-days="365">سنة</button>
          </div>
          <button type="button" class="filter-details-btn">
            <i class="far fa-calendar-alt"></i>
            <span>عرض التفاصيل</span>
          </button>
        </div>
      </div>

    </div>

    <!-- ══════════════════════════════════════
         البطاقات القديمة
         ══════════════════════════════════════ -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">المنتجات</div>
        <div class="stat-value" id="stat-products">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">الحركات</div>
        <div class="stat-value" id="stat-movements">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">المستخدمون</div>
        <div class="stat-value" id="stat-users">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">قاربت على النفاد</div>
        <div class="stat-value" id="stat-low">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">حركات اليوم</div>
        <div class="stat-value" id="stat-today">—</div>
      </div>
    </div>
  `;

  await loadStats();
  await loadStockChart(30);
  setupChartFilters();
});

// ============================================
// تحميل الإحصاءات
// ============================================
async function loadStats() {
  const { data: products } = await db.from('products').select('qty, price');
  const { count: movements } = await db.from('stock_movements').select('*', { count: 'exact', head: true });
  const { count: users } = await db.from('profiles').select('*', { count: 'exact', head: true });
  const { data: allMovements } = await db.from('stock_movements').select('created_at');

  const productsCount = products?.length ?? 0;
  const lowStock = products?.filter(p => (p.qty ?? 0) < 10).length ?? 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayMovements = allMovements?.filter(m => m.created_at?.slice(0, 10) === today).length ?? 0;

  const el = (id) => document.getElementById(id);
  if (el('stat-products')) el('stat-products').textContent = productsCount;
  if (el('stat-movements')) el('stat-movements').textContent = movements ?? 0;
  if (el('stat-users')) el('stat-users').textContent = users ?? 0;
  if (el('stat-low')) el('stat-low').textContent = lowStock;
  if (el('stat-today')) el('stat-today').textContent = todayMovements;
}

// ============================================
// ✅ حساب عمليات المخزون (يومي أو لكل عملية)
// ============================================
async function computeMovementsHistory(days) {
  const now = new Date();
  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
    0, 0, 0, 0
  ));

  const { data: movements } = await db
    .from('stock_movements')
    .select('type, quantity, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // ✅ حالة "يوم" → كل عملية = نقطة
  if (days === 1) {
    const inOps = [];
    const outOps = [];

    (movements ?? []).forEach(m => {
      const ts = new Date(m.created_at).getTime();
      const point = { x: ts, y: Number(m.quantity ?? 0) };
      if (m.type === 'in') inOps.push(point);
      else if (m.type === 'out') outOps.push(point);
    });

    return { mode: 'per-operation', inOps, outOps };
  }

  // ✅ باقي الأزرار → مجموع يومي
  const dayMap = {}; // { 'YYYY-MM-DD': { in: x, out: y } }

  (movements ?? []).forEach(m => {
    const day = m.created_at.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { in: 0, out: 0 };
    if (m.type === 'in') dayMap[day].in += Number(m.quantity ?? 0);
    else if (m.type === 'out') dayMap[day].out += Number(m.quantity ?? 0);
  });

  const dates = [];
  const inSeries = [];
  const outSeries = [];

  // إذا "سنة" → تجميع شهري
  if (days >= 365) {
    const monthMap = {};
    Object.keys(dayMap).forEach(day => {
      const month = day.slice(0, 7); // YYYY-MM
      if (!monthMap[month]) monthMap[month] = { in: 0, out: 0 };
      monthMap[month].in += dayMap[day].in;
      monthMap[month].out += dayMap[day].out;
    });

    const months = Object.keys(monthMap).sort();
    months.forEach(m => {
      dates.push(new Date(m + '-01T00:00:00Z').getTime());
      inSeries.push(monthMap[m].in);
      outSeries.push(monthMap[m].out);
    });

    return { mode: 'daily', dates, inSeries, outSeries };
  }

  // يومي
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const data = dayMap[key] ?? { in: 0, out: 0 };

    dates.push(date.getTime());
    inSeries.push(data.in);
    outSeries.push(data.out);
  }

  return { mode: 'daily', dates, inSeries, outSeries };
}

// ============================================
// ✅ رسم المبيان
// ============================================
let stockChart = null;

async function loadStockChart(days) {
  const data = await computeMovementsHistory(days);

  // ✅ تحديث العناوين
  const subtitleMap = {
    1: 'حركات اليوم (كل عملية = نقطة)',
    7: 'آخر 7 أيام (مجموع يومي)',
    30: 'آخر 30 يوم (مجموع يومي)',
    365: 'آخر سنة (مجموع شهري)',
  };
  document.getElementById('stock-subtitle').textContent =
    subtitleMap[days] ?? 'حركات المخزون';

  document.getElementById('chart-section-title').textContent = 'حركات المخزون';
  document.getElementById('chart-badge').innerHTML =
    '<i class="fas fa-circle" style="color:#2563eb;"></i> إضافة &nbsp;&nbsp; ' +
    '<i class="fas fa-circle" style="color:#f97316;"></i> إخراج';
  document.getElementById('hero-label').textContent = 'إجمالي الحركات';

  // ✅ تحديث الإحصائيات
  let totalIn = 0;
  let totalOut = 0;
  let countIn = 0;
  let countOut = 0;

  if (data.mode === 'per-operation') {
    data.inOps.forEach(o => { totalIn += o.y; countIn++; });
    data.outOps.forEach(o => { totalOut += o.y; countOut++; });
  } else {
    data.inSeries.forEach(v => { totalIn += v; if (v > 0) countIn++; });
    data.outSeries.forEach(v => { totalOut += v; if (v > 0) countOut++; });
  }

  document.getElementById('hero-value').textContent =
    String(countIn + countOut);

  const trendEl = document.getElementById('hero-trend');
  trendEl.className = 'stock-hero-trend up';
  trendEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${totalIn} إضافة | ${totalOut} إخراج</span>`;

  document.getElementById('stat-min-value').textContent = String(totalIn);
  document.getElementById('stat-avg-value').textContent = String(countIn + countOut);
  document.getElementById('stat-max-value').textContent = String(totalOut);

  // ✅ إذا لا توجد بيانات
  const hasData = data.mode === 'per-operation'
    ? (data.inOps.length + data.outOps.length > 0)
    : (data.inSeries.some(v => v > 0) || data.outSeries.some(v => v > 0));

  if (!hasData) {
    if (stockChart) { stockChart.destroy(); stockChart = null; }
    document.getElementById('stock-chart').innerHTML =
      '<div style="text-align:center; padding:40px; color:#a3a3a3;">لا توجد حركات في هذه الفترة</div>';
    return;
  }

  // ✅ بناء السلسلتين
  let series;
  let xaxisConfig;

  if (data.mode === 'per-operation') {
    series = [
      { name: 'إضافة', data: data.inOps },
      { name: 'إخراج', data: data.outOps },
    ];
    xaxisConfig = {
      type: 'datetime',
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        datetimeUTC: true,
        format: 'HH:mm',
      },
      tickAmount: 6,
    };
  } else {
    series = [
      { name: 'إضافة', data: data.inSeries },
      { name: 'إخراج', data: data.outSeries },
    ];
    xaxisConfig = {
      type: 'datetime',
      categories: data.dates,
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        datetimeUTC: true,
        format: days >= 365 ? 'MMM yyyy' : 'dd MMM',
      },
    };
  }

  const options = {
    series,
    chart: {
      type: 'line',
      height: 380,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animations: { enabled: true, easing: 'easeinout', speed: 900 },
    },
    colors: ['#2563eb', '#f97316'],
    dataLabels: { enabled: false },
    stroke: {
      curve: data.mode === 'per-operation' ? 'straight' : 'smooth',
      width: 2.5,
      colors: ['#2563eb', '#f97316'],
    },
    markers: {
      size: data.mode === 'per-operation' ? 7 : 4,
      colors: ['#ffffff', '#ffffff'],
      strokeColors: ['#2563eb', '#f97316'],
      strokeWidth: data.mode === 'per-operation' ? 3 : 2,
      hover: { size: data.mode === 'per-operation' ? 10 : 7 },
      shape: 'circle',
    },
    xaxis: {
      ...xaxisConfig,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        formatter: (val) => Math.round(val).toString(),
      },
      title: {
        text: 'الكمية',
        style: { fontSize: '11px', color: '#a3a3a3', fontWeight: 500 },
      },
    },
    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8 },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      markers: { radius: 12 },
      itemMargin: { horizontal: 10, vertical: 0 },
    },
    tooltip: {
      theme: 'light',
      x: { format: data.mode === 'per-operation' ? 'HH:mm:ss' : 'dd MMM yyyy' },
      y: { formatter: (val) => val.toString() },
    },
  };

  if (stockChart) {
    stockChart.destroy();
  }
  stockChart = new ApexCharts(document.getElementById('stock-chart'), options);
  stockChart.render();
}

// ============================================
// ✅ أزرار الفلترة
// ============================================
function setupChartFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const days = Number(btn.dataset.days);
      await loadStockChart(days);
    });
  });
}