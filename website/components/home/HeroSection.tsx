'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ShieldCheck, CurrencyCircleDollar, Lightning } from '@phosphor-icons/react';

interface HeroSectionProps {
  onSelectPersona: (persona: 'rider' | 'restaurant') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPersona }) => {
  const shouldReduceMotion = useReducedMotion();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  }, []);

  const handleScrollToPartner = (persona: 'rider' | 'restaurant') => {
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

  return (
    <section
      id="about"
      className="relative h-[100dvh] min-h-[640px] max-h-[1080px] flex flex-col justify-between pt-22 sm:pt-24 pb-3 sm:pb-3.5 overflow-hidden"
    >
      {/* Dedicated White-ish Gradient Band for Top 35% of Hero (Rule 1) */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[35%] bg-gradient-to-b from-paper via-paper/95 to-transparent z-[5]" />

      {/* Background Video Layer at z-0: fixed to title area like desktop, watermark cropped */}
      <div className="absolute top-[175px] xs:top-[185px] sm:top-[15%] md:top-[16%] left-1/2 -translate-x-1/2 w-full max-w-5xl md:max-w-6xl lg:max-w-7xl z-0 pointer-events-none select-none px-0 sm:px-4">
        <div
          ref={videoContainerRef}
          className="relative w-full aspect-[16/8.3] sm:aspect-[16/8] md:aspect-[16/7.2] overflow-hidden will-change-transform"
          style={{
            maskImage: 'radial-gradient(ellipse 99% 92% at 50% 50%, black 70%, rgba(0,0,0,0.85) 90%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 99% 92% at 50% 50%, black 70%, rgba(0,0,0,0.85) 90%, transparent 100%)',
          }}
        >
          {/* Bottom-cropped video: h-[120%] object-top inside overflow-hidden eliminates bottom watermark at all breakpoints */}
          <video
            ref={videoRef}
            src="/animated_vid.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            className="w-full h-[120%] object-cover object-top -translate-y-0"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Hero Foreground Content at z-10: fits inside 100vh fold without scrolling */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-5 xs:pt-7 sm:pt-0 md:my-auto flex flex-col items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl w-full flex flex-col items-center text-center"
        >
          {/* Top Group: Eyebrow + Headlines in clean negative space above & in sky of video */}
          <div className="w-full flex flex-col items-center text-center">
            {/* Eyebrow: FAST & SAFE TO YOU + SOUTH ASIA & MIDDLE EAST NETWORK */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-1 sm:mb-1.5 px-2">
              <span className="inline-flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-red opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 bg-red" />
                </span>
                <span
                  id="hero-eyebrow"
                  className="font-mono text-[9px] xs:text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.25em] font-semibold text-red whitespace-nowrap"
                >
                  FAST & SAFE TO YOU
                </span>
              </span>
              <div className="h-px w-4 sm:w-10 bg-line shrink-0" />
              <span className="font-mono text-[8.5px] xs:text-[9.5px] sm:text-[11px] text-ink-soft tracking-wider uppercase whitespace-nowrap">
                SOUTH ASIA & MIDDLE EAST NETWORK
              </span>
            </motion.div>

            {/* Line 1: SPEEDYMEALS in clean negative space above the video (Rule 1 & 3) */}
            <motion.div variants={itemVariants} className="relative z-20 w-full mb-0.5">
              <h1
                id="hero-headline"
                className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight text-ink uppercase leading-none text-center"
              >
                SPEEDYMEALS
              </h1>
            </motion.div>

            {/* Line 2: FAST. FAIR. GLOBAL. positioned in the sky band of video (Rule 2 & 5) */}
            <motion.div variants={itemVariants} className="relative z-20 w-full mb-0.5">
              <div className="inline-flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 font-display text-xl sm:text-3xl lg:text-4xl xl:text-5xl uppercase leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
                <motion.span
                  custom={1}
                  variants={wordVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block hover:text-red hover:scale-105 transition-all duration-200 cursor-default transform origin-center"
                >
                  FAST.
                </motion.span>
                <motion.span
                  custom={2}
                  variants={wordVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block text-red hover:text-tan hover:scale-105 transition-all duration-200 cursor-default transform origin-center font-extrabold"
                >
                  FAIR.
                </motion.span>
                <motion.span
                  custom={3}
                  variants={wordVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block hover:text-blue hover:scale-105 transition-all duration-200 cursor-default transform origin-center"
                >
                  GLOBAL.
                </motion.span>
              </div>
            </motion.div>
          </div>

          {/* Cyan Visual Corridor: negative space between headline and metric cards */}
          <div className="w-full h-[275px] xs:h-[295px] sm:h-[320px] md:h-[380px] lg:h-[400px] pointer-events-none" aria-hidden="true" />

          {/* Bottom Group: Metric Cards + CTA Buttons (middle-ground spacing) */}
          <div className="w-full flex flex-col items-center text-center mb-2 sm:mb-2">
            {/* Company detail block: 3 metrics */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-2.5 sm:mb-2.5 max-w-3xl w-full mx-auto font-mono text-left"
            >
              {/* Metric 1: Rider */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-2 sm:p-2.5 bg-paper border border-line shadow-sm hover:border-red hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                    <CurrencyCircleDollar size={13} weight="bold" className="text-red group-hover:scale-125 transition-transform duration-200 shrink-0" />
                    <span className="truncate">RIDER PAY</span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-red opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                </div>
                <div className="text-xs sm:text-base font-bold text-ink group-hover:text-red transition-colors duration-150 truncate">
                  100% Retained
                </div>
                <div className="text-[9px] sm:text-[10px] text-ink-soft hidden xs:block truncate">Zero mileage cut</div>
              </motion.div>

              {/* Metric 2: Merchant */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-2 sm:p-2.5 bg-paper border border-line shadow-sm hover:border-blue hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                    <ShieldCheck size={13} weight="bold" className="text-blue group-hover:scale-125 transition-transform duration-200 shrink-0" />
                    <span className="truncate">MERCHANT</span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-blue opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                </div>
                <div className="text-xs sm:text-base font-bold text-ink group-hover:text-blue transition-colors duration-150 truncate">
                  10% Flat Rate
                </div>
                <div className="text-[9px] sm:text-[10px] text-ink-soft hidden xs:block truncate">No gouging tiers</div>
              </motion.div>

              {/* Metric 3: Infrastructure */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-2 sm:p-2.5 bg-paper border border-line shadow-sm hover:border-tan hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                    <Lightning size={13} weight="bold" className="text-tan group-hover:scale-125 transition-transform duration-200 shrink-0" />
                    <span className="truncate">NETWORK</span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-tan opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                </div>
                <div className="text-xs sm:text-base font-bold text-ink group-hover:text-tan transition-colors duration-150 truncate">
                  Live Dispatch
                </div>
                <div className="text-[9px] sm:text-[10px] text-ink-soft hidden xs:block truncate">Direct telemetry</div>
              </motion.div>
            </motion.div>

            {/* Two CTAs: RIDE WITH US / PARTNER YOUR RESTAURANT */}
            <motion.div
              variants={itemVariants}
              className="flex flex-row items-center justify-center gap-2 sm:gap-2.5 mb-0 w-full max-w-lg"
            >
              <motion.button
                id="hero-cta-ride"
                type="button"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={() => handleScrollToPartner('rider')}
                className="group flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-2.5 bg-red text-white font-mono text-[10px] sm:text-xs uppercase tracking-widest font-bold border border-red hover:bg-ink hover:border-ink transition-all duration-150 flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-sm hover:shadow-md cursor-pointer truncate"
              >
                <span>RIDE WITH US</span>
                <ArrowRight size={13} weight="bold" className="group-hover:translate-x-1 transition-transform duration-200 shrink-0" />
              </motion.button>

              <motion.button
                id="hero-cta-restaurant"
                type="button"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={() => handleScrollToPartner('restaurant')}
                className="group flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-2.5 bg-transparent text-blue font-mono text-[10px] sm:text-xs uppercase tracking-widest font-bold border border-blue hover:bg-blue hover:text-white transition-all duration-150 flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-sm hover:shadow-md cursor-pointer truncate"
              >
                <span>PARTNER RESTAURANT</span>
                <ArrowRight size={13} weight="bold" className="group-hover:translate-x-1 transition-transform duration-200 shrink-0" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Bottom: "SCROLL TO DISCOVER" mono label + scroll indicator + DEPLOYMENT locations on mobile and desktop */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full shrink-0">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1.5 sm:gap-4 pt-2 border-t border-line">
          <motion.button
            id="hero-scroll-indicator"
            type="button"
            whileHover={shouldReduceMotion ? {} : { y: 2 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
            onClick={handleScrollToServices}
            className="group flex items-center space-x-2 text-ink-soft hover:text-ink transition-colors duration-150 font-mono text-[10px] sm:text-xs uppercase tracking-widest cursor-pointer"
          >
            <motion.span
              animate={shouldReduceMotion ? {} : { y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 border border-ink group-hover:bg-ink group-hover:text-white flex items-center justify-center text-ink transition-colors duration-150"
            >
              <ArrowDown size={10} weight="bold" />
            </motion.span>
            <span className="group-hover:underline underline-offset-4 decoration-1">SCROLL TO DISCOVER SERVICES</span>
          </motion.button>

          {/* Deployment locations banner — explicitly visible on both mobile and desktop */}
          <div className="font-mono text-[9px] sm:text-[11px] text-ink-soft tracking-wider flex items-center space-x-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-[#10B981]" />
            </span>
            <span className="text-center sm:text-right">DEPLOYMENT: DUBAI · DOHA · KARACHI · LAHORE · RIYADH</span>
          </div>
        </div>
      </div>
    </section>
  );
};
