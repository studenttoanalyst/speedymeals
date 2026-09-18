'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Lightning,
  CurrencyCircleDollar,
  Handshake,
  MapPin,
  Buildings,
  Bicycle,
  Storefront,
  Scales,
  CheckCircle,
  GlobeHemisphereWest,
} from '@phosphor-icons/react';
import { Navbar } from '@/components/home/Navbar';
import { Footer } from '@/components/home/Footer';

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#FFFFFF] text-[#15171A] overflow-x-hidden selection:bg-[#E23A2E] selection:text-white">
      {/* Sticky Snap Navbar */}
      <Navbar />

      <main className="relative z-10 pt-28 sm:pt-32 lg:pt-36 pb-20">
        {/* Background Subtle Grid Texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#E2E4E8_1px,transparent_1px)] [background-size:24px_24px] opacity-60 -z-10" />

        {/* Hero Section of About Us */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-24">
          <div className="max-w-4xl">
            {/* Breadcrumb & Mono Eyebrow */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#5B5F66] mb-4">
              <Link href="/" className="hover:text-red transition-colors">
                HOME
              </Link>
              <span>/</span>
              <span className="text-red font-semibold uppercase">ABOUT US &amp; COMPANY PROFILE</span>
            </div>

            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-paper border border-line mb-6">
              <span className="w-2 h-2 bg-red inline-block" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
                ESTABLISHED IN 2026 · SOUTH ASIA &amp; MIDDLE EAST
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tight text-ink leading-none mb-6">
              ENGINEERED FOR SPEED. <br />
              <span className="text-red">ARCHITECTED FOR FAIRNESS.</span>
            </h1>

            <p className="font-sans text-lg sm:text-xl text-ink-soft leading-relaxed max-w-3xl">
              SpeedyMeals was founded in 2026 as a direct institutional countermeasure to predatory aggregator monopolization. We build high-velocity last-mile logistics infrastructure that guarantees fair splits for restaurant partners, 100% retained pay for couriers, and radical transparency for customers.
            </p>
          </div>

          {/* Key Facts Data Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 border-y border-line py-6 font-mono">
            <div>
              <div className="text-xs text-[#8C9099] uppercase">FOUNDING YEAR</div>
              <div className="text-2xl font-bold text-ink mt-1">2026</div>
              <div className="text-[11px] text-[#5B5F66]">Incorporated Network</div>
            </div>
            <div>
              <div className="text-xs text-[#8C9099] uppercase">MERCHANT RATE</div>
              <div className="text-2xl font-bold text-blue mt-1">10% Flat</div>
              <div className="text-[11px] text-[#5B5F66]">Zero advertising taxes</div>
            </div>
            <div>
              <div className="text-xs text-[#8C9099] uppercase">RIDER REMUNERATION</div>
              <div className="text-2xl font-bold text-red mt-1">100% Retained</div>
              <div className="text-[11px] text-[#5B5F66]">Full delivery fee payout</div>
            </div>
            <div>
              <div className="text-xs text-[#8C9099] uppercase">LOGISTICS ALLIANCE</div>
              <div className="text-2xl font-bold text-tan mt-1">Pakistan Post</div>
              <div className="text-[11px] text-[#5B5F66]">National infrastructure</div>
            </div>
          </div>
        </section>

        {/* Our Motivation Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-start">
            <div className="lg:col-span-5">
              <div className="font-mono text-xs uppercase tracking-widest text-red font-semibold mb-2">
                ORIGIN &amp; MOTIVATION
              </div>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight text-ink leading-tight mb-4">
                WHY WE BUILT SPEEDYMEALS
              </h2>
              <p className="font-sans text-base text-ink-soft leading-relaxed mb-4">
                Over the past decade, multinational food delivery aggregators turned a promise of convenience into a regime of economic extraction. Restaurants across South Asia and the Middle East saw commissions rise to ruinous rates between 30% and 35%, forcing culinary entrepreneurs to dilute portion sizes, raise retail prices, or shut their doors completely.
              </p>
              <p className="font-sans text-base text-ink-soft leading-relaxed">
                Simultaneously, delivery couriers were treated as disposable gig cogs—bearing the full burden of fuel spikes, wear-and-tear, and risk while platforms took arbitrary slices off their hard-earned mileage pay. We founded SpeedyMeals to dismantle this model from first principles.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 sm:p-8 bg-paper border border-line shadow-xs">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-red/10 text-red flex items-center justify-center font-bold">
                    01
                  </div>
                  <h3 className="font-display text-xl uppercase tracking-tight text-ink">
                    The Fair-Split Promise
                  </h3>
                </div>
                <p className="text-sm text-ink-soft font-sans leading-relaxed">
                  We replaced variable commission scales and bidding wars with a permanent 10% flat merchant contract. Restaurants never have to pay to stay visible; our search and dispatch algorithm ranks strictly on distance, operational velocity, and customer ratings.
                </p>
              </div>

              <div className="p-6 sm:p-8 bg-paper border border-line shadow-xs">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue/10 text-blue flex items-center justify-center font-bold">
                    02
                  </div>
                  <h3 className="font-display text-xl uppercase tracking-tight text-ink">
                    100% Courier Dignity
                  </h3>
                </div>
                <p className="text-sm text-ink-soft font-sans leading-relaxed">
                  Every single rupee or riyal charged for delivery belongs entirely to the rider. SpeedyMeals takes zero percent from courier delivery fees, provides instant wallet withdrawal, and requires zero predatory kit purchases or upfront bond money.
                </p>
              </div>

              <div className="p-6 sm:p-8 bg-paper border border-line shadow-xs">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-tan/20 text-tan flex items-center justify-center font-bold">
                    03
                  </div>
                  <h3 className="font-display text-xl uppercase tracking-tight text-ink">
                    True Zero-Markup Consumer Menus
                  </h3>
                </div>
                <p className="text-sm text-ink-soft font-sans leading-relaxed">
                  Consumers ordering through SpeedyMeals pay the exact same menu price found inside the physical restaurant. By abolishing inflated shadow pricing, we restore genuine trust between diners and neighborhood kitchens.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Strategic Logistics Alliance: Pakistan Post */}
        <section className="bg-[#15171A] text-white py-16 sm:py-20 mb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-4 flex flex-col items-start">
                <div className="p-4 bg-[#1E2228] border border-[#2D3139] mb-4">
                  <Image
                    src="/assets/pakistan-post.png"
                    alt="Pakistan Post Emblem"
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xs shadow-md"
                  />
                </div>
                <div className="font-mono text-xs uppercase tracking-widest text-tan font-bold mb-1">
                  STRATEGIC ALLIANCE
                </div>
                <h3 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-white mb-2">
                  PARTNERED WITH PAKISTAN POST
                </h3>
                <p className="text-xs font-mono text-[#8C9099]">
                  Official National Postal &amp; Regional Logistics Integration
                </p>
              </div>

              <div className="lg:col-span-8 space-y-4 font-sans text-sm text-[#A0A4AB] leading-relaxed">
                <p>
                  Rather than duplicating costly logistical redundancies, SpeedyMeals integrates with national physical infrastructure. Through our strategic alliance with <strong>Pakistan Post</strong>, we leverage established regional distribution hubs, postal sort facilities, and municipal connectivity across all major urban centers.
                </p>
                <p>
                  This collaboration dramatically reduces transport overhead, bolsters last-mile delivery resilience across high-density commercial zones, and ensures that the economic surplus generated by modern e-commerce directly supports sovereign national institutions.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-6 font-mono text-xs text-white">
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} weight="bold" className="text-[#10B981]" />
                    <span>Cross-District Hub Routing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} weight="bold" className="text-[#10B981]" />
                    <span>Real-Time Telemetry Relay</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} weight="bold" className="text-[#10B981]" />
                    <span>Nationwide Parcel Scalability</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision & Expansion Roadmap */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="max-w-3xl mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-blue font-semibold mb-2">
              VISION &amp; EXPANSION ROADMAP
            </div>
            <h2 className="font-display text-3xl sm:text-5xl uppercase tracking-tight text-ink leading-tight mb-4">
              OUR REGIONAL BLUEPRINT
            </h2>
            <p className="font-sans text-base text-ink-soft leading-relaxed">
              We are systematically executing our multi-phase rollout across South Asia and the GCC, targeting high-volume metropolitan regions with localized dispatch engineering and dedicated merchant onboarding support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pakistan Zone */}
            <div className="p-6 sm:p-8 bg-paper border-t-4 border-t-red border-x border-b border-line shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🇵🇰</span>
                  <span className="font-display text-xl uppercase tracking-tight text-ink">
                    Pakistan Operational Grid
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-bold uppercase">
                  ACTIVE &amp; EXPANDING
                </span>
              </div>
              <p className="text-sm text-ink-soft font-sans leading-relaxed mb-6">
                Active operations deployed across primary commercial arteries with rapid expansion underway across secondary manufacturing and culinary epicenters.
              </p>
              <div className="font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink font-semibold">Tier-1 Metros (Live):</span>
                  <span className="text-ink-soft">Karachi, Lahore, Islamabad, Rawalpindi</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink font-semibold">Northern Corridor:</span>
                  <span className="text-ink-soft">Peshawar, Jhelum, Abbottabad</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink font-semibold">Industrial Belt:</span>
                  <span className="text-ink-soft">Faisalabad, Gujranwala, Sialkot, Kamoki</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink font-semibold">Southern Region:</span>
                  <span className="text-ink-soft">Multan, Hyderabad, Khanewal, Kasur</span>
                </div>
              </div>
            </div>

            {/* Saudi Arabia Zone */}
            <div className="p-6 sm:p-8 bg-paper border-t-4 border-t-tan border-x border-b border-line shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🇸🇦</span>
                  <span className="font-display text-xl uppercase tracking-tight text-ink">
                    Kingdom of Saudi Arabia (KSA)
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 font-bold uppercase">
                  DEPLOYMENT ONBOARDING
                </span>
              </div>
              <p className="text-sm text-ink-soft font-sans leading-relaxed mb-6">
                Tailored for Vision 2030 smart mobility standards, supporting high-density commercial kitchens, cloud restaurant operators, and zero-emissions delivery fleets.
              </p>
              <div className="font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink font-semibold">Capital District:</span>
                  <span className="text-ink-soft">Riyadh (Central Logistics Node)</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink font-semibold">Western Region:</span>
                  <span className="text-ink-soft">Jeddah, Taif</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink font-semibold">Holy Cities Zone:</span>
                  <span className="text-ink-soft">Makkah Al-Mukarramah, Al-Madinah</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink font-semibold">Eastern Province:</span>
                  <span className="text-ink-soft">Dammam, Khobar, Dhahran</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Legal, Governance & Rights */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="p-8 sm:p-10 bg-[#FAF9F5] border border-line">
            <div className="flex items-center space-x-3 mb-4">
              <Scales size={24} weight="bold" className="text-ink" />
              <h3 className="font-display text-2xl uppercase tracking-tight text-ink">
                GOVERNANCE, INTELLECTUAL PROPERTY &amp; RIGHTS
              </h3>
            </div>
            <div className="space-y-3 font-mono text-xs text-ink-soft leading-relaxed">
              <p>
                <strong>SpeedyMeals Network</strong> operates under strict compliance with regional commercial registries, food safety standards, electronic transaction acts, and statutory transport regulations in all operating jurisdictions.
              </p>
              <p>
                All proprietary software, routing telemetry algorithms, dispatch architectures, digital brand marks, and operational interfaces are protected under international copyright, trademark, and intellectual property conventions.
              </p>
              <p className="pt-2 text-ink font-semibold">
                &copy; 2026 SpeedyMeals Network. All rights reserved across South Asia, the GCC, and associated logistics territories.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 bg-ink text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="font-mono text-xs text-red uppercase tracking-widest font-bold mb-1">
                JOIN THE REVOLUTION
              </div>
              <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-white">
                READY TO EXPERIENCE REAL LOGISTICS FREEDOM?
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/#partner"
                className="px-6 py-3.5 bg-red text-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-white hover:text-red transition-colors duration-150 flex items-center space-x-2"
              >
                <span>RIDE WITH US</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
              <Link
                href="/#partner"
                className="px-6 py-3.5 bg-transparent border border-white text-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-white hover:text-ink transition-colors duration-150 flex items-center space-x-2"
              >
                <span>PARTNER RESTAURANT</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
