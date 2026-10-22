// ============================================
// Workspace (تقسيم صفحة الإضافة) - نظيف 100%
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

  // ✅ بناء الـ iframes
  main.innerHTML = `
    <div class="workspace">
      <div class="workspace-panel-left">
        <iframe src="/products/add.html" class="workspace-iframe" id="add-iframe" scrolling="no"></iframe>
      </div>
      <div class="workspace-panel-center">
        <!-- ✅ أزلنا scrolling="no" لكي يسمح بالتمرير -->
        <iframe src="/products/list.html" class="workspace-iframe" id="list-iframe"></iframe>
      </div>
      <div class="workspace-panel-right">
        <iframe src="about:blank" class="workspace-iframe" id="detail-iframe" scrolling="yes"></iframe>
      </div>
    </div>
  `;

  const listIframe = document.getElementById('list-iframe');
  const detailIframe = document.getElementById('detail-iframe');

  // ✅ استرجاع آخر منتج تم عرضه
  const lastViewedProductId = sessionStorage.getItem('last_viewed_product_id');
  if (lastViewedProductId) {
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(lastViewedProductId)}`;
  }

  // ✅ مستمع الرسائل (سرعة البرق)
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // عند اختيار منتج من القائمة
    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      sessionStorage.setItem('last_viewed_product_id', data.productId);
      detailIframe.src = `/products/detail.html?id=${encodeURIComponent(data.productId)}`;
    }

    // عند حفظ منتج جديد (تحديث القائمة)
    if (data.type === 'NEW_PRODUCT_SAVED') {
      if (listIframe && listIframe.contentWindow) {
        listIframe.contentWindow.postMessage({ type: 'REFRESH_PRODUCTS' }, '*');
      }
    }
  });
});