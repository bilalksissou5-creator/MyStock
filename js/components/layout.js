// ============================================
// الهيكل المشترك (Header + Sidebar)
// ✅ تحديث: استخدام iframe لمنع إعادة تحميل الصفحة
// ✅ إصلاح المسافات المزدوجة (تغيير كلاس الإطار)
// ============================================

const ALLOWED_PAGES = [
  'payment.html', 'bank-card.html', 'login.html', 'subscription.html',
  'welcome.html', 'register.html', 'register-worker.html', 'index.html',
  'join.html', '',
];

async function autoCheckPaymentBlock() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (ALLOWED_PAGES.includes(currentPage)) return;
  try {
    if (typeof db === 'undefined') return;
    
    const { data: { session } } = await db.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    const { data: profile } = await db.from('profiles').select('role, organization_id, bank_card_last4, bank_card_active, bank_card_deactivated_at, card_warning_sent, full_name').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin' || !profile.organization_id) return;
    
    if (profile.bank_card_last4) {
      if (profile.bank_card_active === false && profile.bank_card_deactivated_at) {
        const elapsed = Date.now() - new Date(profile.bank_card_deactivated_at).getTime();
        
        if (elapsed >= 3 * 24 * 60 * 60 * 1000) {
            window.location.replace('/bank-card.html?blocked=1');
            return;
        }

        const warningSent = profile.card_warning_sent || 0;
        let newWarningLevel = 0;
        let warningTitle = '';
        let warningMsg = '';

        if (elapsed >= 2.5 * 24 * 60 * 60 * 1000 && warningSent < 2) {
            newWarningLevel = 2;
            warningTitle = window.t ? window.t('warn_title_3') : '🚨 تبقى 12 ساعة';
            warningMsg = window.t ? window.t('warn_msg_3') : 'تبقى 12 ساعة فقط! أعد تفعيل البطاقة أو أضف بطاقة جديدة الآن.';
        } else if (elapsed >= 1 * 24 * 60 * 60 * 1000 && warningSent < 1) {
            newWarningLevel = 1;
            warningTitle = window.t ? window.t('warn_title_2') : '🔔 تبقى يومان';
            warningMsg = window.t ? window.t('warn_msg_2') : 'مرّ يوم على إلغاء تفعيل البطاقة. تبقى يومان قبل إيقاف التطبيق.';
        }

        if (newWarningLevel > warningSent) {
             if (typeof notifyOrganization === 'function') {
                 notifyOrganization({
                     orgId: profile.organization_id,
                     title: warningTitle,
                     message: warningMsg,
                     type: 'warning',
                     link: '/bank-card.html',
                     userName: profile.full_name
                 }).then(() => {
                     db.from('profiles').update({ card_warning_sent: newWarningLevel }).eq('id', user.id);
                 });
             }
        }
      }
      return;
    }
    const { data: sub } = await db.from('subscriptions').select('status, started_at').eq('organization_id', profile.organization_id).maybeSingle();
    if (sub?.status === 'active' && sub.started_at) {
      if (Date.now() - new Date(sub.started_at).getTime() >= 3 * 24 * 60 * 60 * 1000) window.location.replace('/bank-card.html?blocked=1');
    }
  } catch (err) { console.error(err); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoCheckPaymentBlock);
else autoCheckPaymentBlock();

function renderLayout(activePage) {
  if (window.self !== window.top) {
    document.documentElement.classList.add('in-iframe');
    const app = document.querySelector('.app');
    if (app) app.innerHTML = `<main class="main" id="main-content"></main>`;
    return;
  }

  const tr = (key) => (window.t ? window.t(key) : key);
  
  const navItems = [
    { href: '/dashboard.html', labelKey: 'nav_dashboard', icon: 'fa-house' },
    { href: '/products/add-workspace.html', labelKey: 'nav_add_product', icon: 'fa-circle-plus' },
    { href: '/movements/out-workspace.html', labelKey: 'nav_out_product', icon: 'fa-circle-minus' },
    { href: '/products/list.html', labelKey: 'nav_products', icon: 'fa-box' },
    { href: '/movements/list.html', labelKey: 'nav_movements', icon: 'fa-right-left' },
    { href: '/workers/list.html', labelKey: 'nav_workers', icon: 'fa-users' },
    { href: '/suppliers/list.html', labelKey: 'nav_suppliers', icon: 'fa-truck' },
    { href: '/invoices/list.html', labelKey: 'nav_invoices', icon: 'fa-file-invoice' },
    { href: '/settings.html', labelKey: 'nav_settings', icon: 'fa-gear' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" target="content-frame" class="nav-item ${activePage === item.href ? 'active' : ''}">
      <i class="fas ${item.icon}"></i>
      <span data-i18n="${item.labelKey}">${tr(item.labelKey)}</span>
    </a>
  `).join('');

  const currentPath = window.location.pathname + window.location.search;

  const layout = `
    <header class="header">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle"><i class="fas fa-bars"></i></button>
      <a href="/notifications.html" target="content-frame" class="notif" id="notif-btn"><i class="fas fa-bell"></i><span class="notif-count" id="notif-count">0</span></a>
      <div class="search">
        <i class="fas fa-search"></i>
        <input type="text" id="global-search-input" data-i18n-placeholder="nav_search" placeholder="${tr('nav_search')}" autocomplete="off">
        <div class="global-search-dropdown" id="global-search-dropdown"></div>
      </div>
      <h1 class="logo">MyStock</h1>
    </header>
    <div class="body" id="app-body">
      <aside class="sidebar" id="app-sidebar">
        <nav class="nav">${navHTML}</nav>
        <div class="sidebar-footer">
          <a href="/profile.html" target="content-frame" class="nav-item ${activePage === '/profile.html' ? 'active' : ''}"><i class="fas fa-user"></i><span data-i18n="nav_profile">${tr('nav_profile')}</span></a>
          <button class="nav-item logout" id="logout-btn"><i class="fas fa-right-from-bracket"></i><span data-i18n="nav_logout">${tr('nav_logout')}</span></button>
        </div>
      </aside>
      
      <!-- ✅ تم تغيير الكلاس إلى main-iframe لإزالة المسافات المزدوجة -->
      <iframe class="main-iframe" id="main-content" name="content-frame" src="${currentPath}"></iframe>
      
    </div>
  `;

  const app = document.querySelector('.app');
  if (app) app.innerHTML = layout;

  if (window.applyLanguage) window.applyLanguage();

  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      if (typeof logout === 'function') await logout();
      else { await db.auth.signOut(); window.location.href = '/'; }
    });
  });

  const toggleBtn = document.getElementById('sidebar-toggle');
  const bodyEl = document.getElementById('app-body');
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  const applySidebarState = () => {
    if (isMobile()) {
      bodyEl.classList.remove('sidebar-mini');
      bodyEl.classList.add('sidebar-hidden-mobile');
    } else {
      bodyEl.classList.remove('sidebar-hidden-mobile', 'sidebar-closed');
      const isMini = localStorage.getItem('sidebar_mini') === 'true';
      if (isMini) bodyEl.classList.add('sidebar-mini');
      else bodyEl.classList.remove('sidebar-mini');
    }
  };

  applySidebarState();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMobile()) {
        bodyEl.classList.toggle('sidebar-hidden-mobile');
      } else {
        bodyEl.classList.toggle('sidebar-mini');
        localStorage.setItem('sidebar_mini', bodyEl.classList.contains('sidebar-mini'));
      }
    });
  }

  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (link.id === 'logout-btn') return;

      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      link.classList.add('active');

      if (isMobile()) {
        bodyEl.classList.add('sidebar-hidden-mobile');
      } else {
        bodyEl.classList.add('sidebar-mini');
        localStorage.setItem('sidebar_mini', 'true');
      }
    });
  });

  if (typeof startNotifPolling === 'function') startNotifPolling();
  initGlobalSearch();
}

// ============================================
// ✅ البحث الذكي الشامل
// ============================================
async function initGlobalSearch() {
  const input = document.getElementById('global-search-input');
  const dropdown = document.getElementById('global-search-dropdown');
  if (!input || !dropdown) return;
  if (input.dataset.searchReady === '1') return;
  input.dataset.searchReady = '1';

  const tr = (key, fallback) => {
    if (window.t) {
      const v = window.t(key);
      if (v && v !== key) return v;
    }
    return fallback || key;
  };

  let debounceTimer = null;
  let activeIndex = -1;
  let currentQuery = '';

  function normArabic(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')   
      .replace(/[أإآٱ]/g, 'ا')                  
      .replace(/ة/g, 'ه')                        
      .replace(/ى/g, 'ي')                        
      .replace(/ؤ/g, 'و')                        
      .replace(/ئ/g, 'ي')                        
      .replace(/ـ/g, '')                         
      .replace(/[^\w\u0600-\u06FF\s]/g, ' ')    
      .replace(/\s+/g, ' ')
      .trim();
  }

  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const hideDropdown = () => {
    dropdown.classList.remove('show');
    activeIndex = -1;
  };

  function scoreMatch(normQuery, text) {
    if (!text) return 0;
    const normText = normArabic(text);
    if (!normText || !normQuery) return 0;

    if (normText === normQuery) return 100;              
    if (normText.startsWith(normQuery)) return 85;       

    const words = normText.split(' ');
    if (words.some(w => w === normQuery)) return 80;     
    if (words.some(w => w.startsWith(normQuery))) return 70; 

    if (normText.includes(normQuery)) return 50;         

    if (/^[a-z0-9]+$/.test(normQuery) && normQuery.length >= 3) {
      if (Math.abs(normText.length - normQuery.length) <= 3) {
        let i = 0;
        for (const ch of normText) {
          if (ch === normQuery[i]) i++;
          if (i === normQuery.length) return 30;
        }
      }
    }

    return 0;
  }

  const HISTORY_KEY = 'global_search_history_v1';
  const MAX_HISTORY = 5;

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveToHistory(query) {
    const q = query.trim();
    if (q.length < 2) return;
    let h = getHistory().filter(x => normArabic(x) !== normArabic(q));
    h.unshift(q);
    h = h.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  function showHistory() {
    const h = getHistory();
    if (!h.length) return;

    let html = `<div class="search-result-group">
      <div class="search-result-group-title">${tr('search_recent', 'عمليات البحث الأخيرة')}</div>`;

    h.forEach(q => {
      html += `<div class="search-result-item search-history-item" data-query="${escapeHtml(q)}">
        <div class="search-result-icon" style="background:#f3f4f6;color:#6b7280;"><i class="fas fa-history"></i></div>
        <div class="search-result-info">
          <div class="search-result-title">${escapeHtml(q)}</div>
        </div>
        <i class="fas fa-arrow-left" style="color:#d4d4d4;font-size:12px;"></i>
      </div>`;
    });
    html += `</div>`;
    dropdown.innerHTML = html;
    dropdown.classList.add('show');

    dropdown.querySelectorAll('.search-history-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = el.dataset.query;
        performSearch(el.dataset.query);
      });
    });
  }

  function highlight(text, query) {
    if (!text) return '';
    const esc = escapeHtml(text);
    if (!query) return esc;

    const normQ = normArabic(query);
    if (!normQ) return esc;

    const origQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!origQ) return esc;

    try {
      return esc.replace(new RegExp(origQ, 'gi'), m =>
        `<mark style="background:#fef08a;color:inherit;padding:0 2px;border-radius:2px;">${m}</mark>`
      );
    } catch (e) {
      return esc;
    }
  }

  function renderResults(groups) {
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    if (total === 0) {
      dropdown.innerHTML = `<div class="search-no-results">
        <i class="fas fa-search" style="display:block;font-size:24px;color:#d4d4d4;margin-bottom:8px;"></i>
        ${tr('search_no_results', 'لا توجد نتائج لـ')} "${escapeHtml(currentQuery)}"
      </div>`;
      dropdown.classList.add('show');
      return;
    }

    let html = '';
    groups.forEach(g => {
      if (!g.items.length) return;
      html += `<div class="search-result-group"><div class="search-result-group-title">${g.title}</div>`;
      g.items.forEach(item => {
        html += `<a href="${escapeHtml(item.url)}" target="content-frame" class="search-result-item" style="text-decoration:none; color:inherit;">
          <div class="search-result-icon ${item.type}"><i class="fas ${item.icon}"></i></div>
          <div class="search-result-info">
            <div class="search-result-title">${item.highlighted}</div>
            <div class="search-result-subtitle">${escapeHtml(item.subtitle || '')}</div>
          </div>
        </a>`;
      });
      html += `</div>`;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('show');
    activeIndex = -1;

    // ✅ تصحيح: استخدام iframe.src بدلاً من window.location.href
    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        const url = el.getAttribute('href');
        if (url) {
          saveToHistory(currentQuery);
          hideDropdown();
          
          const iframe = document.getElementById('main-content');
          if (iframe) iframe.src = url;

          document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
          const bodyEl = document.getElementById('app-body');
          if (bodyEl && !window.matchMedia('(max-width: 768px)').matches) {
            bodyEl.classList.add('sidebar-mini');
            localStorage.setItem('sidebar_mini', 'true');
          } else if (bodyEl) {
            bodyEl.classList.add('sidebar-hidden-mobile');
          }
        }
      });
    });
  }

  async function performSearch(query) {
    const q = query.trim();
    const normQ = normArabic(q);

    if (normQ.length < 1) { hideDropdown(); return; }

    currentQuery = q;
    dropdown.innerHTML = `<div class="search-loading"><i class="fas fa-spinner fa-spin"></i></div>`;
    dropdown.classList.add('show');

    try {
      const { data: { user: authUser } } = await db.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await db.from('profiles')
        .select('organization_id, role')
        .eq('id', authUser.id)
        .single();
      if (!profile?.organization_id) return;

      const orgId = profile.organization_id;
      const canSeeWorkers = profile.role === 'admin' || profile.role === 'deputy';

      const safeQ = q.replace(/[%_,()]/g, '').trim();
      if (!safeQ) { hideDropdown(); return; }

      const term = `%${safeQ}%`;
      const isNumericQuery = /^\d{4,}$/.test(safeQ);

      const [productsRes, suppliersRes, invoicesRes, receiptsRes, workersRes, barcodesRes] = await Promise.all([
        db.from('products')
          .select('id, name, sku, qty, category, price')
          .eq('organization_id', orgId)
          .or(`name.ilike.${term},sku.ilike.${term},category.ilike.${term}`)
          .limit(15),
        db.from('suppliers')
          .select('id, name, specialty, phone')
          .eq('organization_id', orgId)
          .or(`name.ilike.${term},specialty.ilike.${term},phone.ilike.${term}`)
          .limit(10),
        db.from('invoices')
          .select('id, invoice_number, created_at')
          .eq('organization_id', orgId)
          .ilike('invoice_number', term)
          .limit(10),
        db.from('receipts')
          .select('id, receipt_number, created_at')
          .eq('organization_id', orgId)
          .ilike('receipt_number', term)
          .limit(10),
        canSeeWorkers
          ? db.from('profiles')
              .select('id, full_name, role, phone')
              .eq('organization_id', orgId)
              .or(`full_name.ilike.${term},phone.ilike.${term}`)
              .limit(10)
          : Promise.resolve({ data: [] }),
        isNumericQuery
          ? db.from('product_barcodes')
              .select('product_id, barcode')
              .eq('organization_id', orgId)
              .ilike('barcode', term)
              .limit(10)
          : Promise.resolve({ data: [] })
      ]);

      const productMap = new Map();
      (productsRes.data || []).forEach(p => {
        productMap.set(p.id, { ...p, _scores: [] });
      });

      const missingIds = (barcodesRes.data || [])
        .map(b => b.product_id)
        .filter(id => !productMap.has(id));

      if (missingIds.length > 0) {
        const { data: extraProducts } = await db.from('products')
          .select('id, name, sku, qty, category, price')
          .in('id', missingIds);
        (extraProducts || []).forEach(p => {
          productMap.set(p.id, { ...p, _scores: [], _viaBarcode: true });
        });
      }

      const scoredProducts = [];
      for (const p of productMap.values()) {
        const scores = [
          scoreMatch(normQ, p.name) * 1.0,
          scoreMatch(normQ, p.sku) * 0.9,
          scoreMatch(normQ, p.category || '') * 0.6,
        ];

        if (p._viaBarcode) {
          scores.push(scoreMatch(normQ, (barcodesRes.data || [])
            .find(b => b.product_id === p.id)?.barcode || '') * 0.9);
        }

        const best = Math.max(...scores);
        if (best > 0) {
          scoredProducts.push({ ...p, score: best });
        }
      }
      scoredProducts.sort((a, b) => b.score - a.score);
      const topProducts = scoredProducts.slice(0, 5);

      const scoredSuppliers = (suppliersRes.data || [])
        .map(s => ({
          ...s,
          score: Math.max(
            scoreMatch(normQ, s.name) * 1.0,
            scoreMatch(normQ, s.specialty || '') * 0.6,
            scoreMatch(normQ, s.phone || '') * 0.7,
          ),
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const topInvoices = (invoicesRes.data || []).slice(0, 3);
      const topReceipts = (receiptsRes.data || []).slice(0, 3);
      const topWorkers = (workersRes.data || []).slice(0, 3);

      const groups = [];

      if (topProducts.length) {
        groups.push({
          title: tr('search_group_products', 'المنتجات'),
          items: topProducts.map(p => ({
            type: 'product',
            icon: 'fa-box',
            highlighted: highlight(p.name, q),
            subtitle: `${p.sku || '—'} • ${p.qty ?? 0}`,
            url: `/products/detail.html?id=${p.id}`,
          })),
        });
      }

      if (scoredSuppliers.length) {
        groups.push({
          title: tr('search_group_suppliers', 'الموردون'),
          items: scoredSuppliers.map(s => ({
            type: 'supplier',
            icon: 'fa-truck',
            highlighted: highlight(s.name, q),
            subtitle: s.specialty || s.phone || '',
            url: `/suppliers/detail.html?id=${s.id}`,
          })),
        });
      }

      if (topInvoices.length) {
        groups.push({
          title: tr('search_group_invoices', 'الفواتير'),
          items: topInvoices.map(inv => ({
            type: 'invoice',
            icon: 'fa-file-invoice',
            highlighted: highlight(inv.invoice_number, q),
            subtitle: new Date(inv.created_at).toLocaleDateString(),
            url: `/invoice.html?id=${encodeURIComponent(inv.invoice_number)}`,
          })),
        });
      }

      if (topReceipts.length) {
        groups.push({
          title: tr('search_group_receipts', 'الإيصالات'),
          items: topReceipts.map(r => ({
            type: 'receipt',
            icon: 'fa-receipt',
            highlighted: highlight(r.receipt_number, q),
            subtitle: new Date(r.created_at).toLocaleDateString(),
            url: `/receipt.html?id=${r.id}`,
          })),
        });
      }

      if (topWorkers.length) {
        groups.push({
          title: tr('search_group_workers', 'العمال'),
          items: topWorkers.map(w => ({
            type: 'worker',
            icon: 'fa-user',
            highlighted: highlight(w.full_name, q),
            subtitle: (w.role === 'admin' ? tr('mp_role_admin', 'مدير') : tr('wk_role_worker', 'عامل')) + (w.phone ? ` • ${w.phone}` : ''),
            url: `/member-profile.html?id=${w.id}`,
          })),
        });
      }

      if (groups.length === 0 && safeQ.length > 3) {
        const shortQ = safeQ.slice(0, Math.max(3, Math.floor(safeQ.length * 0.6)));
        return performShortSearch(shortQ, q, orgId, canSeeWorkers, groups);
      }

      renderResults(groups);
    } catch (err) {
      console.error('Search error:', err);
      dropdown.innerHTML = `<div class="search-no-results">${tr('search_error', 'خطأ في البحث')}</div>`;
    }
  }

  async function performShortSearch(shortQ, originalQuery, orgId, canSeeWorkers, existingGroups) {
    try {
      const term = `%${shortQ}%`;
      const { data: products } = await db.from('products')
        .select('id, name, sku, qty')
        .eq('organization_id', orgId)
        .or(`name.ilike.${term},sku.ilike.${term}`)
        .limit(5);

      if (products?.length) {
        existingGroups.push({
          title: tr('search_group_products', 'المنتجات') + ` (${tr('search_approx', 'قد تقصد')})`,
          items: products.map(p => ({
            type: 'product',
            icon: 'fa-box',
            highlighted: highlight(p.name, originalQuery),
            subtitle: `${p.sku || '—'} • ${p.qty ?? 0}`,
            url: `/products/detail.html?id=${p.id}`,
          })),
        });
      }
      renderResults(existingGroups);
    } catch (e) {
      renderResults(existingGroups);
    }
  }

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value;

    if (q.trim().length === 0) {
      showHistory();
      return;
    }

    if (q.trim().length < 1) { hideDropdown(); return; }

    debounceTimer = setTimeout(() => performSearch(q), 250);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length === 0) {
      showHistory();
    } else if (input.value.trim().length >= 1) {
      performSearch(input.value);
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.search')) hideDropdown();
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.search-result-item');
    if (e.key === 'Escape') { hideDropdown(); input.blur(); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      activeIndex = (activeIndex + 1) % items.length;
      items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[activeIndex] || items[0];
      if (target) {
        const url = target.getAttribute('href');
        if (url) {
          saveToHistory(currentQuery || input.value);
          hideDropdown();
          
          const iframe = document.getElementById('main-content');
          if (iframe) iframe.src = url;
          
          document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
          const bodyEl = document.getElementById('app-body');
          if (bodyEl && !window.matchMedia('(max-width: 768px)').matches) {
            bodyEl.classList.add('sidebar-mini');
            localStorage.setItem('sidebar_mini', 'true');
          }
        } else if (target.dataset.query) {
          input.value = target.dataset.query;
          performSearch(target.dataset.query);
        }
      }
    }
  });

  input.value = '';
}

// ============================================
// ✅ محرك التنبيهات (نغمات متعددة + اهتزاز)
// ============================================
window.__audioCtx = null;

function unlockAudio() {
  if (!window.__audioCtx) {
    try {
      window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔊 AudioContext created:', window.__audioCtx.state);
    } catch (e) { console.warn("Audio init failed:", e); return; }
  }
  if (window.__audioCtx.state === 'suspended') {
    window.__audioCtx.resume().then(() => {
      console.log('🔊 AudioContext resumed:', window.__audioCtx.state);
    });
  }
}

['click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { passive: true });
});

window.playNotificationAlerts = async function() {
  console.log('🎵 playNotificationAlerts called');
  
  const masterOn = localStorage.getItem('notif_master') !== 'false';
  const soundOn = localStorage.getItem('notif_sound') !== 'false';
  const vibrateOn = localStorage.getItem('notif_vibrate') !== 'false';
  const selectedTone = localStorage.getItem('notif_tone') || 'default';
  
  console.log('⚙️ Settings:', { masterOn, soundOn, vibrateOn, selectedTone });
  
  if (!masterOn) {
    console.log('⏸️ Master switch OFF, skipping');
    return;
  }

  if (soundOn && selectedTone !== 'none') {
    try {
      if (!window.__audioCtx) {
        window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (window.__audioCtx.state === 'suspended') {
        await window.__audioCtx.resume();
      }
      
      const now = window.__audioCtx.currentTime;
      const osc = window.__audioCtx.createOscillator();
      const gain = window.__audioCtx.createGain();
      osc.connect(gain);
      gain.connect(window.__audioCtx.destination);

      if (selectedTone === 'default') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      } 
      else if (selectedTone === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
      }
      else if (selectedTone === 'alert') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        for (let i = 0; i < 3; i++) {
          osc.start(now + (i * 0.2));
          osc.stop(now + (i * 0.2) + 0.1);
        }
      }
      else if (selectedTone === 'bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now); osc.stop(now + 1.2);
      }
      console.log('🎵 Sound played successfully:', selectedTone);
    } catch (e) { 
      console.error("❌ Sound error:", e); 
    }
  }

  if (vibrateOn && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
    console.log('📳 Vibration triggered');
  }
};

// ============================================
// ✅ دعم التنقل الذكي في التطبيق المثبت (PWA)
// ============================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'NAVIGATE') {
      window.location.href = event.data.url;
    }
  });
}

if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  if (!window.history.state || !window.history.state.isAppRoot) {
    window.history.pushState({ isAppRoot: true }, '', window.location.href);
  }

  window.addEventListener('popstate', (e) => {
    if (!e.state || !e.state.isAppRoot) {
      const currentPath = window.location.pathname;
      
      if (!currentPath.includes('notifications.html') && !currentPath.includes('dashboard.html') && currentPath !== '/' && !currentPath.includes('index.html')) {
        window.location.href = '/notifications.html';
      }
    }
  });
}