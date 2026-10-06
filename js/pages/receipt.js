// ============================================
// صفحة الإيصال (نمط سوبر ماركت)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const receiptId = params.get('id');

  if (!receiptId) {
    document.getElementById('receipt-content').innerHTML = `
      <div class="alert alert-error">لم يتم تحديد الإيصال</div>
    `;
    return;
  }

  // 1. جلب الإيصال
  const { data: receipt, error } = await db
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    document.getElementById('receipt-content').innerHTML = `
      <div class="alert alert-error">الإيصال غير موجود</div>
    `;
    return;
  }

  // 2. جلب المنظمة
  const { data: org } = await db
    .from('organizations')
    .select('name, logo_url, logo_shape')
    .eq('id', receipt.organization_id)
    .single();

  // 3. جلب عناصر الإيصال
  const { data: items } = await db
    .from('receipt_items')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: true });

  // 4. ربط
  receipt.organizations = org;

  // 5. عرض
  renderReceipt({
    receipt,
    items: items ?? [],
  });
});

// ============================================
// عرض الإيصال
// ============================================
function renderReceipt({ receipt, items }) {
  const container = document.getElementById('receipt-content');

  const org = receipt.organizations;

  const totalValue = Number(receipt.total_value ?? 0);

  const date = new Date(receipt.created_at);
  const dateStr = date.toLocaleDateString('ar-MA');
  const timeStr = date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });

  const logoShape = org?.logo_shape || 'circle';

  container.innerHTML = `
    <!-- ══════ الشعار ══════ -->
    <div class="rc-logo-wrap">
      <div class="rc-logo shape-${logoShape}">
        ${org?.logo_url
          ? `<img src="${org.logo_url}" alt="logo">`
          : `<div class="rc-logo-placeholder"><i class="fas fa-boxes-stacked"></i></div>`}
      </div>
    </div>

    <!-- ══════ اسم المنظمة ══════ -->
    <div class="rc-org-name">${org?.name ?? 'MyStock'}</div>

    <div class="rc-divider"></div>

    <!-- ══════ رقم الإيصال ══════ -->
    <div class="rc-receipt-num">إيصال رقم: <strong>${receipt.receipt_number}</strong></div>

    <div class="rc-divider-dashed"></div>

    <!-- ══════ جدول العناصر ══════ -->
    <div class="rc-table">
      ${items.length === 0 ? `
        <div class="rc-empty">لا توجد عناصر</div>
      ` : items.map(item => `
        <div class="rc-line">
          <span class="rc-name">${item.product_name}</span>
          <span class="rc-qty">${item.qty}</span>
          <span class="rc-price">${Number(item.price).toFixed(2)}</span>
          <span class="rc-total">${Number(item.total).toFixed(2)}</span>
        </div>
      `).join('')}
    </div>

    <div class="rc-divider"></div>

    <!-- ══════ المجموع الكلي ══════ -->
    <div class="rc-total-row">
      المجموع الكلي: <strong>${totalValue.toFixed(2)}</strong>
    </div>

    <div class="rc-divider"></div>

    <!-- ══════ التاريخ والوقت ══════ -->
    <div class="rc-date">التاريخ: ${dateStr}</div>
    <div class="rc-time">الوقت: ${timeStr}</div>

    <div class="rc-divider-dashed"></div>

    <!-- ══════ شكر ══════ -->
    <div class="rc-thanks">شكراً لزيارتكم</div>

    <!-- ══════ الأزرار ══════ -->
    <div class="rc-actions no-print">
      <button class="btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i>
        <span>طباعة</span>
      </button>
      <a href="/movements/list.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>العودة</span>
      </a>
    </div>
  `;
}