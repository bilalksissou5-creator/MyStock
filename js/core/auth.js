// ============================================
// المصادقة + حالة الاتصال + فحص الاشتراك
// 🏛️ المعمارية الاحترافية (State-Based Routing)
// ============================================

// ============================================
// تسجيل الدخول العادي (بالبريد)
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
// ✅ تسجيل الدخول باستخدام Google
// ============================================
async function signInWithGoogle() {
  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // نوجهه إلى لوحة التحكم، والشرطي (requireAuth) سيتصرف
        redirectTo: window.location.origin + '/dashboard.html',
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
// 🚦 شرطي المرور: حماية الصفحات وتوجيه المستخدم
// ============================================
async function requireAuth() {
  const user = await getCurrentUser();
  
  // 1. إذا لم يكن مسجلاً، اذهب لصفحة الدخول
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }

  await setOnline(user.id);
  startHeartbeat(user.id);

  const currentPage = window.location.pathname;

  // الصفحات العامة التي لا تحتاج فحص اشتراك (لتجنب الحلقات المفرغة)
  const isAuthPage = currentPage.includes('login.html') || 
                     currentPage.includes('register.html') || 
                     currentPage.includes('complete-profile.html') || 
                     currentPage.includes('auth-callback.html');

  if (isAuthPage) return user;

  // 2. جلب بيانات الملف الشخصي (مع حالة إكمال البيانات)
  const { data: profile, error } = await db
    .from('profiles')
    .select('organization_id, role, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    window.location.href = '/complete-profile.html';
    return null;
  }

  // 3. إذا لم يكمل البيانات بعد -> اذهب لصفحة إكمال البيانات
  if (!profile?.onboarding_completed) {
    if (!currentPage.includes('complete-profile.html')) {
      window.location.href = '/complete-profile.html';
    }
    return user;
  }

  // 4. التحقق من الاشتراك (بما أنه أكمل البيانات)
  let sub = null;
  const { data: userSub } = await db
    .from('subscriptions')
    .select('status, expires_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  sub = userSub;

  if (!sub && profile.organization_id) {
    const { data: orgSub } = await db
      .from('subscriptions')
      .select('status, expires_at')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    sub = orgSub;
  }

  const status = sub?.status ?? 'none';
  const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  // 5. إذا لم يكن هناك اشتراك نشط -> اذهب لصفحة الاشتراك
  if (status !== 'active' || isExpired) {
    if (!currentPage.includes('subscription.html') && !currentPage.includes('bank-card.html')) {
      window.location.href = '/subscription.html';
    }
    return user;
  }

  // 6. إذا كان كل شيء سليماً، اسمح له بالمرور
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

function isUserOnline(profile) {
  if (!profile || profile.status !== 'online' || !profile.last_active_at) return false;
  const lastActive = new Date(profile.last_active_at).getTime();
  return (Date.now() - lastActive) / 1000 < 60;
}

// ============================================
// الأحداث (Event Listeners)
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
        // التحويل إلى لوحة التحكم (الشرطي سيتصرف)
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