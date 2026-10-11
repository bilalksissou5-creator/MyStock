// ============================================
// صفحة لوحة التحكم
// ✅ بطاقة حركات المخزون (خطان)
// ✅ بطاقة الأرباح (أعمدة)
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('dashboard.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <h2>${tr('dash_title')}</h2>

    <!-- ══════════════════════════════════════
         بطاقة حركات المخزون
         ══════════════════════════════════════ -->
    <div class="stock-value-card">

      <div class="stock-top-row">

        <div class="stock-right-col">

          <div class="stock-title-section">
            <div class="stock-title-text">
              <h3 id="chart-title">${tr('dash_stock_moves')}</h3>
              <p id="stock-subtitle">${tr('dash_last_30')}</p>
            </div>
            <div class="stock-title-icon">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>

          <div class="stock-stats-row">
            <div class="stock-stat-card">
              <div class="stat-mini-label">${tr('dash_in_qty')}</div>
              <div class="stat-mini-value" id="stat-min-value">—</div>
              <div class="stat-mini-icon up">
                <i class="fas fa-arrow-up"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label">${tr('dash_total_moves')}</div>
              <div class="stat-mini-value" id="stat-avg-value">—</div>
              <div class="stat-mini-icon chart">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label">${tr('dash_out_qty')}</div>
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
            <div class="stock-hero-label" id="hero-label">${tr('dash_total_moves')}</div>
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
          <h3 id="chart-section-title">${tr('dash_stock_moves')}</h3>
          <span class="stock-chart-badge" id="chart-badge">
            <i class="fas fa-circle" style="color:#2563eb;"></i> ${tr('dash_in')} &nbsp;&nbsp;
            <i class="fas fa-circle" style="color:#f97316;"></i> ${tr('dash_out')}
          </span>
        </div>
        <div id="stock-chart"></div>

        <div class="stock-chart-filters">
          <div class="filters-left">
            <button type="button" class="filter-btn" data-days="1">${tr('dash_day')}</button>
            <button type="button" class="filter-btn" data-days="7">${tr('dash_7days')}</button>
            <button type="button" class="filter-btn active" data-days="30">${tr('dash_30days')}</button>
            <button type="button" class="filter-btn" data-days="365">${tr('dash_year')}</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ══════════════════════════════════════
         ✅ بطاقة الأرباح
         ══════════════════════════════════════ -->
    <div class="profit-card">

      <div class="stock-top-row">

        <div class="stock-right-col">

          <div class="stock-title-section">
            <div class="stock-title-text">
              <h3>${tr('dash_profit')}</h3>
              <p id="profit-subtitle">${tr('dash_last_30')}</p>
            </div>
            <div class="stock-title-icon" style="color:#16a34a;">
              <i class="fas fa-coins"></i>
            </div>
          </div>

          <div class="stock-stats-row">
            <div class="stock-stat-card">
              <div class="stat-mini-label">${tr('dash_min_period')}</div>
              <div class="stat-mini-value" id="profit-min">—</div>
              <div class="stat-mini-icon down">
                <i class="fas fa-arrow-down"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label">${tr('dash_avg_period')}</div>
              <div class="stat-mini-value" id="profit-avg">—</div>
              <div class="stat-mini-icon chart">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>
            <div class="stock-stat-card">
              <div class="stat-mini-label">${tr('dash_max_period')}</div>
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
            <div class="stock-hero-label">${tr('dash_total_profit')}</div>
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
          <h3>${tr('dash_profit_evolution')}</h3>
          <span class="stock-chart-badge profit-badge">
            <i class="fas fa-circle" style="color:#16a34a;"></i> ${tr('dash_profit')}
          </span>
        </div>
        <div id="profit-chart"></div>

        <div class="stock-chart-filters">
          <div class="filters-left">
            <button type="button" class="profit-filter-btn" data-days="1">${tr('dash_day')}</button>
            <button type="button" class="profit-filter-btn" data-days="7">${tr('dash_7days')}</button>
            <button type="button" class="profit-filter-btn active" data-days="30">${tr('dash_30days')}</button>
            <button type="button" class="profit-filter-btn" data-days="365">${tr('dash_year')}</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ══════════════════════════════════════
         البطاقات السريعة
         ══════════════════════════════════════ -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">${tr('dash_products')}</div>
        <div class="stat-value" id="stat-products">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${tr('dash_movements')}</div>
        <div class="stat-value" id="stat-movements">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${tr('dash_users')}</div>
        <div class="stat-value" id="stat-users">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${tr('dash_low_stock')}</div>
        <div class="stat-value" id="stat-low">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${tr('dash_today_moves')}</div>
        <div class="stat-value" id="stat-today">—</div>
      </div>
    </div>
  `;

  await loadStats();
  await loadStockChart(30);
  await loadProfitChart(30);
  setupChartFilters();
  setupProfitFilters();
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
// ✅ حساب عمليات المخزون
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

  const dayMap = {};

  (movements ?? []).forEach(m => {
    const day = m.created_at.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { in: 0, out: 0 };
    if (m.type === 'in') dayMap[day].in += Number(m.quantity ?? 0);
    else if (m.type === 'out') dayMap[day].out += Number(m.quantity ?? 0);
  });

  const dates = [];
  const inSeries = [];
  const outSeries = [];

  if (days >= 365) {
    const monthMap = {};
    Object.keys(dayMap).forEach(day => {
      const month = day.slice(0, 7);
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
// ✅ رسم مبيان الحركات
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
  document.getElementById('stock-subtitle').textContent =
    subtitleMap[days] ?? tr('dash_stock_moves');

  document.getElementById('chart-section-title').textContent = tr('dash_stock_moves');
  document.getElementById('chart-badge').innerHTML =
    `<i class="fas fa-circle" style="color:#2563eb;"></i> ${tr('dash_in')} &nbsp;&nbsp; ` +
    `<i class="fas fa-circle" style="color:#f97316;"></i> ${tr('dash_out')}`;
  document.getElementById('hero-label').textContent = tr('dash_total_moves');

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

  document.getElementById('hero-value').textContent = String(countIn + countOut);

  const trendEl = document.getElementById('hero-trend');
  trendEl.className = 'stock-hero-trend up';
  trendEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${totalIn} ${tr('dash_in')} | ${totalOut} ${tr('dash_out')}</span>`;

  document.getElementById('stat-min-value').textContent = String(totalIn);
  document.getElementById('stat-avg-value').textContent = String(countIn + countOut);
  document.getElementById('stat-max-value').textContent = String(totalOut);

  const hasData = data.mode === 'per-operation'
    ? (data.inOps.length + data.outOps.length > 0)
    : (data.inSeries.some(v => v > 0) || data.outSeries.some(v => v > 0));

  if (!hasData) {
    if (stockChart) { stockChart.destroy(); stockChart = null; }
    document.getElementById('stock-chart').innerHTML =
      `<div style="text-align:center; padding:40px; color:#a3a3a3;">${tr('dash_no_moves')}</div>`;
    return;
  }

  let series;
  let xaxisConfig;

  if (data.mode === 'per-operation') {
    series = [
      { name: tr('dash_in'), data: data.inOps },
      { name: tr('dash_out'), data: data.outOps },
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
      { name: tr('dash_in'), data: data.inSeries },
      { name: tr('dash_out'), data: data.outSeries },
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
    xaxis: { ...xaxisConfig, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        formatter: (val) => Math.round(val).toString(),
      },
      title: {
        text: tr('dash_qty'),
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

  if (stockChart) stockChart.destroy();
  stockChart = new ApexCharts(document.getElementById('stock-chart'), options);
  stockChart.render();
}

// ============================================
// ✅ حساب الأرباح
// ============================================
async function computeProfitHistory(days) {
  const now = new Date();
  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
    0, 0, 0, 0
  ));

  const { data: receipts } = await db
    .from('receipts')
    .select('id, created_at')
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
  receipts.forEach(r => { receiptCreatedMap[r.id] = r.created_at; });

  const dayMap = {};
  (items ?? []).forEach(it => {
    const created = receiptCreatedMap[it.receipt_id];
    if (!created) return;
    const day = created.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = 0;
    dayMap[day] += Number(it.profit ?? 0);
  });

  if (days === 1) {
    const hourMap = {};
    (items ?? []).forEach(it => {
      const created = receiptCreatedMap[it.receipt_id];
      if (!created) return;
      const hourKey = created.slice(0, 13);
      if (!hourMap[hourKey]) hourMap[hourKey] = 0;
      hourMap[hourKey] += Number(it.profit ?? 0);
    });

    const hours = Object.keys(hourMap).sort();
    const dates = hours.map(h => new Date(h + ':00:00Z').getTime());
    const profits = hours.map(h => Number(hourMap[h].toFixed(2)));

    return { mode: 'hourly', dates, profits };
  }

  if (days >= 365) {
    const monthMap = {};
    Object.keys(dayMap).forEach(day => {
      const month = day.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = 0;
      monthMap[month] += dayMap[day];
    });

    const months = Object.keys(monthMap).sort();
    const dates = months.map(m => new Date(m + '-01T00:00:00Z').getTime());
    const profits = months.map(m => Number(monthMap[m].toFixed(2)));

    return { mode: 'monthly', dates, profits };
  }

  const dates = [];
  const profits = [];

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    dates.push(date.getTime());
    profits.push(Number((dayMap[key] ?? 0).toFixed(2)));
  }

  return { mode: 'daily', dates, profits };
}

// ============================================
// ✅ رسم مبيان الأرباح
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
  document.getElementById('profit-subtitle').textContent =
    subtitleMap[days] ?? tr('dash_profit');

  const profits = data.profits;
  const totalProfit = profits.reduce((s, v) => s + v, 0);
  const minProfit = profits.length > 0 ? Math.min(...profits) : 0;
  const maxProfit = profits.length > 0 ? Math.max(...profits) : 0;
  const avgProfit = profits.length > 0 ? totalProfit / profits.length : 0;

  document.getElementById('profit-total').textContent = totalProfit.toFixed(2);
  document.getElementById('profit-min').textContent = minProfit.toFixed(2);
  document.getElementById('profit-avg').textContent = avgProfit.toFixed(2);
  document.getElementById('profit-max').textContent = maxProfit.toFixed(2);

  const trendEl = document.getElementById('profit-trend');
  trendEl.className = 'stock-hero-trend up';
  trendEl.innerHTML = `<i class="fas fa-coins"></i> <span>${data.dates.length} ${tr('dash_periods')}</span>`;

  const hasData = profits.some(v => v > 0);

  if (!hasData) {
    if (profitChart) { profitChart.destroy(); profitChart = null; }
    document.getElementById('profit-chart').innerHTML =
      `<div style="text-align:center; padding:40px; color:#a3a3a3;">${tr('dash_no_profit')}</div>`;
    return;
  }

  const options = {
    series: [{
      name: tr('dash_profit'),
      data: profits,
    }],
    chart: {
      type: 'bar',
      height: 380,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animations: { enabled: true, easing: 'easeinout', speed: 900 },
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
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      categories: data.dates,
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        datetimeUTC: true,
        format: days === 1 ? 'HH:mm' : days >= 365 ? 'MMM yyyy' : 'dd MMM',
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#a3a3a3' },
        formatter: (val) => {
          if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
          return val.toFixed(0);
        },
      },
      title: {
        text: tr('dash_profit'),
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
    tooltip: {
      theme: 'light',
      x: { format: days === 1 ? 'HH:mm' : 'dd MMM yyyy' },
      y: {
        formatter: (val) => val.toFixed(2),
        title: { formatter: () => tr('dash_profit') + ': ' },
      },
    },
  };

  if (profitChart) profitChart.destroy();
  profitChart = new ApexCharts(document.getElementById('profit-chart'), options);
  profitChart.render();
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

function setupProfitFilters() {
  document.querySelectorAll('.profit-filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.profit-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const days = Number(btn.dataset.days);
      await loadProfitChart(days);
    });
  });
}