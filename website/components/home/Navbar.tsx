'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  X,
  ArrowUpRight,
  CaretDown,
  ShieldCheck,
  Storefront,
  SignOut,
  Key,
  ArrowRight,
} from '@phosphor-icons/react';

import { PersonaType } from '@/types/home';
import { getStoredRole, getStoredUser, logout } from '@/lib/auth';
import type { UserRole, AuthSessionUser } from '@/types/auth';

interface NavbarProps {
  onSelectPersona?: (persona: PersonaType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSelectPersona }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'services' | 'partner'>('overview');
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null);
  const portalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect active login session on mount
    setSessionRole(getStoredRole());
    setSessionUser(getStoredUser());

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (portalsRef.current && !portalsRef.current.contains(event.target as Node)) {
        setPortalsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Snap-not-fade behavior on scroll, throttled with requestAnimationFrame
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollPos = window.scrollY;
        setIsScrolled(scrollPos > 40);

        // Section spy is desktop-only since the nav pill buttons are hidden on mobile (hidden md:flex)
        if (window.innerWidth >= 768) {
          const servicesEl = document.getElementById('services');
          const partnerEl = document.getElementById('partner');

          if (partnerEl && partnerEl.getBoundingClientRect().top <= 160) {
            setActiveSection('partner');
          } else if (servicesEl && servicesEl.getBoundingClientRect().top <= 160) {
            setActiveSection('services');
          } else {
            setActiveSection('overview');
          }
        }
      });
    };

    // Clean #overview from address bar immediately if present
    if (typeof window !== 'undefined' && window.location.hash === '#overview') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setSessionRole(null);
    setSessionUser(null);
    setPortalsOpen(false);
  };

  const pathname = usePathname();
  const isAboutPage = pathname === '/about';

  const handleNavClick = (sectionId: 'overview' | 'services' | 'partner' | 'about', persona?: PersonaType) => {
    setMobileMenuOpen(false);
    if (sectionId === 'about') {
      window.location.href = '/about';
      return;
    }
    if (persona && onSelectPersona) {
      onSelectPersona(persona);
    }
    if (sectionId === 'overview') {
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        window.location.href = '/';
      }
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <header
      id="main-navigation"
      className="fixed top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-50 lg:top-5 lg:left-8 lg:right-8 [@media(max-height:760px)]:top-2 [@media(max-height:760px)]:left-4 [@media(max-height:760px)]:right-4"
    >
      <div
        className={`nav-pill mx-auto max-w-7xl flex items-center justify-between px-3 sm:px-6 h-15 sm:h-16 lg:h-[72px] [@media(max-height:760px)]:h-12 transition-all duration-200 border relative ${isScrolled
          ? 'bg-white/95 md:bg-white/85 md:backdrop-blur-md border-black/10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
          : 'bg-white/95 md:bg-white/70 md:backdrop-blur-sm border-black/5'
          }`}
      >
        {/* Brand Wordmark: Centered on mobile, left-aligned on desktop, strictly single-line */}
        <Link
          href="/"
          id="brand-logo-link"
          className="flex items-center space-x-2 sm:space-x-3 group shrink-0 py-1 whitespace-nowrap max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2"
          onClick={(e) => {
            if (pathname === '/') {
              e.preventDefault();
              handleNavClick('overview');
            }
          }}
        >
          <img
            src="/favicon.jpeg"
            alt="SpeedyMeals Logo"
            className="h-8 sm:h-10 lg:h-12 [@media(max-height:760px)]:h-8 w-auto object-contain shrink-0 transition-transform duration-150 group-hover:scale-105 drop-shadow-xs"
          />
          <span className="font-display text-base sm:text-xl lg:text-2xl [@media(max-height:760px)]:text-base tracking-tight text-red uppercase whitespace-nowrap shrink-0">
            SPEEDY MEALS
          </span>
        </Link>

        {/* Desktop Anchor Navigation: How it works · Registration · About */}
        <nav className="hidden md:flex items-center space-x-1 bg-white/40 backdrop-blur-md border border-white/60 p-1 nav-pill shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.03)]">
          {[
            { id: 'services', label: 'How it works' },
            { id: 'partner', label: 'Registration' },
            { id: 'about', label: 'About' },
          ].map((item, idx) => {
            const isAboutActive = isAboutPage && item.id === 'about';
            return (
              <button
                key={`${item.id}-${item.label}-${idx}`}
                id={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => handleNavClick(item.id as 'overview' | 'services' | 'partner' | 'about')}
                className={`nav-pill relative px-3.5 py-2 font-sans font-medium text-sm tracking-wide transition-colors duration-150 cursor-pointer ${isAboutActive
                  ? 'text-black font-bold bg-tan/20'
                  : 'text-ink-soft hover:text-ink hover:bg-paper-off/50'
                  }`}
              >
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Action CTAs: One CTA "Get early access" + Portals Menu */}
        <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
          <button
            id="nav-cta-early-access"
            type="button"
            onClick={() => handleNavClick('partner', 'customer')}
            className="nav-pill px-4 py-2 text-xs font-sans font-bold tracking-wide uppercase bg-[#C7A874] text-[#15171A] hover:bg-[#B3935B] transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <span>Get VIP access</span>
            <ArrowRight size={13} weight="bold" />
          </button>

          {/* Interactive Portals Button & Flyout Menu */}
          <div className="relative" ref={portalsRef}>
            <button
              id="nav-cta-portals"
              type="button"
              onClick={() => setPortalsOpen((prev) => !prev)}
              className={`nav-pill px-3 py-2 text-xs font-sans font-semibold tracking-wide uppercase transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${sessionRole === 'admin'
                ? 'border border-ink bg-ink text-white hover:bg-black shadow-xs'
                : sessionRole === 'restaurant'
                  ? 'border border-blue bg-blue text-white hover:bg-[#155ab6] shadow-xs'
                  : 'border border-ink/20 bg-white/90 text-ink hover:border-ink hover:bg-white shadow-xs'
                }`}
            >
              {sessionRole ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-[#10B981] opacity-75 rounded-full" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                </span>
              ) : (
                <Key size={13} weight="bold" className="text-red" />
              )}
              <span>
                {sessionRole === 'admin'
                  ? 'ADMIN'
                  : sessionRole === 'restaurant'
                    ? 'MERCHANT'
                    : 'PORTALS'}
              </span>
              <CaretDown
                size={11}
                weight="bold"
                className={`transition-transform duration-200 ${portalsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Clean Minimal Dropdown */}
            <AnimatePresence>
              {portalsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-line shadow-xl py-2 z-50 rounded-xl"
                >
                  <div className="px-3 pb-2 mb-1 border-b border-line">
                    <span className="font-sans text-[10px] uppercase tracking-wider text-ink-soft font-bold">
                      SpeedyMeals Portals
                    </span>
                  </div>

                  <Link
                    href="/restaurant"
                    onClick={() => setPortalsOpen(false)}
                    id="portal-link-restaurant"
                    className="flex items-center justify-between px-3 py-2.5 group hover:bg-paper-off transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Storefront size={14} weight="bold" className="text-blue shrink-0" />
                      <span className="font-sans text-sm text-ink group-hover:text-blue transition-colors">
                        Merchant Portal
                      </span>
                    </div>
                    {sessionRole === 'restaurant' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </Link>

                  <Link
                    href="/admin"
                    onClick={() => setPortalsOpen(false)}
                    id="portal-link-admin"
                    className="flex items-center justify-between px-3 py-2.5 group hover:bg-paper-off transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <ShieldCheck size={14} weight="bold" className="text-red shrink-0" />
                      <span className="font-sans text-sm text-ink group-hover:text-red transition-colors">
                        Admin Console
                      </span>
                    </div>
                    {sessionRole === 'admin' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </Link>

                  {sessionRole && (
                    <div className="px-3 pt-2 mt-1 border-t border-line flex items-center justify-between">
                      <span className="font-sans text-xs text-ink-soft truncate max-w-[100px]">
                        {sessionUser?.name || sessionRole.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-red hover:text-ink font-sans text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <SignOut size={11} weight="bold" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile menu toggle button */}
        <div className="md:hidden flex items-center">
          <button
            id="nav-mobile-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="nav-pill p-2.5 border border-line bg-white text-ink hover:bg-paper-off transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Panel: floating card with nav-drawer styling */}
      {mobileMenuOpen && (
        <div
          id="mobile-drawer-panel"
          className="nav-drawer md:hidden mt-2 border border-line bg-white/98 backdrop-blur-md shadow-2xl p-5 space-y-4"
        >
          <div className="flex flex-col space-y-1 font-sans text-sm uppercase tracking-wider font-semibold">
            <button
              id="mobile-link-services"
              type="button"
              onClick={() => handleNavClick('services')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${activeSection === 'services'
                ? 'bg-tan/20 text-black font-bold'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>How it works</span>
              <span className="text-ink-soft">→</span>
            </button>
            <button
              id="mobile-link-registration"
              type="button"
              onClick={() => handleNavClick('partner')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${activeSection === 'partner'
                ? 'bg-tan/20 text-black font-bold'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>Registration</span>
              <span className="text-ink-soft">→</span>
            </button>
            <button
              id="mobile-link-about"
              type="button"
              onClick={() => handleNavClick('about')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${isAboutPage
                ? 'bg-tan/20 text-black font-bold'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>About</span>
              <span className="text-ink-soft">→</span>
            </button>

            <div className="pt-2">
              <button
                id="mobile-link-early-access"
                type="button"
                onClick={() => handleNavClick('partner', 'customer')}
                className="w-full py-3 px-4 bg-[#C7A874] text-[#15171A] font-sans font-bold uppercase tracking-wide rounded-lg flex justify-center items-center space-x-2"
              >
                <span>Get VIP access</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>

            {/* Mobile Portal Navigation Links */}
            <Link
              id="mobile-link-restaurant-portal"
              href="/restaurant"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 border-b border-line text-blue hover:bg-blue/[0.04] flex justify-between items-center transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Storefront size={16} weight="bold" />
                <span>Restaurant Portal</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 border border-blue/30 bg-blue/10 text-blue">
                {sessionRole === 'restaurant' ? 'DASHBOARD' : 'LOGIN'}
              </span>
            </Link>

            <Link
              id="mobile-link-admin-portal"
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 border-b border-line text-red hover:bg-red/[0.04] flex justify-between items-center transition-colors"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck size={16} weight="bold" />
                <span>Admin Console</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 border border-red/30 bg-red/10 text-red">
                {sessionRole === 'admin' ? 'DASHBOARD' : 'LOGIN'}
              </span>
            </Link>
          </div>

          {sessionRole && (
            <div className="pt-1 pb-2 flex items-center justify-between font-sans text-xs text-ink-soft border-t border-line">
              <span>Active: <strong className="text-ink">{sessionRole.toUpperCase()}</strong></span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-red font-bold hover:underline"
              >
                Sign Out
              </button>
            </div>
          )}

          <div className="pt-2 grid grid-cols-3 gap-2 font-sans text-xs uppercase font-bold tracking-wide">
            <button
              id="mobile-cta-rider"
              type="button"
              onClick={() => handleNavClick('partner', 'rider')}
              className="nav-pill w-full py-2.5 text-center border border-red text-red hover:bg-red hover:text-white transition-colors"
            >
              Rider
            </button>
            <button
              id="mobile-cta-restaurant"
              type="button"
              onClick={() => handleNavClick('partner', 'restaurant')}
              className="nav-pill w-full py-2.5 text-center border border-blue text-blue hover:bg-blue hover:text-white transition-colors"
            >
              Merchant
            </button>
            <button
              id="mobile-cta-customer"
              type="button"
              onClick={() => handleNavClick('partner', 'customer')}
              className="nav-pill w-full py-2.5 text-center border border-tan text-[#A8874E] hover:bg-tan hover:text-ink transition-colors"
            >
              Customer
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
