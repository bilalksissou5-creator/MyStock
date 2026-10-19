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
        <!-- ✅ تغيير scrolling إلى no لمنع التمرير الخارجي -->
        <iframe src="/products/list.html" class="workspace-iframe" id="list-iframe" scrolling="no"></iframe>
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

  // ✅ 2. القسم الثاني (قائمة المنتجات) - تثبيت وتمرير سلس
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
            background: #f5f5f5 !important; 
          }
          .main { 
            height: 100% !important; 
            padding: 0 !important; 
            overflow: hidden !important; 
          }

          /* ✅ حاوية التمرير الرئيسية */
          #main-content {
            display: grid !important;
            grid-template-columns: auto 1fr !important; 
            grid-template-rows: auto auto !important; 
            align-content: start !important;
            gap: 8px !important;
            height: 100% !important;
            overflow-y: auto !important; 
            padding: 0 !important;
            box-sizing: border-box !important;
            -webkit-overflow-scrolling: touch !important; /* ✅ تمرير سلس جداً */
          }

          /* ✅ تثبيت العنوان */
          .page-header {
            grid-column: 1 !important;
            grid-row: 1 !important;
            margin: 0 !important;
            padding: 16px 8px 16px 16px !important;
            position: sticky !important;
            top: 0 !important;
            background: #f5f5f5 !important;
            z-index: 100 !important;
            align-self: center !important;
          }
          .page-header h2 { font-size: 1.2rem !important; margin: 0 !important; }

          /* ✅ تثبيت خانة البحث (مع إصلاح المسافات) */
          .search-bar {
            grid-column: 2 !important;
            grid-row: 1 !important;
            margin: 0 !important;
            padding-block: 16px !important;
            padding-inline-start: 8px !important;
            padding-inline-end: 16px !important;
            max-width: none !important;
            position: sticky !important;
            top: 0 !important;
            background: #f5f5f5 !important;
            z-index: 100 !important;
            box-sizing: border-box !important;
            align-self: center !important;
          }
          .search-bar input { width: 100% !important; }

          /* ✅ إصلاح مكان أيقونة البحث */
          .search-bar i { inset-inline-end: 28px !important; }

          /* إخفاء زر الإضافة */
          .page-header a[href="add.html"] { display: none !important; }

          /* ✅ إعداد شبكة المنتجات */
          .products {
            grid-column: 1 / -1 !important;
            grid-row: 2 !important;
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
            gap: 16px !important;
            margin: 0 !important;
            padding: 16px !important;
            padding-top: 8px !important;
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