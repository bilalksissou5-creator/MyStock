// ============================================
// رفع الصور إلى Supabase Storage
// ============================================
async function uploadProductImage(file, productId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `product-${productId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await db.storage
    .from('product-images')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: { publicUrl } } = db.storage
    .from('product-images')
    .getPublicUrl(fileName);

  const { error: updateError } = await db
    .from('products')
    .update({ image_url: publicUrl })
    .eq('id', productId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, url: publicUrl };
}

// ============================================
// إضافة زر ✏️ فوق الصورة
// ============================================
function attachImageUpload(productId, container, currentUrl) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const btn = container.querySelector('.image-edit-btn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;
    }

    const result = await uploadProductImage(file, productId);

    if (!result.ok) {
      alert('خطأ: ' + result.error);
      if (btn) {
        btn.innerHTML = '<i class="fas fa-pen"></i>';
        btn.disabled = false;
      }
      return;
    }

    // تحديث الصورة
    container.innerHTML = `
      <img src="${result.url}?t=${Date.now()}" alt="صورة المنتج">
      <button class="image-edit-btn" title="تعديل الصورة">
        <i class="fas fa-pen"></i>
      </button>
      <input type="file" accept="image/*" style="display:none;">
    `;
    container.appendChild(input);

    // إعادة الربط
    const newBtn = container.querySelector('.image-edit-btn');
    const newInput = container.querySelector('input[type="file"]');
    newBtn.addEventListener('click', () => newInput.click());
    newInput.addEventListener('change', input.onchange);
  });

  container.appendChild(input);

  const btn = container.querySelector('.image-edit-btn');
  if (btn) btn.addEventListener('click', () => input.click());
}