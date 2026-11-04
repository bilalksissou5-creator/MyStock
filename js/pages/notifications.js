// ============================================
// صفحة الإشعارات (مع تحديد متعدد وحذف)
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
      <h2 id="notif-header-title">${tr('ntf_title')}</h2>
      <div class="notif-selection-actions">
        <button type="button" id="select-all-btn" class="btn-secondary">
          <i class="fas fa-check-double"></i>
          <span id="select-all-text">${tr('ntf_select_all')}</span>
        </button>
        <button type="button" id="delete-selected-btn" class="btn-danger" disabled>
          <i class="fas fa-trash"></i>
          <span id="delete-count">(0)</span>
        </button>
        <button type="button" id="cancel-selection-btn" class="btn-secondary">
          <i class="fas fa-xmark"></i>
          <span>${tr('ntf_cancel')}</span>
        </button>
      </div>
    </div>

    <div id="notifications-list" class="notifications-list">
      <p style="text-align:center; color:#737373;">${tr('loading')}</p>
    </div>
  `;

  let currentNotifications = [];
  let selectionMode = false;
  const selectedIds = new Set();

  await markAllAsSeen();
  await loadNotifications();

  // Element refs
  const headerTitle = document.getElementById('notif-header-title');
  const selectAllBtn = document.getElementById('select-all-btn');
  const selectAllText = document.getElementById('select-all-text');
  const deleteBtn = document.getElementById('delete-selected-btn');
  const deleteCount = document.getElementById('delete-count');
  const cancelBtn = document.getElementById('cancel-selection-btn');

  // ---- UI Helpers ----
  function updateSelectionUI() {
    const count = selectedIds.size;
    deleteCount.textContent = `(${count})`;
    deleteBtn.disabled = count === 0;
    headerTitle.textContent = (tr('ntf_selected_count') || 'Selected: {n}').replace('{n}', count);

    if (count === currentNotifications.length && count > 0) {
      selectAllText.textContent = tr('ntf_deselect_all') || 'Deselect All';
    } else {
      selectAllText.textContent = tr('ntf_select_all') || 'Select All';
    }
  }

  function enterSelectionMode(initialId = null) {
    selectionMode = true;
    document.body.classList.add('notif-selection-mode');

    if (initialId) {
      selectedIds.add(initialId);
      const el = document.querySelector(`.notification-item[data-id="${initialId}"]`);
      if (el) el.classList.add('selected');
    }

    updateSelectionUI();

    if (navigator.vibrate) navigator.vibrate(30);
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds.clear();
    document.body.classList.remove('notif-selection-mode');
    headerTitle.textContent = tr('ntf_title');

    document.querySelectorAll('.notification-item.selected').forEach(el => {
      el.classList.remove('selected');
    });
  }

  function toggleSelection(id, item) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      item.classList.remove('selected');
    } else {
      selectedIds.add(id);
      item.classList.add('selected');
    }

    if (selectedIds.size === 0) {
      exitSelectionMode();
    } else {
      updateSelectionUI();
    }
  }

  // ---- Select All / Deselect All ----
  selectAllBtn.addEventListener('click', () => {
    if (selectedIds.size === currentNotifications.length) {
      // إلغاء تحديد الكل
      selectedIds.clear();
      document.querySelectorAll('.notification-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      updateSelectionUI();
    } else {
      // تحديد الكل
      currentNotifications.forEach(n => selectedIds.add(n.id));
      document.querySelectorAll('.notification-item').forEach(el => {
        el.classList.add('selected');
      });
      updateSelectionUI();
    }
  });

  // ---- Delete Selected ----
  deleteBtn.addEventListener('click', async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const msg = (tr('ntf_confirm_delete') || 'Delete {n} notifications?').replace('{n}', count);
    if (!confirm(msg)) return;

    deleteBtn.disabled = true;
    deleteCount.textContent = '...';

    try {
      const { error } = await db
        .from('notifications')
        .delete()
        .in('id', Array.from(selectedIds))
        .eq('user_id', user.id);

      if (error) throw error;

      // إزالة من الذاكرة
      currentNotifications = currentNotifications.filter(n => !selectedIds.has(n.id));

      // إزالة من DOM
      const idsToRemove = Array.from(selectedIds);
      idsToRemove.forEach(id => {
        const el = document.querySelector(`.notification-item[data-id="${id}"]`);
        if (el) el.remove();
      });

      exitSelectionMode();

      // إذا فرغت القائمة
      if (currentNotifications.length === 0) {
        document.getElementById('notifications-list').innerHTML = `
          <div class="notifications-empty">
            <i class="fas fa-bell-slash"></i>
            <p>${tr('ntf_empty')}</p>
          </div>
        `;
      }
    } catch (err) {
      alert((tr('prod_detail_err') || 'Error: ') + err.message);
      deleteBtn.disabled = false;
      updateSelectionUI();
    }
  });

  // ---- Cancel ----
  cancelBtn.addEventListener('click', exitSelectionMode);

  // ============================================
  // Long press handler
  // ============================================
  function attachLongPress(item, id) {
    let timer = null;
    let startX = 0, startY = 0;
    let moved = false;

    const start = (e) => {
      if (selectionMode) return;
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      moved = false;

      timer = setTimeout(() => {
        if (!moved && !selectionMode) {
          enterSelectionMode(id);
        }
      }, 600);
    };

    const cancel = () => {
      if (timer) { clearTimeout(timer); timer = null; }
    };

    const move = (e) => {
      if (!timer) return;
      const point = e.touches ? e.touches[0] : e;
      if (Math.abs(point.clientX - startX) > 10 || Math.abs(point.clientY - startY) > 10) {
        moved = true;
        cancel();
      }
    };

    item.addEventListener('touchstart', start, { passive: true });
    item.addEventListener('touchmove', move, { passive: true });
    item.addEventListener('touchend', cancel);
    item.addEventListener('touchcancel', cancel);

    item.addEventListener('mousedown', (e) => { if (e.button === 0) start(e); });
    item.addEventListener('mousemove', move);
    item.addEventListener('mouseup', cancel);
    item.addEventListener('mouseleave', cancel);
  }

  // ============================================
  // تحميل الإشعارات (updated)
  // ============================================
  async function loadNotifications() {
    const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
    const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
    const locale = localeMap[lang] || 'en-US';

    const { data: { user: authUser } } = await db.auth.getUser();
    const container = document.getElementById('notifications-list');

    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      container.innerHTML = `<div class="alert alert-error">${tr('prod_detail_err')} ${error.message}</div>`;
      return;
    }

    currentNotifications = data || [];

    if (!currentNotifications.length) {
      container.innerHTML = `
        <div class="notifications-empty">
          <i class="fas fa-bell-slash"></i>
          <p>${tr('ntf_empty')}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = currentNotifications.map(n => {
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

    // Attach handlers
    container.querySelectorAll('.notification-item').forEach(item => {
      const id = item.dataset.id;

      item.addEventListener('click', (e) => {
        if (selectionMode) {
          e.preventDefault();
          e.stopPropagation();
          toggleSelection(id, item);
        } else {
          handleItemClick(id);
        }
      });

      attachLongPress(item, id);
    });
  }

  // ============================================
  // عند الضغط على إشعار (وضع عادي)
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