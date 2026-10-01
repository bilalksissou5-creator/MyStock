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

  const currentRole = profile?.role;
  const isAdmin = currentRole === 'admin';
  const isAdminOrDeputy = currentRole === 'admin' || currentRole === 'deputy';

  // جلب أعضاء المنظمة
  let members = [];
  if (profile?.organization_id) {
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true });
    members = data ?? [];
  }

  // استبعاد المستخدم الحالي من كل الأقسام
  const others = members.filter(m => m.id !== user.id);
  const admin = others.find(m => m.role === 'admin');
  const deputies = others.filter(m => m.role === 'deputy');
  const workers = others.filter(m => m.role === 'worker');

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
          <span class="badge-role">${currentRole === 'admin' ? 'مدير' : currentRole === 'deputy' ? 'نائب' : 'عامل'}</span>
          <span class="badge-status">${profile?.status ?? 'offline'}</span>
        </div>
      </div>

      <!-- ══════ شريط الأزرار ══════ -->
      <div class="profile-actions-bar">
        ${isAdminOrDeputy ? `
          <a href="/add-worker.html" class="btn-secondary">
            <i class="fas fa-user-plus"></i>
            <span>إضافة عامل</span>
          </a>
        ` : ''}
        <button type="button" class="btn-primary" id="edit-profile-btn">
          <i class="fas fa-pen"></i>
          <span>تعديل الملف</span>
        </button>
      </div>

      <!-- ═══════════════════════════════════════
           قسم المدير (إذا لم يكن المستخدم مديراً)
           ═══════════════════════════════════════ -->
      ${admin ? `
        <div class="team-section">
          <h3 class="team-title">
            <i class="fas fa-crown" style="color:#fbbf24;"></i>
            المدير
          </h3>
          <div class="admin-card">
            <div class="admin-avatar">
              ${admin.avatar_url
                ? `<img src="${admin.avatar_url}" alt="${admin.full_name}">`
                : `<i class="fas fa-user"></i>`}
            </div>
            <div class="admin-info">
              <div class="admin-name">${admin.full_name ?? 'بدون اسم'}</div>
              <div class="admin-badges">
                <span class="badge-crown">👑 مدير</span>
                <span class="badge-status-inline ${admin.status === 'online' ? 'online' : 'offline'}">
                  ${admin.status === 'online' ? 'متصل' : 'غير متصل'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════
           قسم النواب
           ═══════════════════════════════════════ -->
      ${deputies.length > 0 ? `
        <div class="team-section">
          <h3 class="team-title">
            <i class="fas fa-star" style="color:#fbbf24;"></i>
            النواب (${deputies.length})
          </h3>

          <div class="team-grid">
            ${deputies.map(w => `
              <div class="member-card">
                <div class="member-star gold-star">⭐</div>
                <div class="member-avatar">
                  ${w.avatar_url
                    ? `<img src="${w.avatar_url}" alt="${w.full_name}">`
                    : `<i class="fas fa-user"></i>`}
                </div>
                <div class="member-name">${w.full_name ?? 'بدون اسم'}</div>
                <div class="member-role deputy">نائب</div>
                <div class="member-status ${w.status === 'online' ? 'online' : 'offline'}">
                  <span class="status-dot"></span>
                  ${w.status === 'online' ? 'متصل' : 'غير متصل'}
                </div>
                ${isAdmin ? `
                  <button type="button" class="member-action-btn remove-deputy-btn" data-id="${w.id}" title="إلغاء النيابة">
                    <i class="fas fa-xmark"></i>
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════
           قسم العمال
           ═══════════════════════════════════════ -->
      ${workers.length > 0 ? `
        <div class="team-section">
          <h3 class="team-title">
            <i class="fas fa-users" style="color:#171717;"></i>
            العمال (${workers.length})
          </h3>

          <div class="team-grid">
            ${workers.map(w => `
              <div class="member-card">
                <div class="member-star bronze-star">⭐</div>
                <div class="member-avatar">
                  ${w.avatar_url
                    ? `<img src="${w.avatar_url}" alt="${w.full_name}">`
                    : `<i class="fas fa-user"></i>`}
                </div>
                <div class="member-name">${w.full_name ?? 'بدون اسم'}</div>
                <div class="member-role worker">عامل</div>
                <div class="member-status ${w.status === 'online' ? 'online' : 'offline'}">
                  <span class="status-dot"></span>
                  ${w.status === 'online' ? 'متصل' : 'غير متصل'}
                </div>
                ${isAdmin ? `
                  <button type="button" class="member-action-btn make-deputy-btn" data-id="${w.id}" title="تعيين نائباً">
                    <i class="fas fa-crown"></i>
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

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
  // تعيين/إلغاء النيابة (المدير فقط)
  // ============================================
  document.querySelectorAll('.make-deputy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('تعيين هذا العامل نائباً؟')) return;
      const memberId = btn.dataset.id;

      const { error } = await db
        .from('profiles')
        .update({ role: 'deputy' })
        .eq('id', memberId);

      if (error) { alert('خطأ: ' + error.message); return; }
      window.location.reload();
    });
  });

  document.querySelectorAll('.remove-deputy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('إلغاء صفة النائب عن هذا العضو؟')) return;
      const memberId = btn.dataset.id;

      const { error } = await db
        .from('profiles')
        .update({ role: 'worker' })
        .eq('id', memberId);

      if (error) { alert('خطأ: ' + error.message); return; }
      window.location.reload();
    });
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