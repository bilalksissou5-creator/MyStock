// ============================================
// صفحة اختيار نغمة الإشعارات
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');
  if (window.applyLanguage) window.applyLanguage();
  
  const tr = (key) => (window.t ? window.t(key) : key);
  document.title = tr('notif_sounds_title') || 'Notification Sounds';
  const main = document.getElementById('main-content');

  // قائمة النغمات المتاحة
  const tones = [
    { id: 'default', name: tr('notif_tone_default') },
    { id: 'chime', name: tr('notif_tone_chime') },
    { id: 'alert', name: tr('notif_tone_alert') },
    { id: 'bell', name: tr('notif_tone_bell') },
    { id: 'none', name: tr('notif_tone_none') }
  ];

  const currentTone = localStorage.getItem('notif_tone') || 'default';
  let selectedTone = currentTone;

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

  const optionsHTML = tones.map(tone => `
    <div class="sound-option ${tone.id === selectedTone ? 'selected' : ''}" data-id="${tone.id}">
      <div class="sound-option-left">
        <div class="custom-radio"></div>
        <div class="sound-option-name">${tone.name}</div>
      </div>
      ${tone.id !== 'none' ? `
        <button type="button" class="test-sound-btn" data-test="${tone.id}" title="${tr('notif_test_tone')}">
          <i class="fas fa-play"></i>
        </button>
      ` : ''}
    </div>
  `).join('');

  main.innerHTML = `
    <div class="settings-wrapper">
      
      <div class="page-header" style="justify-content: flex-start;">
        <h2>${tr('notif_sounds_title')}</h2>
      </div>

      <div class="settings-card">
        ${optionsHTML}
      </div>

      <button type="button" id="save-tone-btn" class="save-sound-btn">
        <i class="fas fa-check"></i>
        <span>${tr('notif_save_tone')}</span>
      </button>

    </div>
  `;

  const optionElements = document.querySelectorAll('.sound-option');
  optionElements.forEach(opt => {
    opt.addEventListener('click', (e) => {
      if (e.target.closest('.test-sound-btn')) return;

      const id = opt.dataset.id;
      selectedTone = id;

      optionElements.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      window.playToneSound(id);
    });
  });

  document.querySelectorAll('.test-sound-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const toneId = btn.dataset.test;
      window.playToneSound(toneId);
      
      btn.style.background = '#dcfce7';
      btn.style.color = '#16a34a';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.color = '';
      }, 300);
    });
  });

  document.getElementById('save-tone-btn').addEventListener('click', () => {
    localStorage.setItem('notif_tone', selectedTone);
    
    const btn = document.getElementById('save-tone-btn');
    btn.innerHTML = `<i class="fas fa-check"></i> <span>${tr('notif_tone_saved')}</span>`;
    btn.style.background = '#15803d';

    setTimeout(() => {
      window.location.href = '/notifications-settings.html';
    }, 800);
  });
});