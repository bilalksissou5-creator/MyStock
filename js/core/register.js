// ============================================
// صفحة إنشاء حساب جديد
// ✅ اكتشاف تلقائي ودقيق للبلد (IP -> لغة المتصفح -> افتراضي)
// ✅ استخدام صور أعلام حقيقية (flagcdn)
// ✅ مفتاح الدولة (Dial Code) ديناميكي ودمجه مع رقم الهاتف
// ✅ منع Enter/Go/Done من إرسال الفورم
// ============================================

document.addEventListener('DOMContentLoaded', async () => {

  // ✅ تطبيق اللغة
  if (window.applyLanguage) await window.applyLanguage();

  // ✅ خريطة مفاتيح الدول (Dial Codes)
  const dialCodes = {
    MA: '+212', DZ: '+213', TN: '+216', LY: '+218', EG: '+20', MR: '+222',
    SA: '+966', AE: '+971', QA: '+974', KW: '+965', BH: '+973', OM: '+968',
    JO: '+962', LB: '+961', SY: '+963', IQ: '+964', PS: '+970', YE: '+967',
    SD: '+249', SO: '+252', TR: '+90', FR: '+33', ES: '+34', US: '+1',
    CA: '+1', GB: '+44', DE: '+49'
  };

  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');
  const phoneFlag = document.getElementById('phone-flag');
  const phoneDialCode = document.getElementById('phone-dial-code');

  if (countryPicker && countryTrigger) {

    // ============================================
    // ✅ 1. خوارزمية اكتشاف البلد تلقائياً
    // ============================================
    async function detectCountry() {
      // الأولوية 1: إذا اختار المستخدم بلداً سابقاً وحفظناه، نحترم اختياره
      const saved = localStorage.getItem('app_country');
      if (saved && window.countries?.[saved]) return saved;

      // الأولوية 2: تحديد الموقع عبر IP (الأدق لأن المستخدم قد يكون في المغرب وهاتفه بالإنجليزية)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const code = (data.country_code || '').toUpperCase();
          if (code && window.countries?.[code]) {
            console.log('🌍 تم اكتشاف البلد عبر IP:', code);
            return code;
          }
        }
      } catch (e) {
        console.warn("فشل تحديد الدولة عبر IP، سيتم استخدام لغة المتصفح.");
      }

      // الأولوية 3: لغة المتصفح (مثلاً ar-MA تعني المغرب)
      const browserRegion = (navigator.language || '').split('-')[1];
      if (browserRegion && window.countries?.[browserRegion.toUpperCase()]) {
        console.log('🌍 تم اكتشاف البلد عبر لغة المتصفح:', browserRegion);
        return browserRegion.toUpperCase();
      }

      // الأولوية 4: الافتراضي (المغرب)
      console.log('🌍 تم اختيار البلد الافتراضي: MA');
      return 'MA';
    }

    let selectedCountry = await detectCountry();

    // ✅ دالة مساعدة لجلب صورة العلم
    const getFlagUrl = (code) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

    // ============================================
    // ✅ 2. بناء القائمة المنسدلة للبلدان
    // ============================================
    function buildCountryDropdown() {
      const countriesObj = window.countries || {};
      const currentLangCode = window.getCurrentLang ? window.getCurrentLang() : 'ar';

      countryDropdown.innerHTML = Object.keys(countriesObj).map(code => {
        const c = countriesObj[code];
        const name = c[currentLangCode] || c.ar;
        const nameText = name.replace(/\p{Emoji}/gu, '').trim(); // إزالة الإيموجي من النص

        return `
          <button type="button" class="picker-option" data-country="${code}">
            <img src="${getFlagUrl(code)}" class="picker-flag-img" alt="${code}">
            <span class="picker-name">${nameText}</span>
            <i class="fas fa-check picker-check"></i>
          </button>
        `;
      }).join('');

      countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
        opt.addEventListener('click', () => {
          selectedCountry = opt.dataset.country;
          updateCountryDisplay();
          countryPicker.classList.remove('open');
        });
      });
    }

    // ============================================
    // ✅ 3. تحديث واجهة المستخدم بناءً على البلد
    // ============================================
    function updateCountryDisplay() {
      if (!selectedCountry) return;
      
      const name = window.tCountry ? window.tCountry(selectedCountry) : selectedCountry;
      const nameText = name.replace(/\p{Emoji}/gu, '').trim();
      const flagImgHtml = `<img src="${getFlagUrl(selectedCountry)}" class="picker-flag-img" alt="${selectedCountry}">`;

      // تحديث قائمة البلد
      countryFlag.innerHTML = flagImgHtml;
      countryName.textContent = nameText;
      countryCodeInput.value = selectedCountry;
      localStorage.setItem('app_country', selectedCountry);

      // تحديث علم حقل الهاتف ومفتاح الدولة
      if (phoneFlag) phoneFlag.innerHTML = flagImgHtml;
      if (phoneDialCode && dialCodes[selectedCountry]) {
        phoneDialCode.textContent = dialCodes[selectedCountry];
      }

      // تمييز الخيار النشط في القائمة
      countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.country === selectedCountry);
      });
    }

    // ============================================
    // ✅ 4. أحداث فتح وإغلاق القائمة
    // ============================================
    countryTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      countryPicker.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!countryPicker.contains(e.target)) {
        countryPicker.classList.remove('open');
      }
    });

    // تشغيل القائمة وتحديث الواجهة فوراً
    buildCountryDropdown();
    updateCountryDisplay();
  }

  // ============================================
  // ✅ إظهار/إخفاء كلمات السر
  // ============================================
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';
    });
  });

  const form = document.getElementById('register-form');
  if (!form) return;

  // ✅ منع Enter / Go / Done من إرسال الفورم
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });

  // ============================================
  // ✅ 5. معالجة إرسال الفورم
  // ============================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('register-btn');
    const errBox = document.getElementById('reg-error');
    const successBox = document.getElementById('reg-success');

    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const orgName = document.getElementById('org_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password_confirm').value;
    
    const phoneInput = document.getElementById('phone');
    // ✅ دمج مفتاح الدولة مع الرقم المحلي
    const dialCode = phoneDialCode ? phoneDialCode.textContent.trim() : '';
    const localPhone = phoneInput ? phoneInput.value.trim() : '';
    // إزالة الأصفار من بداية الرقم المحلي إذا كان المستخدم قد كتبها (لتجنب +2120600...)
    const cleanLocalPhone = localPhone.startsWith('0') ? localPhone.substring(1) : localPhone;
    const phone = dialCode + cleanLocalPhone; 
    
    const appLang = localStorage.getItem('app_lang') || 'ar';
    const country = localStorage.getItem('app_country');

    // ✅ التحقق من الحقول
    if (!firstName || !lastName) {
      errBox.textContent = 'الاسم مطلوب'; errBox.style.display = 'block'; return;
    }
    if (!orgName) {
      errBox.textContent = 'اسم المنظمة مطلوب'; errBox.style.display = 'block'; return;
    }
    if (!country) {
      errBox.textContent = 'الرجاء اختيار البلد'; errBox.style.display = 'block'; return;
    }
    if (!localPhone || localPhone.length < 6) {
      errBox.textContent = 'رقم الهاتف مطلوب ويجب أن يكون صحيحاً'; errBox.style.display = 'block'; return;
    }
    if (!email || !email.includes('@')) {
      errBox.textContent = 'البريد الإلكتروني غير صحيح'; errBox.style.display = 'block'; return;
    }
    if (password !== passwordConfirm) {
      errBox.textContent = 'كلمتا السر غير متطابقتين'; errBox.style.display = 'block'; return;
    }
    if (password.length < 6) {
      errBox.textContent = 'كلمة السر يجب أن تكون 6 أحرف على الأقل'; errBox.style.display = 'block'; return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ إنشاء الحساب...';

    // 1. إنشاء المستخدم
    const { data: authData, error: authError } = await db.auth.signUp({ email, password });

    if (authError) {
      errBox.textContent = 'خطأ: ' + authError.message; errBox.style.display = 'block';
      btn.disabled = false; btn.querySelector('span').textContent = 'تسجيل'; return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      errBox.textContent = 'فشل إنشاء الحساب'; errBox.style.display = 'block';
      btn.disabled = false; btn.querySelector('span').textContent = 'تسجيل'; return;
    }

    // 2. إنشاء المنظمة
    const { data: orgData, error: orgError } = await db
      .from('organizations')
      .insert({
        name: orgName,
        owner_id: userId,
        country: country,
        daily_rate: 0,
        bank_linked: false
      })
      .select()
      .single();

    if (orgError) {
      errBox.textContent = 'خطأ في إنشاء المنظمة: ' + orgError.message; errBox.style.display = 'block';
      btn.disabled = false; btn.querySelector('span').textContent = 'تسجيل'; return;
    }

    // 3. تحديث الملف الشخصي
    const { error: profileError } = await db
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`,
        organization_id: orgData.id,
        role: 'admin',
        country: country,
        phone: phone, // ✅ حفظ الرقم مع مفتاح الدولة
        app_lang: appLang,
      })
      .eq('id', userId);

    if (profileError) {
      errBox.textContent = 'خطأ في تحديث الملف: ' + profileError.message; errBox.style.display = 'block';
      btn.disabled = false; btn.querySelector('span').textContent = 'تسجيل'; return;
    }

    // 4. إنشاء اشتراك بحالة pending
    const { error: subError } = await db
      .from('subscriptions')
      .insert({
        organization_id: orgData.id,
        owner_id: userId,
        plan: 'basic',
        status: 'pending',
        price: 150,
        currency: 'MAD',
        billing_cycle: 'monthly',
      });

    if (subError) {
      console.error('❌ Subscription error:', subError);
    }

    successBox.textContent = '✅ تم إنشاء الحساب! جارٍ تحويلك...';
    successBox.style.display = 'block';

    setTimeout(() => {
      window.location.href = '/subscription.html';
    }, 1500);
  });
});