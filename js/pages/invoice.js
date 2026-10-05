// ============================================
// صفحة الفاتورة الواحدة
// الدور: عرض فاتورة واحدة + طباعة
// ✅ يجلب العناصر من invoice_items (الكمية المُضافة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('id');

  if (!invoiceId) {
    document.getElementById('invoice-content').innerHTML = `
      <div class="alert alert-error">لم يتم تحديد الفاتورة</div>
    `;
    return;
  }

  // 1. جلب الفاتورة
  const { data: invoice, error: invoiceError } = await db
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceId.trim())
    .single();

  if (invoiceError || !invoice) {
    document.getElementById('invoice-content').innerHTML = `
      <div class="alert alert-error">الفاتورة غير موجودة</div>
    `;
    return;
  }

  // 2. جلب المورد
  let supplier = null;
  if (invoice.supplier_id) {
    const { data: sup } = await db
      .from('suppliers')
      .select('*')
      .eq('id', invoice.supplier_id)
      .single();
    supplier = sup;
  }

  // 3. جلب المنظمة
  let org = null;
  if (invoice.organization_id) {
    const { data: o } = await db
      .from('organizations')
      .select('name, logo_url, logo_shape')
      .eq('id', invoice.organization_id)
      .single();
    org = o;
  }

  // 4. جلب الموظف المسؤول
  let createdBy = null;
  if (invoice.created_by) {
    const { data: prof } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', invoice.created_by)
      .single();
    createdBy = prof;
  }

  // 5. ✅ جلب عناصر الفاتورة من invoice_items
  const { data: items } = await db
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: true });

  // 6. عرض الفاتورة
  renderInvoice({
    invoice,
    supplier,
    org,
    createdBy,
    items: items ?? [],
  });
});

// ============================================
// عرض الفاتورة
// ============================================
function renderInvoice({ invoice, supplier, org, createdBy, items }) {
  const container = document.getElementById('invoice-content');

  const totalQty = invoice.total_qty ?? 0;
  const totalValue = Number(invoice.total_value ?? 0);

  const date = new Date(invoice.created_at);
  const dateStr = date.toLocaleDateString('ar-MA');
  const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

  const logoShape = org?.logo_shape || 'circle';

  container.innerHTML = `
    <div class="invoice-header">
      <div class="invoice-logo shape-${logoShape}">
        ${org?.logo_url
          ? `<img src="${org.logo_url}" alt="logo">`
          : `<div class="logo-placeholder"><i class="fas fa-boxes-stacked"></i></div>`}
      </div>
      <div class="invoice-org">
        <h1>${org?.name ?? 'MyStock'}</h1>
      </div>
    </div>

    <div class="invoice-info-row">
      <div class="info-box">
        <h3>بيانات الفاتورة</h3>
        <div class="info-row">
          <strong>رقم الفاتورة:</strong>
          <span>${invoice.invoice_number}</span>
        </div>
        <div class="info-row">
          <strong>التاريخ:</strong>
          <span>${dateStr}</span>
        </div>
        <div class="info-row">
          <strong>الوقت:</strong>
          <span>${timeStr}</span>
        </div>
      </div>

      <div class="info-box">
        <h3>بيانات المورد</h3>
        <div class="info-row">
          <strong>الاسم:</strong>
          <span>${supplier?.name ?? '—'}</span>
        </div>
        <div class="info-row">
          <strong>الهاتف:</strong>
          <span dir="ltr">${supplier?.phone ?? '—'}</span>
        </div>
        <div class="info-row">
          <strong>الإختصاص:</strong>
          <span>${supplier?.specialty ?? '—'}</span>
        </div>
      </div>
    </div>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>المجموع</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? `
          <tr>
            <td colspan="5" style="text-align:center; color:#737373; padding:20px;">
              لا توجد عناصر في هذه الفاتورة
            </td>
          </tr>
        ` : items.map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.product_name ?? '—'}</td>
            <td>${item.qty ?? 0}</td>
            <td>${Number(item.price ?? 0).toFixed(2)}</td>
            <td>${Number(item.total ?? 0).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2"><strong>الإجمالي</strong></td>
          <td><strong>${totalQty}</strong></td>
          <td>—</td>
          <td><strong>${totalValue.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="invoice-footer">
      <div class="footer-signature">
        <p><strong>الموظف المسؤول:</strong></p>
        <p>${createdBy?.full_name ?? '—'}</p>
        <div class="signature-line"></div>
      </div>
      <div class="footer-signature">
        <p><strong>توقيع المورد:</strong></p>
        <p class="supplier-name">${supplier?.name ?? '—'}</p>
        <div class="signature-line"></div>
      </div>
    </div>

    <div class="invoice-actions no-print">
      <button class="btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i>
        <span>طباعة</span>
      </button>
      <a href="/invoices/list.html" class="btn-secondary">
        <i class="fas fa-file-invoice"></i>
        <span>الفواتير</span>
      </a>
    </div>
  `;
}