// ============================================
// الهيكل المشترك (Header + Sidebar)
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
    const { data: profile } = await db.from('profiles').select('role, organization_id, bank_card_last4, bank_card_active, bank_card_deactivated_at, card_warning_sent').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin' || !profile.organization_id) return;
    
    if (profile.bank_card_last4) {
      if (profile.bank_card_active === false && profile.bank_card_deactivated_at) {
        const elapsed = Date.now() - new Date(profile.bank_card_deactivated_at).getTime();
        if (elapsed >= 3 * 24 * 60 * 60 * 1000) window.location.replace('/bank-card.html?blocked=1');
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
  // ✅ إذا كنا داخل iframe، لا نبني الهيدر والسايدبار ونضيف كلاس in-iframe
  if (window.self !== window.top) {
    document.documentElement.classList.add('in-iframe');
    const app = document.querySelector('.app');
    if (app) app.innerHTML = `<main class="main" id="main-content"></main>`;
    return;
  }

  const tr = (key) => (window.t ? window.t(key) : key);
  const navItems = [
    { href: '/dashboard.html', label: tr('nav_dashboard'), icon: 'fa-house' },
    { href: '/products/add.html', label: tr('nav_add_product'), icon: 'fa-circle-plus' },
    { href: '/movements/out.html', label: tr('nav_out_product'), icon: 'fa-circle-minus' },
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

  const layout = `
    <header class="header">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle"><i class="fas fa-bars"></i></button>
      <a href="/notifications.html" class="notif" id="notif-btn"><i class="fas fa-bell"></i><span class="notif-count" id="notif-count">0</span></a>
      <div class="search"><i class="fas fa-search"></i><input type="text" placeholder="${tr('nav_search')}"></div>
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
}