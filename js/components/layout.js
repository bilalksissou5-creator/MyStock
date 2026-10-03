// ============================================
// الهيكل المشترك (Header + Sidebar)
// الدور: يُنشئ الواجهة المشتركة في كل الصفحات
// ✅ سلوك Drawer في الموبايل
// ============================================
function renderLayout(activePage) {
  const navItems = [
    { href: '/dashboard.html', label: 'لوحة التحكم', icon: 'fa-house' },
    { href: '/products/add.html', label: 'إضافة منتج', icon: 'fa-circle-plus' },
    { href: '/movements/out.html', label: 'إخراج منتج', icon: 'fa-circle-minus' },
    { href: '/products/list.html', label: 'المنتجات', icon: 'fa-box' },
    { href: '/movements/list.html', label: 'الحركات', icon: 'fa-right-left' },
    { href: '/workers/list.html', label: 'العمال', icon: 'fa-users' },
    { href: '/suppliers/list.html', label: 'الموردون', icon: 'fa-truck' },
    { href: '/invoices/list.html', label: 'الفواتير', icon: 'fa-file-invoice' },
    { href: '/settings.html', label: 'الإعدادات', icon: 'fa-gear' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.href ? 'active' : ''}">
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join('');

  const layout = `
    <header class="header">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" title="القائمة">
        <i class="fas fa-bars"></i>
      </button>
      <a href="/notifications.html" class="notif" id="notif-btn" title="الإشعارات">
        <i class="fas fa-bell"></i>
        <span class="notif-count" id="notif-count">0</span>
      </a>
      <div class="search">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="بحث...">
      </div>
      <h1 class="logo">MyStock</h1>
    </header>

    <div class="body" id="app-body">
      <aside class="sidebar" id="app-sidebar">
        <nav class="nav">
          ${navHTML}
        </nav>

        <div class="sidebar-footer">
          <a href="/profile.html" class="nav-item ${activePage === '/profile.html' ? 'active' : ''}">
            <i class="fas fa-user"></i>
            <span>الملف الشخصي</span>
          </a>
          <button class="nav-item logout" id="logout-btn">
            <i class="fas fa-right-from-bracket"></i>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
      <main class="main" id="main-content"></main>
    </div>

    <!-- ✅ خلفية معتمة للموبايل -->
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  `;

  const app = document.querySelector('.app');
  if (app) app.innerHTML = layout;

  // ✅ زر تسجيل الخروج
  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      if (typeof logout === 'function') {
        await logout();
      } else {
        await db.auth.signOut();
        window.location.href = '/login.html';
      }
    });
  });

  // ✅ مراجع العناصر
  const toggleBtn = document.getElementById('sidebar-toggle');
  const bodyEl = document.getElementById('app-body');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  // ✅ دالة: هل الموبايل؟
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  // ✅ فتح/إغلاق sidebar (Drawer في الموبايل / toggle في سطح المكتب)
  function toggleSidebar() {
    if (isMobile()) {
      bodyEl.classList.toggle('sidebar-open');
    } else {
      bodyEl.classList.toggle('sidebar-closed');
      const isClosed = bodyEl.classList.contains('sidebar-closed');
      localStorage.setItem('sidebar_closed', isClosed ? 'true' : 'false');
    }
  }

  // ✅ إغلاق sidebar
  function closeSidebar() {
    bodyEl.classList.remove('sidebar-open');
  }

  // ✅ زر ☰
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  // ✅ استرجاع الحالة (سطح المكتب فقط)
  if (!isMobile()) {
    const savedState = localStorage.getItem('sidebar_closed');
    if (savedState === 'true') {
      bodyEl.classList.add('sidebar-closed');
    }
  }

  // ✅ الضغط على أي رابط في sidebar → يُغلق (موبايل فقط)
  if (sidebar) {
    sidebar.querySelectorAll('a.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) closeSidebar();
      });
    });
  }

  // ✅ الضغط على الخلفية → يُغلق
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  // ✅ الضغط خارج sidebar → يُغلق (موبايل فقط)
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!bodyEl.classList.contains('sidebar-open')) return;

    // إذا كان الضغط داخل sidebar → تجاهل
    if (sidebar && sidebar.contains(e.target)) return;
    // إذا كان الضغط على زر ☰ → تجاهل
    if (toggleBtn && toggleBtn.contains(e.target)) return;

    closeSidebar();
  });

  // ✅ السحب (swipe) على sidebar → يُغلق (موبايل فقط)
  if (sidebar) {
    let touchStartX = 0;
    let touchEndX = 0;

    sidebar.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    sidebar.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      if (!isMobile()) return;
      const diff = touchEndX - touchStartX;
      // ✅ سحب لليسار (20px على الأقل) → إغلاق
      if (diff < -30) {
        closeSidebar();
      }
    }
  }

  // ✅ عند تغيير حجم الشاشة: نظّف الحالات
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      bodyEl.classList.remove('sidebar-open');
    }
  });

  // بدء تحديث عداد الإشعارات
  if (typeof startNotifPolling === 'function') {
    startNotifPolling();
  }
}