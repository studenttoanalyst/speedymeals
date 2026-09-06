'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  TwitterLogo,
  LinkedinLogo,
  InstagramLogo,
  GithubLogo,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        {/* 4-Column Hairline-Divided Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pb-16 border-b border-[#2D3139]"
        >
          {/* Col 1 — Brand */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#E23A2E] flex items-center justify-center text-white font-mono font-bold text-xs tracking-tighter border border-[#E23A2E]">
                SM
              </div>
              <span className="font-['Archivo_Black'] text-2xl tracking-tight text-white uppercase">
                SPEEDYMEALS
              </span>
            </div>

            <div className="font-mono text-xs text-[#C7A874] italic tracking-wide">
              &ldquo;Fast &amp; safe to you.&rdquo;
            </div>

            <p className="text-xs text-[#A0A4AB] leading-relaxed max-w-xs font-sans">
              A high-velocity, fair-split delivery and logistics platform engineered specifically
              for South Asia and the Middle East.
            </p>
          </motion.div>

          {/* Col 2 — Company */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="font-mono text-xs uppercase tracking-widest text-[#5B5F66] font-bold">
              COMPANY
            </div>
            <ul className="space-y-2.5 text-xs font-mono">
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('about')}
                  className="text-[#A0A4AB] hover:text-white transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('services')}
                  className="text-[#A0A4AB] hover:text-white transition-colors"
                >
                  Services
                </button>
              </li>
              <li>
                <span className="text-[#5B5F66] cursor-not-allowed">
                  Careers <span className="text-[10px] text-[#C7A874] ml-1">[HIRING]</span>
                </span>
              </li>
              <li>
                <span className="text-[#5B5F66] cursor-not-allowed">Press Kit</span>
              </li>
            </ul>
          </motion.div>

          {/* Col 3 — Partner */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="font-mono text-xs uppercase tracking-widest text-[#5B5F66] font-bold">
              GET STARTED
            </div>
            <ul className="space-y-2.5 text-xs font-mono">
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('partner', 'rider')}
                  className="text-[#A0A4AB] hover:text-[#E23A2E] transition-colors flex items-center space-x-1"
                >
                  <span>Ride With Us</span>
                  <ArrowUpRight size={11} weight="bold" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('partner', 'restaurant')}
                  className="text-[#A0A4AB] hover:text-[#C7A874] transition-colors flex items-center space-x-1"
                >
                  <span>Partner Your Restaurant</span>
                  <ArrowUpRight size={11} weight="bold" />
                </button>
              </li>
              <li>
                <div className="flex items-center space-x-2 text-[#A0A4AB]">
                  <span>Order</span>
                  {/* Status tag styled per Services convention */}
                  <span className="border-l-2 border-l-[#E4E2DD] pl-1 text-[10px] text-[#5B5F66] font-mono">
                    ⋯ COMING SOON
                  </span>
                </div>
              </li>
            </ul>
          </motion.div>

          {/* Col 4 — Contact / Legal */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="font-mono text-xs uppercase tracking-widest text-[#5B5F66] font-bold">
              CONTACT
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="text-[#A0A4AB]">Serving South Asia &amp; the Middle East</div>
              <div>
                <a
                  href="mailto:partner@speedymeals.com"
                  className="text-white hover:text-[#E23A2E] transition-colors underline decoration-1 underline-offset-4"
                >
                  partner@speedymeals.com
                </a>
              </div>
            </div>

            {/* Social icons row: Phosphor bold icons, square/sharp containers only, hover fills --red */}
            <div className="pt-2 flex items-center space-x-2">
              <a
                href="#twitter"
                aria-label="Twitter / X"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-[#E23A2E] hover:border-[#E23A2E] transition-colors duration-150"
              >
                <TwitterLogo size={16} weight="bold" />
              </a>

              <a
                href="#linkedin"
                aria-label="LinkedIn"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-[#E23A2E] hover:border-[#E23A2E] transition-colors duration-150"
              >
                <LinkedinLogo size={16} weight="bold" />
              </a>

              <a
                href="#instagram"
                aria-label="Instagram"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-[#E23A2E] hover:border-[#E23A2E] transition-colors duration-150"
              >
                <InstagramLogo size={16} weight="bold" />
              </a>

              <a
                href="#github"
                aria-label="GitHub"
                className="w-9 h-9 border border-[#2D3139] bg-[#1E2126] text-white flex items-center justify-center hover:bg-[#E23A2E] hover:border-[#E23A2E] transition-colors duration-150"
              >
                <GithubLogo size={16} weight="bold" />
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom bar (hairline top-border) */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[#5B5F66]">
          <div>&copy; 2026 SpeedyMeals. All rights reserved.</div>
          <div className="flex items-center space-x-4">
            <a href="#privacy" className="hover:underline hover:text-[#A0A4AB] transition-colors">
              Privacy Policy
            </a>
            <span>&middot;</span>
            <a href="#terms" className="hover:underline hover:text-[#A0A4AB] transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
