'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/home/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { PromoBanner } from '@/components/home/PromoBanner';
import { ServicesSection } from '@/components/home/ServicesSection';
import { PartnerSection } from '@/components/home/PartnerSection';
import { Footer } from '@/components/home/Footer';
import { PersonaType } from '@/types/home';
import { BannerSlide } from '@/lib/banners';

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
    const partnerEl = document.getElementById('partner');
    if (partnerEl) {
      partnerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FFFFFF] text-[#15171A] overflow-x-hidden selection:bg-[#E23A2E] selection:text-white">
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
          onSelectPersona={setActivePersona}
        />
      </main>

      {/* Footer */}
      <Footer onSelectPersona={handleSelectPersona} />
    </div>
  );
}
