// ============================================
// صفحة USB — إدارة طابعة USB
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('usb.html');

  const main = document.getElementById('main-content');

  // جلب البروفايل + الأجهزة
  const { data: profile } = await db
    .from('profiles')
    .select('usb_enabled, organization_id')
    .eq('id', user.id)
    .single();

  let enabled = profile?.usb_enabled ?? false;

  const { data: devices } = await db
    .from('user_devices')
    .select('*')
    .eq('user_id', user.id)
    .eq('device_type', 'usb')
    .order('last_used_at', { ascending: false });

  let savedDevices = devices ?? [];

  // ═══════════════════════════════════════════
  // بناء الواجهة
  // ═══════════════════════════════════════════
  function render() {
    main.innerHTML = `
      <div class="page-header">
        <h2>
          <i class="fa-brands fa-usb" style="color:#ea580c;"></i>
          USB
        </h2>
        <a href="/contacts.html" class="btn-secondary">
          <i class="fas fa-arrow-right"></i>
          <span>العودة</span>
        </a>
      </div>

      <div class="alert alert-error" id="usb-error" style="display:none;"></div>
      <div class="alert alert-success" id="usb-success" style="display:none;"></div>

      <div class="device-wrapper">

        <!-- ══════ حالة USB ══════ -->
        <div class="device-card">
          <div class="device-card-header">
            <div class="device-card-icon icon-orange">
              <i class="fa-brands fa-usb"></i>
            </div>
            <div class="device-card-info">
              <h3>حالة USB</h3>
              <p>${enabled ? 'مفعّل' : 'معطّل'}</p>
            </div>
            <button type="button"
                    class="device-toggle ${enabled ? 'active' : ''}"
                    id="usb-toggle">
              <span>${enabled ? 'إغلاق' : 'تفعيل'}</span>
            </button>
          </div>
        </div>

        <!-- ══════ الاتصال بالطابعة ══════ -->
        ${enabled ? `
          <div class="device-card">
            <div class="device-card-header">
              <div class="device-card-icon icon-orange">
                <i class="fas fa-print"></i>
              </div>
              <div class="device-card-info">
                <h3>الاتصال بالطابعة</h3>
                <p id="usb-connection-status">غير متصل</p>
              </div>
            </div>

            <div class="device-actions">
              <button type="button" class="btn-primary full-width" id="usb-connect-btn">
                <i class="fas fa-link"></i>
                <span>البحث عن طابعة</span>
              </button>
            </div>
          </div>

          <!-- ══════ اختبار الطباعة ══════ -->
          <div class="device-card">
            <div class="device-card-header">
              <div class="device-card-icon icon-green">
                <i class="fas fa-vial"></i>
              </div>
              <div class="device-card-info">
                <h3>اختبار الطباعة</h3>
                <p>طباعة نموذج تجريبي</p>
              </div>
            </div>
            <button type="button" class="btn-primary full-width" id="usb-test-btn">
              <i class="fas fa-print"></i>
              <span>طباعة اختبارية</span>
            </button>
          </div>
        ` : ''}

        <!-- ══════ الأجهزة المحفوظة ══════ -->
        <div class="device-card">
          <div class="device-card-header">
            <div class="device-card-icon icon-gray">
              <i class="fas fa-list"></i>
            </div>
            <div class="device-card-info">
              <h3>الأجهزة المحفوظة</h3>
              <p>${savedDevices.length} جهاز</p>
            </div>
          </div>

          ${savedDevices.length === 0 ? `
            <div class="device-empty">
              <i class="fas fa-print"></i>
              <p>لا توجد أجهزة محفوظة</p>
            </div>
          ` : `
            <div class="device-list">
              ${savedDevices.map(d => `
                <div class="device-list-item">
                  <div class="device-list-icon">
                    <i class="fas fa-print"></i>
                  </div>
                  <div class="device-list-info">
                    <strong>${d.device_name}</strong>
                    <span>${d.is_default ? '⭐ افتراضي' : 'آخر استخدام: ' + new Date(d.last_used_at).toLocaleDateString('ar')}</span>
                  </div>
                  ${!d.is_default ? `
                    <button type="button" class="device-set-default" data-id="${d.id}" title="تعيين افتراضي">
                      <i class="fas fa-star"></i>
                    </button>
                  ` : ''}
                  <button type="button" class="device-delete" data-id="${d.id}" title="حذف">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    `;

    // ═══════════════════════════════════════════
    // المراجع والأحداث
    // ═══════════════════════════════════════════
    const errBox = document.getElementById('usb-error');
    const successBox = document.getElementById('usb-success');

    function showError(msg) {
      successBox.style.display = 'none';
      errBox.textContent = msg;
      errBox.style.display = 'block';
      setTimeout(() => { errBox.style.display = 'none'; }, 4000);
    }

    function showSuccess(msg) {
      errBox.style.display = 'none';
      successBox.textContent = msg;
      successBox.style.display = 'block';
      setTimeout(() => { successBox.style.display = 'none'; }, 3000);
    }

    // ══════ زر التفعيل/الإغلاق ══════
    document.getElementById('usb-toggle')?.addEventListener('click', async () => {
      const newValue = !enabled;
      try {
        const { error } = await db
          .from('profiles')
          .update({ usb_enabled: newValue })
          .eq('id', user.id);
        if (error) throw error;

        enabled = newValue;
        render();
      } catch (err) {
        alert('خطأ: ' + err.message);
      }
    });

    // ══════ زر الاتصال ══════
    document.getElementById('usb-connect-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('usb-connect-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ البحث...';

      try {
        const device = await Printer.connectUsbPrinter();

        // حفظ في قاعدة البيانات
        const { data: existing } = await db
          .from('user_devices')
          .select('*')
          .eq('user_id', user.id)
          .eq('device_type', 'usb')
          .eq('device_id', device.id)
          .maybeSingle();

        if (existing) {
          await db
            .from('user_devices')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          const isFirst = savedDevices.length === 0;
          await db
            .from('user_devices')
            .insert({
              user_id: user.id,
              organization_id: profile.organization_id,
              device_type: 'usb',
              device_name: device.name,
              device_id: device.id,
              is_default: isFirst,
            });
        }

        showSuccess('✅ تم الاتصال بـ ' + device.name);
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'البحث عن طابعة';
      }
    });

    // ══════ زر اختبار الطباعة ══════
    document.getElementById('usb-test-btn')?.addEventListener('click', async () => {
      if (!Printer.isUsbConnected()) {
        showError('يجب الاتصال بطابعة أولاً');
        return;
      }

      const btn = document.getElementById('usb-test-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الطباعة...';

      try {
        const builder = new Printer.ReceiptBuilder(58);
        builder.alignCenter();
        builder.doubleBoth();
        builder.bold(true);
        builder.line('MyStock');
        builder.normalSize();
        builder.bold(false);
        builder.feed(1);
        builder.alignLeft();
        builder.separator();
        builder.line('اختبار طباعة USB');
        builder.row('التاريخ:', new Date().toLocaleDateString('ar'));
        builder.row('الوقت:', new Date().toLocaleTimeString('ar'));
        builder.separator();
        builder.alignCenter();
        builder.line('✅ الطابعة تعمل');
        builder.feed(2);
        builder.cut();

        await Printer.printUsb(builder.build());
        showSuccess('✅ تم إرسال اختبار الطباعة');
      } catch (err) {
        showError(err.message);
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'طباعة اختبارية';
      }
    });

    // ══════ حذف جهاز ══════
    document.querySelectorAll('.device-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('حذف هذا الجهاز؟')) return;
        const id = btn.dataset.id;
        await db.from('user_devices').delete().eq('id', id);
        window.location.reload();
      });
    });

    // ══════ تعيين افتراضي ══════
    document.querySelectorAll('.device-set-default').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;

        await db
          .from('user_devices')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('device_type', 'usb');

        await db.from('user_devices').update({ is_default: true }).eq('id', id);

        window.location.reload();
      });
    });
  }

  render();
});