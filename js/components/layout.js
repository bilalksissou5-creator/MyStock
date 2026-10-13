// ============================================
// الهيكل المشترك (Header + Sidebar)
// ✅ فحص تلقائي + تحذيرات قبل القفل
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
      .select('role, bank_card_last4, bank_card_active, bank_card_deactivated_at, card_warning_sent')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    if (profile.role !== 'admin') return;

    // لا يوجد بطاقة إطلاقاً → قفل فوري
    if (!profile.bank_card_last4) {
      window.location.replace('/bank-card.html?blocked=1');
      return;
    }

    // البطاقة موجودة
    if (profile.bank_card_active === false && profile.bank_card_deactivated_at) {
      const deactivatedAt = new Date(profile.bank_card_deactivated_at).getTime();
      const now = Date.now();
      const elapsed = now - deactivatedAt;

      const DAY_MS = 24 * 60 * 60 * 1000;
      const daysElapsed = Math.floor(elapsed / DAY_MS);

      const currentWarning = profile.card_warning_sent ?? 0;

      // ✅ بعد 3 أيام → قفل
      if (elapsed >= 3 * DAY_MS) {
        window.location.replace('/bank-card.html?blocked=1');
        return;
      }

      // ✅ تحذير يوم 3 (آخر 12 ساعة)
      if (daysElapsed >= 2 && currentWarning < 3) {
        if (elapsed >= 2 * DAY_MS + 12 * 60 * 60 * 1000) {
          await sendWarning(user.id, 3);
        }
      }
      // ✅ تحذير يوم 2
      else if (daysElapsed >= 1 && currentWarning < 2) {
        await sendWarning(user.id, 2);
      }
      // ✅ تحذير يوم 1
      else if (daysElapsed >= 0 && currentWarning < 1) {
        await sendWarning(user.id, 1);
      }
    }
  } catch (err) {
    console.error('❌ autoCheckPaymentBlock error:', err);
  }
}

// ═══════════════════════════════════════════
// إرسال تحذير + تحديث الحقل
// ═══════════════════════════════════════════
async function sendWarning(userId, level) {
  const titles = {
    1: '⚠️ بطاقتك غير مفعّلة',
    2: '🔔 تبقى يومان',
    3: '🚨 تبقى 12 ساعة',
  };

  const messages = {
    1: 'لقد ألغيت تفعيل بطاقتك البنكية. لديك 3 أيام لإعادة تفعيلها أو إضافة بطاقة جديدة قبل إيقاف التطبيق.',
    2: 'مرّ يوم على إلغاء تفعيل بطاقتك. تبقى يومان قبل إيقاف التطبيق.',
    3: 'تبقى 12 ساعة فقط! أعد تفعيل بطاقتك أو أضف بطاقة جديدة الآن.',
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