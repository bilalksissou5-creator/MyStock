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

  // ✅ 1. القسم الأول (إضافة المنتج) - تثبيت الهيدر وجعل النموذج فقط قابلاً للتمرير
  addIframe.addEventListener('load', () => {
    try {
      const iframeDoc = addIframe.contentDocument || addIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* ✅ إلغاء حركة الـ iframe بالكامل */
          html, body {
            overflow: hidden !important;
            height: 100% !important;
            margin: 0 !important;
          }

          /* ✅ تحويل main إلى Flexbox لترتيب الهيدر والنموذج */
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

          /* ✅ جعل النموذج هو الجزء الوحيد الذي يتحرك بسلاسة */
          .add-form {
            flex: 1 1 auto !important; /* يأخذ المساحة المتبقية */
            overflow-y: auto !important; /* تفعيل التمرير هنا فقط */
            padding: 16px !important;
            padding-bottom: 80px !important; /* مساحة إضافية لرؤية الأزرار السفلية */
            -webkit-overflow-scrolling: touch !important; /* تمرير سلس */
          }

          /* تنسيق التنبيهات */
          .alert {
            margin: 16px 16px 0 16px !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('add iframe error:', e); }
  });

  // ✅ 2. القسم الثاني (قائمة المنتجات)
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.documentElement.style.overflowY = 'auto';
        iframeDoc.body.style.overflowY = 'auto';
        iframeDoc.body.style.paddingBottom = '150px';
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .page-header a[href="add.html"] { display: none !important; }
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          #main-content {
            display: grid !important;
            grid-template-columns: auto 1fr !important;
            align-items: center !important;
            align-content: start !important;
            gap: 16px !important;
            padding: 16px !important; 
          }
          .page-header { grid-column: 1 !important; margin-bottom: 0 !important; }
          .search-bar { grid-column: 2 !important; margin-bottom: 0 !important; max-width: none !important; }
          .products { grid-column: 1 / -1 !important; margin-top: 0 !important; }
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