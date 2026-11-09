// ============================================
// معالجة تسجيل الدخول عبر Google (Callback)
// ✅ يفحص حالة المستخدم ويوجهه للمكان الصحيح + استرجاع آخر جلسة
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // تفعيل الترجمة
  if (window.applyLanguage) await window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  const msg = document.getElementById('msg');
  const submsg = document.getElementById('submsg');
  const errBox = document.getElementById('error-details');
  const spinner = document.getElementById('spinner');

  // ترجمة النصوص الأولية
  if (msg) msg.innerHTML = `${tr('auth_cb_checking')}<br><span style="font-size: 13px; color: #888;">${tr('auth_cb_wait')}</span>`;

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

  // 1. التحقق من وجود أخطاء في الرابط (مثل رفض المستخدم للوصول)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);
  
  if (hashParams.get('error') || queryParams.get('error')) {
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description') || tr('auth_cb_unknown_err');
    showError(tr('auth_cb_fail'), tr('auth_cb_reason') + errorDesc);
    return;
  }

  // 2. الانتظار لمدة ثانية ليقوم Supabase بحفظ الجلسة
  setTimeout(async () => {
    try {
      const { data: { user }, error } = await db.auth.getUser();
      
      if (error || !user) {
        showError(tr('auth_cb_no_session'), tr('auth_cb_reason') + 'Supabase.');
        setTimeout(() => window.location.replace('/login.html'), 3000);
        return;
      }

      // 3. جلب حالة إكمال البيانات من جدول profiles
      const { data: profile } = await db
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (msg) msg.textContent = tr('auth_cb_success');
      if (spinner) spinner.style.display = 'none';

      // 4. التوجيه الذكي
      if (profile?.onboarding_completed) {
        
        // ✅ البحث عن آخر صفحة تمت زيارتها
        const lastVisitedPage = localStorage.getItem('mystock_last_visited_page');
        
        if (lastVisitedPage && lastVisitedPage !== '/index.html' && lastVisitedPage !== '/auth-callback.html' && lastVisitedPage !== '/') {
          // العودة إلى نفس الصفحة التي أغلق فيها المستخدم التطبيق
          window.location.replace(lastVisitedPage);
        } else {
          // إذا لم توجد صفحة سابقة، التوجه للوحة التحكم
          window.location.replace('/dashboard.html');
        }
        
      } else {
        // إذا لم يكمل البيانات، يذهب لصفحة إكمال البيانات
        window.location.replace('/complete-profile.html');
      }

    } catch (err) {
      showError(tr('auth_cb_error'), err.message);
    }
  }, 1000); 
});