// ============================================
// صفحة إضافة عامل — بريد أو QR
// ✅ دعم كامل للترجمة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  renderLayout('add-worker.html');

  if (window.applyLanguage) window.applyLanguage();
  const tr = (key) => (window.t ? window.t(key) : key);

  document.title = tr('aw_title_full');

  const main = document.getElementById('main-content');

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  if (role !== 'admin' && role !== 'deputy') {
    main.innerHTML = `
      <div class="alert alert-error">
        ${tr('aw_no_permission')}
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <h2>${tr('aw_title')}</h2>
      <a href="/profile.html" class="btn-secondary">
        <i class="fas fa-arrow-right"></i>
        <span>${tr('prod_detail_back')}</span>
      </a>
    </div>

    <div class="add-worker-page">

      <div class="method-section" id="method-section">
        <p class="method-title">${tr('aw_choose_method')}</p>

        <div class="method-cards">
          <button type="button" class="method-card" data-method="email">
            <div class="method-icon email-icon">
              <i class="fas fa-envelope"></i>
            </div>
            <div class="method-info">
              <strong>${tr('aw_email_method')}</strong>
              <span>${tr('aw_email_method_desc')}</span>
            </div>
          </button>

          <button type="button" class="method-card" data-method="qr">
            <div class="method-icon qr-icon">
              <i class="fas fa-qrcode"></i>
            </div>
            <div class="method-info">
              <strong>${tr('aw_qr_method')}</strong>
              <span>${tr('aw_qr_method_desc')}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="method-panel" id="email-panel" style="display:none;">
        <button type="button" class="back-btn" id="back-from-email">
          <i class="fas fa-arrow-right"></i> ${tr('aw_change_method')}
        </button>

        <div class="panel-header">
          <div class="panel-icon email-icon">
            <i class="fas fa-envelope"></i>
          </div>
          <h3>${tr('aw_send_email_title')}</h3>
        </div>

        <div class="alert alert-error" id="email-error" style="display:none;"></div>
        <div class="alert alert-success" id="email-success" style="display:none;"></div>

        <div class="form-group">
          <label>${tr('aw_worker_email')}</label>
          <input type="email" id="worker-email" placeholder="email@example.com" dir="ltr">
        </div>

        <button type="button" class="btn-primary full-width" id="send-email-btn">
          <i class="fas fa-paper-plane"></i>
          <span>${tr('aw_send_invite')}</span>
        </button>
      </div>

      <div class="method-panel" id="qr-panel" style="display:none;">
        <button type="button" class="back-btn" id="back-from-qr">
          <i class="fas fa-arrow-right"></i> ${tr('aw_change_method')}
        </button>

        <div class="panel-header">
          <div class="panel-icon qr-icon">
            <i class="fas fa-qrcode"></i>
          </div>
          <h3>${tr('aw_qr_title')}</h3>
        </div>

        <div class="alert alert-error" id="qr-error" style="display:none;"></div>
        <div class="alert alert-info" id="qr-info" style="display:none;"></div>

        <div class="qr-container" id="qr-container">
          <div class="qr-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${tr('aw_qr_loading')}</p>
          </div>
        </div>

        <div class="qr-note">
          <i class="fas fa-info-circle"></i>
          <span>${tr('aw_qr_note')}</span>
        </div>

        <div class="qr-actions">
          <button type="button" class="btn-secondary" id="copy-link-btn">
            <i class="fas fa-copy"></i>
            <span>${tr('aw_copy_link')}</span>
          </button>
          <button type="button" class="btn-secondary" id="share-btn">
            <i class="fas fa-share-nodes"></i>
            <span>${tr('aw_share')}</span>
          </button>
        </div>

        <button type="button" class="btn-primary full-width" id="generate-new-qr-btn">
          <i class="fas fa-rotate"></i>
          <span>${tr('aw_generate_new')}</span>
        </button>
      </div>

      <div class="add-another-section" id="add-another-section" style="display:none;">
        <button type="button" class="btn-primary full-width" id="add-another-btn">
          <i class="fas fa-user-plus"></i>
          <span>${tr('aw_add_another')}</span>
        </button>
      </div>

    </div>
  `;

  const methodSection = document.getElementById('method-section');
  const emailPanel = document.getElementById('email-panel');
  const qrPanel = document.getElementById('qr-panel');
  const addAnotherSection = document.getElementById('add-another-section');

  let currentQrToken = null;

  document.querySelectorAll('.method-card').forEach(card => {
    card.addEventListener('click', () => {
      const method = card.dataset.method;
      methodSection.style.display = 'none';
      addAnotherSection.style.display = 'none';

      if (method === 'email') {
        emailPanel.style.display = 'block';
        qrPanel.style.display = 'none';
        document.getElementById('worker-email').focus();
      } else {
        emailPanel.style.display = 'none';
        qrPanel.style.display = 'block';
        generateQR();
      }
    });
  });

  document.getElementById('back-from-email')?.addEventListener('click', resetToChoice);
  document.getElementById('back-from-qr')?.addEventListener('click', resetToChoice);

  function resetToChoice() {
    methodSection.style.display = 'block';
    emailPanel.style.display = 'none';
    qrPanel.style.display = 'none';
    addAnotherSection.style.display = 'none';

    document.getElementById('email-error').style.display = 'none';
    document.getElementById('email-success').style.display = 'none';
    document.getElementById('qr-error').style.display = 'none';
    document.getElementById('qr-info').style.display = 'none';
    document.getElementById('worker-email').value = '';
    currentQrToken = null;
  }

  document.getElementById('send-email-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('send-email-btn');
    const emailInput = document.getElementById('worker-email');
    const email = emailInput.value.trim().toLowerCase();
    const errBox = document.getElementById('email-error');
    const successBox = document.getElementById('email-success');

    errBox.style.display = 'none';
    successBox.style.display = 'none';

    if (!email || !email.includes('@')) {
      errBox.textContent = tr('aw_invalid_email');
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = tr('aw_sending');

    try {
      const { data: { session } } = await db.auth.getSession();

      const fnUrl = `${SUPABASE_URL}/functions/v1/send-invite`;
      const fnRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          email: email,
          orgId: profile.organization_id,
          invitedBy: user.id,
          appUrl: window.location.origin,
        }),
      });

      const result = await fnRes.json();

      if (!fnRes.ok || !result.ok) {
        throw new Error(result.error || tr('aw_send_failed'));
      }

      successBox.textContent = `✅ ${tr('aw_sent_to')} ${email}`;
      successBox.style.display = 'block';
      emailInput.value = '';

      addAnotherSection.style.display = 'block';

    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = tr('aw_send_invite');
    }
  });

  async function generateQR() {
    const container = document.getElementById('qr-container');
    const errBox = document.getElementById('qr-error');

    container.innerHTML = `
      <div class="qr-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>${tr('aw_qr_loading')}</p>
      </div>
    `;
    errBox.style.display = 'none';

    try {
      const { data: { session } } = await db.auth.getSession();

      const token = generateToken();

      const { error: insertError } = await db
        .from('worker_invites')
        .insert({
          organization_id: profile.organization_id,
          email: '',
          full_name: '',
          role: 'worker',
          status: 'pending',
          invited_by: user.id,
          token: token,
        });

      if (insertError) throw new Error(tr('aw_qr_gen_failed') + ' ' + insertError.message);

      currentQrToken = token;

      const qrUrl = `${window.location.origin}/register-worker.html?token=${token}`;

      container.innerHTML = '';

      if (typeof QRCode === 'undefined') {
        throw new Error(tr('aw_qr_lib_missing'));
      }

      new QRCode(container, {
        text: qrUrl,
        width: 240,
        height: 240,
        colorDark: '#171717',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });

      addAnotherSection.style.display = 'block';

    } catch (err) {
      container.innerHTML = '';
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  }

  function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  document.getElementById('generate-new-qr-btn')?.addEventListener('click', () => {
    generateQR();
  });

  document.getElementById('copy-link-btn')?.addEventListener('click', async () => {
    if (!currentQrToken) return;

    const url = `${window.location.origin}/register-worker.html?token=${currentQrToken}`;

    try {
      await navigator.clipboard.writeText(url);
      const btn = document.getElementById('copy-link-btn');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<i class="fas fa-check"></i> <span>${tr('aw_copied')}</span>`;
      setTimeout(() => { btn.innerHTML = originalHTML; }, 1500);
    } catch (err) {
      alert(tr('aw_link') + '\n' + url);
    }
  });

  document.getElementById('share-btn')?.addEventListener('click', async () => {
    if (!currentQrToken) return;

    const url = `${window.location.origin}/register-worker.html?token=${currentQrToken}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: tr('aw_share_title'),
          text: tr('aw_share_text'),
          url: url,
        });
      } catch (err) {
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert(tr('aw_copied'));
      } catch (err) {
        alert(tr('aw_link') + '\n' + url);
      }
    }
  });

  document.getElementById('add-another-btn')?.addEventListener('click', () => {
    resetToChoice();
  });

});