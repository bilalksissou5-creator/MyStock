// ============================================
// صفحة الإشعارات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  window.__stopNotifPolling = true;

  renderLayout('notifications.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="notifications-header">
      <h2>الإشعارات</h2>
    </div>

    <div id="notifications-list" class="notifications-list">
      <p style="text-align:center; color:#737373;">جارٍ التحميل...</p>
    </div>
  `;

  // 1. علّم كل الإشعارات كـ "مرئية" (seen: true)
  await markAllAsSeen();

  // 2. حمّل الإشعارات (ستُعرض بـ seen: true)
  await loadNotifications();
});

// ============================================
// تعليم كل الإشعارات كـ "مرئية"
// ============================================
async function markAllAsSeen() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  await db
    .from('notifications')
    .update({ seen: true })
    .eq('user_id', user.id)
    .eq('seen', false);
}

// ============================================
// تحميل الإشعارات
// ============================================
async function loadNotifications() {
  const { data: { user } } = await db.auth.getUser();
  const container = document.getElementById('notifications-list');

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="notifications-empty">
        <i class="fas fa-bell-slash"></i>
        <p>لا توجد إشعارات</p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(n => {
    const icons = {
      info: 'fa-circle-info',
      success: 'fa-circle-check',
      warning: 'fa-triangle-exclamation',
      danger: 'fa-circle-exclamation',
    };
    const icon = icons[n.type] || icons.info;
    const time = formatTime(n.created_at);

    // الحالات:
    // - seen فقط ← ✅❌
    // - read ← ✅✅
    const seenClass = n.seen ? 'seen' : '';
    const readClass = n.is_read ? 'read' : '';

    return `
      <div class="notification-item ${seenClass} ${readClass}" data-id="${n.id}">
        <div class="notification-icon ${n.type || 'info'}">
          <i class="fas ${icon}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">
            ${n.title}
            ${n.user_name ? `<span class="notification-user">• ${n.user_name}</span>` : ''}
          </div>
          ${n.message ? `<div class="notification-message">${n.message}</div>` : ''}
          <div class="notification-time">${time}</div>
        </div>
        <div class="notification-checks">
          <i class="fas fa-check"></i>
          <i class="fas fa-check"></i>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      handleItemClick(item.dataset.id);
    });
  });
}

// ============================================
// عند الضغط على إشعار
// ============================================
async function handleItemClick(id) {
  const { data } = await db
    .from('notifications')
    .select('link, is_read')
    .eq('id', id)
    .single();

  if (data && !data.is_read) {
    // علّم هذا الإشعار فقط كـ "مقروء"
    await db.from('notifications').update({ is_read: true }).eq('id', id);

    // حدّث العرض فوراً
    const item = document.querySelector(`.notification-item[data-id="${id}"]`);
    if (item) item.classList.add('read');
  }

  if (data?.link) {
    setTimeout(() => {
      window.location.href = data.link;
    }, 400);
  }
}

// ============================================
// تنسيق الوقت
// ============================================
function formatTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'الآن';
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`;

  return date.toLocaleDateString('ar');
}