// ============================================
// صفحة إكمال البيانات (تدير المسار كاملاً)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.applyLanguage) await window.applyLanguage();

  const form = document.getElementById('complete-form');
  const btn = document.getElementById('complete-btn');
  const errBox = document.getElementById('comp-error');
  const successBox = document.getElementById('comp-success');
  
  // عناصر البلد
  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');

  // ============================================
  // الحالة 2: العودة من Google (عبر علامة ?from_google=1)
  // ============================================
  const urlParams = new URLSearchParams(window.location.search);
  const isReturningFromGoogle = urlParams.get('from_google') === '1';

  if (isReturningFromGoogle) {
    // إخفاء النموذج وإظهار رسالة التحقق
    if (form) form.style.display = 'none';
    if (errBox) errBox.style.display = 'none';
    if (successBox) {
      successBox.textContent = '✅ جارٍ التحقق من حسابك وحفظ البيانات...';
      successBox.style.display = 'block';
    }

    // انتظار الجلسة عالمياً
    const session = await window.authReadyPromise;
    const user = session?.user;

    if (!user) {
      alert('تعذر قراءة الجلسة. يرجى المحاولة مرة أخرى.');
      window.location.replace('/login.html');
      return;
    }

    const pendingOrg = localStorage.getItem('pending_org_name');
    const pendingPhone = localStorage.getItem('pending_phone');
    const pendingCountry = localStorage.getItem('app_country') || 'MA';

    if (!pendingOrg || !pendingPhone) {
      alert('البيانات المحفوظة مفقودة. يرجى إعادة ملء النموذج.');
      if (form) form.style.display = 'block';
      if (successBox) successBox.style.display = 'none';
      return;
    }

    try {
      // 1. جلب المنظمة (التي أنشأها الـ Trigger)
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      let orgId = profile?.organization_id;

      // 2. تحديث أو إنشاء المنظمة
      if (orgId) {
        await db.from('organizations').update({ name: pendingOrg, country: pendingCountry }).eq('id', orgId);
      } else {
        const { data: newOrg } = await db
          .from('organizations')
          .insert({ name: pendingOrg, owner_id: user.id, country: pendingCountry, daily_rate: 0, bank_linked: false })
          .select().single();
        orgId = newOrg.id;
      }

      // 3. تحديث الملف الشخصي وإكمال البيانات
      await db.from('profiles').update({
        phone: pendingPhone,
        country: pendingCountry,
        organization_id: orgId,
        onboarding_completed: true
      }).eq('id', user.id);

      // 4. مسح البيانات المؤقتة
      localStorage.removeItem('pending_org_name');
      localStorage.removeItem('pending_phone');

      // 5. الانتقال إلى صفحة الاشتراك
      if (successBox) successBox.textContent = '✅ تم الحفظ! جارٍ تحويلك إلى صفحة الاشتراك...';
      setTimeout(() => window.location.replace('/subscription.html'), 800);

    } catch (err) {
      alert('فشل حفظ البيانات: ' + err.message);
      if (form) form.style.display = 'block';
      if (successBox) successBox.style.display = 'none';
      if (errBox) { errBox.textContent = err.message; errBox.style.display = 'block'; }
    }
    return;
  }

  // ============================================
  // الحالة 1: الدخول العادي (لا توجد جلسة)
  // ============================================
  if (form) form.style.display = 'block';
  if (errBox) errBox.style.display = 'none';
  if (successBox) successBox.style.display = 'none';

  // تعبئة قائمة البلد
  if (countryPicker && countryTrigger) {
    let selectedCountry = localStorage.getItem('app_country') || 'MA';

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

  // معالجة زر "متابعة" (يحفظ البيانات ثم يطلق Google)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const orgName = document.getElementById('org_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = localStorage.getItem('app_country') || 'MA';

    if (!orgName) { errBox.textContent = 'اسم المنظمة مطلوب'; errBox.style.display = 'block'; return; }
    if (!country) { errBox.textContent = 'الرجاء اختيار البلد'; errBox.style.display = 'block'; return; }
    if (!phone || phone.length < 8) { errBox.textContent = 'رقم الهاتف مطلوب (8 أرقام على الأقل)'; errBox.style.display = 'block'; return; }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الاتصال بـ Google...';

    // حفظ البيانات مؤقتاً (ستُستخدم عند العودة)
    localStorage.setItem('pending_org_name', orgName);
    localStorage.setItem('pending_phone', phone);
    localStorage.setItem('app_country', country);

    // إطلاق Google (يعود إلى نفس الصفحة مع ?from_google=1)
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/complete-profile.html?from_google=1',
          scopes: 'https://www.googleapis.com/auth/userinfo.email'
        }
      });
      if (error) throw error;
    } catch (err) {
      errBox.textContent = 'خطأ: ' + err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'متابعة';
    }
  });
});