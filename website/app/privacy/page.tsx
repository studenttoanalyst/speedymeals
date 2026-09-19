'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUp,
  ShieldCheck,
  LockKey,
  MagnifyingGlass,
  CheckCircle,
  EnvelopeSimple,
  FileText,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';
import privacyData from '@/lib/legal/privacyData.json';

export default function PrivacyPolicyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-1');

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return privacyData.sections;
    const q = searchQuery.toLowerCase();
    return privacyData.sections.filter(sec => {
      const matchTitle = sec.title.toLowerCase().includes(q) || sec.num.includes(q);
      const matchPara = (sec.paragraphs || []).some(p => p.toLowerCase().includes(q));
      const matchSub = (sec.subsections || []).some(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q));
      return matchTitle || matchPara || matchSub;
    });
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
              href="/terms"
              className="text-xs font-mono text-[#5B5F66] hover:text-ink hidden sm:inline transition-colors"
            >
              Terms of Use &rarr;
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
                  placeholder="Search policy (e.g., delete, cookies, app)..."
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
                  <span>POLICY SECTIONS</span>
                  <span className="text-[10px] text-[#10B981] font-mono">17 SECTIONS</span>
                </div>

                <nav className="space-y-1 text-xs font-mono">
                  {privacyData.sections.map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left py-1.5 px-2.5 transition-colors flex items-center space-x-2 group ${
                        activeSectionId === sec.id
                          ? 'bg-red text-white font-bold'
                          : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                      }`}
                    >
                      <span className="text-[10px] opacity-70 w-5">{sec.num}.</span>
                      <span className="truncate">{sec.title}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Security Commitment Box */}
              <div className="p-4 bg-white border border-line text-xs font-mono space-y-2 shadow-xs">
                <div className="flex items-center space-x-2 text-ink font-bold">
                  <LockKey size={16} weight="bold" className="text-[#10B981] shrink-0" />
                  <span>PRE-LAUNCH COMMITMENT</span>
                </div>
                <p className="text-[#5B5F66] text-[11px] leading-relaxed">
                  The Speedy Meals mobile app currently operates in pre-launch mode and does NOT collect, store or transmit your personal data.
                </p>
                <div className="pt-2 border-t border-line text-[10px] text-[#8C9099]">
                  Deletion request mailbox: support@speedymealservices.com
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <div className="lg:col-span-8 space-y-10">
            {/* Header Document Intro */}
            <div className="bg-white border border-line p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-line">
                <div className="inline-flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[#10B981] font-bold">
                    OFFICIAL PRIVACY STATEMENT
                  </span>
                </div>
                <span className="font-mono text-xs text-[#8C9099]">
                  Version 1.0 &middot; Pre-Launch Phase 2026
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl uppercase tracking-tight text-ink mb-4">
                Speedy Meals Privacy Policy
              </h1>

              <div className="space-y-3 font-sans text-sm text-[#4B515D] leading-relaxed">
                {privacyData.meta.intro.map((p, idx) => (
                  <p key={idx} className={idx === 2 ? 'bg-paper-off p-3 border-l-2 border-l-red font-mono text-xs text-ink' : ''}>
                    {p}
                  </p>
                ))}
              </div>
            </div>

            {/* Document Sections */}
            {filteredSections.map(sec => (
              <article
                key={sec.id}
                id={sec.id}
                className="bg-white border border-line p-6 sm:p-8 shadow-xs scroll-mt-24 space-y-4"
              >
                {/* Section Header */}
                <div className="flex items-baseline space-x-3 pb-3 border-b border-line">
                  <span className="font-mono font-bold text-xs sm:text-sm bg-[#15171A] text-white px-2 py-0.5 shrink-0">
                    {sec.num.padStart(2, '0')}
                  </span>
                  <h2 className="font-display text-lg sm:text-xl text-ink uppercase tracking-tight">
                    {sec.title}
                  </h2>
                </div>

                {/* Plain Paragraphs */}
                {sec.paragraphs && sec.paragraphs.length > 0 && (
                  <div className="space-y-3 font-sans text-xs sm:text-sm text-[#373C46] leading-relaxed">
                    {sec.paragraphs.map((para, pIdx) => {
                      if (para.startsWith('- ')) {
                        return (
                          <div key={pIdx} className="flex items-start space-x-2 ml-2">
                            <span className="text-red font-bold">&bull;</span>
                            <span>{para.replace(/^- /, '')}</span>
                          </div>
                        );
                      }
                      if (para.match(/^\d+\.\s/)) {
                        return (
                          <div key={pIdx} className="font-mono text-xs font-semibold text-ink ml-2">
                            {para}
                          </div>
                        );
                      }
                      return <p key={pIdx}>{para}</p>;
                    })}
                  </div>
                )}

                {/* Subsections if present */}
                {sec.subsections && (
                  <div className="space-y-4 pt-2">
                    {sec.subsections.map((sub, sIdx) => (
                      <div key={sIdx} className="p-4 bg-paper-off border border-line space-y-2">
                        <h3 className="font-mono text-xs font-bold text-ink uppercase">
                          {sub.title}
                        </h3>
                        <p className="font-sans text-xs sm:text-sm text-[#4B515D] leading-relaxed">
                          {sub.content}
                        </p>
                        {sub.bullets && (
                          <ul className="space-y-1.5 ml-4 font-sans text-xs text-[#4B515D] list-disc">
                            {sub.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 2: Q&A Table */}
                {sec.tableType === 'qa' && sec.qaTable && (
                  <div className="overflow-x-auto border border-line mt-4">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="bg-paper-off border-b border-line font-mono text-[11px] text-ink uppercase">
                          <th className="py-2.5 px-4 font-bold w-2/5">Question</th>
                          <th className="py-2.5 px-4 font-bold">Plain Answer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-[#373C46]">
                        {sec.qaTable.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-paper-off/50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-ink">{row.q}</td>
                            <td className="py-2.5 px-4">{row.a}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Section 4: Why Use Data Table */}
                {sec.tableType === 'why_use' && sec.whyUseTable && (
                  <div className="overflow-x-auto border border-line mt-4">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="bg-paper-off border-b border-line font-mono text-[11px] text-ink uppercase">
                          <th className="py-2.5 px-4 font-bold w-1/2">Purpose</th>
                          <th className="py-2.5 px-4 font-bold">Data Used</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-[#373C46]">
                        {sec.whyUseTable.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-paper-off/50 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-ink">{row.purpose}</td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-[#4B515D]">{row.data}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Section 7: Retention Table */}
                {sec.tableType === 'retention' && sec.retentionTable && (
                  <div className="overflow-x-auto border border-line mt-4">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="bg-paper-off border-b border-line font-mono text-[11px] text-ink uppercase">
                          <th className="py-2.5 px-4 font-bold w-1/2">Data Category</th>
                          <th className="py-2.5 px-4 font-bold">Retention Policy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-[#373C46]">
                        {sec.retentionTable.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-paper-off/50 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-ink">{row.data}</td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-red font-semibold">{row.period}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Section 14: Launch Changes Table */}
                {sec.tableType === 'launch_changes' && sec.launchTable && (
                  <div className="overflow-x-auto border border-line mt-4">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="bg-paper-off border-b border-line font-mono text-[11px] text-ink uppercase">
                          <th className="py-2.5 px-4 font-bold w-1/4">User Group</th>
                          <th className="py-2.5 px-4 font-bold">Expected Data Collection at Launch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-[#373C46]">
                        {sec.launchTable.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-paper-off/50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-ink font-mono">{row.group}</td>
                            <td className="py-2.5 px-4 text-[#4B515D]">{row.data}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}

            {/* Bottom Actions */}
            <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
              <div className="text-[#5B5F66]">
                Data requests or deletion inquiries? Email{' '}
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
