// ============================================
// نظام الترجمة (i18n)
// ✅ 3 لغات: العربية، الفرنسية، الإنجليزية
// ✅ 28 بلداً بأسماء مترجمة
// ✅ يغيّر ترتيب الصفحة تلقائياً (RTL/LTR)
// ✅ دالة t(key) لجلب النص المترجم
// ✅ دالة tCountry(code) لجلب اسم البلد
// ============================================

const translations = {
  ar: {
    app_name: 'MyStock',
    app_tagline: 'نظام إدارة المخزون',

    // welcome
    welcome_language: 'اللغة',
    welcome_country: 'البلد',
    welcome_continue: 'متابعة',
    welcome_select_country: '-- اختر البلد --',

    // login
    login_title: 'تسجيل الدخول',
    login_email: 'البريد الإلكتروني',
    login_password: 'كلمة السر',
    login_button: 'دخول',
    login_no_account: 'ليس لديك حساب؟',
    login_create_account: 'إنشاء حساب جديد',

    // register
    register_title: 'إنشاء حساب جديد',
    register_personal_info: 'المعلومات الشخصية',
    register_first_name: 'الإسم الشخصي',
    register_last_name: 'الإسم العائلي',
    register_org_name: 'إسم المنظمة',
    register_email: 'البريد الإلكتروني',
    register_password: 'كلمة السر',
    register_password_confirm: 'تأكيد كلمة السر',
    register_or: 'أو',
    register_google: 'المتابعة باستخدام Google (قريباً)',
    register_button: 'تسجيل',
    register_have_account: 'لديك حساب؟',
    register_login: 'تسجيل الدخول',
  },

  fr: {
    app_name: 'MyStock',
    app_tagline: 'Système de gestion de stock',

    welcome_language: 'Langue',
    welcome_country: 'Pays',
    welcome_continue: 'Continuer',
    welcome_select_country: '-- Choisir un pays --',

    login_title: 'Connexion',
    login_email: 'Email',
    login_password: 'Mot de passe',
    login_button: 'Se connecter',
    login_no_account: "Vous n'avez pas de compte ?",
    login_create_account: 'Créer un compte',

    register_title: 'Créer un compte',
    register_personal_info: 'Informations personnelles',
    register_first_name: 'Prénom',
    register_last_name: 'Nom',
    register_org_name: "Nom de l'organisation",
    register_email: 'Email',
    register_password: 'Mot de passe',
    register_password_confirm: 'Confirmer le mot de passe',
    register_or: 'Ou',
    register_google: 'Continuer avec Google (bientôt)',
    register_button: "S'inscrire",
    register_have_account: 'Vous avez un compte ?',
    register_login: 'Se connecter',
  },

  en: {
    app_name: 'MyStock',
    app_tagline: 'Inventory Management System',

    welcome_language: 'Language',
    welcome_country: 'Country',
    welcome_continue: 'Continue',
    welcome_select_country: '-- Select a country --',

    login_title: 'Login',
    login_email: 'Email',
    login_password: 'Password',
    login_button: 'Login',
    login_no_account: "Don't have an account?",
    login_create_account: 'Create new account',

    register_title: 'Create Account',
    register_personal_info: 'Personal Information',
    register_first_name: 'First Name',
    register_last_name: 'Last Name',
    register_org_name: 'Organization Name',
    register_email: 'Email',
    register_password: 'Password',
    register_password_confirm: 'Confirm Password',
    register_or: 'Or',
    register_google: 'Continue with Google (soon)',
    register_button: 'Register',
    register_have_account: 'Already have an account?',
    register_login: 'Login',
  },
};

// ============================================
// أسماء البلدان (28 بلداً × 3 لغات)
// ============================================
const countries = {
  MA: { ar: 'المغرب 🇲🇦', fr: 'Maroc 🇲🇦', en: 'Morocco 🇲🇦' },
  DZ: { ar: 'الجزائر 🇩🇿', fr: 'Algérie 🇩🇿', en: 'Algeria 🇩🇿' },
  TN: { ar: 'تونس 🇹🇳', fr: 'Tunisie 🇹🇳', en: 'Tunisia 🇹🇳' },
  LY: { ar: 'ليبيا 🇱🇾', fr: 'Libye 🇱🇾', en: 'Libya 🇱🇾' },
  EG: { ar: 'مصر 🇪🇬', fr: 'Égypte 🇪🇬', en: 'Egypt 🇪🇬' },
  MR: { ar: 'موريتانيا 🇲🇷', fr: 'Mauritanie 🇲🇷', en: 'Mauritania 🇲🇷' },
  SA: { ar: 'السعودية 🇸🇦', fr: 'Arabie Saoudite 🇸🇦', en: 'Saudi Arabia 🇸🇦' },
  AE: { ar: 'الإمارات 🇦🇪', fr: 'Émirats Arabes Unis 🇦🇪', en: 'United Arab Emirates 🇦🇪' },
  QA: { ar: 'قطر 🇶🇦', fr: 'Qatar 🇶🇦', en: 'Qatar 🇶🇦' },
  KW: { ar: 'الكويت 🇰🇼', fr: 'Koweït 🇰🇼', en: 'Kuwait 🇰🇼' },
  BH: { ar: 'البحرين 🇧🇭', fr: 'Bahreïn 🇧🇭', en: 'Bahrain 🇧🇭' },
  OM: { ar: 'عمان 🇴🇲', fr: 'Oman 🇴🇲', en: 'Oman 🇴🇲' },
  JO: { ar: 'الأردن 🇯🇴', fr: 'Jordanie 🇯🇴', en: 'Jordan 🇯🇴' },
  LB: { ar: 'لبنان 🇱🇧', fr: 'Liban 🇱🇧', en: 'Lebanon 🇱🇧' },
  SY: { ar: 'سوريا 🇸🇾', fr: 'Syrie 🇸🇾', en: 'Syria 🇸🇾' },
  IQ: { ar: 'العراق 🇮🇶', fr: 'Irak 🇮🇶', en: 'Iraq 🇮🇶' },
  PS: { ar: 'فلسطين 🇵🇸', fr: 'Palestine 🇵🇸', en: 'Palestine 🇵🇸' },
  YE: { ar: 'اليمن 🇾🇪', fr: 'Yémen 🇾🇪', en: 'Yemen 🇾🇪' },
  SD: { ar: 'السودان 🇸🇩', fr: 'Soudan 🇸🇩', en: 'Sudan 🇸🇩' },
  SO: { ar: 'الصومال 🇸🇴', fr: 'Somalie 🇸🇴', en: 'Somalia 🇸🇴' },
  TR: { ar: 'تركيا 🇹🇷', fr: 'Turquie 🇹🇷', en: 'Turkey 🇹🇷' },
  FR: { ar: 'فرنسا 🇫🇷', fr: 'France 🇫🇷', en: 'France 🇫🇷' },
  ES: { ar: 'إسبانيا 🇪🇸', fr: 'Espagne 🇪🇸', en: 'Spain 🇪🇸' },
  US: { ar: 'أمريكا 🇺🇸', fr: 'États-Unis 🇺🇸', en: 'United States 🇺🇸' },
  CA: { ar: 'كندا 🇨🇦', fr: 'Canada 🇨🇦', en: 'Canada 🇨🇦' },
  GB: { ar: 'بريطانيا 🇬🇧', fr: 'Royaume-Uni 🇬🇧', en: 'United Kingdom 🇬🇧' },
  DE: { ar: 'ألمانيا 🇩🇪', fr: 'Allemagne 🇩🇪', en: 'Germany 🇩🇪' },
  OTHER: { ar: 'أخرى', fr: 'Autre', en: 'Other' },
};

// اللغة الحالية
let currentLang = localStorage.getItem('app_lang') || 'ar';

// ============================================
// دالة جلب النص المترجم
// ============================================
function t(key) {
  return translations[currentLang]?.[key] || translations.ar[key] || key;
}

// ============================================
// دالة جلب اسم البلد حسب اللغة الحالية
// ============================================
function tCountry(code) {
  return countries[code]?.[currentLang] || countries[code]?.ar || code;
}

// ============================================
// تطبيق اللغة على الصفحة
// ✅ يغيّر اتجاه الصفحة (RTL/LTR) تلقائياً
// ============================================
function applyLanguage() {
  const html = document.documentElement;
  html.lang = currentLang;
  html.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  // ترجمة النصوص
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // ترجمة placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  // ترجمة عناصر البلدان
  document.querySelectorAll('[data-country]').forEach(el => {
    el.textContent = tCountry(el.dataset.country);
  });
}

// ============================================
// تغيير اللغة
// ============================================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  applyLanguage();
}

// ============================================
// تصدير عالمي
// ============================================
window.t = t;
window.tCountry = tCountry;
window.applyLanguage = applyLanguage;
window.setLanguage = setLanguage;
window.getCurrentLang = () => currentLang;
window.countries = countries;