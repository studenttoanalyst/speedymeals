'use client';

import React from 'react';
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
  return (
    <section
      id="services"
      className="relative z-10 py-12 sm:py-16 lg:py-20 border-t border-[#E4E2DD] bg-[#F6F5F3]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-mono text-xs uppercase tracking-widest text-[#5B5F66] whitespace-nowrap">
                [ 02 ]
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-[#15171A] font-bold whitespace-nowrap">
                Services
              </span>
            </div>
            <div className="hidden sm:block h-px flex-1 bg-[#E4E2DD] mx-3" />
            {/* Legend row as plain mono key */}
            <div className="font-mono text-xs text-[#5B5F66] tracking-wider hidden sm:flex items-center space-x-3">
              <span className="flex items-center space-x-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#E23A2E]" />
                <span className="font-bold text-ink">LIVE</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="text-[#5B5F66]">...</span>
                <span>PLANNED</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6">
            <h2 className="font-display text-xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-[#15171A]">
              <span className="block">One platform.</span>
              <span
                className="block transition-colors duration-300"
                style={{ color: 'var(--dynamic-accent, #1E5FA8)' }}
              >
                A growing ecosystem.
              </span>
            </h2>

            <p className="text-xs sm:text-sm font-mono text-[#5B5F66] max-w-sm">
              Architecture engineered for zero-extraction logistics. Starting with pure-fare food
              delivery, expanding systematically into regional commerce.
            </p>
          </div>
        </div>

        {/* Primary Row: Food Delivery (Compact hairline-bordered panel, Speedy Red accent) */}
        <div className="mb-3 sm:mb-4">
          <div
            id="service-panel-food-delivery"
            className="border-2 border-red bg-white p-4 sm:p-6 lg:p-7 relative overflow-hidden group shadow-xs hover:shadow-md transition-all duration-200"
          >
            {/* Top Bar with Code & Status */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-line">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 sm:w-7 sm:h-7 bg-red text-white flex items-center justify-center font-mono font-bold text-[11px] sm:text-xs shadow-xs">
                  01
                </span>
                <div className="font-mono text-[10px] sm:text-xs text-ink uppercase tracking-wider font-semibold">
                  CORE INFRASTRUCTURE
                </div>
              </div>

              {/* Status Tag: LIVE NOW with glowing emerald operational dot */}
              <div className="flex items-center space-x-1.5 border border-red/30 px-2 sm:px-2.5 py-0.5 bg-red/5">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 bg-[#10B981]" />
                </span>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-red">
                  LIVE NOW
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
              <div className="lg:col-span-7">
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red/10 border border-red/20 flex items-center justify-center text-red shrink-0">
                    <ForkKnife size={20} weight="bold" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl lg:text-3xl text-ink uppercase tracking-tight">
                    Food Delivery
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-ink-soft mb-3 sm:mb-4 max-w-2xl leading-relaxed">
                  Real-time direct restaurant ordering. Zero algorithmic markup on menu pricing,
                  100% of the delivery fee transferred straight to the courier, and a flat 10%
                  merchant fee.
                </p>

                {/* Key feature line */}
                <div className="flex flex-wrap gap-y-1.5 gap-x-4 sm:gap-x-5 font-mono text-[11px] sm:text-xs text-ink">
                  <span className="flex items-center space-x-1 sm:space-x-1.5">
                    <CheckCircle size={13} weight="bold" className="text-red shrink-0" />
                    <span>No Surge Tax</span>
                  </span>
                  <span className="flex items-center space-x-1 sm:space-x-1.5">
                    <CheckCircle size={13} weight="bold" className="text-red shrink-0" />
                    <span>Instant Rider Payout</span>
                  </span>
                  <span className="flex items-center space-x-1 sm:space-x-1.5">
                    <CheckCircle size={13} weight="bold" className="text-red shrink-0" />
                    <span>Menu Price Parity</span>
                  </span>
                </div>
              </div>

              {/* Numbers-before-prose metric block with brand accent colors */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-2 sm:gap-2.5 font-mono">
                <div className="p-2.5 sm:p-3 bg-paper-off border border-line border-t-2 border-t-red group-hover:bg-red/[0.02] transition-colors">
                  <div className="text-lg sm:text-2xl font-bold text-red">100%</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft mt-0.5">
                    To Courier
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 bg-paper-off border border-line border-t-2 border-t-blue group-hover:bg-blue/[0.02] transition-colors">
                  <div className="text-lg sm:text-2xl font-bold text-blue">10%</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft mt-0.5">
                    Flat Merchant
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 bg-paper-off border border-line border-t-2 border-t-ink group-hover:bg-paper transition-colors">
                  <div className="text-lg sm:text-2xl font-bold text-ink">18m</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-soft mt-0.5">
                    Avg Dispatch
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Grid: 4 Hairline-Divided Panels Side-by-Side (2 cols on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Panel 02: Speedy Courier (Cobalt Transit Blue) */}
          <div
            id="service-panel-courier"
            className="border-l-2 border-l-blue border-y border-r border-line bg-white p-3 sm:p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:bg-blue/[0.015] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line">
                <span className="font-mono text-xs font-bold text-blue">02</span>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-blue font-bold truncate ml-1">
                  COMING NEXT
                </span>
              </div>
              <div className="mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue/10 border border-blue/20 flex items-center justify-center text-blue">
                  <Package size={17} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xs sm:text-base lg:text-lg text-ink uppercase tracking-tight mb-1 leading-snug">
                Speedy Courier
              </h4>
              <p className="text-[11px] sm:text-xs text-ink-soft leading-relaxed mb-3 font-sans line-clamp-3 sm:line-clamp-none">
                Point-to-point courier for urgent documents, parcels, and items with live GPS handover.
              </p>
            </div>
            <div className="pt-2 border-t border-line font-mono text-[10px] sm:text-[11px] text-blue flex justify-between items-center font-semibold">
              <span>PILOT Q3 2026</span>
              <ArrowUpRight size={12} weight="bold" />
            </div>
          </div>

          {/* Panel 03: Speedy Drive (Warm Desert Tan) */}
          <div
            id="service-panel-drive"
            className="border-l-2 border-l-tan border-y border-r border-line bg-white p-3 sm:p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:bg-tan/[0.02] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line">
                <span className="font-mono text-xs font-bold text-[#A8874E]">03</span>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[#A8874E] font-bold truncate ml-1">
                  COMING NEXT
                </span>
              </div>
              <div className="mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-tan/20 border border-tan/30 flex items-center justify-center text-tan">
                  <Car size={17} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xs sm:text-base lg:text-lg text-ink uppercase tracking-tight mb-1 leading-snug">
                Speedy Drive
              </h4>
              <p className="text-[11px] sm:text-xs text-ink-soft leading-relaxed mb-3 font-sans line-clamp-3 sm:line-clamp-none">
                Fair-share mobility. Drivers retain transparent split with capped platform fees.
              </p>
            </div>
            <div className="pt-2 border-t border-line font-mono text-[10px] sm:text-[11px] text-[#A8874E] flex justify-between items-center font-semibold">
              <span>PILOT Q4 2026</span>
              <ArrowUpRight size={12} weight="bold" />
            </div>
          </div>

          {/* Panel 04: Speedy Mall (Fresh Emerald) */}
          <div
            id="service-panel-mall"
            className="border-l-2 border-l-[#10B981] border-y border-r border-line bg-white p-3 sm:p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:bg-[#10B981]/[0.015] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line">
                <span className="font-mono text-xs font-bold text-[#10B981]">04</span>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[#10B981] font-bold truncate ml-1">
                  FUTURE PHASE
                </span>
              </div>
              <div className="mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                  <ShoppingBag size={17} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xs sm:text-base lg:text-lg text-ink uppercase tracking-tight mb-1 leading-snug">
                Speedy Mall
              </h4>
              <p className="text-[11px] sm:text-xs text-ink-soft leading-relaxed mb-3 font-sans line-clamp-3 sm:line-clamp-none">
                Direct commerce: pharmacies, grocers, and retail essentials fulfilled under 30m.
              </p>
            </div>
            <div className="pt-2 border-t border-line font-mono text-[10px] sm:text-[11px] text-[#10B981] flex justify-between items-center font-semibold">
              <span>PHASE 2 ROADMAP</span>
              <span className="font-mono">...</span>
            </div>
          </div>

          {/* Panel 05: Technical Services (Cobalt Infrastructure) */}
          <div
            id="service-panel-tech"
            className="border-l-2 border-l-blue border-y border-r border-line bg-white p-3 sm:p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:bg-blue/[0.015] transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line">
                <span className="font-mono text-xs font-bold text-blue">05</span>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-blue font-bold truncate ml-1">
                  API ECOSYSTEM
                </span>
              </div>
              <div className="mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue/10 border border-blue/20 flex items-center justify-center text-blue">
                  <Cpu size={17} weight="bold" />
                </div>
              </div>
              <h4 className="font-display text-xs sm:text-base lg:text-lg text-ink uppercase tracking-tight mb-1 leading-snug">
                Technical Services
              </h4>
              <p className="text-[11px] sm:text-xs text-ink-soft leading-relaxed mb-3 font-sans line-clamp-3 sm:line-clamp-none">
                Merchant POS terminals, enterprise fleet routing APIs, and logistics engines.
              </p>
            </div>
            <div className="pt-2 border-t border-line font-mono text-[10px] sm:text-[11px] text-blue flex justify-between items-center font-semibold">
              <span>REST &amp; WEBHOOKS</span>
              <ArrowUpRight size={12} weight="bold" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
