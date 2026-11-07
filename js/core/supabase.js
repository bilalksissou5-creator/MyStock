// ============================================
// إعدادات Supabase + الاستماع العالمي للجلسة
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

// ✅ وعد عالمي: لا يحل إلا عندما تصبح الجلسة جاهزة (أو تنتهي المهلة)
window.authReadyPromise = new Promise((resolve) => {
  let resolved = false;
  const finish = (session) => {
    if (resolved) return;
    resolved = true;
    resolve(session);
  };

  // 1. الاستماع لأول حدث مصادقة (يُطلق بعد معالجة رابط OAuth)
  db.auth.onAuthStateChange((event, session) => {
    console.log('[Auth] Event:', event);
    if (session) finish(session);
  });

  // 2. محاولة قراءة الجلسة فوراً (إن كانت موجودة مسبقاً)
  db.auth.getSession().then(({ data }) => {
    if (data?.session) finish(data.session);
  });

  // 3. مهلة احتياطية 8 ثوانٍ
  setTimeout(() => finish(null), 8000);
});