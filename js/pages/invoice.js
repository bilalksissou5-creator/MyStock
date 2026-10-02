// ============================================
// صفحة الفاتورة الواحدة
// الدور: عرض فاتورة واحدة + طباعة + حذف
// يجلب البيانات من invoices + products
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  // جلب بروفايل المستخدم (لصلاحيات الحذف)
  const { data: myProfile } = await db
    .from('profiles')
    .select('role, full_name, organization_id')
    .eq('id', user.id)
    .single();

  const canDelete = myProfile?.role === 'admin' || myProfile?.role === 'deputy';

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
    canDelete,
  });

  // 4. تفعيل زر الحذف بعد البناء
  if (canDelete) {
    const deleteBtn = document.getElementById('delete-invoice-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        handleDeleteInvoice(invoice);
      });
    }
  }
});

// ============================================
// عرض الفاتورة
// ============================================
function renderInvoice({ invoice, products, canDelete }) {
  const container = document.getElementById('invoice-content');

  const supplier = invoice.suppliers;
  const org = invoice.organizations;
  const createdBy = invoice.profiles;

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
      ${canDelete ? `
        <button class="btn-danger" id="delete-invoice-btn">
          <i class="fas fa-trash"></i>
          <span>حذف الفاتورة</span>
        </button>
      ` : ''}
    </div>
  `;
}

// ============================================
// ✅ حذف الفاتورة + منتجاتها
// ============================================
async function handleDeleteInvoice(invoice) {
  const confirmed = confirm(
    `هل أنت متأكد من حذف الفاتورة "${invoice.invoice_number}"؟\n\n` +
    `سيتم حذف الفاتورة وجميع المنتجات المرتبطة بها.\n` +
    `لا يمكن التراجع بسهولة.`
  );

  if (!confirmed) return;

  const btn = document.getElementById('delete-invoice-btn');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('span').textContent = 'جارٍ الحذف...';
  }

  try {
    // 1. حذف المنتجات المرتبطة
    const { error: productsError } = await db
      .from('products')
      .delete()
      .eq('invoice_id', invoice.invoice_number);

    if (productsError) throw new Error('فشل حذف المنتجات: ' + productsError.message);

    // 2. حذف الفاتورة
    const { error: invoiceError } = await db
      .from('invoices')
      .delete()
      .eq('id', invoice.id);

    if (invoiceError) throw new Error('فشل حذف الفاتورة: ' + invoiceError.message);

    // 3. النجاح → العودة للقائمة
    alert('✅ تم حذف الفاتورة بنجاح');
    window.location.href = '/invoices/list.html';

  } catch (err) {
    alert('خطأ: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'حذف الفاتورة';
    }
  }
}