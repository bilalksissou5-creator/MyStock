// ============================================
// صفحة الحركات
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/list.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('mv_title_full');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('mv_title')}</h2>
      <a href="out.html" class="btn-primary">
        <i class="fas fa-circle-minus"></i>
        <span>${tr('mv_out_product')}</span>
      </a>
    </div>

    <div id="movements">${tr('loading')}</div>
  `;

  await loadMovements();
});

async function loadMovements() {
  const tr = (key) => (window.t ? window.t(key) : key);
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  const { data, error } = await db
    .from('stock_movements')
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false })
    .limit(100);

  const container = document.getElementById('movements');
  if (!container) return;

  if (error) {
    container.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')} ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-right-left"></i>
        <p>${tr('mv_empty')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="movements-list">
      ${data.map(m => {
        const typeLabel = m.type === 'in' ? tr('mv_in') : tr('mv_out');
        const typeClass = m.type === 'in' ? 'in' : 'out';
        const date = new Date(m.created_at).toLocaleString(locale);

        return `
          <div class="movement-item">
            <div class="movement-icon ${typeClass}">
              <i class="fas fa-${m.type === 'in' ? 'arrow-down' : 'arrow-up'}"></i>
            </div>
            <div class="movement-info">
              <strong>${m.products?.name ?? tr('mv_deleted')}</strong>
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