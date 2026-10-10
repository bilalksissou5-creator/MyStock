// ============================================
// صفحة الاتصالات — إدارة الطابعة (Bluetooth + USB)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  const main = document.getElementById('main-content');

  // 1. جلب بروفايل المستخدم
  const { data: profile } = await db
    .from('profiles')
    .select('bluetooth_enabled, usb_enabled')
    .eq('id', user.id)
    .single();

  let bluetoothEnabled = profile?.bluetooth_enabled ?? false;
  let usbEnabled = profile?.usb_enabled ?? false;

  // 2. بناء الواجهة
  main.innerHTML = `
    <div class="page-header">
      <h2>الاتصالات</h2>
      <a href="/settings.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="alert alert-error" id="contacts-error" style="display:none;"></div>
    <div class="alert alert-success" id="contacts-success" style="display:none;"></div>

    <div class="contacts-wrapper">

      <div class="contacts-card">

        <!-- ══════ Bluetooth ══════ -->
        <div class="contact-item">
          <div class="contact-icon icon-blue">
            <i class="fa-brands fa-bluetooth-b"></i>
          </div>
          <div class="contact-text">
            <div class="contact-title">Bluetooth</div>
            <div class="contact-status" id="bluetooth-status">
              ${bluetoothEnabled ? 'مفعّل' : 'معطّل'}
            </div>
          </div>
          <button
            type="button"
            class="contact-toggle ${bluetoothEnabled ? 'active' : ''}"
            id="bluetooth-toggle"
            data-enabled="${bluetoothEnabled}">
            <span>${bluetoothEnabled ? 'إغلاق' : 'تفعيل'}</span>
          </button>
        </div>

        <!-- ══════ USB ══════ -->
        <div class="contact-item">
          <div class="contact-icon icon-orange">
            <i class="fa-brands fa-usb"></i>
          </div>
          <div class="contact-text">
            <div class="contact-title">USB</div>
            <div class="contact-status" id="usb-status">
              ${usbEnabled ? 'مفعّل' : 'معطّل'}
            </div>
          </div>
          <button
            type="button"
            class="contact-toggle ${usbEnabled ? 'active' : ''}"
            id="usb-toggle"
            data-enabled="${usbEnabled}">
            <span>${usbEnabled ? 'إغلاق' : 'تفعيل'}</span>
          </button>
        </div>

      </div>

    </div>
  `;

  // 3. المراجع
  const errBox = document.getElementById('contacts-error');
  const successBox = document.getElementById('contacts-success');
  const bluetoothToggle = document.getElementById('bluetooth-toggle');
  const usbToggle = document.getElementById('usb-toggle');

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
    setTimeout(() => { errBox.style.display = 'none'; }, 3000);
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
    setTimeout(() => { successBox.style.display = 'none'; }, 3000);
  }

  // ============================================
  // ✅ تحديث حالة الزر
  // ============================================
  function updateToggleUI(btn, enabled, statusEl) {
    btn.dataset.enabled = enabled;
    btn.classList.toggle('active', enabled);
    btn.querySelector('span').textContent = enabled ? 'إغلاق' : 'تفعيل';
    statusEl.textContent = enabled ? 'مفعّل' : 'معطّل';
  }

  // ============================================
  // ✅ حفظ في قاعدة البيانات
  // ============================================
  async function saveState(field, value) {
    const { error } = await db
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);

    if (error) throw error;
  }

  // ============================================
  // ✅ زر Bluetooth
  // ============================================
  bluetoothToggle.addEventListener('click', async () => {
    const enabled = bluetoothToggle.dataset.enabled === 'true';
    const newValue = !enabled;

    bluetoothToggle.disabled = true;

    try {
      await saveState('bluetooth_enabled', newValue);
      bluetoothEnabled = newValue;

      updateToggleUI(
        bluetoothToggle,
        newValue,
        document.getElementById('bluetooth-status')
      );

      showSuccess(newValue ? '✅ تم تفعيل Bluetooth' : '✅ تم إغلاق Bluetooth');
    } catch (err) {
      showError('خطأ: ' + err.message);
    } finally {
      bluetoothToggle.disabled = false;
    }
  });

  // ============================================
  // ✅ زر USB
  // ============================================
  usbToggle.addEventListener('click', async () => {
    const enabled = usbToggle.dataset.enabled === 'true';
    const newValue = !enabled;

    usbToggle.disabled = true;

    try {
      await saveState('usb_enabled', newValue);
      usbEnabled = newValue;

      updateToggleUI(
        usbToggle,
        newValue,
        document.getElementById('usb-status')
      );

      showSuccess(newValue ? '✅ تم تفعيل USB' : '✅ تم إغلاق USB');
    } catch (err) {
      showError('خطأ: ' + err.message);
    } finally {
      usbToggle.disabled = false;
    }
  });
});