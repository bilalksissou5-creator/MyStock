// ============================================
// صفحة الفاتورة الواحدة
// الدور: عرض فاتورة واحدة + طباعة + حذف
// ✅ يجلب العناصر من invoice_items (الكمية المُضافة)
// ✅ تقسيم تلقائي إلى صفحات A4 (13 صف لكل صفحة)
// ============================================

const ROWS_PER_PAGE = 13;

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

  // 5. جلب عناصر الفاتورة من invoice_items
  const { data: items } = await db
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: true });

  // 6. عرض الفاتورة (مقسّمة على صفحات)
  renderInvoice({
    invoice,
    supplier,
    org,
    createdBy,
    items: items ?? [],
    canDelete,
  });

  // 7. تفعيل زر الحذف
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
// تقسيم المنتجات إلى صفحات
// ============================================
function splitIntoPages(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    pages.push(items.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);
  return pages;
}

// ============================================
// بناء صفحة واحدة (بنفس التصميم)
// ============================================
function buildPage({ pageNumber, totalPages, pageItems, invoice, supplier, org, createdBy, globalRowStart }) {
  const date = new Date(invoice.created_at);
  const dateStr = date.toLocaleDateString('ar-MA');
  const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

  const logoShape = org?.logo_shape || 'circle';

  // مجموع هذه الصفحة
  const pageTotalQty = pageItems.reduce((s, it) => s + Number(it.qty ?? 0), 0);
  const pageTotalValue = pageItems.reduce((s, it) => s + Number(it.total ?? 0), 0);

  // المجموع الكلي (من الفاتورة)
  const grandTotalQty = invoice.total_qty ?? 0;
  const grandTotalValue = Number(invoice.total_value ?? 0);

  return `
    <div class="invoice-page">

      <!-- ══════ رأس الصفحة ══════ -->
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

      <!-- ══════ جدول المنتجات ══════ -->
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
          ${pageItems.length === 0 ? `
            <tr>
              <td colspan="5" style="text-align:center; color:#737373; padding:20px;">
                لا توجد عناصر
              </td>
            </tr>
          ` : pageItems.map((item, i) => `
            <tr>
              <td>${globalRowStart + i + 1}</td>
              <td>${item.product_name ?? '—'}</td>
              <td>${item.qty ?? 0}</td>
              <td>${Number(item.price ?? 0).toFixed(2)}</td>
              <td>${Number(item.total ?? 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2"><strong>مجموع الصفحة</strong></td>
            <td><strong>${pageTotalQty}</strong></td>
            <td>—</td>
            <td><strong>${pageTotalValue.toFixed(2)}</strong></td>
          </tr>
          ${totalPages > 1 ? `
            <tr class="grand-total-row">
              <td colspan="2"><strong>المجموع الكلي</strong></td>
              <td><strong>${grandTotalQty}</strong></td>
              <td>—</td>
              <td><strong>${grandTotalValue.toFixed(2)}</strong></td>
            </tr>
          ` : ''}
        </tfoot>
      </table>

      <!-- ══════ التوقيعات ══════ -->
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

      <!-- ══════ رقم الصفحة ══════ -->
      ${totalPages > 1 ? `
        <div class="page-number">الصفحة ${pageNumber} من ${totalPages}</div>
      ` : ''}

    </div>
  `;
}

// ============================================
// عرض الفاتورة (مقسّمة على صفحات)
// ============================================
function renderInvoice({ invoice, supplier, org, createdBy, items, canDelete }) {
  const container = document.getElementById('invoice-content');

  const pages = splitIntoPages(items);
  const totalPages = pages.length;

  let html = '';

  pages.forEach((pageItems, idx) => {
    html += buildPage({
      pageNumber: idx + 1,
      totalPages,
      pageItems,
      invoice,
      supplier,
      org,
      createdBy,
      globalRowStart: idx * ROWS_PER_PAGE,
    });
  });

  // ══════ الأزرار (مرة واحدة، في آخر الصفحة) ══════
  html += `
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

  container.innerHTML = html;
}

// ============================================
// حذف الفاتورة + منتجاتها
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
    // 1. حذف عناصر الفاتورة
    const { error: itemsErr } = await db
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoice.id);

    if (itemsErr) throw new Error('فشل حذف عناصر الفاتورة: ' + itemsErr.message);

    // 2. حذف المنتجات
    const { error: productsErr } = await db
      .from('products')
      .delete()
      .eq('invoice_id', invoice.invoice_number);

    if (productsErr) throw new Error('فشل حذف المنتجات: ' + productsErr.message);

    // 3. حذف الفاتورة
    const { error: invoiceErr } = await db
      .from('invoices')
      .delete()
      .eq('id', invoice.id);

    if (invoiceErr) throw new Error('فشل حذف الفاتورة: ' + invoiceErr.message);

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