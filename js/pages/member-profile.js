// ============================================
// صفحة ملف عضو (بتنسيق profile.html)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('profile.html');

  const main = document.getElementById('main-content');

  // جلب بروفايل المستخدم الحالي
  const { data: myProfile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!myProfile) {
    main.innerHTML = `<div class="alert alert-error">خطأ في تحميل البيانات</div>`;
    return;
  }

  // قراءة id العضو
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id') || user.id;
  const isMe = memberId === user.id;
  const isAdmin = myProfile.role === 'admin';

  // جلب بيانات العضو
  const { data: member, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    main.innerHTML = `<div class="alert alert-error">لم يتم العثور على العضو</div>`;
    return;
  }

  // التحقق أن العضو في نفس المنظمة
  if (!isMe && member.organization_id !== myProfile.organization_id) {
    main.innerHTML = `<div class="alert alert-error">هذا العضو ليس في منظمتك</div>`;
    return;
  }

  // ═══════════════════════════════════════════
  // جلب السجل (Statistiques)
  // ═══════════════════════════════════════════
  const [productsRes, movementsRes, invoicesRes, suppliersRes] = await Promise.all([
    db.from('products').select('id', { count: 'exact', head: true }).eq('created_by', memberId),
    db.from('stock_movements').select('id', { count: 'exact', head: true }).eq('performed_by', memberId),
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('created_by', memberId),
    db.from('suppliers').select('id', { count: 'exact', head: true }).eq('created_by', memberId),
  ]);

  const stats = {
    products: productsRes.count ?? 0,
    movements: movementsRes.count ?? 0,
    invoices: invoicesRes.count ?? 0,
    suppliers: suppliersRes.count ?? 0,
  };

  // آخر حركة
  const { data: lastMovement } = await db
    .from('stock_movements')
    .select('created_at, type, quantity')
    .eq('performed_by', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // آخر دخول
  const { data: lastInvoice } = await db
    .from('invoices')
    .select('created_at')
    .eq('created_by', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isOnline = typeof isUserOnline === 'function' && isUserOnline(member);
  const roleLabel = member.role === 'admin' ? 'مدير' : member.role === 'deputy' ? 'نائب' : 'عامل';
  const starClass = member.role === 'deputy' ? 'deputy-star' : 'worker-star';

  // ═══════════════════════════════════════════
  // بناء الواجهة
  // ═══════════════════════════════════════════
  main.innerHTML = `
    <div class="profile-fb-wrapper">

      <!-- ══════ الغلاف ══════ -->
      <div class="profile-cover">
        ${member.cover_url
          ? `<img src="${member.cover_url}" alt="cover">`
          : `<div class="cover-placeholder"></div>`}
      </div>

      <!-- ══════ الصورة الشخصية ══════ -->
      <div class="profile-avatar-fb-wrap">
        <div class="profile-avatar-fb">
          ${member.avatar_url
            ? `<img src="${member.avatar_url}" alt="avatar">`
            : `<i class="fas fa-user"></i>`}
          <span class="mp-status-dot-large ${isOnline ? 'online' : 'offline'}"></span>
        </div>
      </div>

      <!-- ══════ معلومات العضو ══════ -->
      <div class="profile-fb-info">
        <h3>
          ${member.full_name ?? 'بدون اسم'}
          <i class="fas fa-star member-star-icon ${starClass}"></i>
        </h3>
        <p class="profile-fb-email">${isOnline ? '🟢 متصل الآن' : '⚪ غير متصل'}</p>
        <div class="profile-fb-badges">
          <span class="badge-role">${roleLabel}</span>
        </div>
      </div>

      <!-- ══════ شريط الأزرار (للمدير فقط) ══════ -->
      ${isAdmin && !isMe ? `
        <div class="profile-actions-bar">
          <a href="/profile-dashboard.html?id=${member.id}" class="btn-secondary">
            <i class="fas fa-sliders"></i>
            <span>لوحة المعلومات</span>
          </a>
          <a href="/member-manage.html?id=${member.id}" class="btn-primary">
            <i class="fas fa-ellipsis-vertical"></i>
            <span>إدارة</span>
          </a>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════
           السجل
           ═══════════════════════════════════════ -->
      <div class="team-section">
        <h3 class="team-title">
          <i class="fas fa-chart-simple"></i>
          السجل
        </h3>

        <div class="log-grid">
          <div class="log-card">
            <div class="log-icon">
              <i class="fas fa-box"></i>
            </div>
            <div class="log-value">${stats.products}</div>
            <div class="log-label">منتج</div>
          </div>

          <div class="log-card">
            <div class="log-icon">
              <i class="fas fa-right-left"></i>
            </div>
            <div class="log-value">${stats.movements}</div>
            <div class="log-label">حركة</div>
          </div>

          <div class="log-card">
            <div class="log-icon">
              <i class="fas fa-file-invoice"></i>
            </div>
            <div class="log-value">${stats.invoices}</div>
            <div class="log-label">فاتورة</div>
          </div>

          <div class="log-card">
            <div class="log-icon">
              <i class="fas fa-truck"></i>
            </div>
            <div class="log-value">${stats.suppliers}</div>
            <div class="log-label">مورد</div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════
           معلومات إضافية
           ═══════════════════════════════════════ -->
      <div class="team-section">
        <h3 class="team-title">
          <i class="fas fa-info-circle"></i>
          معلومات
        </h3>

        <div class="info-list">
          <div class="info-row">
            <i class="fas fa-phone"></i>
            <span class="info-label">رقم الهاتف</span>
            <span class="info-value" dir="ltr">${member.phone ?? 'غير متوفر'}</span>
          </div>

          <div class="info-row">
            <i class="fas fa-calendar"></i>
            <span class="info-label">عضو منذ</span>
            <span class="info-value">${new Date(member.created_at).toLocaleDateString('ar')}</span>
          </div>

          ${lastMovement ? `
            <div class="info-row">
              <i class="fas fa-clock"></i>
              <span class="info-label">آخر حركة</span>
              <span class="info-value">${new Date(lastMovement.created_at).toLocaleDateString('ar')}</span>
            </div>
          ` : ''}

          ${lastInvoice ? `
            <div class="info-row">
              <i class="fas fa-clock"></i>
              <span class="info-label">آخر فاتورة</span>
              <span class="info-value">${new Date(lastInvoice.created_at).toLocaleDateString('ar')}</span>
            </div>
          ` : ''}
        </div>
      </div>

    </div>
  `;
});