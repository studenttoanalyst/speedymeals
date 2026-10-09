'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import {
  Bicycle,
  Storefront,
  Users,
  Check,
  ShieldCheck,
  Percent,
  Coins,
  ArrowRight,
  ClipboardText,
} from '@phosphor-icons/react';
import { PersonaType } from '@/types/home';
import {
  SUPPORTED_REGIONS,
  CITY_TO_COUNTRY_CODE,
  formatPhoneForRegion,
  validatePhoneForRegion,
} from '@/lib/validation/phone';
import {
  SupportedLanguage,
  TRANSLATIONS,
  getTypographySize,
} from '@/lib/i18n/translations';

interface PartnerSectionProps {
  activePersona: PersonaType;
  onSelectPersona: (persona: PersonaType) => void;
}

interface PersonaFormData {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  city: string;
  customCity?: string;
  vehicleType: string;
  businessName: string;
  businessType?: string;
  primaryCategory?: string;
  areaLocality?: string;
  streetAddress?: string;
  cuisineType: string;
  branches: string;
  devicePlatform: string;
  serviceInterest: string;
  agreed: boolean;
  honeypot?: string;
}

interface SubmittedPersonaRecord {
  referenceCode: string;
  data: PersonaFormData;
}

const defaultFormState: Record<PersonaType, PersonaFormData> = {
  rider: {
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+92',
    city: 'Karachi',
    customCity: '',
    vehicleType: 'Motorcycle',
    businessName: '',
    businessType: '',
    primaryCategory: '',
    areaLocality: '',
    streetAddress: '',
    cuisineType: '',
    branches: '1-3',
    devicePlatform: '',
    serviceInterest: '',
    agreed: false, // Default unchecked
    honeypot: '',
  },
  restaurant: {
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+92',
    city: 'Karachi',
    customCity: '',
    vehicleType: '',
    businessName: '',
    businessType: 'Restaurant',
    primaryCategory: '',
    areaLocality: '',
    streetAddress: '',
    cuisineType: '',
    branches: '1-3',
    devicePlatform: '',
    serviceInterest: '',
    agreed: false, // Default unchecked
    honeypot: '',
  },
  customer: {
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+92',
    city: 'Karachi',
    customCity: '',
    vehicleType: '',
    businessName: '',
    businessType: '',
    primaryCategory: '',
    areaLocality: '',
    streetAddress: '',
    cuisineType: '',
    branches: '1-3',
    devicePlatform: 'iOS (Apple TestFlight Beta)',
    serviceInterest: 'Zero-Markup Food Delivery',
    agreed: false, // Default unchecked
    honeypot: '',
  },
};

export const PartnerSection: React.FC<PartnerSectionProps> = ({
  activePersona,
  onSelectPersona,
}) => {
  const isMobile = useIsMobile();

  // Form state partitioned per persona so switching tabs loads dedicated forms
  const [formsData, setFormsData] = useState<Record<PersonaType, PersonaFormData>>(defaultFormState);

  // Completed submission records partitioned per persona
  const [submissions, setSubmissions] = useState<Record<PersonaType, SubmittedPersonaRecord | null>>({
    rider: null,
    restaurant: null,
    customer: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});
  const [formLoadedAt] = useState<number>(() => Date.now());
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ur' || lang === 'ar';

  // Automatically dismiss error disclaimer and field errors when switching persona tabs
  useEffect(() => {
    setError(null);
    setFieldErrors({});
  }, [activePersona]);

  // Active form data getter and updater for current persona
  const formData = formsData[activePersona];
  const setFormData = (updater: React.SetStateAction<PersonaFormData> | Partial<PersonaFormData>) => {
    if (typeof updater === 'function') {
      setFormsData(prev => ({
        ...prev,
        [activePersona]: (updater as (prevForm: PersonaFormData) => PersonaFormData)(prev[activePersona]),
      }));
    } else {
      setFormsData(prev => ({
        ...prev,
        [activePersona]: {
          ...prev[activePersona],
          ...updater,
        },
      }));
    }
  };

  // Active submission for currently viewed persona
  const activeSubmission = submissions[activePersona];
  const submittedId = activeSubmission ? activeSubmission.referenceCode : null;
  const submittedData = activeSubmission ? activeSubmission.data : formData;

  // Regional phone configuration & real-time validation for active form
  const currentRegion = SUPPORTED_REGIONS[formData.countryCode] || SUPPORTED_REGIONS['+92'];
  const phoneValidation = validatePhoneForRegion(formData.phone, formData.countryCode);

  const handleCountryCodeChange = (newCountryCode: string) => {
    const targetRegion = SUPPORTED_REGIONS[newCountryCode];
    const citiesForRegion = targetRegion ? targetRegion.cities : [];
    const currentCityValid = formData.city === 'Other' || citiesForRegion.includes(formData.city);
    const newCity = currentCityValid ? formData.city : (citiesForRegion[0] || formData.city);
    const reformattedPhone = formData.phone
      ? formatPhoneForRegion(formData.phone, newCountryCode)
      : formData.phone;

    setFieldErrors(prev => ({ ...prev, phone: undefined }));
    setFormData({
      ...formData,
      countryCode: newCountryCode,
      city: newCity,
      phone: reformattedPhone,
    });
  };

  const handleCityChange = (newCity: string) => {
    if (newCity === 'Other') {
      setFormData({ ...formData, city: 'Other' });
      return;
    }
    const inferredCountryCode = CITY_TO_COUNTRY_CODE[newCity];
    if (inferredCountryCode && inferredCountryCode !== formData.countryCode) {
      const reformattedPhone = formData.phone
        ? formatPhoneForRegion(formData.phone, inferredCountryCode)
        : formData.phone;
      setFieldErrors(prev => ({ ...prev, phone: undefined }));
      setFormData({
        ...formData,
        city: newCity,
        countryCode: inferredCountryCode,
        phone: reformattedPhone,
      });
    } else {
      setFormData({ ...formData, city: newCity });
    }
  };

  const handlePhoneChange = (rawValue: string) => {
    const formatted = formatPhoneForRegion(rawValue, formData.countryCode);
    setFieldErrors(prev => ({ ...prev, phone: undefined }));
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) return;
    if (activePersona === 'customer' && !formData.email) return;
    if (activePersona === 'restaurant' && (!formData.businessName || !formData.areaLocality)) {
      setError('Please provide your Business Name and Area/Locality.');
      return;
    }
    if (!formData.agreed) {
      setError('Please review and accept the agreement terms to proceed.');
      return;
    }

    if (formData.city === 'Other') {
      const customTrimmed = formData.customCity?.trim();
      if (!customTrimmed || customTrimmed.toLowerCase() === 'other' || customTrimmed.toLowerCase() === 'others') {
        setError('Please specify your actual city or district name.');
        return;
      }
    }

    // Strict regional phone validation check before submitting
    const checkValidation = validatePhoneForRegion(formData.phone, formData.countryCode);
    if (!checkValidation.isValid) {
      setError(checkValidation.error || 'Please enter a valid phone number for the selected country.');
      setFieldErrors(prev => ({ ...prev, phone: checkValidation.error }));
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const effectiveCity = formData.city === 'Other'
      ? formData.customCity!.trim()
      : formData.city;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          ...formData,
          city: effectiveCity,
          customCity: formData.customCity?.trim(),
          phone: checkValidation.formatted,
          website_url: formData.honeypot || '',
          formLoadedAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
        }
        throw new Error(data.error || 'Failed to submit registration. Please try again.');
      }

      // Record successful submission strictly for this persona
      setSubmissions(prev => ({
        ...prev,
        [activePersona]: {
          referenceCode: data.referenceCode,
          data: {
            ...formData,
            city: effectiveCity,
            phone: checkValidation.formatted,
          },
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = (personaToReset?: PersonaType) => {
    const targetPersona = personaToReset || activePersona;
    setSubmissions(prev => ({
      ...prev,
      [targetPersona]: null,
    }));
    setFormsData(prev => ({
      ...prev,
      [targetPersona]: { ...defaultFormState[targetPersona] },
    }));
    setError(null);
    setFieldErrors({});
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section
      id="partner"
      className="relative z-10 py-24 sm:py-32 border-t border-[#E4E2DD] bg-[#FFFFFF]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-sans text-xs uppercase tracking-wider text-[#5B5F66] font-semibold whitespace-nowrap">
                [ 03 ]
              </span>
              <span className="font-sans text-xs uppercase tracking-wider text-[#15171A] font-bold whitespace-nowrap">
                Partner With Us
              </span>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-[#E4E2DD] mx-3" />
            <span className="font-sans text-[10px] sm:text-xs text-[#E23A2E] tracking-wider uppercase font-semibold whitespace-nowrap">
              ENROLLMENT OPEN
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <h2 className="font-display text-xl sm:text-3xl md:text-3xl lg:text-4xl uppercase tracking-tight text-[#15171A] leading-tight">
              <span className="block">Direct Partnership.</span>
              <span
                className="block transition-colors duration-300"
                style={{ color: 'var(--dynamic-accent, #E23A2E)' }}
              >
                Transparent Economics.
              </span>
            </h2>

            <p className="text-xs sm:text-sm font-sans text-ink-soft max-w-sm leading-relaxed">
              Choose your role below to join our early access launch network across Pakistan and Saudi Arabia.
            </p>
          </div>
        </div>

        {/* Role Selection: Unboxed, Clean, Non-Jargon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16">
          {/* Card 1: Rider */}
          <div
            id="persona-col-rider"
            onClick={() => onSelectPersona('rider')}
            className={`p-6 sm:p-8 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${activePersona === 'rider'
                ? 'bg-paper-off ring-2 ring-red shadow-sm'
                : 'hover:bg-paper-off/60'
              }`}
          >
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full text-red flex items-center justify-center bg-red/10">
                  <Bicycle size={22} weight="bold" />
                </div>
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-red">
                  For Riders
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-ink tracking-tight mb-2">
                Deliver
              </h3>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-6">
                Deliver meals on your own terms with transparent fees and regular weekly payouts straight to your account.
              </p>
            </div>

            <button
              type="button"
              id="btn-select-rider"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPersona('rider');
              }}
              className={`w-full py-3 text-xs font-sans font-bold uppercase tracking-wider rounded-full transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'rider'
                  ? 'bg-red text-white'
                  : 'bg-black/5 text-ink hover:bg-ink hover:text-white'
                }`}
            >
              <span>{activePersona === 'rider' ? 'Active Form' : 'Apply as Rider'}</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>

          {/* Card 2: Merchant */}
          <div
            id="persona-col-restaurant"
            onClick={() => onSelectPersona('restaurant')}
            className={`p-6 sm:p-8 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${activePersona === 'restaurant'
                ? 'bg-paper-off ring-2 ring-blue shadow-sm'
                : 'hover:bg-paper-off/60'
              }`}
          >
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full text-blue flex items-center justify-center bg-blue/10">
                  <Storefront size={22} weight="bold" />
                </div>
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-blue">
                  For Merchants
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-ink tracking-tight mb-2">
                List Your Store
              </h3>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-6">
                Reach hungry customers across your city with easy order management and predictable, low commission rates.
              </p>
            </div>

            <div>
              <button
                type="button"
                id="btn-select-restaurant"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPersona('restaurant');
                }}
                className={`w-full py-3 text-xs font-sans font-bold uppercase tracking-wider rounded-full transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'restaurant'
                    ? 'bg-blue text-white'
                    : 'bg-black/5 text-blue hover:bg-blue hover:text-white'
                  }`}
              >
                <span>{activePersona === 'restaurant' ? 'Active Form' : 'Partner as Merchant'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>

              <div className="mt-3 text-center">
                <Link
                  id="link-existing-restaurant-portal"
                  href="/restaurant"
                  className="font-sans text-xs text-blue hover:underline inline-flex items-center gap-1"
                >
                  <span>Already registered? Access Merchant Portal</span>
                  <ArrowRight size={10} weight="bold" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Customer */}
          <div
            id="persona-col-customer"
            onClick={() => onSelectPersona('customer')}
            className={`p-6 sm:p-8 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${activePersona === 'customer'
                ? 'bg-paper-off ring-2 ring-tan shadow-sm'
                : 'hover:bg-paper-off/60'
              }`}
          >
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full text-tan flex items-center justify-center bg-tan/10">
                  <Users size={22} weight="bold" />
                </div>
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-tan">
                  For Customers
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-ink tracking-tight mb-2">
                Get Early Access
              </h3>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-3">
                Real food prices from beloved local kitchens. Be the first to order when SpeedyMeals launches in your area.
              </p>
              {/* VIP promo badge */}
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-tan/15 border border-tan/30 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-tan inline-block" />
                <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-tan">
                  VIP: Up to 50% off your first 3 orders
                </span>
              </div>
            </div>

            <button
              type="button"
              id="btn-select-customer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPersona('customer');
              }}
              className={`w-full py-3 text-xs font-sans font-bold uppercase tracking-wider rounded-full transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'customer'
                  ? 'bg-tan text-ink'
                  : 'bg-tan/15 text-tan hover:bg-tan hover:text-ink'
                }`}
            >
              <span>{activePersona === 'customer' ? 'Active Form' : 'Get VIP Access'}</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>

        {/* REGISTRATION FORM PANEL: Styled - dark canvas for all personas */}
        <div
          id="registration-flow-panel"
          className="rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl border bg-[#1A1D23] text-white border-white/5 transition-all duration-300"
        >
          {/* Top Panel Nav & Title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#373C46]">
            <div>
              <div className="font-sans text-xs uppercase tracking-wider font-semibold mb-1 flex items-center space-x-2">
                <span
                  className="w-2 h-2 inline-block"
                  style={{
                    backgroundColor:
                      activePersona === 'rider'
                        ? '#E23A2E'
                        : activePersona === 'restaurant'
                          ? '#1E5FA8'
                          : '#C7A874',
                  }}
                />
                <span
                  style={{
                    color:
                      activePersona === 'rider'
                        ? '#E23A2E'
                        : activePersona === 'restaurant'
                          ? '#1E5FA8'
                          : '#C7A874',
                  }}
                >
                  {t.registrationGateway}
                </span>
              </div>
              <h3 className={`${getTypographySize(lang, 'heading')} uppercase text-white`}>
                {activePersona === 'rider' && t.riderApplicationForm}
                {activePersona === 'restaurant' && t.restaurantPartnerOnboarding}
                {activePersona === 'customer' && t.customerEarlyAccessInvite}
              </h3>
            </div>

            {/* Controls: Persona Switcher Tabs + Multilingual Language Switcher */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              {/* Persona Switcher Tabs inside panel */}
              <div className="flex font-sans text-xs border border-[#373C46]">
                <button
                  type="button"
                  id="btn-tab-rider"
                  onClick={() => onSelectPersona('rider')}
                  className={`px-3.5 sm:px-4 py-2 uppercase tracking-wider transition-colors cursor-pointer ${activePersona === 'rider'
                    ? 'bg-red text-white font-bold'
                    : 'bg-[#1A1D23] text-[#8C9099] hover:text-white hover:bg-[#2A2E37]'
                    }`}
                >
                  {t.rider}
                </button>
                <button
                  type="button"
                  id="btn-tab-restaurant"
                  onClick={() => onSelectPersona('restaurant')}
                  className={`px-3.5 sm:px-4 py-2 uppercase tracking-wider border-l border-[#373C46] transition-colors cursor-pointer ${activePersona === 'restaurant'
                    ? 'bg-blue text-white font-bold'
                    : 'bg-[#1A1D23] text-[#8C9099] hover:text-white hover:bg-[#2A2E37]'
                    }`}
                >
                  {t.restaurant}
                </button>
                <button
                  type="button"
                  id="btn-tab-customer"
                  onClick={() => onSelectPersona('customer')}
                  className={`px-3.5 sm:px-4 py-2 uppercase tracking-wider border-l border-[#373C46] transition-colors cursor-pointer ${activePersona === 'customer'
                    ? 'bg-tan text-ink font-bold'
                    : 'bg-[#1A1D23] text-[#8C9099] hover:text-white hover:bg-[#2A2E37]'
                    }`}
                >
                  {t.waitlist}
                </button>
              </div>

              {/* Multilingual Selector [ EN | اردو | العربية ] */}
              <div
                id="registration-lang-toggle"
                className="flex items-center border border-[#373C46] bg-[#1A1D23] p-0.5 text-xs font-sans shadow-xs"
              >
                <button
                  type="button"
                  id="lang-btn-en"
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1.5 transition-all cursor-pointer ${lang === 'en'
                    ? 'bg-white text-ink font-bold shadow-xs'
                    : 'text-[#8C9099] hover:text-white'
                    }`}
                  title="English"
                >
                  EN
                </button>
                <button
                  type="button"
                  id="lang-btn-ur"
                  onClick={() => setLang('ur')}
                  className={`px-3 py-1.5 transition-all cursor-pointer font-sans text-sm ${lang === 'ur'
                    ? 'bg-white text-ink font-bold shadow-xs'
                    : 'text-[#8C9099] hover:text-white'
                    }`}
                  title="اردو (Urdu)"
                >
                  اردو
                </button>
                <button
                  type="button"
                  id="lang-btn-ar"
                  onClick={() => setLang('ar')}
                  className={`px-3 py-1.5 transition-all cursor-pointer font-sans text-sm ${lang === 'ar'
                    ? 'bg-white text-ink font-bold shadow-xs'
                    : 'text-[#8C9099] hover:text-white'
                    }`}
                  title="العربية (Arabic)"
                >
                  العربية
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {submittedId ? (
              /* Success State Ticket */
              <motion.div
                key={`success-${activePersona}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`border border-[#373C46] bg-[#2A2E37] p-8 max-w-2xl mx-auto font-sans text-left border-t-2 ${activePersona === 'rider'
                  ? 'border-t-red'
                  : activePersona === 'restaurant'
                    ? 'border-t-blue'
                    : 'border-t-tan'
                  }`}
              >
                <div
                  className="flex items-center space-x-3 mb-4"
                  style={{
                    color:
                      activePersona === 'customer'
                        ? '#C7A874'
                        : activePersona === 'restaurant'
                          ? '#1E5FA8'
                          : '#E23A2E',
                  }}
                >
                  <Check size={28} weight="bold" className="text-[#10B981] shrink-0" />
                  <span className="font-heading font-extrabold text-xl uppercase tracking-tight">
                    {activePersona === 'customer'
                      ? 'Customer Early Access Reserved'
                      : activePersona === 'restaurant'
                        ? 'Merchant Application Received'
                        : 'Rider Application Received'}
                  </span>
                </div>
                <p className="text-sm mb-6 font-sans text-[#A0A4AB]">
                  {activePersona === 'customer'
                    ? "You're in! Your VIP early access is reserved. You'll get up to 50% off your first 3 orders, plus a beta app invite as soon as SpeedyMeals launches in your city."
                    : 'Your registration has been logged directly with our regional dispatch operations. Our team will review your application and contact you within 1 to 2 business days.'}
                </p>

                <div className="p-4 bg-[#1E2228] border border-[#373C46] space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66] font-semibold">REFERENCE CODE:</span>
                    <span
                      className="font-bold tracking-widest text-sm font-sans"
                      style={{
                        color:
                          activePersona === 'customer'
                            ? '#C7A874'
                            : activePersona === 'restaurant'
                              ? '#1E5FA8'
                              : '#E23A2E',
                      }}
                    >
                      {submittedId}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66] font-semibold">SELECTED ROLE:</span>
                    <span
                      className="font-bold uppercase tracking-wider"
                      style={{
                        color:
                          activePersona === 'customer'
                            ? '#C7A874'
                            : activePersona === 'restaurant'
                              ? '#1E5FA8'
                              : '#E23A2E',
                      }}
                    >
                      {activePersona === 'customer'
                        ? 'Customer Waitlist'
                        : activePersona === 'restaurant'
                          ? 'Merchant Partner'
                          : 'Courier Rider'}
                    </span>
                  </div>
                  {submittedData.email && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5B5F66] font-semibold">EMAIL:</span>
                      <span className="text-white">{submittedData.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66] font-semibold">PHONE:</span>
                    <span className="text-white font-sans">
                      {submittedData.countryCode} {submittedData.phone}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66] font-semibold">CITY / ZONE:</span>
                    <span className="text-white">
                      {submittedData.city} {submittedData.areaLocality ? `· ${submittedData.areaLocality}` : ''}
                    </span>
                  </div>
                  {activePersona === 'restaurant' && submittedData.businessName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5B5F66] font-semibold">BUSINESS:</span>
                      <span className="text-white">{submittedData.businessName} ({submittedData.businessType || 'Restaurant'})</span>
                    </div>
                  )}
                  {activePersona === 'rider' && submittedData.vehicleType && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5B5F66] font-semibold">TRANSPORT:</span>
                      <span className="text-white">{submittedData.vehicleType}</span>
                    </div>
                  )}
                </div>

                {/* Clear Next Steps & Support Channel */}
                <div className="mb-6 p-3.5 bg-[#17191E] border-l-2 border-l-[#10B981] text-xs font-sans space-y-1">
                  <span className="text-white font-bold block uppercase tracking-wider">Next Steps:</span>
                  <p className="text-[#8C9099] font-sans text-xs">
                    Please keep your Reference Code handy. If you have questions or need to provide documentation, reach out to our team at{' '}
                    <a href="mailto:support@speedymealservices.com" className="text-white underline hover:text-[#10B981]">
                      support@speedymealservices.com
                    </a>{' '}
                    or WhatsApp{' '}
                    <a href="https://wa.me/923000000000" target="_blank" rel="noopener noreferrer" className="text-[#10B981] underline">
                      +92 300 0000000
                    </a>.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => handleReset(activePersona)}
                    className={`px-6 py-3.5 text-xs font-sans uppercase tracking-wider font-bold border transition-colors duration-150 flex items-center space-x-2 cursor-pointer ${activePersona === 'customer'
                      ? 'bg-tan text-ink border-tan hover:bg-white hover:text-ink hover:border-white'
                      : activePersona === 'restaurant'
                        ? 'bg-blue text-white border-blue hover:bg-white hover:text-blue hover:border-white'
                        : 'bg-red text-white border-red hover:bg-white hover:text-red hover:border-white'
                      }`}
                  >
                    <span>
                      {activePersona === 'customer'
                        ? 'Register Another User'
                        : activePersona === 'restaurant'
                          ? 'Submit Another Merchant Application'
                          : 'Submit Another Rider Application'}
                    </span>
                    <ArrowRight size={13} weight="bold" />
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Interactive Registration Form */
              <motion.form
                key={`form-${activePersona}-${lang}`}
                dir={isRtl ? 'rtl' : 'ltr'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {error && (
                  <div className="p-4 border border-[#E23A2E]/50 bg-[#E23A2E]/10 text-xs font-sans text-[#E23A2E] flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="underline uppercase tracking-wider text-[10px] ml-4 hover:text-white cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Row 1, Col 1: Authorized Representative / Full Legal Name / Full Name */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-full-name"
                      className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                    >
                      {activePersona === 'restaurant'
                        ? t.authorizedRepresentative
                        : activePersona === 'customer'
                          ? t.fullName
                          : t.fullLegalName}{' '}
                      *
                    </label>
                    <input
                      id="form-full-name"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={
                        activePersona === 'restaurant'
                          ? 'e.g. Tariq Al-Mansoor'
                          : activePersona === 'customer'
                            ? 'e.g. Sarah Jenkins'
                            : 'e.g. Imran Khan'
                      }
                      className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* Row 1, Col 2: Partner Business Type (Merchant) or Platform (Customer) or Mode of Transport (Rider) */}
                  {activePersona === 'restaurant' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-business-type"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.partnerBusinessType} *
                      </label>
                      <select
                        id="form-business-type"
                        value={formData.businessType || 'Restaurant'}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none focus:border-[#1E5FA8] transition-colors cursor-pointer`}
                      >
                        <option value="Restaurant">Restaurant</option>
                        <option value="Home Kitchen">Home Kitchen</option>
                        <option value="Grocery / Mart">Grocery / Mart</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Bakery / Sweets">Bakery / Sweets</option>
                        <option value="Cafe / Beverages">Cafe / Beverages</option>
                        <option value="Other Retail">Other Retail</option>
                      </select>
                    </div>
                  ) : activePersona === 'customer' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-platform"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.mobilePlatformPreference} *
                      </label>
                      <select
                        id="form-platform"
                        value={formData.devicePlatform}
                        onChange={(e) => setFormData({ ...formData, devicePlatform: e.target.value })}
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none focus:border-[#C7A874] transition-colors cursor-pointer`}
                      >
                        <option value="iOS (Apple TestFlight Beta)">iOS (Apple TestFlight Beta)</option>
                        <option value="Android (Google Play Beta)">Android (Google Play Beta)</option>
                        <option value="Both iOS & Android">Both iOS & Android</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-vehicle"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.primaryModeOfTransport} *
                      </label>
                      <select
                        id="form-vehicle"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none focus:border-[#E23A2E] transition-colors cursor-pointer`}
                      >
                        <option value="Motorcycle">Motorcycle (125cc - 250cc)</option>
                        <option value="Electric Scooter">Electric Scooter / E-Bike</option>
                        <option value="Bicycle">Bicycle (Urban Zones)</option>
                        <option value="Sedan Car">Car / Sedan</option>
                      </select>
                    </div>
                  )}

                  {/* Row 2, Col 1: Business / Brand Name (Merchant) or Service Interest (Customer) or Experience (Rider) */}
                  {activePersona === 'restaurant' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-business-name"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.restaurantBrandName} *
                      </label>
                      <input
                        id="form-business-name"
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Damascus Charcoal Grill"
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#1E5FA8] transition-colors`}
                      />
                    </div>
                  ) : activePersona === 'customer' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-interest"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.primaryServiceInterest}
                      </label>
                      <select
                        id="form-interest"
                        value={formData.serviceInterest}
                        onChange={(e) => setFormData({ ...formData, serviceInterest: e.target.value })}
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none focus:border-[#C7A874] cursor-pointer`}
                      >
                        <option value="Zero-Markup Food Delivery">Zero-Markup Food Delivery</option>
                        <option value="Express Courier & Parcel">Express Courier & Parcel</option>
                        <option value="Groceries & Daily Essentials">Groceries & Daily Essentials</option>
                        <option value="All Speedy Services">All Speedy Services</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-experience"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.deliveryExperience}
                      </label>
                      <select
                        id="form-experience"
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none focus:border-[#E23A2E] cursor-pointer`}
                      >
                        <option>Over 1 Year (Active courier)</option>
                        <option>6 - 12 Months</option>
                        <option>New Courier (Needs onboarding)</option>
                      </select>
                    </div>
                  )}

                  {/* Row 2, Col 2: Primary Category / Specialties (in English) for Merchant */}
                  {activePersona === 'restaurant' && (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-primary-category"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.primaryCuisineCategory}
                      </label>
                      <input
                        id="form-primary-category"
                        type="text"
                        value={formData.primaryCategory || ''}
                        onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
                        placeholder="e.g. Biryani &amp; Kebabs, Cafe, Pizza"
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#1E5FA8]`}
                      />
                    </div>
                  )}

                  {/* Row 3, Col 1: Email Address (Optional for Merchant/Rider, Required for Customer) */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-email"
                      className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                    >
                      {activePersona === 'customer' ? `${t.fullName.includes('نام') ? 'ای میل کا پتہ' : 'Email Address'} *` : t.emailAddress}
                    </label>
                    <input
                      id="form-email"
                      type="email"
                      required={activePersona === 'customer'}
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (fieldErrors.email) {
                          setFieldErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="contact@domain.com (optional)"
                      className={`w-full bg-[#1A1D23] border px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors ${fieldErrors.email ? 'border-[#E23A2E]' : 'border-[#373C46]'
                        }`}
                    />
                    {fieldErrors.email && (
                      <div className="text-xs font-sans text-[#E23A2E] pt-0.5">
                        {fieldErrors.email}
                      </div>
                    )}
                  </div>

                  {/* Row 3, Col 2: Phone Number with Country Code Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="form-phone"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.phoneNumber} *
                      </label>
                      <span className="font-sans text-xs text-[#8C9099]">
                        {currentRegion.flag} {currentRegion.country}
                      </span>
                    </div>
                    <div className="flex relative">
                      <select
                        id="form-country-code"
                        value={formData.countryCode}
                        onChange={(e) => handleCountryCodeChange(e.target.value)}
                        className="bg-[#262A32] border border-r-0 border-[#373C46] px-3 py-3.5 text-xs text-white font-sans focus:outline-none cursor-pointer"
                      >
                        {Object.entries(SUPPORTED_REGIONS).map(([code, reg]) => (
                          <option key={code} value={code}>
                            {reg.flag} {reg.shortName} ({reg.code})
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <input
                          id="form-phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder={currentRegion.placeholder}
                          className={`w-full bg-[#1A1D23] border px-4 py-3.5 pr-10 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors font-sans ${fieldErrors.phone
                            ? 'border-[#E23A2E]'
                            : formData.phone.length > 0
                              ? phoneValidation.isValid
                                ? 'border-[#10B981]'
                                : 'border-[#E23A2E]'
                              : 'border-[#373C46]'
                            }`}
                        />
                        {formData.phone.length > 0 && phoneValidation.isValid && !fieldErrors.phone && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#10B981] flex items-center pointer-events-none">
                            <Check size={18} weight="bold" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Regional Format Guidance */}
                    {fieldErrors.phone ? (
                      <div className="text-xs font-sans text-[#E23A2E] pt-0.5">
                        {fieldErrors.phone}
                      </div>
                    ) : formData.phone.length > 0 ? (
                      phoneValidation.isValid ? (
                        <div className="flex items-center space-x-1.5 text-xs font-sans text-[#10B981] pt-0.5">
                          <Check size={13} weight="bold" />
                          <span>Valid {currentRegion.country} phone: {phoneValidation.fullInternational}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-sans text-[#E23A2E] pt-0.5">
                          {phoneValidation.error}
                        </div>
                      )
                    ) : (
                      <div className="text-xs font-sans text-[#5B5F66] pt-0.5">
                        Format: {currentRegion.helper}
                      </div>
                    )}
                  </div>

                  {/* Row 4, Col 1: Operating City */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-city"
                      className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                    >
                      {activePersona === 'customer'
                        ? t.preferredDeliveryCity
                        : activePersona === 'restaurant'
                          ? t.restaurantOperatingCity
                          : t.primaryDispatchZone}{' '}
                      *
                    </label>
                    <select
                      id="form-city"
                      value={formData.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none transition-colors cursor-pointer`}
                    >
                      {Object.entries(SUPPORTED_REGIONS).map(([code, reg]) => (
                        <optgroup key={code} label={`${reg.flag} ${reg.country} (${reg.code})`}>
                          {reg.cities.map((cityName) => (
                            <option key={cityName} value={cityName}>
                              {cityName}, {reg.country}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <optgroup label="Others...">
                        <option value="Other">Others... (Specify City)</option>
                      </optgroup>
                    </select>

                    {formData.city === 'Other' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2 space-y-1.5"
                      >
                        <label
                          htmlFor="form-custom-city"
                          className="block font-sans text-xs uppercase tracking-wider text-tan font-bold"
                        >
                          Please Specify Your City / Area *
                        </label>
                        <input
                          id="form-custom-city"
                          type="text"
                          required
                          value={formData.customCity || ''}
                          onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                          placeholder="e.g. Kasur, Sheikhupura, Sargodha, Abbottabad, etc."
                          className={`w-full bg-[#1A1D23] border border-[#B89865] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors`}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Row 4, Col 2: Area / Locality (Merchant) */}
                  {activePersona === 'restaurant' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-area-locality"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.areaLocality} *
                      </label>
                      <input
                        id="form-area-locality"
                        type="text"
                        required
                        value={formData.areaLocality || ''}
                        onChange={(e) => setFormData({ ...formData, areaLocality: e.target.value })}
                        placeholder="e.g. DHA Phase 5, Gulberg, Olaya, Al-Malaz"
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#1E5FA8]`}
                      />
                    </div>
                  ) : null}

                  {/* Row 5: Street Address / Building (Optional) for Merchant (Full Width Span 2) */}
                  {activePersona === 'restaurant' && (
                    <div className="md:col-span-2 space-y-2">
                      <label
                        htmlFor="form-street-address"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.streetAddress}
                      </label>
                      <input
                        id="form-street-address"
                        type="text"
                        value={formData.streetAddress || ''}
                        onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                        placeholder="e.g. Building 4B, Street 12, Floor 2"
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#1E5FA8]`}
                      />
                    </div>
                  )}

                  {/* Anti-Bot Honeypot Trap (Hidden from users) */}
                  <div
                    aria-hidden="true"
                    className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
                  >
                    <label htmlFor="form-website-url">Website verification</label>
                    <input
                      id="form-website-url"
                      name="website_url"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.honeypot || ''}
                      onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                    />
                  </div>
                </div>

                {/* Terms agreement */}
                <div className="pt-2 flex items-start space-x-3">
                  <input
                    id="form-agreed"
                    type="checkbox"
                    required
                    checked={formData.agreed}
                    onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                    className="mt-1"
                    style={{
                      accentColor:
                        activePersona === 'customer'
                          ? '#C7A874'
                          : activePersona === 'restaurant'
                            ? '#1E5FA8'
                            : '#E23A2E',
                    }}
                  />
                  <label htmlFor="form-agreed" className={`${getTypographySize(lang, 'subtext')} text-[#A0A4AB] leading-relaxed select-none`}>
                    {t.agreementPrefix}
                    <Link
                      id="link-terms-agreement"
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline underline-offset-2 hover:text-red transition-colors font-semibold inline"
                    >
                      {t.termsLink}
                    </Link>
                    <span> and </span>
                    <Link
                      id="link-privacy-agreement"
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline underline-offset-2 hover:text-red transition-colors font-semibold inline"
                    >
                      {t.privacyLink}
                    </Link>
                    {t.agreementSuffix}
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[#373C46]">
                  <div className="font-sans text-xs text-[#8C9099]">
                    {activePersona === 'customer' ? (
                      <>
                        <span className="uppercase text-[#9A7A4A] font-bold">VIP: </span>
                        <span className="text-[#C7A874] font-bold uppercase">50% off your first 3 orders</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase">{t.responseTime}: </span>
                        <span
                          className="font-bold uppercase"
                          style={{
                            color: activePersona === 'restaurant' ? '#1E5FA8' : '#E23A2E',
                          }}
                        >
                          {t.under24Hours}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-registration"
                    disabled={submitting}
                    className={`px-8 py-4 ${getTypographySize(lang, 'badge')} uppercase font-bold border transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'customer'
                      ? 'bg-tan text-ink border-tan hover:bg-white hover:text-ink hover:border-white'
                      : activePersona === 'restaurant'
                        ? 'bg-blue text-white border-blue hover:bg-white hover:text-blue hover:border-white'
                        : 'bg-red text-white border-red hover:bg-white hover:text-red hover:border-white'
                      }`}
                  >
                    {submitting ? (
                      <span>{t.submitting}</span>
                    ) : (
                      <>
                        {activePersona === 'customer' ? (
                          <Users size={15} weight="bold" />
                        ) : activePersona === 'restaurant' ? (
                          <Storefront size={15} weight="bold" />
                        ) : (
                          <Bicycle size={15} weight="bold" />
                        )}
                        <span>{t.submit}</span>
                        <ArrowRight size={14} weight="bold" className={isRtl ? 'rotate-180' : ''} />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
