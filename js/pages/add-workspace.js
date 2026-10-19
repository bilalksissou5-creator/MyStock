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

  // ✅ 2. القسم الثاني (قائمة المنتجات) - التثبيت الذكي
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        
        // ✅ الخطوة السحرية: جمع العنوان وخانة البحث في حاوية واحدة
        const mainContent = iframeDoc.getElementById('main-content');
        const header = iframeDoc.querySelector('.page-header');
        const searchBar = iframeDoc.querySelector('.search-bar');
        const products = iframeDoc.getElementById('products');

        if (mainContent && header && searchBar && products) {
          // إذا لم تكن الحاوية موجودة، نقوم بإنشائها
          if (!iframeDoc.querySelector('.sticky-header-wrapper')) {
            const wrapper = iframeDoc.createElement('div');
            wrapper.className = 'sticky-header-wrapper';
            
            // نضع الحاوية الجديدة قبل العنوان
            mainContent.insertBefore(wrapper, header);
            // ننقل العنوان والبحث داخل الحاوية
            wrapper.appendChild(header);
            wrapper.appendChild(searchBar);
          }
        }

        // ✅ إضافة CSS للتنسيق والتمرير السلس
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* إلغاء حركة الـ iframe بالكامل */
          html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; background: #f5f5f5 !important; }
          .main { height: 100% !important; padding: 0 !important; overflow: hidden !important; }

          /* الحاوية الرئيسية للتمرير */
          #main-content {
            height: 100% !important;
            overflow-y: auto !important;
            padding: 0 !important;
            display: block !important; /* نستخدم block بدلاً من grid */
            -webkit-overflow-scrolling: touch !important; /* تمرير سلس */
          }

          /* ✅ تثبيت الحاوية التي تحمل العنوان والبحث */
          .sticky-header-wrapper {
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: #f5f5f5 !important;
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 16px !important;
            margin: 0 !important;
          }

          /* تنسيق العنوان داخل الحاوية */
          .sticky-header-wrapper .page-header {
            flex: 0 0 auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-header h2 { font-size: 1.2rem !important; margin: 0 !important; }
          .page-header a[href="add.html"] { display: none !important; } /* إخفاء زر الإضافة */

          /* تنسيق خانة البحث داخل الحاوية */
          .sticky-header-wrapper .search-bar {
            flex: 1 1 auto !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .search-bar input { width: 100% !important; }

          /* إعداد شبكة المنتجات لتأخذ باقي المساحة */
          .products {
            padding: 0 16px 16px 16px !important;
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