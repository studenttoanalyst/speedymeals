'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { MapPin } from 'lucide-react';
import { PersonaType } from '@/types/home';
import {
  SUPPORTED_REGIONS,
  CITY_TO_COUNTRY_CODE,
  formatPhoneForRegion,
  validatePhoneForRegion,
} from '@/lib/validation/phone';
import {
  searchCities,
  searchAreas,
} from '@/lib/data/cityAreas';
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
  area: string;
  address?: string;
  vehicleType: string;
  businessName: string;
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
    city: '',
    customCity: '',
    area: '',
    address: '',
    vehicleType: 'Motorcycle',
    businessName: '',
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
    city: '',
    customCity: '',
    area: '',
    address: '',
    vehicleType: '',
    businessName: '',
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
    city: '',
    customCity: '',
    area: '',
    address: '',
    vehicleType: '',
    businessName: '',
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
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string; city?: string; area?: string }>({});
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [highlightedCityIndex, setHighlightedCityIndex] = useState(0);
  const [highlightedAreaIndex, setHighlightedAreaIndex] = useState(0);
  const cityWrapperRef = useRef<HTMLDivElement>(null);
  const areaWrapperRef = useRef<HTMLDivElement>(null);
  const [formLoadedAt] = useState<number>(() => Date.now());
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ur' || lang === 'ar';

  // Automatically dismiss error disclaimer and field errors when switching persona tabs
  useEffect(() => {
    setError(null);
    setFieldErrors({});
    setCityDropdownOpen(false);
    setAreaDropdownOpen(false);
    setHighlightedCityIndex(0);
    setHighlightedAreaIndex(0);
  }, [activePersona]);

  // Click outside to dismiss autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityWrapperRef.current && !cityWrapperRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false);
      }
      if (areaWrapperRef.current && !areaWrapperRef.current.contains(event.target as Node)) {
        setAreaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Reset highlight indices whenever user types/changes input
  useEffect(() => {
    setHighlightedCityIndex(0);
  }, [formData.city]);

  useEffect(() => {
    setHighlightedAreaIndex(0);
  }, [formData.area]);

  // Active submission for currently viewed persona
  const activeSubmission = submissions[activePersona];
  const submittedId = activeSubmission ? activeSubmission.referenceCode : null;
  const submittedData = activeSubmission ? activeSubmission.data : formData;

  // Regional phone configuration & real-time validation for active form
  const currentRegion = SUPPORTED_REGIONS[formData.countryCode] || SUPPORTED_REGIONS['+92'];
  const phoneValidation = validatePhoneForRegion(formData.phone, formData.countryCode);

  // Dynamic theme highlights based on persona: Red for Rider, Blue for Restaurant, Tan for Waitlist/Customer
  const personaTheme = {
    rider: {
      accent: '#E23A2E',
      focusBorder: 'focus:border-[#E23A2E]',
      borderL: 'border-l-[#E23A2E]',
      badge: 'bg-[#E23A2E]/20 text-[#E23A2E] border-[#E23A2E]/40',
      customText: 'text-[#E23A2E]',
    },
    restaurant: {
      accent: '#1E5FA8',
      focusBorder: 'focus:border-[#1E5FA8]',
      borderL: 'border-l-[#1E5FA8]',
      badge: 'bg-[#1E5FA8]/20 text-[#1E5FA8] border-[#1E5FA8]/40',
      customText: 'text-[#1E5FA8]',
    },
    customer: {
      accent: '#C7A874',
      focusBorder: 'focus:border-[#C7A874]',
      borderL: 'border-l-[#C7A874]',
      badge: 'bg-[#C7A874]/20 text-[#C7A874] border-[#C7A874]/40',
      customText: 'text-[#C7A874]',
    },
  }[activePersona];

  // Filter cities and areas with regex autocomplete
  const matchingCities = searchCities(formData.city || '');
  const matchingAreas = searchAreas(formData.city || '', formData.area || '');

  const handleCountryCodeChange = (newCountryCode: string) => {
    const reformattedPhone = formData.phone
      ? formatPhoneForRegion(formData.phone, newCountryCode)
      : formData.phone;

    setFieldErrors(prev => ({ ...prev, phone: undefined }));
    setFormData(prev => ({
      ...prev,
      countryCode: newCountryCode,
      phone: reformattedPhone,
    }));
  };

  const handleCitySelect = (selectedCityName: string, selectedCountryCode?: string) => {
    const code = selectedCountryCode || CITY_TO_COUNTRY_CODE[selectedCityName] || formData.countryCode;
    const reformattedPhone = formData.phone
      ? formatPhoneForRegion(formData.phone, code)
      : formData.phone;

    setFormData(prev => ({
      ...prev,
      city: selectedCityName,
      countryCode: code,
      phone: reformattedPhone,
      area: '', // Reset area when city changes so user selects area from the new city
    }));
    setCityDropdownOpen(false);
    setFieldErrors(prev => ({ ...prev, city: undefined, area: undefined }));
    setAreaDropdownOpen(false); // Do not open area dropdown until user enters at least 1 character
  };

  const handleAreaSelect = (selectedArea: string) => {
    setFormData(prev => ({
      ...prev,
      area: selectedArea,
    }));
    setAreaDropdownOpen(false);
    setFieldErrors(prev => ({ ...prev, area: undefined }));
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!cityDropdownOpen || matchingCities.length === 0) {
      if (e.key === 'Enter' && formData.city?.trim()) {
        e.preventDefault();
        handleCitySelect(formData.city.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCityIndex((prev) => (prev + 1) % matchingCities.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCityIndex((prev) => (prev - 1 + matchingCities.length) % matchingCities.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = matchingCities[highlightedCityIndex] || matchingCities[0];
      if (selected) {
        handleCitySelect(selected.name, selected.countryCode);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCityDropdownOpen(false);
    }
  };

  const handleAreaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!areaDropdownOpen || matchingAreas.length === 0) {
      if (e.key === 'Enter' && formData.area?.trim()) {
        e.preventDefault();
        handleAreaSelect(formData.area.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedAreaIndex((prev) => (prev + 1) % matchingAreas.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedAreaIndex((prev) => (prev - 1 + matchingAreas.length) % matchingAreas.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = matchingAreas[highlightedAreaIndex] || matchingAreas[0];
      if (selected) {
        handleAreaSelect(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAreaDropdownOpen(false);
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
    if (!formData.agreed) {
      setError('Please review and accept the agreement terms to proceed.');
      return;
    }

    // City and Area validation:
    // Compulsory City for all personas (Rider, Restaurant, Customer).
    // Compulsory Area and optional Address for Restaurant onboarding ONLY.
    const trimmedCity = formData.city?.trim() || '';
    if (!trimmedCity || trimmedCity.length < 2) {
      setError(
        activePersona === 'restaurant'
          ? 'City is compulsory for restaurant registration. Please select or enter your city.'
          : 'Please select or enter your city.'
      );
      setFieldErrors(prev => ({ ...prev, city: 'City is required' }));
      return;
    }

    let trimmedArea = '';
    let trimmedAddress: string | null = null;

    if (activePersona === 'restaurant') {
      trimmedArea = formData.area?.trim() || '';
      if (!trimmedArea || trimmedArea.length < 2) {
        setError('Area is compulsory for restaurant registration. Please select or enter your area/locality.');
        setFieldErrors(prev => ({ ...prev, area: 'Area is compulsory' }));
        return;
      }

      trimmedAddress = formData.address?.trim() || null;
    }

    // Optional email validation: only validate format if email is provided
    if (formData.email?.trim()) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please provide a valid email address.');
        setFieldErrors(prev => ({ ...prev, email: 'Please provide a valid email address.' }));
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

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          ...formData,
          city: trimmedCity,
          customCity: formData.customCity?.trim() || null,
          area: activePersona === 'restaurant' ? trimmedArea : null,
          address: activePersona === 'restaurant' ? trimmedAddress : null,
          email: formData.email?.trim() || null,
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
            city: trimmedCity,
            area: activePersona === 'restaurant' ? trimmedArea : '',
            address: activePersona === 'restaurant' ? (trimmedAddress || '') : '',
            email: formData.email?.trim() || '',
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
              <span className="font-mono text-xs uppercase tracking-widest text-[#5B5F66] whitespace-nowrap">
                [ 03 ]
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-[#15171A] font-bold whitespace-nowrap">
                Partner With Us
              </span>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-[#E4E2DD] mx-3" />
            <span className="font-mono text-[10px] sm:text-xs text-[#E23A2E] tracking-wider uppercase font-semibold whitespace-nowrap">
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
                No Extraction.
              </span>
            </h2>

            <p className="text-xs sm:text-sm font-mono text-[#5B5F66] max-w-sm leading-relaxed">
              Select your persona below to join our pilot launch network across South Asia and the
              Middle East.
            </p>
          </div>
        </div>

        {/* Persona-Split Entry: Three Hairline-Divided Columns with Distinct Brand Accents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-line mb-12 bg-white shadow-sm">
          {/* Column 1: RIDE (Speedy Red accent) */}
          <div
            id="persona-col-rider"
            className={`p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-line border-t-2 border-t-red transition-all duration-150 ${activePersona === 'rider' ? 'bg-paper-off shadow-xs' : 'bg-white hover:bg-paper-off/50'
              }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-red/30 text-red flex items-center justify-center bg-red/10">
                  <Bicycle size={24} weight="bold" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-red font-bold">
                  COURIER DISPATCH
                </span>
              </div>
              <h3 className="font-display text-2xl uppercase tracking-tight text-ink mb-2">
                Ride
              </h3>
              <p className="text-sm text-ink-soft mb-6 leading-relaxed font-sans">
                Keep 100% of your delivery customer fees. Zero platform deduction on distance, zero
                security deposit, with daily automated payouts.
              </p>
            </div>

            <div>
              <div className="py-2 mb-4 border-t border-b border-line font-mono text-xs text-ink flex justify-between">
                <span className="text-ink-soft">FEE RETENTION:</span>
                <span className="font-bold text-red">100% TO RIDER</span>
              </div>
              <button
                type="button"
                id="btn-select-rider"
                onClick={() => onSelectPersona('rider')}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'rider'
                  ? 'bg-red text-white border-red'
                  : 'bg-transparent text-ink border-ink hover:bg-ink hover:text-white'
                  }`}
              >
                <span>{activePersona === 'rider' ? 'ACTIVE FORM' : 'APPLY TO RIDE'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          </div>

          {/* Column 2: RESTAURANT (Cobalt Blue accent) */}
          <div
            id="persona-col-restaurant"
            className={`p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-line border-t-2 border-t-blue transition-all duration-150 ${activePersona === 'restaurant'
              ? 'bg-paper-off shadow-xs'
              : 'bg-white hover:bg-paper-off/50'
              }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-blue/30 text-blue flex items-center justify-center bg-blue/10">
                  <Storefront size={24} weight="bold" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue font-bold">
                  MERCHANT DIRECT
                </span>
              </div>
              <h3 className="font-display text-2xl uppercase tracking-tight text-ink mb-2">
                Restaurant
              </h3>
              <p className="text-sm text-ink-soft mb-6 leading-relaxed font-sans">
                Flat 10% commission. No onboarding penalty, no mandatory sponsored placements to
                stay visible, and complete menu control.
              </p>
            </div>

            <div>
              <div className="py-2 mb-4 border-t border-b border-line font-mono text-xs text-ink flex justify-between">
                <span className="text-ink-soft">COMMISSION:</span>
                <span className="font-bold text-blue">10% FLAT RATE</span>
              </div>
              <button
                type="button"
                id="btn-select-restaurant"
                onClick={() => onSelectPersona('restaurant')}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'restaurant'
                  ? 'bg-blue text-white border-blue'
                  : 'bg-transparent text-blue border-blue hover:bg-blue hover:text-white'
                  }`}
              >
                <span>{activePersona === 'restaurant' ? 'ACTIVE FORM' : 'PARTNER RESTAURANT'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>

              <div className="mt-2.5 text-center">
                <Link
                  id="link-existing-restaurant-portal"
                  href="/restaurant"
                  className="font-mono text-[11px] text-blue hover:underline inline-flex items-center gap-1"
                >
                  <span>Already registered? Access Partner Portal</span>
                  <ArrowRight size={10} weight="bold" />
                </Link>
              </div>
            </div>
          </div>

          {/* Column 3: CUSTOMER (Warm Desert Tan accent) */}
          <div
            id="persona-col-customer"
            className={`p-6 sm:p-8 flex flex-col justify-between border-t-2 border-t-tan transition-all duration-150 ${activePersona === 'customer'
              ? 'bg-paper-off shadow-xs'
              : 'bg-white hover:bg-paper-off/50'
              }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-tan/30 text-tan flex items-center justify-center bg-tan/20">
                  <Users size={24} weight="bold" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8874E] font-bold">
                  EARLY ACCESS
                </span>
              </div>
              <h3 className="font-display text-2xl uppercase tracking-tight text-ink mb-2">
                Customer
              </h3>
              <p className="text-sm text-ink-soft mb-6 leading-relaxed font-sans">
                Real food prices without sneaky packaging fees or arbitrary delivery inflation. Get
                notified when SpeedyMeals launches on iOS & Android in your city.
              </p>
            </div>

            <div>
              <div className="py-2 mb-4 border-t border-b border-line font-mono text-xs text-ink flex justify-between">
                <span className="text-ink-soft">MARKUP:</span>
                <span className="font-bold text-[#A8874E]">0% MENU MARKUP</span>
              </div>
              <button
                type="button"
                id="btn-select-customer"
                onClick={() => onSelectPersona('customer')}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${activePersona === 'customer'
                  ? 'bg-tan text-ink border-tan font-bold'
                  : 'bg-transparent text-ink border-line hover:border-tan hover:text-[#A8874E]'
                  }`}
              >
                <span>{activePersona === 'customer' ? 'ACTIVE FORM' : 'JOIN WAITLIST'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* REGISTRATION FORM PANEL: Styled with dynamic persona color border and accents */}
        <div
          id="registration-flow-panel"
          className={`bg-[#22252B] text-white border p-6 sm:p-10 lg:p-12 shadow-md transition-colors duration-300 ${activePersona === 'rider'
            ? 'border-t-2 border-t-red border-x-[#373C46] border-b-[#373C46]'
            : activePersona === 'restaurant'
              ? 'border-t-2 border-t-blue border-x-[#373C46] border-b-[#373C46]'
              : 'border-t-2 border-t-tan border-x-[#373C46] border-b-[#373C46]'
            }`}
        >
          {/* Top Panel Nav & Title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#373C46] mb-8">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest mb-1 flex items-center space-x-2">
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
              <div className="flex border border-[#373C46] font-mono text-xs">
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
                className="flex items-center border border-[#373C46] bg-[#1A1D23] p-0.5 text-xs font-mono shadow-xs"
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
                className={`border border-[#373C46] bg-[#2A2E37] p-4 sm:p-8 max-w-2xl mx-auto font-mono text-left border-t-2 w-full overflow-hidden ${
                  activePersona === 'rider'
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
                  <span className="font-display text-lg sm:text-xl uppercase tracking-tight text-white">
                    {activePersona === 'customer'
                      ? 'Waitlist Access Reserved'
                      : activePersona === 'restaurant'
                        ? 'Merchant Application Received'
                        : 'Rider Application Received'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#A0A4AB] mb-6 font-sans">
                  {activePersona === 'customer'
                    ? "You are registered for priority early access. We will email your TestFlight / Google Play beta invite as soon as SpeedyMeals goes live in your area."
                    : 'Your registration has been logged directly with our regional dispatch operations. Verification review is conducted within 24 hours.'}
                </p>

                <div className="p-3.5 sm:p-5 bg-[#1E2228] border border-[#373C46] divide-y divide-[#2C303B] mb-6 w-full overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                    <span className="text-[#8C9099] shrink-0">REFERENCE CODE:</span>
                    <span
                      className="font-bold tracking-widest break-keep whitespace-nowrap text-left sm:text-right"
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                    <span className="text-[#8C9099] shrink-0">TARGET ROLE:</span>
                    <span
                      className="font-bold uppercase tracking-wider text-left sm:text-right"
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
                        ? 'Consumer Waitlist'
                        : activePersona === 'restaurant'
                          ? 'Restaurant Merchant'
                          : 'Delivery Courier Rider'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                    <span className="text-[#8C9099] shrink-0">CONTACT EMAIL:</span>
                    <span className="text-white break-all text-left sm:text-right">{submittedData.email || 'Not provided'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                    <span className="text-[#8C9099] shrink-0">CONTACT PHONE:</span>
                    <span className="text-white font-mono break-all text-left sm:text-right">
                      {submittedData.countryCode} {submittedData.phone}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                    <span className="text-[#8C9099] shrink-0">
                      {activePersona === 'customer'
                        ? 'PREFERRED CITY:'
                        : activePersona === 'rider'
                          ? 'DISPATCH ZONE:'
                          : 'DEPLOYMENT ZONE:'}
                    </span>
                    <span className="text-white break-words text-left sm:text-right">
                      {submittedData.city}
                      {activePersona === 'restaurant' && submittedData.area ? `, ${submittedData.area}` : ''}{' '}
                      ({submittedData.countryCode})
                    </span>
                  </div>
                  {activePersona === 'restaurant' && submittedData.address && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                      <span className="text-[#8C9099] shrink-0">STREET ADDRESS:</span>
                      <span className="text-white break-words text-left sm:text-right">{submittedData.address}</span>
                    </div>
                  )}
                  {activePersona === 'customer' && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                      <span className="text-[#8C9099] shrink-0">TARGET PLATFORM:</span>
                      <span className="text-white break-words text-left sm:text-right">{submittedData.devicePlatform}</span>
                    </div>
                  )}
                  {activePersona === 'restaurant' && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                      <span className="text-[#8C9099] shrink-0">BRAND NAME:</span>
                      <span className="text-white break-words text-left sm:text-right">{submittedData.businessName}</span>
                    </div>
                  )}
                  {activePersona === 'rider' && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-2.5 gap-1 sm:gap-4 text-xs font-mono">
                      <span className="text-[#8C9099] shrink-0">TRANSPORT MODE:</span>
                      <span className="text-white break-words text-left sm:text-right">{submittedData.vehicleType}</span>
                    </div>
                  )}
                </div>

                <div className="flex">
                  <button
                    type="button"
                    onClick={() => handleReset(activePersona)}
                    className={`w-full sm:w-auto px-6 py-3.5 text-xs font-mono uppercase tracking-widest font-bold border transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer ${
                      activePersona === 'customer'
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
                  <div className="p-4 border border-[#E23A2E]/50 bg-[#E23A2E]/10 text-xs font-mono text-[#E23A2E] flex items-center justify-between">
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
                  {/* Full Name */}
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
                      className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none ${personaTheme.focusBorder} transition-colors`}
                    />
                  </div>

                  {/* Persona-specific secondary field */}
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
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none ${personaTheme.focusBorder} transition-colors`}
                      />
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
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none ${personaTheme.focusBorder} transition-colors cursor-pointer`}
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
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none ${personaTheme.focusBorder} transition-colors cursor-pointer`}
                      >
                        <option value="Motorcycle">Motorcycle (125cc - 250cc)</option>
                        <option value="Electric Scooter">Electric Scooter / E-Bike</option>
                        <option value="Bicycle">Bicycle (Urban Zones)</option>
                        <option value="Sedan Car">Car / Sedan</option>
                      </select>
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

                  {/* Email Address (Optional) */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-email"
                      className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                    >
                      {t.emailAddressOptional}
                    </label>
                    <input
                      id="form-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (fieldErrors.email) {
                          setFieldErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="contact@domain.com (optional)"
                      className={`w-full bg-[#1A1D23] border px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors ${fieldErrors.email ? 'border-[#E23A2E]' : `border-[#373C46] ${personaTheme.focusBorder}`
                        }`}
                    />
                    {fieldErrors.email && (
                      <div className="text-[11px] font-mono text-[#E23A2E] pt-0.5">
                        {fieldErrors.email}
                      </div>
                    )}
                  </div>

                  {/* Phone with Country Code Selector & Region-Specific Validation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="form-phone"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.phoneNumber} *
                      </label>
                      <span className="font-mono text-[11px] text-[#8C9099]">
                        {currentRegion.flag} {currentRegion.country}
                      </span>
                    </div>
                    <div className="flex relative">
                      <select
                        id="form-country-code"
                        value={formData.countryCode}
                        onChange={(e) => handleCountryCodeChange(e.target.value)}
                        className={`bg-[#262A32] border border-r-0 border-[#373C46] px-3 py-3.5 text-xs text-white font-mono focus:outline-none ${personaTheme.focusBorder} cursor-pointer`}
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
                          className={`w-full bg-[#1A1D23] border px-4 py-3.5 pr-10 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors font-mono ${fieldErrors.phone
                            ? 'border-[#E23A2E]'
                            : formData.phone.length > 0
                              ? phoneValidation.isValid
                                ? 'border-[#10B981]'
                                : 'border-[#E23A2E]'
                              : `border-[#373C46] ${personaTheme.focusBorder}`
                            }`}
                        />
                        {formData.phone.length > 0 && phoneValidation.isValid && !fieldErrors.phone && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#10B981] flex items-center pointer-events-none">
                            <Check size={18} weight="bold" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Regional Format Guidance & Real-time Validation Message */}
                    {fieldErrors.phone ? (
                      <div className="text-[11px] font-mono text-[#E23A2E] pt-0.5">
                        {fieldErrors.phone}
                      </div>
                    ) : formData.phone.length > 0 ? (
                      phoneValidation.isValid ? (
                        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#10B981] pt-0.5">
                          <Check size={13} weight="bold" />
                          <span>Valid {currentRegion.country} phone: {phoneValidation.fullInternational}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-mono text-[#E23A2E] pt-0.5">
                          {phoneValidation.error}
                        </div>
                      )
                    ) : (
                      <div className="text-[11px] font-mono text-[#5B5F66] pt-0.5">
                        Format: {currentRegion.helper}
                      </div>
                    )}
                  </div>

                  {/* Universal City Selection with Autocomplete for ALL personas (Rider, Restaurant, Waitlist/Customer) */}
                  <div className="space-y-2 relative" ref={cityWrapperRef}>
                    <label
                      htmlFor="form-city-input"
                      className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                    >
                      {activePersona === 'customer'
                        ? t.preferredDeliveryCity
                        : activePersona === 'rider'
                          ? t.primaryDispatchZone
                          : t.restaurantOperatingCity}{' '}
                      <span className="text-[#E23A2E]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="form-city-input"
                        type="text"
                        autoComplete="off"
                        value={formData.city}
                        onKeyDown={handleCityKeyDown}
                        onFocus={() => {
                          if (formData.city?.trim().length >= 1) {
                            setCityDropdownOpen(true);
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            city: val,
                            area: '', // Reset area when city changes
                          }));
                          if (val.trim().length >= 1) {
                            setCityDropdownOpen(true);
                          } else {
                            setCityDropdownOpen(false);
                          }
                          if (fieldErrors.city) {
                            setFieldErrors(prev => ({ ...prev, city: undefined }));
                          }
                        }}
                        placeholder={t.typeToSearchCity}
                        className={`w-full bg-[#1A1D23] border px-4 py-3.5 pr-10 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors ${fieldErrors.city ? 'border-[#E23A2E]' : `border-[#373C46] ${personaTheme.focusBorder}`
                          }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9099] pointer-events-none flex items-center">
                        <MapPin size={18} />
                      </div>
                    </div>
                    {fieldErrors.city && (
                      <div className="text-[11px] font-mono text-[#E23A2E] pt-0.5">
                        {fieldErrors.city}
                      </div>
                    )}

                    {/* City Autocomplete Dropdown - only displays when >= 1 character entered */}
                    {cityDropdownOpen && formData.city?.trim().length >= 1 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#1A1D23] border border-[#373C46] shadow-2xl divide-y divide-[#2B303B]">
                        {matchingCities.length > 0 ? (
                          matchingCities.map((c, index) => {
                            const isHighlighted = index === highlightedCityIndex;
                            return (
                              <button
                                key={`${c.name}-${c.countryCode}-${index}`}
                                type="button"
                                onMouseEnter={() => setHighlightedCityIndex(index)}
                                onClick={() => handleCitySelect(c.name, c.countryCode)}
                                className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between cursor-pointer border-l-4 ${
                                  isHighlighted
                                    ? `bg-[#2E3542] text-white ${personaTheme.borderL}`
                                    : 'bg-transparent text-[#D1D5DB] border-transparent hover:bg-[#252A33]'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-base">{c.flag}</span>
                                  <span className={`text-sm ${isHighlighted ? 'text-white font-semibold' : 'text-[#E2E8F0] font-medium'}`}>
                                    {c.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono text-[#8C9099]">
                                    {c.country} ({c.countryCode})
                                  </span>
                                  {isHighlighted && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 uppercase tracking-wider font-bold border ${personaTheme.badge}`}>
                                      PRESS ↵
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-xs font-mono text-[#8C9099]">
                            No predefined match for &ldquo;{formData.city}&rdquo;
                          </div>
                        )}
                        {formData.city.trim() && !matchingCities.some(c => c.name.toLowerCase() === formData.city.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => handleCitySelect(formData.city.trim())}
                            className={`w-full text-left px-4 py-3 bg-[#222731] hover:bg-[#2B313E] transition-colors flex items-center justify-between cursor-pointer text-xs font-mono border-l-4 border-transparent ${personaTheme.customText}`}
                          >
                            <span>Use custom city: &ldquo;{formData.city.trim()}&rdquo;</span>
                            <ArrowRight size={13} weight="bold" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Restaurant-Specific Location Fields: Area & Street Address (Compulsory Area, Optional Address) */}
                  {activePersona === 'restaurant' && (
                    <>
                      {/* Area Selection with Regex-based Autocomplete (Compulsory, Dependent on City) */}
                      <div className="space-y-2 relative" ref={areaWrapperRef}>
                        <label
                          htmlFor="form-area-input"
                          className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                        >
                          {t.areaNeighborhood} <span className="text-[#E23A2E]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="form-area-input"
                            type="text"
                            autoComplete="off"
                            disabled={!formData.city?.trim()}
                            value={formData.area}
                            onKeyDown={handleAreaKeyDown}
                            onFocus={() => {
                              if (formData.city?.trim() && formData.area?.trim().length >= 1) {
                                setAreaDropdownOpen(true);
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({ ...prev, area: val }));
                              if (val.trim().length >= 1) {
                                setAreaDropdownOpen(true);
                              } else {
                                setAreaDropdownOpen(false);
                              }
                              if (fieldErrors.area) {
                                setFieldErrors(prev => ({ ...prev, area: undefined }));
                              }
                            }}
                            placeholder={!formData.city?.trim() ? t.selectCityFirst : t.typeToSearchArea}
                            className={`w-full bg-[#1A1D23] border px-4 py-3.5 pr-10 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none transition-colors ${
                              !formData.city?.trim()
                                ? 'opacity-60 cursor-not-allowed border-[#2C313C]'
                                : fieldErrors.area
                                  ? 'border-[#E23A2E]'
                                  : `border-[#373C46] ${personaTheme.focusBorder}`
                            }`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9099] pointer-events-none flex items-center">
                            <MapPin size={18} />
                          </div>
                        </div>
                        {fieldErrors.area && (
                          <div className="text-[11px] font-mono text-[#E23A2E] pt-0.5">
                            {fieldErrors.area}
                          </div>
                        )}

                        {/* Area Autocomplete Dropdown - only displays when >= 1 character entered */}
                        {areaDropdownOpen && formData.city?.trim() && formData.area?.trim().length >= 1 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#1A1D23] border border-[#373C46] shadow-2xl divide-y divide-[#2B303B]">
                            {matchingAreas.length > 0 ? (
                              matchingAreas.map((areaName, index) => {
                                const isHighlighted = index === highlightedAreaIndex;
                                return (
                                  <button
                                    key={`${areaName}-${index}`}
                                    type="button"
                                    onMouseEnter={() => setHighlightedAreaIndex(index)}
                                    onClick={() => handleAreaSelect(areaName)}
                                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between cursor-pointer border-l-4 ${
                                      isHighlighted
                                        ? `bg-[#2E3542] text-white ${personaTheme.borderL}`
                                        : 'bg-transparent text-[#D1D5DB] border-transparent hover:bg-[#252A33]'
                                    }`}
                                  >
                                    <span className={`text-sm ${isHighlighted ? 'text-white font-semibold' : 'text-[#E2E8F0]'}`}>
                                      {areaName}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[10px] font-mono text-[#8C9099] uppercase">{formData.city}</span>
                                      {isHighlighted && (
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 uppercase tracking-wider font-bold border ${personaTheme.badge}`}>
                                          PRESS ↵
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-3 text-xs font-mono text-[#8C9099]">
                                No predefined area matches &ldquo;{formData.area}&rdquo; in {formData.city}
                              </div>
                            )}
                            {formData.area.trim() && !matchingAreas.some(a => a.toLowerCase() === formData.area.trim().toLowerCase()) && (
                              <button
                                type="button"
                                onClick={() => handleAreaSelect(formData.area.trim())}
                                className={`w-full text-left px-4 py-3 bg-[#222731] hover:bg-[#2B313E] transition-colors flex items-center justify-between cursor-pointer text-xs font-mono border-l-4 border-transparent ${personaTheme.customText}`}
                              >
                                <span>Use custom area: &ldquo;{formData.area.trim()}&rdquo;</span>
                                <ArrowRight size={13} weight="bold" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Street Address / Building (Optional) */}
                      <div className="space-y-2">
                        <label
                          htmlFor="form-address-input"
                          className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                        >
                          {t.streetAddressOptional}
                        </label>
                        <input
                          id="form-address-input"
                          type="text"
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="e.g. Building 4B, Street 12, Floor 2"
                          className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none ${personaTheme.focusBorder} transition-colors`}
                        />
                      </div>
                    </>
                  )}

                  {/* Additional Persona-Specific Question */}
                  {activePersona === 'restaurant' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-cuisine"
                        className={`block uppercase ${getTypographySize(lang, 'label')} text-[#A0A4AB]`}
                      >
                        {t.primaryCuisineCategory}
                      </label>
                      <input
                        id="form-cuisine"
                        type="text"
                        value={formData.cuisineType || ''}
                        onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                        placeholder="e.g. Biryani & Kebabs, Cafe, Pizza"
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white placeholder-[#5B5F66] focus:outline-none ${personaTheme.focusBorder} transition-colors`}
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
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none ${personaTheme.focusBorder} transition-colors cursor-pointer`}
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
                        className={`w-full bg-[#1A1D23] border border-[#373C46] px-4 py-3.5 ${getTypographySize(lang, 'input')} text-white focus:outline-none ${personaTheme.focusBorder} transition-colors cursor-pointer`}
                      >
                        <option>Over 1 Year (Active courier)</option>
                        <option>6 - 12 Months</option>
                        <option>New Courier (Needs onboarding)</option>
                      </select>
                    </div>
                  )}
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
                    {t.agreementSuffix}
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[#373C46]">
                  <div className="font-mono text-xs text-[#8C9099]">
                    {activePersona === 'customer' ? (
                      <>
                        <span className="uppercase">{t.waitlistStatus}: </span>
                        <span className="text-tan font-bold uppercase">{t.priorityBatch}</span>
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

          {/* Trust Signals repeated near conversion */}
          <div className="mt-10 pt-8 border-t border-[#373C46] flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 font-mono text-xs">
            <div className="flex items-center space-x-3 text-[#A0A4AB]">
              <div className="w-8 h-8 rounded-xs bg-red/10 border border-red/20 flex items-center justify-center shrink-0">
                <Coins size={18} weight="bold" className="text-red" />
              </div>
              <span>100% delivery fee to rider</span>
            </div>

            <div className="flex items-center space-x-3 text-[#A0A4AB]">
              <div className="w-8 h-8 rounded-xs bg-blue/10 border border-blue/20 flex items-center justify-center shrink-0">
                <Percent size={18} weight="bold" className="text-blue" />
              </div>
              <span>10% flat merchant commission</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
