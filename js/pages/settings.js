// ============================================
// صفحة الإعدادات
// الدور: تعديل بيانات المنظمة + عرض معلومات التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('settings.html');

  const main = document.getElementById('main-content');

  // جلب بيانات المنظمة
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  let org = null;
  if (profile?.organization_id) {
    const { data } = await db
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single();
    org = data;
  }

  main.innerHTML = `
    <h2>الإعدادات</h2>

    <div class="alert alert-error" id="settings-error" style="display:none;"></div>
    <div class="alert alert-success" id="settings-success" style="display:none;"></div>

    <div class="settings-section">
      <h3>معلومات المنظمة</h3>
      <div class="form-group">
        <label>اسم المنظمة</label>
        <input type="text" id="org-name" value="${org?.name ?? ''}" ${profile?.role !== 'admin' ? 'disabled' : ''}>
      </div>
      <div class="form-group">
        <label>الرابط البنكي</label>
        <input type="text" id="bank" value="${org?.bank_linked ? 'مرتبط' : 'غير مرتبط'}" disabled dir="ltr">
      </div>
      ${profile?.role === 'admin' ? `
        <button class="btn-primary" id="save-org">
          <i class="fas fa-check"></i>
          <span>حفظ</span>
        </button>
      ` : ''}
    </div>

    <div class="settings-section">
      <h3>حول التطبيق</h3>
      <div class="info-row">
        <span>الإصدار</span>
        <strong>1.0.0</strong>
      </div>
      <div class="info-row">
        <span>التطبيق</span>
        <strong>MyStock</strong>
      </div>
      <div class="info-row">
        <span>الدور</span>
        <strong>${profile?.role === 'admin' ? 'مدير' : 'عامل'}</strong>
      </div>
    </div>
  `;

  const errorBox = document.getElementById('settings-error');
  const successBox = document.getElementById('settings-success');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    successBox.style.display = 'none';
  }

  function showSuccess(msg) {
    successBox.textContent = msg;
    successBox.style.display = 'block';
    errorBox.style.display = 'none';
    setTimeout(() => { successBox.style.display = 'none'; }, 3000);
  }

  const saveBtn = document.getElementById('save-org');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const name = document.getElementById('org-name').value.trim();

      if (!name) {
        showError('اسم المنظمة مطلوب');
        return;
      }

      const oldName = org?.name ?? '—';

      // لا حفظ لو ما تغيّر الاسم
      if (name === oldName) {
        showError('لا يوجد تغيير');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.querySelector('span').textContent = 'جارٍ الحفظ...';

      const { error } = await db
        .from('organizations')
        .update({ name })
        .eq('id', profile.organization_id);

      if (error) {
        showError('خطأ: ' + error.message);
        saveBtn.disabled = false;
        saveBtn.querySelector('span').textContent = 'حفظ';
        return;
      }

      // ✅ إشعار تعديل المنظمة
      if (typeof notifyOrganization === 'function') {
        try {
          const { data: { user: currentUser } } = await db.auth.getUser();
          const { data: fullProfile } = await db
            .from('profiles')
            .select('full_name')
            .eq('id', currentUser.id)
            .single();

          await notifyOrganization({
            orgId: profile.organization_id,
            title: 'تعديل المنظمة',
            message: `${fullProfile?.full_name || 'مستخدم'} عدّل اسم المنظمة من "${oldName}" إلى "${name}"`,
            type: 'info',
            link: '/settings.html',
            userName: fullProfile?.full_name || null,
          });
        } catch (notifErr) {
          console.error('❌ Notification error:', notifErr);
        }
      }

      // تحديث القيمة المحلية
      if (org) org.name = name;

      showSuccess('✅ تم الحفظ بنجاح');

      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = 'حفظ';
    });
  }
});