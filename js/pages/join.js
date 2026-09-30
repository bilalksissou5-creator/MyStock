// ============================================
// صفحة الانضمام — بكود دعوة
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const codeInput = document.getElementById('invite-code');
  const fullNameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const joinBtn = document.getElementById('join-btn');
  const errBox = document.getElementById('join-error');
  const successBox = document.getElementById('join-success');

  // ✅ إذا كان الكود في الرابط (?code=123456) — نملؤه تلقائياً
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

  // فقط أرقام
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

    // التحقق
    if (code.length !== 6) {
      showError('الكود يجب أن يكون 6 أرقام');
      return;
    }
    if (!fullName) {
      showError('الاسم مطلوب');
      return;
    }
    if (!email || !email.includes('@')) {
      showError('بريد إلكتروني غير صالح');
      return;
    }
    if (password.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    joinBtn.disabled = true;
    joinBtn.querySelector('span').textContent = 'جارٍ إنشاء الحساب...';

    try {
      // 1. التحقق من صحة الكود
      const { data: invite, error: inviteError } = await db
        .from('worker_invites')
        .select('id, status, full_name')
        .eq('code', code)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (inviteError) throw new Error('فشل التحقق: ' + inviteError.message);

      if (!invite) {
        throw new Error('كود الدعوة غير صالح أو مستخدم مسبقاً');
      }

      // 2. إنشاء الحساب (Trigger handle_new_user سيتولى الباقي)
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

      if (authError) throw new Error('فشل إنشاء الحساب: ' + authError.message);

      // 3. نجاح
      showSuccess('✅ تم إنشاء حسابك! جارٍ التحويل...');

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);

    } catch (err) {
      showError(err.message);
      joinBtn.disabled = false;
      joinBtn.querySelector('span').textContent = 'إنشاء حسابي';
    }
  });

  // Enter = إرسال
  [codeInput, fullNameInput, emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinBtn.click();
    });
  });
});