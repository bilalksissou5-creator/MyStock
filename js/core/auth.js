// ============================================
// المصادقة + حالة الاتصال
// الدور: تسجيل الدخول / الخروج + حماية الصفحات + online/offline
// ============================================

// ============================================
// تسجيل الدخول
// ============================================
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  // ✅ تحديث الحالة إلى online
  await setOnline(data.user.id);

  return { ok: true, user: data.user };
}

// ============================================
// تسجيل الخروج
// ============================================
async function logout() {
  const { data: { user } } = await db.auth.getUser();
  if (user) await setOffline(user.id);

  await db.auth.signOut();
  window.location.href = '/login.html';
}

// ============================================
// جلب المستخدم الحالي
// ============================================
async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// ============================================
// حماية الصفحة — يجب تسجيل الدخول
// ============================================
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }

  // ✅ تحديث الحالة عند فتح أي صفحة محمية
  await setOnline(user.id);
  startHeartbeat(user.id);

  return user;
}

// ============================================
// ✅ حالة الاتصال: online / offline
// ============================================
async function setOnline(userId) {
  if (!userId) return;
  await db
    .from('profiles')
    .update({
      status: 'online',
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function setOffline(userId) {
  if (!userId) return;
  await db
    .from('profiles')
    .update({
      status: 'offline',
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// ============================================
// ✅ Heartbeat: تحديث last_active_at كل 30 ثانية
// ============================================
let heartbeatInterval = null;

function startHeartbeat(userId) {
  if (!userId) return;

  // نظّف أي heartbeat قديم
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    await db
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  }, 30000); // كل 30 ثانية

  // عند إغلاق التبويب / المتصفح
  window.addEventListener('beforeunload', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    // محاولة أخيرة لتسجيل offline (قد لا تنجح دائماً)
    navigator.sendBeacon?.(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      new Blob(
        [JSON.stringify({ status: 'offline', last_active_at: new Date().toISOString() })],
        { type: 'application/json' }
      )
    );
  });

  // عند إخفاء الصفحة (التبويب في الخلفية)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      // عاد للصفحة → حدّث last_active_at
      await db
        .from('profiles')
        .update({ status: 'online', last_active_at: new Date().toISOString() })
        .eq('id', userId);
    }
  });
}

// ============================================
// ✅ فحص: هل مستخدم "متصل"؟
// يُعتبر متصل إذا كان status='online' AND last_active_at خلال آخر 60 ثانية
// ============================================
function isUserOnline(profile) {
  if (!profile) return false;
  if (profile.status !== 'online') return false;
  if (!profile.last_active_at) return false;

  const lastActive = new Date(profile.last_active_at).getTime();
  const now = Date.now();
  const diffSeconds = (now - lastActive) / 1000;

  return diffSeconds < 60;
}

// ============================================
// نموذج تسجيل الدخول (لصفحة login.html)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('login-error');

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الدخول...';
    errBox.style.display = 'none';

    const result = await login(email, password);

    if (!result.ok) {
      errBox.textContent = result.error;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'دخول';
    } else {
      window.location.href = '/dashboard.html';
    }
  });

  // زر تسجيل الخروج
  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});