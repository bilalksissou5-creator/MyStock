// ============================================
// صفحة إنشاء حساب جديد
// ✅ اكتشاف تلقائي للبلد
// ✅ يدعم إكمال بيانات حساب Google
// ✅ يرسل القيم الإجبارية لجدول organizations (daily_rate, bank_linked)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  if (window.applyLanguage) await window.applyLanguage();

  // ============================================
  // ✅ قائمة اختيار البلد
  // ============================================
  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');

  if (countryPicker && countryTrigger) {
    async function detectCountry() {
      const saved = localStorage.getItem('app_country');
      if (saved && window.countries?.[saved]) return saved;
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
      } catch (e) {}
      return 'MA';
    }

    let selectedCountry = await detectCountry();

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
          countryPicker.classList.remove('open');
        });
      });
    }

    function updateCountryDisplay() {
      if (!selectedCountry) return;
      const name = window.tCountry ? window.tCountry(selectedCountry) : selectedCountry;
      const flag = name.match(/\p{Emoji}/u)?.[0] || '🌍';
      const nameText = name.replace(/\p{Emoji}/gu, '').trim();
      countryFlag.textContent = flag;
      countryName.textContent = nameText;
      countryCodeInput.value = selectedCountry;
      localStorage.setItem('app_country', selectedCountry);
      countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.country === selectedCountry);
      });
    }

    countryTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      countryPicker.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!countryPicker.contains(e.target)) countryPicker.classList.remove('open');
    });

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
      btn.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
  });

  const form = document.getElementById('register-form');
  if (!form) return;

  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
    });
  });

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
    const phone = document.getElementById('phone')?.value.trim() || '';
    const appLang = localStorage.getItem('app_lang') || 'ar';
    const country = localStorage.getItem('app_country');

    if (!firstName || !lastName) { errBox.textContent = 'الاسم مطلوب'; errBox.style.display = 'block'; return; }
    if (!orgName) { errBox.textContent = 'اسم المنظمة مطلوب'; errBox.style.display = 'block'; return; }
    if (!country) { errBox.textContent = 'الرجاء اختيار البلد'; errBox.style.display = 'block'; return; }
    if (!phone) { errBox.textContent = 'رقم الهاتف مطلوب'; errBox.style.display = 'block'; return; }
    if (phone.length < 8) { errBox.textContent = 'رقم الهاتف يجب أن يكون 8 أرقام على الأقل'; errBox.style.display = 'block'; return; }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ إنشاء الحساب...';

    try {
      // ✅ 1. التحقق من وجود مستخدم مسجل حالياً (حساب Google)
      const { data: { user: currentUser } } = await db.auth.getUser();
      let userId = currentUser?.id;

      // ✅ 2. إذا لم يكن مسجلاً (حساب جديد بالبريد)، أنشئ حساباً
      if (!userId) {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password_confirm').value;

        if (!email || !email.includes('@')) { throw new Error('البريد الإلكتروني غير صحيح'); }
        if (password !== passwordConfirm) { throw new Error('كلمتا السر غير متطابقتين'); }
        if (password.length < 6) { throw new Error('كلمة السر يجب أن تكون 6 أحرف على الأقل'); }

        const { data: authData, error: authError } = await db.auth.signUp({ email, password });
        if (authError) throw new Error('خطأ: ' + authError.message);
        userId = authData.user?.id;
        if (!userId) throw new Error('فشل إنشاء الحساب');
      }

      // ✅ 3. إنشاء المنظمة (إذا لم تكن موجودة)
      const { data: existingProfile } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();

      let orgId = existingProfile?.organization_id;

      if (!orgId) {
        // ✅ نرسل القيم الإجبارية: daily_rate و bank_linked
        const { data: orgData, error: orgError } = await db
          .from('organizations')
          .insert({ 
            name: orgName, 
            owner_id: userId, 
            country: country,
            daily_rate: 0,        // ✅ قيمة افتراضية للعمود الإجباري
            bank_linked: false    // ✅ قيمة افتراضية للعمود الإجباري
          })
          .select()
          .single();

        if (orgError) throw new Error('خطأ في إنشاء المنظمة: ' + orgError.message);
        orgId = orgData.id;
      }

      // ✅ 4. تحديث الملف الشخصي
      const { error: profileError } = await db
        .from('profiles')
        .upsert({
          id: userId,
          full_name: `${firstName} ${lastName}`,
          organization_id: orgId,
          role: 'admin',
          country: country,
          phone: phone,
          app_lang: appLang,
        });

      if (profileError) throw new Error('خطأ في تحديث الملف: ' + profileError.message);

      // ✅ 5. إنشاء اشتراك pending (إذا لم يكن موجوداً)
      const { data: existingSub } = await db
        .from('subscriptions')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!existingSub) {
        await db.from('subscriptions').insert({
          organization_id: orgId,
          owner_id: userId,
          plan: 'basic',
          status: 'pending',
          price: 150,
          currency: 'MAD',
          billing_cycle: 'monthly',
        });
      }

      successBox.textContent = '✅ تم إنشاء الحساب! جارٍ تحويلك...';
      successBox.style.display = 'block';

      setTimeout(() => {
        window.location.href = '/subscription.html';
      }, 1500);

    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
    }
  });
});