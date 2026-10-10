// ============================================
// قائمة العملات العالمية + أدوات التنسيق
// ============================================

const CURRENCIES = {
  // ══════ العملات العربية ══════
  MAD: { symbol: 'DH', name: 'درهم مغربي' },
  SAR: { symbol: 'ر.س', name: 'ريال سعودي' },
  AED: { symbol: 'د.إ', name: 'درهم إماراتي' },
  DZD: { symbol: 'د.ج', name: 'دينار جزائري' },
  TND: { symbol: 'د.ت', name: 'دينار تونسي' },
  EGP: { symbol: 'ج.م', name: 'جنيه مصري' },
  KWD: { symbol: 'د.ك', name: 'دينار كويتي' },
  QAR: { symbol: 'ر.ق', name: 'ريال قطري' },
  OMR: { symbol: 'ر.ع', name: 'ريال عماني' },
  BHD: { symbol: 'د.ب', name: 'دينار بحريني' },
  JOD: { symbol: 'د.أ', name: 'دينار أردني' },
  LBP: { symbol: 'ل.ل', name: 'ليرة لبنانية' },
  IQD: { symbol: 'د.ع', name: 'دينار عراقي' },
  LYD: { symbol: 'د.ل', name: 'دينار ليبي' },
  SDG: { symbol: 'ج.س', name: 'جنيه سوداني' },
  YER: { symbol: 'ر.ي', name: 'ريال يمني' },
  SYP: { symbol: 'ل.س', name: 'ليرة سورية' },
  MRU: { symbol: 'أ.م', name: 'أوقية موريتانية' },
  SOS: { symbol: 'Sh', name: 'شلن صومالي' },
  DJF: { symbol: 'Fdj', name: 'فرنك جيبوتي' },
  KMF: { symbol: 'CF', name: 'فرنك قمري' },
  ILS: { symbol: '₪', name: 'شيكل إسرائيلي' },

  // ══════ الأمريكتان ══════
  USD: { symbol: '$', name: 'دولار أمريكي' },
  CAD: { symbol: 'C$', name: 'دولار كندي' },
  MXN: { symbol: 'Mex$', name: 'بيزو مكسيكي' },
  BRL: { symbol: 'R$', name: 'ريال برازيلي' },
  ARS: { symbol: '$', name: 'بيزو أرجنتيني' },
  CLP: { symbol: '$', name: 'بيزو تشيلي' },
  COP: { symbol: '$', name: 'بيزو كولومبي' },
  PEN: { symbol: 'S/', name: 'سول بيروفي' },
  UYU: { symbol: '$U', name: 'بيزو أوروغواي' },
  VES: { symbol: 'Bs', name: 'بوليفار فنزويلي' },
  BOB: { symbol: 'Bs', name: 'بوليفيانو بوليفي' },
  PYG: { symbol: '₲', name: 'غواراني باراغواي' },
  GYD: { symbol: 'G$', name: 'دولار غيانا' },
  SRD: { symbol: '$', name: 'دولار سورينامي' },

  // ══════ آسيا ══════
  CNY: { symbol: '¥', name: 'يوان صيني' },
  JPY: { symbol: '¥', name: 'ين ياباني' },
  KRW: { symbol: '₩', name: 'وون كوري' },
  INR: { symbol: '₹', name: 'روبية هندية' },
  PKR: { symbol: '₨', name: 'روبية باكستانية' },
  BDT: { symbol: '৳', name: 'تاكا بنغلاديشية' },
  LKR: { symbol: 'Rs', name: 'روبية سريلانكية' },
  NPR: { symbol: 'रू', name: 'روبية نيبالية' },
  AFN: { symbol: '؋', name: 'أفغاني' },
  IRR: { symbol: '﷼', name: 'ريال إيراني' },
  TRY: { symbol: '₺', name: 'ليرة تركية' },
  IDR: { symbol: 'Rp', name: 'روبية إندونيسية' },
  MYR: { symbol: 'RM', name: 'رينغيت ماليزي' },
  PHP: { symbol: '₱', name: 'بيزو فلبيني' },
  THB: { symbol: '฿', name: 'بات تايلاندي' },
  VND: { symbol: '₫', name: 'دونغ فيتنامي' },
  SGD: { symbol: 'S$', name: 'دولار سنغافوري' },
  HKD: { symbol: 'HK$', name: 'دولار هونغ كونغ' },
  TWD: { symbol: 'NT$', name: 'دولار تايواني' },
  KHR: { symbol: '៛', name: 'رييل كمبودي' },
  LAK: { symbol: '₭', name: 'كيب لاوسي' },
  MMK: { symbol: 'K', name: 'كيات ميانمار' },
  BND: { symbol: 'B$', name: 'دولار بروناي' },
  MNT: { symbol: '₮', name: 'توغروغ منغولي' },

  // ══════ أوروبا ══════
  EUR: { symbol: '€', name: 'يورو' },
  GBP: { symbol: '£', name: 'جنيه إسترليني' },
  CHF: { symbol: 'Fr', name: 'فرنك سويسري' },
  SEK: { symbol: 'kr', name: 'كرونة سويدية' },
  NOK: { symbol: 'kr', name: 'كرونة نرويجية' },
  DKK: { symbol: 'kr', name: 'كرونة دنماركية' },
  PLN: { symbol: 'zł', name: 'زلوتي بولندي' },
  CZK: { symbol: 'Kč', name: 'كرونة تشيكية' },
  HUF: { symbol: 'Ft', name: 'فورنت هنغاري' },
  RON: { symbol: 'lei', name: 'ليو روماني' },
  BGN: { symbol: 'лв', name: 'ليف بلغاري' },
  HRK: { symbol: 'kn', name: 'كونا كرواتية' },
  RSD: { symbol: 'дин', name: 'دينار صربي' },
  MKD: { symbol: 'ден', name: 'دينار مقدوني' },
  ALL: { symbol: 'L', name: 'ليك ألباني' },
  BAM: { symbol: 'KM', name: 'مارك بوسني' },
  MDL: { symbol: 'L', name: 'ليو مولدوفي' },
  UAH: { symbol: '₴', name: 'هريفنيا أوكرانية' },
  RUB: { symbol: '₽', name: 'روبل روسي' },
  ISK: { symbol: 'kr', name: 'كرونة آيسلندية' },
  GEL: { symbol: '₾', name: 'لاري جورجي' },
  AZN: { symbol: '₼', name: 'مانات أذربيجاني' },
  AMD: { symbol: '֏', name: 'درام أرميني' },

  // ══════ أفريقيا ══════
  ZAR: { symbol: 'R', name: 'راند جنوب أفريقي' },
  NGN: { symbol: '₦', name: 'نايرا نيجيري' },
  KES: { symbol: 'KSh', name: 'شلن كيني' },
  GHS: { symbol: '₵', name: 'سيدي غاني' },
  TZS: { symbol: 'TSh', name: 'شلن تنزاني' },
  UGX: { symbol: 'USh', name: 'شلن أوغندي' },
  RWF: { symbol: 'FRw', name: 'فرنك رواندي' },
  ETB: { symbol: 'Br', name: 'بير إثيوبي' },
  XOF: { symbol: 'CFA', name: 'فرنك غرب أفريقي' },
  XAF: { symbol: 'FCFA', name: 'فرنك وسط أفريقي' },
  ZMW: { symbol: 'ZK', name: 'كواشا زامبي' },
  MWK: { symbol: 'MK', name: 'كواشا مالاوي' },
  MZN: { symbol: 'MT', name: 'متكال موزمبيقي' },
  BWP: { symbol: 'P', name: 'بولا بوتسواني' },
  NAD: { symbol: 'N$', name: 'دولار ناميبي' },
  MUR: { symbol: '₨', name: 'روبية موريشيوسية' },
  SCR: { symbol: '₨', name: 'روبية سيشيلية' },
  CVE: { symbol: '$', name: 'إسكودو الرأس الأخضر' },
  GMD: { symbol: 'D', name: 'دالاسي غامبي' },
  GNF: { symbol: 'FG', name: 'فرنك غيني' },
  LRD: { symbol: 'L$', name: 'دولار ليبيري' },
  SLL: { symbol: 'Le', name: 'ليون سيراليوني' },
  STN: { symbol: 'Db', name: 'دوبرا ساو تومي' },
  AOA: { symbol: 'Kz', name: 'كوانزا أنغولي' },
  CDF: { symbol: 'FC', name: 'فرنك كونغولي' },
  BIF: { symbol: 'FBu', name: 'فرنك بوروندي' },
  ERN: { symbol: 'Nfk', name: 'ناكفا إريتري' },
  SSP: { symbol: '£', name: 'جنيه جنوب السودان' },

  // ══════ أوقيانوسيا ══════
  AUD: { symbol: 'A$', name: 'دولار أسترالي' },
  NZD: { symbol: 'NZ$', name: 'دولار نيوزيلندي' },
  FJD: { symbol: 'FJ$', name: 'دولار فيجي' },
  PGK: { symbol: 'K', name: 'كينا بابوا' },
  WST: { symbol: 'WS$', name: 'تالا ساموا' },
  TOP: { symbol: 'T$', name: 'بانغا تونغا' },
  VUV: { symbol: 'VT', name: 'فاتو فانواتو' },
  SBD: { symbol: 'SI$', name: 'دولار جزر سليمان' },
};

// ═══════════════════════════════════════════
// تنسيق القيمة المالية
// ═══════════════════════════════════════════
function formatCurrency(value, symbol = '', showSymbol = true) {
  const num = Number(value || 0);

  // تنسيق بفاصلة الآلاف + 2 خانات عشرية
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!showSymbol || !symbol) return formatted;
  return `${formatted} ${symbol}`;
}

// ═══════════════════════════════════════════
// تنسيق الكمية (بدون عملة)
// ═══════════════════════════════════════════
function formatQuantity(value) {
  const num = Number(value || 0);
  return num.toLocaleString('en-US');
}

// ═══════════════════════════════════════════
// جلب رمز العملة
// ═══════════════════════════════════════════
function getCurrencySymbol(code) {
  return CURRENCIES[code]?.symbol || '';
}

function getCurrencyName(code) {
  return CURRENCIES[code]?.name || '';
}

// ═══════════════════════════════════════════
// تصدير
// ═══════════════════════════════════════════
window.CurrencyUtils = {
  CURRENCIES,
  formatCurrency,
  formatQuantity,
  getCurrencySymbol,
  getCurrencyName,
};