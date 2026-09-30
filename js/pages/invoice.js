// ============================================
// صفحة الفاتورة الواحدة
// الدور: عرض فاتورة واحدة + طباعة
// يجلب البيانات من invoices + products
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

  // 1. جلب الفاتورة + المورد + المنظمة في استعلام واحد
  const { data: invoice, error: invoiceError } = await db
    .from('invoices')
    .select(`
      *,
      suppliers (*),
      organizations (*),
      profiles:created_by (full_name)
    `)
    .eq('invoice_number', invoiceId.trim())
    .single();

  if (invoiceError || !invoice) {
    document.getElementById('invoice-content').innerHTML = `
      <div class="alert alert-error">الفاتورة غير موجودة</div>
    `;
    return;
  }

  // 2. جلب المنتجات المرتبطة بهذه الفاتورة
  const { data: products } = await db
    .from('products')
    .select('*')
    .eq('invoice_id', invoiceId.trim())
    .order('created_at', { ascending: true });

  // 3. عرض الفاتورة
  renderInvoice({
    invoice,
    products: products ?? [],
  });
});

// ============================================
// عرض الفاتورة
// ============================================
function renderInvoice({ invoice, products }) {
  const container = document.getElementById('invoice-content');

  const supplier = invoice.suppliers;
  const org = invoice.organizations;
  const createdBy = invoice.profiles;

  // ⚠️ الإجماليات من جدول invoices (الحقيقة المخزّنة)
  const totalQty = invoice.total_qty ?? 0;
  const totalValue = Number(invoice.total_value ?? 0);

  const date = new Date(invoice.created_at);
  const dateStr = date.toLocaleDateString('ar-MA');
  const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

  container.innerHTML = `
    <div class="invoice-header">
      <div class="invoice-logo">
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
          <th>SKU</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>المجموع</th>
        </tr>
      </thead>
      <tbody>
        ${products.length === 0 ? `
          <tr>
            <td colspan="6" style="text-align:center; color:#737373; padding:20px;">
              لا توجد منتجات في هذه الفاتورة
            </td>
          </tr>
        ` : products.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.name ?? '—'}</td>
            <td>${p.sku ?? '—'}</td>
            <td>${p.qty ?? 0}</td>
            <td>${Number(p.price ?? 0).toFixed(2)}</td>
            <td>${(Number(p.qty ?? 0) * Number(p.price ?? 0)).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>الإجمالي</strong></td>
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
      <a href="/products/list.html" class="btn-secondary">
        <i class="fas fa-home"></i>
        <span>الرئيسية</span>
      </a>
    </div>
  `;
}