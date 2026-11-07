// ============================================
// صفحة إكمال البيانات (لحسابات Google الجديدة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.applyLanguage) await window.applyLanguage();

  // ✅ الانتظار قليلاً حتى يقرأ Supabase الجلسة من الرابط
  await new Promise(r => setTimeout(r, 1000));

  // التحقق من وجود مستخدم مسجل
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // ✅ إعدادات قائمة اختيار البلد
  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');

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

  // ✅ معالجة إرسال النموذج
  const form = document.getElementById('complete-form');
  const errBox = document.getElementById('comp-error');
  const successBox = document.getElementById('comp-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('complete-btn');
    const orgName = document.getElementById('org_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = localStorage.getItem('app_country');

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
    if (!phone || phone.length < 8) {
      errBox.textContent = 'رقم الهاتف مطلوب (8 أرقام على الأقل)';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';

    try {
      // 1. إنشاء المنظمة
      const { data: orgData, error: orgError } = await db
        .from('organizations')
        .insert({
          name: orgName,
          owner_id: user.id,
          country: country,
          daily_rate: 0,
          bank_linked: false
        })
        .select()
        .single();

      if (orgError) throw new Error('خطأ في إنشاء المنظمة: ' + orgError.message);

      // 2. تحديث الملف الشخصي
      const { error: profileError } = await db
        .from('profiles')
        .update({
          organization_id: orgData.id,
          phone: phone,
          country: country,
          role: 'admin'
        })
        .eq('id', user.id);

      if (profileError) throw new Error('خطأ في تحديث الملف: ' + profileError.message);

      successBox.textContent = '✅ تم حفظ البيانات! جارٍ تحويلك...';
      successBox.style.display = 'block';

      setTimeout(() => {
        window.location.href = '/subscription.html';
      }, 1500);

    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'متابعة';
    }
  });
});