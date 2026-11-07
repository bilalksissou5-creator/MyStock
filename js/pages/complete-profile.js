// ============================================
// صفحة إكمال البيانات (محصّنة ضد التعليق)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.applyLanguage) await window.applyLanguage();

  const form = document.getElementById('complete-form');
  const btn = document.getElementById('complete-btn');
  const errBox = document.getElementById('comp-error');
  const successBox = document.getElementById('comp-success');
  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');

  const urlParams = new URLSearchParams(window.location.search);
  const isReturningFromGoogle = urlParams.get('from_google') === '1';

  // ============================================
  // الحالة الثانية: العودة من Google
  // ============================================
  if (isReturningFromGoogle) {
    console.log('[CompleteProfile] Returning from Google');

    if (form) form.style.display = 'none';
    if (errBox) errBox.style.display = 'none';
    if (successBox) {
      successBox.textContent = '✅ جارٍ التحقق من حسابك...';
      successBox.style.display = 'block';
    }

    // ✅ شبكة أمان: مهلة 12 ثانية، إذا لم ننجح، نعيد عرض النموذج
    let handled = false;
    const safetyTimeout = setTimeout(() => {
      if (handled) return;
      handled = true;
      console.error('[CompleteProfile] Safety timeout triggered');
      alert('تأخر الاتصال بـ Google. يرجى المحاولة مرة أخرى.');
      window.location.replace('/complete-profile.html');
    }, 12000);

    try {
      const session = await window.authReadyPromise;
      const user = session?.user;

      if (!user) {
        clearTimeout(safetyTimeout);
        if (handled) return;
        handled = true;
        alert('تعذر قراءة الجلسة. يرجى المحاولة مرة أخرى.');
        if (form) form.style.display = 'block';
        if (successBox) successBox.style.display = 'none';
        if (errBox) { errBox.textContent = 'تعذر قراءة الجلسة.'; errBox.style.display = 'block'; }
        window.history.replaceState({}, '', '/complete-profile.html');
        return;
      }

      console.log('[CompleteProfile] User found:', user.email);

      const pendingOrg = localStorage.getItem('pending_org_name');
      const pendingPhone = localStorage.getItem('pending_phone');
      const pendingCountry = localStorage.getItem('app_country') || 'MA';

      if (!pendingOrg || !pendingPhone) {
        clearTimeout(safetyTimeout);
        if (handled) return;
        handled = true;
        alert('البيانات المحفوظة مفقودة. يرجى إعادة ملء النموذج.');
        if (form) form.style.display = 'block';
        if (successBox) successBox.style.display = 'none';
        window.history.replaceState({}, '', '/complete-profile.html');
        return;
      }

      // 1. جلب المنظمة
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      let orgId = profile?.organization_id;

      // 2. تحديث أو إنشاء المنظمة
      if (orgId) {
        const { error: orgErr } = await db.from('organizations').update({ name: pendingOrg, country: pendingCountry }).eq('id', orgId);
        if (orgErr) throw new Error('خطأ في تحديث المنظمة: ' + orgErr.message);
      } else {
        const { data: newOrg, error: createErr } = await db
          .from('organizations')
          .insert({ name: pendingOrg, owner_id: user.id, country: pendingCountry, daily_rate: 0, bank_linked: false })
          .select().single();
        if (createErr) throw new Error('خطأ في إنشاء المنظمة: ' + createErr.message);
        orgId = newOrg.id;
      }

      // 3. تحديث الملف الشخصي
      const { error: updateErr } = await db.from('profiles').update({
        phone: pendingPhone,
        country: pendingCountry,
        organization_id: orgId,
        onboarding_completed: true
      }).eq('id', user.id);
      if (updateErr) throw new Error('خطأ في تحديث الملف: ' + updateErr.message);

      // 4. التحقق من الحفظ
      const { data: verify } = await db.from('profiles').select('onboarding_completed').eq('id', user.id).single();
      if (verify?.onboarding_completed !== true) throw new Error('لم يتم تأكيد حفظ البيانات.');

      // 5. مسح البيانات المؤقتة
      localStorage.removeItem('pending_org_name');
      localStorage.removeItem('pending_phone');

      // 6. الانتقال إلى صفحة الاشتراك
      clearTimeout(safetyTimeout);
      if (handled) return;
      handled = true;
      
      console.log('[CompleteProfile] Redirecting to subscription');
      if (successBox) successBox.textContent = '✅ تم الحفظ! جارٍ التحويل...';
      setTimeout(() => window.location.replace('/subscription.html'), 500);

    } catch (err) {
      clearTimeout(safetyTimeout);
      if (handled) return;
      handled = true;
      console.error('[CompleteProfile] Error:', err);
      alert('فشل: ' + err.message);
      if (form) form.style.display = 'block';
      if (successBox) successBox.style.display = 'none';
      if (errBox) { errBox.textContent = err.message; errBox.style.display = 'block'; }
    }
    return;
  }

  // ============================================
  // الحالة الأولى: عرض النموذج
  // ============================================
  if (form) form.style.display = 'block';
  if (errBox) errBox.style.display = 'none';
  if (successBox) successBox.style.display = 'none';

  // قائمة البلد
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
        return `<button type="button" class="picker-option" data-country="${code}"><span class="picker-flag">${flag}</span><span class="picker-name">${nameText}</span><i class="fas fa-check picker-check"></i></button>`;
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

  // زر المتابعة
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

    localStorage.setItem('pending_org_name', orgName);
    localStorage.setItem('pending_phone', phone);
    localStorage.setItem('app_country', country);

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