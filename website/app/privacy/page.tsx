'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUp,
  ShieldCheck,
  LockKey,
  MagnifyingGlass,
  FileText,
  Printer,
  LinkSimple,
  Check,
  Scales,
  UserCheck,
  Database,
  MapPin,
  EnvelopeSimple,
  CaretUp,
  CaretDown,
  X,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';
import { HighlightedText } from '@/components/legal/HighlightedText';
import privacyData from '@/lib/legal/privacyData.json';

export default function PrivacyPolicyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-1');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
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

  const handleCopySection = (secNum: string) => {
    const slug = `sec-${secNum}`;
    const url = `${window.location.origin}/privacy#${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSection(secNum);
    setTimeout(() => setCopiedSection(null), 2000);
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
              DATA PRIVACY &amp; SECURITY
            </span>
          </div>

          {/* Document Switcher Tabs (Desktop & Mobile) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center bg-[#ECEEF1] p-1 border border-[#D5D8DC]">
              <Link
                href="/terms"
                className="px-2.5 sm:px-3 py-1 text-[#5B5F66] hover:text-ink text-xs font-mono transition-colors flex items-center space-x-1.5"
              >
                <FileText size={13} />
                <span className="hidden xs:inline">Terms</span>
                <span className="xs:hidden">Terms</span>
              </Link>
              <Link
                href="/privacy"
                className="px-2.5 sm:px-3 py-1 bg-white text-ink text-xs font-mono font-bold shadow-xs flex items-center space-x-1.5"
              >
                <LockKey size={13} className="text-red" weight="bold" />
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
              placeholder="Find in policy (e.g. delete, cookies)..."
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
            <label htmlFor="mobile-sec-jump-privacy" className="font-mono text-[10px] text-[#5B5F66] uppercase font-bold shrink-0">
              JUMP:
            </label>
            <select
              id="mobile-sec-jump-privacy"
              value={activeSectionId}
              onChange={e => scrollToSection(e.target.value)}
              className="w-full bg-white border border-line px-2.5 py-1 text-xs font-mono text-ink rounded-none focus:outline-none focus:border-red"
            >
              {privacyData.sections.map(s => (
                <option key={s.id} value={s.id}>
                  § {s.num}. {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Privacy Content Container */}
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
                    placeholder="Find in policy (e.g. delete, cookies)..."
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

              {/* Table of Contents */}
              <div className="space-y-3">
                <div className="font-mono text-xs uppercase tracking-widest text-[#8C9099] font-bold flex items-center justify-between pb-1 border-b border-line">
                  <span>POLICY SECTIONS</span>
                  <span className="text-[10px] text-[#10B981] font-mono font-bold">{privacyData.sections.length} SECTIONS</span>
                </div>

                <nav className="space-y-0.5 text-xs font-mono max-h-[420px] overflow-y-auto pr-1">
                  {privacyData.sections.map(sec => {
                    const isActive = activeSectionId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full text-left py-1.5 px-2 transition-all flex items-center space-x-2 group cursor-pointer ${
                          isActive
                            ? 'bg-ink text-white font-bold shadow-xs'
                            : 'text-[#5B5F66] hover:bg-white hover:text-ink'
                        }`}
                      >
                        <span className={`text-[10px] font-bold shrink-0 ${isActive ? 'text-red' : 'text-[#8C9099]'}`}>
                          {sec.num}.
                        </span>
                        <span className="truncate">{sec.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Data Controller Card */}
              <div className="p-4 bg-white border border-line text-xs font-mono space-y-2.5 shadow-xs">
                <div className="flex items-center space-x-2 text-ink font-bold">
                  <LockKey size={16} weight="bold" className="text-red shrink-0" />
                  <span>DATA CONTROLLER</span>
                </div>
                <p className="text-[#5B5F66] text-[11px] leading-relaxed">
                  Speedy Meals Delivery Services, operating under DiscoverTheTech, is the data controller for personal information collected via our website and pre-launch onboarding channels.
                </p>
                <div className="pt-2 border-t border-line flex flex-col space-y-1 text-[10px] text-[#8C9099]">
                  <div className="flex items-center space-x-1.5">
                    <Scales size={12} weight="bold" className="text-ink-soft shrink-0" />
                    <span>Statutory Law: PECA 2016</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <EnvelopeSimple size={12} weight="bold" className="text-ink-soft shrink-0" />
                    <span>Privacy: support@speedymealservices.com</span>
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
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[#10B981] font-bold">
                    COMPREHENSIVE PRIVACY SPECIFICATION
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-[#8C9099]">
                  <span>Version 1.0</span>
                  <span>&middot;</span>
                  <span>Pre-Launch Phase 2026</span>
                </div>
              </div>

              <h1 className="font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tight text-ink mb-3">
                <HighlightedText text="Privacy and Data Protection Policy" query={searchQuery} />
              </h1>

              {/* Pre-launch Status Notice */}
              <div className="mb-6 p-3.5 bg-paper-off border-l-4 border-l-[#10B981] text-xs font-mono text-[#4B515D] leading-relaxed space-y-1">
                <div className="font-bold text-ink uppercase flex items-center space-x-1.5">
                  <ShieldCheck size={14} className="text-[#10B981]" weight="bold" />
                  <span>TRANSPARENT PRE-LAUNCH DATA PRACTICES</span>
                </div>
                <p>
                  <HighlightedText
                    text="Speedy Meals is currently in its pre-launch registration phase. This policy explains what data we collect today on our website forms and how it will expand upon commercial launch to protect customers, riders, and restaurants."
                    query={searchQuery}
                  />
                </p>
              </div>

              <div className="space-y-3 font-sans text-sm text-[#4B515D] leading-relaxed">
                {privacyData.meta.intro.map((p, idx) => (
                  <p key={idx}>
                    <HighlightedText text={p} query={searchQuery} />
                  </p>
                ))}
              </div>

              {/* Quick Privacy Commitments Strip */}
              <div className="mt-8 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-red font-bold mb-1.5">
                    <LockKey size={16} weight="bold" />
                    <span>NO DATA BROKERAGE</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66] leading-relaxed">
                    <HighlightedText text="We never sell, lease, or monetize personal information to external advertisers or brokers." query={searchQuery} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-blue font-bold mb-1.5">
                    <Database size={16} weight="bold" />
                    <span>MINIMALIST ONBOARDING</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66] leading-relaxed">
                    <HighlightedText text="No CNIC or identity documentation is requested during pre-launch registration." query={searchQuery} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8F9FA] border border-line">
                  <div className="flex items-center space-x-1.5 text-[#10B981] font-bold mb-1.5">
                    <UserCheck size={16} weight="bold" />
                    <span>RIGHT TO ERASURE</span>
                  </div>
                  <div className="text-[11px] text-[#5B5F66] leading-relaxed">
                    <HighlightedText text="You can request complete deletion of your registration data anytime by emailing support." query={searchQuery} />
                  </div>
                </div>
              </div>
            </div>

            {/* Render Policy Sections (All intact without filtering) */}
            <div className="space-y-8">
              {privacyData.sections.map(sec => {
                const isCopied = copiedSection === sec.num;

                return (
                  <article
                    key={sec.id}
                    id={sec.id}
                    className="bg-white border border-line p-6 sm:p-8 shadow-xs hover:border-[#8C9099] transition-colors scroll-mt-24 group"
                  >
                    {/* Section Header with copy button */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                      <div className="flex items-baseline space-x-2.5">
                        <span className="font-mono text-xs font-bold text-white bg-[#15171A] px-2 py-0.5 shrink-0">
                          § {sec.num}
                        </span>
                        <h2 className="font-display text-base sm:text-lg uppercase tracking-tight text-ink">
                          <HighlightedText text={sec.title} query={searchQuery} />
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopySection(sec.num)}
                        title={`Copy link to section ${sec.num}`}
                        className="opacity-0 group-hover:opacity-100 text-[#8C9099] hover:text-red transition-opacity cursor-pointer p-1 text-xs font-mono flex items-center space-x-1"
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} className="text-[#10B981]" weight="bold" />
                            <span className="text-[#10B981] font-bold text-[10px]">COPIED</span>
                          </>
                        ) : (
                          <>
                            <LinkSimple size={12} weight="bold" />
                            <span className="text-[10px] hidden sm:inline">LINK</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Paragraphs */}
                    {sec.paragraphs && sec.paragraphs.length > 0 && (
                      <div className="space-y-3 font-sans text-xs sm:text-sm text-[#373C46] leading-relaxed mb-4">
                        {sec.paragraphs.map((p, pIdx) => (
                          <p key={pIdx}>
                            <HighlightedText text={p} query={searchQuery} />
                          </p>
                        ))}
                      </div>
                    )}

                    {/* QA Table / Plain Language FAQ (Section 2) */}
                    {sec.tableType === 'qa' && sec.qaTable && (
                      <div className="mt-4 border border-line overflow-hidden">
                        <div className="bg-paper-off px-4 py-2 border-b border-line font-mono text-[11px] font-bold uppercase text-ink flex items-center justify-between">
                          <span>CORE PRIVACY SUMMARY</span>
                          <span className="text-[#10B981]">AT A GLANCE</span>
                        </div>
                        <div className="divide-y divide-line font-mono text-xs">
                          {sec.qaTable.map((row, rIdx) => (
                            <div key={rIdx} className="grid grid-cols-1 md:grid-cols-12 p-3 sm:p-4 gap-2 hover:bg-paper-off/50 transition-colors">
                              <div className="md:col-span-5 font-bold text-ink flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 bg-red shrink-0" />
                                <span>
                                  <HighlightedText text={row.q} query={searchQuery} />
                                </span>
                              </div>
                              <div className="md:col-span-7 text-[#4B515D] font-sans text-xs sm:text-sm pl-3 md:pl-0">
                                <HighlightedText text={row.a} query={searchQuery} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subsections if available */}
                    {sec.subsections && sec.subsections.length > 0 && (
                      <div className="mt-6 space-y-4 pt-4 border-t border-line/60">
                        {sec.subsections.map((sub, sIdx) => (
                          <div key={sIdx} className="bg-paper-off p-4 border border-line">
                            <h3 className="font-mono text-xs font-bold uppercase text-ink mb-1.5 flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-[#10B981] inline-block" />
                              <span>
                                <HighlightedText text={sub.title} query={searchQuery} />
                              </span>
                            </h3>
                            <p className="font-sans text-xs sm:text-sm text-[#4B515D] leading-relaxed">
                              <HighlightedText text={sub.content} query={searchQuery} />
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Official DPO & Support Contact Card */}
            <div className="bg-[#15171A] text-white p-6 sm:p-8 border-l-4 border-l-[#10B981] shadow-xs space-y-4">
              <div className="flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-[#10B981] font-bold">
                <ShieldCheck size={18} weight="bold" />
                <span>EXECUTIVE DATA PROTECTION CONTACT</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl uppercase tracking-tight text-white">
                Exercise Your Privacy Rights
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#A0A4AB] leading-relaxed">
                To submit a Subject Access Request (SAR), request account or registration data erasure, or report privacy inquiries, contact our Data Protection Officer:
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono text-xs">
                <a
                  href="mailto:support@speedymealservices.com"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#25282F] border border-[#3A3F4A] text-white hover:bg-white hover:text-ink transition-colors"
                >
                  <EnvelopeSimple size={15} weight="bold" className="text-red" />
                  <span>support@speedymealservices.com</span>
                </a>
                <div className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#25282F] border border-[#3A3F4A] text-[#A0A4AB]">
                  <MapPin size={15} weight="bold" className="text-[#10B981]" />
                  <span>Jurisdiction: Karachi, Pakistan</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs print:hidden">
              <div className="text-[#5B5F66]">
                Speedy Meals Delivery Services &middot; Operated by DiscoverTheTech
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
