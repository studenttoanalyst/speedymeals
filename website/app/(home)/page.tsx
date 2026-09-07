'use client';

import { useState } from 'react';
import { Navbar } from '@/components/home/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { PartnerSection } from '@/components/home/PartnerSection';
import { Footer } from '@/components/home/Footer';
import { PersonaType } from '@/types/home';

export default function HomePage() {
  const [activePersona, setActivePersona] = useState<PersonaType>('rider');

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

      {/* Main Content Sections */}
      <main className="relative z-10">
        {/* Section 1: About Us (Hero) */}
        <HeroSection onSelectPersona={handleSelectPersona} />

        {/* Section 2: Services (Ecosystem Grid) */}
        <ServicesSection />

        {/* Section 3: Partner (Conversion & Registration) */}
        <PartnerSection
          activePersona={activePersona}
          onSelectPersona={setActivePersona}
        />
      </main>

      {/* Footer (Solid #15171A, no reeded glass) */}
      <Footer onSelectPersona={handleSelectPersona} />
    </div>
  );
}
