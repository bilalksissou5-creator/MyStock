// ============================================
// Product Details Workspace (تقسيم صفحة تفاصيل المنتج)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  // ✅ قراءة المعرفات من الرابط
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId');
  const userId = urlParams.get('userId');
  const supplierId = urlParams.get('supplierId');

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

  main.innerHTML = `
    <div class="workspace">
      <!-- القسم الأول: بطاقة المستخدم -->
      <div class="workspace-panel-left">
        <iframe src="/user-card.html?userId=${userId || ''}" class="workspace-iframe" id="user-iframe" scrolling="yes"></iframe>
      </div>

      <!-- القسم الثاني: تفاصيل المنتج -->
      <div class="workspace-panel-center">
        <iframe src="/products/detail.html?id=${productId}" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>

      <!-- القسم الثالث: تفاصيل المورد -->
      <div class="workspace-panel-right">
        <iframe src="/suppliers/detail.html?id=${supplierId || ''}" class="workspace-iframe" id="supplier-iframe" scrolling="yes"></iframe>
      </div>
    </div>
  `;

  const userIframe = document.getElementById('user-iframe');
  const detailIframe = document.getElementById('detail-iframe');
  const supplierIframe = document.getElementById('supplier-iframe');

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
          /* إخفاء أي زر إضافة أو روابط غير مرغوبة إن وجدت */
          .page-header a[href="add.html"] { display: none !important; }
          
          /* إلغاء المسافة العلوية من main */
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          
          /* مسافة داخلية 16px */
          #main-content {
            padding: 16px !important; 
          }
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

});