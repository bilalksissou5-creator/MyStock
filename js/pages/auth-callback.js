// ============================================
// معالجة تسجيل الدخول عبر Google (Callback)
// ✅ يفحص هل المستخدم جديد أم قديم
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const msg = document.getElementById('msg');
  const submsg = document.getElementById('submsg');
  const errBox = document.getElementById('error-details');
  const spinner = document.getElementById('spinner');

  function showError(title, details) {
    if (spinner) spinner.style.display = 'none';
    if (msg) { msg.textContent = title; msg.style.color = 'red'; }
    if (submsg) submsg.style.display = 'none';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = details;
    }
  }

  // 1. التحقق من أخطاء الرابط
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);

  if (hashParams.get('error') || queryParams.get('error')) {
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description') || 'خطأ غير معروف';
    showError('فشل تسجيل الدخول', 'السبب: ' + errorDesc);
    return;
  }

  // 2. انتظار Supabase لمعالجة الجلسة
  setTimeout(async () => {
    try {
      const { data: { user }, error } = await db.auth.getUser();

      if (error || !user) {
        showError('لم يتم العثور على جلسة نشطة', 'السبب: Supabase لم يستلم الجلسة.');
        setTimeout(() => window.location.replace('/login.html'), 3000);
        return;
      }

      // 3. ✅ فحص حالة إكمال البيانات
      const { data: profile } = await db
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        window.location.replace('/dashboard.html');
      } else {
        window.location.replace('/complete-profile.html');
      }

    } catch (err) {
      showError('خطأ في النظام', err.message);
    }
  }, 1000);
});