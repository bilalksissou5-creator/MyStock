// ============================================
// الإشعارات
// ✅ دعم إشعارات الهاتف مع صور مخصصة (Banner) + محرك ذكي لاختيار الصور
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

async function createNotification({
  userId,
  orgId,
  title,
  message,
  type = 'info',
  link = null,
  userName = null,
  imageUrl = null,
}) {
  const { error } = await db.from('notifications').insert({
    user_id: userId,
    organization_id: orgId,
    title,
    message,
    type,
    link,
    user_name: userName,
    image_url: imageUrl,
  });

  if (error) {
    console.error('Notification error:', error);
    return false;
  }
  return true;
}

async function notifyOrganization({
  orgId,
  title,
  message,
  type = 'info',
  link = null,
  userName = null,
  excludeUserId = null,
  imageUrl = null,
}) {
  const { data: members, error } = await db
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId);

  if (error || !members) {
    console.error('Failed to fetch members:', error);
    return false;
  }

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
      image_url: imageUrl,
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

async function logActivity({
  orgId = null,
  title,
  message,
  type = 'info',
  link = null,
  userName = null,
  excludeUserId = null,
  imageUrl = null,
}) {
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

  if (!orgId) return false;

  return await notifyOrganization({
    orgId, title, message, type, link, userName, excludeUserId, imageUrl
  });
}

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
// 🧠 محرك اختيار الصورة الذكي
// ============================================
function getSmartImage(notification) {
  const baseUrl = window.location.origin;
  
  // 1. إذا كانت الصورة محددة يدوياً في قاعدة البيانات، استخدمها
  if (notification.image_url) return notification.image_url;

  const link = (notification.link || '').toLowerCase();
  const type = (notification.type || '').toLowerCase();

  // 2. تحليل الرابط (link) لمعرفة نوع الإشعار
  if (link.includes('/receipt') || link.includes('/out')) {
    return baseUrl + '/assets/img/receipt-banner.png'; // صورة فاتورة البيع
  }
  if (link.includes('/invoice') || link.includes('/products/add')) {
    return baseUrl + '/assets/img/product-banner.png'; // صورة فاتورة شراء/منتج
  }
  if (link.includes('/products')) {
    return baseUrl + '/assets/img/product-banner.png'; // صورة منتج
  }
  if (link.includes('/worker') || link.includes('/member')) {
    return baseUrl + '/assets/img/worker-banner.png'; // صورة عامل
  }
  if (link.includes('/bank-card') || link.includes('/subscription')) {
    return baseUrl + '/assets/img/payment-banner.png'; // صورة دفع/اشتراك
  }

  // 3. تحليل النوع (type) كخيار احتياطي
  if (type === 'warning') {
    return baseUrl + '/assets/img/warning-banner.png'; // صورة تحذير (مخزون منخفض)
  }

  // 4. الصورة الافتراضية (شعار التطبيق)
  return baseUrl + '/assets/img/icon-512.png';
}

// ============================================
// ✅ التحديث الفوري (Realtime) + إشعارات النظام
// ============================================
let notifRealtimeChannel = null;

function startNotifPolling() {
  if (window.__stopNotifPolling) {
    updateNotifCounter();
    return;
  }

  updateNotifCounter();

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  if (notifRealtimeChannel) {
    db.removeChannel(notifRealtimeChannel);
    notifRealtimeChannel = null;
  }

  notifRealtimeChannel = db.channel('realtime-notifications-' + Date.now())
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      async (payload) => {
        updateNotifCounter();

        try {
          const { data: { user } } = await db.auth.getUser();
          
          if (user && payload.new && payload.new.user_id === user.id) {
            
            if (typeof window.playNotificationAlerts === 'function') {
              window.playNotificationAlerts();
            }

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const reg = await navigator.serviceWorker.ready;
                const baseUrl = window.location.origin;
                
                // ✅ استخدام المحرك الذكي لجلب الصورة تلقائياً
                const smartImage = getSmartImage(payload.new);

                reg.showNotification(payload.new.title || 'إشعار جديد', {
                  body: payload.new.message || '',
                  icon: baseUrl + '/assets/img/icon-192.png', // شعار التطبيق
                  image: smartImage, // 🚀 الصورة التي اختارها النظام تلقائياً
                  badge: baseUrl + '/assets/img/badge.png', // أيقونة صغيرة
                  vibrate: [200, 100, 200],
                  data: { url: payload.new.link || '/' }
                });
              } catch (err) {
                console.warn('فشل إظهار إشعار النظام:', err);
              }
            }
          }
        } catch (err) {
          console.warn('Error checking notification user:', err);
        }
      }
    )
    .subscribe();
}