'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUp,
  ShieldCheck,
  Scales,
  FileText,
  MagnifyingGlass,
  Bicycle,
  Storefront,
  Users,
  CheckCircle,
  WarningCircle,
  CurrencyCircleDollar,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';
import termsData from '@/lib/legal/termsData.json';

export default function TermsAndConditionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('part-a');

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const filteredParts = useMemo(() => {
    if (!searchQuery.trim()) return termsData.parts;
    const q = searchQuery.toLowerCase();
    return termsData.parts.map(part => {
      const matchingSections = part.sections.filter(sec => {
        const matchesSec = sec.code.toLowerCase().includes(q) || sec.title.toLowerCase().includes(q);
        const matchesClause = sec.clauses.some(c => c.num.toLowerCase().includes(q) || c.text.toLowerCase().includes(q));
        return matchesSec || matchesClause;
      });
      return {
        ...part,
        sections: matchingSections,
      };
    }).filter(p => p.sections.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#15171A] selection:bg-[#E23A2E] selection:text-white font-sans">
      {/* Sleek Minimal Legal Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group shrink-0 whitespace-nowrap">
              <img
                src="/favicon.jpeg"
                alt="SpeedyMeals"
                className="h-8 sm:h-10 w-auto object-contain shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="font-display text-base sm:text-xl tracking-tight uppercase text-ink group-hover:text-red transition-colors whitespace-nowrap shrink-0">
                SPEEDY MEALS
              </span>
            </Link>
            <span className="text-[#8C9099] font-mono text-xs hidden sm:inline">/</span>
            <span className="font-mono text-xs text-[#5B5F66] uppercase tracking-wider hidden sm:inline">
              LEGAL &amp; POLICIES
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/privacy"
              className="text-xs font-mono text-[#5B5F66] hover:text-ink hidden sm:inline transition-colors"
            >
              Privacy Policy &rarr;
            </Link>
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-line bg-paper text-xs font-mono font-bold uppercase tracking-wider text-ink hover:bg-ink hover:text-white transition-colors"
            >
              <ArrowLeft size={13} weight="bold" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Sticky Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 border-r border-line/60">
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search clause (e.g., D3.2, COD, 10%)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-line px-3 py-2 pl-9 text-xs font-mono text-ink placeholder-[#8C9099] focus:outline-none focus:border-red transition-colors shadow-xs"
                />
                <MagnifyingGlass
                  size={14}
                  weight="bold"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9099]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C9099] hover:text-ink"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Quick Links Table of Contents */}
              <div className="space-y-4">
                <div className="font-mono text-xs uppercase tracking-widest text-[#8C9099] font-bold flex items-center justify-between">
                  <span>TABLE OF CONTENTS</span>
                  <span className="text-[10px] text-red font-mono">UNABRIDGED</span>
                </div>

                <nav className="space-y-1 text-xs font-mono">
                  {termsData.parts.map(part => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => scrollToSection(part.id)}
                      className={`w-full text-left py-2 px-2.5 transition-colors flex items-center justify-between group ${
                        activeSectionId === part.id
                          ? 'bg-red text-white font-bold'
                          : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                      }`}
                    >
                      <span className="truncate">{part.title}</span>
                      <span className="text-[10px] opacity-70 ml-1 shrink-0">{part.sections.length} sec</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => scrollToSection('sched-1')}
                    className="w-full text-left py-2 px-2.5 text-[#5B5F66] hover:bg-white hover:text-ink transition-colors flex items-center justify-between font-mono"
                  >
                    <span className="truncate">SCHEDULE 1 - RATES &amp; LIMITS</span>
                    <span className="text-[10px] opacity-70 ml-1 shrink-0">TABLE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('sched-2')}
                    className="w-full text-left py-2 px-2.5 text-[#5B5F66] hover:bg-white hover:text-ink transition-colors flex items-center justify-between font-mono"
                  >
                    <span className="truncate">SCHEDULE 2 - FAILED ORDERS</span>
                    <span className="text-[10px] opacity-70 ml-1 shrink-0">TABLE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('sec-compliance')}
                    className="w-full text-left py-2 px-2.5 text-[#5B5F66] hover:bg-white hover:text-ink transition-colors flex items-center justify-between font-mono"
                  >
                    <span className="truncate">STATUTORY COMPLIANCE</span>
                    <span className="text-[10px] text-[#10B981] font-bold ml-1 shrink-0">PK LAW</span>
                  </button>
                </nav>
              </div>

              {/* Legal Badge Card */}
              <div className="p-4 bg-white border border-line text-xs font-mono space-y-2 shadow-xs">
                <div className="flex items-center space-x-2 text-ink font-bold">
                  <Scales size={16} weight="bold" className="text-red shrink-0" />
                  <span>JURISDICTION</span>
                </div>
                <p className="text-[#5B5F66] text-[11px] leading-relaxed">
                  Governed exclusively by the laws of the Islamic Republic of Pakistan. Exclusive dispute jurisdiction: Courts of Karachi.
                </p>
                <div className="pt-2 border-t border-line text-[10px] text-[#8C9099]">
                  Registered with SECP, FBR, and aligned with Pakistan Post.
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <div className="lg:col-span-8 space-y-12">
            {/* Header Document Intro */}
            <div className="bg-white border border-line p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-line">
                <div className="inline-flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-red font-bold">
                    OFFICIAL LEGAL DOCUMENT
                  </span>
                </div>
                <span className="font-mono text-xs text-[#8C9099]">
                  Version 1.0 &middot; Pre-Launch Phase 2026
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl uppercase tracking-tight text-ink mb-4">
                Terms and Conditions
              </h1>

              <div className="space-y-3 font-sans text-sm text-[#4B515D] leading-relaxed">
                {termsData.meta.preamble.map((p, idx) => (
                  <p key={idx} className={idx === 3 ? 'font-mono text-xs font-bold text-ink pt-2' : ''}>
                    {p}
                  </p>
                ))}
              </div>

              {/* Quick Highlights Strip */}
              <div className="mt-6 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-red font-bold mb-1">
                    <Bicycle size={15} weight="bold" />
                    <span>RIDERS</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66]">
                    100% retained customer delivery fee. Clause D3: Rs. 10 per delivery app fee.
                  </div>
                </div>

                <div className="p-3 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-blue font-bold mb-1">
                    <Storefront size={15} weight="bold" />
                    <span>RESTAURANTS</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66]">
                    Flat 10% commission. Zero signup fee, weekly Monday settlements.
                  </div>
                </div>

                <div className="p-3 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-[#10B981] font-bold mb-1">
                    <Users size={15} weight="bold" />
                    <span>CUSTOMERS</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66]">
                    Zero price markups. Transparent distance delivery charges only.
                  </div>
                </div>
              </div>
            </div>

            {/* Document Parts */}
            {filteredParts.map(part => (
              <section key={part.id} id={part.id} className="space-y-6 scroll-mt-24">
                {/* Part Header */}
                <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-red shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl uppercase tracking-tight text-white">
                      {part.title}
                    </h2>
                    <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">{part.scope}</p>
                  </div>
                  <span className="font-mono text-[10px] text-[#8C9099] uppercase tracking-wider self-start sm:self-center">
                    {part.sections.length} Sections
                  </span>
                </div>

                {/* Sections in this Part */}
                <div className="space-y-6">
                  {part.sections.map(sec => (
                    <article
                      key={sec.id}
                      id={sec.id}
                      className="bg-white border border-line p-5 sm:p-7 shadow-xs hover:border-[#8C9099] transition-colors scroll-mt-24"
                    >
                      {/* Section Title */}
                      <div className="flex items-baseline space-x-3 mb-4 pb-2.5 border-b border-line">
                        <span className="font-mono font-bold text-xs sm:text-sm bg-paper-off border border-line px-2 py-0.5 text-red shrink-0">
                          {sec.code}
                        </span>
                        <h3 className="font-display text-base sm:text-lg text-ink uppercase tracking-tight">
                          {sec.title}
                        </h3>
                      </div>

                      {/* Clauses */}
                      <div className="space-y-3.5 font-sans text-xs sm:text-sm text-[#2D3139] leading-relaxed">
                        {sec.clauses.map((clause, cIdx) => (
                          <div key={cIdx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                            {clause.num && (
                              <span className="font-mono text-xs font-bold text-ink shrink-0 sm:w-12">
                                {clause.num}
                              </span>
                            )}
                            <div className="flex-1 text-[#373C46]">
                              {clause.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {/* SCHEDULE 1: KEY RATES AND LIMITS */}
            <section id="sched-1" className="space-y-4 scroll-mt-24">
              <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-blue shadow-xs">
                <h2 className="font-display text-lg sm:text-xl uppercase tracking-tight text-white">
                  {termsData.schedule1.title}
                </h2>
                <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">{termsData.schedule1.intro}</p>
              </div>

              <div className="bg-white border border-line shadow-xs overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper-off border-b border-line text-[#15171A] uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 sm:px-6 font-bold">Item / Parameter</th>
                      <th className="py-3 px-4 sm:px-6 font-bold text-right sm:text-left">Standard Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[#373C46]">
                    {termsData.schedule1.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-paper-off/50 transition-colors">
                        <td className="py-2.5 px-4 sm:px-6 font-medium text-ink">{row.item}</td>
                        <td className="py-2.5 px-4 sm:px-6 font-bold text-red text-right sm:text-left">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SCHEDULE 2: FAILED ORDER ALLOCATION */}
            <section id="sched-2" className="space-y-4 scroll-mt-24">
              <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-tan shadow-xs">
                <h2 className="font-display text-lg sm:text-xl uppercase tracking-tight text-white">
                  {termsData.schedule2.title}
                </h2>
                <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">{termsData.schedule2.intro}</p>
              </div>

              <div className="bg-white border border-line shadow-xs overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-paper-off border-b border-line text-[#15171A] uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-bold w-2/5">Cause of Failure</th>
                      <th className="py-3 px-3 font-bold">Customer Impact</th>
                      <th className="py-3 px-3 font-bold">Restaurant Partner</th>
                      <th className="py-3 px-3 font-bold">Rider Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[#373C46]">
                    {termsData.schedule2.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-paper-off/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-ink text-xs">{row.cause}</td>
                        <td className="py-3 px-3 text-[11px] text-[#4B515D]">{row.customer}</td>
                        <td className="py-3 px-3 text-[11px] text-[#4B515D]">{row.restaurant}</td>
                        <td className="py-3 px-3 text-[11px] text-[#4B515D]">{row.rider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* STATUTORY COMPLIANCE */}
            <section id="sec-compliance" className="space-y-4 scroll-mt-24">
              <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-[#10B981] shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg sm:text-xl uppercase tracking-tight text-white flex items-center space-x-2">
                    <ShieldCheck size={20} weight="bold" className="text-[#10B981]" />
                    <span>{termsData.compliance.title}</span>
                  </h2>
                  <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">{termsData.compliance.intro}</p>
                </div>
                <span className="font-mono text-[10px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-1 uppercase font-bold hidden sm:inline">
                  MANDATORY
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {termsData.compliance.items.map((item, iIdx) => (
                  <div key={iIdx} className="bg-white border border-line p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center space-x-2 font-mono text-xs font-bold text-ink uppercase mb-2">
                      <span className="w-1.5 h-1.5 bg-[#10B981] inline-block" />
                      <span>{item.title}</span>
                    </div>
                    <p className="font-sans text-xs sm:text-sm text-[#4B515D] leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
              <div className="text-[#5B5F66]">
                Questions about these terms? Email{' '}
                <a
                  href="mailto:support@speedymealservices.com"
                  className="text-ink font-bold hover:underline"
                >
                  support@speedymealservices.com
                </a>
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-line bg-paper text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <ArrowUp size={12} weight="bold" />
                <span>BACK TO TOP</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
