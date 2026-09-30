document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/list.html');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>الحركات</h2>
      <a href="out.html" class="btn-primary">
        <i class="fas fa-circle-minus"></i>
        <span>إخراج منتج</span>
      </a>
    </div>

    <div id="movements">جارٍ التحميل...</div>
  `;

  await loadMovements();
});

async function loadMovements() {
  const { data, error } = await db
    .from('stock_movements')
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false })
    .limit(100);

  const container = document.getElementById('movements');
  if (!container) return;

  if (error) {
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-right-left"></i>
        <p>لا توجد حركات بعد</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="movements-list">
      ${data.map(m => {
        const typeLabel = m.type === 'in' ? 'إدخال' : 'إخراج';
        const typeClass = m.type === 'in' ? 'in' : 'out';
        const date = new Date(m.created_at).toLocaleString('ar');

        return `
          <div class="movement-item">
            <div class="movement-icon ${typeClass}">
              <i class="fas fa-${m.type === 'in' ? 'arrow-down' : 'arrow-up'}"></i>
            </div>
            <div class="movement-info">
              <strong>${m.products?.name ?? 'منتج محذوف'}</strong>
              <span class="movement-meta">${typeLabel} • ${date}</span>
            </div>
            <div class="movement-qty ${typeClass}">
              ${m.type === 'in' ? '+' : '-'}${m.quantity}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}