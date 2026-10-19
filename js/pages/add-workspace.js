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
        <iframe src="/products/add.html" class="workspace-iframe" id="add-iframe" scrolling="no"></iframe>
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

  // ✅ 1. القسم الأول (إضافة المنتج) - ثابت ونموذج يتحرك
  addIframe.addEventListener('load', () => {
    try {
      const iframeDoc = addIframe.contentDocument || addIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; }
          .main { display: flex !important; flex-direction: column !important; height: 100% !important; padding: 0 !important; overflow: hidden !important; }
          .page-header { flex: 0 0 auto !important; padding: 16px !important; margin: 0 !important; background: #f5f5f5 !important; border-bottom: 1px solid #e5e5e5 !important; z-index: 10 !important; }
          .add-form { flex: 1 1 auto !important; overflow-y: auto !important; padding: 16px !important; padding-bottom: 80px !important; -webkit-overflow-scrolling: touch !important; }
          .alert { margin: 16px 16px 0 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('add iframe error:', e); }
  });

  // ✅ 2. القسم الثاني (قائمة المنتجات) - تثبيت العنوان والبحث
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* ✅ إلغاء حركة الـ iframe بالكامل */
          html, body {
            overflow: hidden !important;
            height: 100% !important;
            margin: 0 !important;
          }

          /* ✅ إعداد الحاوية الرئيسية */
          .main {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          /* ✅ حاوية المحتوى التي تتمرر */
          #main-content {
            display: flex !important;
            flex-wrap: wrap !important;
            align-content: flex-start !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 16px !important;
            padding-top: 0 !important; /* إزالة المسافة العلوية */
            height: 100% !important;
            overflow-y: auto !important; /* التمرير هنا فقط */
            -webkit-overflow-scrolling: touch !important;
          }

          /* ✅ تثبيت العنوان "Products" */
          .page-header {
            flex: 0 0 auto !important;
            margin: 0 !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: #f5f5f5 !important; /* لون الخلفية ليغطي العناصر أثناء التمرير */
            padding-top: 16px !important;
            padding-bottom: 8px !important;
          }

          /* ✅ تثبيت خانة البحث */
          .search-bar {
            flex: 1 1 auto !important;
            margin: 0 !important;
            max-width: none !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: #f5f5f5 !important;
            padding-top: 16px !important;
            padding-bottom: 8px !important;
          }

          /* إخفاء زر الإضافة */
          .page-header a[href="add.html"] { display: none !important; }

          /* ✅ المنتجات تأخذ باقي المساحة */
          .products {
            flex: 1 1 100% !important;
            margin-top: 0 !important;
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
        iframeDoc.body.style.paddingBottom = '30px';
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          .page-header { padding-top: 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
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