// ============================================
// صفحة تعديل الملف الشخصي
// تعمل مع ?section=cover | avatar | name | email-password | phone
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('pe_title_full');

  const main = document.getElementById('main-content');

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const params = new URLSearchParams(window.location.search);
  const section = params.get('section') || 'name';

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('pe_title')}</h2>
      <a href="/profile.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="edit-section-wrapper" id="edit-section-wrapper">
    </div>

    <div class="alert alert-error" id="edit-error" style="display:none;"></div>
    <div class="alert alert-success" id="edit-success" style="display:none;"></div>

    <div class="edit-footer" id="edit-footer" style="display:none;">
      <button type="button" class="btn-primary full-width" id="save-btn">
        <i class="fas fa-check"></i>
        <span>${tr('pe_save')}</span>
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

  async function uploadImage(file, type) {
    if (!file) throw new Error(tr('pe_err_no_image'));
    if (file.size > 5 * 1024 * 1024) throw new Error(tr('pe_err_size'));
    if (!file.type.startsWith('image/')) throw new Error(tr('pe_err_not_image'));

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${user.id}/${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('profiles')
      .upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type });

    if (uploadError) throw new Error(tr('pe_err_upload') + ' ' + uploadError.message);

    const { data: urlData } = db.storage.from('profiles').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  function renderCover() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-image"></i>
        </div>
        <h3>${tr('pd_cover')}</h3>
        <p class="edit-hint">${tr('pe_hint_cover')}</p>

        <div class="preview-cover" id="preview-cover">
          ${profile?.cover_url
            ? `<img src="${profile.cover_url}" alt="cover" id="preview-img">`
            : `<div class="cover-empty"><i class="fas fa-image"></i><span>${tr('pe_no_cover')}</span></div>`}
        </div>

        <input type="file" id="file-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-btn">
          <i class="fas fa-camera"></i>
          <span>${tr('pe_choose_image')}</span>
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

    document.getElementById('save-btn').addEventListener('click', async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        showError(tr('pe_err_choose'));
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_uploading');

      try {
        const url = await uploadImage(file, 'cover');
        const { error } = await db.from('profiles').update({ cover_url: url }).eq('id', user.id);
        if (error) throw new Error(error.message);

        showSuccess(tr('pe_success_cover'));
        setTimeout(() => window.location.href = '/profile.html', 1500);
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = tr('pe_save');
      }
    });
  }

  function renderAvatar() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-user-circle"></i>
        </div>
        <h3>${tr('pd_avatar')}</h3>
        <p class="edit-hint">${tr('pe_hint_avatar')}</p>

        <div class="preview-avatar" id="preview-avatar">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="avatar" id="preview-img">`
            : `<i class="fas fa-user"></i>`}
        </div>

        <input type="file" id="file-input" accept="image/*" style="display:none;">

        <button type="button" class="btn-secondary full-width" id="choose-btn">
          <i class="fas fa-camera"></i>
          <span>${tr('pe_choose_image')}</span>
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
        showError(tr('pe_err_choose'));
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_uploading');

      try {
        const url = await uploadImage(file, 'avatar');
        const { error } = await db.from('profiles').update({ avatar_url: url }).eq('id', user.id);
        if (error) throw new Error(error.message);

        showSuccess(tr('pe_success_avatar'));
        setTimeout(() => window.location.href = '/profile.html', 1500);
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = tr('pe_save');
      }
    });
  }

  function renderName() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-user-pen"></i>
        </div>
        <h3>${tr('pe_full_name')}</h3>
        <p class="edit-hint">${tr('pe_hint_name')}</p>

        <div class="form-group">
          <label>${tr('pd_name')}</label>
          <input type="text" id="input-name" value="${profile?.full_name ?? ''}" placeholder="${tr('pe_name_ph')}">
        </div>
      </div>
    `;

    footer.style.display = 'block';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const newName = document.getElementById('input-name').value.trim();

      if (!newName) {
        showError(tr('pe_err_name'));
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db.from('profiles').update({ full_name: newName }).eq('id', user.id);

      btn.disabled = false;
      btn.querySelector('span').textContent = tr('pe_save');

      if (error) {
        showError(error.message);
      } else {
        showSuccess(tr('pe_success_name'));
        setTimeout(() => window.location.href = '/profile.html', 1500);
      }
    });
  }

  function renderEmailPassword() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-envelope"></i>
        </div>
        <h3>${tr('register_email').replace(' *', '')}</h3>
        <p class="edit-hint">${tr('pe_hint_email')}</p>

        <div class="form-group">
          <label>${tr('register_email').replace(' *', '')}</label>
          <input type="email" value="${user.email}" dir="ltr" disabled>
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-lock"></i>
        </div>
        <h3>${tr('login_password')}</h3>
        <p class="edit-hint">${tr('pe_hint_password')}</p>

        <div class="form-group">
          <label>${tr('pe_new_password')}</label>
          <input type="password" id="input-password" dir="ltr" placeholder="••••••">
        </div>

        <div class="form-group">
          <label>${tr('pe_confirm_password')}</label>
          <input type="password" id="input-password-confirm" dir="ltr" placeholder="••••••">
        </div>
      </div>
    `;

    footer.style.display = 'block';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const pass = document.getElementById('input-password').value;
      const passConf = document.getElementById('input-password-confirm').value;

      if (!pass || pass.length < 6) {
        showError(tr('rw_err_pwd_short'));
        return;
      }

      if (pass !== passConf) {
        showError(tr('pe_err_pwd_match'));
        return;
      }

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db.auth.updateUser({ password: pass });

      btn.disabled = false;
      btn.querySelector('span').textContent = tr('pe_save');

      if (error) {
        showError(error.message);
      } else {
        showSuccess(tr('pe_success_password'));
        document.getElementById('input-password').value = '';
        document.getElementById('input-password-confirm').value = '';
      }
    });
  }

  function renderPhone() {
    wrapper.innerHTML = `
      <div class="edit-section">
        <div class="edit-section-icon">
          <i class="fas fa-phone"></i>
        </div>
        <h3>${tr('pd_phone')}</h3>
        <p class="edit-hint">${tr('pe_hint_phone')}</p>

        <div class="form-group">
          <label>${tr('pd_phone')}</label>
          <input type="tel" id="input-phone" value="${profile?.phone ?? ''}" dir="ltr" placeholder="+212 6XX XXX XXX">
        </div>
      </div>
    `;

    footer.style.display = 'block';

    document.getElementById('save-btn').addEventListener('click', async () => {
      const newPhone = document.getElementById('input-phone').value.trim();

      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = tr('pe_saving');

      const { error } = await db.from('profiles').update({ phone: newPhone || null }).eq('id', user.id);

      btn.disabled = false;
      btn.querySelector('span').textContent = tr('pe_save');

      if (error) {
        showError(error.message);
      } else {
        showSuccess(tr('pe_success_phone'));
        setTimeout(() => window.location.href = '/profile.html', 1500);
      }
    });
  }

  switch (section) {
    case 'cover':          renderCover(); break;
    case 'avatar':         renderAvatar(); break;
    case 'name':           renderName(); break;
    case 'email-password': renderEmailPassword(); break;
    case 'phone':          renderPhone(); break;
    default:
      wrapper.innerHTML = `<div class="alert alert-error">${tr('pe_unknown_section')} ${section}</div>`;
  }
});