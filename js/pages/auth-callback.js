
// ============================================
// معالجة تسجيل الدخول (Callback)
// ✅ انتظار جاهزية جلسة Supabase
// ✅ محاولات محدودة عند تأخر الاتصال
// ✅ استعادة آخر صفحة تمت زيارتها
// ✅ الحفاظ على حالة إكمال البيانات
// ✅ منع التوجيه الخاطئ عند فشل قراءة الملف الشخصي
// ============================================

document.addEventListener('DOMContentLoaded', async () => {

  // ============================================
  // 1. الترجمة
  // ============================================

  if (window.applyLanguage) {
    try {
      await window.applyLanguage();
    } catch (err) {
      console.warn('Language initialization:', err);
    }
  }

  const tr = (key) => (
    window.t ? window.t(key) : key
  );

  const msg = document.getElementById('msg');
  const errBox = document.getElementById('error-details');
  const spinner = document.getElementById('spinner');

  let redirectStarted = false;

  // ============================================
  // 2. أدوات مساعدة
  // ============================================

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function showError(title, details) {
    if (spinner) {
      spinner.style.display = 'none';
    }

    if (msg) {
      msg.textContent = title;
      msg.style.color = 'red';
    }

    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = details || '';
    }
  }

  function redirectTo(url) {
    if (redirectStarted) return;

    redirectStarted = true;
    window.location.replace(url);
  }

  // ============================================
  // 3. التحقق من أخطاء رابط تسجيل الدخول
  // ============================================

  const hashParams = new URLSearchParams(
    window.location.hash.substring(1)
  );

  const queryParams = new URLSearchParams(
    window.location.search
  );

  const callbackError =
    hashParams.get('error') ||
    queryParams.get('error');

  if (callbackError) {
    const errorDesc =
      hashParams.get('error_description') ||
      queryParams.get('error_description') ||
      tr('auth_cb_unknown_err');

    showError(
      tr('auth_cb_fail'),
      tr('auth_cb_reason') + errorDesc
    );

    return;
  }

  // ============================================
  // 4. انتظار جاهزية جلسة Supabase
  // ============================================

  async function waitForSession() {
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

      try {
        if (typeof db === 'undefined' || !db.auth) {
          throw new Error('Supabase client is not ready.');
        }

        const { data, error } = await db.auth.getSession();

        if (!error && data?.session?.user) {
          return data.session.user;
        }

      } catch (err) {
        console.warn(
          `Session attempt ${attempt}:`,
          err
        );
      }

      if (attempt < maxAttempts) {
        await wait(750);
      }
    }

    return null;
  }

  // ============================================
  // 5. التحقق من المستخدم
  // ============================================

  async function verifyUser() {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

      try {
        const { data, error } = await db.auth.getUser();

        if (!error && data?.user) {
          return data.user;
        }

      } catch (err) {
        console.warn(
          `User verification attempt ${attempt}:`,
          err
        );
      }

      if (attempt < maxAttempts) {
        await wait(1000);
      }
    }

    return null;
  }

  // ============================================
  // 6. قراءة الملف الشخصي مع إعادة المحاولة
  // ============================================

  async function getProfile(userId) {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

      try {
        const { data, error } = await db
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', userId)
          .maybeSingle();

        if (!error) {
          return {
            success: true,
            profile: data
          };
        }

        console.warn(
          `Profile attempt ${attempt}:`,
          error
        );

      } catch (err) {
        console.warn(
          `Profile attempt ${attempt}:`,
          err
        );
      }

      if (attempt < maxAttempts) {
        await wait(1000);
      }
    }

    return {
      success: false,
      profile: null
    };
  }

  // ============================================
  // 7. تحديد آخر صفحة محفوظة
  // ============================================

  function getLastVisitedPage() {
    try {
      const savedPage = localStorage.getItem(
        'mystock_last_visited_page'
      );

      if (!savedPage) {
        return '/dashboard.html';
      }

      // منع الروابط الخارجية
      if (
        !savedPage.startsWith('/') ||
        savedPage.startsWith('//')
      ) {
        return '/dashboard.html';
      }

      const parsedUrl = new URL(
        savedPage,
        window.location.origin
      );

      if (parsedUrl.origin !== window.location.origin) {
        return '/dashboard.html';
      }

      const pathname = parsedUrl.pathname;

      const excludedPages = [
        '/',
        '/index.html',
        '/login.html',
        '/auth-callback.html',
        '/register.html',
        '/register-worker.html',
        '/complete-profile.html',
        '/welcome.html',
        '/subscription.html',
        '/payment.html'
      ];

      if (excludedPages.includes(pathname)) {
        return '/dashboard.html';
      }

      return pathname + parsedUrl.search;

    } catch (err) {
      console.warn('Last page recovery error:', err);
      return '/dashboard.html';
    }
  }

  // ============================================
  // 8. تشغيل عملية التحقق والاستعادة
  // ============================================

  try {

    // انتظار تهيئة جلسة Supabase
    const sessionUser = await waitForSession();

    if (!sessionUser) {
      showError(
        tr('auth_cb_no_session'),
        tr('auth_cb_reason') + 'Supabase.'
      );

      setTimeout(() => {
        redirectTo('/login.html');
      }, 3000);

      return;
    }

    // التحقق من المستخدم فعلياً
    const user = await verifyUser();

    if (!user) {
      showError(
        tr('auth_cb_no_session'),
        tr('auth_cb_reason') + 'Supabase.'
      );

      setTimeout(() => {
        redirectTo('/login.html');
      }, 3000);

      return;
    }

    // ============================================
    // 9. قراءة حالة إكمال البيانات
    // ============================================

    const result = await getProfile(user.id);

    if (!result.success) {
      showError(
        tr('auth_cb_error'),
        'تعذر الاتصال بقاعدة البيانات لقراءة بيانات الحساب. تحقق من الاتصال ثم أعد المحاولة.'
      );

      return;
    }

    // ============================================
    // 10. التوجيه النهائي
    // ============================================

    if (result.profile?.onboarding_completed) {

      const lastPage = getLastVisitedPage();

      console.log(
        'MyStock: Restoring last visited page:',
        lastPage
      );

      redirectTo(lastPage);

    } else {

      redirectTo('/complete-profile.html');

    }

  } catch (err) {

    console.error(
      'Auth callback error:',
      err
    );

    showError(
      tr('auth_cb_error'),
      err?.message || 'حدث خطأ غير متوقع أثناء التحقق من الحساب.'
    );

  }

});
