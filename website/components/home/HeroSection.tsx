'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

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
  onSelectPersona: (persona: 'rider' | 'restaurant' | 'customer') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPersona }) => {
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => { });
    }

    // Video auto-pause/resume observer when scrolled out of viewport to save mobile resources
    const videoEl = videoRef.current;
    if (!videoEl || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => { });
        } else {
          videoEl.pause();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(videoEl);
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScrollToPartner = (persona: 'rider' | 'restaurant' | 'customer') => {
    onSelectPersona(persona);
    const partnerSection = document.getElementById('partner');
    if (partnerSection) {
      partnerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToServices = () => {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Stagger container entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  // Element reveal variants with natural deceleration
  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  // Word pop sequence for FAST. FAIR. GLOBAL.
  const wordVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: shouldReduceMotion ? 1 : 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: shouldReduceMotion ? 0 : 0.25 + i * 0.12,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
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

  return (
    <section
      id="overview"
      className="relative min-h-screen flex flex-col justify-between pt-16 sm:pt-20 lg:pt-24 pb-4 sm:pb-6 overflow-hidden"
    >
      <span id="about" className="absolute top-0 pointer-events-none" />
      {/* Dedicated White-ish Gradient Band for Top 35% of Hero */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[35%] bg-gradient-to-b from-paper via-paper/95 to-transparent z-[5]" />

      {/* Hero Content Container in structured vertical flow */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col items-center justify-between min-h-0">
        {/* Top: Eyebrow + Headlines matching Picture 5 */}
        <motion.div
          variants={containerVariants}
          initial={isMobile ? false : "hidden"}
          animate="visible"
          className="max-w-5xl w-full flex flex-col items-center text-center shrink-0 pt-0 sm:pt-1 z-20 relative"
        >
          {/* Eyebrow: ■ FAST & SAFE TO YOU ── SOUTH ASIA & MIDDLE EAST NETWORK */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 gap-y-1 mb-1.5 sm:mb-2 px-2">
            <span className="w-2.5 h-2.5 bg-red inline-block shrink-0" />
            <span
              id="hero-eyebrow"
              className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] font-bold text-red whitespace-nowrap"
            >
              FAST & SAFE TO YOU
            </span>
            <div className="h-px w-6 sm:w-12 bg-line shrink-0" />
            <span className="font-mono text-[9.5px] sm:text-[11.5px] text-ink-soft tracking-[0.18em] uppercase whitespace-nowrap">
              SOUTH ASIA & MIDDLE EAST NETWORK
            </span>
          </motion.div>

          {/* Headline: SPEEDY MEALS (Brand Name) + FAST. FAIR. GLOBAL. (smaller, switching colors) */}
          <div className="relative z-20 w-full mb-1 sm:mb-2 text-center max-w-5xl mx-auto">
            <h1
              id="hero-headline"
              className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] tracking-tight uppercase leading-[0.92] text-[#15171A] font-black text-center"
            >
              SPEEDY MEALS
            </h1>
            <div
              id="hero-tagline"
              className="font-display text-xl sm:text-3xl md:text-4xl lg:text-[2.75rem] tracking-tight uppercase leading-tight text-center font-black mt-1 sm:mt-1.5"
            >
              {taglineWords.map((word, i) => (
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
        </motion.div>

        {/* Video Animation: Pulled up to overlap behind FAST. FAIR. GLOBAL. with seamless perimeter fade into white */}
        <div
          ref={videoContainerRef}
          className="hero-video-box relative w-full aspect-[3840/1685] -mt-5 sm:-mt-8 md:-mt-12 lg:-mt-16 overflow-hidden pointer-events-none select-none shrink-0 z-10"
          style={{
            maskImage: isMobile
              ? undefined
              : 'radial-gradient(ellipse 96% 90% at 50% 50%, black 65%, rgba(0,0,0,0.85) 85%, transparent 100%)',
            WebkitMaskImage: isMobile
              ? undefined
              : 'radial-gradient(ellipse 96% 90% at 50% 50%, black 65%, rgba(0,0,0,0.85) 85%, transparent 100%)',
            transform: 'translateZ(0)',
          }}
        >
          {/* Top sky blend: allows FAST. FAIR. GLOBAL. to fade smoothly from white into the gray canvas */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 sm:h-24 md:h-32 bg-gradient-to-b from-paper via-paper/60 to-transparent z-10" />

          {/* Left edge blend: dissolves left border seamlessly into white */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-14 sm:w-20 md:w-28 bg-gradient-to-r from-paper via-paper/50 to-transparent z-10" />

          {/* Right edge blend: dissolves right border seamlessly into white */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14 sm:w-20 md:w-28 bg-gradient-to-l from-paper via-paper/50 to-transparent z-10" />

          {/* Bottom edge blend: subtle softening below road line */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 sm:h-8 bg-gradient-to-t from-paper/80 to-transparent z-10" />

          {/* Precise 1685px vertical crop (h-[128.3%] object-top): shows full scene (wheels, pins, road) while cleanly cropping bottom watermark */}
          <video
            ref={videoRef}
            src="/animated_vid.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            className="w-full h-[128.3%] object-cover object-top"
            aria-hidden="true"
          />
        </div>

        {/* 3 DoorDash-Style Descriptive Cards: Generous white space gap from video, no overlap */}
        <div className="w-full max-w-6xl mx-auto shrink-0 z-20 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-2 py-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 text-center items-start">
            {/* Card 1: Become a Rider */}
            <div className="flex flex-col items-center justify-between p-2 sm:p-3 hover:bg-black/[0.015] transition-colors duration-200 group rounded-2xl">
              <div className="flex flex-col items-center w-full">
                <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 w-full mb-2 flex items-center justify-center overflow-visible">
                  <img
                    src="/assets/rider-sprite.png"
                    alt="Become a Rider - SpeedyMeals"
                    className="h-full w-auto max-h-none object-contain scale-[1.28] drop-shadow-md group-hover:scale-[1.34] transition-transform duration-300 ease-out pointer-events-none"
                  />
                </div>
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-ink tracking-tight mb-0.5">
                  Become a Rider
                </h3>
                <p className="text-xs sm:text-[13px] text-ink-soft leading-snug mb-2.5 max-w-[220px] font-sans">
                  Deliver meals on your own schedule. Reliable weekly pay, direct support.
                </p>
              </div>
              <button
                type="button"
                id="hero-card-cta-rider"
                onClick={() => handleScrollToPartner('rider')}
                className="inline-flex items-center space-x-1.5 px-5 py-1.5 text-xs font-sans font-bold text-red hover:text-white bg-red/10 hover:bg-red transition-all duration-200 rounded-full cursor-pointer shadow-xs"
              >
                <span>Start delivering</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>

            {/* Card 2: List your restaurant */}
            <div className="flex flex-col items-center justify-between p-2 sm:p-3 hover:bg-black/[0.015] transition-colors duration-200 group rounded-2xl">
              <div className="flex flex-col items-center w-full">
                <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 w-full mb-2 flex items-center justify-center overflow-visible">
                  <img
                    src="/assets/merchant-sprite.png"
                    alt="Grow your restaurant - SpeedyMeals"
                    className="h-full w-auto max-h-none object-contain scale-[1.28] drop-shadow-md group-hover:scale-[1.34] transition-transform duration-300 ease-out pointer-events-none"
                  />
                </div>
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-ink tracking-tight mb-0.5">
                  Grow Your Business
                </h3>
                <p className="text-xs sm:text-[13px] text-ink-soft leading-snug mb-2.5 max-w-[220px] font-sans">
                  Reach more customers with honest fees and simple store management.
                </p>
              </div>
              <button
                type="button"
                id="hero-card-cta-merchant"
                onClick={() => handleScrollToPartner('restaurant')}
                className="inline-flex items-center space-x-1.5 px-5 py-1.5 text-xs font-sans font-bold text-blue hover:text-white bg-blue/10 hover:bg-blue transition-all duration-200 rounded-full cursor-pointer shadow-xs"
              >
                <span>List your store</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>

            {/* Card 3: Order food (Customer) -> Get VIP access */}
            <div className="flex flex-col items-center justify-between p-2 sm:p-3 hover:bg-black/[0.015] transition-colors duration-200 group rounded-2xl">
              <div className="flex flex-col items-center w-full">
                <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 w-full mb-2 flex items-center justify-center overflow-visible">
                  <img
                    src="/assets/customer-sprite.png"
                    alt="Order food delivery - SpeedyMeals"
                    className="h-full w-auto max-h-none object-contain scale-[1.28] drop-shadow-md group-hover:scale-[1.34] transition-transform duration-300 ease-out pointer-events-none"
                  />
                </div>
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-ink tracking-tight mb-0.5">
                  Order Food Delivery
                </h3>
                <p className="text-xs sm:text-[13px] text-ink-soft leading-snug mb-2.5 max-w-[220px] font-sans">
                  Hot, fresh food from local kitchens right to your door.
                </p>
              </div>
              <button
                type="button"
                id="hero-card-cta-customer"
                onClick={() => handleScrollToPartner('customer')}
                className="inline-flex items-center space-x-1.5 px-5 py-1.5 text-xs font-sans font-bold text-[#8C6D34] hover:text-[#15171A] bg-[#C7A874]/20 hover:bg-[#C7A874] border border-[#C7A874]/40 transition-all duration-200 rounded-full cursor-pointer shadow-xs"
              >
                <span>Get VIP access</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: WE ARE HERE country locations strip */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full shrink-0 mt-2 sm:mt-3 pt-2.5 border-t border-line/60">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">

          {/* WE ARE HERE: Interactive Country Links with Single Marquee Strip */}
          <div className="relative flex items-center flex-wrap justify-center sm:justify-start gap-y-1 gap-x-2 font-mono text-[9px] sm:text-[11px]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-[#10B981]" />
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
                      className={`font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider transition-colors duration-150 cursor-pointer underline underline-offset-4 decoration-1 ${isActiveHover
                        ? activeColorClass
                        : `text-ink ${hoverClass}`
                        }`}
                      aria-label={`Coverage info for ${item.name}`}
                    >
                      {item.isActive ? `${item.name} (${item.code})` : item.name}
                    </button>

                    {/* Single Marquee Moving Strip for Active or Coming Soon */}
                    {isActiveHover && (
                      <div
                        className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 z-50 pointer-events-none"
                      >
                        {item.isActive ? (
                          /* Active Country: Single Strip of Continuous Marquee Moving Text */
                          <div className="w-[280px] sm:w-[350px] bg-[#16181D] text-white border border-[#2D3139] px-2.5 py-1.5 shadow-xl overflow-hidden flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-[#10B981] shrink-0 rounded-full inline-block" />
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
                          /* Coming Soon: Single Strip of Continuous Marquee Moving Text for Pending Territories */
                          <div className="w-[280px] sm:w-[350px] bg-[#16181D] text-white border border-[#2D3139] px-2.5 py-1.5 shadow-xl overflow-hidden flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-[#F59E0B] shrink-0 rounded-full inline-block animate-pulse" />
                            <div className="overflow-hidden relative w-full flex">
                              <div
                                className="animate-marquee flex items-center space-x-2 whitespace-nowrap text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white"
                                style={{
                                  animationDuration: `${Math.max(10, item.cities.length * 2.2)}s`,
                                }}
                              >
                                {[...item.cities, ...item.cities, ...item.cities].map((country, cIdx) => (
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
