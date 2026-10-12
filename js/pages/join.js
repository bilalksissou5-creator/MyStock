// ============================================
// صفحة الانضمام — بكود دعوة
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('jn_title_full');

  const codeInput = document.getElementById('invite-code');
  const fullNameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const joinBtn = document.getElementById('join-btn');
  const errBox = document.getElementById('join-error');
  const successBox = document.getElementById('join-success');

  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get('code');
  if (urlCode) {
    codeInput.value = urlCode.replace(/\D/g, '').slice(0, 6);
    fullNameInput.focus();
  } else {
    codeInput.focus();
  }

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

  codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  joinBtn.addEventListener('click', async () => {
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const code = codeInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (code.length !== 6) {
      showError(tr('jn_err_code'));
      return;
    }
    if (!fullName) {
      showError(tr('rw_err_name'));
      return;
    }
    if (!email || !email.includes('@')) {
      showError(tr('aw_invalid_email'));
      return;
    }
    if (password.length < 6) {
      showError(tr('rw_err_pwd_short'));
      return;
    }

    joinBtn.disabled = true;
    joinBtn.querySelector('span').textContent = tr('rw_creating');

    try {
      const { data: invite, error: inviteError } = await db
        .from('worker_invites')
        .select('id, status, full_name')
        .eq('code', code)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (inviteError) throw new Error(tr('jn_err_verify') + ' ' + inviteError.message);

      if (!invite) {
        throw new Error(tr('jn_err_invalid_code'));
      }

      const { data: authData, error: authError } = await db.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            invite_code: code,
          },
        },
      });

      if (authError) throw new Error(tr('rw_err_signup') + ' ' + authError.message);

      showSuccess(tr('rw_success'));

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);

    } catch (err) {
      showError(err.message);
      joinBtn.disabled = false;
      joinBtn.querySelector('span').textContent = tr('rw_create_account');
    }
  });

  [codeInput, fullNameInput, emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinBtn.click();
    });
  });
});