// ============================================
// Workspace (تقسيم صفحة الإضافة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // ✅ 1. إذا كان المستخدم على هاتف أو شاشة صغيرة، حوله فوراً لصفحة الإضافة العادية
  if (window.innerWidth <= 1024) {
    window.location.replace('/products/add.html');
    return;
  }

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add-workspace.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_add_title_full') || 'Workspace';

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="workspace">
      <div class="workspace-panel-left">
        <iframe src="/products/add.html" class="workspace-iframe" id="add-iframe" scrolling="yes"></iframe>
      </div>

      <div class="workspace-panel-center">
        <iframe src="/products/list.html" class="workspace-iframe" id="list-iframe" scrolling="yes"></iframe>
      </div>

      <div class="workspace-panel-right">
        <iframe src="about:blank" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>
    </div>
  `;

  const addIframe = document.getElementById('add-iframe');
  const listIframe = document.getElementById('list-iframe');
  const detailIframe = document.getElementById('detail-iframe');

  // ✅ تفعيل التمرير وإخفاء الزر وتنسيق العنوان والبحث داخل القائمة
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        // تفعيل التمرير
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        
        // ✅ السحر: نقل خانة البحث لتكون بجانب العنوان
        const header = iframeDoc.querySelector('.page-header');
        const searchBar = iframeDoc.querySelector('.search-bar');
        
        if (header && searchBar && !header.contains(searchBar)) {
          header.appendChild(searchBar); // ننقل البحث ليكون داخل الـ header
        }

        // ✅ حقن CSS لجعلهما في سطر واحد
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* إخفاء زر الإضافة */
          .page-header a[href="add.html"] { display: none !important; }
          
          /* تنسيق السطر الواحد */
          .page-header {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 16px !important;
            margin-bottom: 16px !important;
          }
          
          .page-header h2 {
            margin: 0 !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          
          /* البحث يأخذ المساحة المتبقية */
          .search-bar {
            flex: 1 !important;
            max-width: 100% !important;
            margin-bottom: 0 !important;
          }
          
          .search-bar input {
            width: 100% !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('list iframe error:', e); }
  });

  // ✅ استرجاع آخر منتج
  const lastViewedProductId = sessionStorage.getItem('last_viewed_product_id');
  if (lastViewedProductId) {
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(lastViewedProductId)}`;
  }

  // ✅ استقبال النقرات
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      sessionStorage.setItem('last_viewed_product_id', data.productId);
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }
  });
});