// ============================================
// صفحة الموردين
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('suppliers/list.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h2>الموردون</h2>
      <a href="add.html" class="btn-primary">
        <i class="fas fa-plus"></i>
        <span>إضافة مورد</span>
      </a>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="search-suppliers" placeholder="بحث باسم المورد...">
    </div>

    <div id="suppliers-list" class="suppliers-list">
      <p style="text-align:center; color:#737373;">جارٍ التحميل...</p>
    </div>
  `;

  await loadSuppliers();

  document.getElementById('search-suppliers').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.supplier-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
});

async function loadSuppliers() {
  const container = document.getElementById('suppliers-list');

  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-truck"></i>
        <p>لا يوجد موردون بعد</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="suppliers-grid">
      ${data.map(s => `
        <a href="detail.html?id=${s.id}" class="supplier-card">
          <div class="supplier-avatar">
            <i class="fas fa-truck"></i>
          </div>
          <div class="supplier-info">
            <strong>${s.name}</strong>
            ${s.phone ? `<span class="supplier-phone"><i class="fas fa-phone"></i> ${s.phone}</span>` : ''}
            ${s.email ? `<span class="supplier-email"><i class="fas fa-envelope"></i> ${s.email}</span>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  `;
}