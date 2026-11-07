// ============================================
// إعدادات Supabase + الوعد العالمي المحصّن
// ============================================
const SUPABASE_URL = 'https://sbrgzbrqvjdwozvdknus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmd6YnJxdmpkd296dmRrbnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQwOTYsImV4cCI6MjEwNDg3MDA5Nn0.nCcSeBQgKs--F0AeknbLMtagsY5_NHO1U2v2RcZSGsw';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: true,       // يقرأ الجلسة من الرابط بعد Google
    persistSession: true,           // يحفظ الجلسة في المتصفح
    autoRefreshToken: true,         // يجدد الجلسة تلقائياً
    flowType: 'implicit',           // إجبار التدفق الضمني (حل مشكلة 4/0A)
    storage: window.localStorage,
    storageKey: 'mystock-auth-token'
  }
});

// ✅ وعد عالمي: لا يُحل إلا عندما تصبح الجلسة جاهزة
window.authReadyPromise = new Promise((resolve) => {
  let resolved = false;
  const finish = (session) => {
    if (resolved) return;
    resolved = true;
    resolve(session);
  };

  // 1. الاستماع لأول حدث مصادقة
  db.auth.onAuthStateChange((event, session) => {
    if (session) finish(session);
  });

  // 2. محاولة قراءة الجلسة فوراً (إذا كانت موجودة مسبقاً)
  db.auth.getSession().then(({ data }) => {
    if (data?.session) finish(data.session);
  });

  // 3. مهلة احتياطية 8 ثوانٍ
  setTimeout(() => finish(null), 8000);
});