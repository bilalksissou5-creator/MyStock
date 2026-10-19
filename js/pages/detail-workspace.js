// ============================================
// Product Details Workspace (تقسيم صفحة تفاصيل المنتج)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId');
  const userId = urlParams.get('userId');
  const supplierId = urlParams.get('supplierId');
  const invoiceId = urlParams.get('invoiceId');

  // ✅ تحويل الهاتف لصفحة التفاصيل الأصلية
  if (window.innerWidth <= 1024) {
    window.location.replace(`/products/detail.html?id=${productId}`);
    return; 
  }

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/detail-workspace.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_detail_title') || 'Product Details';

  const main = document.getElementById('main-content');

  // ✅ إضافة كلاس workspace-4-cols لضمان تساوي الأعمدة
  main.innerHTML = `
    <div class="workspace workspace-4-cols">
      <!-- 1. بطاقة المستخدم -->
      <div class="workspace-panel-left">
        <iframe src="/user-card.html?userId=${userId || ''}" class="workspace-iframe" id="user-iframe" scrolling="yes"></iframe>
      </div>

      <!-- 2. تفاصيل المنتج -->
      <div class="workspace-panel-center">
        <iframe src="/products/detail.html?id=${productId}" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>

      <!-- 3. تفاصيل المورد -->
      <div class="workspace-panel-right">
        <iframe src="/suppliers/detail.html?id=${supplierId || ''}" class="workspace-iframe" id="supplier-iframe" scrolling="yes"></iframe>
      </div>

      <!-- 4. الفاتورة -->
      <div class="workspace-panel-invoice">
        <iframe src="${invoiceId ? `/invoice.html?id=${encodeURIComponent(invoiceId)}` : 'about:blank'}" class="workspace-iframe" id="invoice-iframe" scrolling="yes"></iframe>
      </div>
    </div>
  `;

  const userIframe = document.getElementById('user-iframe');
  const detailIframe = document.getElementById('detail-iframe');
  const supplierIframe = document.getElementById('supplier-iframe');
  const invoiceIframe = document.getElementById('invoice-iframe');

  // ✅ 1. القسم الأول (بطاقة المستخدم)
  userIframe.addEventListener('load', () => {
    try {
      const iframeDoc = userIframe.contentDocument || userIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '30px';
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          .page-header { padding-top: 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('user iframe error:', e); }
  });

  // ✅ 2. القسم الثاني (تفاصيل المنتج)
  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '150px';
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .page-header a[href="add.html"] { display: none !important; }
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          #main-content { padding: 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('detail iframe error:', e); }
  });

  // ✅ 3. القسم الثالث (تفاصيل المورد)
  supplierIframe.addEventListener('load', () => {
    try {
      const iframeDoc = supplierIframe.contentDocument || supplierIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '30px';
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          .page-header { padding-top: 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('supplier iframe error:', e); }
  });

  // ✅ 4. القسم الرابع (الفاتورة)
  invoiceIframe.addEventListener('load', () => {
    try {
      const iframeDoc = invoiceIframe.contentDocument || invoiceIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '30px';
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          .page-header { padding-top: 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('invoice iframe error:', e); }
  });

});