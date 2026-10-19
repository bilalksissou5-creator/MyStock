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

  // ✅ 2. القسم الثاني - الحل الجذري (جمع العناصر في حاوية واحدة)
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        
        const mainContent = iframeDoc.getElementById('main-content');
        const header = iframeDoc.querySelector('.page-header');
        const searchBar = iframeDoc.querySelector('.search-bar');
        
        // ✅✅✅ السحر: جمع العنوان والبحث في حاوية واحدة (إن لم تكن موجودة)
        if (mainContent && header && searchBar) {
          if (!iframeDoc.querySelector('.sticky-header-container')) {
            const wrapper = iframeDoc.createElement('div');
            wrapper.className = 'sticky-header-container';
            
            // إدخال الحاوية قبل العنوان
            mainContent.insertBefore(wrapper, header);
            // نقل العناصر داخل الحاوية
            wrapper.appendChild(header);
            wrapper.appendChild(searchBar);
          }
        }

        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* ✅ إيقاف تمرير الصفحة والـ iframe بالكامل */
          html, body { 
            overflow: hidden !important; 
            height: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #f5f5f5 !important; 
          }
          
          .main { 
            height: 100% !important; 
            padding: 0 !important; 
            overflow: hidden !important; 
          }

          /* ✅ الحاوية الوحيدة التي تتمرر */
          #main-content {
            display: block !important; 
            height: 100% !important;
            overflow-y: auto !important; 
            padding: 0 !important;
            -webkit-overflow-scrolling: touch !important;
          }

          /* ✅ تنسيق الحاوية العلوية (تجمع العنوان والبحث أفقياً) */
          .sticky-header-container {
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: #f5f5f5 !important;
            display: flex !important; /* يجعل العناصر أفقية */
            flex-direction: row !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 16px !important;
            margin: 0 !important;
            border-bottom: 1px solid #e5e5e5 !important; /* خط فاصل */
          }

          /* ✅ تنسيق العنوان داخل الحاوية */
          .sticky-header-container .page-header {
            flex: 0 0 auto !important; /* لا يتمدد ولا ينكمش */
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-header h2 { margin: 0 !important; font-size: 1.2rem !important; }
          .page-header a[href="add.html"] { display: none !important; } /* إخفاء زر الإضافة */

          /* ✅ تنسيق البحث داخل الحاوية */
          .sticky-header-container .search-bar {
            flex: 1 1 auto !important; /* يأخذ المساحة المتبقية */
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .search-bar input { 
            width: 100% !important; 
            padding-inline-end: 36px !important; 
          }

          /* ✅ إصلاح أيقونة البحث */
          .search-bar i {
            inset-inline-end: 12px !important; /* إعادتها لمكانها الأصلي */
          }

          /* ✅ شبكة المنتجات */
          .products {
            padding: 16px !important;
            margin: 0 !important;
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
            gap: 16px !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
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