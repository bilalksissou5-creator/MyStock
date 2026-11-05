// ============================================
// صفحة الترحيب — اختيار اللغة والبلد
// ✅ اكتشاف تلقائي للغة من المتصفح
// ✅ اكتشاف تلقائي للبلد من IP
// ✅ قوائم منسدلة مخصصة (Picker)
// ✅ حفظ الاختيارات في localStorage
// ✅ تغيير اللغة مباشرة عند التبديل (بدون Reload)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  // ═══════════════════════════════════════════
  // العناصر
  // ═══════════════════════════════════════════
  const langPicker = document.getElementById('lang-picker');
  const langTrigger = document.getElementById('lang-trigger');
  const langFlag = document.getElementById('lang-flag');
  const langName = document.getElementById('lang-name');
  const langDropdown = document.getElementById('lang-dropdown');

  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');

  const continueBtn = document.getElementById('continue-btn');

  // ═══════════════════════════════════════════
  // اكتشاف اللغة تلقائياً
  // ═══════════════════════════════════════════
  function detectLanguage() {
    const saved = localStorage.getItem('app_lang');
    if (saved && ['ar', 'fr', 'en'].includes(saved)) return saved;

    const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
    return ['ar', 'fr', 'en'].includes(browserLang) ? browserLang : 'en';
  }

  // ═══════════════════════════════════════════
  // اكتشاف البلد تلقائياً (من المتصفح أولاً، ثم IP)
  // ═══════════════════════════════════════════
  async function detectCountry() {
    const saved = localStorage.getItem('app_country');
    if (saved) return saved;

    const browserRegion = (navigator.language || '').split('-')[1];
    if (browserRegion && window.countries?.[browserRegion.toUpperCase()]) {
      return browserRegion.toUpperCase();
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const code = (data.country_code || '').toUpperCase();
        if (code && window.countries?.[code]) return code;
      }
    } catch (e) {
      // تجاهل الخطأ
    }

    return 'MA';
  }

  // ═══════════════════════════════════════════
  // الحالة الحالية
  // ═══════════════════════════════════════════
  let selectedLang = detectLanguage();
  let selectedCountry = null;

  // ═══════════════════════════════════════════
  // تعبئة قائمة البلدان
  // ═══════════════════════════════════════════
  function buildCountryDropdown() {
    const countriesObj = window.countries || {};
    const currentLangCode = window.getCurrentLang ? window.getCurrentLang() : 'ar';

    countryDropdown.innerHTML = Object.keys(countriesObj).map(code => {
      const c = countriesObj[code];
      const name = c[currentLangCode] || c.ar;
      const flag = name.match(/\p{Emoji}/u)?.[0] || '🌍';
      const nameText = name.replace(/\p{Emoji}/gu, '').trim();

      return `
        <button type="button" class="picker-option" data-country="${code}">
          <span class="picker-flag">${flag}</span>
          <span class="picker-name">${nameText}</span>
          <i class="fas fa-check picker-check"></i>
        </button>
      `;
    }).join('');

    countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedCountry = opt.dataset.country;
        updateCountryDisplay();
        closeAllPickers();
      });
    });
  }

  // ═══════════════════════════════════════════
  // تحديث عرض اللغة
  // ═══════════════════════════════════════════
  function updateLanguageDisplay() {
    const flags = { ar: '', fr: '', en: '' };
    const names = { ar: 'العربية', fr: 'Français', en: 'English' };

    langFlag.textContent = flags[selectedLang];
    langName.textContent = names[selectedLang];

    langDropdown.querySelectorAll('.picker-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === selectedLang);
    });
  }

  // ═══════════════════════════════════════════
  // تحديث عرض البلد
  // ═══════════════════════════════════════════
  function updateCountryDisplay() {
    if (!selectedCountry) {
      countryFlag.textContent = '🌍';
      countryName.textContent = window.t ? window.t('welcome_select_country') : '-- اختر البلد --';
      continueBtn.disabled = true;
      return;
    }

    const name = window.tCountry ? window.tCountry(selectedCountry) : selectedCountry;
    const flag = name.match(/\p{Emoji}/u)?.[0] || '🌍';
    const nameText = name.replace(/\p{Emoji}/gu, '').trim();

    countryFlag.textContent = flag;
    countryName.textContent = nameText;
    continueBtn.disabled = false;

    countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.country === selectedCountry);
    });
  }

  // ═══════════════════════════════════════════
  // فتح/إغلاق القوائم
  // ═══════════════════════════════════════════
  function closeAllPickers() {
    langPicker.classList.remove('open');
    countryPicker.classList.remove('open');
  }

  langTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = langPicker.classList.contains('open');
    closeAllPickers();
    if (!isOpen) langPicker.classList.add('open');
  });

  countryTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = countryPicker.classList.contains('open');
    closeAllPickers();
    if (!isOpen) countryPicker.classList.add('open');
  });

  document.addEventListener('click', () => closeAllPickers());
  langDropdown.addEventListener('click', (e) => e.stopPropagation());
  countryDropdown.addEventListener('click', (e) => e.stopPropagation());

  // ═══════════════════════════════════════════
  // اختيار اللغة (تحديث بدون Reload)
  // ═══════════════════════════════════════════
  langDropdown.querySelectorAll('.picker-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      selectedLang = opt.dataset.lang;
      updateLanguageDisplay();

      // ✅ ننتظر انتهاء جلب الترجمة من Supabase قبل إعادة بناء القائمة
      if (window.setLanguage) await window.setLanguage(selectedLang);

      buildCountryDropdown();
      updateCountryDisplay();
      closeAllPickers();
    });
  });

  // ═══════════════════════════════════════════
  // التهيئة الأولية
  // ═══════════════════════════════════════════
  // ✅ إذا كانت اللغة المكتشفة تختلف عن لغة الموقع الحالية، نقوم بتحديثها
  if (window.setLanguage && window.getCurrentLang() !== selectedLang) {
      await window.setLanguage(selectedLang);
  }
  
  updateLanguageDisplay();
  buildCountryDropdown();

  selectedCountry = await detectCountry();
  updateCountryDisplay();

  // ═══════════════════════════════════════════
  // زر المتابعة
  // ═══════════════════════════════════════════
  continueBtn.addEventListener('click', () => {
    if (!selectedCountry) return;

    localStorage.setItem('app_lang', selectedLang);
    localStorage.setItem('app_country', selectedCountry);

    window.location.href = '/register.html';
  });

});