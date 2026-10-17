// ============================================
// صفحة إضافة منتجات
// ✅ دعم كامل للترجمة
// ✅ دعم Workspace (تقسيم 3 أقسام + تفاصيل المنتج)
// ✅ دعم التبديل الديناميكي (بدون إعادة تحميل)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__productAddLoaded) return;
  window.__productAddLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_add_title_full') || 'Add Products';

  const main = document.getElementById('main-content');

  const { data: suppliers } = await db
    .from('suppliers')
    .select('*')
    .order('name');

  // ✅ التعديل الرئيسي: القسم الأول أصبح iframe ليعمل التبديل الديناميكي
  main.innerHTML = `
    <div class="workspace">
      
      <!-- القسم الأول: iframe لصفحة الإضافة/الإخراج -->
      <div class="workspace-panel workspace-panel-left" id="panel-left">
        <iframe src="/products/add.html" class="workspace-iframe" id="panel-left-iframe" style="display:block; width:100%; height:100%; border:none;"></iframe>
      </div>

      <!-- القسم الثاني: قائمة المنتجات -->
      <div class="workspace-panel workspace-panel-center">
        <iframe src="/products/list.html" class="workspace-iframe" id="products-list-iframe" title="Products List" loading="lazy" scrolling="yes"></iframe>
      </div>

      <!-- القسم الثالث: تفاصيل المنتج -->
      <div class="workspace-panel workspace-panel-right">
        <iframe src="about:blank" class="workspace-iframe workspace-iframe-detail" id="product-detail-iframe" title="Product Details" scrolling="yes"></iframe>
      </div>

    </div>
  `;

  const detailIframe = document.getElementById('product-detail-iframe');
  const listIframe = document.getElementById('products-list-iframe');
  const panelLeftIframe = document.getElementById('panel-left-iframe');

  // حقن التمرير في iframe التفاصيل
  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          html, body { height: 100% !important; overflow: hidden !important; }
          .app { height: 100vh !important; overflow: hidden !important; }
          .body { height: calc(100vh - 60px) !important; overflow: hidden !important; }
          .main { height: 100% !important; overflow-y: auto !important; padding-bottom: 60px !important; }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) { console.warn('iframe access error', e); }
  });

  // الاستماع للرسائل
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // عند النقر على منتج في القائمة
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }
    
    // عند حذف منتج
    if (data.type === 'PRODUCT_DELETED') {
      if (listIframe) listIframe.src = listIframe.src;
      detailIframe.src = 'about:blank';
    }

    // ✅ التبديل بين الإضافة والإخراج
    if (data.type === 'SWITCH_PANEL') {
      if (data.target === '/movements/out.html') {
        panelLeftIframe.src = '/movements/out.html';
      } else if (data.target === '/products/add.html') {
        panelLeftIframe.src = '/products/add.html';
      }
    }
  });

  // ✅ إذا كنا داخل iframe، نترك باقي الكود يعمل بشكل طبيعي
  // (لأننا في الصفحة الأم، الكود هنا مسؤول عن إدارة الأقسام فقط)
});