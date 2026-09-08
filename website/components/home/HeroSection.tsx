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
      className="relative h-[100dvh] min-h-[640px] max-h-[1080px] flex flex-col justify-between pt-14 sm:pt-16 pb-2.5 sm:pb-3 overflow-hidden"
    >
      {/* Dedicated White-ish Gradient Band for Top 35% of Hero (Rule 1) */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[35%] bg-gradient-to-b from-paper via-paper/95 to-transparent z-[5]" />

      {/* Background Video Layer at z-0 (Rules 1, 2, 5: bottom-cropped to cut off watermark, feathered edges) */}
      <div className="absolute top-[14%] sm:top-[15%] md:top-[16%] left-1/2 -translate-x-1/2 w-full max-w-5xl md:max-w-6xl lg:max-w-7xl z-0 pointer-events-none select-none px-2 sm:px-4">
        <div
          ref={videoContainerRef}
          className="relative w-full aspect-[16/8.5] sm:aspect-[16/8] md:aspect-[16/7.2] overflow-hidden will-change-transform"
          style={{
            maskImage: 'radial-gradient(ellipse 92% 82% at 50% 50%, black 50%, rgba(0,0,0,0.7) 75%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 92% 82% at 50% 50%, black 50%, rgba(0,0,0,0.7) 75%, transparent 100%)',
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

      {/* Hero Foreground Content at z-10: fits inside 100vh fold without scrolling on 900px and 1080px */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto flex flex-col items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl w-full flex flex-col items-center text-center"
        >
          {/* Top Group: Eyebrow + Headlines in clean negative space above & in sky of video */}
          <div className="w-full flex flex-col items-center text-center">
            {/* Eyebrow: FAST & SAFE TO YOU */}
            <motion.div variants={itemVariants} className="flex items-center justify-center space-x-2.5 mb-1 sm:mb-1.5">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full bg-red opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 bg-red" />
              </span>
              <span
                id="hero-eyebrow"
                className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-semibold text-red"
              >
                FAST & SAFE TO YOU
              </span>
              <div className="h-px w-6 sm:w-10 bg-line" />
              <span className="font-mono text-[10px] sm:text-[11px] text-ink-soft tracking-wider uppercase hidden sm:inline-block">
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

          {/* Cyan Visual Corridor: ~400px negative space between headline and metric cards */}
          <div className="w-full h-[320px] sm:h-[360px] md:h-[390px] lg:h-[400px] pointer-events-none" aria-hidden="true" />

          {/* Bottom Group: Metric Cards + CTA Buttons (middle-ground spacing) */}
          <div className="w-full flex flex-col items-center text-center mb-1 sm:mb-2">
            {/* Company detail block: 3 metrics */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-2 sm:mb-2.5 max-w-3xl w-full mx-auto font-mono text-left"
            >
              {/* Metric 1: Rider */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-2 sm:p-2.5 bg-paper border border-line shadow-sm hover:border-red hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1.5">
                    <CurrencyCircleDollar size={13} weight="bold" className="text-red group-hover:scale-125 transition-transform duration-200" />
                    <span>RIDER REMUNERATION</span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-red opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="text-sm sm:text-base font-bold text-ink group-hover:text-red transition-colors duration-150">
                  100% Retained
                </div>
                <div className="text-[10px] text-ink-soft">Zero commission off rider mileage</div>
              </motion.div>

              {/* Metric 2: Merchant */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-2 sm:p-2.5 bg-paper border border-line shadow-sm hover:border-blue hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1.5">
                    <ShieldCheck size={13} weight="bold" className="text-blue group-hover:scale-125 transition-transform duration-200" />
                    <span>MERCHANT CONTRACT</span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-blue opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="text-sm sm:text-base font-bold text-ink group-hover:text-blue transition-colors duration-150">
                  10% Flat Rate
                </div>
                <div className="text-[10px] text-ink-soft">No promotion gouging or tiers</div>
              </motion.div>

              {/* Metric 3: Infrastructure */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-2 sm:p-2.5 bg-paper border border-line shadow-sm hover:border-tan hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1.5">
                    <Lightning size={13} weight="bold" className="text-tan group-hover:scale-125 transition-transform duration-200" />
                    <span>INFRASTRUCTURE</span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-tan opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="text-sm sm:text-base font-bold text-ink group-hover:text-tan transition-colors duration-150">
                  Real-Time Dispatch
                </div>
                <div className="text-[10px] text-ink-soft">Direct routing telemetry</div>
              </motion.div>
            </motion.div>

            {/* Two CTAs: RIDE WITH US / PARTNER YOUR RESTAURANT */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-2.5 mb-0"
            >
              <motion.button
                id="hero-cta-ride"
                type="button"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={() => handleScrollToPartner('rider')}
                className="group px-5 py-2 sm:py-2.5 bg-red text-white font-mono text-xs uppercase tracking-widest font-bold border border-red hover:bg-ink hover:border-ink transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                <span>RIDE WITH US</span>
                <ArrowRight size={13} weight="bold" className="group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>

              <motion.button
                id="hero-cta-restaurant"
                type="button"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={() => handleScrollToPartner('restaurant')}
                className="group px-5 py-2 sm:py-2.5 bg-transparent text-blue font-mono text-xs uppercase tracking-widest font-bold border border-blue hover:bg-blue hover:text-white transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                <span>PARTNER YOUR RESTAURANT</span>
                <ArrowRight size={13} weight="bold" className="group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Bottom: "SCROLL TO DISCOVER" mono label + scroll indicator (always inside 100vh viewport fold) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full shrink-0">
        <div className="flex items-center justify-between pt-2 border-t border-line">
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

          <div className="font-mono text-[10px] sm:text-[11px] text-ink-soft tracking-wider hidden sm:flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-[#10B981]" />
            </span>
            <span>DEPLOYMENT: DUBAI · DOHA · KARACHI · LAHORE · RIYADH</span>
          </div>
        </div>
      </div>
    </section>
  );
};
