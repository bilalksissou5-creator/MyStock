// ============================================
// صفحة الإدارة العامة (One UI)
// ✅ بطاقة اللغة + بطاقة التاريخ والوقت
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('adm_title_full');

  const main = document.getElementById('main-content');
  const currentLang = window.getCurrentLang ? window.getCurrentLang() : 'ar';

  const langNames = {
    ar: tr('lang_ar'),
    fr: tr('lang_fr'),
    en: tr('lang_en'),
  };

  const activeLangName = langNames[currentLang] || langNames.ar;

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('adm_title')}</h2>
      <a href="/settings.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="times-wrapper">
      <div class="times-card">
        <a href="/language.html" class="times-item">
          <div class="times-item-left">
            <div class="times-title">${tr('adm_language')}</div>
            <div class="times-subtitle">${activeLangName}</div>
          </div>
          <i class="fas fa-chevron-left times-arrow"></i>
        </a>
        <div class="times-item" style="cursor:default;">
          <div class="times-item-left">
            <div class="times-title">${tr('adm_app_languages')}</div>
            <div class="times-desc">${tr('adm_app_languages_desc')}</div>
          </div>
        </div>
      </div>

      <div class="times-card">
        <div class="times-item" style="cursor:default;">
          <div class="times-item-left">
            <div class="times-title">${tr('adm_date_time')}</div>
            <div class="times-desc">${tr('adm_date_time_desc')}</div>
            <div class="times-live" style="margin-top:12px;">
              <div class="times-live-row">
                <i class="fas fa-calendar"></i>
                <span class="times-live-value" id="live-date">—</span>
              </div>
              <div class="times-live-row">
                <i class="fas fa-clock"></i>
                <span class="times-live-value" id="live-time">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  function updateDateTime() {
    const now = new Date();
    const locale = localeMap[currentLang] || 'ar-MA';
    const dateStr = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    if (document.getElementById('live-date')) document.getElementById('live-date').textContent = dateStr;
    if (document.getElementById('live-time')) document.getElementById('live-time').textContent = timeStr;
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);
});