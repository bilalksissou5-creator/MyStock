// ============================================
// الهيكل المشترك (Header + Sidebar)
// ✅ فحص تلقائي + تحذيرات + ترجمة كاملة
// ✅ لا يحجب المستخدم الجديد بدون بطاقة
// ✅ دعم iframe (وضع Embed)
// ============================================

const ALLOWED_PAGES = [
  'payment.html',
  'bank-card.html',
  'login.html',
  'subscription.html',
  'welcome.html',
  'register.html',
  'register-worker.html',
  'index.html',
  'join.html',
  '',
];

// ═══════════════════════════════════════════
// ✅ فحص + تحذيرات + قفل
// ═══════════════════════════════════════════
async function autoCheckPaymentBlock() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (ALLOWED_PAGES.includes(currentPage)) return;

  try {
    if (typeof db === 'undefined') return;

    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    const { data: profile } = await db
      .from('profiles')
      .select('role, organization_id, bank_card_last4, bank_card_active, bank_card_deactivated_at, card_warning_sent')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    if (profile.role !== 'admin') return;
    if (!profile.organization_id) return;

    if (profile.bank_card_last4) {
      if (profile.bank_card_active === false && profile.bank_card_deactivated_at) {
        const deactivatedAt = new Date(profile.bank_card_deactivated_at).getTime();
        const now = Date.now();
        const elapsed = now - deactivatedAt;

        const DAY_MS = 24 * 60 * 60 * 1000;
        const daysElapsed = Math.floor(elapsed / DAY_MS);

        const currentWarning = profile.card_warning_sent ?? 0;

        if (elapsed >= 3 * DAY_MS) {
          window.location.replace('/bank-card.html?blocked=1');
          return;
        }

        if (daysElapsed >= 2 && currentWarning < 3) {
          if (elapsed >= 2 * DAY_MS + 12 * 60 * 60 * 1000) {
            await sendWarning(user.id, 3);
          }
        }
        else if (daysElapsed >= 1 && currentWarning < 2) {
          await sendWarning(user.id, 2);
        }
        else if (daysElapsed >= 0 && currentWarning < 1) {
          await sendWarning(user.id, 1);
        }
      }
      return;
    }

    const { data: sub } = await db
      .from('subscriptions')
      .select('status, started_at')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    if (sub?.status === 'active' && sub.started_at) {
      const startedAt = new Date(sub.started_at).getTime();
      const now = Date.now();
      const elapsed = now - startedAt;

      const DAY_MS = 24 * 60 * 60 * 1000;

      if (elapsed >= 3 * DAY_MS) {
        window.location.replace('/bank-card.html?blocked=1');
        return;
      }
    }
    return;

  } catch (err) {
    console.error('❌ autoCheckPaymentBlock error:', err);
  }
}

// ═══════════════════════════════════════════
// إرسال تحذير
// ═══════════════════════════════════════════
async function sendWarning(userId, level) {
  const tr = (key) => (window.t ? window.t(key) : key);

  const titles = {
    1: tr('warn_title_1'),
    2: tr('warn_title_2'),
    3: tr('warn_title_3'),
  };

  const messages = {
    1: tr('warn_msg_1'),
    2: tr('warn_msg_2'),
    3: tr('warn_msg_3'),
  };

  await db.from('notifications').insert({
    user_id: userId,
    title: titles[level],
    message: messages[level],
    type: level === 3 ? 'danger' : 'warning',
    link: '/bank-card.html',
  });

  await db
    .from('profiles')
    .update({ card_warning_sent: level })
    .eq('id', userId);
}

// ✅ تشغيل الفحص
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoCheckPaymentBlock);
} else {
  autoCheckPaymentBlock();
}

// ============================================
// renderLayout
// ============================================
function renderLayout(activePage) {
  // ✅ إذا كانت الصفحة داخل iframe → اعرض Main فقط + أضف كلاس in-iframe
  if (window.self !== window.top) {
    document.documentElement.classList.add('in-iframe');
    const app = document.querySelector('.app');
    if (app) {
      app.innerHTML = `<main class="main" id="main-content"></main>`;
    }
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
    <a href="${item.href}" class="nav-item ${activePage === item.href ? 'active' : ''}" data-nav="${item.href}">
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join('');

  const layout = `
    <header class="header">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" title="${tr('nav_menu')}">
        <i class="fas fa-bars"></i>
      </button>
      <a href="/notifications.html" class="notif" id="notif-btn" title="${tr('nav_notifications')}">
        <i class="fas fa-bell"></i>
        <span class="notif-count" id="notif-count">0</span>
      </a>
      <div class="search">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="${tr('nav_search')}">
      </div>
      <h1 class="logo">MyStock</h1>
    </header>

    <div class="body" id="app-body">
      <aside class="sidebar" id="app-sidebar">
        <nav class="nav">
          ${navHTML}
        </nav>

        <div class="sidebar-footer">
          <a href="/profile.html" class="nav-item ${activePage === '/profile.html' ? 'active' : ''}" data-nav="/profile.html">
            <i class="fas fa-user"></i>
            <span>${tr('nav_profile')}</span>
          </a>
          <button class="nav-item logout" id="logout-btn">
            <i class="fas fa-right-from-bracket"></i>
            <span>${tr('nav_logout')}</span>
          </button>
        </div>
      </aside>
      <main class="main" id="main-content"></main>
    </div>
  `;

  const app = document.querySelector('.app');
  if (app) app.innerHTML = layout;

  // ✅ التعديل: جعل التنقل بين "إضافة منتج" و "إخراج منتج" لا يُعيد تحميل الصفحة
  document.querySelectorAll('.nav-item[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.dataset.nav;
      
      // إذا كنا في صفحة الإضافة ونقرنا على الإخراج (والعكس صحيح)
      if (
        (activePage === '/products/add.html' && target === '/movements/out.html') ||
        (activePage === '/movements/out.html' && target === '/products/add.html')
      ) {
        e.preventDefault();
        // إرسال حدث للـ JS الخاص بالصفحة الحالية لتغيير القسم الأول
        window.dispatchEvent(new CustomEvent('changeWorkspacePanel', { detail: target }));
      } else {
        // إذا نقرنا على زر آخر (مثل لوحة التحكم)، نسمح بالانتقال العادي
        // لا نحتاج لإضافة preventDefault هنا، المتصفح سينتقل تلقائياً
      }
    });
  });

  document.querySelectorAll('.logout').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      if (typeof logout === 'function') {
        await logout();
      } else {
        await db.auth.signOut();
        window.location.href = '/';
      }
    });
  });

  const toggleBtn = document.getElementById('sidebar-toggle');
  const bodyEl = document.getElementById('app-body');
  const sidebar = document.getElementById('app-sidebar');

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function toggleSidebar() {
    if (isMobile()) {
      bodyEl.classList.toggle('sidebar-hidden-mobile');
    } else {
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

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  if (!isMobile()) {
    const savedState = localStorage.getItem('sidebar_closed');
    if (savedState === 'true') {
      bodyEl.classList.add('sidebar-closed');
    }
  } else {
    bodyEl.classList.add('sidebar-hidden-mobile');
  }

  if (sidebar) {
    sidebar.querySelectorAll('a.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) closeSidebarMobile();
      });
    });
  }

  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!bodyEl.classList.contains('sidebar-hidden-mobile') === false) {
      return;
    }

    if (sidebar && sidebar.contains(e.target)) return;
    if (toggleBtn && toggleBtn.contains(e.target)) return;

    closeSidebarMobile();
  });

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

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      bodyEl.classList.remove('sidebar-hidden-mobile');
    } else {
      bodyEl.classList.add('sidebar-hidden-mobile');
    }
  });

  if (typeof startNotifPolling === 'function') {
    startNotifPolling();
  }
}