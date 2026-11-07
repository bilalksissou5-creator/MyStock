const SUPABASE_URL = 'https://sbrgzbrqvjdwozvdknus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmd6YnJxdmpkd296dmRrbnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQwOTYsImV4cCI6MjEwNDg3MDA5Nn0.nCcSeBQgKs--F0AeknbLMtagsY5_NHO1U2v2RcZSGsw';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,      // ✅ حفظ الجلسة في المتصفح
    autoRefreshToken: true,    // ✅ تجديد تلقائي للجلسة
    flowType: 'implicit',      // ✅ التدفق الضمني
    storage: window.localStorage, // ✅ تخزين الجلسة في local storage
    storageKey: 'mystock-auth-token' // ✅ اسم مخصص للتخزين
  }
});