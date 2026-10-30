// ============================================
// صفحة إعدادات الإشعارات - JavaScript
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  // استدعاء الهيكل للحفاظ على القائمة الجانبية
  renderLayout('settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('stg_notifications') || 'إعدادات الإشعارات';
  const main = document.getElementById('main-content');

  // قراءة الإعدادات المحفوظة في ذاكرة المتصفح (الافتراضي هو "مفعل")
  const masterOn = localStorage.getItem('notif_master') !== 'false';
  const soundOn = localStorage.getItem('notif_sound') !== 'false';
  const vibrateOn = localStorage.getItem('notif_vibrate') !== 'false';

  main.innerHTML = `
    <div class="settings-wrapper">
      
      <!-- ترويسة الصفحة وزر الرجوع -->
      <div class="page-header">
        <a href="/settings.html" class="back-btn">
          <i class="fas fa-arrow-right"></i>
        </a>
        <h2>${tr('stg_notifications') || 'الإشعارات'}</h2>
      </div>

      <!-- المفتاح الرئيسي -->
      <div class="settings-card">
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-red">
              <i class="fas fa-bell"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_master_title') || 'تفعيل الإشعارات'}</div>
              <div class="settings-subtitle">${tr('notif_master_sub') || 'إيقاف/تشغيل كل الإشعارات'}</div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-master" ${masterOn ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- الأصوات والاهتزاز -->
      <div class="settings-card">
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-blue">
              <i class="fas fa-volume-up"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_sound_title') || 'صوت الإشعار'}</div>
              <div class="settings-subtitle">${tr('notif_sound_sub') || 'تشغيل نغمة عند وصول إشعار'}</div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-sound" ${soundOn ? 'checked' : ''} ${!masterOn ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-purple">
              <i class="fas fa-mobile-alt"></i>
            </div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_vibrate_title') || 'الاهتزاز'}</div>
              <div class="settings-subtitle">${tr('notif_vibrate_sub') || 'اهتزاز الهاتف عند وصول إشعار'}</div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-vibrate" ${vibrateOn ? 'checked' : ''} ${!masterOn ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

    </div>
  `;

  // --- ربط الأزرار بالمنطق ---
  const masterToggle = document.getElementById('toggle-master');
  const soundToggle = document.getElementById('toggle-sound');
  const vibrateToggle = document.getElementById('toggle-vibrate');

  // 1. المفتاح الرئيسي (تشغيل/إيقاف الكل)
  masterToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    localStorage.setItem('notif_master', isChecked);
    
    // تفعيل أو تعطيل الأزرار الفرعية
    soundToggle.disabled = !isChecked;
    vibrateToggle.disabled = !isChecked;
  });

  // 2. الصوت
  soundToggle.addEventListener('change', (e) => {
    localStorage.setItem('notif_sound', e.target.checked);
    
    // إذا قام بتفعيله، نشغل نغمة تجريبية فوراً (إذا كانت الدالة موجودة)
    if (e.target.checked && typeof playNotificationSound === 'function') {
      playNotificationSound(); 
    }
  });

  // 3. الاهتزاز
  vibrateToggle.addEventListener('change', (e) => {
    localStorage.setItem('notif_vibrate', e.target.checked);
    
    // إذا قام بتفعيله، نهتز الهاتف اهتزازة خفيفة للتأكيد
    if (e.target.checked && navigator.vibrate) {
      navigator.vibrate(200); 
    }
  });
});