// ============================================
// صفحة إدارة عضو (للمدير فقط)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  // جلب بروفايل المستخدم الحالي
  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    main.innerHTML = `<div class="alert alert-error">ليس لديك صلاحية إدارة الأعضاء</div>`;
    return;
  }

  // قراءة id العضو
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id');

  if (!memberId) {
    main.innerHTML = `<div class="alert alert-error">لم يتم تحديد العضو</div>`;
    return;
  }

  // جلب بيانات العضو
  const { data: member, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    main.innerHTML = `<div class="alert alert-error">لم يتم العثور على العضو</div>`;
    return;
  }

  if (member.organization_id !== myProfile.organization_id) {
    main.innerHTML = `<div class="alert alert-error">هذا العضو ليس في منظمتك</div>`;
    return;
  }

  if (member.role === 'admin') {
    main.innerHTML = `<div class="alert alert-error">لا يمكن إدارة المدير</div>`;
    return;
  }

  const roleLabel = member.role === 'deputy' ? 'نائب' : 'عامل';

  main.innerHTML = `
    <div class="page-header">
      <h2>إدارة العضو</h2>
      <a href="/member-profile.html?id=${member.id}" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="mm-wrapper">

      <!-- ══════ بطاقة العضو ══════ -->
      <div class="mm-member-card">
        <div class="mm-avatar">
          ${member.avatar_url
            ? `<img src="${member.avatar_url}" alt="${member.full_name}">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <div class="mm-info">
          <div class="mm-name">${member.full_name ?? 'بدون اسم'}</div>
          <div class="mm-role">${roleLabel}</div>
        </div>
      </div>

      <!-- ══════ التنبيهات ══════ -->
      <div class="alert alert-error" id="mm-error" style="display:none;"></div>
      <div class="alert alert-success" id="mm-success" style="display:none;"></div>

      <!-- ══════ تغيير الدور ══════ -->
      <div class="mm-section">
        <h3>🔄 تغيير الدور</h3>
        <p class="mm-hint">يمكنك ترقية العامل إلى نائب، أو إرجاع النائب إلى عامل.</p>

        <button type="button" class="btn-primary full-width" id="change-role-btn">
          <i class="fas fa-arrows-rotate"></i>
          <span>${member.role === 'deputy' ? 'إرجاع إلى عامل' : 'ترقية إلى نائب'}</span>
        </button>
      </div>

      <!-- ══════ إخراج من المنظمة ══════ -->
      <div class="mm-section mm-danger">
        <h3>🚫 إخراج من المنظمة</h3>
        <p class="mm-hint">سيتم إخراج العضو من المنظمة فوراً. تبقى بياناته التاريخية محفوظة في النظام (الحركات، الفواتير).</p>

        <button type="button" class="btn-danger full-width" id="remove-btn">
          <i class="fas fa-user-minus"></i>
          <span>إخراج من المنظمة</span>
        </button>
      </div>

    </div>
  `;

  const errBox = document.getElementById('mm-error');
  const successBox = document.getElementById('mm-success');

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
  }

  // ============================================
  // تغيير الدور
  // ============================================
  document.getElementById('change-role-btn').addEventListener('click', async () => {
    const newRole = member.role === 'deputy' ? 'worker' : 'deputy';
    const roleLabelNew = newRole === 'deputy' ? 'نائب' : 'عامل';

    if (!confirm(`تحويل ${member.full_name} إلى ${roleLabelNew}؟`)) return;

    const btn = document.getElementById('change-role-btn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ التغيير...';

    const { error } = await db.rpc('change_member_role', {
      member_id: member.id,
      new_role: newRole,
    });

    btn.disabled = false;
    btn.querySelector('span').textContent = member.role === 'deputy' ? 'إرجاع إلى عامل' : 'ترقية إلى نائب';

    if (error) {
      showError('خطأ: ' + error.message);
    } else {
      showSuccess(`✅ تم التحويل إلى ${roleLabelNew}`);
      setTimeout(() => {
        window.location.href = `/member-profile.html?id=${member.id}`;
      }, 1500);
    }
  });

  // ============================================
  // إخراج من المنظمة
  // ============================================
  document.getElementById('remove-btn').addEventListener('click', async () => {
    if (!confirm(`هل أنت متأكد من إخراج ${member.full_name} من المنظمة؟\nلا يمكن التراجع بسهولة.`)) return;
    if (!confirm(`تأكيد نهائي: سيتم إخراج ${member.full_name}.`)) return;

    const btn = document.getElementById('remove-btn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الإخراج...';

    const { error } = await db.rpc('remove_member', {
      member_id: member.id,
    });

    btn.disabled = false;
    btn.querySelector('span').textContent = 'إخراج من المنظمة';

    if (error) {
      showError('خطأ: ' + error.message);
    } else {
      showSuccess('✅ تم إخراج العضو بنجاح');
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1500);
    }
  });

});