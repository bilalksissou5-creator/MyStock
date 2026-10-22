// ============================================
// Workspace (تقسيم صفحة الإضافة)
// ✅ تثبيت العناصر العلوية في القسم 1 و 2
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
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

  // ✅ 1. القسم الأول (إضافة المنتج) - تثبيت الهيدر وجعل النموذج يتحرك
  addIframe.addEventListener('load', () => {
    try {
      const iframeDoc = addIframe.contentDocument || addIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* منع تمرير الصفحة بالكامل */
          html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; }
          
          /* تحويل main إلى Flexbox لترتيب الهيدر والنموذج */
          .main { 
            display: flex !important; 
            flex-direction: column !important; 
            height: 100% !important; 
            padding: 0 !important; 
            overflow: hidden !important; 
          }
          
          /* ✅ تثبيت شريط العنوان (Add Products + Scan) */
          .page-header { 
            flex: 0 0 auto !important; /* يمنع الهيدر من التمدد أو الانكماش */
            padding: 16px !important; 
            margin: 0 !important; 
            background: #f5f5f5 !important; 
            border-bottom: 1px solid #e5e5e5 !important; 
            z-index: 10 !important; 
          }
          
          /* ✅ جعل النموذج هو الجزء الوحيد الذي يتحرك */
          .add-form { 
            flex: 1 1 auto !important; /* يأخذ المساحة المتبقية */
            overflow-y: auto !important; /* تفعيل التمرير هنا فقط */
            padding: 16px !important; 
            padding-bottom: 80px !important; /* مساحة للأزرار السفلية */
            -webkit-overflow-scrolling: touch !important; 
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('add iframe error:', e); }
  });

  // ✅ 2. القسم الثاني (قائمة المنتجات) - تثبيت العنوان والبحث وجعل المنتجات تتحرك
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* منع تمرير الصفحة بالكامل */
          html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; }
          
          .main { 
            display: flex !important; 
            flex-direction: column !important; 
            height: 100% !important; 
            padding: 0 !important; 
            overflow: hidden !important; 
          }

          /* إخفاء زر الإضافة */
          .page-header a[href="add.html"] { display: none !important; }

          /* ✅ تثبيت شريط العنوان (Products) */
          .page-header {
            flex: 0 0 auto !important;
            margin: 0 !important;
            padding: 16px 16px 8px 16px !important;
            background: #f5f5f5 !important;
            z-index: 100 !important;
          }

          /* ✅ تثبيت خانة البحث تحت العنوان مباشرة */
          .search-bar {
            flex: 0 0 auto !important;
            margin: 0 !important;
            padding: 8px 16px 16px 16px !important;
            background: #f5f5f5 !important;
            border-bottom: 1px solid #e5e5e5 !important;
            max-width: none !important;
            z-index: 99 !important;
          }

          /* ✅ جعل حاوية المنتجات هي الوحيدة التي تتحرك */
          .products {
            flex: 1 1 auto !important;
            overflow-y: auto !important;
            padding: 16px !important;
            margin: 0 !important;
            align-content: start !important;
            -webkit-overflow-scrolling: touch !important;
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
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          html, body { height: 100% !important; margin: 0 !important; overflow: hidden !important; }
          .main { display: block !important; height: 100% !important; overflow-y: auto !important; padding: 24px !important; box-sizing: border-box !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('detail iframe error:', e); }
  });

  // ✅ استرجاع آخر منتج
  const lastViewedProductId = sessionStorage.getItem('last_viewed_product_id');
  if (lastViewedProductId) {
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(lastViewedProductId)}`;
  }

  // ✅ مستمع الرسائل (سرعة البرق)
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      sessionStorage.setItem('last_viewed_product_id', data.productId);
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }

    if (data.type === 'NEW_PRODUCT_SAVED') {
      if (listIframe && listIframe.contentWindow) {
        listIframe.contentWindow.postMessage({ type: 'REFRESH_PRODUCTS' }, '*');
      }
    }
  });
});