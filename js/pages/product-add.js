// ============================================
// صفحة إضافة منتجات (تعمل كحاوية Shell)
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

  // ✅ بناء الهيكل: 3 أقسام (القسم الأول عبارة عن iframe)
  main.innerHTML = `
    <div class="workspace">
      
      <!-- القسم الأول: iframe -->
      <div class="workspace-panel workspace-panel-left">
        <iframe src="/products/add-form.html" class="workspace-iframe" id="panel-left-iframe" style="display:block; width:100%; height:100%; border:none;"></iframe>
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

  // الاستماع لرسائل تحديد المنتجات من القائمة
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }
  });
});