// ============================================
// المصادقة + البوابة الأمنية (Auth Guard)
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
// تسجيل الدخول باستخدام Google (يوجه للوحة التحكم)
// ============================================
async function signInWithGoogle() {
  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ✅ نوجه دائماً إلى لوحة التحكم، والشرطي (requireAuth) سيتصرف
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
// 🚦 شرطي المرور (Auth Guard)
// ============================================
async function requireAuth() {
  const currentPage = window.location.pathname;

  // استثناء الصفحات العامة
  if (currentPage.includes('login.html') || 
      currentPage.includes('register.html') || 
      currentPage === '/' || 
      currentPage.includes('index.html')) {
    return await getCurrentUser();
  }

  // ✅ الانتظار باستخدام onAuthStateChange + مهلة احتياطية
  let user = null;
  let resolved = false;

  // 1. الاستماع لأول حدث مصادقة
  const authPromise = new Promise((resolve) => {
    const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
      if (!resolved && session?.user) {
        resolved = true;
        subscription.unsubscribe();
        resolve(session.user);
      }
    });
    // مهلة احتياطية بعد 8 ثوانٍ
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        subscription.unsubscribe();
        resolve(null);
      }
    }, 8000);
  });

  user = await authPromise;

  // 2. إذا لم نجد المستخدم، نحاول مرة أخرى مباشرة
  if (!user) {
    const { data } = await db.auth.getUser();
    user = data?.user || null;
  }

  // 3. إذا لم يوجد مستخدم، اذهب لصفحة الدخول
  if (!user) {
    window.location.replace('/login.html');
    return null;
  }

  await setOnline(user.id);
  startHeartbeat(user.id);

  // 4. إذا كنا في صفحة إكمال البيانات، لا نتحقق من الحالة (المستخدم هنا ليكملها)
  if (currentPage.includes('complete-profile.html')) {
    return user;
  }

  // 5. جلب حالة الملف الشخصي
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, onboarding_completed')
    .eq('id', user.id)
    .single();

  // 6. إذا لم يكمل البيانات → صفحة إكمال البيانات
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

  const isActive = sub?.status === 'active' && 
                   (!sub.expires_at || new Date(sub.expires_at) > new Date());

  // 8. إذا لم يكن مشتركاً → صفحة الاشتراك
  if (!isActive && !currentPage.includes('subscription.html') && !currentPage.includes('bank-card.html')) {
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