// ============================================
// Workspace (تقسيم صفحة الإضافة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  // ✅ تحويل الهاتف لصفحة الإضافة الأصلية
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

  // ✅ 1. القسم الأول (إضافة المنتج)
  addIframe.addEventListener('load', () => {
    try {
      const iframeDoc = addIframe.contentDocument || addIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '80px';
      }
    } catch (e) { console.warn('add iframe error:', e); }
  });

  // ✅ 2. القسم الثاني (قائمة المنتجات) - التنسيق المباشر
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        // تفعيل التمرير
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '80px';
        
        // ✅ حقن CSS مباشر داخل الـ iframe لجعل العنوان والبحث في سطر واحد
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* إخفاء زر الإضافة */
          .page-header a[href="add.html"] { display: none !important; }
          
          /* إجبار الحاوية الرئيسية على الترتيب الأفقي */
          #main-content {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 12px !important;
          }
          
          /* العنوان */
          .page-header {
            flex: 0 0 auto !important;
            margin-bottom: 0 !important;
          }
          
          /* البحث يأخذ المساحة المتبقية */
          .search-bar {
            flex: 1 1 auto !important;
            margin-bottom: 0 !important;
            max-width: none !important;
          }
          
          /* المنتجات تنزل لسطر جديد */
          .products {
            flex: 0 0 100%!important;
            margin-top: 16px !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('list iframe error:', e); }
  });

  // ✅ 3. القسم الثالث (تفاصيل المنتج)
  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '80px';
      }
    } catch (e) { console.warn('detail iframe error:', e); }
  });

  // ✅ استرجاع آخر منتج تم عرضه
  const lastViewedProductId = sessionStorage.getItem('last_viewed_product_id');
  if (lastViewedProductId) {
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(lastViewedProductId)}`;
  }

  // ✅ استقبال النقرات من القائمة وعرضها في القسم الثالث
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      sessionStorage.setItem('last_viewed_product_id', data.productId);
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }
  });
});