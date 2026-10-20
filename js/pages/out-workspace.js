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
        <iframe src="/movements/out.html" class="workspace-iframe" id="out-iframe" scrolling="no"></iframe>
      </div>

      <div class="workspace-panel-center">
        <iframe src="/products/list.html" class="workspace-iframe" id="list-iframe" scrolling="no"></iframe>
      </div>

      <div class="workspace-panel-right">
        <iframe src="about:blank" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>
    </div>
  `;

  const outIframe = document.getElementById('out-iframe');
  const listIframe = document.getElementById('list-iframe');
  const detailIframe = document.getElementById('detail-iframe');

  // ✅ 1. القسم الأول (إخراج المنتجات) - الكود المستقر
  outIframe.addEventListener('load', () => {
    try {
      const iframeDoc = outIframe.contentDocument || outIframe.contentWindow.document;
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
    } catch (e) { console.warn('out iframe error:', e); }
  });

  // ✅ 2. القسم الثاني (قائمة المنتجات) - إخفاء الزر فقط والاعتماد على products.css
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          .page-header a[href="add.html"] { display: none !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('list iframe error:', e); }
  });

  // ✅ 3. القسم الثالث (تفاصيل المنتج) - الكود المستقر
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

  // ✅ استرجاع آخر منتج تم عرضه
  const lastViewedProductId = sessionStorage.getItem('last_viewed_product_id');
  if (lastViewedProductId) {
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(lastViewedProductId)}`;
  }

  // ✅ مستمع الرسائل (لربط الأقسام ببعضها)
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // 1. عند النقر على منتج في القائمة (عرض التفاصيل)
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      sessionStorage.setItem('last_viewed_product_id', data.productId);
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }

    // 2. ✅ عند إخراج منتج بنجاح (تحديث القائمة فوراً دون إعادة تحميل الصفحة)
    if (data.type === 'NEW_PRODUCT_OUT_SAVED') {
      if (listIframe && listIframe.contentWindow) {
        listIframe.contentWindow.postMessage({ type: 'REFRESH_PRODUCTS' }, '*');
      }
    }
  });
});