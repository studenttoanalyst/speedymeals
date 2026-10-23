'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LinkedinLogo,
  InstagramLogo,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { scrollToSection } from '@/lib/scroll';

const REGULATORY_TILES = [
  {
    id: 'reg-pakpost',
    name: 'Pakistan Post',
    src: '/assets/pakistan-post.webp',
    width: 64,
    height: 40,
    imgClass: 'h-8 sm:h-9 md:h-10 w-auto object-contain',
    align: 'center' as const,
  },
  {
    id: 'reg-secp',
    name: 'Securities and Exchange Commission of Pakistan (SECP)',
    src: '/assets/rw/SECP_logo.webp',
    width: 64,
    height: 44,
    imgClass: 'h-9 sm:h-10 md:h-11 w-auto object-contain',
    align: 'right' as const,
  },
  {
    id: 'reg-fbr',
    name: 'Federal Board of Revenue (FBR)',
    src: '/assets/rw/fbr-logo.webp',
    width: 64,
    height: 44,
    imgClass: 'h-9 sm:h-10 md:h-11 w-auto object-contain',
    align: 'right' as const,
  },
];

const WhatsappIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const FacebookIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TiktokIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.35 22a6.33 6.33 0 0 0 6.33-6.33V9.58a8.28 8.28 0 0 0 4.84 1.57v-3.5a4.85 4.85 0 0 1-.93-.96z" />
  </svg>
);

interface FooterProps {
  onSelectPersona?: (persona: 'rider' | 'restaurant') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectPersona }) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleTooltip = (id: string) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    if (activeTooltipId === id) {
      setActiveTooltipId(null);
    } else {
      setActiveTooltipId(id);
      tooltipTimeoutRef.current = setTimeout(() => {
        setActiveTooltipId(null);
      }, 2500);
    }
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-regulatory-tile]')) {
        setActiveTooltipId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

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
    scrollToSection(sectionId, { gap: 16 });
  };

  return (
    <footer
      id="main-footer"
      className="relative z-20 bg-ink-900 text-white border-t border-ink-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-12">
        {/* Responsive Grid: Mobile: SpeedyMeals & Bio above, Company & Get Started side-by-side, Contact below. Desktop: 4 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 gap-x-8 lg:gap-8 pb-16 border-b border-ink-800">
          {/* Section 1: Speedy Meals Brand & Bio (Full width on mobile/tablet, 4 columns on desktop) */}
          <div className="col-span-1 lg:col-span-4 space-y-4">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <Image
                src="/assets/logo-112.webp"
                alt="SpeedyMeals Logo"
                width={40}
                height={40}
                className="h-8 sm:h-9 md:h-10 w-auto object-contain shrink-0"
              />
              <span className="font-display text-xl sm:text-2xl tracking-tight text-red-on-dark uppercase whitespace-nowrap shrink-0">
                SPEEDY MEALS
              </span>
            </div>

            <div className="font-sans text-xs text-blue font-semibold tracking-wide flex items-center space-x-2">
              <span className="inline-block w-1.5 h-1.5 bg-blue" />
              <span>&ldquo;Fast &amp; safe to you.&rdquo;</span>
            </div>

            <p className="text-xs text-ink-400 leading-relaxed max-w-sm font-sans">
              A high-velocity, fair-split delivery and logistics platform engineered specifically
              for South Asia and the Middle East.
            </p>
          </div>

          {/* Section 2: Company & Get Started (Side-by-side 2-col on mobile, 5 cols on desktop) */}
          <div className="col-span-1 lg:col-span-5 grid grid-cols-2 gap-6 sm:gap-8">
            {/* Col 2A: Company */}
            <div className="space-y-4">
              <div className="font-sans text-xs uppercase tracking-wider text-ink-400 font-bold">
                COMPANY
              </div>
              <ul className="space-y-2.5 text-xs font-sans">
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('overview')}
                    className="text-ink-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Overview
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('services')}
                    className="text-ink-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Services
                  </button>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-ink-400 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <span>About Us</span>
                    <ArrowUpRight size={10} weight="bold" className="shrink-0" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-ink-400 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <span>Terms &amp; Conditions</span>
                    <ArrowUpRight size={10} weight="bold" className="shrink-0" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-ink-400 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <span>Privacy Policy</span>
                    <ArrowUpRight size={10} weight="bold" className="shrink-0" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 2B: Get Started */}
            <div className="space-y-4">
              <div className="font-sans text-xs uppercase tracking-wider text-ink-400 font-bold">
                GET STARTED
              </div>
              <ul className="space-y-2.5 text-xs font-sans">
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('partner', 'rider')}
                    className="text-ink-400 hover:text-red transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 bg-red inline-block" />
                    <span>Deliver with SpeedyMeals</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleScrollTo('partner', 'restaurant')}
                    className="text-ink-400 hover:text-blue transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 bg-blue inline-block" />
                    <span>List your restaurant</span>
                  </button>
                </li>
                <li>
                  <div className="text-ink-600 flex items-center space-x-1.5 cursor-not-allowed">
                    <span className="w-1.5 h-1.5 bg-ink-600 inline-block" />
                    <span>Customer App</span>
                    <span className="text-2xs text-amber-500 font-bold ml-1 font-sans tracking-wide">
                      ⋯ COMING SOON
                    </span>
                  </div>
                </li>
                <li className="pt-2 mt-2 border-t border-ink-800">
                  <Link
                    id="footer-link-restaurant"
                    href="/restaurant"
                    className="text-ink-400 hover:text-blue transition-colors flex items-center space-x-1.5"
                  >
                    <span>Merchant Portal</span>
                    <ArrowUpRight size={12} weight="bold" className="shrink-0" />
                  </Link>
                </li>
                <li>
                  <Link
                    id="footer-link-admin"
                    href="/admin"
                    className="text-ink-400 hover:text-red transition-colors flex items-center space-x-1.5"
                  >
                    <span>Admin Console</span>
                    <ArrowUpRight size={12} weight="bold" className="shrink-0" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3: Contact (Below on mobile, 3 cols on desktop) */}
          <div className="col-span-1 lg:col-span-3 space-y-4">
            <div className="font-sans text-xs uppercase tracking-wider text-ink-400 font-bold">
              CONTACT
            </div>
            <div className="space-y-2 text-xs font-sans">
              <div className="text-ink-400">Serving South Asia &amp; the Middle East</div>
              <div>
                <a
                  href="https://wa.me/923161177202"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-social-whatsapp transition-colors inline-flex items-center space-x-1.5"
                >
                  <WhatsappIcon size={13} className="text-social-whatsapp shrink-0" />
                  <span>Help line: +92 316 11 77 202</span>
                </a>
              </div>
              <div>
                <a
                  href="mailto:info@speedymealservices.com"
                  className="text-white hover:text-red transition-colors underline decoration-1 underline-offset-4"
                >
                  info@speedymealservices.com
                </a>
              </div>
              <div>
                <a
                  href="mailto:support@speedymealservices.com"
                  className="text-white hover:text-red transition-colors underline decoration-1 underline-offset-4"
                >
                  support@speedymealservices.com
                </a>
              </div>
            </div>

            {/* Social icons row: Brand colors on hover */}
            <div className="pt-2 flex items-center space-x-2">
              <a
                href="https://wa.me/923161177202"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="Chat on WhatsApp"
                className="w-9 h-9 border border-ink-800 bg-ink-850 text-white flex items-center justify-center hover:bg-social-whatsapp hover:border-social-whatsapp transition-colors duration-150"
              >
                <WhatsappIcon size={16} />
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=61594512695027"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Follow us on Facebook"
                className="w-9 h-9 border border-ink-800 bg-ink-850 text-white flex items-center justify-center hover:bg-social-facebook hover:border-social-facebook transition-colors duration-150"
              >
                <FacebookIcon size={16} />
              </a>

              <a
                href="https://www.instagram.com/speedymealservices?stkn=MWJmczhnbm41eWgzcQ=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Follow us on Instagram"
                className="w-9 h-9 border border-ink-800 bg-ink-850 text-white flex items-center justify-center hover:bg-social-instagram hover:border-social-instagram transition-colors duration-150"
              >
                <InstagramLogo size={16} weight="bold" />
              </a>

              <a
                href="https://www.linkedin.com/in/speedy-meals-181906438/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="Connect on LinkedIn"
                className="w-9 h-9 border border-ink-800 bg-ink-850 text-white flex items-center justify-center hover:bg-social-linkedin hover:border-social-linkedin transition-colors duration-150"
              >
                <LinkedinLogo size={16} weight="bold" />
              </a>

              <a
                href="https://www.tiktok.com/@speedy.meals4"
                aria-label="TikTok"
                title="Follow us on TikTok"
                className="w-9 h-9 border border-ink-800 bg-ink-850 text-white flex items-center justify-center hover:bg-black hover:border-social-tiktok hover:text-social-tiktok-cyan transition-colors duration-150"
              >
                <TiktokIcon size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Regulatory Registration Section: Sleek black hollowed boxes */}
        <div className="py-6 border-b border-ink-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs text-ink-400">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-green-500" />
            </span>
            <span className="text-white font-bold uppercase tracking-widest text-2xs sm:text-xs">
              REGISTERED WITH:
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            {REGULATORY_TILES.map((tile) => {
              const isOpen = activeTooltipId === tile.id;
              const isRightAligned = tile.align === 'right';
              return (
                <div key={tile.id} className="relative group" data-regulatory-tile>
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={tile.name}
                    aria-describedby={tile.id}
                    onClick={() => toggleTooltip(tile.id)}
                    onMouseEnter={() => {
                      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                      setActiveTooltipId(tile.id);
                    }}
                    onMouseLeave={() => setActiveTooltipId(null)}
                    onFocus={() => {
                      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                      setActiveTooltipId(tile.id);
                    }}
                    onBlur={() => setActiveTooltipId(null)}
                    className="flex items-center justify-center bg-ink-850 px-3.5 sm:px-4 py-2 border border-ink-800 hover:border-ink-600 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-hidden transition-colors h-12 sm:h-14 min-w-[76px] shadow-1 cursor-pointer rounded-xs"
                  >
                    <Image
                      src={tile.src}
                      alt={tile.name}
                      width={tile.width}
                      height={tile.height}
                      className={tile.imgClass}
                    />
                  </button>

                  {/* Accessible Clamped Tooltip */}
                  <div
                    id={tile.id}
                    role="tooltip"
                    className={`absolute bottom-full mb-2.5 z-30 pointer-events-none transition-all duration-150 ${
                      isRightAligned
                        ? 'right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto'
                        : 'left-1/2 -translate-x-1/2'
                    } ${
                      isOpen
                        ? 'opacity-100 translate-y-0 visible'
                        : 'opacity-0 translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:visible'
                    }`}
                  >
                    <div className="relative bg-ink-950 text-ink-100 text-2xs font-medium px-3 py-1.5 rounded-md border border-ink-700 shadow-3 whitespace-normal w-max max-w-[220px] sm:max-w-[280px] text-center leading-snug">
                      {tile.name}
                      {/* Arrow */}
                      <span
                        className={`absolute top-full -mt-[1px] border-4 border-transparent border-t-ink-700 ${
                          isRightAligned
                            ? 'right-6 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
                            : 'left-1/2 -translate-x-1/2'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar (hairline top-border) */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs text-ink-300">
          <div>&copy; 2026 DiscoverTheTech. All rights reserved.</div>
          <div className="flex items-center space-x-4">
            <Link href="/privacy" className="hover:underline text-ink-300 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:underline text-ink-300 hover:text-white transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
