// ============================================
// تشغيل اللغة فوراً قبل تحميل أي شيء
// ✅ يُضمَّن في <head> مباشرة (قبل CSS)
// ✅ يمنع وميض RTL → LTR
// ✅ يقرأ اللغة من localStorage
// ============================================
(function () {
  try {
    const lang = localStorage.getItem('app_lang') || 'ar';
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const html = document.documentElement;

    html.lang = lang;
    html.dir = dir;

    // إضافة كلاس للجسم لتمكين CSS من التكيّف
    function applyBodyClass() {
      if (!document.body) return;
      document.body.classList.remove('lang-ar', 'lang-fr', 'lang-en');
      document.body.classList.add('lang-' + lang);
    }

    if (document.body) {
      applyBodyClass();
    } else {
      document.addEventListener('DOMContentLoaded', applyBodyClass);
    }
  } catch (e) {
    // تجاهل الخطأ
  }
})();