// ============================================
// البوابة الاحترافية (Route Guard)
// ============================================

async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// 🚦 البوابة: تقرر أين يذهب المستخدم
async function requireAuth() {
  const currentPage = window.location.pathname;

  // 1. الصفحات العامة (لا تحتاج جلسة)
  if (
    currentPage.includes('login.html') ||
    currentPage.includes('register.html') ||
    currentPage === '/' ||
    currentPage.includes('index.html')
  ) {
    return null;
  }

  // 2. ✅ انتظار الجلسة عالمياً (تم تعريفها في supabase.js)
  // هذا السطر يمنع طرد المستخدم إذا كانت الجلسة لم تجهز بعد
  const session = await window.authReadyPromise;

  // 3. لا توجد جلسة → صفحة الدخول
  if (!session) {
    window.location.replace('/login.html');
    return null;
  }

  const user = session.user;

  // 4. جلب حالة المستخدم من قاعدة البيانات
  const { data: profile } = await db
    .from('profiles')
    .select('onboarding_completed, organization_id')
    .eq('id', user.id)
    .single();

  // 5. المرحلة الأولى: لم يكمل البيانات → إكمال البيانات
  if (!profile?.onboarding_completed) {
    if (!currentPage.includes('complete-profile.html')) {
      window.location.replace('/complete-profile.html');
    }
    return user;
  }

  // 6. المرحلة الثانية: التحقق من الاشتراك
  // نستثني صفحة الاشتراك والبطاقة البنكية لتجنب الحلقات المفرغة
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

  // 7. كل شيء سليم → اسمح بالمرور
  return user;
}

// ============================================
// الدوال المساعدة (تسجيل الخروج)
// ============================================
async function logout() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

// ربط زر تسجيل الخروج إذا وجد
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});