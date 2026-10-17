// ============================================
// صفحة إضافة منتجات
// ✅ دعم كامل للترجمة
// ✅ دعم Workspace (تقسيم 3 أقسام + تفاصيل المنتج)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__productAddLoaded) return;
  window.__productAddLoaded = true;

  const user = await requireAuth();
  if (!user) return;

  renderLayout('products/add.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('prod_add_title_full');

  const main = document.getElementById('main-content');

  const { data: suppliers } = await db
    .from('suppliers')
    .select('*')
    .order('name');

  main.innerHTML = `
    <div class="workspace">

      <!-- ═══════════════════════════════════════
           القسم الأول (25%): جميع عناصر إضافة المنتج
           ═══════════════════════════════════════ -->
      <div class="workspace-panel workspace-panel-left">

        <div class="page-header">
          <h2>${tr('prod_add_title')}</h2>
          <button type="button" class="btn-primary scan-btn" id="scan-btn">
            <i class="fas fa-barcode"></i>
            <span>${tr('prod_add_scan')}</span>
          </button>
        </div>

        <div class="alert alert-error" id="form-error" style="display:none;"></div>
        <div class="alert alert-success" id="form-success" style="display:none;"></div>

        <div class="add-form">

          <div class="product-input-card card-supplier">
            <div class="form-group supplier-group">
              <label>${tr('prod_add_supplier')}</label>
              <input type="text" id="supplier-input" placeholder="${tr('prod_add_supplier_ph')}" autocomplete="off">
              <div id="supplier-suggestions" class="suggestions-box"></div>
              <input type="hidden" id="supplier_id">
            </div>
          </div>

          <div class="product-input-card card-fields">
            <div class="form-grid">
              <div class="form-group">
                <label>${tr('prod_add_name')}</label>
                <input type="text" id="product-name" placeholder="${tr('prod_add_name_ph')}">
              </div>
              <div class="form-group">
                <label>${tr('prod_add_qty')}</label>
                <input type="number" id="product-qty" value="1" min="1">
              </div>
              <div class="form-group">
                <label>${tr('prod_add_price')}</label>
                <input type="number" id="product-price" value="0" min="0" step="0.01">
              </div>
            </div>

            <div class="form-group">
              <label>${tr('prod_add_category')}</label>
              <input type="text" id="product-category" placeholder="${tr('prod_add_category_ph')}">
            </div>

            <div class="form-group">
              <label>${tr('prod_add_barcode')}</label>
              <input type="text" id="product-sku" placeholder="${tr('prod_add_barcode_ph')}" dir="ltr">
            </div>

            <button type="button" class="btn-primary add-product-btn" id="done-btn">
              <i class="fas fa-check"></i>
              <span>${tr('prod_add_done')}</span>
            </button>
          </div>

          <div class="added-products-section card-added">
            <label class="section-label">${tr('prod_add_added')}</label>
            <div id="added-products" class="added-products">
              <div class="empty-added">
                <i class="fas fa-box-open"></i>
                <p>${tr('prod_add_empty')}</p>
              </div>
            </div>
          </div>

          <div class="form-summary card-summary">
            <div class="summary-row">
              <span>${tr('prod_add_sum_count')}</span>
              <strong id="sum-rows">0</strong>
            </div>
            <div class="summary-row">
              <span>${tr('prod_add_sum_qty')}</span>
              <strong id="sum-qty">0</strong>
            </div>
            <div class="summary-row highlight">
              <span>${tr('prod_add_sum_total')}</span>
              <strong id="sum-total">0.00</strong>
            </div>
          </div>

          <div class="form-actions card-actions">
            <button type="button" class="btn-primary" id="save-all-btn">
              <i class="fas fa-save"></i>
              <span>${tr('prod_add_save')}</span>
            </button>
            <a href="/products/list.html" class="btn-secondary">${tr('prod_add_cancel')}</a>
          </div>

        </div>

      </div>

      <!-- ═══════════════════════════════════════
           القسم الثاني (50%): قائمة المنتجات (iframe)
           ═══════════════════════════════════════ -->
      <div class="workspace-panel workspace-panel-center">
        <iframe
          src="/products/list.html"
          class="workspace-iframe"
          id="products-list-iframe"
          title="Products List"
          loading="lazy"
          scrolling="yes"
        ></iframe>
      </div>

      <!-- ═══════════════════════════════════════
           القسم الثالث (25%): تفاصيل المنتج (iframe)
           ═══════════════════════════════════════ -->
      <div class="workspace-panel workspace-panel-right">
        <iframe
          src="about:blank"
          class="workspace-iframe workspace-iframe-detail"
          id="product-detail-iframe"
          title="Product Details"
          scrolling="yes"
        ></iframe>
      </div>

    </div>

    <div class="scanner-modal" id="scanner-modal" style="display:none;">
      <div class="scanner-box">
        <div class="scanner-header">
          <h3>${tr('prod_add_scan_title')}</h3>
          <button type="button" class="scanner-close" id="scanner-close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div id="scanner-reader" class="scanner-reader"></div>
        <p class="scanner-hint" id="scanner-hint">${tr('prod_add_scan_hint')}</p>
      </div>
    </div>
  `;

  const addedProducts = [];
  const supplierInput = document.getElementById('supplier-input');
  const supplierIdInput = document.getElementById('supplier_id');
  const suggestions = document.getElementById('supplier-suggestions');
  const addedContainer = document.getElementById('added-products');
  const nameInput = document.getElementById('product-name');
  const qtyInput = document.getElementById('product-qty');
  const priceInput = document.getElementById('product-price');
  const categoryInput = document.getElementById('product-category');
  const skuInput = document.getElementById('product-sku');
  const doneBtn = document.getElementById('done-btn');
  const saveAllBtn = document.getElementById('save-all-btn');
  const scanBtn = document.getElementById('scan-btn');
  const scannerModal = document.getElementById('scanner-modal');
  const scannerReader = document.getElementById('scanner-reader');
  const scannerClose = document.getElementById('scanner-close');
  const scannerHint = document.getElementById('scanner-hint');
  const detailIframe = document.getElementById('product-detail-iframe');
  const listIframe = document.getElementById('products-list-iframe');

  // ✅✅✅ إصلاح التمرير: حقن CSS داخل iframe التفاصيل بعد التحميل
  detailIframe.addEventListener('load', () => {
    try {
      const iframeDoc = detailIframe.contentDocument || detailIframe.contentWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          html, body { 
            height: 100% !important; 
            overflow: hidden !important; 
          }
          .app { 
            height: 100vh !important; 
            overflow: hidden !important; 
          }
          .body { 
            height: calc(100vh - 60px) !important; 
            overflow: hidden !important; 
          }
          .main { 
            height: 100% !important; 
            overflow-y: auto !important; 
            padding-bottom: 40px !important;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (e) {
      console.warn('لا يمكن الوصول لمحتوى iframe (ربما بسبب سياسة المصدر الواحد)', e);
    }
  });

  let selectedSupplier = null;
  let isAddingProduct = false;
  let isSaving = false;
  let html5QrCode = null;
  let scannedImageUrl = null;

  function showProductDetails(productId) {
    if (!productId) return;
    detailIframe.src = `/products/detail.html?id=${encodeURIComponent(productId)}`;
  }

  async function loadLatestProductInDetail() {
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        const { data: latest } = await db
          .from('products')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest?.id) {
          showProductDetails(latest.id);
        }
      }
    } catch (e) {
      console.error('خطأ في جلب آخر منتج:', e);
    }
  }

  setTimeout(loadLatestProductInDetail, 500);

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'PRODUCT_SELECTED' && data.productId) {
      showProductDetails(data.productId);
    }

    if (data.type === 'PRODUCT_DELETED') {
      if (listIframe) listIframe.src = listIframe.src;
      detailIframe.src = 'about:blank';
    }
  });

  // ... باقي الكود كما هو (دوال المورد، الماسح، الحفظ، إلخ)
  // (لقد اختصرتها هنا للتركيز على التعديل، ولكن تأكد من نسخها من الملف السابق إن لم تكن موجودة)