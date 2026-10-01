// ============================================
// صفحة تعديل الملف الشخصي
// تعمل مع ?section=cover | avatar | name | email-password | phone
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  // جلب البروفايل
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // قراءة القسم من الرابط
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section') || 'name';

  // ═══════════════════════════════════════════
  // بناء المحتوى حسب القسم
  // ═══════════════════════════════════════════
  main.innerHTML = `
    <div class="page-header">
      <h2>تعديل الملف</h2>
      <a href="/profile.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="edit-section-wrapper" id="edit-section-wrapper">
      <!-- يُبنى بواسطة JS -->
    </div>

    <div class="alert alert-error" id="edit-error" style="display:none;"></div>
    <div class="alert alert-success" id="edit-success" style="display:none;"></div>

    <div class="edit-footer" id="edit-footer" style="display:none;">
      <button type="button" class="btn-primary full-width" id="save-btn">
        <i class="fas fa-check"></i>
        <span>حفظ التعديلات</span>
      </button>
    </div>
  `;

  const wrapper = document.getElementById('edit-section-wrapper');
  const errBox = document.getElementById('edit-error');
  const successBox = document.getElementById('edit-success');
  const footer = document.getElementById('edit-footer');

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { successBox.style.display = 'none'; }, 3000);
  }

  // ═══════════════════════════════════════════
  // مساعد: رفع صورة إلى Storage
  // ═══════════════════════════════════════════
  async function uploadImage(file, type) {
    if (!file) throw new Error('لم يتم اختيار صورة');
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يتجاوز 5 ميغابايت');
    if (!file.type.startsWith('image/')) throw new Error('الملف ليس صورة');

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${user.id}/${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('profiles')
      .upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type });

    if (uploadError) throw new Error('فشل الرفع: ' + uploadError.message);

    const { data: urlData } = db.storage.from('profiles').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  // ═══════════════════════════════════════════
  // القسم: صورة الغلاف
  // ═══════════════════════════════════════════
  function renderCover() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-image"></i>
        </div>
        <h3>صورة الغلاف</h3>
        <p class="edit-hint">اختر صورة جديدة (الحد الأقصى 5 ميغا)</p>

        <div class="preview-cover" id="preview-cover">
          ${profile?.cover_url
            ? `<img src="${profile.cover_url}" alt="cover" id="preview-img">`
            : `<div class="cover-empty"><i class="fas fa-image"></i><span>لا يوجد غلاف</span></div>`}
        </div>

        <input type="file" id="file-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-btn">
          <i class="fas fa-camera"></i>
          <span>اختيار صورة</span>
        </button>
      </div>
    `;

    const fileInput = document.getElementById('file-input');
    const previewBox = document.getElementById('preview-cover');

    document.getElementById('choose-btn').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      previewBox.innerHTML = `<img src="${previewUrl}" alt="cover">`;
      footer.style.display = 'block';
    });

    footer.style.display = 'none';

    // زر الحفظ
    document.getElementById('save-btn').addEventListener('click', async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        showError('اختر صورة أولاً');
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الرفع...';

      try {
        const url = await uploadImage(file, 'cover');
        const { error } = await db.from('profiles').update({ cover_url: url }).eq('id', user.id);
        if (error) throw new Error(error.message);

        showSuccess('✅ تم تحديث صورة الغلاف');
        setTimeout(() => window.location.href = '/profile.html', 1500);
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'حفظ التعديلات';
      }
    });
  }

  // ═══════════════════════════════════════════
  // القسم: صورة المستخدم
  // ═══════════════════════════════════════════
  function renderAvatar() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-user-circle"></i>
        </div>
        <h3>صورة المستخدم</h3>
        <p class="edit-hint">اختر صورة جديدة (الحد الأقصى 5 ميغا)</p>

        <div class="preview-avatar" id="preview-avatar">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="avatar" id="preview-img">`
            : `<i class="fas fa-user"></i>`}
        </div>

        <input type="file" id="file-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-btn">
          <i class="fas fa-camera"></i>
          <span>اختيار صورة</span>
        </button>
      </div>
    `;

    const fileInput = document.getElementById('file-input');
    const previewBox = document.getElementById('preview-avatar');

    document.getElementById('choose-btn').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      previewBox.innerHTML = `<img src="${previewUrl}" alt="avatar">`;
      footer.style.display = 'block';
    });

    footer.style.display = 'none';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        showError('اختر صورة أولاً');
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الرفع...';

      try {
        const url = await uploadImage(file, 'avatar');
        const { error } = await db.from('profiles').update({ avatar_url: url }).eq('id', user.id);
        if (error) throw new Error(error.message);

        showSuccess('✅ تم تحديث الصورة الشخصية');
        setTimeout(() => window.location.href = '/profile.html', 1500);
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'حفظ التعديلات';
      }
    });
  }

  // ═══════════════════════════════════════════
  // القسم: الاسم
  // ═══════════════════════════════════════════
  function renderName() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-user-pen"></i>
        </div>
        <h3>الاسم الكامل</h3>
        <p class="edit-hint">سيظهر هذا الاسم لكل أعضاء الفريق</p>

        <div class="form-group">
          <label>الاسم</label>
          <input type="text" id="input-name" value="${profile?.full_name ?? ''}" placeholder="أدخل اسمك">
        </div>
      </div>
    `;

    footer.style.display = 'block';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const newName = document.getElementById('input-name').value.trim();

      if (!newName) {
        showError('الاسم لا يمكن أن يكون فارغاً');
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الحفظ...';

      const { error } = await db.from('profiles').update({ full_name: newName }).eq('id', user.id);

      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ التعديلات';

      if (error) {
        showError(error.message);
      } else {
        showSuccess('✅ تم تحديث الاسم');
        setTimeout(() => window.location.href = '/profile.html', 1500);
      }
    });
  }

  // ═══════════════════════════════════════════
  // القسم: البريد وكلمة المرور
  // ═══════════════════════════════════════════
  function renderEmailPassword() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-envelope"></i>
        </div>
        <h3>البريد الإلكتروني</h3>
        <p class="edit-hint">لا يمكن تغيير البريد حالياً</p>

        <div class="form-group">
          <label>البريد الإلكتروني</label>
          <input type="email" value="${user.email}" dir="ltr" disabled>
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-lock"></i>
        </div>
        <h3>كلمة المرور</h3>
        <p class="edit-hint">أدخل كلمة المرور الجديدة (6 أحرف على الأقل)</p>

        <div class="form-group">
          <label>كلمة المرور الجديدة</label>
          <input type="password" id="input-password" dir="ltr" placeholder="••••••">
        </div>

        <div class="form-group">
          <label>تأكيد كلمة المرور</label>
          <input type="password" id="input-password-confirm" dir="ltr" placeholder="••••••">
        </div>
      </div>
    `;

    footer.style.display = 'block';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const pass = document.getElementById('input-password').value;
      const passConf = document.getElementById('input-password-confirm').value;

      if (!pass || pass.length < 6) {
        showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }

      if (pass !== passConf) {
        showError('كلمتا المرور غير متطابقتين');
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الحفظ...';

      const { error } = await db.auth.updateUser({ password: pass });

      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ التعديلات';

      if (error) {
        showError(error.message);
      } else {
        showSuccess('✅ تم تغيير كلمة المرور');
        document.getElementById('input-password').value = '';
        document.getElementById('input-password-confirm').value = '';
      }
    });
  }

  // ═══════════════════════════════════════════
  // القسم: رقم الهاتف
  // ═══════════════════════════════════════════
  function renderPhone() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-phone"></i>
        </div>
        <h3>رقم الهاتف</h3>
        <p class="edit-hint">أدخل رقم هاتفك بصيغة دولية</p>

        <div class="form-group">
          <label>رقم الهاتف</label>
          <input type="tel" id="input-phone" value="${profile?.phone ?? ''}" dir="ltr" placeholder="+212 6XX XXX XXX">
        </div>
      </div>
    `;

    footer.style.display = 'block';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const newPhone = document.getElementById('input-phone').value.trim();

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'جارٍ الحفظ...';

      const { error } = await db.from('profiles').update({ phone: newPhone || null }).eq('id', user.id);

      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ التعديلات';

      if (error) {
        showError(error.message);
      } else {
        showSuccess('✅ تم تحديث رقم الهاتف');
        setTimeout(() => window.location.href = '/profile.html', 1500);
      }
    });
  }

  // ═══════════════════════════════════════════
  // التوجيه حسب القسم
  // ═══════════════════════════════════════════
  switch (section) {
    case 'cover':          renderCover(); break;
    case 'avatar':         renderAvatar(); break;
    case 'name':           renderName(); break;
    case 'email-password': renderEmailPassword(); break;
    case 'phone':          renderPhone(); break;
    default:
      wrapper.innerHTML = `<div class="alert alert-error">قسم غير معروف: ${section}</div>`;
  }
});