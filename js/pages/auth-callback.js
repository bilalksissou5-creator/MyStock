// ============================================
// معالجة تسجيل الدخول (Callback)
// ✅ ترجمة كاملة + توجيه ذكي
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // تفعيل الترجمة
  if (window.applyLanguage) await window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  const msg = document.getElementById('msg');
  const errBox = document.getElementById('error-details');
  const spinner = document.getElementById('spinner');

  // ترجمة النصوص الأولية بشكل صريح (لضمان التحديث)
  if (msg) {
    msg.innerHTML = `
      <span data-i18n="auth_cb_checking">${tr('auth_cb_checking')}</span>
      <br>
      <span style="font-size: 13px; color: #888; font-weight: normal;" data-i18n="auth_cb_wait">${tr('auth_cb_wait')}</span>
    `;
  }

  // دالة مساعدة لعرض الأخطاء
  function showError(title, details) {
    if (spinner) spinner.style.display = 'none';
    if (msg) { 
      msg.innerHTML = title; 
      msg.style.color = 'red'; 
    }
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = details;
    }
  }

  // 1. التحقق من وجود أخطاء في الرابط
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);
  
  if (hashParams.get('error') || queryParams.get('error')) {
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description') || tr('auth_cb_unknown_err');
    showError(tr('auth_cb_fail'), tr('auth_cb_reason') + errorDesc);
    return;
  }

  // 2. الانتظار لثانية ليقوم Supabase بحفظ الجلسة
  setTimeout(async () => {
    try {
      const { data: { user }, error } = await db.auth.getUser();
      
      if (error || !user) {
        showError(tr('auth_cb_no_session'), tr('auth_cb_reason') + 'Supabase.');
        setTimeout(() => window.location.replace('/login.html'), 3000);
        return;
      }

      // 3. جلب حالة إكمال البيانات
      const { data: profile } = await db
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (msg) msg.innerHTML = `<span style="color: green;" data-i18n="auth_cb_success">${tr('auth_cb_success')}</span>`;
      if (spinner) spinner.style.display = 'none';

      // 4. التوجيه الذكي
      if (profile?.onboarding_completed) {
        
        // البحث عن آخر صفحة تمت زيارتها
        const lastVisitedPage = localStorage.getItem('mystock_last_visited_page');
        
        if (lastVisitedPage && lastVisitedPage !== '/index.html' && lastVisitedPage !== '/auth-callback.html' && lastVisitedPage !== '/') {
          window.location.replace(lastVisitedPage);
        } else {
          window.location.replace('/dashboard.html');
        }
        
      } else {
        window.location.replace('/complete-profile.html');
      }

    } catch (err) {
      showError(tr('auth_cb_error'), err.message);
    }
  }, 1000); 
});