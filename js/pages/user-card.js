// ============================================
// بطاقة المستخدم (للقسم الأول في الـ Workspace)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('userId');

  if (!targetUserId) {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-error" style="margin:16px;">No User ID provided</div>`;
    return;
  }

  renderLayout('user-card.html');
  const tr = (key) => (window.t ? window.t(key) : key);

  const main = document.getElementById('main-content');

  // ✅ تعديل التنسيقات: إزالة الغلاف، وتوسيط الأفاتار
  const style = document.createElement('style');
  style.innerHTML = `
    .main { padding: 0 !important; }
    .profile-fb-wrapper { border-radius: 10px; margin-bottom: 0; box-shadow: none; border: none; padding-top: 16px; }
    
    /* ✅ إخفاء الغلاف تماماً */
    .profile-cover { display: none !important; }
    
    /* ✅ توسيط الصورة الشخصية وإعطائها مساحة من الأعلى */
    .profile-avatar-fb-wrap { 
      margin-top: 0 !important; 
      display: flex; 
      justify-content: center; 
      position: relative;
      padding-bottom: 8px;
    }
    
    .profile-avatar-fb { width: 80px !important; height: 80px !important; }
    .profile-fb-info { text-align: center; padding-top: 0 !important; }
    
    .records-row { margin: 0 16px 16px 16px !important; gap: 8px; }
    .record-item { padding: 8px !important; font-size: 12px !important; }
    .log-panel { margin: 0 16px 16px 16px !important; }
  `;
  document.head.appendChild(style);

  // جلب بيانات المستخدم
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', targetUserId).single();

  if (error || !profile) {
    main.innerHTML = `<div class="alert alert-error" style="margin:16px;">User not found</div>`;
    return;
  }

  const email = profile.email || '—';
  const roleLabel = profile.role === 'admin' ? tr('mp_role_admin') : profile.role === 'deputy' ? tr('wk_role_deputy') : tr('wk_role_worker');
  const isMeOnline = typeof isUserOnline === 'function' && isUserOnline(profile);

  main.innerHTML = `
    <div class="profile-fb-wrapper">
      <!-- ✅ تم حذف div الخاص بالغلاف من هنا -->

      <div class="profile-avatar-fb-wrap">
        <div class="profile-avatar-fb">
          ${profile.avatar_url ? `<img src="${profile.avatar_url}" alt="avatar">` : `<i class="fas fa-user"></i>`}
          <span class="profile-status-dot ${isMeOnline ? 'online' : 'offline'}" title="${isMeOnline ? tr('wk_online') : tr('wk_offline')}"></span>
        </div>
      </div>

      <div class="profile-fb-info">
        <h3>${profile.full_name ?? tr('products_no_name')}</h3>
        <p class="profile-fb-email" dir="ltr">${email}</p>
        <div class="profile-fb-badges">
          <span class="badge-role">${roleLabel}</span>
        </div>
      </div>

      <div class="records-row">
        <div class="records-left" style="width:100%; display:flex; gap:8px;">
          <a href="#" class="record-item" data-record="invoices" style="flex:1; justify-content:center;">
            <i class="fas fa-file-invoice"></i>
            <span>${tr('mp_invoices')}</span>
          </a>
          <a href="#" class="record-item" data-record="out" style="flex:1; justify-content:center;">
            <i class="fas fa-arrow-up-from-bracket"></i>
            <span>${tr('mp_out')}</span>
          </a>
        </div>
      </div>

      <div id="log-invoices" class="log-panel" style="display:none;"></div>
      <div id="log-out" class="log-panel" style="display:none;"></div>
    </div>
  `;

  const logInvoices = document.getElementById('log-invoices');
  const logOut = document.getElementById('log-out');
  const btnInvoices = document.querySelector('.record-item[data-record="invoices"]');
  const btnOut = document.querySelector('.record-item[data-record="out"]');

  const lang = window.getCurrentLang ? window.getCurrentLang() : 'ar';
  const localeMap = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  const locale = localeMap[lang] || 'en-US';

  async function loadInvoices() {
    logInvoices.innerHTML = `<div class="log-loading"><i class="fas fa-spinner fa-spin"></i></div>`;
    const { data } = await db.from('invoices').select('id, invoice_number, total_qty, total_value, created_at').eq('created_by', targetUserId).order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      logInvoices.innerHTML = `<div class="log-empty">${tr('inv_empty')}</div>`;
      return;
    }
    logInvoices.innerHTML = `
      <div class="log-list">
        ${data.map(inv => `
          <a href="/invoice.html?id=${encodeURIComponent(inv.invoice_number)}" class="log-row log-row-link">
            <div class="log-row-main"><strong>${inv.invoice_number}</strong><span>${inv.total_qty ?? 0} • ${Number(inv.total_value ?? 0).toFixed(2)}</span></div>
            <div class="log-row-date">${new Date(inv.created_at).toLocaleDateString(locale)}</div>
          </a>
        `).join('')}
      </div>
    `;
  }

  async function loadOut() {
    logOut.innerHTML = `<div class="log-loading"><i class="fas fa-spinner fa-spin"></i></div>`;
    const { data } = await db.from('receipts').select('id, receipt_number, total_qty, total_value, created_at, printed_at').eq('created_by', targetUserId).order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      logOut.innerHTML = `<div class="log-empty">${tr('mp_no_out')}</div>`;
      return;
    }
    const unprintedCount = data.filter(r => !r.printed_at).length;

    logOut.innerHTML = `
      ${unprintedCount > 0 ? `
        <a href="/receipts-print.html" class="print-all-btn"><i class="fas fa-print"></i><span>${tr('pf_print_all')} (${unprintedCount} ${tr('pf_new')})</span></a>
      ` : ''}
      <div class="log-list">
        ${data.map(r => `
          <a href="/receipt.html?id=${r.id}" class="log-row log-row-link">
            <div class="log-row-main"><strong>${r.receipt_number}</strong><span>${r.total_qty ?? 0} • ${Number(r.total_value ?? 0).toFixed(2)}</span></div>
            <div class="log-row-date">${new Date(r.created_at).toLocaleDateString(locale)}</div>
          </a>
        `).join('')}
      </div>
    `;
  }

  btnInvoices.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = logInvoices.style.display !== 'none';
    logInvoices.style.display = 'none'; logOut.style.display = 'none';
    btnInvoices.classList.remove('active'); btnOut.classList.remove('active');
    if (!isOpen) { logInvoices.style.display = 'block'; btnInvoices.classList.add('active'); loadInvoices(); }
  });

  btnOut.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = logOut.style.display !== 'none';
    logInvoices.style.display = 'none'; logOut.style.display = 'none';
    btnInvoices.classList.remove('active'); btnOut.classList.remove('active');
    if (!isOpen) { logOut.style.display = 'block'; btnOut.classList.add('active'); loadOut(); }
  });
});