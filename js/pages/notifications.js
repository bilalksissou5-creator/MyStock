// ============================================
// صفحة الإشعارات
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  window.__stopNotifPolling = true;

  renderLayout('notifications.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('ntf_title_full');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="notifications-header">
      <h2>${tr('ntf_title')}</h2>
    </div>

    <div id="notifications-list" class="notifications-list">
      <p style="text-align:center; color:#737373;">${tr('loading')}</p>
    </div>
  `;

  await markAllAsSeen();
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
  const tr = (key) => (window.t ? window.t(key) : key);
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  const { data: { user } } = await db.auth.getUser();
  const container = document.getElementById('notifications-list');

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    container.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')} ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="notifications-empty">
        <i class="fas fa-bell-slash"></i>
        <p>${tr('ntf_empty')}</p>
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
    const time = formatTime(n.created_at, tr, locale);

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
    await db.from('notifications').update({ is_read: true }).eq('id', id);

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
function formatTime(iso, tr, locale) {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return tr('ntf_now');
  if (diff < 3600) return `${tr('ntf_min_ago')} ${Math.floor(diff / 60)} ${tr('ntf_min')}`;
  if (diff < 86400) return `${tr('ntf_hour_ago')} ${Math.floor(diff / 3600)} ${tr('ntf_hour')}`;
  if (diff < 604800) return `${tr('ntf_day_ago')} ${Math.floor(diff / 86400)} ${tr('ntf_day')}`;

  return date.toLocaleDateString(locale);
}