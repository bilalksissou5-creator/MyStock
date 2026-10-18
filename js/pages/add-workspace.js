// ============================================
// Workspace (تقسيم صفحة الإضافة)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add-workspace.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_add_title_full') || 'Workspace';

  const main = document.getElementById('main-content');

  // ✅ بناء 3 أقسام (القسم الأول هو صفحة الإضافة الأصلية داخل iframe)
  main.innerHTML = `
    <div class="workspace">
      
      <!-- القسم الأول: صفحة الإضافة الأصلية -->
      <div class="workspace-panel-left">
        <iframe src="/products/add.html" class="workspace-iframe" id="add-iframe" scrolling="yes"></iframe>
      </div>

      <!-- القسم الثاني: قائمة المنتجات -->
      <div class="workspace-panel-center">
        <iframe src="/products/list.html" class="workspace-iframe" id="list-iframe" scrolling="yes"></iframe>
      </div>

      <!-- القسم الثالث: تفاصيل المنتج -->
      <div class="workspace-panel-right">
        <iframe src="about:blank" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>

    </div>
  `;

  const addIframe = document.getElementById('add-iframe');
  const listIframe = document.getElementById('list-iframe');
  const detailIframe = document.getElementById('detail-iframe');

  // ✅✅✅ التعديل الجديد 1: استرجاع آخر منتج تم عرضه بعد إعادة تحميل الصفحة
  const lastViewedProductId = sessionStorage.getItem('last_viewed_product_id');
  if (lastViewedProductId) {
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(lastViewedProductId)}`;
  }

  // ✅ استقبال حدث النقر على منتج من القائمة
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      // ✅✅✅ التعديل الجديد 2: حفظ المنتج المختار ليبقى بعد إعادة التحميل
      sessionStorage.setItem('last_viewed_product_id', data.productId);
      
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }
  });

  // ✅ إخفاء زر الإضافة داخل القائمة (لأننا في صفحة الإضافة بالفعل)
  listIframe.addEventListener('load', () => {
    try {
      const iframeDoc = listIframe.contentDocument || listIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `.page-header a[href="add.html"] { display: none !important; }`;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('iframe access error', e); }
  });
});