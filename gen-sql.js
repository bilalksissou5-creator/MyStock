const fs = require('fs');

try {
    const content = fs.readFileSync('/sdcard/MyStock/js/core/i18n.js', 'utf8');
    const start = content.indexOf('const translations =');
    const end = content.indexOf('const countries =');
    
    if (start === -1 || end === -1) {
        console.error("❌ لم يتم العثور على كائن الترجمات");
        process.exit(1);
    }

    const transString = content.substring(start, end).replace('const translations =', 'global.translations =');
    eval(transString);

    const keys = Object.keys(global.translations.ar);
    
    // ✅ إنشاء محتوى ملف CSV
    let csv = `key,ar,fr,en\n`;
    
    keys.forEach(key => {
        // دالة لتنظيف النصوص من الفواصل والأسطر الجديدة
        const clean = (str) => {
            if (!str) return '';
            let text = str.toString().replace(/"/g, '""'); // مضاعفة علامات التنصيص
            if (text.includes(',') || text.includes('\n') || text.includes('"')) {
                text = `"${text}"`; // وضع النص بين علامات تنصيص إذا كان يحتوي على فواصل
            }
            return text;
        };
        
        const ar = clean(global.translations.ar?.[key]);
        const fr = clean(global.translations.fr?.[key]);
        const en = clean(global.translations.en?.[key]);
        
        csv += `${key},${ar},${fr},${en}\n`;
    });
    
    // حفظ الملف بامتداد .csv
    fs.writeFileSync('/sdcard/MyStock/translations.csv', csv, 'utf8');
    console.log("✅ تم إنشاء ملف translations.csv بنجاح!");

} catch (err) {
    console.error("❌ حدث خطأ:", err.message);
}