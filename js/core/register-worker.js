// ============================================
// صفحة تسجيل العامل (عبر دعوة)
// ✅ دعم كامل للترجمة
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

  const { data: invite, error: inviteErr } = await db
    .from('worker_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (inviteErr || !invite) {
    showError(tr('rw_err_invite'));
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    showError(tr('rw_err_expired'));
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
      showError(tr('prod_add_err_qty').replace('الكمية', '').trim() || 'Passwords do not match');
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

      await db
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', userId);

      await db
        .from('worker_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

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