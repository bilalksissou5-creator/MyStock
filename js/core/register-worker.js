// ============================================
// صفحة تسجيل العامل (عبر دعوة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

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

  // قراءة التوكن من الرابط
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
    showError('رابط الدعوة غير صالح');
    return;
  }

  // جلب بيانات الدعوة
  const { data: invite, error: inviteErr } = await db
    .from('worker_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (inviteErr || !invite) {
    showError('الدعوة غير صالحة أو منتهية');
    return;
  }

  // التحقق من انتهاء الصلاحية
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    showError('انتهت صلاحية الدعوة');
    return;
  }

  // ملء البريد تلقائياً
  const emailInput = document.getElementById('email');
  emailInput.value = invite.email || '';

  // نموذج التسجيل
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
      showError('الاسم الكامل مطلوب');
      return;
    }

    if (!phone) {
      showError('رقم الهاتف مطلوب');
      return;
    }

    if (password !== passwordConfirm) {
      showError('كلمتا السر غير متطابقتين');
      return;
    }

    if (password.length < 6) {
      showError('كلمة السر يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ إنشاء الحساب...';

    try {
      const fullName = `${firstName} ${lastName}`;

      // 1. إنشاء المستخدم في Auth
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

      if (authError) throw new Error('فشل إنشاء الحساب: ' + authError.message);

      const userId = authData.user?.id;
      if (!userId) throw new Error('فشل إنشاء الحساب');

      // 2. تحديث البروفايل (للتأكد من الهاتف)
      await db
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', userId);

      // 3. تحديث حالة الدعوة
      await db
        .from('worker_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      // 4. نجاح
      successBox.textContent = '✅ تم إنشاء حسابك! جارٍ تحويلك...';
      successBox.style.display = 'block';

      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 2000);

    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.querySelector('span').textContent = 'إنشاء حسابي';
    }
  });
});