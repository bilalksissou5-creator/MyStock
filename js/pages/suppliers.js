// ============================================
// صفحة الموردين (مع التحديث الفوري بسرعة البرق)
// ✅ دعم كامل للترجمة
// ============================================
let suppliersChannel = null;
let cachedSuppliers = []; // مخزن مؤقت

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('suppliers/list.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('sup_title_full');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('sup_title')}</h2>
      <a href="/suppliers/add.html" class="btn-primary">
        <i class="fas fa-plus"></i>
        <span>${tr('sup_add')}</span>
      </a>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="search-suppliers" placeholder="${tr('sup_search_ph')}">
    </div>

    <div id="suppliers-list" class="suppliers-list">
      <p style="text-align:center; color:#737373;">${tr('loading')}</p>
    </div>
  `;

  // ✅ 1. سرعة البرق: التحقق من وجود مورد جديد تم إضافته للتو
  const instantData = sessionStorage.getItem('instant_new_supplier');
  if (instantData) {
    try {
      const instantSupplier = JSON.parse(instantData);
      sessionStorage.removeItem('instant_new_supplier'); // مسحها بعد الاستخدام
      
      // عرض المورد فوراً في الشاشة دون انتظار السيرفر
      cachedSuppliers = [instantSupplier];
      renderSuppliersToDOM();
    } catch (e) { console.warn('Instant supplier error:', e); }
  }

  // ✅ 2. جلب البيانات الكاملة من السيرفر في الخلفية
  await loadSuppliers();

  // تفعيل البحث
  document.getElementById('search-suppliers').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.supplier-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // ✅ 3. التحديث الفوري من الأجهزة الأخرى (Realtime)
  suppliersChannel = db.channel('custom-suppliers-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'suppliers' },
      (payload) => {
        console.log('تحديث فوري للموردين من جهاز آخر:', payload);
        loadSuppliers(); 
      }
    )
    .subscribe();
});

async function loadSuppliers() {
  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    const container = document.getElementById('suppliers-list');
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  cachedSuppliers = data || [];
  renderSuppliersToDOM();
}

function renderSuppliersToDOM() {
  const tr = (key) => (window.t ? window.t(key) : key);
  const container = document.getElementById('suppliers-list');
  if (!container) return;

  if (cachedSuppliers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-truck"></i>
        <p>${tr('sup_empty')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="suppliers-grid">
      ${cachedSuppliers.map(s => `
        <a href="/suppliers/detail.html?id=${s.id}" class="supplier-card">
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