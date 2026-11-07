// ============================================
// صفحة إكمال البيانات (النسخة النهائية - State Machine)
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

  // ============================================
  // الحالة الثانية: العودة من Google (عبر ?from_google=1)
  // ============================================
  const urlParams = new URLSearchParams(window.location.search);
  const isReturningFromGoogle = urlParams.get('from_google') === '1';

  if (isReturningFromGoogle) {
    console.log('[CompleteProfile] Returning from Google');
    
    // إخفاء النموذج وإظهار رسالة التحقق
    if (form) form.style.display = 'none';
    if (errBox) errBox.style.display = 'none';
    if (successBox) {
      successBox.textContent = '✅ جارٍ التحقق من حسابك...';
      successBox.style.display = 'block';
    }

    // ✅ انتظار الجلسة عالمياً (authReadyPromise)
    const session = await window.authReadyPromise;
    const user = session?.user;

    if (!user) {
      alert('تعذر قراءة الجلسة. يرجى المحاولة مرة أخرى.');
      window.location.replace('/login.html');
      return;
    }

    // قراءة البيانات المحفوظة مؤقتاً
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
      // 1. جلب المنظمة التي أنشأها الـ Trigger
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      let orgId = profile?.organization_id;

      // 2. تحديث أو إنشاء المنظمة
      if (orgId) {
        const { error: orgErr } = await db
          .from('organizations')
          .update({ name: pendingOrg, country: pendingCountry })
          .eq('id', orgId);
        if (orgErr) throw new Error('خطأ في تحديث المنظمة: ' + orgErr.message);
      } else {
        const { data: newOrg, error: createErr } = await db
          .from('organizations')
          .insert({ 
            name: pendingOrg, 
            owner_id: user.id, 
            country: pendingCountry, 
            daily_rate: 0, 
            bank_linked: false 
          })
          .select().single();
        if (createErr) throw new Error('خطأ في إنشاء المنظمة: ' + createErr.message);
        orgId = newOrg.id;
      }

      // 3. تحديث الملف الشخصي وتعيين onboarding_completed = true
      const { error: updateErr } = await db
        .from('profiles')
        .update({
          phone: pendingPhone,
          country: pendingCountry,
          organization_id: orgId,
          onboarding_completed: true
        })
        .eq('id', user.id);
      
      if (updateErr) throw new Error('خطأ في تحديث الملف: ' + updateErr.message);

      // 4. ✅ التحقق المؤكد: إعادة قراءة الملف للتأكد من نجاح الحفظ
      const { data: verifyProfile, error: verifyErr } = await db
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      console.log('[CompleteProfile] Verify onboarding:', verifyProfile?.onboarding_completed);

      if (verifyErr || verifyProfile?.onboarding_completed !== true) {
        throw new Error('لم يتم تأكيد حفظ البيانات في قاعدة البيانات. حاول مرة أخرى.');
      }

      // 5. مسح البيانات المؤقتة
      localStorage.removeItem('pending_org_name');
      localStorage.removeItem('pending_phone');

      // 6. الانتقال إلى صفحة الاشتراك
      if (successBox) successBox.textContent = '✅ تم الحفظ! جارٍ تحويلك إلى صفحة الاشتراك...';
      console.log('[CompleteProfile] Redirecting to subscription...');
      setTimeout(() => window.location.replace('/subscription.html'), 800);

    } catch (err) {
      console.error('[CompleteProfile] Error:', err);
      alert('فشل الحفظ: ' + err.message);
      if (form) form.style.display = 'block';
      if (successBox) successBox.style.display = 'none';
      if (errBox) { errBox.textContent = err.message; errBox.style.display = 'block'; }
    }
    return;
  }

  // ============================================
  // الحالة الأولى: نموذج الدخول العادي (مستخدم جديد)
  // ============================================
  console.log('[CompleteProfile] Showing form');
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

  // معالجة زر "متابعة" (حفظ البيانات ثم إطلاق Google)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const orgName = document.getElementById('org_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = localStorage.getItem('app_country') || 'MA';

    // التحقق من الحقول
    if (!orgName) { errBox.textContent = 'اسم المنظمة مطلوب'; errBox.style.display = 'block'; return; }
    if (!country) { errBox.textContent = 'الرجاء اختيار البلد'; errBox.style.display = 'block'; return; }
    if (!phone || phone.length < 8) { errBox.textContent = 'رقم الهاتف مطلوب (8 أرقام على الأقل)'; errBox.style.display = 'block'; return; }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الاتصال بـ Google...';

    // حفظ البيانات مؤقتاً (ستُستخدم عند العودة من Google)
    localStorage.setItem('pending_org_name', orgName);
    localStorage.setItem('pending_phone', phone);
    localStorage.setItem('app_country', country);

    // إطلاق Google (العودة إلى نفس الصفحة مع ?from_google=1)
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