// ============================================
// المصادقة + البوابة الذكية (Router)
// ============================================

async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  await setOnline(data.user.id);
  return { ok: true, user: data.user };
}

async function signInWithGoogle() {
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard.html',
        scopes: 'https://www.googleapis.com/auth/userinfo.email'
      }
    });
    if (error) throw error;
  } catch (error) {
    alert('خطأ: ' + error.message);
  }
}

async function logout() {
  const { data: { user } } = await db.auth.getUser();
  if (user) await setOffline(user.id);
  await db.auth.signOut();
  window.location.href = '/';
}

async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// ============================================
// 🚦 البوابة الذكية (Router)
// ============================================
async function requireAuth() {
  const currentPage = window.location.pathname;

  // 1. استثناء الصفحات العامة
  if (
    currentPage.includes('login.html') ||
    currentPage.includes('register.html') ||
    currentPage === '/' ||
    currentPage.includes('index.html')
  ) {
    return null;
  }

  // 2. ✅ انتظار الجلسة عالمياً (هذا يحل مشكلة طرد المستخدم قبل قراءة الجلسة)
  console.log('[Guard] Waiting for auth session...');
  const session = await window.authReadyPromise;
  console.log('[Guard] Session:', session?.user?.email || 'none');

  // 3. لا توجد جلسة → صفحة الدخول
  if (!session) {
    window.location.replace('/login.html');
    return null;
  }

  const user = session.user;
  await setOnline(user.id);
  startHeartbeat(user.id);

  // 4. إذا كنا في صفحة إكمال البيانات، لا توجه المستخدم (دعه يكملها)
  if (currentPage.includes('complete-profile.html')) {
    return user;
  }

  // 5. قراءة حالة المستخدم من قاعدة البيانات
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, onboarding_completed')
    .eq('id', user.id)
    .single();

  // 6. لم يكمل البيانات → صفحة إكمال البيانات
  if (!profile?.onboarding_completed) {
    window.location.replace('/complete-profile.html');
    return user;
  }

  // 7. التحقق من الاشتراك
  const { data: sub } = await db
    .from('subscriptions')
    .select('status, expires_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  const isActive =
    sub?.status === 'active' &&
    (!sub.expires_at || new Date(sub.expires_at) > new Date());

  if (
    !isActive &&
    !currentPage.includes('subscription.html') &&
    !currentPage.includes('bank-card.html')
  ) {
    window.location.replace('/subscription.html');
    return user;
  }

  return user;
}

// ============================================
// حالة الاتصال
// ============================================
async function setOnline(userId) {
  if (!userId) return;
  await db.from('profiles').update({ status: 'online', last_active_at: new Date().toISOString() }).eq('id', userId);
}

async function setOffline(userId) {
  if (!userId) return;
  await db.from('profiles').update({ status: 'offline', last_active_at: new Date().toISOString() }).eq('id', userId);
}

let heartbeatInterval = null;
function startHeartbeat(userId) {
  if (!userId) return;
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(async () => {
    await db.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', userId);
  }, 30000);
  window.addEventListener('beforeunload', () => { if (heartbeatInterval) clearInterval(heartbeatInterval); });
}

// ============================================
// الأحداث
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (form) {
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
  }

  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }

  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});