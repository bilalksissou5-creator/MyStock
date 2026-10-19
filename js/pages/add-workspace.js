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

  // ✅ 2. القسم الثاني (التثبيت والتمرير السلس)
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* ✅ منع تمرير الصفحة بالكامل */
          html, body { 
            overflow: hidden !important; 
            height: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #f5f5f5 !important; 
          }
          
          .main { 
            height: 100% !important; 
            padding: 24px !important; 
            box-sizing: border-box !important; 
            overflow: hidden !important; 
            display: flex !important;
            flex-direction: column !important;
          }

          /* ✅ تقسيم إلى شبكة: صف للعنوان والبحث، وصف للمنتجات */
          #main-content {
            display: grid !important;
            grid-template-columns: auto 1fr !important; 
            grid-template-rows: auto 1fr !important; /* ✅ 1fr تأخذ باقي المساحة */
            gap: 16px !important;
            height: 100% !important;
            overflow: hidden !important; /* إخفاء التمرير الخارجي */
          }

          /* ✅ تثبيت العنوان */
          .page-header {
            grid-column: 1 !important;
            grid-row: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            align-self: center !important;
            display: flex !important;
            align-items: center !important;
          }
          .page-header h2 { margin: 0 !important; font-size: 1.2rem !important; }
          .page-header a[href="add.html"] { display: none !important; }

          /* ✅ تثبيت البحث */
          .search-bar {
            grid-column: 2 !important;
            grid-row: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            align-self: center !important;
          }
          .search-bar input { width: 100% !important; }

          /* ✅ المنتجات فقط هي التي تتحرك */
          .products {
            grid-column: 1 / -1 !important;
            grid-row: 2 !important;
            margin: 0 !important;
            padding: 0 0 24px 0 !important; /* مسافة سفلية للجمالية */
            overflow-y: auto !important; /* ✅ التمرير هنا فقط */
            overflow-x: hidden !important;
            align-content: start !important;
            -webkit-overflow-scrolling: touch !important; /* سلاسة */
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