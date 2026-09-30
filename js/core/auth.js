// ============================================
// المصادقة
// الدور: تسجيل الدخول / الخروج + حماية الصفحات
// ============================================

// ============================================
// تسجيل الدخول
// ============================================
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

// ============================================
// تسجيل الخروج
// ============================================
async function logout() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

// ============================================
// جلب المستخدم الحالي
// ============================================
async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data?.user ?? null;
}

// ============================================
// حماية الصفحة — يجب تسجيل الدخول
// ============================================
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}

// ============================================
// نموذج تسجيل الدخول (لصفحة login.html)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('login-error');

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الدخول...';
    errBox.style.display = 'none';

    const result = await login(email, password);

    if (!result.ok) {
      errBox.textContent = result.error;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'دخول';
    } else {
      window.location.href = '/dashboard.html';
    }
  });

  // زر تسجيل الخروج
  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', logout);
  });
});