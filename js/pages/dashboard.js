// ============================================
// صفحة لوحة التحكم
// ✅ بطاقة قيمة المخزون + مبيان ApexCharts
// ✅ استخدام UTC لتفادي فرق التوقيت
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
    <div class="stock-value-section">

      <!-- ══════ البطاقة الرئيسية ══════ -->
      <div class="stock-hero-card">
        <div class="stock-hero-icon">
          <i class="fas fa-database"></i>
        </div>
        <div class="stock-hero-info">
          <div class="stock-hero-label">قيمة المخزون الحالية</div>
          <div class="stock-hero-value">
            <span id="hero-value">—</span>
          </div>
          <div class="stock-hero-trend" id="hero-trend">
            <i class="fas fa-arrow-up"></i>
            <span>—</span>
          </div>
        </div>
      </div>

      <!-- ══════ الإحصائيات (3 بطاقات صغيرة) ══════ -->
      <div class="stock-stats-row">
        <div class="stock-stat-card">
          <div class="stat-mini-label">أدنى قيمة</div>
          <div class="stat-mini-value" id="stat-min-value">—</div>
          <div class="stat-mini-icon down">
            <i class="fas fa-arrow-down"></i>
          </div>
        </div>
        <div class="stock-stat-card">
          <div class="stat-mini-label">متوسط القيمة</div>
          <div class="stat-mini-value" id="stat-avg-value">—</div>
          <div class="stat-mini-icon up">
            <i class="fas fa-arrow-up"></i>
          </div>
        </div>
        <div class="stock-stat-card">
          <div class="stat-mini-label">أعلى قيمة</div>
          <div class="stat-mini-value" id="stat-max-value">—</div>
          <div class="stat-mini-icon chart">
            <i class="fas fa-chart-line"></i>
          </div>
        </div>
      </div>

      <!-- ══════ المبيان ══════ -->
      <div class="stock-chart-card">
        <div class="stock-chart-header">
          <h3>تطور قيمة المخزون</h3>
          <span class="stock-chart-badge">
            <i class="fas fa-circle"></i>
            قيمة المخزون
          </span>
        </div>
        <div id="stock-chart"></div>

        <!-- ══════ أزرار الفلترة ══════ -->
        <div class="stock-chart-filters">
          <button type="button" class="filter-btn" data-days="1">يوم</button>
          <button type="button" class="filter-btn active" data-days="30">30 يوم</button>
          <button type="button" class="filter-btn" data-days="90">90 يوم</button>
          <button type="button" class="filter-btn" data-days="365">سنة</button>
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
  // 1. جلب المنتجات
  const { data: products } = await db
    .from('products')
    .select('id, qty, price');

  if (!products || products.length === 0) {
    return { dates: [], values: [] };
  }

  // ✅ خريطة السعر
  const priceMap = {};
  products.forEach(p => { priceMap[p.id] = Number(p.price ?? 0); });

  // ✅ startDate بـ UTC (بداية اليوم UTC قبل N يوم)
  const now = new Date();
  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
    0, 0, 0, 0
  ));

  // 2. جلب الحركات من startDate
  const { data: movements } = await db
    .from('stock_movements')
    .select('product_id, type, quantity, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // 3. الرصيد الافتتاحي (قبل startDate)
  const { data: priorMovements } = await db
    .from('stock_movements')
    .select('product_id, type, quantity')
    .lt('created_at', startDate.toISOString());

  // ✅ احسب رصيد البداية لكل منتج
  const balanceMap = {};
  (products ?? []).forEach(p => { balanceMap[p.id] = 0; });

  (priorMovements ?? []).forEach(m => {
    if (balanceMap[m.product_id] === undefined) return;
    if (m.type === 'in') balanceMap[m.product_id] += Number(m.quantity ?? 0);
    else if (m.type === 'out') balanceMap[m.product_id] -= Number(m.quantity ?? 0);
  });

  // 4. بناء المصفوفات
  const dates = [];
  const values = [];

  // ✅ نُجمّع الحركات حسب اليوم (UTC)
  const movementsByDay = {};
  (movements ?? []).forEach(m => {
    const day = m.created_at.slice(0, 10);
    if (!movementsByDay[day]) movementsByDay[day] = [];
    movementsByDay[day].push(m);
  });

  // ✅ رصيد متحرك
  let currentBalances = { ...balanceMap };

  // ✅ حلقة الأيام (بـ UTC)
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayKey = date.toISOString().slice(0, 10);

    // طبّق حركات هذا اليوم
    (movementsByDay[dayKey] ?? []).forEach(m => {
      if (currentBalances[m.product_id] === undefined) return;
      if (m.type === 'in') currentBalances[m.product_id] += Number(m.quantity ?? 0);
      else if (m.type === 'out') currentBalances[m.product_id] -= Number(m.quantity ?? 0);
    });

    // احسب القيمة
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
// ✅ رسم المبيان
// ============================================
let stockChart = null;

async function loadStockChart(days) {
  const { dates, values } = await computeStockValueHistory(days);

  if (values.length === 0) {
    document.getElementById('stock-chart').innerHTML =
      '<div style="text-align:center; padding:40px; color:#a3a3a3;">لا توجد بيانات</div>';
    return;
  }

  const currentValue = values[values.length - 1] ?? 0;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((s, v) => s + v, 0) / values.length;

  // ✅ البطاقة الرئيسية
  document.getElementById('hero-value').textContent = currentValue.toFixed(2);

  // ✅ الفرق
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

  // ✅ الإحصائيات
  document.getElementById('stat-min-value').textContent = minValue.toFixed(2);
  document.getElementById('stat-avg-value').textContent = avgValue.toFixed(2);
  document.getElementById('stat-max-value').textContent = maxValue.toFixed(2);

  // ✅ المبيان
  const options = {
    series: [{
      name: 'قيمة المخزون',
      data: values,
    }],
    chart: {
      type: 'area',
      height: 340,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      },
    },
    colors: ['#2563eb'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#2563eb'],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
        colorStops: [
          { offset: 0, color: '#2563eb', opacity: 0.45 },
          { offset: 100, color: '#2563eb', opacity: 0.02 },
        ],
      },
    },
    markers: {
      size: 0,
      colors: ['#2563eb'],
      strokeColors: '#ffffff',
      strokeWidth: 2,
      hover: { size: 6 },
    },
    xaxis: {
      type: 'datetime',
      categories: dates,
      labels: {
        style: {
          fontSize: '11px',
          colors: '#a3a3a3',
        },
        datetimeUTC: true,
        format: days <= 30 ? 'dd MMM' : 'MMM yyyy',
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
          if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
          return val.toFixed(0);
        },
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
    stockChart.updateOptions({
      series: [{ name: 'قيمة المخزون', data: values }],
      xaxis: { categories: dates },
    });
  } else {
    stockChart = new ApexCharts(document.getElementById('stock-chart'), options);
    stockChart.render();
  }
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