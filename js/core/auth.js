// ============================================
// البوابة الذكية
// ============================================

// ✅ إصلاح جوهري: getCurrentUser تنتظر الجلسة قبل قراءتها
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

async function requireAuth() {
  const currentPage = window.location.pathname;
  console.log('[Guard] Page:', currentPage);

  // 1. الصفحات العامة
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

  // 3. حالة إكمال البيانات
  const { data: profile } = await db
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  // 4. لم يكمل البيانات → إكمال البيانات (مع استثناء صفحة الاشتراك والبطاقة)
  if (!profile?.onboarding_completed) {
    const allowedPages = ['complete-profile.html', 'subscription.html', 'bank-card.html'];
    const isAllowed = allowedPages.some(p => currentPage.includes(p));
    
    if (!isAllowed) {
      window.location.replace('/complete-profile.html');
    }
    return user;
  }

  // 5. التحقق من الاشتراك (باستثناء صفحة الاشتراك والبطاقة)
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