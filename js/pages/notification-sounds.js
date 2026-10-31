// ============================================
// صفحة اختيار نغمة الإشعارات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');
  if (window.applyLanguage) window.applyLanguage();
  
  document.title = 'نغمات الإشعارات';
  const main = document.getElementById('main-content');

  // قائمة النغمات المتاحة
  const tones = [
    { id: 'default', name: 'نغمة افتراضية (دينغ دونغ)' },
    { id: 'chime', name: 'نغمة هادئة (أجراس)' },
    { id: 'alert', name: 'تنبيه سريع (3 صفارات)' },
    { id: 'bell', name: 'جرس طويل' },
    { id: 'none', name: 'صامت (بدون نغمة)' }
  ];

  const currentTone = localStorage.getItem('notif_tone') || 'default';
  let selectedTone = currentTone;

  // دالة لتشغيل الصوت (تجريبي أو حقيقي)
  window.playToneSound = function(toneId) {
    if (toneId === 'none') return;

    if (!window.__audioCtx) {
      window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.__audioCtx.state === 'suspended') {
      window.__audioCtx.resume();
    }

    const now = window.__audioCtx.currentTime;
    const osc = window.__audioCtx.createOscillator();
    const gain = window.__audioCtx.createGain();

    osc.connect(gain);
    gain.connect(window.__audioCtx.destination);

    if (toneId === 'default') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } 
    else if (toneId === 'chime') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
    else if (toneId === 'alert') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      // 3 صفارات متتالية (محاكاة)
      for (let i = 0; i < 3; i++) {
        osc.start(now + (i * 0.2));
        osc.stop(now + (i * 0.2) + 0.1);
      }
    }
    else if (toneId === 'bell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    }
  };

  // بناء واجهة الصفحة
  const optionsHTML = tones.map(tone => `
    <div class="sound-option ${tone.id === selectedTone ? 'selected' : ''}" data-id="${tone.id}">
      <div class="sound-option-left">
        <div class="custom-radio"></div>
        <div class="sound-option-name">${tone.name}</div>
      </div>
      ${tone.id !== 'none' ? `
        <button type="button" class="test-sound-btn" data-test="${tone.id}" title="تجربة الصوت">
          <i class="fas fa-play"></i>
        </button>
      ` : ''}
    </div>
  `).join('');

  main.innerHTML = `
    <div class="settings-wrapper">
      
      <div class="page-header">
        <a href="/notifications-settings.html" class="back-btn">
          <i class="fas fa-arrow-right"></i>
        </a>
        <h2>نغمات الإشعارات</h2>
      </div>

      <div class="settings-card">
        ${optionsHTML}
      </div>

      <button type="button" id="save-tone-btn" class="save-sound-btn">
        <i class="fas fa-check"></i>
        <span>حفظ النغمة</span>
      </button>

    </div>
  `;

  // 1. منطق اختيار النغمة
  const optionElements = document.querySelectorAll('.sound-option');
  optionElements.forEach(opt => {
    opt.addEventListener('click', (e) => {
      // إذا ضغط على زر التجربة، لا نغير النغمة
      if (e.target.closest('.test-sound-btn')) return;

      const id = opt.dataset.id;
      selectedTone = id;

      // إزالة التحديد من الجميع وإضافته للمختار
      optionElements.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      // تشغيل النغمة فور اختيارها
      window.playToneSound(id);
    });
  });

  // 2. منطق أزرار التجربة
  document.querySelectorAll('.test-sound-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // منع تحديد النغمة عند الضغط على التجربة
      const toneId = btn.dataset.test;
      window.playToneSound(toneId);
      
      // تأثير بصري بسيط للزر
      btn.style.background = '#dcfce7';
      btn.style.color = '#16a34a';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.color = '';
      }, 300);
    });
  });

  // 3. منطق الحفظ
  document.getElementById('save-tone-btn').addEventListener('click', () => {
    localStorage.setItem('notif_tone', selectedTone);
    
    const btn = document.getElementById('save-tone-btn');
    btn.innerHTML = '<i class="fas fa-check"></i> <span>تم الحفظ بنجاح!</span>';
    btn.style.background = '#15803d';

    setTimeout(() => {
      window.location.href = '/notifications-settings.html';
    }, 800);
  });
});