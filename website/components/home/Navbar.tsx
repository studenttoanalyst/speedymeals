'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List, X, ArrowUpRight } from '@phosphor-icons/react';

interface NavbarProps {
  onSelectPersona?: (persona: 'rider' | 'restaurant') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSelectPersona }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'about' | 'services' | 'partner'>('about');

  useEffect(() => {
    // Snap-not-fade behavior on scroll
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 40);

      // Section spy
      const servicesEl = document.getElementById('services');
      const partnerEl = document.getElementById('partner');

      if (partnerEl && partnerEl.getBoundingClientRect().top <= 160) {
        setActiveSection('partner');
      } else if (servicesEl && servicesEl.getBoundingClientRect().top <= 160) {
        setActiveSection('services');
      } else {
        setActiveSection('about');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId: 'about' | 'services' | 'partner', persona?: 'rider' | 'restaurant') => {
    setMobileMenuOpen(false);
    if (persona && onSelectPersona) {
      onSelectPersona(persona);
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      id="main-navigation"
      className="fixed top-4 left-4 right-4 z-50 lg:top-6 lg:left-8 lg:right-8"
    >
      {/* Floating pill bar — scoped exception to the site-wide zero-radius rule (see .nav-pill in globals.css) */}
      <div
        className={`nav-pill mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 h-16 lg:h-[72px] transition-all duration-200 ${isScrolled
          ? 'bg-white/85 backdrop-blur-md border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
          : 'bg-white/70 backdrop-blur-sm border border-white/40'
          }`}
      >
        {/* Brand Wordmark with Clean Enlarged Logo without circular frame */}
        <a
          href="#about"
          id="brand-logo-link"
          className="flex items-center space-x-3 group shrink-0 py-1"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('about');
          }}
        >
          <img
            src="/favicon.jpeg"
            alt="SpeedyMeals Logo"
            className="h-10 sm:h-12 w-auto object-contain shrink-0 transition-transform duration-150 group-hover:scale-105"
          />
          <span className="font-display text-xl sm:text-2xl tracking-tight text-red uppercase flex items-center">
            SPEEDYMEALS
            <span
              className="inline-block w-1.5 h-1.5 ml-1 transition-colors duration-300"
              style={{ backgroundColor: 'var(--dynamic-accent, #15171A)' }}
            />
          </span>
        </a>

        {/* Desktop 1:1 Anchor Navigation with Glassy Tubelight Lamp Interaction */}
        <nav className="hidden md:flex items-center space-x-1 bg-white/40 backdrop-blur-md border border-white/60 p-1 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.03)]">
          {[
            { id: 'about', label: 'About Us', code: '01' },
            { id: 'services', label: 'Services', code: '02' },
            { id: 'partner', label: 'Partner', code: '03' },
          ].map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                type="button"
                onClick={() => handleNavClick(item.id as 'about' | 'services' | 'partner')}
                className={`relative px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors duration-150 rounded-full cursor-pointer ${
                  isActive
                    ? 'text-ink font-bold'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span>[ {item.code} ] {item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-tubelight-lamp"
                    className="absolute inset-0 w-full bg-red/10 rounded-full -z-10 shadow-xs backdrop-blur-xs"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-red rounded-t-full">
                      <div className="absolute w-12 h-5 bg-red/25 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-5 bg-red/35 rounded-full blur-sm -top-1" />
                      <div className="absolute w-4 h-3 bg-red/45 rounded-full blur-xs top-0 left-2" />
                    </div>
                  </motion.div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action CTAs — both kept, pill-shaped */}
        <div className="hidden lg:flex items-center space-x-3 shrink-0">
          <button
            id="nav-cta-ride"
            type="button"
            onClick={() => handleNavClick('partner', 'rider')}
            className="nav-pill px-4 py-2 text-xs font-mono font-semibold tracking-wider uppercase border border-red text-red hover:bg-red hover:text-white transition-colors duration-150 flex items-center space-x-1.5"
          >
            <span>RIDER</span>
            <ArrowUpRight size={13} weight="bold" />
          </button>

          <button
            id="nav-cta-restaurant"
            type="button"
            onClick={() => handleNavClick('partner', 'restaurant')}
            className="nav-pill px-4 py-2 text-xs font-mono font-semibold tracking-wider uppercase bg-ink text-white border border-ink hover:bg-blue hover:border-blue transition-colors duration-150 flex items-center space-x-1.5"
          >
            <span>PARTNER</span>
            <ArrowUpRight size={13} weight="bold" />
          </button>
        </div>

        {/* Mobile menu toggle button */}
        <div className="md:hidden flex items-center">
          <button
            id="nav-mobile-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="nav-pill p-2 border border-line bg-white text-ink hover:bg-paper-off"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Panel — floating pill card, detached below the bar (also scoped radius exception) */}
      {mobileMenuOpen && (
        <div
          id="mobile-drawer-panel"
          className="nav-pill md:hidden mt-3 border border-black/5 bg-white/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-6 py-6 space-y-4"
        >
          <div className="flex flex-col space-y-3 font-mono text-xs uppercase tracking-widest">
            <button
              id="mobile-link-about"
              type="button"
              onClick={() => handleNavClick('about')}
              className="text-left py-2 border-b border-line text-ink flex justify-between items-center"
            >
              <span>[ 01 ] About Us</span>
              <span className="text-ink-soft">→</span>
            </button>
            <button
              id="mobile-link-services"
              type="button"
              onClick={() => handleNavClick('services')}
              className="text-left py-2 border-b border-line text-ink flex justify-between items-center"
            >
              <span>[ 02 ] Services</span>
              <span className="text-ink-soft">→</span>
            </button>
            <button
              id="mobile-link-partner"
              type="button"
              onClick={() => handleNavClick('partner')}
              className="text-left py-2 border-b border-line text-ink flex justify-between items-center"
            >
              <span>[ 03 ] Partner</span>
              <span className="text-ink-soft">→</span>
            </button>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              id="mobile-cta-rider"
              type="button"
              onClick={() => handleNavClick('partner', 'rider')}
              className="nav-pill w-full py-3 text-center text-xs font-mono font-bold tracking-wider uppercase border border-red text-red hover:bg-red hover:text-white"
            >
              Ride With Us
            </button>
            <button
              id="mobile-cta-restaurant"
              type="button"
              onClick={() => handleNavClick('partner', 'restaurant')}
              className="nav-pill w-full py-3 text-center text-xs font-mono font-bold tracking-wider uppercase bg-ink text-white border border-ink hover:bg-blue hover:border-blue"
            >
              Partner
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
