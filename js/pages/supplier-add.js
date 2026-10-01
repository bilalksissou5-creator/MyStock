// ============================================
// صفحة إضافة مورد
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('suppliers/add.html');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>إضافة مورد</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <form id="supplier-form" class="add-form">
      <div class="form-group">
        <label>اسم المورد *</label>
        <input type="text" id="name" required>
      </div>

      <div class="form-group">
        <label>الإختصاص</label>
        <input type="text" id="specialty" placeholder="مثال: مواد غذائية، إلكترونيات، ملابس...">
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>رقم الهاتف</label>
          <input type="tel" id="phone" dir="ltr">
        </div>
        <div class="form-group">
          <label>البريد الإلكتروني</label>
          <input type="email" id="email" dir="ltr">
        </div>
      </div>

      <div class="form-group">
        <label>العنوان</label>
        <input type="text" id="address">
      </div>

      <div class="form-group">
        <label>ملاحظات</label>
        <textarea id="notes" rows="3" placeholder="أي ملاحظات إضافية..."></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" id="save-btn">
          <i class="fas fa-check"></i>
          <span>حفظ المورد</span>
        </button>
        <a href="list.html" class="btn-secondary">إلغاء</a>
      </div>
    </form>
  `;

  document.getElementById('supplier-form').addEventListener('submit', handleSubmit);
});

async function handleSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('save-btn');
  const errBox = document.getElementById('form-error');
  const successBox = document.getElementById('form-success');

  errBox.style.display = 'none';
  successBox.style.display = 'none';

  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    errBox.textContent = 'لا يمكن تحديد المنظمة';
    errBox.style.display = 'block';
    return;
  }

  const nameValue = document.getElementById('name').value.trim();
  if (!nameValue) {
    errBox.textContent = 'اسم المورد مطلوب';
    errBox.style.display = 'block';
    return;
  }

  const supplier = {
    organization_id: profile.organization_id,
    name: nameValue,
    specialty: document.getElementById('specialty').value.trim() || null,
    phone: document.getElementById('phone').value.trim() || null,
    email: document.getElementById('email').value.trim() || null,
    address: document.getElementById('address').value.trim() || null,
    notes: document.getElementById('notes').value.trim() || null,
    created_by: user.id,
  };

  btn.disabled = true;
  btn.querySelector('span').textContent = 'جارٍ الحفظ...';

  const { data: newSupplier, error } = await db
    .from('suppliers')
    .insert(supplier)
    .select()
    .single();

  if (error) {
    errBox.textContent = 'خطأ: ' + error.message;
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.querySelector('span').textContent = 'حفظ المورد';
    return;
  }

  if (typeof notifyOrganization === 'function') {
    await notifyOrganization({
      orgId: profile.organization_id,
      title: 'مورد جديد',
      message: `${profile.full_name || 'مستخدم'} أضاف المورد "${nameValue}"`,
      type: 'info',
      link: `/suppliers/detail.html?id=${newSupplier.id}`,
      userName: profile.full_name || null,
    });
  }

  successBox.textContent = '✅ تم إضافة المورد بنجاح!';
  successBox.style.display = 'block';

  setTimeout(() => {
    window.location.href = 'list.html';
  }, 1200);
}