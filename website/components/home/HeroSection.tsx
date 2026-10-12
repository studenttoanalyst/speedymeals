'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { HeroBannerCarousel } from './HeroBannerCarousel';
import { BannerSlide } from '@/lib/banners';
import { useViewportPopover } from '@/hooks/useViewportPopover';

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
  const [mounted, setMounted] = useState(false);

  const pkRef = useRef<HTMLButtonElement | null>(null);
  const ksaRef = useRef<HTMLButtonElement | null>(null);
  const comingSoonRef = useRef<HTMLButtonElement | null>(null);
  const emptyRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const anchorRefs: Record<string, React.RefObject<HTMLButtonElement | null>> = {
    PK: pkRef,
    KSA: ksaRef,
    COMING_SOON: comingSoonRef,
  };

  const currentAnchorRef = activeCountry ? anchorRefs[activeCountry] : emptyRef;

  const position = useViewportPopover({
    anchorRef: currentAnchorRef,
    popoverRef,
    open: Boolean(activeCountry),
    preferredWidth: 350,
    margin: 8,
    gap: 10,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Touch outside, Escape, and scroll listeners to close active popover
  useEffect(() => {
    if (!activeCountry) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const isAnyAnchor = Object.values(anchorRefs).some(
        (ref) => ref.current && ref.current.contains(target)
      );
      if (isAnyAnchor || popoverRef.current?.contains(target)) {
        return;
      }
      setActiveCountry(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCountry(null);
      }
    };

    const handleScroll = () => {
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        setActiveCountry(null);
      }
    };

    const handleTouchMove = () => {
      setActiveCountry(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeCountry]);

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
  const activeCountryItem = COVERED_COUNTRIES.find((c) => c.code === activeCountry);

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
          className="font-display display-hero text-3xl sm:text-4xl md:text-5xl lg:text-[3.6rem] tracking-[-0.035em] uppercase leading-[0.92] text-ink font-black text-center select-none"
        >
          SPEEDY MEALS
        </h1>

        {/* c) FAST. FAIR. GLOBAL. colour-cycling tagline */}
        <div
          id="hero-tagline"
          className="font-display text-base sm:text-xl md:text-2xl lg:text-3xl tracking-[-0.025em] uppercase leading-tight text-center font-black mt-1.5 sm:mt-2 select-none"
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
            className="group cursor-pointer flex flex-row md:flex-col items-center md:text-center py-3 md:py-4 px-2 sm:px-3 md:px-2 transition-all duration-150 card-press active:scale-[0.985] select-none"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-full md:h-[168px] shrink-0 flex items-center justify-center mr-3 sm:mr-4 md:mr-0 md:mb-3 overflow-visible">
              <img
                src="/assets/rider-spritev2.webp"
                alt="Become a Rider - SpeedyMeals"
                className="h-full w-auto max-h-none object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            </div>
            <div className="flex-1 md:w-full min-w-0 break-words flex flex-col justify-center md:items-center">
              <h3 className="font-heading font-extrabold text-base sm:text-lg md:text-xl text-ink tracking-tight mb-1 md:mb-1.5">
                Become a Rider
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-ink-soft leading-snug mb-1.5 md:mb-3">
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
            className="group cursor-pointer flex flex-row md:flex-col items-center md:text-center py-3 md:py-4 px-2 sm:px-3 md:px-2 transition-all duration-150 card-press active:scale-[0.985] select-none"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-full md:h-[168px] shrink-0 flex items-center justify-center mr-3 sm:mr-4 md:mr-0 md:mb-3 overflow-visible">
              <img
                src="/assets/merchant-spritev2.webp"
                alt="Grow your restaurant - SpeedyMeals"
                className="h-full w-auto max-h-none object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            </div>
            <div className="flex-1 md:w-full min-w-0 break-words flex flex-col justify-center md:items-center">
              <h3 className="font-heading font-extrabold text-base sm:text-lg md:text-xl text-ink tracking-tight mb-1 md:mb-1.5">
                Grow Your Business
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-ink-soft leading-snug mb-1.5 md:mb-3">
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
            className="group cursor-pointer flex flex-row md:flex-col items-center md:text-center py-3 md:py-4 px-2 sm:px-3 md:px-2 transition-all duration-150 card-press active:scale-[0.985] select-none"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-full md:h-[168px] shrink-0 flex items-center justify-center mr-3 sm:mr-4 md:mr-0 md:mb-3 overflow-visible">
              <img
                src="/assets/customer-spritev2.webp"
                alt="Order food delivery - SpeedyMeals"
                className="h-full w-auto max-h-none object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            </div>
            <div className="flex-1 md:w-full min-w-0 break-words flex flex-col justify-center md:items-center">
              <h3 className="font-heading font-extrabold text-base sm:text-lg md:text-xl text-ink tracking-tight mb-1 md:mb-1.5">
                Order Food Delivery
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-ink-soft leading-snug mb-1.5 md:mb-3">
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
                const isActive = activeCountry === item.code;
                const hoverClass = item.isActive
                  ? 'hover:text-[#10B981] hover:decoration-[#10B981]'
                  : 'hover:text-[#F59E0B] hover:decoration-[#F59E0B]';
                const activeColorClass = item.isActive
                  ? 'text-[#10B981] decoration-[#10B981]'
                  : 'text-[#F59E0B] decoration-[#F59E0B]';

                return (
                  <div key={item.code} className="relative flex items-center">
                    {idx > 0 && <span className="text-ink-soft/40 mr-1.5 sm:mr-2 select-none">·</span>}
                    <button
                      ref={anchorRefs[item.code]}
                      type="button"
                      onClick={() => setActiveCountry(isActive ? null : item.code)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === 'mouse') {
                          setActiveCountry(item.code);
                        }
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType === 'mouse') {
                          setActiveCountry((prev) => (prev === item.code ? null : prev));
                        }
                      }}
                      className={`font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider transition-colors duration-150 cursor-pointer underline underline-offset-4 decoration-1 active:scale-95 transition-transform duration-100 ease-out select-none ${
                        isActive ? activeColorClass : `text-ink ${hoverClass}`
                      }`}
                      aria-label={`Coverage info for ${item.name}`}
                      aria-expanded={isActive}
                      aria-haspopup="true"
                    >
                      {item.isActive ? `${item.name} (${item.code})` : item.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Country Cities Viewport Popover */}
      {mounted && createPortal(
        <AnimatePresence>
          {activeCountryItem && (
            <motion.div
              key={activeCountryItem.code}
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.1 }
                  : { type: 'spring', damping: 26, stiffness: 350, mass: 0.8 }
              }
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
                transformOrigin: `${position.arrowLeft}px ${position.placement === 'top' ? 'bottom' : 'top'}`,
              }}
              className="z-50 pointer-events-none"
            >
              <div className="relative bg-[#16181D]/95 backdrop-blur-xl border border-white/10 px-2.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_16px_40px_-6px_rgba(0,0,0,0.5)] flex items-center space-x-2 rounded-lg">
                {/* Arrow pointer */}
                <span
                  style={{ left: `${position.arrowLeft}px` }}
                  className={`absolute w-2 h-2 rotate-45 bg-[#16181D]/95 pointer-events-none -translate-x-1/2 ${
                    position.placement === 'top'
                      ? '-bottom-1 border-r border-b border-white/10'
                      : '-top-1 border-l border-t border-white/10'
                  }`}
                />

                {/* Country status indicator */}
                {activeCountryItem.isActive ? (
                  <span className="w-1.5 h-1.5 bg-[#10B981] shrink-0 inline-block rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-[#F59E0B] shrink-0 inline-block animate-pulse rounded-full shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                )}

                {/* Cities marquee */}
                <div className="min-w-0 overflow-hidden relative w-full flex">
                  <div
                    className="animate-marquee flex items-center space-x-2 whitespace-nowrap text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white"
                    style={{
                      animationDuration: `${Math.max(
                        activeCountryItem.isActive ? 12 : 10,
                        activeCountryItem.cities.length * (activeCountryItem.isActive ? 1.8 : 2.2)
                      )}s`,
                    }}
                  >
                    {[...activeCountryItem.cities, ...activeCountryItem.cities].map((cityOrCountry, cIdx) => (
                      <span key={`${cityOrCountry}-${cIdx}`} className="inline-flex items-center space-x-2">
                        <span className="text-white font-semibold">{cityOrCountry}</span>
                        <span className="text-[#8C9099]">·</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
};

