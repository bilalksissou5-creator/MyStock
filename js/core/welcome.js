// ============================================
// صفحة الترحيب — اختيار اللغة والبلد
// ✅ يحفظ الاختيارات في localStorage
// ✅ ينتقل إلى register.html
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const langButtons = document.querySelectorAll('.lang-btn');
  const countrySelect = document.getElementById('country');
  const continueBtn = document.getElementById('continue-btn');

  // استرجاع القيم المحفوظة سابقاً
  const savedLang = localStorage.getItem('app_lang') || 'ar';
  const savedCountry = localStorage.getItem('app_country') || '';

  let selectedLang = savedLang;

  // تفعيل اللغة المحفوظة
  langButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === savedLang);
  });

  // تفعيل البلد المحفوظ
  if (savedCountry) {
    countrySelect.value = savedCountry;
  }

  // التحقق من جاهزية الزر
  function checkReady() {
    continueBtn.disabled = !countrySelect.value;
  }
  checkReady();

  // اختيار اللغة
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      langButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLang = btn.dataset.lang;
    });
  });

  // اختيار البلد
  countrySelect.addEventListener('change', checkReady);

  // عند الضغط على متابعة
  continueBtn.addEventListener('click', () => {
    if (!countrySelect.value) return;

    localStorage.setItem('app_lang', selectedLang);
    localStorage.setItem('app_country', countrySelect.value);

    window.location.href = '/register.html';
  });
});