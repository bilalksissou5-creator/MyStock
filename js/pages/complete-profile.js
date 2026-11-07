// ============================================
// صفحة إكمال البيانات (تعتمد على URL لنقل البيانات)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.applyLanguage) await window.applyLanguage();

  const countryPicker = document.getElementById('country-picker');
  const countryTrigger = document.getElementById('country-trigger');
  const countryFlag = document.getElementById('country-flag');
  const countryName = document.getElementById('country-name');
  const countryDropdown = document.getElementById('country-dropdown');
  const countryCodeInput = document.getElementById('country_code');
  const form = document.getElementById('complete-form');
  const errBox = document.getElementById('comp-error');
  const successBox = document.getElementById('comp-success');
  const btn = document.getElementById('complete-btn');

  // ✅ قراءة البيانات من الرابط أولاً، ثم من localStorage كاحتياط
  const urlParams = new URLSearchParams(window.location.search);
  const pendingOrg = urlParams.get('org') || localStorage.getItem('pending_org_name');
  const pendingPhone = urlParams.get('phone') || localStorage.getItem('pending_phone');
  const pendingCountry = urlParams.get('country') || localStorage.getItem('app_country') || 'MA';

  let isProcessing = false;

  // ============================================
  // دالة حفظ البيانات في قاعدة البيانات
  // ============================================
  async function saveDataToDatabase(user) {
    if (isProcessing) return;
    isProcessing = true;

    if (form) form.style.display = 'none';
    if (errBox) errBox.style.display = 'none';
    if (successBox) {
      successBox.textContent = '✅ جارٍ حفظ بيانات المنظمة...';
      successBox.style.display = 'block';
    }

    try {
      // أ. تحديث المنظمة
      const { error: orgError } = await db
        .from('organizations')
        .update({ name: pendingOrg, country: pendingCountry })
        .eq('owner_id', user.id);

      if (orgError) throw new Error('خطأ في تحديث المنظمة: ' + orgError.message);

      // ب. تحديث الملف الشخصي
      const { error: profileError } = await db
        .from('profiles')
        .update({
          phone: pendingPhone,
          country: pendingCountry,
          onboarding_completed: true // ✅ المفتاح السحري
        })
        .eq('id', user.id);

      if (profileError) throw new Error('خطأ في تحديث الملف: ' + profileError.message);

      // ج. مسح البيانات المؤقتة
      localStorage.removeItem('pending_org_name');
      localStorage.removeItem('pending_phone');

      // د. التوجيه إلى صفحة الاشتراك
      window.location.replace('/subscription.html');

    } catch (err) {
      alert('فشل الحفظ! السبب: ' + err.message); // سيظهر لك الخطأ بوضوح
      if (successBox) successBox.style.display = 'none';
      if (form) form.style.display = 'block';
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
      isProcessing = false;
    }
  }

  // ============================================
  // الحالة الثانية: العودة من Google
  // ============================================
  if (pendingOrg && pendingPhone) {
    if (form) form.style.display = 'none';
    if (successBox) {
      successBox.textContent = '✅ جارٍ التحقق من حسابك...';
      successBox.style.display = 'block';
    }

    let session = null;
    for (let i = 0; i < 10; i++) {
      const { data } = await db.auth.getSession();
      if (data?.session) {
        session = data.session;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (session?.user) {
      await saveDataToDatabase(session.user);
    } else {
      if (successBox) successBox.style.display = 'none';
      if (form) form.style.display = 'block';
      if (errBox) {
        errBox.textContent = 'تعذر قراءة الجلسة. يرجى المحاولة مرة أخرى.';
        errBox.style.display = 'block';
      }
    }
    return;
  }

  // ============================================
  // الحالة الأولى: مستخدم جديد
  // ============================================
  if (form) form.style.display = 'block';
  if (errBox) errBox.style.display = 'none';
  if (successBox) successBox.style.display = 'none';

  // تعبئة قائمة البلد
  if (countryPicker && countryTrigger) {
    let selectedCountry = pendingCountry;

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

  // معالجة زر "متابعة"
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

    // حفظ في localStorage كاحتياط
    localStorage.setItem('pending_org_name', orgName);
    localStorage.setItem('pending_phone', phone);

    // ✅ إرسال البيانات عبر الرابط لضمان عدم ضياعها
    const redirectUrl = window.location.origin + '/complete-profile.html?org=' + encodeURIComponent(orgName) + '&phone=' + encodeURIComponent(phone) + '&country=' + encodeURIComponent(country);

    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
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