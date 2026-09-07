'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, ShieldCheck, CurrencyCircleDollar, Lightning } from '@phosphor-icons/react';

interface HeroSectionProps {
  onSelectPersona: (persona: 'rider' | 'restaurant') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPersona }) => {
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

  // Motion variants with staggerChildren: 0.1
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const, // momentum-forward easing
      },
    },
  };

  return (
    <section
      id="about"
      className="relative min-h-screen flex flex-col justify-between pt-24 pb-12 overflow-hidden"
    >
      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl"
        >
          {/* Eyebrow: FAST & SAFE TO YOU (mono, tracking-widest, --red, subtle color coupling) */}
          <motion.div variants={itemVariants} className="flex items-center space-x-3 mb-5">
            <span
              className="inline-block w-2 h-2 transition-colors duration-300"
              style={{ backgroundColor: 'var(--dynamic-accent, #E23A2E)' }}
            />
            <span
              id="hero-eyebrow"
              className="font-mono text-xs uppercase tracking-[0.25em] font-semibold text-[#E23A2E]"
            >
              FAST & SAFE TO YOU
            </span>
            <div className="h-px w-12 bg-[#E4E2DD]" />
            <span className="font-mono text-[11px] text-[#5B5F66] tracking-wider uppercase hidden sm:inline-block">
              SOUTH ASIA & MIDDLE EAST NETWORK
            </span>
          </motion.div>

          {/* Headline (Archivo Black, huge, --ink): SPEEDYMEALS / FAST. FAIR. GLOBAL. */}
          <motion.div variants={itemVariants} className="mb-6">
            <h1
              id="hero-headline"
              className="font-['Archivo_Black'] text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-[#15171A] uppercase leading-[0.92]"
            >
              SPEEDYMEALS
              <br />
              <span className="text-[#15171A] flex flex-wrap items-center gap-x-3 sm:gap-x-4">
                <span>FAST.</span>
                <span
                  className="transition-colors duration-300"
                  style={{ color: 'var(--dynamic-accent, #E23A2E)' }}
                >
                  FAIR.
                </span>
                <span>GLOBAL.</span>
              </span>
            </h1>
          </motion.div>

          {/* Subhead with Sharp Editorial Styling */}
          <motion.div
            variants={itemVariants}
            className="mb-8 p-6 bg-[#FFFFFF] border-l-2 border-[#15171A] border-y border-r border-[#E4E2DD] max-w-3xl shadow-sm"
          >
            <p className="text-base sm:text-lg text-[#15171A] leading-relaxed font-sans font-normal">
              A new delivery platform for South Asia & the Middle East — built so riders keep{' '}
              <strong className="font-semibold text-[#E23A2E] underline decoration-1 underline-offset-4">
                100% of the delivery fee
              </strong>{' '}
              and restaurants pay a flat{' '}
              <strong className="font-semibold text-[#1E5FA8]">10%</strong>. No hidden cuts, no
              extraction.
            </p>
          </motion.div>

          {/* Company detail block (sharp hairline panels, mono labels): editorial not corporate */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-10 max-w-3xl font-mono"
          >
            <div className="p-4 bg-[#FFFFFF] border border-[#E4E2DD] shadow-sm hover:border-[#15171A] transition-colors duration-150">
              <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] flex items-center space-x-1 mb-1.5">
                <CurrencyCircleDollar size={14} weight="bold" className="text-[#E23A2E]" />
                <span>RIDER REMUNERATION</span>
              </div>
              <div className="text-base font-bold text-[#15171A]">100% Retained</div>
              <div className="text-[11px] text-[#5B5F66] mt-0.5">Zero commission off rider mileage</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E4E2DD] shadow-sm hover:border-[#15171A] transition-colors duration-150">
              <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] flex items-center space-x-1 mb-1.5">
                <ShieldCheck size={14} weight="bold" className="text-[#1E5FA8]" />
                <span>MERCHANT CONTRACT</span>
              </div>
              <div className="text-base font-bold text-[#15171A]">10% Flat Rate</div>
              <div className="text-[11px] text-[#5B5F66] mt-0.5">No promotion gouging or tiers</div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E4E2DD] shadow-sm hover:border-[#15171A] transition-colors duration-150">
              <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] flex items-center space-x-1 mb-1.5">
                <Lightning size={14} weight="bold" className="text-[#C7A874]" />
                <span>INFRASTRUCTURE</span>
              </div>
              <div className="text-base font-bold text-[#15171A]">Real-Time Dispatch</div>
              <div className="text-[11px] text-[#5B5F66] mt-0.5">Direct routing telemetry</div>
            </div>
          </motion.div>

          {/* Two CTAs: RIDE WITH US (--red) / PARTNER YOUR RESTAURANT (--blue outline) */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8"
          >
            <button
              id="hero-cta-ride"
              type="button"
              onClick={() => handleScrollToPartner('rider')}
              className="px-8 py-4 bg-[#E23A2E] text-white font-mono text-xs uppercase tracking-widest font-bold border border-[#E23A2E] hover:bg-[#15171A] hover:border-[#15171A] transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <span>RIDE WITH US</span>
              <ArrowRight size={14} weight="bold" />
            </button>

            <button
              id="hero-cta-restaurant"
              type="button"
              onClick={() => handleScrollToPartner('restaurant')}
              className="px-8 py-4 bg-transparent text-[#1E5FA8] font-mono text-xs uppercase tracking-widest font-bold border border-[#1E5FA8] hover:bg-[#1E5FA8] hover:text-white transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <span>PARTNER YOUR RESTAURANT</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom-left: "SCROLL TO DISCOVER" mono label + scroll indicator */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between pt-4 border-t border-[#E4E2DD]">
          <button
            id="hero-scroll-indicator"
            type="button"
            onClick={handleScrollToServices}
            className="flex items-center space-x-3 text-[#5B5F66] hover:text-[#15171A] transition-colors duration-150 font-mono text-xs uppercase tracking-widest"
          >
            <span className="w-5 h-5 border border-[#15171A] flex items-center justify-center text-[#15171A]">
              <ArrowDown size={12} weight="bold" />
            </span>
            <span>SCROLL TO DISCOVER SERVICES</span>
          </button>

          <div className="font-mono text-[11px] text-[#5B5F66] tracking-wider hidden sm:block">
            DEPLOYMENT: DUBAI · DOHA · KARACHI · LAHORE · RIYADH
          </div>
        </div>
      </div>
    </section>
  );
};
