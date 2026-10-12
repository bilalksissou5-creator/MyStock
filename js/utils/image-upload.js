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
// إضافة زر تعديل الصورة
// ============================================
function attachImageUpload(productId, container, currentUrl) {
  const input = document.getElementById('img-upload-input');
  if (!input) {
    console.error('❌ input#img-upload-input غير موجود');
    return;
  }

  // ✅ تفريغ الـ input
  input.value = '';

  async function handleFile(e) {
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
        btn.innerHTML = '<i class="fas fa-camera"></i>';
        btn.disabled = false;
      }
      return;
    }

    container.innerHTML = `
      <img src="${result.url}?t=${Date.now()}" alt="صورة المنتج">
      <button class="image-edit-btn" title="تعديل الصورة">
        <i class="fas fa-camera"></i>
      </button>
    `;

    bindButton();
  }

  input.onchange = handleFile;

  function bindButton() {
    const btn = container.querySelector('.image-edit-btn');
    if (!btn) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = '';
      input.click();
    });
  }

  bindButton();
}