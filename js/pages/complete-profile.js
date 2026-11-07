// ============================================
// صفحة إكمال البيانات (تحديث قاعدة البيانات مباشرة)
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

  // 2. التحقق من وجود مستخدم مسجل
  const { data: { user }, error: authError } = await db.auth.getUser();
  
  if (authError || !user) {
    // إذا لم يوجد مستخدم، اذهب لصفحة الدخول
    window.location.replace('/login.html');
    return;
  }

  // 3. تعبئة قائمة البلد
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

  // 4. معالجة زر "متابعة"
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

    try {
      // أ. جلب المنظمة التي أنشأها الـ Trigger تلقائياً
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      let orgId = profile?.organization_id;

      if (orgId) {
        // تحديث المنظمة الموجودة
        const { error: orgError } = await db
          .from('organizations')
          .update({ name: orgName, country: country })
          .eq('id', orgId);
        if (orgError) throw new Error('خطأ في تحديث المنظمة: ' + orgError.message);
      } else {
        // إذا لم توجد منظمة (نادراً)، ننشئ واحدة
        const { data: newOrg, error: createErr } = await db
          .from('organizations')
          .insert({ name: orgName, owner_id: user.id, country: country, daily_rate: 0, bank_linked: false })
          .select()
          .single();
        if (createErr) throw new Error('خطأ في إنشاء المنظمة: ' + createErr.message);
        orgId = newOrg.id;
      }

      // ب. تحديث الملف الشخصي وتعيين onboarding_completed = true
      const { error: profileError } = await db
        .from('profiles')
        .update({
          phone: phone,
          country: country,
          organization_id: orgId,
          onboarding_completed: true // ✅ المفتاح السحري
        })
        .eq('id', user.id);

      if (profileError) throw new Error('خطأ في تحديث الملف: ' + profileError.message);

      // ج. النجاح! التوجيه لصفحة الاشتراك
      if (successBox) {
        successBox.textContent = '✅ تم حفظ البيانات! جارٍ تحويلك...';
        successBox.style.display = 'block';
      }
      
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