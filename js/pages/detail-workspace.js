// ============================================
// Product Details Workspace (تقسيم صفحة تفاصيل المنتج)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  // 1. قراءة المعرفات من الرابط
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId');
  const userId = urlParams.get('userId');
  const supplierId = urlParams.get('supplierId');

  // 2. تحويل الهاتف لصفحة التفاصيل الأصلية
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

  // 3. بناء الأقسام الثلاثة
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

  // 4. دالة مساعدة لتفعيل التمرير وإزالة المسافات
  const formatIframe = (iframeElement) => {
    try {
      const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow.document;
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
    } catch (e) { console.warn('iframe error:', e); }
  };

  // 5. تطبيق التنسيق عند تحميل كل قسم
  userIframe.addEventListener('load', () => formatIframe(userIframe));
  detailIframe.addEventListener('load', () => formatIframe(detailIframe));
  supplierIframe.addEventListener('load', () => formatIframe(supplierIframe));
});