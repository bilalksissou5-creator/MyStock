// ============================================
// صفحة إكمال البيانات (حفظ مباشر + إنشاء اشتراك pending)
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

  // ✅ انتظار الجلسة (المستخدم مسجل دخول بالفعل عبر Google)
  const session = await window.authReadyPromise;
  const user = session?.user;

  if (!user) {
    window.location.replace('/login.html');
    return;
  }

  // ============================================
  // تعبئة قائمة البلد
  // ============================================
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

  // ============================================
  // معالجة زر "متابعة" (حفظ البيانات وإنشاء اشتراك)
  // ============================================
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
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    try {
      // 1. جلب المنظمة التي أنشأها الـ Trigger تلقائياً عند تسجيل Google
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
          phone: phone,
          country: country,
          organization_id: orgId,
          onboarding_completed: true,
          avatar_url: googleAvatar || null // ✅ حفظ صورة Google
      })
      .eq('id', user.id);

      if (updateErr) throw new Error('خطأ في تحديث الملف: ' + updateErr.message);

      // 4. ✅ إنشاء اشتراك بحالة pending (إن لم يكن موجوداً)
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

      // 5. النجاح! التوجيه إلى صفحة الاشتراك
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