// ============================================
// صفحة اختيار اللغة (One UI) مع التحديث الفوري
// ✅ اختيار + تطبيق فوري + علامة ✓
// ✅ مزامنة اللغة بين الأجهزة عبر Supabase Realtime
// ✅ إعادة تحميل الصفحة لضمان تطبيق الترجمة على كل التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('lang_title_full');

  const container = document.getElementById('language-content');
  
  if (!container) {
    console.error('عنصر language-content غير موجود في الصفحة');
    return;
  }

  let user = null;
  try {
    if (typeof db !== 'undefined' && db.auth) {
      const { data } = await db.auth.getUser();
      user = data?.user;
    }
  } catch (e) {
    console.warn('لم يتم جلب المستخدم:', e);
  }

  const LANGUAGES = [
    { code: 'ar', nameKey: 'lang_ar' },
    { code: 'en', nameKey: 'lang_en' },
    { code: 'fr', nameKey: 'lang_fr' },
  ];

  let currentLang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  let selectedLang = currentLang;

  function render() {
    const itemsHTML = LANGUAGES.map((lang, index) => `
      <div class="lang-item ${selectedLang === lang.code ? 'active' : ''}" data-lang="${lang.code}">
        <div class="lang-left">
          <span class="lang-number">${index + 1}</span>
          <span class="lang-name">${tr(lang.nameKey)}</span>
        </div>
        <i class="fas fa-check lang-check"></i>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="lang-header">
        <h1 class="lang-header-title">${tr('lang_page_title')}</h1>
        <button type="button" class="lang-edit-btn" id="edit-btn">
          ${tr('lang_edit')}
        </button>
      </div>

      <p class="lang-description">
        ${tr('lang_page_desc')}
      </p>

      <div class="lang-card">
        ${itemsHTML}
      </div>

      <button type="button" class="lang-apply-btn" id="apply-btn" ${selectedLang === currentLang ? 'disabled' : ''}>
        <i class="fas fa-check"></i>
        <span>${tr('lang_apply')}</span>
      </button>
    `;

    // ✅ اختيار اللغة
    container.querySelectorAll('.lang-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedLang = item.dataset.lang;
        render();
      });
    });

    // ✅ زر "تطبيق"
    document.getElementById('apply-btn')?.addEventListener('click', async () => {
      if (selectedLang === currentLang) return;

      // 1. تحديث الواجهة محلياً
      if (window.setLanguage) {
        window.setLanguage(selectedLang);
      } else {
        localStorage.setItem('app_lang', selectedLang);
      }

      // 2. حفظ في قاعدة البيانات (للمزامنة)
      if (user && typeof db !== 'undefined') {
        try {
          await db.from('profiles').update({ app_lang: selectedLang }).eq('id', user.id);
        } catch (e) { console.warn(e); }
      }

      // 3. إعادة تحميل الصفحة لضمان تطبيق الترجمة على كامل التطبيق
      window.location.reload();
    });

    // ✅ زر "تعديل"
    document.getElementById('edit-btn')?.addEventListener('click', async () => {
      if (selectedLang === currentLang) return;
      
      if (window.setLanguage) {
        window.setLanguage(selectedLang);
      } else {
        localStorage.setItem('app_lang', selectedLang);
      }

      if (user && typeof db !== 'undefined') {
        try {
          await db.from('profiles').update({ app_lang: selectedLang }).eq('id', user.id);
        } catch (e) { console.warn(e); }
      }

      // إعادة تحميل الصفحة
      window.location.reload();
    });
  }

  render();

  // ═══════════════════════════════════════════
  // ✅ التحديث الفوري (Realtime)
  // ═══════════════════════════════════════════
  if (user && typeof db !== 'undefined') {
    try {
      db.channel('lang-sync-' + user.id)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          const newLang = payload.new.app_lang;
          if (newLang && newLang !== currentLang) {
            console.log('⚡ تم تغيير اللغة من جهاز آخر:', newLang);
            if (window.setLanguage) window.setLanguage(newLang);
            
            // إعادة تحميل الصفحة فوراً لتطبيق الترجمة
            window.location.reload();
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }
});