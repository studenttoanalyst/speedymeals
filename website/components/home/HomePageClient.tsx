'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/home/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { PromoBanner } from '@/components/home/PromoBanner';
import { ServicesSection } from '@/components/home/ServicesSection';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/home/Footer';
import { PersonaType } from '@/types/home';
import { BannerSlide } from '@/lib/banners';
import { scrollToSection } from '@/lib/scroll';

const PartnerSection = dynamic(
  () => import('@/components/home/PartnerSection').then((mod) => mod.PartnerSection),
  {
    loading: () => (
      <div id="partner" className="py-24 max-w-7xl mx-auto px-4 text-center text-ink-600">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-red border-t-transparent rounded-full animate-spin" />
        <p className="font-sans text-xs uppercase tracking-wider">Loading partnership registration...</p>
      </div>
    ),
  }
);

interface HomePageClientProps {
  slides: BannerSlide[];
}

export function HomePageClient({ slides }: HomePageClientProps) {
  const [activePersona, setActivePersona] = useState<PersonaType>('rider');

  useEffect(() => {
    // Strip #overview from URL if present so browser URL stays clean: speedymealservices.com/
    if (typeof window !== 'undefined' && window.location.hash === '#overview') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleSelectPersona = (persona: PersonaType) => {
    setActivePersona(persona);
    // Smoothly scroll down to the registration section
    setTimeout(() => {
      scrollToSection('partner', { gap: 16 });
    }, 40);
  };

  return (
    <div className="relative min-h-screen bg-white text-ink-900 overflow-x-hidden selection:bg-red-500 selection:text-white">
      {/* Sticky Snap Navbar */}
      <Navbar onSelectPersona={handleSelectPersona} />

      {/* Main Content Sections: Navbar -> banner carousel -> title block -> persona cards (no boxes) -> WE ARE HERE strip -> PromoBanner ticker */}
      <main className="relative z-10">
        {/* Section 1: Overview (Hero with dynamic banners) */}
        <HeroSection slides={slides} onSelectPersona={handleSelectPersona} />

        {/* Dynamic Promotional Ribbon Marquee (Full Viewport Width) */}
        <PromoBanner />

        {/* Section 2: Services (Ecosystem Stories) */}
        <ServicesSection onSelectPersona={handleSelectPersona} />

        {/* Section 3: Partner (Conversion & Registration) */}
        <PartnerSection
          activePersona={activePersona}
          onSelectPersona={handleSelectPersona}
        />
      </main>

      {/* Footer */}
      <Footer onSelectPersona={handleSelectPersona} />
    </div>
  );
}
