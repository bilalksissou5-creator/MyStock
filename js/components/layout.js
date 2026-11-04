// ============================================
// الهيكل المشترك (Header + Sidebar)
// ✅ فحص تلقائي + تحذيرات + ترجمة كاملة
// ✅ دعم iframe (وضع Embed)
// ✅ محرك التنبيهات (نغمات متعددة + اهتزاز)
// ✅ البحث الذكي الشامل
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
    const { data: { user } } = await db.auth.getUser();
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
  // ✅ إذا كنا داخل iframe، اعرض Main فقط (لإخفاء الهيدر والسايدبار)
  if (window.self !== window.top) {
    document.documentElement.classList.add('in-iframe');
    const app = document.querySelector('.app');
    if (app) app.innerHTML = `<main class="main" id="main-content"></main>`;
    return;
  }

  const tr = (key) => (window.t ? window.t(key) : key);
  
  const navItems = [
    { href: '/dashboard.html', label: tr('nav_dashboard'), icon: 'fa-house' },
    { href: '/products/add-workspace.html', label: tr('nav_add_product'), icon: 'fa-circle-plus' },
    { href: '/movements/out-workspace.html', label: tr('nav_out_product'), icon: 'fa-circle-minus' },
    { href: '/products/list.html', label: tr('nav_products'), icon: 'fa-box' },
    { href: '/movements/list.html', label: tr('nav_movements'), icon: 'fa-right-left' },
    { href: '/workers/list.html', label: tr('nav_workers'), icon: 'fa-users' },
    { href: '/suppliers/list.html', label: tr('nav_suppliers'), icon: 'fa-truck' },
    { href: '/invoices/list.html', label: tr('nav_invoices'), icon: 'fa-file-invoice' },
    { href: '/settings.html', label: tr('nav_settings'), icon: 'fa-gear' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.href ? 'active' : ''}">
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join('');

  // ✅ البحث: أضفنا id و dropdown
  const layout = `
    <header class="header">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle"><i class="fas fa-bars"></i></button>
      <a href="/notifications.html" class="notif" id="notif-btn"><i class="fas fa-bell"></i><span class="notif-count" id="notif-count">0</span></a>
      <div class="search">
        <i class="fas fa-search"></i>
        <input type="text" id="global-search-input" placeholder="${tr('nav_search')}" autocomplete="off">
        <div class="global-search-dropdown" id="global-search-dropdown"></div>
      </div>
      <h1 class="logo">MyStock</h1>
    </header>
    <div class="body" id="app-body">
      <aside class="sidebar" id="app-sidebar">
        <nav class="nav">${navHTML}</nav>
        <div class="sidebar-footer">
          <a href="/profile.html" class="nav-item ${activePage === '/profile.html' ? 'active' : ''}"><i class="fas fa-user"></i><span>${tr('nav_profile')}</span></a>
          <button class="nav-item logout" id="logout-btn"><i class="fas fa-right-from-bracket"></i><span>${tr('nav_logout')}</span></button>
        </div>
      </aside>
      <main class="main" id="main-content"></main>
    </div>
  `;

  const app = document.querySelector('.app');
  if (app) app.innerHTML = layout;

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

  if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); if(isMobile()) bodyEl.classList.toggle('sidebar-hidden-mobile'); else bodyEl.classList.toggle('sidebar-closed'); });
  if (!isMobile()) { if (localStorage.getItem('sidebar_closed') === 'true') bodyEl.classList.add('sidebar-closed'); }
  else bodyEl.classList.add('sidebar-hidden-mobile');

  if (typeof startNotifPolling === 'function') startNotifPolling();

  // ✅ تفعيل البحث الذكي
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
  let lastResults = [];
  let activeIndex = -1;
  let currentQuery = '';

  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const hideDropdown = () => {
    dropdown.classList.remove('show');
    activeIndex = -1;
  };

  const highlight = (text, q) => {
    const esc = escapeHtml(text);
    if (!q) return esc;
    const eq = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return esc.replace(new RegExp(eq, 'gi'), m =>
      `<mark style="background:#fef08a;color:inherit;padding:0 2px;border-radius:2px;">${m}</mark>`
    );
  };

  function renderResults(groups) {
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    if (total === 0) {
      dropdown.innerHTML = `<div class="search-no-results">${tr('search_no_results', 'لا توجد نتائج لـ')} "${escapeHtml(currentQuery)}"</div>`;
      dropdown.classList.add('show');
      lastResults = [];
      return;
    }
    let html = '';
    lastResults = [];
    groups.forEach(g => {
      if (!g.items.length) return;
      html += `<div class="search-result-group"><div class="search-result-group-title">${g.title}</div>`;
      g.items.forEach(item => {
        const idx = lastResults.length;
        lastResults.push(item);
        html += `<div class="search-result-item" data-index="${idx}" data-url="${escapeHtml(item.url)}">
          <div class="search-result-icon ${item.type}"><i class="fas ${item.icon}"></i></div>
          <div class="search-result-info">
            <div class="search-result-title">${item.highlighted}</div>
            <div class="search-result-subtitle">${escapeHtml(item.subtitle || '')}</div>
          </div>
        </div>`;
      });
      html += `</div>`;
    });
    dropdown.innerHTML = html;
    dropdown.classList.add('show');
    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const url = el.dataset.url;
        if (url) window.location.href = url;
      });
    });
  }

  async function performSearch(query) {
    const q = query.trim();
    if (q.length < 2) { hideDropdown(); return; }
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
      const term = `%${q}%`;
      const canSeeWorkers = profile.role === 'admin' || profile.role === 'deputy';

      const [productsRes, suppliersRes, invoicesRes, receiptsRes, workersRes] = await Promise.all([
        db.from('products').select('id, name, sku, qty')
          .eq('organization_id', orgId)
          .or(`name.ilike.${term},sku.ilike.${term}`)
          .limit(5),
        db.from('suppliers').select('id, name, specialty')
          .eq('organization_id', orgId)
          .or(`name.ilike.${term},specialty.ilike.${term}`)
          .limit(3),
        db.from('invoices').select('id, invoice_number, created_at')
          .eq('organization_id', orgId)
          .ilike('invoice_number', term)
          .limit(3),
        db.from('receipts').select('id, receipt_number, created_at')
          .eq('organization_id', orgId)
          .ilike('receipt_number', term)
          .limit(3),
        canSeeWorkers
          ? db.from('profiles').select('id, full_name, role')
              .eq('organization_id', orgId)
              .ilike('full_name', term)
              .limit(3)
          : Promise.resolve({ data: [] })
      ]);

      const groups = [];

      if (productsRes.data?.length) {
        groups.push({
          title: tr('search_group_products', 'المنتجات'),
          items: productsRes.data.map(p => ({
            type: 'product', icon: 'fa-box',
            highlighted: highlight(p.name, q),
            subtitle: `${p.sku || '—'} • ${p.qty ?? 0}`,
            url: `/products/detail.html?id=${p.id}`,
          })),
        });
      }

      if (suppliersRes.data?.length) {
        groups.push({
          title: tr('search_group_suppliers', 'الموردون'),
          items: suppliersRes.data.map(s => ({
            type: 'supplier', icon: 'fa-truck',
            highlighted: highlight(s.name, q),
            subtitle: s.specialty || '',
            url: `/suppliers/detail.html?id=${s.id}`,
          })),
        });
      }

      if (invoicesRes.data?.length) {
        groups.push({
          title: tr('search_group_invoices', 'الفواتير'),
          items: invoicesRes.data.map(inv => ({
            type: 'invoice', icon: 'fa-file-invoice',
            highlighted: highlight(inv.invoice_number, q),
            subtitle: new Date(inv.created_at).toLocaleDateString(),
            url: `/invoice.html?id=${encodeURIComponent(inv.invoice_number)}`,
          })),
        });
      }

      if (receiptsRes.data?.length) {
        groups.push({
          title: tr('search_group_receipts', 'الإيصالات'),
          items: receiptsRes.data.map(r => ({
            type: 'receipt', icon: 'fa-receipt',
            highlighted: highlight(r.receipt_number, q),
            subtitle: new Date(r.created_at).toLocaleDateString(),
            url: `/receipt.html?id=${r.id}`,
          })),
        });
      }

      if (workersRes.data?.length) {
        groups.push({
          title: tr('search_group_workers', 'العمال'),
          items: workersRes.data.map(w => ({
            type: 'worker', icon: 'fa-user',
            highlighted: highlight(w.full_name, q),
            subtitle: w.role === 'admin' ? tr('mp_role_admin', 'مدير') : tr('wk_role_worker', 'عامل'),
            url: `/member-profile.html?id=${w.id}`,
          })),
        });
      }

      renderResults(groups);
    } catch (err) {
      console.error('Search error:', err);
      dropdown.innerHTML = `<div class="search-no-results">${tr('search_error', 'خطأ في البحث')}</div>`;
    }
  }

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value;
    if (q.trim().length < 2) { hideDropdown(); return; }
    debounceTimer = setTimeout(() => performSearch(q), 250);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && lastResults.length) dropdown.classList.add('show');
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
      if (target?.dataset.url) window.location.href = target.dataset.url;
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

// فك قفل الصوت عند أي تفاعل من المستخدم
['click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { passive: true });
});

// الدالة الرئيسية لتشغيل التنبيه (تقرأ النغمة المختارة)
window.playNotificationAlerts = async function() {
  console.log('🎵 playNotificationAlerts called');
  
  // قراءة الإعدادات من ذاكرة الهاتف
  const masterOn = localStorage.getItem('notif_master') !== 'false';
  const soundOn = localStorage.getItem('notif_sound') !== 'false';
  const vibrateOn = localStorage.getItem('notif_vibrate') !== 'false';
  const selectedTone = localStorage.getItem('notif_tone') || 'default';
  
  console.log('⚙️ Settings:', { masterOn, soundOn, vibrateOn, selectedTone });
  
  if (!masterOn) {
    console.log('⏸️ Master switch OFF, skipping');
    return;
  }

  // --- تشغيل الصوت ---
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

  // --- الاهتزاز ---
  if (vibrateOn && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
    console.log('📳 Vibration triggered');
  }
};