// ============================================
// المصادقة + حالة الاتصال + فحص الاشتراك
// ============================================
// ⚠️ قاعدة: الاشتراك على مستوى المنظمة (organization_id)
// - المدير هو المسؤول عن الدفع
// - النواب والعمال يستفيدون من اشتراك المدير
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
// حماية الصفحة — يجب تسجيل الدخول + اشتراك نشط
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

  // ✅ فحص الاشتراك (استثناء صفحة الاشتراك نفسها)
  const currentPage = window.location.pathname;
  const isSubscriptionPage = currentPage.includes('subscription.html');
  const isRegisterPage = currentPage.includes('register');
  const isLoginPage = currentPage.includes('login');
  const isInvoicePage = currentPage.includes('invoice.html');
  const isReceiptPage = currentPage.includes('receipt');
  const isReceiptsPrintPage = currentPage.includes('receipts-print');

  // ✅ لا نُفحص في هذه الصفحات
  if (isSubscriptionPage || isRegisterPage || isLoginPage) {
    return user;
  }

  // ✅ جلب الاشتراك
  const { data: subscription } = await db
    .from('subscriptions')
    .select('status, expires_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  // إذا كان المستخدم نائباً/عاملاً، نفحص اشتراك المدير
  let sub = subscription;

  if (!sub) {
    // جلب منظمة المستخدم
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      const { data: orgSub } = await db
        .from('subscriptions')
        .select('status, expires_at')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();
      sub = orgSub;
    }
  }

  // ✅ فحص الحالة
  const status = sub?.status ?? 'none';
  const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  // ✅ الاشتراك النشط فقط
  if (status === 'active' && !isExpired) {
    return user;
  }

  // ✅ إذا كان في صفحة الاشتراك → اسمح
  if (isSubscriptionPage) {
    return user;
  }

  // ✅ إذا كان في صفحة الفاتورة/الإيصال → اسمح (مشاركة مع الآخرين)
  if (isInvoicePage || isReceiptPage || isReceiptsPrintPage) {
    return user;
  }

  // ⚠️ غير مشترك → حوّل إلى subscription.html
  // (إذا كان المستخدم مديراً، يرى الخطة، وإذا كان عاملاً يرى انتظار)
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
// نموذج تسجيل الدخول
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

  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});