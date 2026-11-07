// ============================================
// إعدادات Supabase + الوعد العالمي المحصّن
// ============================================
const SUPABASE_URL = 'https://sbrgzbrqvjdwozvdknus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmd6YnJxdmpkd296dmRrbnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQwOTYsImV4cCI6MjEwNDg3MDA5Nn0.nCcSeBQgKs--F0AeknbLMtagsY5_NHO1U2v2RcZSGsw';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'implicit',
    storage: window.localStorage,
    storageKey: 'mystock-auth-token'
  }
});

// ✅ وعد عالمي محصّن: لا يُحل بـ null مبكراً، وينتظر معالجة OAuth
window.authReadyPromise = new Promise((resolve) => {
  let resolved = false;
  const finish = (session) => {
    if (resolved) return;
    resolved = true;
    console.log('[Auth Ready] Resolved:', session?.user?.email || 'no session');
    resolve(session);
  };

  // 1. الاستماع لحدث المصادقة (يُطلق عند معالجة رابط OAuth)
  db.auth.onAuthStateChange((event, session) => {
    console.log('[Auth Event]', event, session?.user?.email || '');
    if (session) finish(session);
  });

  // 2. محاولات احتياطية (في حال كان الحدث قد أُطلق قبل الاستماع)
  [500, 1500, 3000].forEach(delay => {
    setTimeout(async () => {
      if (resolved) return;
      const { data } = await db.auth.getSession();
      if (data?.session) finish(data.session);
    }, delay);
  });

  // 3. مهلة نهائية: 10 ثوانٍ
  setTimeout(() => finish(null), 10000);
});