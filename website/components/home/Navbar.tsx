'use client';

import React, { useState, useEffect } from 'react';
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
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-150 ${isScrolled
        ? 'bg-[#FFFFFF] border-b border-[#E4E2DD] shadow-sm'
        : 'bg-transparent border-b border-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Wordmark */}
        <a
          href="#about"
          id="brand-logo-link"
          className="flex items-center space-x-3 group"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('about');
          }}
        >
          <div className="w-8 h-8 bg-white flex items-center justify-center border border-[#15171A] group-hover:border-[#E23A2E] transition-colors duration-150 overflow-hidden shadow-xs">
            <img
              src="/favicon.jpeg"
              alt="SpeedyMeals Logo"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <span className="font-display text-xl sm:text-2xl tracking-tight text-[#E23A2E] uppercase flex items-center">
            SPEEDYMEALS
            <span
              className="inline-block w-1.5 h-1.5 ml-1 transition-colors duration-300"
              style={{ backgroundColor: 'var(--dynamic-accent, #15171A)' }}
            />
          </span>
        </a>

        {/* Desktop 1:1 Anchor Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <button
            id="nav-link-about"
            type="button"
            onClick={() => handleNavClick('about')}
            className={`font-mono text-xs uppercase tracking-widest transition-colors duration-150 py-2 border-b ${activeSection === 'about'
              ? 'text-[#15171A] font-bold border-[#15171A]'
              : 'text-[#5B5F66] border-transparent hover:text-[#15171A]'
              }`}
          >
            [ 01 ] About Us
          </button>

          <button
            id="nav-link-services"
            type="button"
            onClick={() => handleNavClick('services')}
            className={`font-mono text-xs uppercase tracking-widest transition-colors duration-150 py-2 border-b ${activeSection === 'services'
              ? 'text-[#15171A] font-bold border-[#15171A]'
              : 'text-[#5B5F66] border-transparent hover:text-[#15171A]'
              }`}
          >
            [ 02 ] Services
          </button>

          <button
            id="nav-link-partner"
            type="button"
            onClick={() => handleNavClick('partner')}
            className={`font-mono text-xs uppercase tracking-widest transition-colors duration-150 py-2 border-b ${activeSection === 'partner'
              ? 'text-[#15171A] font-bold border-[#15171A]'
              : 'text-[#5B5F66] border-transparent hover:text-[#15171A]'
              }`}
          >
            [ 03 ] Partner
          </button>
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden lg:flex items-center space-x-3">
          <button
            id="nav-cta-ride"
            type="button"
            onClick={() => handleNavClick('partner', 'rider')}
            className="px-4 py-2 text-xs font-mono font-semibold tracking-wider uppercase border border-[#E23A2E] text-[#E23A2E] hover:bg-[#E23A2E] hover:text-white transition-colors duration-150 flex items-center space-x-1.5"
          >
            <span>RIDER</span>
            <ArrowUpRight size={13} weight="bold" />
          </button>

          <button
            id="nav-cta-restaurant"
            type="button"
            onClick={() => handleNavClick('partner', 'restaurant')}
            className="px-4 py-2 text-xs font-mono font-semibold tracking-wider uppercase bg-[#15171A] text-white border border-[#15171A] hover:bg-[#1E5FA8] hover:border-[#1E5FA8] transition-colors duration-150 flex items-center space-x-1.5"
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
            className="p-2 border border-[#E4E2DD] bg-[#FFFFFF] text-[#15171A] hover:bg-[#F6F5F3]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Panel (Zero border radius, sharp hairline borders) */}
      {mobileMenuOpen && (
        <div
          id="mobile-drawer-panel"
          className="md:hidden border-b border-[#E4E2DD] bg-[#FFFFFF] px-6 py-6 space-y-4"
        >
          <div className="flex flex-col space-y-3 font-mono text-xs uppercase tracking-widest">
            <button
              id="mobile-link-about"
              type="button"
              onClick={() => handleNavClick('about')}
              className="text-left py-2 border-b border-[#E4E2DD] text-[#15171A] flex justify-between items-center"
            >
              <span>[ 01 ] About Us</span>
              <span className="text-[#5B5F66]">→</span>
            </button>
            <button
              id="mobile-link-services"
              type="button"
              onClick={() => handleNavClick('services')}
              className="text-left py-2 border-b border-[#E4E2DD] text-[#15171A] flex justify-between items-center"
            >
              <span>[ 02 ] Services</span>
              <span className="text-[#5B5F66]">→</span>
            </button>
            <button
              id="mobile-link-partner"
              type="button"
              onClick={() => handleNavClick('partner')}
              className="text-left py-2 border-b border-[#E4E2DD] text-[#15171A] flex justify-between items-center"
            >
              <span>[ 03 ] Partner</span>
              <span className="text-[#5B5F66]">→</span>
            </button>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              id="mobile-cta-rider"
              type="button"
              onClick={() => handleNavClick('partner', 'rider')}
              className="w-full py-3 text-center text-xs font-mono font-bold tracking-wider uppercase border border-[#E23A2E] text-[#E23A2E] hover:bg-[#E23A2E] hover:text-white"
            >
              Ride With Us
            </button>
            <button
              id="mobile-cta-restaurant"
              type="button"
              onClick={() => handleNavClick('partner', 'restaurant')}
              className="w-full py-3 text-center text-xs font-mono font-bold tracking-wider uppercase bg-[#15171A] text-white border border-[#15171A] hover:bg-[#1E5FA8]"
            >
              Partner
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
