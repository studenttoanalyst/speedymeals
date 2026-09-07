'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ForkKnife,
  Package,
  Car,
  ShoppingBag,
  Cpu,
  ArrowUpRight,
  CheckCircle,
} from '@phosphor-icons/react';

export const ServicesSection: React.FC = () => {
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
      id="services"
      className="relative z-10 py-24 sm:py-32 border-t border-[#E4E2DD] bg-[#F6F5F3]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12 sm:mb-16"
        >
          <div className="flex items-center space-x-3 mb-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#5B5F66]">
              [ <span className="text-[#5B5F66]">02</span> ]
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-[#15171A] font-bold">
              Services
            </span>
            <div className="h-px flex-1 bg-[#E4E2DD]" />
            {/* Legend row as plain mono key */}
            <div className="font-mono text-xs text-[#5B5F66] tracking-wider hidden sm:block">
              <span className="text-[#E23A2E] font-bold">—</span> LIVE &nbsp;&nbsp;
              <span className="text-[#5B5F66]">⋯</span> PLANNED
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2 className="font-['Archivo_Black'] text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-[#15171A]">
              One platform. <br className="hidden sm:inline" />
              <span
                className="transition-colors duration-300"
                style={{ color: 'var(--dynamic-accent, #1E5FA8)' }}
              >
                A growing ecosystem.
              </span>
            </h2>

            <p className="text-sm font-mono text-[#5B5F66] max-w-sm">
              Architecture engineered for zero-extraction logistics. Starting with pure-fare food
              delivery, expanding systematically into regional commerce.
            </p>
          </div>
        </motion.div>

        {/* Primary Row: Food Delivery (Dominant hairline-bordered panel, --blue accent, LIVE NOW tag) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-8"
        >
          <motion.div
            variants={itemVariants}
            id="service-panel-food-delivery"
            className="border-2 border-[#1E5FA8] bg-[#FFFFFF] p-6 sm:p-10 relative overflow-hidden group shadow-sm"
          >
            {/* Top Bar with Code & Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E4E2DD]">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 bg-[#1E5FA8] text-white flex items-center justify-center font-mono font-bold text-xs">
                  01
                </span>
                <div className="font-mono text-xs text-[#5B5F66] uppercase tracking-wider">
                  CORE INFRASTRUCTURE
                </div>
              </div>

              {/* Status Tag: LIVE NOW in crisp mono (no rounded badge) */}
              <div className="flex items-center space-x-2 border border-[#1E5FA8] px-3 py-1 bg-[#1E5FA8]/5">
                <span className="w-2 h-2 bg-[#E23A2E] inline-block" />
                <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#1E5FA8]">
                  LIVE NOW
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <div className="flex items-center space-x-3 mb-3">
                  <ForkKnife size={28} weight="bold" className="text-[#1E5FA8]" />
                  <h3 className="font-['Archivo_Black'] text-2xl sm:text-4xl text-[#15171A] uppercase tracking-tight">
                    Food Delivery
                  </h3>
                </div>

                <p className="text-base sm:text-lg text-[#5B5F66] mb-6 max-w-2xl leading-relaxed">
                  Real-time direct restaurant ordering. Zero algorithmic markup on menu pricing,
                  100% of the delivery fee transferred straight to the courier, and a flat 10%
                  merchant fee.
                </p>

                {/* Key feature line */}
                <div className="flex flex-wrap gap-y-2 gap-x-6 font-mono text-xs text-[#15171A]">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle size={14} weight="bold" className="text-[#E23A2E]" />
                    <span>No Surge Tax</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle size={14} weight="bold" className="text-[#E23A2E]" />
                    <span>Instant Rider Payout</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle size={14} weight="bold" className="text-[#E23A2E]" />
                    <span>Menu Price Parity</span>
                  </span>
                </div>
              </div>

              {/* Numbers-before-prose metric block */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-3 font-mono">
                <div className="p-4 bg-[#F6F5F3] border border-[#E4E2DD]">
                  <div className="text-2xl sm:text-3xl font-bold text-[#15171A]">100%</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] mt-1">
                    To Courier
                  </div>
                </div>

                <div className="p-4 bg-[#F6F5F3] border border-[#E4E2DD]">
                  <div className="text-2xl sm:text-3xl font-bold text-[#1E5FA8]">10%</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] mt-1">
                    Flat Merchant
                  </div>
                </div>

                <div className="p-4 bg-[#F6F5F3] border border-[#E4E2DD]">
                  <div className="text-2xl sm:text-3xl font-bold text-[#15171A]">18m</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] mt-1">
                    Avg Dispatch
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Secondary Grid: 4 Hairline-Divided Panels */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Panel 02: Speedy Courier */}
          <motion.div
            variants={itemVariants}
            id="service-panel-courier"
            className="border-l-2 border-l-[#E23A2E] border-y border-r border-[#E4E2DD] bg-[#FFFFFF] p-6 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E4E2DD]">
                <span className="font-mono text-xs font-bold text-[#15171A]">02</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#E23A2E] font-bold">
                  COMING NEXT
                </span>
              </div>
              <div className="mb-4 text-[#15171A]">
                <Package size={26} weight="bold" />
              </div>
              <h4 className="font-['Archivo_Black'] text-xl text-[#15171A] uppercase tracking-tight mb-2">
                Speedy Courier
              </h4>
              <p className="text-xs text-[#5B5F66] leading-relaxed mb-6 font-sans">
                Point-to-point courier for urgent legal documents, parcels, and items with live GPS
                handover verification.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E4E2DD] font-mono text-[11px] text-[#5B5F66] flex justify-between items-center">
              <span>PILOT Q3 2026</span>
              <ArrowUpRight size={13} weight="bold" />
            </div>
          </motion.div>

          {/* Panel 03: Speedy Drive */}
          <motion.div
            variants={itemVariants}
            id="service-panel-drive"
            className="border-l-2 border-l-[#E23A2E] border-y border-r border-[#E4E2DD] bg-[#FFFFFF] p-6 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E4E2DD]">
                <span className="font-mono text-xs font-bold text-[#15171A]">03</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#E23A2E] font-bold">
                  COMING NEXT
                </span>
              </div>
              <div className="mb-4 text-[#15171A]">
                <Car size={26} weight="bold" />
              </div>
              <h4 className="font-['Archivo_Black'] text-xl text-[#15171A] uppercase tracking-tight mb-2">
                Speedy Drive
              </h4>
              <p className="text-xs text-[#5B5F66] leading-relaxed mb-6 font-sans">
                Fair-share mobility. Drivers retain transparent split with capped platform fees,
                eliminating predatory surge multipliers.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E4E2DD] font-mono text-[11px] text-[#5B5F66] flex justify-between items-center">
              <span>PILOT Q4 2026</span>
              <ArrowUpRight size={13} weight="bold" />
            </div>
          </motion.div>

          {/* Panel 04: Speedy Mall */}
          <motion.div
            variants={itemVariants}
            id="service-panel-mall"
            className="border-l-2 border-l-[#E4E2DD] border-y border-r border-[#E4E2DD] bg-[#FFFFFF] p-6 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E4E2DD]">
                <span className="font-mono text-xs font-bold text-[#5B5F66]">04</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#5B5F66]">
                  FUTURE PHASE
                </span>
              </div>
              <div className="mb-4 text-[#5B5F66]">
                <ShoppingBag size={26} weight="bold" />
              </div>
              <h4 className="font-['Archivo_Black'] text-xl text-[#15171A] uppercase tracking-tight mb-2">
                Speedy Mall
              </h4>
              <p className="text-xs text-[#5B5F66] leading-relaxed mb-6 font-sans">
                Direct neighborhood commerce: pharmacies, grocers, and retail essentials fulfilled
                under 30 minutes.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E4E2DD] font-mono text-[11px] text-[#5B5F66] flex justify-between items-center">
              <span>PHASE 2 ROADMAP</span>
              <span className="font-mono">⋯</span>
            </div>
          </motion.div>

          {/* Panel 05: Technical Services */}
          <motion.div
            variants={itemVariants}
            id="service-panel-tech"
            className="border-l-2 border-l-[#E4E2DD] border-y border-r border-[#E4E2DD] bg-[#FFFFFF] p-6 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E4E2DD]">
                <span className="font-mono text-xs font-bold text-[#5B5F66]">05</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#5B5F66]">
                  FUTURE PHASE
                </span>
              </div>
              <div className="mb-4 text-[#5B5F66]">
                <Cpu size={26} weight="bold" />
              </div>
              <h4 className="font-['Archivo_Black'] text-xl text-[#15171A] uppercase tracking-tight mb-2">
                Technical Services
              </h4>
              <p className="text-xs text-[#5B5F66] leading-relaxed mb-6 font-sans">
                Merchant POS terminals, enterprise fleet routing APIs, and white-label logistics
                telemetry engines.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E4E2DD] font-mono text-[11px] text-[#5B5F66] flex justify-between items-center">
              <span>API INTEGRATIONS</span>
              <span className="font-mono">⋯</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
