// ============================================
// الهيكل المشترك (Header + Sidebar)
// الدور: يُنشئ الواجهة المشتركة في كل الصفحات
// ✅ على الموبايل: sidebar مخفية افتراضياً + زر ☰ يفتح/يغلق
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

  // ✅ دالة: هل الموبايل؟
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  // ✅ فتح/إغلاق sidebar
  function toggleSidebar() {
    if (isMobile()) {
      // على الموبايل: sidebar مخفية بـ display
      bodyEl.classList.toggle('sidebar-hidden-mobile');
    } else {
      // على سطح المكتب: sidebar-closed
      bodyEl.classList.toggle('sidebar-closed');
      const isClosed = bodyEl.classList.contains('sidebar-closed');
      localStorage.setItem('sidebar_closed', isClosed ? 'true' : 'false');
    }
  }

  function closeSidebarMobile() {
    if (isMobile()) {
      bodyEl.classList.add('sidebar-hidden-mobile');
    }
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
  } else {
    // على الموبايل: مخفية افتراضياً
    bodyEl.classList.add('sidebar-hidden-mobile');
  }

  // ✅ الضغط على أي رابط في sidebar → يُغلق (موبايل فقط)
  if (sidebar) {
    sidebar.querySelectorAll('a.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) closeSidebarMobile();
      });
    });
  }

  // ✅ الضغط خارج sidebar → يُغلق (موبايل فقط)
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!bodyEl.classList.contains('sidebar-hidden-mobile') === false) {
      // sidebar مخفية → تجاهل
      return;
    }

    if (sidebar && sidebar.contains(e.target)) return;
    if (toggleBtn && toggleBtn.contains(e.target)) return;

    closeSidebarMobile();
  });

  // ✅ السحب (swipe) على sidebar → يُغلق (موبايل فقط)
  if (sidebar) {
    let touchStartX = 0;

    sidebar.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    sidebar.addEventListener('touchend', (e) => {
      if (!isMobile()) return;
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (diff < -30) closeSidebarMobile();
    }, { passive: true });
  }

  // ✅ تنظيف عند تغيير الحجم
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      bodyEl.classList.remove('sidebar-hidden-mobile');
    } else {
      bodyEl.classList.add('sidebar-hidden-mobile');
    }
  });

  // بدء تحديث عداد الإشعارات
  if (typeof startNotifPolling === 'function') {
    startNotifPolling();
  }
}