// ============================================
// نظام الترجمة (i18n)
// ✅ 3 لغات: العربية، الفرنسية، الإنجليزية
// ✅ 28 بلداً بأسماء مترجمة
// ✅ يغيّر ترتيب الصفحة تلقائياً (RTL/LTR)
// ✅ يعمل مع lang-boot.js
// ============================================

const translations = {
  ar: {
    app_name: 'MyStock',
    app_tagline: 'نظام إدارة المخزون',
    loading: 'جارٍ التحميل...',

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

    // subscription
    subscription_title: 'الاشتراك - MyStock',
    sub_no_org: 'لا يمكن تحديد المنظمة',
    sub_logout: 'تسجيل الخروج',
    sub_wait_title: 'بانتظار تفعيل الاشتراك',
    sub_wait_text: 'مدير المنظمة لم يُفعّل الاشتراك بعد. يرجى التواصل معه.',
    sub_plan_title: 'اشترك في MyStock',
    sub_plan_text: 'للاستفادة من جميع الميزات، يرجى تفعيل الاشتراك الشهري.',
    sub_plan_name: 'الخطة الأساسية',
    sub_plan_price: 'DH / شهرياً',
    sub_feature_1: 'عدد غير محدود من العمال',
    sub_feature_2: 'عدد غير محدود من المنتجات',
    sub_feature_3: 'إيصالات بيع غير محدودة',
    sub_feature_4: 'إدارة الموردين والفواتير',
    sub_feature_5: 'إشعارات فورية',
    sub_feature_6: 'دعم فني',
    sub_subscribe_now: 'الاشتراك الآن (150 DH)',
    sub_pending_title: 'طلبك قيد المراجعة',
    sub_pending_text: 'تم استلام طلب الاشتراك بنجاح. سيتم التواصل معك في أقرب وقت.',
    sub_pending_order: 'رقم الطلب:',
    sub_pending_plan: 'الخطة:',
    sub_pending_amount: 'المبلغ:',
    sub_pending_date: 'تاريخ الطلب:',
    sub_pay_now: 'إتمام الدفع الآن',
  },

  fr: {
    app_name: 'MyStock',
    app_tagline: 'Système de gestion de stock',
    loading: 'Chargement...',

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

    subscription_title: 'Abonnement - MyStock',
    sub_no_org: "Impossible d'identifier l'organisation",
    sub_logout: 'Déconnexion',
    sub_wait_title: "En attente d'activation",
    sub_wait_text: "L'administrateur n'a pas encore activé l'abonnement. Veuillez le contacter.",
    sub_plan_title: 'Abonnez-vous à MyStock',
    sub_plan_text: 'Pour profiter de toutes les fonctionnalités, activez votre abonnement mensuel.',
    sub_plan_name: 'Plan de base',
    sub_plan_price: 'DH / mois',
    sub_feature_1: 'Nombre illimité de travailleurs',
    sub_feature_2: 'Nombre illimité de produits',
    sub_feature_3: 'Reçus illimités',
    sub_feature_4: 'Gestion des fournisseurs et factures',
    sub_feature_5: 'Notifications instantanées',
    sub_feature_6: 'Support technique',
    sub_subscribe_now: "S'abonner maintenant (150 DH)",
    sub_pending_title: 'Votre demande est en cours',
    sub_pending_text: "Votre demande a bien été reçue. Nous vous contacterons bientôt.",
    sub_pending_order: 'N° de commande :',
    sub_pending_plan: 'Plan :',
    sub_pending_amount: 'Montant :',
    sub_pending_date: 'Date :',
    sub_pay_now: 'Payer maintenant',
  },

  en: {
    app_name: 'MyStock',
    app_tagline: 'Inventory Management System',
    loading: 'Loading...',

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

    subscription_title: 'Subscription - MyStock',
    sub_no_org: 'Cannot identify organization',
    sub_logout: 'Logout',
    sub_wait_title: 'Waiting for activation',
    sub_wait_text: 'The administrator has not activated the subscription yet. Please contact them.',
    sub_plan_title: 'Subscribe to MyStock',
    sub_plan_text: 'To enjoy all features, please activate your monthly subscription.',
    sub_plan_name: 'Basic Plan',
    sub_plan_price: 'DH / month',
    sub_feature_1: 'Unlimited workers',
    sub_feature_2: 'Unlimited products',
    sub_feature_3: 'Unlimited receipts',
    sub_feature_4: 'Suppliers & invoices management',
    sub_feature_5: 'Instant notifications',
    sub_feature_6: 'Technical support',
    sub_subscribe_now: 'Subscribe now (150 DH)',
    sub_pending_title: 'Your request is pending',
    sub_pending_text: 'Your subscription request has been received. We will contact you soon.',
    sub_pending_order: 'Order number:',
    sub_pending_plan: 'Plan:',
    sub_pending_amount: 'Amount:',
    sub_pending_date: 'Date:',
    sub_pay_now: 'Pay now',
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
// ✅ يضيف كلاس lang-xx على body
// ============================================
function applyLanguage() {
  const html = document.documentElement;
  html.lang = currentLang;
  html.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  // ✅ كلاس اللغة على body (لتمكين CSS من التكيّف)
  if (document.body) {
    document.body.classList.remove('lang-ar', 'lang-fr', 'lang-en');
    document.body.classList.add('lang-' + currentLang);
  }

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