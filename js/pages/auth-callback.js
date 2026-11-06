// ============================================
// معالجة تسجيل الدخول عبر Google (Callback)
// ✅ متوافق مع Implicit Flow
// ✅ يعالج الأخطاء ويخفي مؤشر التحميل
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const msg = document.getElementById('msg');
  const submsg = document.getElementById('submsg');
  const errBox = document.getElementById('error-details');
  const spinner = document.getElementById('spinner');

  // دالة مساعدة لعرض الأخطاء وإخفاء التحميل
  function showError(title, details) {
    if (spinner) spinner.style.display = 'none';
    if (msg) { 
      msg.textContent = title; 
      msg.style.color = 'red'; 
    }
    if (submsg) submsg.style.display = 'none';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = details;
    }
  }

  // 1. التحقق من وجود أخطاء في الرابط (مثل رفض المستخدم للوصول)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);
  
  if (hashParams.get('error') || queryParams.get('error')) {
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description') || 'خطأ غير معروف';
    showError('فشل تسجيل الدخول', 'السبب: ' + errorDesc);
    return;
  }

  // 2. الانتظار قليلاً حتى يقوم Supabase (بفضل Implicit Flow) بقراءة الجلسة من الرابط
  setTimeout(async () => {
    try {
      const { data: { session }, error } = await db.auth.getSession();
      
      if (session) {
        // نجاح! توجيه المستخدم إلى لوحة التحكم
        if (msg) msg.textContent = 'تم تسجيل الدخول بنجاح!';
        if (spinner) spinner.style.display = 'none';
        
        // تحويل فوري إلى لوحة التحكم
        window.location.replace('/dashboard.html');
      } else {
        // فشل في العثور على الجلسة
        showError(
          'لم يتم العثور على جلسة نشطة', 
          'السبب: Supabase لم يستلم الجلسة. قد يكون الرابط منتهي الصلاحية أو أن الإعدادات تحتاج إلى تحديث.'
        );
        
        // العودة لصفحة الدخول بعد 3 ثوانٍ
        setTimeout(() => window.location.replace('/login.html'), 3000);
      }
    } catch (err) {
      showError('خطأ في النظام', err.message);
    }
  }, 1000); // ثانية واحدة كافية جداً مع الـ implicit flow
});