// ============================================
// المصادقة + حالة الاتصال + فحص الاشتراك
// ============================================

// ============================================
// تسجيل الدخول العادي
// ============================================
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  await setOnline(data.user.id);

  try {
    const { data: profile } = await db.from('profiles').select('app_lang').eq('id', data.user.id).single();
    const localLang = localStorage.getItem('app_lang');
    if (localLang && profile?.app_lang !== localLang) {
      await db.from('profiles').update({ app_lang: localLang }).eq('id', data.user.id);
    } else if (!localLang && profile?.app_lang) {
      localStorage.setItem('app_lang', profile.app_lang);
    }
  } catch (e) { console.warn(e); }

  return { ok: true, user: data.user };
}

// ============================================
// ✅ تسجيل الدخول باستخدام Google (يوجه إلى صفحة الاستقبال)
// ============================================
async function signInWithGoogle() {
  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth-callback.html',
        scopes: 'https://www.googleapis.com/auth/userinfo.email'
      }
    });
    if (error) throw error;
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    alert('حدث خطأ أثناء الاتصال بـ Google.');
  }
}

// ============================================
// تسجيل الخروج
// ============================================
async function logout() {
  const { data: { user } } = await db.auth.getUser();
  if (user) await setOffline(user.id);
  await db.auth.signOut();
  window.location.href = '/';
}

// ============================================
// جلب المستخدم الحالي
// ============================================
async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// ============================================
// حماية الصفحة
// ============================================
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }

  await setOnline(user.id);
  startHeartbeat(user.id);

  const currentPage = window.location.pathname;
  const isSubscriptionPage = currentPage.includes('subscription.html');
  const isRegisterPage = currentPage.includes('register');
  const isLoginPage = currentPage.includes('login');
  const isBankCardPage = currentPage.includes('bank-card');
  const isCompleteProfilePage = currentPage.includes('complete-profile');
  const isAuthCallbackPage = currentPage.includes('auth-callback');

  if (isSubscriptionPage || isRegisterPage || isLoginPage || isBankCardPage || isCompleteProfilePage || isAuthCallbackPage) {
    return user;
  }

  const { data: profile } = await db.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (!profile?.organization_id) {
    window.location.href = '/complete-profile.html';
    return null;
  }

  let sub = null;
  const { data: userSub } = await db.from('subscriptions').select('status, expires_at').eq('owner_id', user.id).maybeSingle();
  sub = userSub;
  if (!sub) {
    const { data: orgSub } = await db.from('subscriptions').select('status, expires_at').eq('organization_id', profile.organization_id).maybeSingle();
    sub = orgSub;
  }

  const status = sub?.status ?? 'none';
  const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  if (status === 'active' && !isExpired) {
    return user;
  }

  window.location.href = '/subscription.html';
  return null;
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
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await db.from('profiles').update({ status: 'online', last_active_at: new Date().toISOString() }).eq('id', userId);
    }
  });
}

function isUserOnline(profile) {
  if (!profile || profile.status !== 'online' || !profile.last_active_at) return false;
  const lastActive = new Date(profile.last_active_at).getTime();
  return (Date.now() - lastActive) / 1000 < 60;
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