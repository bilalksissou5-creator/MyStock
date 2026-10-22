// ============================================
// صفحة إعدادات الوقت والتاريخ (One UI)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('time-settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);
  
  const currentLang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  document.title = tr('time_settings_title') || 'Time & Date';

  const main = document.getElementById('main-content');

  // قراءة إعداد 24 ساعة من الذاكرة
  let use24h = localStorage.getItem('use_24h') !== 'false'; 
  const isAutoTime = true; // افتراضي

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('time_settings_title')}</h2>
      <a href="/times.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="times-wrapper">
      <!-- البطاقة 1: الوقت والتاريخ التلقائي -->
      <div class="times-card">
        <div class="time-setting-row">
          <div class="time-setting-text">
            <div class="time-setting-title">${tr('time_auto')}</div>
            <div class="time-setting-desc">${tr('time_auto_desc')}</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-auto-time" ${isAutoTime ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="time-setting-row">
          <div class="time-setting-text">
            <div class="time-setting-title">${tr('time_set_date')}</div>
          </div>
          <div class="time-setting-value" id="display-date">—</div>
        </div>

        <div class="time-setting-row">
          <div class="time-setting-text">
            <div class="time-setting-title">${tr('time_set_time')}</div>
          </div>
          <div class="time-setting-value" id="display-time">—</div>
        </div>
      </div>

      <!-- البطاقة 2: المنطقة الزمنية -->
      <div class="times-card">
        <div class="time-setting-row">
          <div class="time-setting-text">
            <div class="time-setting-title">${tr('time_zone_auto')}</div>
            <div class="time-setting-desc">${tr('time_zone_auto_desc')}</div>
          </div>
          <label class="switch">
            <input type="checkbox" checked>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="time-setting-row">
          <div class="time-setting-text">
            <div class="time-setting-title">${tr('time_zone_location')}</div>
            <div class="time-setting-desc">${tr('time_zone_location_desc')}</div>
          </div>
          <label class="switch">
            <input type="checkbox">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- البطاقة 3: تنسيق 24 ساعة -->
      <div class="times-card">
        <div class="time-setting-row">
          <div class="time-setting-text">
            <div class="time-setting-title">${tr('time_use_24h')}</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-24h" ${use24h ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════
  // ✅ المنطق البرمجي للصفحة
  // ═══════════════════════════════════════════
  const toggle24h = document.getElementById('toggle-24h');
  const displayDate = document.getElementById('display-date');
  const displayTime = document.getElementById('display-time');
  
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[currentLang] || 'ar-MA';

  function updateClock() {
    const now = new Date();
    
    // تحديث التاريخ
    displayDate.textContent = now.toLocaleDateString(locale, { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // تحديث الوقت (حسب اختيار 12 أو 24)
    displayTime.textContent = now.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: !use24h 
    });
  }

  // تحديث الساعة فوراً وكل ثانية
  updateClock();
  setInterval(updateClock, 1000);

  // الاستماع لتغيير مفتاح 24 ساعة
  toggle24h.addEventListener('change', (e) => {
    use24h = e.target.checked;
    localStorage.setItem('use_24h', use24h);
    updateClock(); // تحديث فوري
  });
});