// ============================================
// المصادقة + البوابة الأمنية (Route Guard)
// ============================================

// ============================================
// تسجيل الدخول العادي
// ============================================
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  await setOnline(data.user.id);
  return { ok: true, user: data.user };
}

// ============================================
// تسجيل الدخول باستخدام Google
// ============================================
async function signInWithGoogle() {
  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/complete-profile.html',
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
// 🚦 البوابة الأمنية (Route Guard)
// ============================================
async function requireAuth() {
  const currentPage = window.location.pathname;

  // 1. استثناء الصفحات العامة (الدخول، التسجيل، الرئيسية)
  if (currentPage.includes('login.html') || currentPage.includes('register.html') || currentPage === '/' || currentPage.includes('index.html')) {
    return await getCurrentUser();
  }

  // 2. الانتظار حتى تجهز الجلسة (بحد أقصى 5 ثوانٍ)
  let session = null;
  for (let i = 0; i < 10; i++) {
    const { data } = await db.auth.getSession();
    if (data?.session) {
      session = data.session;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. إذا لم توجد جلسة، اذهب لصفحة الدخول
  if (!session) {
    window.location.replace('/login.html');
    return null;
  }

  const user = session.user;
  await setOnline(user.id);
  startHeartbeat(user.id);

  // 4. جلب بيانات الملف الشخصي (مع حالة إكمال البيانات)
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, onboarding_completed')
    .eq('id', user.id)
    .single();

  // 5. إذا لم يكمل البيانات -> اذهب لصفحة إكمال البيانات
  if (!profile?.onboarding_completed) {
    if (!currentPage.includes('complete-profile.html')) {
      window.location.replace('/complete-profile.html');
    }
    return user;
  }

  // 6. التحقق من الاشتراك
  const { data: sub } = await db
    .from('subscriptions')
    .select('status')
    .eq('owner_id', user.id)
    .maybeSingle();

  const isActive = sub?.status === 'active';

  // 7. إذا لم يكن مشتركاً -> اذهب لصفحة الاشتراك
  if (!isActive && !currentPage.includes('subscription.html') && !currentPage.includes('bank-card.html')) {
    window.location.replace('/subscription.html');
    return user;
  }

  // 8. إذا كان كل شيء سليماً، اسمح له بالمرور
  return user;
}

// ============================================
// حالة الاتصال: online / offline
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
        // بعد الدخول، البوابة ستعرف أين توجهه
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