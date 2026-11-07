// ============================================
// صفحة إكمال البيانات (نسخة مضادة للتعليق والصفحة البيضاء)
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

  const pendingOrg = localStorage.getItem('pending_org_name');
  const pendingPhone = localStorage.getItem('pending_phone');
  let isProcessing = false;

  // دالة إنشاء المنظمة
  async function processOrganization(user) {
    if (!pendingOrg || !pendingPhone || isProcessing) return;
    isProcessing = true;

    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'جارٍ إنشاء المنظمة...'; }
    if (errBox) errBox.style.display = 'none';
    if (successBox) {
      successBox.textContent = '✅ تم التحقق! جارٍ إنشاء المنظمة...';
      successBox.style.display = 'block';
    }

    try {
      const country = localStorage.getItem('app_country') || 'MA';

      const { data: orgData, error: orgError } = await db
        .from('organizations')
        .insert({
          name: pendingOrg,
          owner_id: user.id,
          country: country,
          daily_rate: 0,
          bank_linked: false
        })
        .select()
        .single();

      if (orgError) throw new Error('خطأ في إنشاء المنظمة: ' + orgError.message);

      const { error: profileError } = await db
        .from('profiles')
        .update({
          organization_id: orgData.id,
          phone: pendingPhone,
          country: country,
          role: 'admin'
        })
        .eq('id', user.id);

      if (profileError) throw new Error('خطأ في تحديث الملف: ' + profileError.message);

      localStorage.removeItem('pending_org_name');
      localStorage.removeItem('pending_phone');

      window.location.replace('/subscription.html');
      return;

    } catch (err) {
      // في حال حدوث خطأ، نعيد الصفحة لحالتها الطبيعية ونظهر الخطأ
      if (successBox) successBox.style.display = 'none';
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
      if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'متابعة'; }
      localStorage.removeItem('pending_org_name');
      localStorage.removeItem('pending_phone');
      isProcessing = false;
    }
  }

  // ============================================
  // ✅ معالجة العودة من Google
  // ============================================
  if (pendingOrg && pendingPhone) {
    // إظهار رسالة التحقق
    if (successBox) {
      successBox.textContent = '✅ جارٍ التحقق من الحساب...';
      successBox.style.display = 'block';
    }
    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'جاري التحقق...'; }

    // 1. الاستماع لحدث الدخول
    db.auth.onAuthStateChange((event, session) => {
      if (session?.user) processOrganization(session.user);
    });

    // 2. محاولة فورية
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      processOrganization(session.user);
    } else {
      // 3. محاولة احتياطية لمدة 10 ثوانٍ
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (isProcessing) { clearInterval(interval); return; }
        const { data: { session: s } } = await db.auth.getSession();
        if (s?.user) { 
          clearInterval(interval); 
          processOrganization(s.user); 
        }
        
        // إذا انتهى الوقت ولم نجد جلسة، نعرض خطأ ونعيد الزر
        if (attempts >= 20) {
          clearInterval(interval);
          if (!isProcessing) {
            if (successBox) successBox.style.display = 'none';
            if (errBox) {
              errBox.textContent = 'تعذر قراءة الجلسة من Google. يرجى المحاولة مرة أخرى.';
              errBox.style.display = 'block';
            }
            if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'متابعة'; }
            localStorage.removeItem('pending_org_name');
            localStorage.removeItem('pending_phone');
          }
        }
      }, 500);
    }
  } else {
    // ============================================
    // ✅ عرض النموذج (مستخدم جديد)
    // ============================================
    if (form) form.style.display = 'block';
    if (errBox) errBox.style.display = 'none';
    if (successBox) successBox.style.display = 'none';
    if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'متابعة'; }

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
          return `<button type="button" class="picker-option" data-country="${code}"><span class="picker-flag">${flag}</span><span class="picker-name">${nameText}</span><i class="fas fa-check picker-check"></i></button>`;
        }).join('');
        countryDropdown.querySelectorAll('.picker-option').forEach(opt => {
          opt.addEventListener('click', () => { selectedCountry = opt.dataset.country; updateCountryDisplay(); countryPicker.classList.remove('open'); });
        });
      }
      function updateCountryDisplay() {
        if (!selectedCountry) return;
        const name = window.tCountry ? window.tCountry(selectedCountry) : selectedCountry;
        const flag = name.match(/\p{Emoji}/u)?.[0] || '🌍';
        const nameText = name.replace(/\p{Emoji}/gu, '').trim();
        countryFlag.textContent = flag; countryName.textContent = nameText; countryCodeInput.value = selectedCountry; localStorage.setItem('app_country', selectedCountry);
        countryDropdown.querySelectorAll('.picker-option').forEach(opt => opt.classList.toggle('active', opt.dataset.country === selectedCountry));
      }
      countryTrigger.addEventListener('click', (e) => { e.stopPropagation(); countryPicker.classList.toggle('open'); });
      document.addEventListener('click', (e) => { if (!countryPicker.contains(e.target)) countryPicker.classList.remove('open'); });
      buildCountryDropdown(); updateCountryDisplay();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const orgName = document.getElementById('org_name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const country = localStorage.getItem('app_country');

      if (!orgName) { errBox.textContent = 'اسم المنظمة مطلوب'; errBox.style.display = 'block'; return; }
      if (!country) { errBox.textContent = 'الرجاء اختيار البلد'; errBox.style.display = 'block'; return; }
      if (!phone || phone.length < 8) { errBox.textContent = 'رقم الهاتف مطلوب (8 أرقام على الأقل)'; errBox.style.display = 'block'; return; }

      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الاتصال بـ Google...';

      localStorage.setItem('pending_org_name', orgName);
      localStorage.setItem('pending_phone', phone);

      try {
        const { error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/complete-profile.html',
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
  }
});