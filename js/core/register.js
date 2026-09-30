// ============================================
// صفحة إنشاء حساب جديد
// ============================================
document.addEventListener('DOMContentLoaded', () => {

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

  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('register-btn');
    const errBox = document.getElementById('reg-error');
    const successBox = document.getElementById('reg-success');

    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const orgName = document.getElementById('org_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password_confirm').value;

    if (password !== passwordConfirm) {
      errBox.textContent = 'كلمتا السر غير متطابقتين';
      errBox.style.display = 'block';
      return;
    }

    if (password.length < 6) {
      errBox.textContent = 'كلمة السر يجب أن تكون 6 أحرف على الأقل';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ إنشاء الحساب...';

    // 1. إنشاء المستخدم
    const { data: authData, error: authError } = await db.auth.signUp({
      email,
      password,
    });

    if (authError) {
      errBox.textContent = 'خطأ: ' + authError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      errBox.textContent = 'فشل إنشاء الحساب';
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
    }

    // 2. إنشاء المنظمة
    const { data: orgData, error: orgError } = await db
      .from('organizations')
      .insert({
        name: orgName,
        owner_id: userId,
      })
      .select()
      .single();

    if (orgError) {
      errBox.textContent = 'خطأ في إنشاء المنظمة: ' + orgError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
    }

    // 3. تحديث الملف الشخصي
    const { error: profileError } = await db
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`,
        organization_id: orgData.id,
        role: 'admin',
      })
      .eq('id', userId);

    if (profileError) {
      errBox.textContent = 'خطأ في تحديث الملف: ' + profileError.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'تسجيل';
      return;
    }

    successBox.textContent = '✅ تم إنشاء الحساب بنجاح! جارٍ تحويلك...';
    successBox.style.display = 'block';

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);
  });
});