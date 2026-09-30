// ============================================
// صفحة لوحة التحكم
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('dashboard.html');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h2>لوحة التحكم</h2>
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
        <div class="stat-label">قيمة المخزون</div>
        <div class="stat-value" id="stat-value">—</div>
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
});

// ============================================
// تحميل الإحصاءات من Supabase
// ============================================
async function loadStats() {
  const { data: products } = await db.from('products').select('qty, price');
  const { count: movements } = await db.from('stock_movements').select('*', { count: 'exact', head: true });
  const { count: users } = await db.from('profiles').select('*', { count: 'exact', head: true });
  const { data: allMovements } = await db.from('stock_movements').select('created_at');

  const productsCount = products?.length ?? 0;
  const totalValue = products?.reduce((s, p) => s + (p.qty ?? 0) * (p.price ?? 0), 0) ?? 0;
  const lowStock = products?.filter(p => (p.qty ?? 0) < 10).length ?? 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayMovements = allMovements?.filter(m => m.created_at?.slice(0, 10) === today).length ?? 0;

  const el = (id) => document.getElementById(id);
  if (el('stat-products')) el('stat-products').textContent = productsCount;
  if (el('stat-movements')) el('stat-movements').textContent = movements ?? 0;
  if (el('stat-users')) el('stat-users').textContent = users ?? 0;
  if (el('stat-value')) el('stat-value').textContent = totalValue.toFixed(2);
  if (el('stat-low')) el('stat-low').textContent = lowStock;
  if (el('stat-today')) el('stat-today').textContent = todayMovements;
}