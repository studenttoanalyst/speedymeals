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
        setActiveSection('overview');
      }
    };

    // Clean #overview from address bar immediately if present
    if (typeof window !== 'undefined' && window.location.hash === '#overview') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
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
          ? 'bg-white/85 backdrop-blur-md border-black/10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
          : 'bg-white/70 backdrop-blur-sm border-black/5'
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

        {/* Desktop 1:1 Anchor Navigation with Tan Capsule Active Styling & Signature Glowing Tubelight */}
        <nav className="hidden md:flex items-center space-x-1 bg-white/40 backdrop-blur-md border border-white/60 p-1 nav-pill shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.03)]">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'services', label: 'Services' },
            { id: 'partner', label: 'Partner' },
            { id: 'about', label: 'About' },
          ].map((item) => {
            const isActive = isAboutPage ? item.id === 'about' : activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                type="button"
                onClick={() => handleNavClick(item.id as 'overview' | 'services' | 'partner' | 'about')}
                className={`nav-pill relative px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors duration-150 cursor-pointer ${isActive
                  ? 'text-black font-bold'
                  : 'text-ink-soft hover:text-ink'
                  }`}
              >
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-tubelight-lamp"
                    className="nav-pill absolute inset-0 bg-tan border border-[#B89865] shadow-xs -z-10"
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 30,
                    }}
                  >
                    {/* Signature glowing red tubelight bar */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-red rounded-t-full shadow-[0_0_10px_#E23A2E]" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action CTAs: pill shaped on desktop */}
        <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
          <button
            id="nav-cta-ride"
            type="button"
            onClick={() => handleNavClick('partner', 'rider')}
            className="nav-pill px-3.5 py-2 text-xs font-mono font-semibold tracking-wider uppercase border border-red text-red hover:bg-red hover:text-white transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>RIDER</span>
            <ArrowUpRight size={13} weight="bold" />
          </button>

          <button
            id="nav-cta-restaurant"
            type="button"
            onClick={() => handleNavClick('partner', 'restaurant')}
            className="nav-pill px-3.5 py-2 text-xs font-mono font-semibold tracking-wider uppercase border border-blue text-blue hover:bg-blue hover:text-white transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>PARTNER</span>
            <ArrowUpRight size={13} weight="bold" />
          </button>

          {/* Interactive Portals Button & Flyout Menu */}
          <div className="relative" ref={portalsRef}>
            <button
              id="nav-cta-portals"
              type="button"
              onClick={() => setPortalsOpen((prev) => !prev)}
              className={`nav-pill px-3.5 py-2 text-xs font-mono font-semibold tracking-wider uppercase transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${sessionRole === 'admin'
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
                  ? 'ADMIN CONSOLE'
                  : sessionRole === 'restaurant'
                    ? 'RESTAURANT PORTAL'
                    : 'PORTALS'}
              </span>
              <CaretDown
                size={11}
                weight="bold"
                className={`transition-transform duration-200 ${portalsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Interactive Dropdown Popover */}
            <AnimatePresence>
              {portalsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-84 sm:w-92 bg-white border border-line shadow-2xl p-4 z-50 text-left font-sans"
                  style={{ borderRadius: '0px' }}
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-red inline-block" style={{ borderRadius: '0px' }} />
                      <span className="font-mono text-[11px] uppercase tracking-widest text-ink font-bold">
                        SPEEDYMEALS PORTALS
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-paper-off border border-line text-ink-soft">
                      {sessionRole ? 'AUTHENTICATED' : 'SIGN IN / ENTER'}
                    </span>
                  </div>

                  {/* Portal Option 1: Restaurant Partner Portal */}
                  <Link
                    href="/restaurant"
                    onClick={() => setPortalsOpen(false)}
                    id="portal-link-restaurant"
                    className={`group block p-3 border transition-colors mb-2.5 ${sessionRole === 'restaurant'
                      ? 'border-blue bg-blue/[0.04] hover:bg-blue/[0.08]'
                      : 'border-line hover:border-blue hover:bg-paper-off'
                      }`}
                    style={{ borderRadius: '0px' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-blue/10 text-blue border border-blue/20">
                          <Storefront size={16} weight="bold" />
                        </div>
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink group-hover:text-blue transition-colors">
                          Restaurant Portal
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${sessionRole === 'restaurant'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                          : 'bg-paper-off border-line text-ink-soft'
                          }`}
                      >
                        {sessionRole === 'restaurant' ? 'ACTIVE SESSION' : 'MERCHANT'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-blue font-semibold pt-1 border-t border-line/60">
                      <span>
                        {sessionRole === 'restaurant'
                          ? 'Open Restaurant Dashboard'
                          : 'Sign In / Portal Login'}
                      </span>
                      <ArrowRight size={12} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  {/* Portal Option 2: Platform Admin Console */}
                  <Link
                    href="/admin"
                    onClick={() => setPortalsOpen(false)}
                    id="portal-link-admin"
                    className={`group block p-3 border transition-colors ${sessionRole === 'admin'
                      ? 'border-red bg-red/[0.04] hover:bg-red/[0.08]'
                      : 'border-line hover:border-red hover:bg-paper-off'
                      }`}
                    style={{ borderRadius: '0px' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-red/10 text-red border border-red/20">
                          <ShieldCheck size={16} weight="bold" />
                        </div>
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink group-hover:text-red transition-colors">
                          Admin Console
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${sessionRole === 'admin'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                          : 'bg-paper-off border-line text-ink-soft'
                          }`}
                      >
                        {sessionRole === 'admin' ? 'ACTIVE SESSION' : 'RESTRICTED'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-red font-semibold pt-1 border-t border-line/60">
                      <span>
                        {sessionRole === 'admin' ? 'Open Admin Dashboard' : 'Admin Console Login'}
                      </span>
                      <ArrowRight size={12} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  {/* Active Session Footer with Sign Out */}
                  {sessionRole && (
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between font-mono text-[11px]">
                      <div className="text-ink-soft truncate max-w-[180px]">
                        <span className="text-ink font-semibold">
                          {sessionUser?.name || sessionUser?.email || sessionRole.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-red hover:text-ink font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <SignOut size={13} weight="bold" />
                        <span>SIGN OUT</span>
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
          <div className="flex flex-col space-y-1 font-mono text-xs uppercase tracking-widest">
            <button
              id="mobile-link-overview"
              type="button"
              onClick={() => handleNavClick('overview')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${activeSection === 'overview'
                ? 'bg-tan text-black font-bold border-tan/60'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>Overview</span>
              <span className={activeSection === 'overview' ? 'text-black' : 'text-ink-soft'}>→</span>
            </button>
            <button
              id="mobile-link-services"
              type="button"
              onClick={() => handleNavClick('services')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${activeSection === 'services'
                ? 'bg-tan text-black font-bold border-tan/60'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>Services</span>
              <span className={activeSection === 'services' ? 'text-black' : 'text-ink-soft'}>→</span>
            </button>
            <button
              id="mobile-link-partner"
              type="button"
              onClick={() => handleNavClick('partner')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${activeSection === 'partner'
                ? 'bg-tan text-black font-bold border-tan/60'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>Partner</span>
              <span className={activeSection === 'partner' ? 'text-black' : 'text-ink-soft'}>→</span>
            </button>
            <button
              id="mobile-link-about"
              type="button"
              onClick={() => handleNavClick('about')}
              className={`text-left py-3 px-3 border-b border-line flex justify-between items-center transition-colors rounded-lg ${isAboutPage
                ? 'bg-tan text-black font-bold border-tan/60'
                : 'text-ink hover:bg-paper-off'
                }`}
            >
              <span>About Us</span>
              <span className={isAboutPage ? 'text-black' : 'text-ink-soft'}>→</span>
            </button>

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
            <div className="pt-1 pb-2 flex items-center justify-between font-mono text-[11px] text-ink-soft border-t border-line">
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

          <div className="pt-2 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
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
              Partner
            </button>
            <button
              id="mobile-cta-customer"
              type="button"
              onClick={() => handleNavClick('partner', 'customer')}
              className="nav-pill w-full py-2.5 text-center border border-tan text-[#A8874E] hover:bg-tan hover:text-ink transition-colors"
            >
              Waitlist
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
