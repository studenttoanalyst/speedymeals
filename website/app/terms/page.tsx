'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Printer,
  LinkSimple,
  Check,
  LockKey,
  Gavel,
  Buildings,
  CaretUp,
  CaretDown,
  X,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';
import { HighlightedText } from '@/components/legal/HighlightedText';
import termsData from '@/lib/legal/termsData.json';

export default function TermsAndConditionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>('part-a');
  const [copiedClause, setCopiedClause] = useState<string | null>(null);
  const [copiedDocLink, setCopiedDocLink] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleCopyClause = (clauseNum: string) => {
    const slug = clauseNum.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const url = `${window.location.origin}/terms#${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedClause(clauseNum);
    setTimeout(() => setCopiedClause(null), 2000);
  };

  const handleCopyDocLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedDocLink(true);
    setTimeout(() => setCopiedDocLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const highlightAndScroll = (targetIndex: number, matchesNodeList?: NodeListOf<HTMLElement>) => {
    const matches = matchesNodeList || document.querySelectorAll<HTMLElement>('.find-match');
    if (matches.length === 0) return;

    matches.forEach((el, idx) => {
      if (idx === targetIndex) {
        el.classList.add('bg-red', 'text-white', 'font-bold', 'ring-2', 'ring-red-400');
        el.classList.remove('bg-[#FEF08A]', 'text-ink');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        el.classList.remove('bg-red', 'text-white', 'font-bold', 'ring-2', 'ring-red-400');
        el.classList.add('bg-[#FEF08A]', 'text-ink');
      }
    });
  };

  const goToNextMatch = () => {
    const matches = document.querySelectorAll<HTMLElement>('.find-match');
    if (matches.length === 0) return;
    const next = (activeMatchIndex + 1) % matches.length;
    setActiveMatchIndex(next);
    highlightAndScroll(next, matches);
  };

  const goToPrevMatch = () => {
    const matches = document.querySelectorAll<HTMLElement>('.find-match');
    if (matches.length === 0) return;
    const prev = (activeMatchIndex - 1 + matches.length) % matches.length;
    setActiveMatchIndex(prev);
    highlightAndScroll(prev, matches);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  // Listen for Ctrl+F / Cmd+F to focus the in-page IDE find input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Update match count & active match whenever search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTotalMatches(0);
      setActiveMatchIndex(0);
      document.querySelectorAll<HTMLElement>('.find-match-active').forEach(el => {
        el.classList.remove('find-match-active', 'bg-red', 'text-white', 'ring-2', 'ring-red-400', 'font-bold');
        el.classList.add('bg-[#FEF08A]', 'text-ink');
      });
      return;
    }

    const timer = setTimeout(() => {
      const matches = document.querySelectorAll<HTMLElement>('.find-match');
      setTotalMatches(matches.length);
      if (matches.length > 0) {
        setActiveMatchIndex(0);
        highlightAndScroll(0, matches);
      } else {
        setActiveMatchIndex(0);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#15171A] selection:bg-[#E23A2E] selection:text-white font-sans">
      {/* Sleek Enterprise Legal Center Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line print:hidden">
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
              LEGAL &amp; COMPLIANCE
            </span>
          </div>

          {/* Document Switcher Tabs (Desktop & Mobile) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center bg-[#ECEEF1] p-1 border border-[#D5D8DC]">
              <Link
                href="/terms"
                className="px-2.5 sm:px-3 py-1 bg-white text-ink text-xs font-mono font-bold shadow-xs flex items-center space-x-1.5"
              >
                <FileText size={13} weight="bold" className="text-red" />
                <span className="hidden xs:inline">Terms</span>
                <span className="xs:hidden">Terms</span>
              </Link>
              <Link
                href="/privacy"
                className="px-2.5 sm:px-3 py-1 text-[#5B5F66] hover:text-ink text-xs font-mono transition-colors flex items-center space-x-1.5"
              >
                <LockKey size={13} />
                <span className="hidden xs:inline">Privacy</span>
                <span className="xs:hidden">Privacy</span>
              </Link>
            </div>

            {/* Print and Share Actions */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handlePrint}
                title="Print or Save as PDF"
                className="p-1.5 border border-line bg-paper text-ink hover:bg-ink hover:text-white transition-colors hidden md:flex items-center justify-center cursor-pointer"
              >
                <Printer size={15} />
              </button>
              <button
                type="button"
                onClick={handleCopyDocLink}
                title="Copy Document Link"
                className="px-2.5 py-1.5 border border-line bg-paper text-ink hover:bg-ink hover:text-white transition-colors text-xs font-mono flex items-center space-x-1 cursor-pointer"
              >
                {copiedDocLink ? (
                  <>
                    <Check size={13} className="text-[#10B981]" weight="bold" />
                    <span className="text-[#10B981] font-bold">COPIED</span>
                  </>
                ) : (
                  <>
                    <LinkSimple size={13} weight="bold" />
                    <span className="hidden sm:inline">SHARE</span>
                  </>
                )}
              </button>
              <Link
                href="/"
                className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 border border-line bg-paper text-xs font-mono font-bold uppercase tracking-wider text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <ArrowLeft size={13} weight="bold" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Quick Jump & Find Toolbar */}
        <div className="lg:hidden border-t border-line/60 bg-[#F1F3F5] px-4 py-2 flex flex-col gap-2">
          {/* Mobile IDE Find Toolbar */}
          <div className="flex items-center space-x-1.5 bg-white border border-line px-2.5 py-1.5 shadow-xs">
            <MagnifyingGlass size={14} weight="bold" className="text-[#8C9099] shrink-0" />
            <input
              type="text"
              placeholder="Find in document (e.g. D3.2, COD)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs font-mono text-ink placeholder-[#8C9099] focus:outline-none"
            />
            {searchQuery.trim() && (
              <div className="flex items-center space-x-1 shrink-0">
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                    totalMatches > 0
                      ? 'bg-paper-off border-line text-ink font-bold'
                      : 'bg-red/10 border-red/30 text-red font-bold'
                  }`}
                >
                  {totalMatches > 0 ? `${activeMatchIndex + 1}/${totalMatches}` : '0/0'}
                </span>
                <button
                  type="button"
                  onClick={goToNextMatch}
                  disabled={totalMatches === 0}
                  className="p-1 border border-line bg-paper text-ink disabled:opacity-30 cursor-pointer"
                >
                  <CaretUp size={11} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={goToPrevMatch}
                  disabled={totalMatches === 0}
                  className="p-1 border border-line bg-paper text-ink disabled:opacity-30 cursor-pointer"
                >
                  <CaretDown size={11} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-[#8C9099] cursor-pointer"
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label htmlFor="mobile-sec-jump" className="font-mono text-[10px] text-[#5B5F66] uppercase font-bold shrink-0">
              JUMP:
            </label>
            <select
              id="mobile-sec-jump"
              value={activeSectionId}
              onChange={e => scrollToSection(e.target.value)}
              className="w-full bg-white border border-line px-2.5 py-1 text-xs font-mono text-ink rounded-none focus:outline-none focus:border-red"
            >
              {termsData.parts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
              <option value="sched-1">SCHEDULE 1 - RATES &amp; LIMITS</option>
              <option value="sched-2">SCHEDULE 2 - FAILED ORDERS</option>
              <option value="sec-compliance">STATUTORY COMPLIANCE (PK LAW)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Legal Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Sticky Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 border-r border-line/60 print:hidden">
            <div className="space-y-6">
              {/* IDE-Style Find Toolbar */}
              <div className="bg-white border-2 border-line focus-within:border-red shadow-xs p-2 transition-all space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <MagnifyingGlass
                    size={15}
                    weight="bold"
                    className="text-[#8C9099] shrink-0"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Find in document (e.g. D3.2, COD, 10%)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-xs font-mono text-ink placeholder-[#8C9099] focus:outline-none"
                  />
                  {searchQuery.trim() && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                          totalMatches > 0
                            ? 'bg-paper-off border-line text-ink font-bold'
                            : 'bg-red/10 border-red/30 text-red font-bold'
                        }`}
                      >
                        {totalMatches > 0 ? `${activeMatchIndex + 1} of ${totalMatches}` : '0 of 0'}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextMatch}
                        disabled={totalMatches === 0}
                        title="Next match (Enter)"
                        className="p-1 border border-line bg-paper text-ink hover:bg-ink hover:text-white disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink transition-colors cursor-pointer"
                      >
                        <CaretUp size={12} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={goToPrevMatch}
                        disabled={totalMatches === 0}
                        title="Previous match (Shift+Enter)"
                        className="p-1 border border-line bg-paper text-ink hover:bg-ink hover:text-white disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink transition-colors cursor-pointer"
                      >
                        <CaretDown size={12} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        title="Clear find (Esc)"
                        className="p-1 text-[#8C9099] hover:text-red transition-colors cursor-pointer"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>

                {searchQuery.trim() && (
                  <div className="pt-1.5 border-t border-line/60 flex items-center justify-between text-[10px] font-mono text-[#8C9099]">
                    <span>
                      {totalMatches > 0
                        ? 'Press Enter for next, Shift+Enter for prev'
                        : 'No matches found in document'}
                    </span>
                    <span>Esc to clear</span>
                  </div>
                )}
              </div>

              {/* Quick Links Table of Contents */}
              <div className="space-y-3">
                <div className="font-mono text-xs uppercase tracking-widest text-[#8C9099] font-bold flex items-center justify-between pb-1 border-b border-line">
                  <span>TABLE OF CONTENTS</span>
                  <span className="text-[10px] text-red font-mono font-bold">UNABRIDGED</span>
                </div>

                <nav className="space-y-1 text-xs font-mono">
                  {termsData.parts.map(part => {
                    const isActive = activeSectionId === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => scrollToSection(part.id)}
                        className={`w-full text-left py-2 px-2.5 transition-all flex items-center justify-between group cursor-pointer ${
                          isActive
                            ? 'bg-red text-white font-bold shadow-xs'
                            : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                        }`}
                      >
                        <span className="truncate">{part.title}</span>
                        <span
                          className={`text-[10px] ml-1 shrink-0 ${
                            isActive ? 'text-white/80' : 'text-[#8C9099] group-hover:text-ink'
                          }`}
                        >
                          {part.sections.length} sec
                        </span>
                      </button>
                    );
                  })}

                  <div className="pt-2 pb-1 border-t border-line/60 my-1 font-mono text-[10px] text-[#8C9099] uppercase tracking-wider font-bold">
                    SCHEDULES &amp; STATUTES
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToSection('sched-1')}
                    className={`w-full text-left py-2 px-2.5 transition-colors flex items-center justify-between font-mono cursor-pointer ${
                      activeSectionId === 'sched-1'
                        ? 'bg-blue text-white font-bold'
                        : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                    }`}
                  >
                    <span className="truncate">SCHEDULE 1 - RATES &amp; LIMITS</span>
                    <span className="text-[10px] opacity-70 ml-1 shrink-0">TABLE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('sched-2')}
                    className={`w-full text-left py-2 px-2.5 transition-colors flex items-center justify-between font-mono cursor-pointer ${
                      activeSectionId === 'sched-2'
                        ? 'bg-tan text-ink font-bold'
                        : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                    }`}
                  >
                    <span className="truncate">SCHEDULE 2 - FAILED ORDERS</span>
                    <span className="text-[10px] opacity-70 ml-1 shrink-0">MATRIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('sec-compliance')}
                    className={`w-full text-left py-2 px-2.5 transition-colors flex items-center justify-between font-mono cursor-pointer ${
                      activeSectionId === 'sec-compliance'
                        ? 'bg-[#10B981] text-white font-bold'
                        : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                    }`}
                  >
                    <span className="truncate">STATUTORY COMPLIANCE</span>
                    <span className="text-[10px] text-[#10B981] font-bold ml-1 shrink-0 group-hover:text-white">
                      PK LAW
                    </span>
                  </button>
                </nav>
              </div>

              {/* Regulatory & Jurisdiction Card */}
              <div className="p-4 bg-white border border-line text-xs font-mono space-y-2.5 shadow-xs">
                <div className="flex items-center space-x-2 text-ink font-bold">
                  <Scales size={16} weight="bold" className="text-red shrink-0" />
                  <span>LEGAL JURISDICTION</span>
                </div>
                <p className="text-[#5B5F66] text-[11px] leading-relaxed">
                  Governed exclusively by the statutory laws of the Islamic Republic of Pakistan. Dispute settlement subject to the exclusive jurisdiction of the Courts of Karachi.
                </p>
                <div className="pt-2 border-t border-line flex flex-col space-y-1 text-[10px] text-[#8C9099]">
                  <div className="flex items-center space-x-1.5">
                    <Buildings size={12} weight="bold" className="text-ink-soft shrink-0" />
                    <span>Entity: Speedy Meals Delivery Services</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Gavel size={12} weight="bold" className="text-ink-soft shrink-0" />
                    <span>Registered with SECP &amp; FBR</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <div className="lg:col-span-8 space-y-12">
            {/* Executive Document Metadata Card */}
            <div className="bg-white border border-line p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-line">
                <div className="inline-flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-red font-bold">
                    OFFICIAL LEGAL SPECIFICATION
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-[#8C9099]">
                  <span>Version 1.0</span>
                  <span>&middot;</span>
                  <span>Effective 2026</span>
                </div>
              </div>

              <h1 className="font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tight text-ink mb-3">
                <HighlightedText text="Terms and Conditions of Service" query={searchQuery} />
              </h1>

              {/* Pre-launch Notice Box */}
              <div className="mb-6 p-3.5 bg-paper-off border-l-4 border-l-blue text-xs font-mono text-[#4B515D] leading-relaxed space-y-1">
                <div className="font-bold text-ink uppercase flex items-center space-x-1.5">
                  <ShieldCheck size={14} className="text-blue" weight="bold" />
                  <span>BINDING LEGAL INSTRUMENT</span>
                </div>
                <p>
                  <HighlightedText
                    text="These Terms govern use of the website, mobile applications, and partner portals operated by Speedy Meals Delivery Services (under DiscoverTheTech). All registered users, partners, and customers agree to these terms upon onboarding."
                    query={searchQuery}
                  />
                </p>
              </div>

              <div className="space-y-3 font-sans text-sm text-[#4B515D] leading-relaxed">
                {termsData.meta.preamble.map((p, idx) => (
                  <p key={idx} className={idx === 3 ? 'font-mono text-xs font-bold text-ink pt-2 uppercase tracking-wide' : ''}>
                    <HighlightedText text={p} query={searchQuery} />
                  </p>
                ))}
              </div>

              {/* Key Stakeholder Highlights Strip */}
              <div className="mt-8 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-red font-bold mb-1.5">
                    <Bicycle size={16} weight="bold" />
                    <span>RIDERS</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66] leading-relaxed">
                    <HighlightedText text="100% retained customer delivery fare. Standard Rs. 10 flat app fee per completed delivery (Clause D3)." query={searchQuery} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-blue font-bold mb-1.5">
                    <Storefront size={16} weight="bold" />
                    <span>RESTAURANTS</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66] leading-relaxed">
                    <HighlightedText text="Flat 10% platform commission. Zero signup fees, weekly automated settlements every Monday (Clause E5)." query={searchQuery} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-[#10B981] font-bold mb-1.5">
                    <Users size={16} weight="bold" />
                    <span>CUSTOMERS</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66] leading-relaxed">
                    <HighlightedText text="Zero hidden markups on restaurant menu prices. Transparent distance-based delivery fee calculations (Clause C3)." query={searchQuery} />
                  </div>
                </div>
              </div>
            </div>

            {/* Document Parts (All unabridged parts kept fully intact) */}
            {termsData.parts.map(part => (
              <section key={part.id} id={part.id} className="space-y-6 scroll-mt-24">
                {/* Part Header */}
                <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-red shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base sm:text-lg uppercase tracking-tight text-white">
                      <HighlightedText text={part.title} query={searchQuery} />
                    </h2>
                    <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">
                      <HighlightedText text={part.scope} query={searchQuery} />
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-[#8C9099] uppercase tracking-wider self-start sm:self-center bg-[#25282F] px-2.5 py-1 border border-[#32363F]">
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
                          <HighlightedText text={sec.code} query={searchQuery} />
                        </span>
                        <h3 className="font-display text-sm sm:text-base text-ink uppercase tracking-tight">
                          <HighlightedText text={sec.title} query={searchQuery} />
                        </h3>
                      </div>

                      {/* Clauses */}
                      <div className="space-y-3.5 font-sans text-xs sm:text-sm text-[#2D3139] leading-relaxed">
                        {sec.clauses.map((clause, cIdx) => {
                          const clauseSlug = clause.num ? clause.num.toLowerCase().replace(/[^a-z0-9]/g, '-') : '';
                          const isCopied = copiedClause === clause.num;

                          return (
                            <div
                              key={cIdx}
                              id={clauseSlug ? `clause-${clauseSlug}` : undefined}
                              className="group flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1 hover:bg-paper-off/50 rounded-xs transition-colors"
                            >
                              {clause.num && (
                                <div className="flex items-center space-x-1.5 shrink-0 sm:w-16">
                                  <span className="font-mono text-xs font-bold text-ink bg-paper-off border border-line/60 px-1.5 py-0.5 rounded-xs">
                                    <HighlightedText text={clause.num} query={searchQuery} />
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyClause(clause.num)}
                                    title={`Copy link to clause ${clause.num}`}
                                    className="opacity-0 group-hover:opacity-100 text-[#8C9099] hover:text-red transition-opacity cursor-pointer p-0.5"
                                  >
                                    {isCopied ? (
                                      <Check size={11} className="text-[#10B981]" weight="bold" />
                                    ) : (
                                      <LinkSimple size={11} weight="bold" />
                                    )}
                                  </button>
                                </div>
                              )}
                              <div className="flex-1 text-[#373C46]">
                                <HighlightedText text={clause.text} query={searchQuery} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {/* SCHEDULE 1: KEY RATES AND LIMITS */}
            <section id="sched-1" className="space-y-4 scroll-mt-24">
              <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-blue shadow-xs">
                <h2 className="font-display text-base sm:text-lg uppercase tracking-tight text-white">
                  <HighlightedText text={termsData.schedule1.title} query={searchQuery} />
                </h2>
                <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">
                  <HighlightedText text={termsData.schedule1.intro} query={searchQuery} />
                </p>
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
                        <td className="py-2.5 px-4 sm:px-6 font-medium text-ink">
                          <HighlightedText text={row.item} query={searchQuery} />
                        </td>
                        <td className="py-2.5 px-4 sm:px-6 font-bold text-red text-right sm:text-left">
                          <HighlightedText text={row.value} query={searchQuery} />
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
                <h2 className="font-display text-base sm:text-lg uppercase tracking-tight text-white">
                  <HighlightedText text={termsData.schedule2.title} query={searchQuery} />
                </h2>
                <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">
                  <HighlightedText text={termsData.schedule2.intro} query={searchQuery} />
                </p>
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
                        <td className="py-3 px-4 font-semibold text-ink text-xs">
                          <HighlightedText text={row.cause} query={searchQuery} />
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[#4B515D]">
                          <HighlightedText text={row.customer} query={searchQuery} />
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[#4B515D]">
                          <HighlightedText text={row.restaurant} query={searchQuery} />
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[#4B515D]">
                          <HighlightedText text={row.rider} query={searchQuery} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* STATUTORY COMPLIANCE (PAKISTANI LAW) */}
            <section id="sec-compliance" className="space-y-4 scroll-mt-24">
              <div className="p-4 sm:p-5 bg-[#15171A] text-white border-l-4 border-l-[#10B981] shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base sm:text-lg uppercase tracking-tight text-white flex items-center space-x-2">
                    <ShieldCheck size={20} weight="bold" className="text-[#10B981]" />
                    <span>
                      <HighlightedText text={termsData.compliance.title} query={searchQuery} />
                    </span>
                  </h2>
                  <p className="font-mono text-xs text-[#A0A4AB] mt-0.5">
                    <HighlightedText text={termsData.compliance.intro} query={searchQuery} />
                  </p>
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
                      <span>
                        <HighlightedText text={item.title} query={searchQuery} />
                      </span>
                    </div>
                    <p className="font-sans text-xs sm:text-sm text-[#4B515D] leading-relaxed">
                      <HighlightedText text={item.text} query={searchQuery} />
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Actions & Support Contact */}
            <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs print:hidden">
              <div className="text-[#5B5F66]">
                Questions regarding these terms? Contact Legal Counsel:{' '}
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
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-line bg-paper text-ink hover:bg-ink hover:text-white transition-colors cursor-pointer"
              >
                <ArrowUp size={12} weight="bold" />
                <span>BACK TO TOP</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
