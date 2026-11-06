// ============================================
// معالجة تسجيل الدخول عبر Google (Callback)
// ✅ التوجيه إلى صفحة الاشتراك بعد النجاح
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const msg = document.getElementById('msg');
  const submsg = document.getElementById('submsg');
  const errBox = document.getElementById('error-details');
  const spinner = document.getElementById('spinner');

  // دالة مساعدة لعرض الأخطاء
  function showError(title, details) {
    if (spinner) spinner.style.display = 'none';
    if (msg) { msg.textContent = title; msg.style.color = 'red'; }
    if (submsg) submsg.style.display = 'none';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = details;
    }
  }

  // 1. التحقق من وجود أخطاء في الرابط
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);
  
  if (hashParams.get('error') || queryParams.get('error')) {
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description') || 'خطأ غير معروف';
    showError('فشل تسجيل الدخول', 'السبب: ' + errorDesc);
    return;
  }

  // 2. الانتظار قليلاً حتى يقرأ Supabase الجلسة
  setTimeout(async () => {
    try {
      const { data: { session }, error } = await db.auth.getSession();
      
      if (session) {
        // ✅ نجاح: التوجيه إلى صفحة الاشتراك
        if (msg) msg.textContent = 'تم تسجيل الدخول بنجاح!';
        if (spinner) spinner.style.display = 'none';
        
        window.location.replace('/subscription.html');
      } else {
        showError('لم يتم العثور على جلسة نشطة', 'السبب: Supabase لم يستلم الجلسة.');
        setTimeout(() => window.location.replace('/login.html'), 3000);
      }
    } catch (err) {
      showError('خطأ في النظام', err.message);
    }
  }, 1000); 
});