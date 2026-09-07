'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ShieldCheck, CurrencyCircleDollar, Lightning } from '@phosphor-icons/react';

interface HeroSectionProps {
  onSelectPersona: (persona: 'rider' | 'restaurant') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPersona }) => {
  const shouldReduceMotion = useReducedMotion();

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
      className="relative min-h-screen flex flex-col justify-between pt-24 pb-12 overflow-hidden"
    >
      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto flex flex-col items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl w-full flex flex-col items-center text-center"
        >
          {/* Eyebrow: FAST & SAFE TO YOU with energetic live status pulse */}
          <motion.div variants={itemVariants} className="flex items-center justify-center space-x-3 mb-5">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full bg-red opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-red" />
            </span>
            <span
              id="hero-eyebrow"
              className="font-mono text-xs uppercase tracking-[0.25em] font-semibold text-red"
            >
              FAST & SAFE TO YOU
            </span>
            <div className="h-px w-12 bg-line" />
            <span className="font-mono text-[11px] text-ink-soft tracking-wider uppercase hidden sm:inline-block">
              SOUTH ASIA & MIDDLE EAST NETWORK
            </span>
          </motion.div>

          {/* Headline: SPEEDYMEALS with lively staggered word reveal */}
          <motion.div variants={itemVariants} className="mb-6 text-center w-full">
            <h1
              id="hero-headline"
              className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-ink uppercase leading-[0.95]"
            >
              <span className="block">SPEEDYMEALS</span>
              <span className="text-ink flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 mt-2">
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
              </span>
            </h1>
          </motion.div>

          {/* Subhead with Sharp Editorial Styling & Interactive Lift */}
          <motion.div
            variants={itemVariants}
            whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
            className="mb-8 p-6 bg-paper border border-line border-t-2 border-t-ink max-w-3xl w-full mx-auto shadow-sm text-center transition-colors duration-200 hover:border-ink"
          >
            <p className="text-base sm:text-lg text-ink leading-relaxed font-sans font-normal">
              A new delivery platform for South Asia & the Middle East — built so riders keep{' '}
              <strong className="font-semibold text-red underline decoration-1 underline-offset-4">
                100% of the delivery fee
              </strong>{' '}
              and restaurants pay a flat{' '}
              <strong className="font-semibold text-blue">10%</strong>. No hidden cuts, no
              extraction.
            </p>
          </motion.div>

          {/* Company detail block: Interactive Hover Lift, hairline accent borders & icon animations */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-10 max-w-3xl w-full mx-auto font-mono text-left"
          >
            {/* Metric 1: Rider */}
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="group p-4 bg-paper border border-line shadow-sm hover:border-red hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
            >
              <div className="text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-1.5">
                <span className="flex items-center space-x-1.5">
                  <CurrencyCircleDollar size={15} weight="bold" className="text-red group-hover:scale-125 transition-transform duration-200" />
                  <span>RIDER REMUNERATION</span>
                </span>
                <span className="w-1.5 h-1.5 bg-red opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <div className="text-base font-bold text-ink group-hover:text-red transition-colors duration-150">
                100% Retained
              </div>
              <div className="text-[11px] text-ink-soft mt-0.5">Zero commission off rider mileage</div>
            </motion.div>

            {/* Metric 2: Merchant */}
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="group p-4 bg-paper border border-line shadow-sm hover:border-blue hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
            >
              <div className="text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-1.5">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck size={15} weight="bold" className="text-blue group-hover:scale-125 transition-transform duration-200" />
                  <span>MERCHANT CONTRACT</span>
                </span>
                <span className="w-1.5 h-1.5 bg-blue opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <div className="text-base font-bold text-ink group-hover:text-blue transition-colors duration-150">
                10% Flat Rate
              </div>
              <div className="text-[11px] text-ink-soft mt-0.5">No promotion gouging or tiers</div>
            </motion.div>

            {/* Metric 3: Infrastructure */}
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="group p-4 bg-paper border border-line shadow-sm hover:border-tan hover:shadow-md transition-all duration-200 text-left relative overflow-hidden cursor-default"
            >
              <div className="text-[10px] uppercase tracking-wider text-ink-soft flex items-center justify-between mb-1.5">
                <span className="flex items-center space-x-1.5">
                  <Lightning size={15} weight="bold" className="text-tan group-hover:scale-125 transition-transform duration-200" />
                  <span>INFRASTRUCTURE</span>
                </span>
                <span className="w-1.5 h-1.5 bg-tan opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <div className="text-base font-bold text-ink group-hover:text-tan transition-colors duration-150">
                Real-Time Dispatch
              </div>
              <div className="text-[11px] text-ink-soft mt-0.5">Direct routing telemetry</div>
            </motion.div>
          </motion.div>

          {/* Two CTAs: RIDE WITH US (--red) / PARTNER YOUR RESTAURANT (--blue outline) */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-8"
          >
            <motion.button
              id="hero-cta-ride"
              type="button"
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              onClick={() => handleScrollToPartner('rider')}
              className="group px-8 py-4 bg-red text-white font-mono text-xs uppercase tracking-widest font-bold border border-red hover:bg-ink hover:border-ink transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>RIDE WITH US</span>
              <ArrowRight size={14} weight="bold" className="group-hover:translate-x-1.5 transition-transform duration-200" />
            </motion.button>

            <motion.button
              id="hero-cta-restaurant"
              type="button"
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              onClick={() => handleScrollToPartner('restaurant')}
              className="group px-8 py-4 bg-transparent text-blue font-mono text-xs uppercase tracking-widest font-bold border border-blue hover:bg-blue hover:text-white transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>PARTNER YOUR RESTAURANT</span>
              <ArrowRight size={14} weight="bold" className="group-hover:translate-x-1.5 transition-transform duration-200" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom: "SCROLL TO DISCOVER" mono label + scroll indicator with kinetic bounce */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <motion.button
            id="hero-scroll-indicator"
            type="button"
            whileHover={shouldReduceMotion ? {} : { y: 2 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
            onClick={handleScrollToServices}
            className="group flex items-center space-x-3 text-ink-soft hover:text-ink transition-colors duration-150 font-mono text-xs uppercase tracking-widest cursor-pointer"
          >
            <motion.span
              animate={shouldReduceMotion ? {} : { y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-5 h-5 border border-ink group-hover:bg-ink group-hover:text-white flex items-center justify-center text-ink transition-colors duration-150"
            >
              <ArrowDown size={12} weight="bold" />
            </motion.span>
            <span className="group-hover:underline underline-offset-4 decoration-1">SCROLL TO DISCOVER SERVICES</span>
          </motion.button>

          <div className="font-mono text-[11px] text-ink-soft tracking-wider hidden sm:flex items-center space-x-2">
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
