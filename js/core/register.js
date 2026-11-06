// ============================================
// صفحة إنشاء حساب جديد
// ✅ يقرأ البلد واللغة من localStorage
// ✅ يطبق اللغة تلقائياً
// ✅ يُنشئ subscriptions بحالة pending
// ✅ يُحوّل إلى subscription.html بعد التسجيل
// ✅ منع Enter/Go/Done من إرسال الفورم
// ✅ حفظ رقم الهاتف واللغة في Supabase
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  // ✅ تطبيق اللغة
  if (window.applyLanguage) await window.applyLanguage();

  // ============================================
  // ✅ إعدادات قائمة اختيار البلد
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
      if (!countryPicker.contains(e.target)) {
        countryPicker.classList.remove('open');
      }
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
    const phone = phoneInput ? phoneInput.value.trim() : '';

    const appLang = localStorage.getItem('app_lang') || 'ar';
    const country = localStorage.getItem('app_country');

    // ✅ التحقق من الحقول
    if (!firstName || !lastName) {
      errBox.textContent = 'الاسم مطلوب';
      errBox.style.display = 'block';
      return;
    }

    if (!orgName) {
      errBox.textContent = 'اسم المنظمة مطلوب';
      errBox.style.display = 'block';
      return;
    }

    if (!country) {
      errBox.textContent = 'الرجاء اختيار البلد';
      errBox.style.display = 'block';
      return;
    }

    if (!phone) {
      errBox.textContent = 'رقم الهاتف مطلوب';
      errBox.style.display = 'block';
      return;
    }
    if (phone.length < 8) {
      errBox.textContent = 'رقم الهاتف يجب أن يكون 8 أرقام على الأقل';
      errBox.style.display = 'block';
      return;
    }

    if (!email || !email.includes('@')) {
      errBox.textContent = 'البريد الإلكتروني غير صحيح';
      errBox.style.display = 'block';
      return;
    }

    if (password !== passwordConfirm) {
      errBox.textContent = 'كلمتا السر غير متطابقتين';
      errBox.style.display = 'block';
      return;
    }

    if (password.length < 6) {
      errBox.textContent = 'كلمة السر يجب أن تكون 6 أحرف على الأقل';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ إنشاء الحساب...';

    // 1. إنشاء المستخدم
    const { data: authData, error: authError } = await db.auth.signUp({
      email,
      password,
    });

    if (authError) {
      errBox.textContent = 'خطأ: ' + authError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      errBox.textContent = 'فشل إنشاء الحساب';
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
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
      errBox.textContent = 'خطأ في إنشاء المنظمة: ' + orgError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
    }

    // 3. تحديث الملف الشخصي
    const { error: profileError } = await db
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`,
        organization_id: orgData.id,
        role: 'admin',
        country: country,
        phone: phone,
        app_lang: appLang,
      })
      .eq('id', userId);

    if (profileError) {
      errBox.textContent = 'خطأ في تحديث الملف: ' + profileError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
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