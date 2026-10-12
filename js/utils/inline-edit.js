// ============================================
// تعديل مباشر احترافي (Inline Edit 2.0)
// ============================================
// الاستخدام: inlineEdit({ el, table, id, field, type, onSave })
// ============================================

function inlineEdit({ el, table, id, field, type = 'text', onSave }) {
  if (!el) return;

  const initialValue = el.dataset.value !== undefined
    ? el.dataset.value
    : el.textContent.trim();

  const isNumber = type === 'number';
  const inputType = isNumber ? 'number' : 'text';

  let editing = false;
  let saving = false;
  let currentValue = initialValue;

  function renderDisplay() {
    el.innerHTML = '';
    el.classList.remove('editing');
    el.dataset.value = currentValue;

    const span = document.createElement('span');
    span.className = 'inline-display';
    span.textContent = (currentValue === '' || currentValue == null) ? '—' : currentValue;
    el.appendChild(span);
  }

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

  function cancel() {
    if (!editing) return;
    editing = false;
    currentValue = initialValue;
    renderDisplay();
  }

  async function save() {
    if (!editing || saving) return;

    const input = el.querySelector('input');
    if (!input) return;

    const newValue = isNumber ? (input.value === '' ? 0 : Number(input.value)) : input.value.trim();

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
      currentValue = initialValue;
      renderDisplay();
      return;
    }

    currentValue = newValue;
    renderDisplay();

    const check = document.createElement('i');
    check.className = 'fas fa-check save-indicator';
    el.appendChild(check);
    setTimeout(() => check.remove(), 1200);

    if (typeof onSave === 'function') {
      try {
        await onSave(field, newValue);
      } catch (err) {
        console.error('❌ [inlineEdit] onSave error:', err);
      }
    }
  }

  el.addEventListener('click', () => {
    if (editing) return;
    editing = true;
    renderEdit();
  });

  el.dataset.value = currentValue;
  renderDisplay();
}