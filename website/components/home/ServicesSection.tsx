'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  Tag,
  ShieldCheck,
  CurrencyCircleDollar,
  Sparkle,
  CookingPot,
  Bicycle,
  Users,
} from '@phosphor-icons/react';
import { PersonaType } from '@/types/home';

interface ServicesSectionProps {
  onSelectPersona?: (persona: PersonaType) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectPersona }) => {
  const handleAction = (persona: PersonaType) => {
    if (onSelectPersona) {
      onSelectPersona(persona);
    } else {
      const el = document.getElementById('partner');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      id="services"
      className="relative z-10 py-20 sm:py-28 bg-[#FFFFFF] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Clean, Human, DoorDash Style */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <h2 className="font-display text-3xl sm:text-5xl tracking-tight text-ink uppercase leading-tight mb-4">
            Everything you crave, <span className="text-red">delivered.</span>
          </h2>
          <p className="text-base sm:text-lg text-ink-soft leading-relaxed font-sans">
            Connecting hungry diners, passionate kitchens, and dedicated riders on one fair, reliable platform.
          </p>
        </div>

        {/* 3 Unboxed Editorial Stories */}
        <div className="space-y-20 sm:space-y-28 lg:space-y-36">

          {/* STORY 1: CUSTOMERS (Text Left, Image Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-red mb-2">
                For Food Lovers
              </span>
              <h3 className="font-heading font-extrabold text-2xl sm:text-4xl text-ink tracking-tight mb-4 leading-tight">
                Your favorite local spots at regular menu prices.
              </h3>
              <p className="text-base text-ink-soft mb-6 leading-relaxed font-sans">
                No hidden packaging markups or surprise fees at checkout. Discover biryani, burgers, fresh pizza, and everyday home-style cooking from kitchens near you.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => handleAction('customer')}
                  className="inline-flex items-center space-x-2 px-8 py-3.5 bg-red hover:bg-[#C92F24] text-white font-sans text-sm font-bold rounded-full shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <span>Find food near you</span>
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Imagery */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden group">
                <Image
                  src="/assets/customer_food_spread.jpg"
                  alt="Delicious meal spread delivered fresh"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  priority
                />
              </div>
            </div>
          </div>

          {/* STORY 2: RESTAURANTS (Image Left, Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left Column: Visual Imagery */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden group">
                <Image
                  src="/assets/restaurant_kitchen_prep.jpg"
                  alt="Restaurant culinary team preparing fresh orders"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="eager"
                />
              </div>
            </div>

            {/* Right Column: Value Proposition */}
            <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col justify-center">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-blue mb-2">
                For Merchants &amp; Kitchens
              </span>
              <h3 className="font-heading font-extrabold text-2xl sm:text-4xl text-ink tracking-tight mb-4 leading-tight">
                Reach more customers and keep your hard-earned margins.
              </h3>
              <p className="text-base text-ink-soft mb-6 leading-relaxed font-sans">
                Stop giving away high percentages on every order. List your restaurant, cloud kitchen, or neighborhood grocery store with live order alerts and weekly automated payouts.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => handleAction('restaurant')}
                  className="inline-flex items-center space-x-2 px-8 py-3.5 bg-blue hover:bg-[#184C86] text-white font-sans text-sm font-bold rounded-full shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <span>Sign up your store</span>
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            </div>
          </div>

          {/* STORY 3: RIDERS (Text Left, Image Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-red mb-2">
                For Delivery Riders
              </span>
              <h3 className="font-heading font-extrabold text-2xl sm:text-4xl text-ink tracking-tight mb-4 leading-tight">
                Earn on your own schedule with reliable payouts.
              </h3>
              <p className="text-base text-ink-soft mb-6 leading-relaxed font-sans">
                Deliver around your own life with simple onboarding, direct delivery pay, and weekly payouts sent straight to your mobile wallet or bank account.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => handleAction('rider')}
                  className="inline-flex items-center space-x-2 px-8 py-3.5 bg-red hover:bg-[#C92F24] text-white font-sans text-sm font-bold rounded-full shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <span>Deliver with us</span>
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Imagery */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden group">
                <Image
                  src="/assets/rider_delivery.jpg"
                  alt="SpeedyMeals courier delivering an order"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ─────────── ADDITIONAL SERVICES ─────────── */}
        <div className="mt-24 sm:mt-32 pt-16 sm:pt-20 border-t border-line">
          <div className="mb-10 sm:mb-12 flex flex-col items-center lg:items-start text-center lg:text-left">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink-soft">
              The SpeedyMeals Ecosystem
            </span>
            <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-ink tracking-tight mt-2">
              More ways to move things fast.
            </h3>
            <p className="text-sm sm:text-base text-ink-soft mt-2 leading-relaxed font-sans max-w-2xl text-center lg:text-left">
              Beyond food - we&apos;re building a complete local delivery network across Pakistan and the Middle East.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8">
            {/* Speedy Drive */}
            <div className="group flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5 fill-red" aria-hidden>
                  <path d="M240,104H229l-11.63-28.09A16,16,0,0,0,202.7,66H53.3A16,16,0,0,0,38.62,75.91L27,104H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H56a16,16,0,0,0,16-16V184h112v16a16,16,0,0,0,16,16h16a16,16,0,0,0,16-16V120h8a8,8,0,0,0,0-16ZM53.3,82H202.7l9.24,22H44.07ZM72,200H40V184H72Zm112,0V184h32v16Zm32-32H40V120H216Z" />
                </svg>
              </div>
              <h4 className="font-heading font-extrabold text-lg text-ink tracking-tight mb-1">
                Speedy Drive
              </h4>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-3 max-w-sm mx-auto lg:mx-0">
                Ride-hailing for passengers - safe, transparent fares for everyday city travel.
              </p>
              <span className="mt-auto inline-flex items-center font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-[#FEF2F0] text-red border border-red/20 w-fit mx-auto lg:mx-0">
                Coming Soon
              </span>
            </div>

            {/* Speedy Courier */}
            <div className="group flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5 fill-blue" aria-hidden>
                  <path d="M247.42,117l-14-35A15.93,15.93,0,0,0,218.58,72H184V64a8,8,0,0,0-8-8H24A16,16,0,0,0,8,72V184a16,16,0,0,0,16,16H41a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A8.09,8.09,0,0,0,247.42,117ZM72,208a16,16,0,1,1,16-16A16,16,0,0,1,72,208Zm112,0a16,16,0,1,1,16-16A16,16,0,0,1,184,208Zm0-72V88h34.58l9.6,24H184a8,8,0,0,0,0,16h56v48H228.48A32.07,32.07,0,0,0,200,160H184Z" />
                </svg>
              </div>
              <h4 className="font-heading font-extrabold text-lg text-ink tracking-tight mb-1">
                Speedy Courier
              </h4>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-3 max-w-sm mx-auto lg:mx-0">
                Same-day parcel delivery for individuals and small businesses within the city.
              </p>
              <span className="mt-auto inline-flex items-center font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-[#FEF2F0] text-red border border-red/20 w-fit mx-auto lg:mx-0">
                Coming Soon
              </span>
            </div>

            {/* Speedy Mall */}
            <div className="group flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="w-10 h-10 rounded-full bg-[#C7A874]/15 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5" style={{ fill: '#9A7A4A' }} aria-hidden>
                  <path d="M223.94,128.29A16,16,0,0,0,224,127.28V48H232a8,8,0,0,0,0-16H24a8,8,0,0,0,0,16h8v79.28A16,16,0,0,0,16,144v16a16,16,0,0,0,16,16h8v24a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V176h8a16,16,0,0,0,16-16V144A16,16,0,0,0,223.94,128.29ZM200,200H56V176H200Zm16-40H40V144H216ZM48,48H208v79H48Z" />
                </svg>
              </div>
              <h4 className="font-heading font-extrabold text-lg text-ink tracking-tight mb-1">
                Speedy Mall
              </h4>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-3 max-w-sm mx-auto lg:mx-0">
                All services under one roof - a physical lifestyle mall with merchant shops, a food court, and Speedy express counters.
              </p>
              <span className="mt-auto inline-flex items-center font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-[#FEF2F0] text-red border border-red/20 w-fit mx-auto lg:mx-0">
                Coming Soon
              </span>
            </div>

            {/* Technical Services */}
            <div className="group flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5 fill-[#10B981]" aria-hidden>
                  <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
                </svg>
              </div>
              <h4 className="font-heading font-extrabold text-lg text-ink tracking-tight mb-1">
                Technical Services
              </h4>
              <p className="text-sm text-ink-soft leading-relaxed font-sans mb-3 max-w-sm mx-auto lg:mx-0">
                On-demand technicians for home repairs, appliance fixes, and everyday maintenance needs.
              </p>
              <span className="mt-auto inline-flex items-center font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-[#FEF2F0] text-red border border-red/20 w-fit mx-auto lg:mx-0">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
