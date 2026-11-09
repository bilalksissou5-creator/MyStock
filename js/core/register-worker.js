// ============================================
// صفحة تسجيل العامل (عبر دعوة)
// ✅ دعم كامل للترجمة + تأمين عبر RPC
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('rw_title_full');

  // إظهار/إخفاء كلمات السر
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';
    });
  });

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const errBox = document.getElementById('reg-error');
  const successBox = document.getElementById('reg-success');

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }

  if (!token) {
    showError(tr('rw_err_token'));
    return;
  }

  // ✅ استخدام الدالة الآمنة (RPC) بدلاً من القراءة المباشرة
  const { data: invites, error: inviteErr } = await db
    .rpc('get_invite_by_token', { invite_token: token });

  // الدالة ترجع مصفوفة، نأخذ العنصر الأول
  const invite = invites && invites.length > 0 ? invites[0] : null;

  if (inviteErr || !invite) {
    showError(tr('rw_err_invite'));
    return;
  }

  const emailInput = document.getElementById('email');
  emailInput.value = invite.email || '';

  const form = document.getElementById('register-worker-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('register-btn');
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = emailInput.value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password_confirm').value;

    if (!firstName || !lastName) {
      showError(tr('rw_err_name'));
      return;
    }

    if (!phone) {
      showError(tr('rw_err_phone'));
      return;
    }

    if (password !== passwordConfirm) {
      showError('كلمتا المرور غير متطابقتين'); // تم إصلاح الترجمة هنا
      return;
    }

    if (password.length < 6) {
      showError(tr('rw_err_pwd_short'));
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = tr('rw_creating');

    try {
      const fullName = `${firstName} ${lastName}`;

      // 1. إنشاء الحساب (الـ Trigger سيتكفل بإنشاء البروفايل تلقائياً)
      const { data: authData, error: authError } = await db.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            invited_org_id: invite.organization_id,
            phone: phone,
          },
        },
      });

      if (authError) throw new Error(tr('rw_err_signup') + ' ' + authError.message);

      const userId = authData.user?.id;
      if (!userId) throw new Error(tr('rw_err_signup'));

      // 2. تحديث الهاتف كاحتياط إضافي
      await db
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', userId);

      // 3. ✅ استخدام دالة القبول الآمنة (RPC) بدلاً من التحديث المباشر
      await db.rpc('accept_worker_invite', { invite_token: token });

      successBox.textContent = tr('rw_success');
      successBox.style.display = 'block';

      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 2000);

    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.querySelector('span').textContent = tr('rw_create_account');
    }
  });
});