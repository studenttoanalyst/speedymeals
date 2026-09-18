'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  TwitterLogo,
  LinkedinLogo,
  InstagramLogo,
  ArrowUpRight,
} from '@phosphor-icons/react';

interface FooterProps {
  onSelectPersona?: (persona: 'rider' | 'restaurant') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectPersona }) => {
  const handleScrollTo = (sectionId: string, persona?: 'rider' | 'restaurant') => {
    if (persona && onSelectPersona) {
      onSelectPersona(persona);
    }
    if (sectionId === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
    hidden: { opacity: 0, y: 12 },
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
    <footer
      id="main-footer"
      className="relative z-20 bg-[#15171A] text-white border-t border-[#2D3139]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-12">
        {/* Responsive Grid: Mobile: SpeedyMeals & Bio above, Company & Get Started side-by-side, Contact below. Desktop: 4 Columns */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 gap-x-8 lg:gap-8 pb-16 border-b border-[#2D3139]"
        >
          {/* Section 1: Speedy Meals Brand & Bio (Full width on mobile/tablet, 4 columns on desktop) */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 space-y-4">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <img
                src="/favicon.jpeg"
                alt="SpeedyMeals Logo"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain shrink-0"
              />
              <span className="font-display text-xl sm:text-2xl tracking-tight text-[#E23A2E] uppercase whitespace-nowrap shrink-0">
                SPEEDY MEALS
              </span>
            </div>

            <div className="font-mono text-xs text-blue font-semibold tracking-wide flex items-center space-x-2">
              <span className="inline-block w-1.5 h-1.5 bg-blue" />
              <span>&ldquo;Fast &amp; safe to you.&rdquo;</span>
            </div>

            <p className="text-xs text-[#A0A4AB] leading-relaxed max-w-sm font-sans">
              A high-velocity, fair-split delivery and logistics platform engineered specifically
              for South Asia and the Middle East.
            </p>
          </motion.div>

          {/* Section 2: Company & Get Started (Side-by-side 2-col on mobile, 5 cols on desktop) */}
          <div className="col-span-1 lg:col-span-5 grid grid-cols-2 gap-6 sm:gap-8">
            {/* Col 2A: Company */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="font-mono text-xs uppercase tracking-widest text-[#8C9099] font-bold">
                COMPANY
              </div>
              <ul className="space-y-2.5 text-xs font-mono">
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('overview')}
                    className="text-[#A0A4AB] hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Overview
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('services')}
                    className="text-[#A0A4AB] hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Services
                  </button>
                </li>
                <li>
                  <Link
                    id="footer-link-about"
                    href="/about"
                    className="text-[#A0A4AB] hover:text-white transition-colors block"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    id="footer-link-terms"
                    href="/terms"
                    className="text-[#A0A4AB] hover:text-white transition-colors block"
                  >
                    Terms of Use
                  </Link>
                </li>
                <li>
                  <span className="text-[#5B5F66] cursor-not-allowed block">
                    Careers <span className="text-[10px] text-tan font-bold ml-1">[HIRING]</span>
                  </span>
                </li>
              </ul>
            </motion.div>

            {/* Col 2B: Get Started */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="font-mono text-xs uppercase tracking-widest text-[#8C9099] font-bold">
                GET STARTED
              </div>
              <ul className="space-y-2.5 text-xs font-mono">
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('partner', 'rider')}
                    className="text-[#A0A4AB] hover:text-red transition-colors flex items-center space-x-1.5 cursor-pointer text-left"
                  >
                    <span>Ride With Us</span>
                    <ArrowUpRight size={12} weight="bold" className="shrink-0" />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('partner', 'restaurant')}
                    className="text-[#A0A4AB] hover:text-blue transition-colors flex items-center space-x-1.5 cursor-pointer text-left"
                  >
                    <span>Partner Your Restaurant</span>
                    <ArrowUpRight size={12} weight="bold" className="shrink-0" />
                  </button>
                </li>
                <li>
                  <div className="flex flex-wrap items-center gap-1.5 text-[#A0A4AB]">
                    <span>Customer App</span>
                    <span className="border-l-2 border-l-tan pl-1 text-[10px] text-tan font-mono font-semibold whitespace-nowrap">
                      ⋯ COMING SOON
                    </span>
                  </div>
                </li>
                <li className="pt-2 mt-2 border-t border-[#2D3139]">
                  <Link
                    id="footer-link-restaurant"
                    href="/restaurant"
                    className="text-[#A0A4AB] hover:text-blue transition-colors flex items-center space-x-1.5"
                  >
                    <span>Restaurant Portal</span>
                    <ArrowUpRight size={12} weight="bold" className="shrink-0" />
                  </Link>
                </li>
                <li>
                  <Link
                    id="footer-link-admin"
                    href="/admin"
                    className="text-[#A0A4AB] hover:text-red transition-colors flex items-center space-x-1.5"
                  >
                    <span>Admin Console</span>
                    <ArrowUpRight size={12} weight="bold" className="shrink-0" />
                  </Link>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Section 3: Contact (Below on mobile, 3 cols on desktop) */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-3 space-y-4">
            <div className="font-mono text-xs uppercase tracking-widest text-[#8C9099] font-bold">
              CONTACT
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="text-[#A0A4AB]">Serving South Asia &amp; the Middle East</div>
              <div>
                <a
                  href="mailto:info@speedymealservices.com"
                  className="text-white hover:text-red transition-colors underline decoration-1 underline-offset-4"
                >
                  info@speedymealservices.com
                </a>
              </div>
              <a
                href="mailto:support@speedymealservices.com"
                className="text-white hover:text-red transition-colors underline decoration-1 underline-offset-4"
              >
                support@speedymealservices.com
              </a>
            </div>

            {/* Social icons row: Brand colors on hover */}
            <div className="pt-2 flex items-center space-x-2">
              <a
                href="#twitter"
                aria-label="Twitter / X"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-blue hover:border-blue transition-colors duration-150"
              >
                <TwitterLogo size={16} weight="bold" />
              </a>

              <a
                href="#linkedin"
                aria-label="LinkedIn"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-blue hover:border-blue transition-colors duration-150"
              >
                <LinkedinLogo size={16} weight="bold" />
              </a>

              <a
                href="#instagram"
                aria-label="Instagram"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-red hover:border-red transition-colors duration-150"
              >
                <InstagramLogo size={16} weight="bold" />
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* Regional Hubs Live Operational Strip */}
        <div className="py-6 border-b border-[#2D3139] flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-[#A0A4AB]">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-[#10B981]" />
            </span>
            <span className="text-[#A0A4AB] font-semibold">DEPLOYMENT ZONES:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#10B981]" />
              <span className="hover:text-white transition-colors">KARACHI (PK)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#10B981]" />
              <span className="hover:text-white transition-colors">LAHORE (PK)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#10B981]" />
              <span className="hover:text-white transition-colors">ISLAMABAD (PK)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#10B981]" />
              <span className="hover:text-white transition-colors">PESHAWAR (PK)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#F59E0B]" />
              <span className="hover:text-white transition-colors">RIYADH (KSA)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#F59E0B]" />
              <span className="hover:text-white transition-colors">MAKKAH & MADINAH (KSA)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#F59E0B]" />
              <span className="hover:text-white transition-colors">JEDDAH (KSA)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#F59E0B]" />
              <span className="hover:text-white transition-colors">TAIF (KSA)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-[#F59E0B]" />
              <span className="hover:text-white transition-colors">DAMMAM (KSA)</span>
            </span>
          </div>
        </div>

        {/* Bottom bar (hairline top-border) */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[#5B5F66]">
          <div>&copy; 2026 SpeedyMeals Network. All rights reserved.</div>
          <div className="flex items-center space-x-4">
            <span className="hover:text-[#A0A4AB] transition-colors cursor-default">
              Privacy Policy
            </span>
            <span>&middot;</span>
            <Link href="/terms" className="hover:underline hover:text-[#A0A4AB] transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
