export type SupportedLanguage = 'en' | 'ur' | 'ar';

export interface TranslationPhrases {
  rider: string;
  restaurant: string;
  waitlist: string;
  riderApplicationForm: string;
  fullLegalName: string;
  primaryModeOfTransport: string;
  emailAddress: string;
  emailAddressOptional: string;
  phoneNumber: string;
  primaryDispatchZone: string;
  areaNeighborhood: string;
  streetAddressOptional: string;
  selectCityFirst: string;
  typeToSearchCity: string;
  typeToSearchArea: string;
  deliveryExperience: string;
  restaurantPartnerOnboarding: string;
  authorizedRepresentative: string;
  restaurantBrandName: string;
  restaurantOperatingCity: string;
  primaryCuisineCategory: string;
  customerEarlyAccessInvite: string;
  fullName: string;
  mobilePlatformPreference: string;
  preferredDeliveryCity: string;
  primaryServiceInterest: string;
  responseTime: string;
  under24Hours: string;
  waitlistStatus: string;
  priorityBatch: string;
  submit: string;
  registrationGateway: string;
  agreementLabel: string;
  agreementPrefix: string;
  termsLink: string;
  agreementSuffix: string;
  submitting: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationPhrases> = {
  en: {
    rider: 'Rider',
    restaurant: 'Restaurant',
    waitlist: 'Waitlist',
    riderApplicationForm: 'Rider Application Form',
    fullLegalName: 'Full Legal Name',
    primaryModeOfTransport: 'Primary Mode of Transport',
    emailAddress: 'Email Address',
    emailAddressOptional: 'Email Address (Optional)',
    phoneNumber: 'Phone Number',
    primaryDispatchZone: 'Primary Dispatch Zone',
    areaNeighborhood: 'Area / Locality',
    streetAddressOptional: 'Street Address / Building (Optional)',
    selectCityFirst: 'Select a city first...',
    typeToSearchCity: 'Type to search city (e.g. Karachi, Lahore, Riyadh)...',
    typeToSearchArea: 'Type to search area (e.g. Clifton, Gulberg)...',
    deliveryExperience: 'Delivery Experience',
    restaurantPartnerOnboarding: 'Restaurant Partner Onboarding',
    authorizedRepresentative: 'Authorized Representative',
    restaurantBrandName: 'Restaurant Brand Name',
    restaurantOperatingCity: 'Restaurant Operating City',
    primaryCuisineCategory: 'Primary Cuisine Category (in english)',
    customerEarlyAccessInvite: 'Customer Early Access Invite',
    fullName: 'Full Name',
    mobilePlatformPreference: 'Mobile Platform Preference',
    preferredDeliveryCity: 'Preferred Delivery City',
    primaryServiceInterest: 'Primary Service Interest',
    responseTime: 'Response Time',
    under24Hours: 'Under 24 hours',
    waitlistStatus: 'WAITLIST STATUS',
    priorityBatch: 'PRIORITY BATCH',
    submit: 'Submit',
    registrationGateway: 'REGISTRATION GATEWAY',
    agreementLabel: 'I agree to the Terms of Use and service dispatch policy.',
    agreementPrefix: 'I agree to the ',
    termsLink: 'Terms of Use',
    agreementSuffix: ' and service dispatch policy.',
    submitting: 'Submitting...',
  },
  ur: {
    rider: 'ڈیلیوری رائیڈر',
    restaurant: 'ریسٹورنٹ',
    waitlist: 'انتظار کی فہرست',
    riderApplicationForm: 'رائڈر درخواست فارم',
    fullLegalName: 'مکمل قانونی نام',
    primaryModeOfTransport: 'بنیادی وسیلہ نقل',
    emailAddress: 'ای میل کا پتہ',
    emailAddressOptional: 'ای میل کا پتہ (اختیاری)',
    phoneNumber: 'فون نمبر',
    primaryDispatchZone: 'بنیادی ڈسپیچ زون',
    areaNeighborhood: 'علاقہ / لوکیشن',
    streetAddressOptional: 'گلی کا پتہ / عمارت (اختیاری)',
    selectCityFirst: 'پہلے شہر منتخب کریں...',
    typeToSearchCity: 'شہر تلاش کریں (مثلاً کراچی، لاہور، ریاض)...',
    typeToSearchArea: 'علاقہ تلاش کریں (مثلاً کلفٹن، گلبرگ)...',
    deliveryExperience: 'ڈیلیوری کا تجربہ',
    restaurantPartnerOnboarding: 'ریسٹورنٹ پارٹنر آن بورڈنگ',
    authorizedRepresentative: 'مجاز نمائندہ',
    restaurantBrandName: 'ریسٹورنٹ کا تجارتی نام',
    restaurantOperatingCity: 'ریسٹورنٹ کے آپریشن کا شہر',
    primaryCuisineCategory: 'نیادی کھانوں قسموں کے نام (انگریزی میں)',
    customerEarlyAccessInvite: 'صارفین کے لیے ابتدائی رسائی کی دعوت',
    fullName: 'مکمل نام',
    mobilePlatformPreference: 'ترجیحی موبائل پلیٹ فارم',
    preferredDeliveryCity: 'ترجیحی ڈیلیوری شہر',
    primaryServiceInterest: 'بنیادی دلچسپی کی سروس',
    responseTime: 'جواب کی مدت',
    under24Hours: '۲۴ گھنٹے سے کم',
    waitlistStatus: 'انتظار کی فہرست کا حال',
    priorityBatch: 'ترجیحی بیچ',
    submit: 'جمع کرائیں',
    registrationGateway: 'رجسٹریشن گیٹ وے',
    agreementLabel: 'میں شراکت داری کی شرائط اور سروس ڈسپیچ پالیسی سے اتفاق کرتا ہوں۔',
    agreementPrefix: 'میں سروس ڈسپیچ پالیسی اور ',
    termsLink: 'استعمال کی شرائط (Terms of Use)',
    agreementSuffix: ' سے اتفاق کرتا ہوں۔',
    submitting: 'جمع کروایا جا رہا ہے...',
  },
  ar: {
    rider: 'مندوب توصيل',
    restaurant: 'مطعم',
    waitlist: 'قائمة الانتظار',
    riderApplicationForm: 'نموذج الطلب لمندوب توصيل',
    fullLegalName: 'اسم القانوني كامل',
    primaryModeOfTransport: 'وسيلة النقل الاساسية',
    emailAddress: 'عنوان بريد الالكتروني',
    emailAddressOptional: 'عنوان بريد الالكتروني (اختياري)',
    phoneNumber: 'رقم الهاتف',
    primaryDispatchZone: 'منطقة التوزيع الأساسية',
    areaNeighborhood: 'المنطقة / الحي',
    streetAddressOptional: 'عنوان الشارع / المبنى (اختياري)',
    selectCityFirst: 'اختر المدينة أولاً...',
    typeToSearchCity: 'ابحث عن المدينة (مثل الرياض، جدة، كراتشي)...',
    typeToSearchArea: 'ابحث عن الحي أو المنطقة...',
    deliveryExperience: 'الخبرة في مجال التوصيل',
    restaurantPartnerOnboarding: 'تسجيل شريك المطعم',
    authorizedRepresentative: 'الممثل المفوّض',
    restaurantBrandName: 'الاسم التجاري للمطعم',
    restaurantOperatingCity: 'مدينة تشغيل المطعم',
    primaryCuisineCategory: 'الفئة الرئيسية للطعام باللغة الإنجليزية',
    customerEarlyAccessInvite: 'دعوة العملاء للوصول المبكر',
    fullName: 'الاسم الكامل',
    mobilePlatformPreference: 'المنصة المفضلة للهاتف',
    preferredDeliveryCity: 'مدينة التوصيل المفضلة',
    primaryServiceInterest: 'الخدمة الرئيسية محل الاهتمام',
    responseTime: 'مدة الاستجابة',
    under24Hours: 'أقل من ٢٤ ساعة',
    waitlistStatus: 'حالة قائمة الانتظار',
    priorityBatch: 'الدفعة ذات الأولوية',
    submit: 'إرسال',
    registrationGateway: 'بوابة التسجيل',
    agreementLabel: 'أوافق على شروط الشراكة وسياسة توزيع الخدمة.',
    agreementPrefix: 'أوافق على سياسة توزيع الخدمة و',
    termsLink: 'شروط الاستخدام (Terms of Use)',
    agreementSuffix: ' الرسمية.',
    submitting: 'جارٍ الإرسال...',
  },
};

/**
 * Returns dynamic typography classes that scale font-size up by ~4px for Urdu/Arabic scripts
 * while preserving standard font sizes for English.
 */
export const getTypographySize = (
  lang: SupportedLanguage,
  type: 'label' | 'heading' | 'input' | 'badge' | 'subtext'
): string => {
  if (lang === 'en') {
    switch (type) {
      case 'label':
        return 'text-xs font-mono tracking-wider'; // 12px
      case 'heading':
        return 'text-2xl sm:text-3xl font-display tracking-tight'; // 24-30px
      case 'input':
        return 'text-sm font-sans'; // 14px
      case 'badge':
        return 'text-[11px] font-mono tracking-widest'; // 11px
      case 'subtext':
        return 'text-xs font-mono'; // 12px
    }
  }

  // Urdu & Arabic: +4px average font size boost for optical clarity and script legibility
  switch (type) {
    case 'label':
      return 'text-base font-sans font-medium tracking-normal leading-relaxed'; // 16px (+4px from 12px)
    case 'heading':
      return 'text-3xl sm:text-4xl font-sans font-bold tracking-normal leading-snug'; // 30-36px (+6px)
    case 'input':
      return 'text-lg font-sans font-normal leading-relaxed'; // 18px (+4px from 14px)
    case 'badge':
      return 'text-sm font-sans font-semibold tracking-normal'; // 15px (+4px from 11px)
    case 'subtext':
      return 'text-base font-sans leading-relaxed'; // 16px (+4px from 12px)
  }
};
