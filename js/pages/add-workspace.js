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

  // ✅ 1. القسم الأول (لم ألمسه إطلاقاً، هو كما أعجبك)
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

  // ✅ 2. القسم الثاني (الحل المضمون باستخدام block و sticky)
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* منع تمرير الحاويات الأم */
          html, body { height: 100% !important; margin: 0 !important; overflow: hidden !important; }
          
          /* الحاوية الرئيسية هي المسؤولة عن التمرير */
          .main {
            display: block !important; /* ✅ السر: block وليس grid أو flex */
            height: 100% !important;
            overflow-y: auto !important; /* التمرير هنا */
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          /* ✅ 1. تثبيت العنوان */
          .page-header {
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: #f5f5f5 !important;
            padding: 24px 24px 8px 24px !important;
            margin: 0 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .page-header h2 { margin: 0 !important; font-size: 1.6rem !important; }
          .page-header a[href="add.html"] { display: none !important; }

          /* ✅ 2. تثبيت البحث */
          .search-bar {
            position: sticky !important;
            top: 64px !important; /* ارتفاع العنوان التقريبي */
            z-index: 99 !important;
            background: #f5f5f5 !important;
            margin: 0 !important;
            padding: 0 24px 16px 24px !important;
            max-width: none !important;
          }
          .search-bar input { width: 100% !important; }
          .search-bar i { inset-inline-end: 36px !important; } /* إصلاح الأيقونة */

          /* ✅ 3. المنتجات تتحرك تحت العناصر الثابتة */
          .products {
            padding: 16px 24px 24px 24px !important;
            margin: 0 !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) {}
  });

  // ✅ 3. القسم الثالث (إعادة تفعيل التمرير بداخله)
  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          html, body { height: 100% !important; margin: 0 !important; overflow: hidden !important; }
          .main {
            display: block !important;
            height: 100% !important;
            overflow-y: auto !important; /* ✅ إعادة التمرير */
            padding: 24px !important;
            box-sizing: border-box !important;
          }
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