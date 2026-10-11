// ============================================
// صفحة لوحة التحكم
// ✅ بطاقة قيمة المخزون + مبيان ApexCharts
// ✅ استخدام UTC لتفادي فرق التوقيت
// ✅ زر "يوم": خطان (إضافة/إخراج) بنقطة لكل عملية
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('dashboard.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <h2>لوحة التحكم</h2>

    <!-- ══════════════════════════════════════
         بطاقة قيمة المخزون (موحّدة)
         ══════════════════════════════════════ -->
    <div class="stock-value-card">

      <!-- ✅ الصف الأعلى -->
      <div class="stock-top-row">

        <div class="stock-right-col">

          <div class="stock-title-section">
            <div class="stock-title-text">
              <h3>قيمة المخزون</h3>
              <p id="stock-subtitle">تطور قيمة المخزون خلال آخر 30 يوم</p>
            </div>
            <div class="stock-title-icon">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>

          <div class="stock-stats-row">
            <div class="stock-stat-card">
              <div class="stat-mini-label" id="label-min">أدنى قيمة</div>
              <div class="stat-mini-value" id="stat-min-value">—</div>
              <div class="stat-mini-icon down">
                <i class="fas fa-arrow-down"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label" id="label-avg">متوسط القيمة</div>
              <div class="stat-mini-value" id="stat-avg-value">—</div>
              <div class="stat-mini-icon up">
                <i class="fas fa-arrow-up"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label" id="label-max">أعلى قيمة</div>
              <div class="stat-mini-value" id="stat-max-value">—</div>
              <div class="stat-mini-icon chart">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>
          </div>

        </div>

        <div class="stock-hero-card">
          <div class="stock-hero-icon">
            <i class="fas fa-database"></i>
          </div>
          <div class="stock-hero-info">
            <div class="stock-hero-label" id="hero-label">القيمة الحالية للمخزون</div>
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

      <!-- ✅ المبيان -->
      <div class="stock-chart-section">
        <div class="stock-chart-header">
          <h3 id="chart-title">تطور قيمة المخزون</h3>
          <span class="stock-chart-badge" id="chart-badge">
            <i class="fas fa-circle"></i>
            قيمة المخزون
          </span>
        </div>
        <div id="stock-chart"></div>

        <div class="stock-chart-filters">
          <div class="filters-left">
            <button type="button" class="filter-btn" data-days="1">يوم</button>
            <button type="button" class="filter-btn active" data-days="30">30 يوم</button>
            <button type="button" class="filter-btn" data-days="90">90 يوم</button>
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
// ✅ حساب قيمة المخزون التاريخية (UTC)
// ============================================
async function computeStockValueHistory(days) {
  const { data: products } = await db
    .from('products')
    .select('id, qty, price');

  if (!products || products.length === 0) {
    return { dates: [], values: [] };
  }

  const priceMap = {};
  products.forEach(p => { priceMap[p.id] = Number(p.price ?? 0); });

  const now = new Date();
  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
    0, 0, 0, 0
  ));

  const { data: movements } = await db
    .from('stock_movements')
    .select('product_id, type, quantity, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  const { data: priorMovements } = await db
    .from('stock_movements')
    .select('product_id, type, quantity')
    .lt('created_at', startDate.toISOString());

  const balanceMap = {};
  (products ?? []).forEach(p => { balanceMap[p.id] = 0; });

  (priorMovements ?? []).forEach(m => {
    if (balanceMap[m.product_id] === undefined) return;
    if (m.type === 'in') balanceMap[m.product_id] += Number(m.quantity ?? 0);
    else if (m.type === 'out') balanceMap[m.product_id] -= Number(m.quantity ?? 0);
  });

  const dates = [];
  const values = [];

  const movementsByDay = {};
  (movements ?? []).forEach(m => {
    const day = m.created_at.slice(0, 10);
    if (!movementsByDay[day]) movementsByDay[day] = [];
    movementsByDay[day].push(m);
  });

  let currentBalances = { ...balanceMap };

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayKey = date.toISOString().slice(0, 10);

    (movementsByDay[dayKey] ?? []).forEach(m => {
      if (currentBalances[m.product_id] === undefined) return;
      if (m.type === 'in') currentBalances[m.product_id] += Number(m.quantity ?? 0);
      else if (m.type === 'out') currentBalances[m.product_id] -= Number(m.quantity ?? 0);
    });

    let totalValue = 0;
    Object.keys(currentBalances).forEach(pid => {
      const qty = Math.max(0, currentBalances[pid]);
      const price = priceMap[pid] ?? 0;
      totalValue += qty * price;
    });

    dates.push(date.toISOString());
    values.push(Number(totalValue.toFixed(2)));
  }

  return { dates, values };
}

// ============================================
// ✅ حساب عمليات اليوم (نقطة لكل عملية)
// ============================================
async function computeTodayOperations() {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  const endOfDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));

  const { data: movements } = await db
    .from('stock_movements')
    .select('id, type, quantity, created_at, performed_by, method')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: true });

  const inOps = [];
  const outOps = [];

  (movements ?? []).forEach(m => {
    const ts = new Date(m.created_at).getTime();
    const point = {
      x: ts,
      y: Number(m.quantity ?? 0),
      method: m.method ?? 'manual',
      performed_by: m.performed_by,
    };
    if (m.type === 'in') inOps.push(point);
    else if (m.type === 'out') outOps.push(point);
  });

  return { inOps, outOps };
}

// ============================================
// ✅ رسم المبيان
// ============================================
let stockChart = null;

async function loadStockChart(days) {
  // ═══════════════════════════════════════════
  // ✅ إذا "يوم" → مبيان عمليات (خطان)
  // ═══════════════════════════════════════════
  if (days === 1) {
    await renderTodayOperationsChart();
    return;
  }

  // ═══════════════════════════════════════════
  // المبيان العادي (قيمة المخزون)
  // ═══════════════════════════════════════════
  const { dates, values } = await computeStockValueHistory(days);

  if (values.length === 0) {
    document.getElementById('stock-chart').innerHTML =
      '<div style="text-align:center; padding:40px; color:#a3a3a3;">لا توجد بيانات</div>';
    return;
  }

  // ✅ استعادة العناوين الأصلية
  document.getElementById('stock-subtitle').textContent =
    days === 30 ? 'تطور قيمة المخزون خلال آخر 30 يوم'
    : days === 90 ? 'تطور قيمة المخزون خلال آخر 90 يوم'
    : days === 365 ? 'تطور قيمة المخزون خلال آخر سنة'
    : 'تطور قيمة المخزون';
  document.getElementById('chart-title').textContent = 'تطور قيمة المخزون';
  document.getElementById('chart-badge').innerHTML =
    '<i class="fas fa-circle"></i> قيمة المخزون';
  document.getElementById('hero-label').textContent = 'القيمة الحالية للمخزون';
  document.getElementById('label-min').textContent = 'أدنى قيمة';
  document.getElementById('label-avg').textContent = 'متوسط القيمة';
  document.getElementById('label-max').textContent = 'أعلى قيمة';

  const currentValue = values[values.length - 1] ?? 0;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((s, v) => s + v, 0) / values.length;

  document.getElementById('hero-value').textContent = currentValue.toFixed(2);

  const firstValue = values[0] ?? 0;
  const diff = currentValue - firstValue;
  const diffPct = firstValue > 0 ? ((diff / firstValue) * 100) : 0;

  const trendEl = document.getElementById('hero-trend');
  if (diff >= 0) {
    trendEl.className = 'stock-hero-trend up';
    trendEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${diffPct.toFixed(1)}% من الفترة السابقة</span>`;
  } else {
    trendEl.className = 'stock-hero-trend down';
    trendEl.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${diffPct.toFixed(1)}% من الفترة السابقة</span>`;
  }

  document.getElementById('stat-min-value').textContent = minValue.toFixed(2);
  document.getElementById('stat-avg-value').textContent = avgValue.toFixed(2);
  document.getElementById('stat-max-value').textContent = maxValue.toFixed(2);

  const options = {
    series: [{
      name: 'قيمة المخزون',
      data: values,
    }],
    chart: {
      type: 'area',
      height: 380,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animations: { enabled: true, easing: 'easeinout', speed: 900 },
    },
    colors: ['#2563eb'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3, colors: ['#2563eb'] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.02,
        stops: [0, 95, 100],
        colorStops: [
          { offset: 0, color: '#2563eb', opacity: 0.5 },
          { offset: 50, color: '#3b82f6', opacity: 0.15 },
          { offset: 100, color: '#60a5fa', opacity: 0.02 },
        ],
      },
    },
    markers: {
      size: 5,
      colors: ['#ffffff'],
      strokeColors: '#2563eb',
      strokeWidth: 2.5,
      hover: { size: 8 },
    },
    xaxis: {
      type: 'datetime',
      categories: dates,
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        datetimeUTC: true,
        format: days <= 30 ? 'dd MMM' : 'MMM yyyy',
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        formatter: (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0),
      },
    },
    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8 },
    },
    tooltip: {
      theme: 'light',
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: (val) => val.toFixed(2),
        title: { formatter: () => 'قيمة المخزون: ' },
      },
    },
  };

  if (stockChart) {
    stockChart.destroy();
  }
  stockChart = new ApexCharts(document.getElementById('stock-chart'), options);
  stockChart.render();
}

// ============================================
// ✅ مبيان عمليات اليوم (خطان + نقطة لكل عملية)
// ============================================
async function renderTodayOperationsChart() {
  const { inOps, outOps } = await computeTodayOperations();

  // ✅ تحديث العناوين
  document.getElementById('stock-subtitle').textContent =
    'حركات اليوم — كل نقطة تمثل عملية';
  document.getElementById('chart-title').textContent = 'حركات اليوم';
  document.getElementById('chart-badge').innerHTML =
    '<i class="fas fa-circle" style="color:#2563eb;"></i> إضافة &nbsp;&nbsp; <i class="fas fa-circle" style="color:#f97316;"></i> إخراج';
  document.getElementById('hero-label').textContent = 'مجموع حركات اليوم';
  document.getElementById('label-min').textContent = 'عدد الإضافات';
  document.getElementById('label-avg').textContent = 'إجمالي الكمية';
  document.getElementById('label-max').textContent = 'عدد الإخراجات';

  const totalIn = inOps.reduce((s, o) => s + o.y, 0);
  const totalOut = outOps.reduce((s, o) => s + o.y, 0);

  document.getElementById('hero-value').textContent =
    String(inOps.length + outOps.length);

  const trendEl = document.getElementById('hero-trend');
  trendEl.className = 'stock-hero-trend up';
  trendEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${totalIn} إضافة | ${totalOut} إخراج</span>`;

  document.getElementById('stat-min-value').textContent = String(inOps.length);
  document.getElementById('stat-avg-value').textContent = String(totalIn + totalOut);
  document.getElementById('stat-max-value').textContent = String(outOps.length);

  // ✅ إذا لا توجد بيانات
  if (inOps.length === 0 && outOps.length === 0) {
    document.getElementById('stock-chart').innerHTML =
      '<div style="text-align:center; padding:40px; color:#a3a3a3;">لا توجد حركات اليوم</div>';
    return;
  }

  const options = {
    series: [
      { name: 'إضافة', data: inOps },
      { name: 'إخراج', data: outOps },
    ],
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
      curve: 'straight',
      width: 2,
      colors: ['#2563eb', '#f97316'],
    },
    markers: {
      size: 7,
      colors: ['#ffffff', '#ffffff'],
      strokeColors: ['#2563eb', '#f97316'],
      strokeWidth: 3,
      hover: { size: 10 },
      shape: 'circle',
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        datetimeUTC: true,
        format: 'HH:mm',
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 6,
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
      x: { format: 'HH:mm:ss' },
      y: {
        formatter: (val) => val.toString(),
      },
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