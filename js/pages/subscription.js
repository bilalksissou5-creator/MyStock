// ============================================
// كود تشخيصي مؤقت
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // عرض تشخيصي على الشاشة
  const container = document.getElementById('subscription-content');
  const diag = `
    <div style="position:fixed;top:0;left:0;right:0;background:#000;color:#0f0;padding:15px;font-family:monospace;font-size:12px;z-index:99999;direction:ltr;">
      <b>🔍 DIAGNOSTIC</b><br>
      URL: ${window.location.href}<br>
      HASH: ${window.location.hash ? window.location.hash.substring(0, 80) + '...' : 'EMPTY ❌'}<br>
      authReadyPromise: ${window.authReadyPromise ? 'EXISTS ✓' : 'MISSING ✗'}<br>
      <span id="diag-session">Session: waiting...</span><br>
      <span id="diag-user">User: waiting...</span>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', diag);

  if (!window.authReadyPromise) {
    document.getElementById('diag-session').textContent = 'Session: NO authReadyPromise';
    return;
  }

  // ننتظر الجلسة ونعرض النتيجة
  const session = await window.authReadyPromise;
  document.getElementById('diag-session').textContent = 
    'Session: ' + (session ? 'FOUND ✓' : 'NULL ❌');
  document.getElementById('diag-user').textContent = 
    'User: ' + (session?.user?.email || 'NONE');

  // إظهار النتيجة لمدة 30 ثانية قبل المتابعة
  await new Promise(r => setTimeout(r, 30000));

  // ثم باقي الكود الأصلي (لن يصل إليه في التجربة)
  window.location.href = '/login.html';
});