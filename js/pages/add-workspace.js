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

  // ✅ 2. القسم الثاني - الحل القوي بإعادة الهيكلة
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (!iframeDoc) return;
      
      const mainEl = iframeDoc.querySelector('.main');
      const mainContent = iframeDoc.getElementById('main-content');
      const pageHeader = iframeDoc.querySelector('.page-header');
      const searchBar = iframeDoc.querySelector('.search-bar');
      
      // ✅✅✅ إعادة الهيكلة: نقل العنوان والبحث خارج #main-content
      if (mainEl && mainContent && pageHeader && searchBar) {
        if (!iframeDoc.querySelector('.top-fixed-bar')) {
          const topBar = iframeDoc.createElement('div');
          topBar.className = 'top-fixed-bar';
          // نضع الشريط العلوي قبل #main-content
          mainEl.insertBefore(topBar, mainContent);
          // ننقل العنوان والبحث إلى الشريط العلوي
          topBar.appendChild(pageHeader);
          topBar.appendChild(searchBar);
        }
      }
      
      // ✅ تطبيق CSS الحاسم
      const style = iframeDoc.createElement('style');
      style.innerHTML = `
        /* ✅ إيقاف التمرير على مستوى الصفحة */
        html, body { 
          overflow: hidden !important; 
          height: 100% !important; 
          margin: 0 !important; 
          padding: 0 !important;
        }
        
        /* ✅ .main يصبح حاوية Flex عمودية */
        .main { 
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        
        /* ✅ الشريط العلوي الثابت (العنوان + البحث) */
        .top-fixed-bar {
          flex: 0 0 auto !important; /* ✅ ثابت، لا ينكمش ولا يتمدد */
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 16px 24px !important;
          background: #f5f5f5 !important;
          border-bottom: 1px solid #e5e5e5 !important;
          z-index: 10 !important;
          position: relative !important;
        }
        
        .top-fixed-bar .page-header {
          margin: 0 !important;
          padding: 0 !important;
          flex-shrink: 0 !important;
        }
        
        .top-fixed-bar .page-header h2 {
          margin: 0 !important;
          font-size: 1.2rem !important;
        }
        
        .top-fixed-bar .page-header a[href="add.html"] {
          display: none !important;
        }
        
        .top-fixed-bar .search-bar {
          flex: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          max-width: none !important;
        }
        
        .top-fixed-bar .search-bar input {
          width: 100% !important;
        }
        
        /* ✅ #main-content يصبح الحاوية الوحيدة القابلة للتمرير */
        #main-content {
          display: block !important;
          flex: 1 1 auto !important; /* ✅ يأخذ باقي المساحة */
          overflow-y: auto !important;
          overflow-x: hidden !important;
          padding: 24px !important;
          min-height: 0 !important; /* ✅✅✅ حرج جداً لتفعيل التمرير */
          -webkit-overflow-scrolling: touch !important;
          height: auto !important;
        }
        
        .products {
          margin: 0 !important;
          padding: 0 !important;
        }
      `;
      iframeDoc.head.appendChild(style);
      
    } catch (e) { console.warn('list iframe error:', e); }
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