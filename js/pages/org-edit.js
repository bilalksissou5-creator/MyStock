// ============================================
// صفحة تعديل المنظمة (للمدير فقط)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  // جلب بروفايل المستخدم
  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // فقط المدير
  if (myProfile?.role !== 'admin') {
    main.innerHTML = `<div class="alert alert-error">ليس لديك صلاحية تعديل المنظمة</div>`;
    return;
  }

  // جلب بيانات المنظمة
  const { data: org, error } = await db
    .from('organizations')
    .select('*')
    .eq('id', myProfile.organization_id)
    .single();

  if (error || !org) {
    main.innerHTML = `<div class="alert alert-error">لم يتم العثور على المنظمة</div>`;
    return;
  }

  // الحالة الحالية
  let currentShape = org.logo_shape || 'circle';
  let showOrgName = org.show_org_name !== false; // default: true
  let pendingLogoFile = null;

  main.innerHTML = `
    <div class="page-header">
      <h2>تعديل المنظمة</h2>
      <a href="/profile-dashboard.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="alert alert-error" id="org-error" style="display:none;"></div>
    <div class="alert alert-success" id="org-success" style="display:none;"></div>

    <div class="org-edit-wrapper">

      <!-- ══════ الشعار ══════ -->
      <div class="org-section">
        <h3>شعار المنظمة</h3>
        <p class="org-hint">اختر شكل الشعار ثم ارفع صورة</p>

        <!-- اختيار الشكل -->
        <div class="shape-picker">
          <button type="button" class="shape-option" data-shape="circle">
            <div class="shape-preview shape-circle"></div>
            <span>دائري</span>
          </button>
          <button type="button" class="shape-option" data-shape="square">
            <div class="shape-preview shape-square"></div>
            <span>مربع</span>
          </button>
          <button type="button" class="shape-option" data-shape="rectangle">
            <div class="shape-preview shape-rectangle"></div>
            <span>مستطيل</span>
          </button>
        </div>

        <!-- معاينة الشعار -->
        <div class="org-logo-preview" id="org-logo-preview">
          ${org.logo_url
            ? `<img src="${org.logo_url}" alt="logo" id="logo-img">`
            : `<i class="fas fa-building" id="logo-placeholder"></i>`}
        </div>

        <input type="file" id="logo-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-logo-btn">
          <i class="fas fa-camera"></i>
          <span>اختيار صورة</span>
        </button>
      </div>

      <!-- ══════ اسم المنظمة ══════ -->
      <div class="org-section">
        <h3>اسم المنظمة</h3>
        <div class="form-group">
          <label>الاسم</label>
          <input type="text" id="org-name" value="${org.name ?? ''}" placeholder="اسم المنظمة">
        </div>
      </div>

      <!-- ══════ إعدادات الإيصال ══════ -->
      <div class="org-section">
        <h3>إعدادات الإيصال</h3>

        <div class="setting-toggle-item">
          <div class="setting-toggle-info">
            <strong>إظهار اسم المنظمة في الإيصال</strong>
            <span>سيظهر اسم المنظمة في الفواتير والإيصالات المطبوعة</span>
          </div>
          <button type="button"
                  class="setting-toggle ${showOrgName ? 'active' : ''}"
                  id="show-org-name-toggle">
            <span>${showOrgName ? 'مفعّل' : 'معطّل'}</span>
          </button>
        </div>
      </div>

    </div>

    <!-- ══════ زر الحفظ ══════ -->
    <div class="org-save-bar">
      <button type="button" class="btn-primary full-width" id="save-btn">
        <i class="fas fa-check"></i>
        <span>حفظ التعديلات</span>
      </button>
    </div>
  `;

  const errBox = document.getElementById('org-error');
  const successBox = document.getElementById('org-success');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('org-logo-preview');
  const nameInput = document.getElementById('org-name');
  const showOrgNameToggle = document.getElementById('show-org-name-toggle');

  function showError(msg) {
    successBox.style.display = 'none';
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }

  function showSuccess(msg) {
    errBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
    setTimeout(() => { successBox.style.display = 'none'; }, 3000);
  }

  // ═══════════════════════════════════════════
  // تطبيق الشكل على المعاينة
  // ═══════════════════════════════════════════
  function applyShape(shape) {
    logoPreview.classList.remove('shape-circle', 'shape-square', 'shape-rectangle');
    logoPreview.classList.add('shape-' + shape);
  }

  applyShape(currentShape);

  // تفعيل الشكل النشط
  document.querySelectorAll('.shape-option').forEach(btn => {
    if (btn.dataset.shape === currentShape) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentShape = btn.dataset.shape;
      document.querySelectorAll('.shape-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyShape(currentShape);
    });
  });

  // ═══════════════════════════════════════════
  // toggle إظهار اسم المنظمة
  // ═══════════════════════════════════════════
  showOrgNameToggle.addEventListener('click', () => {
    showOrgName = !showOrgName;
    showOrgNameToggle.classList.toggle('active', showOrgName);
    showOrgNameToggle.querySelector('span').textContent = showOrgName ? 'مفعّل' : 'معطّل';
  });

  // ═══════════════════════════════════════════
  // اختيار صورة الشعار
  // ═══════════════════════════════════════════
  document.getElementById('choose-logo-btn').addEventListener('click', () => {
    logoInput.click();
  });

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم الصورة يتجاوز 5 ميغابايت');
      logoInput.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showError('الملف ليس صورة');
      logoInput.value = '';
      return;
    }

    pendingLogoFile = file;
    const previewUrl = URL.createObjectURL(file);
    logoPreview.innerHTML = `<img src="${previewUrl}" alt="logo">`;
  });

  // ═══════════════════════════════════════════
  // رفع الصورة إلى Storage
  // ═══════════════════════════════════════════
  async function uploadLogo(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${org.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('organizations')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw new Error('فشل الرفع: ' + uploadError.message);

    const { data: urlData } = db.storage.from('organizations').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  // ═══════════════════════════════════════════
  // الحفظ
  // ═══════════════════════════════════════════
  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    const newName = nameInput.value.trim();

    if (!newName) {
      showError('اسم المنظمة مطلوب');
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';

    try {
      let logoUrl = org.logo_url;

      // رفع الشعار إن وُجد ملف جديد
      if (pendingLogoFile) {
        logoUrl = await uploadLogo(pendingLogoFile);
      }

      const updates = {
        name: newName,
        logo_url: logoUrl,
        logo_shape: currentShape,
        show_org_name: showOrgName,
      };

      const { error: updateError } = await db
        .from('organizations')
        .update(updates)
        .eq('id', org.id);

      if (updateError) throw new Error(updateError.message);

      showSuccess('✅ تم حفظ التعديلات بنجاح');
      pendingLogoFile = null;

      setTimeout(() => {
        window.location.href = '/profile-dashboard.html';
      }, 1500);

    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.querySelector('span').textContent = 'حفظ التعديلات';
    }
  });
});