// ============================================
// البوابة الذكية
// ============================================

async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

async function requireAuth() {
  const currentPage = window.location.pathname;

  // ✅ الصفحات العامة: لا تُحمى أبداً
  if (
    currentPage.includes('login.html') ||
    currentPage.includes('register.html') ||
    currentPage.includes('complete-profile.html') ||  // 🔑 الحل الجذري
    currentPage === '/' ||
    currentPage.includes('index.html')
  ) {
    return null;
  }

  // انتظار الجلسة
  const session = await window.authReadyPromise;
  if (!session) {
    window.location.replace('/login.html');
    return null;
  }

  const user = session.user;

  // جلب حالة المستخدم
  const { data: profile } = await db
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  // لم يكمل البيانات → إكمال البيانات
  if (!profile?.onboarding_completed) {
    if (!currentPage.includes('complete-profile.html')) {
      window.location.replace('/complete-profile.html');
    }
    return user;
  }

  // التحقق من الاشتراك (باستثناء صفحة الاشتراك والبطاقة)
  if (!currentPage.includes('subscription.html') && !currentPage.includes('bank-card.html')) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('status')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (sub?.status !== 'active') {
      window.location.replace('/subscription.html');
      return user;
    }
  }

  return user;
}

async function logout() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});