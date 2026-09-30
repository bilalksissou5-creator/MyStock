// ============================================
// صفحة الفواتير
// الدور: إنشاء الفواتير تلقائياً من المنتجات غير المرتبطة
// ثم عرض كل الفواتير
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('invoices/list.html');

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h2>الفواتير</h2>
      <a href="/products/add.html" class="btn-primary">
        <i class="fas fa-plus"></i>
        <span>إضافة منتجات</span>
      </a>
    </div>

    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="search-invoices" placeholder="بحث برقم الفاتورة أو اسم المورد...">
    </div>

    <div id="invoices-list" class="invoices-list">
      <p style="text-align:center; color:#737373;">جارٍ التحميل...</p>
    </div>
  `;

  // 1. إنشاء الفواتير تلقائياً
  await autoGenerateInvoices();

  // 2. تحميل الفواتير
  await loadInvoices();

  // 3. البحث
  document.getElementById('search-invoices').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.invoice-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
});

// ============================================
// إنشاء الفواتير تلقائياً
// - يجلب المنتجات بـ invoice_id = null
// - يُجمّعها حسب supplier_id
// - يُنشئ فاتورة لكل مورد
// - يحسب الإجماليات من المنتجات الفعلية
// - يُحدّث products.invoice_id
// ============================================
async function autoGenerateInvoices() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) return;

  // 1. جلب المنتجات غير المرتبطة
  const { data: unlinkedProducts, error } = await db
    .from('products')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .is('invoice_id', null);

  if (error || !unlinkedProducts || unlinkedProducts.length === 0) {
    return; // لا منتجات غير مرتبطة ← لا شيء لإنشائه
  }

  // 2. تجميع حسب المورد
  const groups = {};
  for (const p of unlinkedProducts) {
    const key = p.supplier_id ?? 'no-supplier';
    if (!groups[key]) {
      groups[key] = {
        supplier_id: p.supplier_id,
        products: [],
      };
    }
    groups[key].products.push(p);
  }

  // 3. إنشاء فاتورة لكل مجموعة
  for (const key of Object.keys(groups)) {
    const group = groups[key];

    // حساب الإجماليات من المنتجات الفعلية
    let totalQty = 0;
    let totalValue = 0;
    for (const p of group.products) {
      totalQty += Number(p.qty ?? 0);
      totalValue += Number(p.qty ?? 0) * Number(p.price ?? 0);
    }

    const invoiceId = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // إنشاء الفاتورة
    const { error: invoiceError } = await db
      .from('invoices')
      .insert({
        invoice_number: invoiceId,
        organization_id: profile.organization_id,
        supplier_id: group.supplier_id,
        created_by: user.id,
        total_qty: totalQty,
        total_value: totalValue,
      });

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      continue;
    }

    // تحديث المنتجات بـ invoice_id
    const productIds = group.products.map(p => p.id);

    const { error: updateError } = await db
      .from('products')
      .update({ invoice_id: invoiceId })
      .in('id', productIds);

    if (updateError) {
      console.error('Products update error:', updateError);
      continue;
    }

    // إشعار
    if (typeof notifyOrganization === 'function') {
      const supplierName = group.supplier_id ? 'مورد' : 'بدون مورد';
      await notifyOrganization({
        orgId: profile.organization_id,
        title: 'إنشاء فاتورة',
        message: `${profile.full_name || 'مستخدم'} أنشأ فاتورة ${invoiceId} (${totalQty} قطعة - ${totalValue.toFixed(2)})`,
        type: 'info',
        link: `/invoice.html?id=${invoiceId}`,
        userName: profile.full_name || null,
      });
    }
  }
}

// ============================================
// تحميل وعرض الفواتير
// ============================================
async function loadInvoices() {
  const container = document.getElementById('invoices-list');

  const { data, error } = await db
    .from('invoices')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="alert alert-error">خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-invoice"></i>
        <p>لا توجد فواتير بعد</p>
        <p style="font-size:12px; margin-top:8px; color:#a3a3a3;">
          أضف منتجات ← ستُنتشأ الفواتير تلقائياً
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(inv => {
    const date = new Date(inv.created_at);
    const dateStr = date.toLocaleDateString('ar-MA');
    const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

    return `
      <a href="/invoice.html?id=${inv.invoice_number}" class="invoice-card">
        <div class="invoice-icon">
          <i class="fas fa-file-invoice"></i>
        </div>
        <div class="invoice-info">
          <strong>${inv.invoice_number}</strong>
          <span class="invoice-supplier">
            <i class="fas fa-truck"></i>
            ${inv.suppliers?.name ?? 'بدون مورد'}
          </span>
          <span class="invoice-date">
            <i class="fas fa-clock"></i>
            ${dateStr} • ${timeStr}
          </span>
        </div>
        <div class="invoice-stats">
          <div class="stat-mini">
            <span>المنتجات</span>
            <b>${inv.total_qty ?? 0}</b>
          </div>
          <div class="stat-mini highlight">
            <span>الإجمالي</span>
            <b>${(inv.total_value ?? 0).toFixed(2)}</b>
          </div>
        </div>
      </a>
    `;
  }).join('');
}