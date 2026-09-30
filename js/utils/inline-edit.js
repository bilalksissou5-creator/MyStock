// ============================================
// تعديل مباشر احترافي (Inline Edit 2.0)
// ============================================
// الاستخدام: inlineEdit({ el, table, id, field, type, onSave })
// ============================================

function inlineEdit({ el, table, id, field, type = 'text', onSave }) {
  if (!el) return;

  const original = el.dataset.value ?? el.textContent.trim();
  const isNumber = type === 'number';
  const inputType = isNumber ? 'number' : 'text';

  let editing = false;
  let saving = false;
  let currentValue = original;

  // عرض عادي
  function renderDisplay() {
    el.innerHTML = '';
    el.classList.remove('editing');
    el.dataset.value = currentValue;

    const span = document.createElement('span');
    span.className = 'inline-display';
    span.textContent = currentValue === '' ? '—' : currentValue;
    el.appendChild(span);
  }

  // عرض تحرير
  function renderEdit() {
    el.innerHTML = '';
    el.classList.add('editing');

    const input = document.createElement('input');
    input.type = inputType;
    input.value = currentValue;
    input.className = 'inline-input';
    if (isNumber) input.step = 'any';
    el.appendChild(input);

    input.focus();
    input.select();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });

    input.addEventListener('blur', save);
  }

  // إلغاء
  function cancel() {
    if (!editing) return;
    editing = false;
    currentValue = original;
    renderDisplay();
  }

  // حفظ
  async function save() {
    if (!editing || saving) return;

    const input = el.querySelector('input');
    if (!input) return;

    const newValue = isNumber ? (input.value === '' ? 0 : Number(input.value)) : input.value.trim();

    // لم يتغير؟ ← رجوع
    if (String(newValue) === String(currentValue)) {
      editing = false;
      renderDisplay();
      return;
    }

    saving = true;

    const { error } = await db
      .from(table)
      .update({ [field]: newValue === '' ? null : newValue })
      .eq('id', id);

    saving = false;
    editing = false;

    if (error) {
      alert('خطأ: ' + error.message);
      currentValue = original;
      renderDisplay();
      return;
    }

    currentValue = newValue;
    renderDisplay();

    // مؤشر الحفظ ✓
    const check = document.createElement('i');
    check.className = 'fas fa-check save-indicator';
    el.appendChild(check);
    setTimeout(() => check.remove(), 1200);

    // ✅ callback — مع await و try/catch
    console.log('🔍 [inlineEdit] onSave type:', typeof onSave);
    console.log('🔍 [inlineEdit] field:', field, 'newValue:', newValue);

    if (typeof onSave === 'function') {
      try {
        await onSave(field, newValue);
        console.log('✅ [inlineEdit] onSave executed successfully');
      } catch (err) {
        console.error('❌ [inlineEdit] onSave error:', err);
      }
    } else {
      console.warn('⚠️ [inlineEdit] onSave is not a function');
    }
  }

  // الضغط للدخول في التحرير
  el.addEventListener('click', () => {
    if (editing) return;
    editing = true;
    renderEdit();
  });

  // عرض أولي
  el.dataset.value = original;
  renderDisplay();
}