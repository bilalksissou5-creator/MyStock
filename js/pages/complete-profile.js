// ============================================
// صفحة إكمال البيانات (حفظ مباشر + إنشاء اشتراك pending)
// ✅ استخدام صور أعلام حقيقية (flagcdn)
// ✅ اكتشاف تلقائي ودقيق للبلد
// ✅ مفتاح الدولة (Dial Code) ديناميكي ودمجه مع رقم الهاتف
// ✅ إصلاح مشكلة اختفاء اسم البلد
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (window.applyLanguage) await window.applyLanguage();

  // 1. جلب العناصر
  const form = document.getElementById('complete-form');
  const btn = document.getElementById('complete-btn');
  const errBox = document.getElementById('comp-error');
  const successBox = document.getElementById('comp-success');
  
  // عناصر قائمة البلد
  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');
  
  // ✅ عناصر حقل الهاتف الجديد
  const phoneFlag = document.getElementById('phone-flag');
  const phoneDialCode = document.getElementById('phone-dial-code');

  // ✅ انتظار الجلسة (المستخدم مسجل دخول بالفعل عبر Google)
  const session = await window.authReadyPromise;
  const user = session?.user;

  if (!user) {
    window.location.replace('/login.html');
    return;
  }

  // ✅ خريطة مفاتيح الدول (Dial Codes)
  const dialCodes = {
    MA: '+212', DZ: '+213', TN: '+216', LY: '+218', EG: '+20', MR: '+222',
    SA: '+966', AE: '+971', QA: '+974', KW: '+965', BH: '+973', OM: '+968',
    JO: '+962', LB: '+961', SY: '+963', IQ: '+964', PS: '+970', YE: '+967',
    SD: '+249', SO: '+252', TR: '+90', FR: '+33', ES: '+34', US: '+1',
    CA: '+1', GB: '+44', DE: '+49'
  };

  // ============================================
  // تعبئة قائمة البلد
  // ============================================
  if (countryPicker && countryTrigger) {

    // ✅ خوارزمية اكتشاف البلد تلقائياً
    async function detectCountry() {
      const saved = localStorage.getItem('app_country');
      if (saved && window.countries?.[saved]) return saved;

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
      } catch (e) {}

      const browserRegion = (navigator.language || '').split('-')[1];
      if (browserRegion && window.countries?.[browserRegion.toUpperCase()]) {
        return browserRegion.toUpperCase();
      }

      return 'MA';
    }

    let selectedCountry = await detectCountry();

    // ✅ دالة مساعدة لجلب صورة العلم
    const getFlagUrl = (code) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

    function buildCountryDropdown() {
      const countriesObj = window.countries || {};
      const currentLangCode = window.getCurrentLang ? window.getCurrentLang() : 'ar';

      countryDropdown.innerHTML = Object.keys(countriesObj).map(code => {
        const c = countriesObj[code];
        const name = c[currentLangCode] || c.ar;
        const nameText = name.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim(); // إزالة الإيموجي

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

    function updateCountryDisplay() {
      if (!selectedCountry) return;
      
      const name = window.tCountry ? window.tCountry(selectedCountry) : selectedCountry;
      const nameText = name.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
      const flagImgHtml = `<img src="${getFlagUrl(selectedCountry)}" class="picker-flag-img" alt="${selectedCountry}">`;

      // تحديث قائمة البلد
      countryFlag.innerHTML = flagImgHtml;
      countryName.textContent = nameText;
      countryName.removeAttribute('data-i18n'); // ✅ منع الترجمة من مسح الاسم
      countryCodeInput.value = selectedCountry;
      localStorage.setItem('app_country', selectedCountry);

      // ✅ تحديث علم حقل الهاتف ومفتاح الدولة
      if (phoneFlag) phoneFlag.innerHTML = flagImgHtml;
      if (phoneDialCode && dialCodes[selectedCountry]) {
        phoneDialCode.textContent = dialCodes[selectedCountry];
      }

      countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.country === selectedCountry);
      });
    }

    countryTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      countryPicker.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!countryPicker.contains(e.target)) {
        countryPicker.classList.remove('open');
      }
    });

    buildCountryDropdown();
    updateCountryDisplay();
  }

  // ============================================
  // معالجة زر "متابعة" (حفظ البيانات وإنشاء اشتراك)
  // ============================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const orgName = document.getElementById('org_name').value.trim();
    
    // ✅ دمج مفتاح الدولة مع الرقم المحلي
    const dialCode = phoneDialCode ? phoneDialCode.textContent.trim() : '';
    const localPhone = document.getElementById('phone').value.trim();
    const cleanLocalPhone = localPhone.startsWith('0') ? localPhone.substring(1) : localPhone;
    const phone = dialCode + cleanLocalPhone; 
    
    const country = localStorage.getItem('app_country') || 'MA';

    // التحقق من الحقول
    if (!orgName) { errBox.textContent = 'اسم المنظمة مطلوب'; errBox.style.display = 'block'; return; }
    if (!country) { errBox.textContent = 'الرجاء اختيار البلد'; errBox.style.display = 'block'; return; }
    if (!localPhone || localPhone.length < 6) { errBox.textContent = 'رقم الهاتف مطلوب ويجب أن يكون صحيحاً'; errBox.style.display = 'block'; return; }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    try {
      // 1. جلب المنظمة
      const { data: profile, error: profileErr } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileErr) throw new Error('تعذر جلب بيانات المستخدم: ' + profileErr.message);

      let orgId = profile?.organization_id;

      // 2. تحديث أو إنشاء المنظمة
      if (orgId) {
        const { error: orgErr } = await db
          .from('organizations')
          .update({ name: orgName, country: country })
          .eq('id', orgId);
        if (orgErr) throw new Error('خطأ في تحديث المنظمة: ' + orgErr.message);
      } else {
        const { data: newOrg, error: createErr } = await db
          .from('organizations')
          .insert({ name: orgName, owner_id: user.id, country: country, daily_rate: 0, bank_linked: false })
          .select()
          .single();
        if (createErr) throw new Error('خطأ في إنشاء المنظمة: ' + createErr.message);
        orgId = newOrg.id;
      }

      // استخراج رابط الصورة من بيانات Google
      const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      
      // 3. تحديث الملف الشخصي وتعيين onboarding_completed = true
      const { error: updateErr } = await db
        .from('profiles')
        .update({
          phone: phone, // ✅ حفظ الرقم مع مفتاح الدولة
          country: country,
          organization_id: orgId,
          onboarding_completed: true,
          avatar_url: googleAvatar || null 
      })
      .eq('id', user.id);

      if (updateErr) throw new Error('خطأ في تحديث الملف: ' + updateErr.message);

      // 4. إنشاء اشتراك بحالة pending (إن لم يكن موجوداً)
      const { data: existingSub } = await db
        .from('subscriptions')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!existingSub) {
        const { error: subErr } = await db.from('subscriptions').insert({
          organization_id: orgId,
          owner_id: user.id,
          plan: 'basic',
          status: 'pending',
          price: 150,
          currency: 'MAD',
          billing_cycle: 'monthly',
        });
        if (subErr) console.error('خطأ في إنشاء الاشتراك:', subErr);
      }

      // 5. النجاح
      successBox.textContent = '✅ تم حفظ البيانات! جارٍ تحويلك إلى صفحة الاشتراك...';
      successBox.style.display = 'block';
      
      setTimeout(() => {
        window.location.replace('/subscription.html');
      }, 1000);

    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'متابعة';
    }
  });
});