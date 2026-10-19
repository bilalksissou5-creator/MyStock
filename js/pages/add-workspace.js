// ============================================
// Workspace (تقسيم صفحة الإضافة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  if (window.innerWidth <= 1024) {
    window.location.replace('/products/add.html');
    return; 
  }

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add-workspace.html');
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="workspace">
      <div class="workspace-panel-left">
        <iframe src="/products/add.html" class="workspace-iframe" id="add-iframe" scrolling="no"></iframe>
      </div>
      <div class="workspace-panel-center">
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

  // ✅ 1. القسم الأول
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
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) {}
  });

  // ✅ 2. القسم الثاني (الحل النهائي)
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        
        // جلب العناصر
        const header = iframeDoc.querySelector('.page-header');
        const searchBar = iframeDoc.querySelector('.search-bar');
        const mainContent = iframeDoc.getElementById('main-content');

        // تجميع العنوان والبحث في حاوية واحدة
        if (header && searchBar && mainContent) {
          if (!iframeDoc.querySelector('.fixed-top-bar')) {
            const wrapper = iframeDoc.createElement('div');
            wrapper.className = 'fixed-top-bar';
            mainContent.insertBefore(wrapper, header);
            wrapper.appendChild(header);
            wrapper.appendChild(searchBar);
          }
        }

        // تطبيق CSS النهائي
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; padding: 0 !important; }
          .main { height: 100% !important; padding: 16px !important; box-sizing: border-box !important; overflow: hidden !important; }

          /* ✅ إجبار الحاوية على الترتيب العمودي */
          #main-content {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            overflow: hidden !important;
            gap: 16px !important;
          }

          /* ✅ الحاوية العلوية الثابتة */
          .fixed-top-bar {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 16px !important;
            flex-shrink: 0 !important;
          }

          /* تنسيقات العنوان والبحث */
          .page-header { margin: 0 !important; flex-shrink: 0 !important; }
          .page-header a[href="add.html"] { display: none !important; }
          .search-bar { margin: 0 !important; flex: 1 !important; max-width: none !important; }

          /* ✅ جعل المنتجات فقط هي التي تتمرر */
          .products {
            flex: 1 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            align-content: start !important;
            padding-bottom: 20px !important;
            -webkit-overflow-scrolling: touch !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) {}
  });

  // ✅ 3. القسم الثالث
  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          .page-header { padding-top: 16px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) {}
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