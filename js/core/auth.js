// ============================================
// المصادقة + البوابة الذكية (Route Guard)
// ============================================

// ============================================
// تسجيل الدخول العادي (بالبريد)
// ============================================
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

// ============================================
// تسجيل الدخول باستخدام Google (يوجه للوحة التحكم)
// ============================================
async function signInWithGoogle() {
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ✅ نوجه دائماً إلى لوحة التحكم، والبوابة ستقرر الخطوة التالية
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
  window.location.href = '/login.html';
}

// ============================================
// ✅ جلب المستخدم الحالي (مع انتظار الجلسة)
// ============================================
async function getCurrentUser() {
  // ننتظر الوعد العالمي أولاً (authReadyPromise)
  if (window.authReadyPromise) {
    const session = await window.authReadyPromise;
    if (session?.user) return session.user;
  }
  // إذا لم توجد جلسة، نجرب مرة أخيرة مباشرة
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// ============================================
// 🚦 البوابة الذكية (Auth Guard)
// ============================================
async function requireAuth() {
  const currentPage = window.location.pathname;

  // 1. الصفحات العامة (لا تحتاج جلسة)
  if (
    currentPage.includes('login.html') ||
    currentPage.includes('register.html') ||
    currentPage.includes('complete-profile.html') ||
    currentPage === '/' ||
    currentPage.includes('index.html')
  ) {
    return null;
  }

  // 2. انتظار الجلسة
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace('/login.html');
    return null;
  }

  await setOnline(user.id);
  startHeartbeat(user.id);

  // 3. جلب حالة المستخدم من قاعدة البيانات
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, onboarding_completed')
    .eq('id', user.id)
    .single();

  // 4. المرحلة الأولى: لم يكمل البيانات
  if (!profile?.onboarding_completed) {
    // نسمح بالمرور في الصفحات التالية (لتجنب الحلقات المفرغة)
    const allowedPages = ['complete-profile.html', 'subscription.html', 'bank-card.html'];
    const isAllowed = allowedPages.some(p => currentPage.includes(p));
    
    if (!isAllowed) {
      window.location.replace('/complete-profile.html');
    }
    return user;
  }

  // 5. المرحلة الثانية: التحقق من الاشتراك (باستثناء صفحة الاشتراك والبطاقة)
  if (!currentPage.includes('subscription.html') && !currentPage.includes('bank-card.html')) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('status, expires_at')
      .eq('owner_id', user.id)
      .maybeSingle();

    const isActive = sub?.status === 'active' && 
                     (!sub.expires_at || new Date(sub.expires_at) > new Date());

    if (!isActive) {
      window.location.replace('/subscription.html');
      return user;
    }
  }

  // 6. كل شيء سليم → اسمح بالمرور
  return user;
}

// ============================================
// حالة الاتصال: online / offline
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
// Heartbeat (تحديث آخر نشاط)
// ============================================
let heartbeatInterval = null;
function startHeartbeat(userId) {
  if (!userId) return;
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(async () => {
    try {
      await db.from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (e) { console.warn(e); }
  }, 30000);
  
  window.addEventListener('beforeunload', () => { 
    if (heartbeatInterval) clearInterval(heartbeatInterval); 
  });
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
        // بعد الدخول، البوابة ستعرف أين توجهه
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