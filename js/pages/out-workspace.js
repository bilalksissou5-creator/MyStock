// ============================================
// Output Workspace (تقسيم صفحة إخراج المنتجات)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  
  // ✅ تحويل الهاتف لصفحة الإخراج الأصلية
  if (window.innerWidth <= 1024) {
    window.location.replace('/movements/out.html');
    return; 
  }

  const user = await requireAuth();
  if (!user) return;

  renderLayout('movements/out-workspace.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('nav_out_product') || 'Output Workspace';

  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="workspace">
      <div class="workspace-panel-left">
        <!-- ✅ القسم الأول: صفحة إخراج المنتجات -->
        <iframe src="/movements/out.html" class="workspace-iframe" id="out-iframe" scrolling="yes"></iframe>
      </div>

      <div class="workspace-panel-center">
        <!-- ✅ القسم الثاني: قائمة المنتجات -->
        <iframe src="/products/list.html" class="workspace-iframe" id="list-iframe" scrolling="yes"></iframe>
      </div>

      <div class="workspace-panel-right">
        <!-- ✅ القسم الثالث: تفاصيل المنتج -->
        <iframe src="about:blank" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>
    </div>
  `;

  const outIframe = document.getElementById('out-iframe');
  const listIframe = document.getElementById('list-iframe');
  const detailIframe = document.getElementById('detail-iframe');

  // ✅ 1. القسم الأول (إخراج المنتجات)
  outIframe.addEventListener('load', () => {
    try {
      const iframeDoc = outIframe.contentDocument || outIframe.contentWindow.document;
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
    } catch (e) { console.warn('out iframe error:', e); }
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
          
          /* ✅ إلغاء المسافة العلوية من main */
          .main { padding-top: 0 !important; padding-bottom: 80px !important; }
          
          /* ✅ استخدام Grid للترتيب مع مسافة داخلية 16px */
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