// ============================================
// صفحة إعدادات الإشعارات (كود كامل ومترجم)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('stg_notifications') || 'Notifications Settings';
  const main = document.getElementById('main-content');

  const masterOn = localStorage.getItem('notif_master') !== 'false';
  const soundOn = localStorage.getItem('notif_sound') !== 'false';
  const vibrateOn = localStorage.getItem('notif_vibrate') !== 'false';
  
  // دالة لجلب اسم النغمة مترجماً
  function getCurrentToneName() {
    const tones = {
      'default': tr('notif_tone_default'),
      'chime': tr('notif_tone_chime'),
      'alert': tr('notif_tone_alert'),
      'bell': tr('notif_tone_bell'),
      'none': tr('notif_tone_none')
    };
    const current = localStorage.getItem('notif_tone') || 'default';
    return tones[current] || tones['default'];
  }

  main.innerHTML = `
    <div class="settings-wrapper">
      
      <!-- ترويسة الصفحة بدون سهم رجوع -->
      <div class="page-header" style="justify-content: flex-start;">
        <h2>${tr('stg_notifications')}</h2>
      </div>

      <!-- 1. المفتاح الرئيسي -->
      <div class="settings-card">
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-red"><i class="fas fa-bell"></i></div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_master_title')}</div>
              <div class="settings-subtitle">${tr('notif_master_sub')}</div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-master" ${masterOn ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- 2. الصوت والاهتزاز -->
      <div class="settings-card">
        
        <!-- بطاقة الصوت الموحدة -->
        <div class="settings-item" onclick="window.location.href='/notification-sounds.html'">
          <div class="settings-item-left">
            <div class="settings-icon icon-blue"><i class="fas fa-volume-up"></i></div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_sound_title')}</div>
              <div class="settings-subtitle">${getCurrentToneName()}</div>
            </div>
          </div>
          <div onclick="event.stopPropagation();">
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-sound" ${soundOn ? 'checked' : ''} ${!masterOn ? 'disabled' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <!-- بطاقة الاهتزاز -->
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-icon icon-purple"><i class="fas fa-mobile-alt"></i></div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_vibrate_title')}</div>
              <div class="settings-subtitle">${tr('notif_vibrate_sub')}</div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-vibrate" ${vibrateOn ? 'checked' : ''} ${!masterOn ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- 3. زر الاختبار -->
      <div class="settings-card">
        <button type="button" id="test-alerts-btn" class="settings-item" style="width:100%; border:none; background:transparent; cursor:pointer; text-align:start;">
          <div class="settings-item-left">
            <div class="settings-icon icon-green"><i class="fas fa-play"></i></div>
            <div class="settings-text">
              <div class="settings-title">${tr('notif_test_alerts_title')}</div>
              <div class="settings-subtitle">${tr('notif_test_alerts_sub')}</div>
            </div>
          </div>
        </button>
      </div>

    </div>
  `;

  // --- ربط الأزرار بالمنطق ---
  const masterToggle = document.getElementById('toggle-master');
  const soundToggle = document.getElementById('toggle-sound');
  const vibrateToggle = document.getElementById('toggle-vibrate');
  const testBtn = document.getElementById('test-alerts-btn');

  // 1. المفتاح الرئيسي
  masterToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    localStorage.setItem('notif_master', isChecked);
    soundToggle.disabled = !isChecked;
    vibrateToggle.disabled = !isChecked;
  });

  // 2. الصوت
  soundToggle.addEventListener('change', (e) => {
    localStorage.setItem('notif_sound', e.target.checked);
    if (e.target.checked) {
      setTimeout(() => {
        if (typeof window.playNotificationAlerts === 'function') {
          window.playNotificationAlerts();
        }
      }, 100);
    }
  });

  // 3. الاهتزاز
  vibrateToggle.addEventListener('change', (e) => {
    localStorage.setItem('notif_vibrate', e.target.checked);
    if (e.target.checked && navigator.vibrate) {
      navigator.vibrate(200);
    }
  });

  // 4. زر الاختبار
  testBtn.addEventListener('click', () => {
    if (typeof window.playNotificationAlerts === 'function') {
      window.playNotificationAlerts();
    }
  });
});