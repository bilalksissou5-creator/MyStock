// ============================================
// صفحة إضافة مورد
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('suppliers/add.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('sup_add_title_full');

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('sup_add_title')}</h2>
      <a href="list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="alert alert-error" id="form-error" style="display:none;"></div>
    <div class="alert alert-success" id="form-success" style="display:none;"></div>

    <form id="supplier-form" class="add-form">
      <div class="form-group">
        <label>${tr('sup_name')}</label>
        <input type="text" id="name" required>
      </div>

      <div class="form-group">
        <label>${tr('sup_specialty')}</label>
        <input type="text" id="specialty" placeholder="${tr('sup_specialty_ph')}">
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>${tr('inv_page_supplier_phone').replace(':', '')}</label>
          <input type="tel" id="phone" dir="ltr">
        </div>
        <div class="form-group">
          <label>${tr('register_email').replace(' *', '')}</label>
          <input type="email" id="email" dir="ltr">
        </div>
      </div>

      <div class="form-group">
        <label>${tr('sup_address')}</label>
        <input type="text" id="address">
      </div>

      <div class="form-group">
        <label>${tr('sup_notes')}</label>
        <textarea id="notes" rows="3" placeholder="${tr('sup_notes_ph')}"></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" id="save-btn">
          <i class="fas fa-check"></i>
          <span>${tr('sup_save')}</span>
        </button>
        <a href="list.html" class="btn-secondary">${tr('prod_add_cancel')}</a>
      </div>
    </form>
  `;

  document.getElementById('supplier-form').addEventListener('submit', handleSubmit);
});

async function handleSubmit(e) {
  e.preventDefault();

  const tr = (key) => (window.t ? window.t(key) : key);

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
    errBox.textContent = tr('prod_add_err_org');
    errBox.style.display = 'block';
    return;
  }

  const nameValue = document.getElementById('name').value.trim();
  if (!nameValue) {
    errBox.textContent = tr('sup_err_name');
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
  btn.querySelector('span').textContent = tr('pe_saving');

  const { data: newSupplier, error } = await db
    .from('suppliers')
    .insert(supplier)
    .select()
    .single();

  if (error) {
    errBox.textContent = tr('prod_detail_err') + ' ' + error.message;
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.querySelector('span').textContent = tr('sup_save');
    return;
  }

  if (typeof notifyOrganization === 'function') {
    await notifyOrganization({
      orgId: profile.organization_id,
      title: tr('sup_notif_title'),
      message: `${profile.full_name || tr('prod_detail_user')} ${tr('sup_notif_msg')} "${nameValue}"`,
      type: 'info',
      link: `/suppliers/detail.html?id=${newSupplier.id}`,
      userName: profile.full_name || null,
    });
  }

  successBox.textContent = tr('sup_success');
  successBox.style.display = 'block';

  setTimeout(() => {
    window.location.href = 'list.html';
  }, 1200);
}