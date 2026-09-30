// ============================================
// صفحة الملف الشخصي — تصميم Facebook
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // جلب أعضاء المنظمة
  let workers = [];
  if (profile?.organization_id) {
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    workers = data ?? [];
  }

  main.innerHTML = `
    <div class="profile-fb-wrapper">

      <!-- ══════ الغلاف ══════ -->
      <div class="profile-cover" id="cover-container">
        ${profile?.cover_url
          ? `<img src="${profile.cover_url}" alt="cover" id="cover-img">`
          : `<div class="cover-placeholder"></div>`}
        <button type="button" class="cover-edit-btn" id="cover-edit-btn" title="تعديل الغلاف">
          <i class="fas fa-camera"></i>
        </button>
        <input type="file" id="cover-input" accept="image/*" style="display:none;">
      </div>

      <!-- ══════ الصورة الشخصية ══════ -->
      <div class="profile-avatar-fb-wrap">
        <div class="profile-avatar-fb" id="avatar-container">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="avatar" id="avatar-img">`
            : `<i class="fas fa-user"></i>`}
        </div>
        <button type="button" class="avatar-edit-btn" id="avatar-edit-btn" title="تعديل الصورة">
          <i class="fas fa-camera"></i>
        </button>
        <input type="file" id="avatar-input" accept="image/*" style="display:none;">
      </div>

      <!-- ══════ معلومات المستخدم ══════ -->
      <div class="profile-fb-info">
        <h3 id="fb-name">${profile?.full_name ?? 'بدون اسم'}</h3>
        <p class="profile-fb-email" dir="ltr">${user.email}</p>
        <div class="profile-fb-badges">
          <span class="badge-role">${profile?.role === 'admin' ? 'مدير' : 'عامل'}</span>
          <span class="badge-status">${profile?.status ?? 'offline'}</span>
        </div>
      </div>

      <!-- ══════ شريط الأزرار ══════ -->
      <div class="profile-actions-bar">
        ${isAdmin ? `
          <button type="button" class="btn-secondary" id="add-worker-btn">
            <i class="fas fa-user-plus"></i>
            <span>إضافة عامل</span>
          </button>
        ` : ''}
        <button type="button" class="btn-primary" id="edit-profile-btn">
          <i class="fas fa-pen"></i>
          <span>تعديل الملف</span>
        </button>
      </div>

      <!-- ══════ بطاقات الأعضاء ══════ -->
      <div class="workers-section">
        <h3 class="workers-title">أعضاء المنظمة (${workers.length})</h3>

        <div class="workers-grid">
          ${workers.length === 0 ? `
            <div class="workers-empty">
              <i class="fas fa-users"></i>
              <p>لا يوجد عمال</p>
            </div>
          ` : workers.map(w => `
            <div class="worker-card">
              <div class="worker-avatar">
                ${w.avatar_url
                  ? `<img src="${w.avatar_url}" alt="${w.full_name}">`
                  : `<i class="fas fa-user"></i>`}
              </div>
              <div class="worker-name">${w.full_name ?? 'بدون اسم'}</div>
              <div class="worker-role">${w.role === 'admin' ? 'مدير' : 'عامل'}</div>
              <div class="worker-status ${w.status === 'online' ? 'online' : 'offline'}">
                <span class="status-dot"></span>
                ${w.status === 'online' ? 'متصل' : 'غير متصل'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ══════ تعديل البيانات ══════ -->
      <div class="settings-section">
        <h3>تعديل البيانات</h3>

        <div class="alert alert-success" id="save-success" style="display:none;"></div>
        <div class="alert alert-error" id="save-error" style="display:none;"></div>

        <div class="form-group">
          <label>الاسم الكامل</label>
          <input type="text" id="full_name" value="${profile?.full_name ?? ''}">
        </div>

        <div class="form-group">
          <label>رقم الهاتف</label>
          <input type="tel" id="phone" value="${profile?.phone ?? ''}" dir="ltr">
        </div>

        <button type="button" class="btn-primary" id="save-profile">
          <i class="fas fa-check"></i>
          <span>حفظ التعديلات</span>
        </button>
      </div>

    </div>

    <!-- ═══════════════════════════════════════
         Modal: إضافة عامل
         ═══════════════════════════════════════ -->
    <div class="modal-overlay" id="add-worker-modal" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <h3>إضافة عامل جديد</h3>
          <button type="button" class="modal-close" id="modal-close-btn">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="alert alert-error" id="modal-error" style="display:none;"></div>
          <div class="alert alert-success" id="modal-success" style="display:none;"></div>

          <div class="form-group">
            <label>البريد الإلكتروني للعامل *</label>
            <input type="email" id="worker-email" placeholder="email@example.com" dir="ltr">
          </div>

          <p style="font-size:13px; color:#737373; text-align:center; margin:12px 0 0;">
            سيصل بريد دعوة تلقائياً مع رابط التسجيل.
          </p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="modal-cancel-btn">إلغاء</button>
          <button type="button" class="btn-primary" id="modal-send-btn">
            <i class="fas fa-paper-plane"></i>
            <span>إرسال الدعوة</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const successBox = document.getElementById('save-success');
  const errBox = document.getElementById('save-error');

  function showError(msg) {
    if (successBox) { successBox.textContent = ''; successBox.style.display = 'none'; }
    if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; }
  }

  function showSuccess(msg) {
    if (errBox) { errBox.textContent = ''; errBox.style.display = 'none'; }
    if (successBox) {
      successBox.textContent = msg;
      successBox.style.display = 'block';
      setTimeout(() => { successBox.style.display = 'none'; }, 3000);
    }
  }

  // ============================================
  // رفع صورة
  // ============================================
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

  // ============================================
  // زر تعديل الغلاف
  // ============================================
  const coverInput = document.getElementById('cover-input');
  const coverContainer = document.getElementById('cover-container');
  const coverBtn = document.getElementById('cover-edit-btn');

  coverBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); coverInput.click(); });

  coverInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const previewUrl = URL.createObjectURL(file);
      let coverImg = document.getElementById('cover-img');
      if (coverImg) coverImg.src = previewUrl;
      else {
        coverContainer.querySelector('.cover-placeholder')?.remove();
        coverImg = document.createElement('img');
        coverImg.id = 'cover-img';
        coverImg.src = previewUrl;
        coverImg.alt = 'cover';
        coverContainer.insertBefore(coverImg, coverContainer.firstChild);
      }

      showSuccess('جارٍ رفع صورة الغلاف...');
      const publicUrl = await uploadImage(file, 'cover');

      const { error } = await db.from('profiles').update({ cover_url: publicUrl }).eq('id', user.id);
      if (error) throw new Error('فشل الحفظ: ' + error.message);

      if (profile) profile.cover_url = publicUrl;
      showSuccess('✅ تم تحديث صورة الغلاف');
    } catch (err) { showError(err.message); }
    finally { coverInput.value = ''; }
  });

  // ============================================
  // زر تعديل الصورة الشخصية
  // ============================================
  const avatarInput = document.getElementById('avatar-input');
  const avatarContainer = document.getElementById('avatar-container');
  const avatarBtn = document.getElementById('avatar-edit-btn');

  avatarBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); avatarInput.click(); });

  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const previewUrl = URL.createObjectURL(file);
      avatarContainer.innerHTML = `<img src="${previewUrl}" alt="avatar">`;

      showSuccess('جارٍ رفع الصورة الشخصية...');
      const publicUrl = await uploadImage(file, 'avatar');

      const { error } = await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (error) throw new Error('فشل الحفظ: ' + error.message);

      if (profile) profile.avatar_url = publicUrl;
      showSuccess('✅ تم تحديث الصورة الشخصية');
    } catch (err) { showError(err.message); }
    finally { avatarInput.value = ''; }
  });

  // ============================================
  // زر "تعديل الملف"
  // ============================================
  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    document.querySelector('.settings-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  // ============================================
  // Modal "إضافة عامل"
  // ============================================
  const addWorkerBtn = document.getElementById('add-worker-btn');
  const modal = document.getElementById('add-worker-modal');
  const modalError = document.getElementById('modal-error');
  const modalSuccess = document.getElementById('modal-success');

  function showModalError(msg) {
    modalError.textContent = msg;
    modalError.style.display = 'block';
    modalSuccess.style.display = 'none';
  }

  function showModalSuccess(msg) {
    modalSuccess.textContent = msg;
    modalSuccess.style.display = 'block';
    modalError.style.display = 'none';
  }

  if (addWorkerBtn) {
    addWorkerBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      document.getElementById('worker-email').value = '';
      modalError.style.display = 'none';
      modalSuccess.style.display = 'none';
    });
  }

  function closeModal() { modal.style.display = 'none'; }

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ============================================
  // إرسال الدعوة — Edge Function تُرسل البريد
  // ============================================
  document.getElementById('modal-send-btn')?.addEventListener('click', async () => {
    const sendBtn = document.getElementById('modal-send-btn');
    const email = document.getElementById('worker-email').value.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      showModalError('بريد إلكتروني غير صالح');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.querySelector('span').textContent = 'جارٍ الإرسال...';

    try {
      const { data: { session } } = await db.auth.getSession();

      const fnUrl = `${SUPABASE_URL}/functions/v1/send-invite`;
      const fnRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          email: email,
          orgId: profile.organization_id,
          invitedBy: user.id,
          appUrl: window.location.origin,
        }),
      });

      const result = await fnRes.json();

      if (!fnRes.ok || !result.ok) {
        throw new Error(result.error || 'فشل إرسال الدعوة');
      }

      showModalSuccess(`✅ تم إرسال الدعوة إلى ${email}`);

      setTimeout(() => {
        closeModal();
        window.location.reload();
      }, 2500);

    } catch (err) {
      showModalError(err.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.querySelector('span').textContent = 'إرسال الدعوة';
    }
  });

  // ============================================
  // حفظ البيانات النصية
  // ============================================
  document.getElementById('save-profile').addEventListener('click', async () => {
    const btn = document.getElementById('save-profile');

    if (successBox) successBox.style.display = 'none';
    if (errBox) errBox.style.display = 'none';

    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحفظ...';

    const newName = document.getElementById('full_name').value.trim() || null;
    const newPhone = document.getElementById('phone').value.trim() || null;

    const { error } = await db
      .from('profiles')
      .update({ full_name: newName, phone: newPhone })
      .eq('id', user.id);

    btn.disabled = false;
    btn.querySelector('span').textContent = 'حفظ التعديلات';

    if (error) {
      showError('خطأ: ' + error.message);
    } else {
      if (profile) { profile.full_name = newName; profile.phone = newPhone; }
      const nameEl = document.getElementById('fb-name');
      if (nameEl) nameEl.textContent = newName || 'بدون اسم';
      showSuccess('✅ تم حفظ التعديلات');
    }
  });
});