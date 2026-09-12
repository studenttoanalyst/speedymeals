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
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-[#15171A]">
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

        {/* Primary Row: Food Delivery (Dominant hairline-bordered panel, Speedy Red accent, LIVE NOW tag) */}
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
            className="border-2 border-red bg-white p-6 sm:p-10 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-200"
          >
            {/* Top Bar with Code & Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-line">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 bg-red text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                  01
                </span>
                <div className="font-mono text-xs text-ink uppercase tracking-wider font-semibold">
                  CORE INFRASTRUCTURE
                </div>
              </div>

              {/* Status Tag: LIVE NOW with glowing emerald operational dot */}
              <div className="flex items-center space-x-2 border border-red/30 px-3 py-1 bg-red/5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 bg-[#10B981]" />
                </span>
                <span className="font-mono text-xs uppercase tracking-widest font-bold text-red">
                  LIVE NOW
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-red/10 border border-red/20 flex items-center justify-center text-red shrink-0">
                    <ForkKnife size={24} weight="bold" />
                  </div>
                  <h3 className="font-display text-2xl sm:text-4xl text-ink uppercase tracking-tight">
                    Food Delivery
                  </h3>
                </div>

                <p className="text-base sm:text-lg text-ink-soft mb-6 max-w-2xl leading-relaxed">
                  Real-time direct restaurant ordering. Zero algorithmic markup on menu pricing,
                  100% of the delivery fee transferred straight to the courier, and a flat 10%
                  merchant fee.
                </p>

                {/* Key feature line */}
                <div className="flex flex-wrap gap-y-2 gap-x-6 font-mono text-xs text-ink">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle size={14} weight="bold" className="text-red" />
                    <span>No Surge Tax</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle size={14} weight="bold" className="text-red" />
                    <span>Instant Rider Payout</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle size={14} weight="bold" className="text-red" />
                    <span>Menu Price Parity</span>
                  </span>
                </div>
              </div>

              {/* Numbers-before-prose metric block with brand accent colors */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-3 font-mono">
                <div className="p-4 bg-paper-off border border-line border-t-2 border-t-red group-hover:bg-red/[0.02] transition-colors">
                  <div className="text-2xl sm:text-3xl font-bold text-red">100%</div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-soft mt-1">
                    To Courier
                  </div>
                </div>

                <div className="p-4 bg-paper-off border border-line border-t-2 border-t-blue group-hover:bg-blue/[0.02] transition-colors">
                  <div className="text-2xl sm:text-3xl font-bold text-blue">10%</div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-soft mt-1">
                    Flat Merchant
                  </div>
                </div>

                <div className="p-4 bg-paper-off border border-line border-t-2 border-t-ink group-hover:bg-paper transition-colors">
                  <div className="text-2xl sm:text-3xl font-bold text-ink">18m</div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-soft mt-1">
                    Avg Dispatch
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Secondary Grid: 4 Hairline-Divided Panels with Distinct Color Identities */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Panel 02: Speedy Courier (Cobalt Transit Blue) */}
          <motion.div
            variants={itemVariants}
            id="service-panel-courier"
            className="border-l-2 border-l-blue border-y border-r border-line bg-white p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-blue/[0.015] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
                <span className="font-mono text-xs font-bold text-blue">02</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue font-bold">
                  COMING NEXT
                </span>
              </div>
              <div className="mb-4">
                <div className="w-10 h-10 bg-blue/10 border border-blue/20 flex items-center justify-center text-blue">
                  <Package size={22} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xl text-ink uppercase tracking-tight mb-2">
                Speedy Courier
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed mb-6 font-sans">
                Point-to-point courier for urgent legal documents, parcels, and items with live GPS
                handover verification.
              </p>
            </div>
            <div className="pt-4 border-t border-line font-mono text-[11px] text-blue flex justify-between items-center font-semibold">
              <span>PILOT Q3 2026</span>
              <ArrowUpRight size={13} weight="bold" />
            </div>
          </motion.div>

          {/* Panel 03: Speedy Drive (Warm Desert Tan) */}
          <motion.div
            variants={itemVariants}
            id="service-panel-drive"
            className="border-l-2 border-l-tan border-y border-r border-line bg-white p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-tan/[0.02] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
                <span className="font-mono text-xs font-bold text-[#A8874E]">03</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8874E] font-bold">
                  COMING NEXT
                </span>
              </div>
              <div className="mb-4">
                <div className="w-10 h-10 bg-tan/20 border border-tan/30 flex items-center justify-center text-tan">
                  <Car size={22} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xl text-ink uppercase tracking-tight mb-2">
                Speedy Drive
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed mb-6 font-sans">
                Fair-share mobility. Drivers retain transparent split with capped platform fees,
                eliminating predatory surge multipliers.
              </p>
            </div>
            <div className="pt-4 border-t border-line font-mono text-[11px] text-[#A8874E] flex justify-between items-center font-semibold">
              <span>PILOT Q4 2026</span>
              <ArrowUpRight size={13} weight="bold" />
            </div>
          </motion.div>

          {/* Panel 04: Speedy Mall (Fresh Emerald) */}
          <motion.div
            variants={itemVariants}
            id="service-panel-mall"
            className="border-l-2 border-l-[#10B981] border-y border-r border-line bg-white p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-[#10B981]/[0.015] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
                <span className="font-mono text-xs font-bold text-[#10B981]">04</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#10B981] font-bold">
                  FUTURE PHASE
                </span>
              </div>
              <div className="mb-4">
                <div className="w-10 h-10 bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                  <ShoppingBag size={22} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xl text-ink uppercase tracking-tight mb-2">
                Speedy Mall
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed mb-6 font-sans">
                Direct neighborhood commerce: pharmacies, grocers, and retail essentials fulfilled
                under 30 minutes.
              </p>
            </div>
            <div className="pt-4 border-t border-line font-mono text-[11px] text-[#10B981] flex justify-between items-center font-semibold">
              <span>PHASE 2 ROADMAP</span>
              <span className="font-mono">⋯</span>
            </div>
          </motion.div>

          {/* Panel 05: Technical Services (Cobalt Infrastructure) */}
          <motion.div
            variants={itemVariants}
            id="service-panel-tech"
            className="border-l-2 border-l-blue border-y border-r border-line bg-white p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-blue/[0.015] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
                <span className="font-mono text-xs font-bold text-blue">05</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue font-bold">
                  API ECOSYSTEM
                </span>
              </div>
              <div className="mb-4">
                <div className="w-10 h-10 bg-blue/10 border border-blue/20 flex items-center justify-center text-blue">
                  <Cpu size={22} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xl text-ink uppercase tracking-tight mb-2">
                Technical Services
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed mb-6 font-sans">
                Merchant POS terminals, enterprise fleet routing APIs, and white-label logistics
                telemetry engines.
              </p>
            </div>
            <div className="pt-4 border-t border-line font-mono text-[11px] text-blue flex justify-between items-center font-semibold">
              <span>REST &amp; WEBHOOKS</span>
              <ArrowUpRight size={13} weight="bold" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
