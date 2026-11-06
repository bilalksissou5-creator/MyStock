// ============================================
// المصادقة + حالة الاتصال + فحص الاشتراك
// ============================================
// ⚠️ قاعدة: الاشتراك على مستوى المنظمة (organization_id)
// - المدير هو المسؤول عن الدفع
// - النواب والعمال يستفيدون من اشتراك المدير
// ============================================

// ============================================
// تسجيل الدخول العادي
// ============================================
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  await setOnline(data.user.id);

  // ✅ إصلاح: احترام اللغة المختارة محلياً أولاً
  try {
    const { data: profile } = await db
      .from('profiles')
      .select('app_lang')
      .eq('id', data.user.id)
      .single();

    const localLang = localStorage.getItem('app_lang');

    if (localLang) {
      // المستخدم لديه لغة محفوظة في الهاتف (ربما اختارها من الصفحة الرئيسية)
      // إذا اختلفت عن قاعدة البيانات، نحدث قاعدة البيانات لتتزامن
      if (profile?.app_lang !== localLang) {
        await db.from('profiles').update({ app_lang: localLang }).eq('id', data.user.id);
      }
    } else if (profile?.app_lang) {
      // إذا لم يكن هناك لغة محفوظة في الهاتف، نأخذ من قاعدة البيانات
      localStorage.setItem('app_lang', profile.app_lang);
    }
  } catch (e) {
    console.warn('خطأ في جلب أو تحديث لغة المستخدم:', e);
  }

  return { ok: true, user: data.user };
}

// ============================================
// ✅ تسجيل الدخول باستخدام Google (تم التحديث)
// ============================================
async function signInWithGoogle() {
  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // التوجيه إلى صفحة الاستقبال الوسيطة
        redirectTo: window.location.origin + '/auth-callback.html',
        
        // ✅ إضافة صلاحية قراءة البريد الإلكتروني بشكل صريح
        scopes: 'https://www.googleapis.com/auth/userinfo.email'
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    alert('حدث خطأ أثناء الاتصال بـ Google. يرجى المحاولة مرة أخرى.');
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
// حماية الصفحة — يجب تسجيل الدخول + اشتراك نشط
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

  // ✅ الصفحات المسموحة بدون اشتراك
  const isSubscriptionPage = currentPage.includes('subscription.html');
  const isRegisterPage = currentPage.includes('register');
  const isLoginPage = currentPage.includes('login');
  const isBankCardPage = currentPage.includes('bank-card');

  if (isSubscriptionPage || isRegisterPage || isLoginPage || isBankCardPage) {
    return user;
  }

  // ⚠️ باقي الصفحات تحتاج اشتراك نشط

  // جلب بيانات المستخدم
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  // ✅ إذا لم تكن هناك منظمة → حول للتسجيل
  if (!profile?.organization_id) {
    window.location.href = '/register.html';
    return null;
  }

  // جلب الاشتراك (من المستخدم أولاً، ثم من المنظمة)
  let sub = null;

  const { data: userSub } = await db
    .from('subscriptions')
    .select('status, expires_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  sub = userSub;

  if (!sub) {
    const { data: orgSub } = await db
      .from('subscriptions')
      .select('status, expires_at')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    sub = orgSub;
  }

  // ✅ فحص الحالة
  const status = sub?.status ?? 'none';
  const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  // ✅ الاشتراك النشط فقط
  if (status === 'active' && !isExpired) {
    return user;
  }

  // ❌ غير مشترك (pending / none / cancelled / expired) → حوّل إلى subscription
  window.location.href = '/subscription.html';
  return null;
}

// ============================================
// حالة الاتصال: online / offline
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
// Heartbeat: تحديث last_active_at كل 30 ثانية
// ============================================
let heartbeatInterval = null;

function startHeartbeat(userId) {
  if (!userId) return;

  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    await db
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  }, 30000);

  window.addEventListener('beforeunload', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await db
        .from('profiles')
        .update({ status: 'online', last_active_at: new Date().toISOString() })
        .eq('id', userId);
    }
  });
}

// ============================================
// فحص: هل مستخدم "متصل"؟
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
// الأحداث (Event Listeners)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. نموذج الدخول العادي
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
        // التحويل إلى لوحة التحكم
        window.location.href = '/dashboard.html';
      }
    });
  }

  // 2. زر تسجيل الدخول عبر Google
  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }

  // 3. أزرار تسجيل الخروج
  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});