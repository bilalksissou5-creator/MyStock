// ============================================
// الإشعارات
// الدور: جلب + إنشاء إشعارات للمستخدمين في المنظمة
// ============================================

// ============================================
// جلب عدد الإشعارات غير المقروءة
// ============================================
async function getUnreadCount() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return 0;

  const { count, error } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return 0;
  return count ?? 0;
}

// ============================================
// إنشاء إشعار لمستخدم واحد
// ============================================
async function createNotification({
  userId,
  orgId,
  title,
  message,
  type = 'info',
  link = null,
  userName = null,
}) {
  const { error } = await db.from('notifications').insert({
    user_id: userId,
    organization_id: orgId,
    title,
    message,
    type,
    link,
    user_name: userName,
  });

  if (error) {
    console.error('Notification error:', error);
    return false;
  }
  return true;
}

// ============================================
// إنشاء إشعار لكل عمال المنظمة
// ============================================
async function notifyOrganization({
  orgId,
  title,
  message,
  type = 'info',
  link = null,
  userName = null,
  excludeUserId = null,
}) {
  // جلب أعضاء المنظمة
  const { data: members, error } = await db
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId);

  if (error || !members) {
    console.error('Failed to fetch members:', error);
    return false;
  }

  // تحضير الإشعارات
  const notifications = members
    .filter(m => m.id !== excludeUserId)
    .map(m => ({
      user_id: m.id,
      organization_id: orgId,
      title,
      message,
      type,
      link,
      user_name: userName,
    }));

  if (notifications.length === 0) return true;

  const { error: insertError } = await db
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('Bulk notification error:', insertError);
    return false;
  }
  return true;
}

// ============================================
// ✅ دالة مركزية: سجّل نشاطاً + أنشئ إشعاراً
// استخدمها من أي مكان في التطبيق
//
// مثال:
//   await logActivity({
//     title: 'تعديل منتج',
//     message: 'تم تعديل المنتج X',
//     type: 'info',
//     link: '/products/list.html',
//   });
// ============================================
async function logActivity({
  orgId = null,
  title,
  message,
  type = 'info',
  link = null,
  userName = null,
  excludeUserId = null,
}) {
  // إذا لم يُمرر orgId أو userName — جلبهما تلقائياً
  if (!orgId || !userName) {
    try {
      const { data: { user } } = await db.auth.getUser();
      if (user) {
        const { data: profile } = await db
          .from('profiles')
          .select('organization_id, full_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          orgId = orgId || profile.organization_id;
          userName = userName || profile.full_name;
        }
      }
    } catch (err) {
      console.error('logActivity: failed to fetch profile', err);
    }
  }

  if (!orgId) {
    console.warn('logActivity: no orgId — skipped');
    return false;
  }

  return await notifyOrganization({
    orgId,
    title,
    message,
    type,
    link,
    userName,
    excludeUserId,
  });
}

// ============================================
// تحديث عداد الإشعارات في Header
// ============================================
async function updateNotifCounter() {
  const counter = document.getElementById('notif-count');
  if (!counter) return;

  if (window.__stopNotifPolling) {
    counter.classList.remove('has-count');
    return;
  }

  const count = await getUnreadCount();

  if (count > 0) {
    counter.textContent = count > 99 ? '99+' : count;
    counter.classList.add('has-count');
  } else {
    counter.classList.remove('has-count');
  }
}

// ============================================
// بدء التحديث الدوري (كل 30 ثانية)
// ============================================
function startNotifPolling() {
  if (window.__stopNotifPolling) {
    updateNotifCounter();
    return;
  }
  updateNotifCounter();
  setInterval(updateNotifCounter, 30000);
}