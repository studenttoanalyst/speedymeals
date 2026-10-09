'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { HeroBannerCarousel } from './HeroBannerCarousel';
import { BannerSlide } from '@/lib/banners';

const COVERED_COUNTRIES = [
  {
    name: 'Pakistan',
    code: 'PK',
    isActive: true,
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Faisalabad', 'Gujranwala', 'Multan', 'Sialkot'],
  },
  {
    name: 'Saudi Arabia',
    code: 'KSA',
    isActive: true,
    cities: ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Taif'],
  },
  {
    name: 'Coming soon...',
    code: 'COMING_SOON',
    isActive: false,
    cities: ['Qatar', 'UAE', 'Oman', 'Bahrain', 'UK'],
  },
];

interface HeroSectionProps {
  slides?: BannerSlide[];
  onSelectPersona: (persona: 'rider' | 'restaurant' | 'customer') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  slides = [],
  onSelectPersona,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (code: string) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveCountry(code);
    }, 150);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleScrollToPartner = (persona: 'rider' | 'restaurant' | 'customer') => {
    onSelectPersona(persona);
    const partnerSection = document.getElementById('partner');
    if (partnerSection) {
      partnerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // FAST · FAIR · GLOBAL color cycle states
  const taglineWords = [
    { text: 'FAST.', colors: ['#15171A', '#E23A2E', '#1E5FA8'] },
    { text: 'FAIR.', colors: ['#E23A2E', '#1E5FA8', '#15171A'] },
    { text: 'GLOBAL.', colors: ['#1E5FA8', '#15171A', '#E23A2E'] },
  ];
  const [colorIndex, setColorIndex] = useState(0);
  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  const hasBanners = slides.length > 0;

  return (
    <section id="overview" className="relative w-full bg-white overflow-hidden pt-[76px] md:pt-0">
      <span id="about" className="absolute top-0 pointer-events-none" />

      {/* 1. Full-Bleed Banner Carousel: Starts at y=0 under the floating navbar */}
      {hasBanners && (
        <div className="w-full">
          <HeroBannerCarousel slides={slides} onSelectPersona={onSelectPersona} />
        </div>
      )}

      {/* 2. Title Block: Directly under the banner, above persona items (tight spacing py-6 md:py-10) */}
      <div className="max-w-5xl mx-auto px-4 text-center py-6 md:py-10 flex flex-col items-center">
        {/* a) Eyebrow row */}
        <div
          id="hero-eyebrow"
          className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 gap-y-1 px-2 text-center mb-2 sm:mb-2.5"
        >
          <span className="w-2.5 h-2.5 bg-red inline-block shrink-0 rounded-none" />
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] font-bold text-red whitespace-nowrap">
            FAST & SAFE TO YOU
          </span>
          <div className="h-px w-6 sm:w-12 bg-line shrink-0" />
          <span className="font-mono text-[9.5px] sm:text-[11.5px] text-ink-soft tracking-[0.18em] uppercase whitespace-nowrap">
            SOUTH ASIA & MIDDLE EAST NETWORK
          </span>
        </div>

        {/* b) SPEEDY MEALS (font-display), compact footprint reduced ~15% */}
        <h1
          id="hero-headline"
          className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.6rem] tracking-tight uppercase leading-[0.92] text-ink font-black text-center"
        >
          SPEEDY MEALS
        </h1>

        {/* c) FAST. FAIR. GLOBAL. colour-cycling tagline */}
        <div
          id="hero-tagline"
          className="font-display text-base sm:text-xl md:text-2xl lg:text-3xl tracking-tight uppercase leading-tight text-center font-black mt-1.5 sm:mt-2"
        >
          {taglineWords.map((word) => (
            <motion.span
              key={word.text}
              animate={{ color: word.colors[colorIndex] }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block mr-2 sm:mr-3 last:mr-0"
              style={{ color: word.colors[0] }}
            >
              {word.text}
            </motion.span>
          ))}
        </div>
      </div>

      {/* 3. Persona Items: 3 columns on md+ — completely open, no box, no dividers, no border */}
      <div className="w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-8 lg:gap-12">
          {/* Item 1: Become a Rider */}
          <div
            onClick={() => handleScrollToPartner('rider')}
            className="group cursor-pointer flex flex-row md:flex-col items-center md:text-center py-3 md:py-4 px-2 sm:px-3 md:px-2 transition-all duration-200"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-[168px] shrink-0 flex items-center justify-center mr-4 sm:mr-5 md:mr-0 md:mb-3 overflow-visible">
              <img
                src="/assets/rider-spritev2.webp"
                alt="Become a Rider - SpeedyMeals"
                className="h-full w-auto max-h-none object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            </div>
            <div className="flex-1 md:w-full flex flex-col justify-center md:items-center">
              <h3 className="font-heading font-extrabold text-base sm:text-lg md:text-xl text-ink tracking-tight mb-1 md:mb-1.5">
                Become a Rider
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-ink-soft leading-snug line-clamp-1 md:line-clamp-none mb-2 md:mb-3">
                Deliver meals on your own schedule. Reliable weekly pay, direct support.
              </p>
              <div className="inline-flex items-center space-x-1.5 font-sans text-xs sm:text-sm font-bold text-red uppercase tracking-wider group-hover:underline">
                <span id="hero-card-cta-rider">Start delivering</span>
                <ArrowRight
                  size={14}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>

          {/* Item 2: Grow Your Business */}
          <div
            onClick={() => handleScrollToPartner('restaurant')}
            className="group cursor-pointer flex flex-row md:flex-col items-center md:text-center py-3 md:py-4 px-2 sm:px-3 md:px-2 transition-all duration-200"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-[168px] shrink-0 flex items-center justify-center mr-4 sm:mr-5 md:mr-0 md:mb-3 overflow-visible">
              <img
                src="/assets/merchant-spritev2.webp"
                alt="Grow your restaurant - SpeedyMeals"
                className="h-full w-auto max-h-none object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            </div>
            <div className="flex-1 md:w-full flex flex-col justify-center md:items-center">
              <h3 className="font-heading font-extrabold text-base sm:text-lg md:text-xl text-ink tracking-tight mb-1 md:mb-1.5">
                Grow Your Business
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-ink-soft leading-snug line-clamp-1 md:line-clamp-none mb-2 md:mb-3">
                Reach more customers with honest fees and simple store management.
              </p>
              <div className="inline-flex items-center space-x-1.5 font-sans text-xs sm:text-sm font-bold text-red uppercase tracking-wider group-hover:underline">
                <span id="hero-card-cta-merchant">List your store</span>
                <ArrowRight
                  size={14}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>

          {/* Item 3: Order Food Delivery */}
          <div
            onClick={() => handleScrollToPartner('customer')}
            className="group cursor-pointer flex flex-row md:flex-col items-center md:text-center py-3 md:py-4 px-2 sm:px-3 md:px-2 transition-all duration-200"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-[168px] shrink-0 flex items-center justify-center mr-4 sm:mr-5 md:mr-0 md:mb-3 overflow-visible">
              <img
                src="/assets/customer-spritev2.webp"
                alt="Order food delivery - SpeedyMeals"
                className="h-full w-auto max-h-none object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            </div>
            <div className="flex-1 md:w-full flex flex-col justify-center md:items-center">
              <h3 className="font-heading font-extrabold text-base sm:text-lg md:text-xl text-ink tracking-tight mb-1 md:mb-1.5">
                Order Food Delivery
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-ink-soft leading-snug line-clamp-1 md:line-clamp-none mb-2 md:mb-3">
                Hot, fresh food from local kitchens right to your door.
              </p>
              <div className="inline-flex items-center space-x-1.5 font-sans text-xs sm:text-sm font-bold text-red uppercase tracking-wider group-hover:underline">
                <span id="hero-card-cta-customer">Get VIP access</span>
                <ArrowRight
                  size={14}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom: WE ARE HERE country locations strip */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 w-full shrink-0 py-4 md:py-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <div className="relative flex items-center flex-wrap justify-center sm:justify-start gap-y-1 gap-x-2 font-mono text-[9px] sm:text-[11px]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75 rounded-none" />
              <span className="relative inline-flex h-2 w-2 bg-[#10B981] rounded-none" />
            </span>
            <span className="text-ink-soft uppercase tracking-wider font-bold shrink-0">WE ARE HERE:</span>
            <div className="flex items-center flex-wrap gap-y-1 gap-x-1.5 sm:gap-x-2">
              {COVERED_COUNTRIES.map((item, idx) => {
                const isActiveHover = activeCountry === item.code;
                const hoverClass = item.isActive
                  ? 'hover:text-[#10B981] hover:decoration-[#10B981]'
                  : 'hover:text-[#F59E0B] hover:decoration-[#F59E0B]';
                const activeColorClass = item.isActive
                  ? 'text-[#10B981] decoration-[#10B981]'
                  : 'text-[#F59E0B] decoration-[#F59E0B]';

                return (
                  <div
                    key={item.code}
                    className="relative flex items-center"
                    onMouseEnter={() => setActiveCountry(item.code)}
                    onMouseLeave={() => setActiveCountry(null)}
                  >
                    {idx > 0 && <span className="text-ink-soft/40 mr-1.5 sm:mr-2 select-none">·</span>}
                    <button
                      type="button"
                      onClick={() => setActiveCountry(isActiveHover ? null : item.code)}
                      onTouchStart={() => handleTouchStart(item.code)}
                      onTouchEnd={handleTouchEnd}
                      className={`font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider transition-colors duration-150 cursor-pointer underline underline-offset-4 decoration-1 ${
                        isActiveHover ? activeColorClass : `text-ink ${hoverClass}`
                      }`}
                      aria-label={`Coverage info for ${item.name}`}
                    >
                      {item.isActive ? `${item.name} (${item.code})` : item.name}
                    </button>

                    {isActiveHover && (
                      <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 z-50 pointer-events-none">
                        {item.isActive ? (
                          <div className="w-[280px] sm:w-[350px] bg-[#16181D] text-white border border-[#2D3139] px-2.5 py-1.5 shadow-xl overflow-hidden flex items-center space-x-2 rounded-none">
                            <span className="w-1.5 h-1.5 bg-[#10B981] shrink-0 inline-block rounded-none" />
                            <div className="overflow-hidden relative w-full flex">
                              <div
                                className="animate-marquee flex items-center space-x-2 whitespace-nowrap text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white"
                                style={{
                                  animationDuration: `${Math.max(12, item.cities.length * 1.8)}s`,
                                }}
                              >
                                {[...item.cities, ...item.cities].map((city, cIdx) => (
                                  <span key={`${city}-${cIdx}`} className="inline-flex items-center space-x-2">
                                    <span className="text-white font-semibold">{city}</span>
                                    <span className="text-[#8C9099]">·</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-[280px] sm:w-[350px] bg-[#16181D] text-white border border-[#2D3139] px-2.5 py-1.5 shadow-xl overflow-hidden flex items-center space-x-2 rounded-none">
                            <span className="w-1.5 h-1.5 bg-[#F59E0B] shrink-0 inline-block animate-pulse rounded-none" />
                            <div className="overflow-hidden relative w-full flex">
                              <div
                                className="animate-marquee flex items-center space-x-2 whitespace-nowrap text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white"
                                style={{
                                  animationDuration: `${Math.max(10, item.cities.length * 2.2)}s`,
                                }}
                              >
                                {[...item.cities, ...item.cities].map((country, cIdx) => (
                                  <span key={`${country}-${cIdx}`} className="inline-flex items-center space-x-2">
                                    <span className="text-white font-semibold">{country}</span>
                                    <span className="text-[#8C9099]">·</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
