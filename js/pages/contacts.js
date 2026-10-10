// ============================================
// صفحة الاتصالات — روابط Bluetooth + USB
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('contacts.html');

  const main = document.getElementById('main-content');

  // جلب البروفايل
  const { data: profile } = await db
    .from('profiles')
    .select('bluetooth_enabled, usb_enabled')
    .eq('id', user.id)
    .single();

  const bluetoothEnabled = profile?.bluetooth_enabled ?? false;
  const usbEnabled = profile?.usb_enabled ?? false;

  main.innerHTML = `
    <div class="page-header">
      <h2>الاتصالات</h2>
      <a href="/settings.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="contacts-wrapper">
      <div class="contacts-card">

        <!-- ══════ Bluetooth ══════ -->
        <a href="/bluetooth.html" class="contact-item contact-link">
          <div class="contact-icon icon-blue">
            <i class="fa-brands fa-bluetooth-b"></i>
          </div>
          <div class="contact-text">
            <div class="contact-title">Bluetooth</div>
            <div class="contact-status">
              ${bluetoothEnabled ? 'مفعّل' : 'معطّل'}
            </div>
          </div>
          <i class="fas fa-chevron-left contact-arrow"></i>
        </a>

        <!-- ══════ USB ══════ -->
        <a href="/usb.html" class="contact-item contact-link">
          <div class="contact-icon icon-orange">
            <i class="fa-brands fa-usb"></i>
          </div>
          <div class="contact-text">
            <div class="contact-title">USB</div>
            <div class="contact-status">
              ${usbEnabled ? 'مفعّل' : 'معطّل'}
            </div>
          </div>
          <i class="fas fa-chevron-left contact-arrow"></i>
        </a>

      </div>
    </div>
  `;
});