export type SupportedLanguage = 'en' | 'ur' | 'ar';

export interface TranslationPhrases {
  rider: string;
  restaurant: string;
  waitlist: string;
  riderApplicationForm: string;
  fullLegalName: string;
  primaryModeOfTransport: string;
  emailAddress: string;
  phoneNumber: string;
  primaryDispatchZone: string;
  deliveryExperience: string;
  restaurantPartnerOnboarding: string;
  authorizedRepresentative: string;
  partnerBusinessType: string;
  restaurantBrandName: string;
  restaurantOperatingCity: string;
  primaryCuisineCategory: string;
  areaLocality: string;
  streetAddress: string;
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
  privacyLink: string;
  agreementSuffix: string;
  submitting: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationPhrases> = {
  en: {
    rider: 'Rider',
    restaurant: 'Merchant',
    waitlist: 'Customer',
    riderApplicationForm: 'Deliver with SpeedyMeals',
    fullLegalName: 'Full Legal Name',
    primaryModeOfTransport: 'Primary Mode of Transport',
    emailAddress: 'Email Address (Optional)',
    phoneNumber: 'Phone Number',
    primaryDispatchZone: 'Operating City',
    deliveryExperience: 'Delivery Experience',
    restaurantPartnerOnboarding: 'Partner Merchant Onboarding',
    authorizedRepresentative: 'Authorized Representative',
    partnerBusinessType: 'Partner Business Type',
    restaurantBrandName: 'Business / Brand Name',
    restaurantOperatingCity: 'Operating City',
    primaryCuisineCategory: 'Primary Category / Specialties (in English)',
    areaLocality: 'Area / Locality',
    streetAddress: 'Street Address / Building (Optional)',
    customerEarlyAccessInvite: 'Customer Early Access Invite',
    fullName: 'Full Name',
    mobilePlatformPreference: 'Mobile Platform Preference',
    preferredDeliveryCity: 'Preferred Delivery City',
    primaryServiceInterest: 'Primary Service Interest',
    responseTime: 'RESPONSE TIME',
    under24Hours: '1 to 2 business days',
    waitlistStatus: 'WAITLIST STATUS',
    priorityBatch: 'PRIORITY BATCH',
    submit: 'Submit',
    registrationGateway: 'SELECTED FORM',
    agreementLabel: 'I agree to the Terms of Use and Privacy Policy.',
    agreementPrefix: 'I agree to the ',
    termsLink: 'Terms of Use',
    privacyLink: 'Privacy Policy',
    agreementSuffix: '.',
    submitting: 'Submitting...',
  },
  ur: {
    rider: 'ڈیلیوری رائیڈر',
    restaurant: 'مرچنٹ / پارٹنر',
    waitlist: 'کسٹمر',
    riderApplicationForm: 'اسپیڈی میلز کے ساتھ ڈیلیور کریں',
    fullLegalName: 'مکمل قانونی نام',
    primaryModeOfTransport: 'بنیادی وسیلہ نقل',
    emailAddress: 'ای میل کا پتہ (اختیاری)',
    phoneNumber: 'فون نمبر',
    primaryDispatchZone: 'آپریشن کا شہر',
    deliveryExperience: 'ڈیلیوری کا تجربہ',
    restaurantPartnerOnboarding: 'مرچنٹ پارٹنر آن بورڈنگ',
    authorizedRepresentative: 'مجاز نمائندہ',
    partnerBusinessType: 'کاروبار کی قسم',
    restaurantBrandName: 'کاروبار / برانڈ کا نام',
    restaurantOperatingCity: 'آپریشن کا شہر',
    primaryCuisineCategory: 'بنیادی کیٹیگری / خاص پکوان (انگریزی میں)',
    areaLocality: 'علاقہ / لوکیلٹی',
    streetAddress: 'گلی کا پتہ / بلڈنگ (اختیاری)',
    customerEarlyAccessInvite: 'صارفین کے لیے ابتدائی رسائی کی دعوت',
    fullName: 'مکمل نام',
    mobilePlatformPreference: 'ترجیحی موبائل پلیٹ فارم',
    preferredDeliveryCity: 'ترجیحی ڈیلیوری شہر',
    primaryServiceInterest: 'بنیادی دلچسپی کی سروس',
    responseTime: 'جواب کی مدت',
    under24Hours: '۱ سے ۲ کاروباری دن',
    waitlistStatus: 'انتظار کی فہرست کا حال',
    priorityBatch: 'ترجیحی بیچ',
    submit: 'جمع کرائیں',
    registrationGateway: 'منتخب فارم',
    agreementLabel: 'میں استعمال کی شرائط اور پرائیویسی پالیسی سے اتفاق کرتا ہوں۔',
    agreementPrefix: 'میں ',
    termsLink: 'استعمال کی شرائط',
    privacyLink: 'پرائیویسی پالیسی',
    agreementSuffix: ' سے اتفاق کرتا ہوں۔',
    submitting: 'جمع کروایا جا رہا ہے...',
  },
  ar: {
    rider: 'مندوب توصيل',
    restaurant: 'التاجر / شريك',
    waitlist: 'العميل',
    riderApplicationForm: 'التوصيل مع سبيدي ميلز',
    fullLegalName: 'اسم القانوني كامل',
    primaryModeOfTransport: 'وسيلة النقل الاساسية',
    emailAddress: 'عنوان البريد الإلكتروني (اختياري)',
    phoneNumber: 'رقم الهاتف',
    primaryDispatchZone: 'مدينة التشغيل',
    deliveryExperience: 'الخبرة في مجال التوصيل',
    restaurantPartnerOnboarding: 'تسجيل التاجر الشريك',
    authorizedRepresentative: 'الممثل المفوّض',
    partnerBusinessType: 'نوع النشاط التجاري',
    restaurantBrandName: 'الاسم التجاري للمنشأة',
    restaurantOperatingCity: 'مدينة تشغيل المتجر',
    primaryCuisineCategory: 'الفئة الرئيسية / التخصصات (بالإنجليزية)',
    areaLocality: 'المنطقة / الحي',
    streetAddress: 'عنوان الشارع / المبنى (اختياري)',
    customerEarlyAccessInvite: 'دعوة العملاء للوصول المبكر',
    fullName: 'الاسم الكامل',
    mobilePlatformPreference: 'المنصة المفضلة للهاتف',
    preferredDeliveryCity: 'مدينة التوصيل المفضلة',
    primaryServiceInterest: 'الخدمة الرئيسية محل الاهتمام',
    responseTime: 'مدة الاستجابة',
    under24Hours: '١ إلى ٢ يوم عمل',
    waitlistStatus: 'حالة قائمة الانتظار',
    priorityBatch: 'الدفعة ذات الأولوية',
    submit: 'إرسال',
    registrationGateway: 'النموذج المختار',
    agreementLabel: 'أوافق على شروط الاستخدام وسياسة الخصوصية.',
    agreementPrefix: 'أوافق على ',
    termsLink: 'شروط الاستخدام',
    privacyLink: 'سياسة الخصوصية',
    agreementSuffix: '.',
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
        return 'text-xs font-sans tracking-wider font-semibold'; // 12px
      case 'heading':
        return 'text-2xl sm:text-3xl font-heading font-extrabold tracking-tight'; // 24-30px
      case 'input':
        return 'text-sm font-sans'; // 14px
      case 'badge':
        return 'text-xs font-sans tracking-wider font-bold'; // 12px
      case 'subtext':
        return 'text-xs font-sans'; // 12px
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
