document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('workers/list.html');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>العمال</h2>
    </div>

    <div id="workers">جارٍ التحميل...</div>
  `;

  await loadWorkers();
});

async function loadWorkers() {
  const { data: { user } } = await db.auth.getUser();

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const container = document.getElementById('workers');

  if (!profile?.organization_id) {
    container.innerHTML = `<div class="alert alert-error">لا يمكن تحديد المنظمة</div>`;
    return;
  }

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <p>لا يوجد عمال</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="workers-grid">
      ${data.map(w => `
        <div class="worker-card">
          <div class="worker-avatar">
            ${w.avatar_url
              ? `<img src="${w.avatar_url}" alt="${w.full_name}">`
              : `<i class="fas fa-user"></i>`}
          </div>
          <div class="worker-info">
            <strong>${w.full_name ?? 'بدون اسم'}</strong>
            <span class="worker-role">${w.role === 'admin' ? 'مدير' : 'عامل'}</span>
            <span class="worker-status ${w.status ?? 'offline'}">${w.status ?? 'غير متصل'}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}