const fs = require('fs');

try {
    // قراءة ملف i18n.js
    const content = fs.readFileSync('./js/core/i18n.js', 'utf8');
    
    // استخراج كائن الترجمات
    const start = content.indexOf('const translations =');
    const end = content.indexOf('const countries =');
    
    if (start === -1 || end === -1) {
        console.error("❌ لم يتم العثور على كائن الترجمات في i18n.js");
        process.exit(1);
    }

    const transString = content.substring(start, end).replace('const translations =', 'global.translations =');
    eval(transString);

    const keys = Object.keys(global.translations.ar);
    let sql = `-- إدخال الترجمات إلى الجدول\nINSERT INTO public.translations (key, ar, fr, en) VALUES\n`;

    const values = keys.map(key => {
        const escape = (str) => (str || '').toString().replace(/'/g, "''"); // حماية من علامات التنصيص
        const ar = escape(global.translations.ar?.[key]);
        const fr = escape(global.translations.fr?.[key]);
        const en = escape(global.translations.en?.[key]);
        return `('${key}', '${ar}', '${fr}', '${en}')`;
    });

    sql += values.join(',\n') + `\nON CONFLICT (key) DO UPDATE SET ar = EXCLUDED.ar, fr = EXCLUDED.fr, en = EXCLUDED.en;`;
    
    // حفظ الأمر في ملف نصي
    fs.writeFileSync('translations.sql', sql);
    console.log("✅ تم إنشاء الملف بنجاح!");
    console.log("👉 ابحث عن ملف translations.sql في مجلد المشروع.");

} catch (err) {
    console.error("❌ حدث خطأ:", err.message);
}