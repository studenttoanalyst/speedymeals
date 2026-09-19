'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ShieldCheck, CurrencyCircleDollar, Lightning } from '@phosphor-icons/react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface HeroSectionProps {
  onSelectPersona: (persona: 'rider' | 'restaurant') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPersona }) => {
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
          videoEl.play().catch(() => {});
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
      id="overview"
      className="relative h-[100dvh] min-h-[640px] max-h-[1080px] flex flex-col justify-between pt-24 sm:pt-28 lg:pt-32 [@media(max-height:760px)]:pt-20 [@media(max-height:640px)]:pt-16 pb-2.5 sm:pb-3.5 overflow-hidden"
    >
      <span id="about" className="absolute top-0 pointer-events-none" />
      {/* Dedicated White-ish Gradient Band for Top 35% of Hero */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[35%] bg-gradient-to-b from-paper via-paper/95 to-transparent z-[5]" />

      {/* Hero Content Container in structured vertical flow */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col items-center justify-between min-h-0">
        {/* Top: Eyebrow + Headlines: moved down for elegant breathing room below navbar */}
        <motion.div
          variants={containerVariants}
          initial={isMobile ? false : "hidden"}
          animate="visible"
          className="max-w-5xl w-full flex flex-col items-center text-center shrink-0 pt-1 sm:pt-1.5 md:pt-2 z-20 relative"
        >
          {/* Eyebrow: FAST & SAFE TO YOU + SOUTH ASIA & MIDDLE EAST NETWORK */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mb-1 sm:mb-1.5 px-2">
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

          {/* Line 1: SPEEDYMEALS in clean negative space */}
          <motion.div variants={itemVariants} className="relative z-20 w-full mb-0.5">
            <h1
              id="hero-headline"
              className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl [@media(max-height:760px)]:text-3xl [@media(max-height:640px)]:text-2xl tracking-tight text-ink uppercase leading-none text-center whitespace-nowrap"
            >
              SPEEDY MEALS
            </h1>
          </motion.div>

          {/* Line 2: FAST. FAIR. GLOBAL. overlapping cleanly over the video's upper sky canvas */}
          <motion.div variants={itemVariants} className="relative z-20 w-full mb-0">
            <div className="inline-flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 font-display text-xl sm:text-3xl lg:text-4xl xl:text-5xl [@media(max-height:760px)]:text-2xl [@media(max-height:640px)]:text-xl uppercase leading-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
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

        {/* Lower Space: Vertically centered in the middle of the negative space below the video across all viewports */}
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0 my-auto">
          <motion.div
            variants={containerVariants}
            initial={isMobile ? false : "hidden"}
            animate="visible"
            className="max-w-5xl w-full flex flex-col items-center text-center my-auto"
          >
            {/* Company detail block: 3 metrics (Rider, Merchant, Infrastructure) */}
            {/* Company detail block: 3 metrics (Rider, Merchant, Infrastructure) */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-1 sm:gap-2.5 mb-2.5 sm:mb-3 max-w-3xl w-full mx-auto font-mono text-left"
            >
              {/* Metric 1: Rider */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-1.5 sm:p-2.5 bg-paper border-x border-b border-line border-t-2 border-t-red shadow-xs hover:border-red hover:bg-red/[0.02] transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[7.5px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs bg-red/10 flex items-center justify-center shrink-0">
                      <CurrencyCircleDollar size={12} weight="bold" className="text-red group-hover:scale-110 transition-transform duration-200" />
                    </span>
                    <span className="truncate font-semibold text-ink">
                      <span className="xs:hidden">RIDER</span>
                      <span className="hidden xs:inline">RIDER REMUNERATION</span>
                    </span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-red opacity-60 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                </div>
                <div className="text-[10px] xs:text-xs sm:text-base font-bold text-ink group-hover:text-red transition-colors duration-150 truncate">
                  100% Retained
                </div>
                <div className="text-[9px] sm:text-[10px] text-ink-soft hidden sm:block truncate">Zero commission on mileage</div>
              </motion.div>

              {/* Metric 2: Merchant */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-1.5 sm:p-2.5 bg-paper border-x border-b border-line border-t-2 border-t-blue shadow-xs hover:border-blue hover:bg-blue/[0.02] transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[7.5px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs bg-blue/10 flex items-center justify-center shrink-0">
                      <ShieldCheck size={12} weight="bold" className="text-blue group-hover:scale-110 transition-transform duration-200" />
                    </span>
                    <span className="truncate font-semibold text-ink">
                      <span className="xs:hidden">MERCHANT</span>
                      <span className="hidden xs:inline">MERCHANT CONTRACT</span>
                    </span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-blue opacity-60 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                </div>
                <div className="text-[10px] xs:text-xs sm:text-base font-bold text-ink group-hover:text-blue transition-colors duration-150 truncate">
                  10% Flat Rate
                </div>
                <div className="text-[9px] sm:text-[10px] text-ink-soft hidden sm:block truncate">No gouging tiers</div>
              </motion.div>

              {/* Metric 3: Infrastructure */}
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="group p-1.5 sm:p-2.5 bg-paper border-x border-b border-line border-t-2 border-t-tan shadow-xs hover:border-tan hover:bg-tan/[0.03] transition-all duration-200 text-left relative overflow-hidden cursor-default"
              >
                <div className="text-[7.5px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs bg-tan/20 flex items-center justify-center shrink-0">
                      <Lightning size={12} weight="bold" className="text-tan group-hover:scale-110 transition-transform duration-200" />
                    </span>
                    <span className="truncate font-semibold text-ink">
                      <span className="xs:hidden">DISPATCH</span>
                      <span className="hidden xs:inline">INFRASTRUCTURE</span>
                    </span>
                  </span>
                  <span className="w-1.5 h-1.5 bg-tan opacity-60 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                </div>
                <div className="text-[10px] xs:text-xs sm:text-base font-bold text-ink group-hover:text-tan transition-colors duration-150 truncate">
                  <span className="xs:hidden">Real-Time</span>
                  <span className="hidden xs:inline">Real-Time Dispatch</span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-ink-soft hidden sm:block truncate">Direct telemetry</div>
              </motion.div>
            </motion.div>

            {/* Two CTAs: RIDE WITH US / PARTNER YOUR RESTAURANT: Responsive stack on mobile to prevent overflow */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-2.5 mb-0 w-full max-w-sm sm:max-w-xl mx-auto px-1"
            >
              <motion.button
                id="hero-cta-ride"
                type="button"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={() => handleScrollToPartner('rider')}
                className="group w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-red text-white font-mono text-[11px] sm:text-xs uppercase tracking-widest font-bold border border-red hover:bg-ink hover:border-ink transition-all duration-150 flex items-center justify-center space-x-2 shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap"
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
                className="group w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-transparent text-blue font-mono text-[11px] sm:text-xs uppercase tracking-widest font-bold border border-blue hover:bg-blue hover:text-white transition-all duration-150 flex items-center justify-center space-x-2 shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap"
              >
                <span>PARTNER YOUR RESTAURANT</span>
                <ArrowRight size={13} weight="bold" className="group-hover:translate-x-1 transition-transform duration-200 shrink-0" />
              </motion.button>
            </motion.div>

            {/* Strategic Partner Authority Badge: Partnered with Pakistan Post (Logo-Only) */}
            <motion.div
              variants={itemVariants}
              className="mt-2.5 sm:mt-3 [@media(max-height:760px)]:mt-1.5 [@media(max-height:640px)]:mt-1 flex items-center justify-center"
            >
              <div
                id="hero-partner-badge"
                className="inline-flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-paper/95 border border-line shadow-xs hover:border-red/40 hover:shadow-sm transition-all duration-200 cursor-default group"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-red animate-pulse shrink-0" />
                  <span className="font-mono text-[9px] sm:text-[10.5px] uppercase tracking-wider text-ink-soft font-bold">
                    PARTNERED WITH
                  </span>
                </div>
                <div className="h-5 sm:h-6 w-px bg-line" />
                <div className="flex items-center">
                  <Image
                    src="/assets/pakistan-post.png"
                    alt="Pakistan Post Official Partner"
                    width={96}
                    height={36}
                    className="h-6 sm:h-7 md:h-8 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform duration-200"
                    priority
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
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

          {/* Deployment locations banner: explicitly visible on both mobile and desktop */}
          <div className="font-mono text-[9px] sm:text-[11px] text-ink-soft tracking-wider flex items-center space-x-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-[#10B981]" />
            </span>
            <span className="text-center sm:text-right">DEPLOYMENT: KARACHI · LAHORE · ISLAMABAD · PESHAWAR · RIYADH · MAKKAH</span>
          </div>
        </div>
      </div>
    </section>
  );
};
