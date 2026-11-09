// ============================================
// المصادقة + البوابة الذكية (Route Guard)
// ============================================

async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

async function signInWithGoogle() {
  try {
    const { error } = await db.auth.signInWithOAuth({
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

async function logout() {
  const { data: { user } } = await db.auth.getUser();
  if (user) await setOffline(user.id);
  await db.auth.signOut();
  
  // ✅ مسح آخر صفحة عند تسجيل الخروج (حتى لا تعود عند فتح التطبيق مجدداً)
  localStorage.removeItem('mystock_last_visited_page');
  
  window.location.href = '/index.html';
}

async function getCurrentUser() {
  if (window.authReadyPromise) {
    const session = await window.authReadyPromise;
    if (session?.user) return session.user;
  }
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// ============================================
// 🚦 البوابة الذكية (Auth Guard) - النسخة المحدثة
// ============================================
async function requireAuth() {
  const currentPage = window.location.pathname;

  // 1. الصفحات العامة
  if (
    currentPage.includes('login.html') ||
    currentPage.includes('register.html') ||
    currentPage.includes('complete-profile.html') ||
    currentPage.includes('auth-callback.html') ||
    currentPage === '/' ||
    currentPage.includes('index.html')
  ) {
    return null;
  }

  // 2. انتظار الجلسة
  let user = await getCurrentUser();
  
  // ✅ الإصلاح: إذا لم نجد مستخدم (لأن الهاتف كان في الخلفية)، نحاول تحديث الجلسة قسرياً
  if (!user) {
    const { data: { session } } = await db.auth.refreshSession();
    if (session?.user) {
      user = session.user;
    }
  }

  if (!user) {
    window.location.replace('/login.html');
    return null;
  }

  await setOnline(user.id);
  startHeartbeat(user.id);

  // 3. جلب حالة المستخدم
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, onboarding_completed, role')
    .eq('id', user.id)
    .single();

  // 4. إذا لم يكمل البيانات
  if (!profile?.onboarding_completed) {
    const allowedPages = ['complete-profile.html', 'subscription.html', 'bank-card.html'];
    const isAllowed = allowedPages.some(p => currentPage.includes(p));
    if (!isAllowed) {
      window.location.replace('/complete-profile.html');
    }
    return user;
  }

  // 5. التحقق من الاشتراك (بحث شامل)
  if (!currentPage.includes('subscription.html') && !currentPage.includes('bank-card.html')) {
    
    // أ. البحث عن اشتراك بـ owner_id
    let { data: sub } = await db
      .from('subscriptions')
      .select('status, expires_at')
      .eq('owner_id', user.id)
      .maybeSingle();

    // ب. إذا لم نجد، نبحث بـ organization_id
    if (!sub && profile?.organization_id) {
      const { data: orgSub } = await db
        .from('subscriptions')
        .select('status, expires_at')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();
      sub = orgSub;
    }

    // ج. التحقق من حالة الاشتراك
    const status = sub?.status ?? 'none';
    const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();
    
    const isActive = status === 'active' && !isExpired;

    if (!isActive) {
      window.location.replace('/subscription.html');
      return user;
    }
  }

  // ✅ حفظ آخر صفحة قام المستخدم بزيارتها (لتذكرها عند فتح التطبيق لاحقاً)
  if (!currentPage.includes('login.html') && !currentPage.includes('auth-callback.html') && !currentPage.includes('index.html')) {
    const fullUrl = window.location.pathname + window.location.search;
    localStorage.setItem('mystock_last_visited_page', fullUrl);
  }

  // 6. كل شيء سليم → اسمح بالمرور
  return user;
}

// ============================================
// حالة الاتصال
// ============================================
async function setOnline(userId) {
  if (!userId) return;
  try {
    await db.from('profiles').update({ 
      status: 'online', 
      last_active_at: new Date().toISOString() 
    }).eq('id', userId);
  } catch (e) { console.warn(e); }
}

async function setOffline(userId) {
  if (!userId) return;
  try {
    await db.from('profiles').update({ 
      status: 'offline', 
      last_active_at: new Date().toISOString() 
    }).eq('id', userId);
  } catch (e) { console.warn(e); }
}

// ============================================
// ✅ Heartbeat محسّن
// ============================================
let heartbeatInterval = null;
function startHeartbeat(userId) {
  if (!userId) return;
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    try {
      await db.from('profiles')
        .update({ last_active_at: new Date().toISOString(), status: 'online' })
        .eq('id', userId);
    } catch (e) { console.warn(e); }
  }, 30000);

  window.addEventListener('beforeunload', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    db.from('profiles')
      .update({ status: 'offline', last_active_at: new Date().toISOString() })
      .eq('id', userId);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      db.from('profiles')
        .update({ status: 'offline', last_active_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      db.from('profiles')
        .update({ status: 'online', last_active_at: new Date().toISOString() })
        .eq('id', userId);
    }
  });
}

// ============================================
// ✅ فحص حالة الاتصال
// ============================================
function isUserOnline(profile) {
  if (!profile) return false;
  if (profile.status !== 'online') return false;
  if (!profile.last_active_at) return false;
  const diff = Date.now() - new Date(profile.last_active_at).getTime();
  return diff < 2 * 60 * 1000;
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
        window.location.href = '/auth-callback.html';
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

// ============================================
// ✅ الإصلاح: تحديث الجلسة فوراً عند العودة للتطبيق من الخلفية
// ============================================
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    const currentPage = window.location.pathname;
    if (currentPage.includes('login.html') || currentPage.includes('index.html') || currentPage === '/') return;

    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      const { data: { session: refreshed } } = await db.auth.refreshSession();
      if (!refreshed) {
        window.location.replace('/login.html');
      }
    }
  }
});