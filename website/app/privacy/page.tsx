'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUp,
  ShieldCheck,
  LockKey,
  Eye,
  Trash,
  EnvelopeSimple,
  CaretRight,
  CheckCircle,
  WarningCircle,
  FileText,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';

interface LegalSection {
  id: string;
  number: string;
  title: string;
}

const SECTIONS: LegalSection[] = [
  { id: 'section-1', number: '01', title: 'Who We Are & What This Covers' },
  { id: 'section-2', number: '02', title: 'Summary in Plain Language' },
  { id: 'section-3', number: '03', title: 'Data We Collect' },
  { id: 'section-4', number: '04', title: 'Why We Use Your Data' },
  { id: 'section-5', number: '05', title: 'Who We Share Data With' },
  { id: 'section-6', number: '06', title: 'Contacting You & Marketing' },
  { id: 'section-7', number: '07', title: 'How Long We Keep Your Data' },
  { id: 'section-8', number: '08', title: 'Your Rights & Choices' },
  { id: 'section-9', number: '09', title: 'Data Deletion' },
  { id: 'section-10', number: '10', title: 'How We Protect Your Data' },
  { id: 'section-11', number: '11', title: 'Cookies & Tracking Technologies' },
  { id: 'section-12', number: '12', title: 'Children & Minors Policy' },
  { id: 'section-13', number: '13', title: 'Data Storage & Cross-Border Transfers' },
  { id: 'section-14', number: '14', title: 'What Will Change at Launch' },
  { id: 'section-15', number: '15', title: 'Third-Party Links & Services' },
  { id: 'section-16', number: '16', title: 'Policy Amendments & Updates' },
  { id: 'section-17', number: '17', title: 'Contact Information & Complaints' },
];

export default function PrivacyPolicyPage() {
  const [activeSectionId, setActiveSectionId] = useState<string>('section-1');

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

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
            <span className="font-mono text-[11px] text-[#8C9099] hidden md:inline">
              speedymealservices.com
            </span>
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
            <div className="space-y-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-red/10 border border-red/20 text-red text-[10px] font-mono font-bold uppercase tracking-widest mb-2">
                  <ShieldCheck size={14} weight="bold" />
                  <span>DATA PROTECTION SPEC</span>
                </div>
                <h2 className="font-heading text-lg font-bold text-ink uppercase tracking-tight">
                  Privacy Policy
                </h2>
                <p className="font-mono text-xs text-ink-soft mt-1">
                  Version 1.0 (Effective September 2026)
                </p>
              </div>

              {/* Quick Jump List */}
              <nav className="space-y-0.5 pt-2 border-t border-line" aria-label="Privacy sections">
                {SECTIONS.map((sec) => {
                  const isActive = activeSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center justify-between group ${
                        isActive
                          ? 'bg-ink text-white font-bold'
                          : 'text-ink-soft hover:text-ink hover:bg-white'
                      }`}
                    >
                      <span className="flex items-center space-x-2 truncate">
                        <span className={`opacity-60 ${isActive ? 'text-red' : ''}`}>
                          {sec.number}
                        </span>
                        <span className="truncate">{sec.title}</span>
                      </span>
                      <CaretRight
                        size={12}
                        weight="bold"
                        className={`transition-transform duration-150 ${
                          isActive ? 'text-red translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              {/* Regulatory Quick Summary Box */}
              <div className="p-4 border border-line bg-white mt-4 space-y-3 font-mono text-[11px]">
                <div className="flex items-center space-x-2 text-ink font-bold uppercase tracking-wider">
                  <LockKey size={16} className="text-red" weight="bold" />
                  <span>Data Protection Standard</span>
                </div>
                <p className="text-ink-soft leading-relaxed">
                  Speedy Meals Delivery Services enforces strict compliance with Pakistani data laws, PECA regulations, and zero selling of personal data.
                </p>
                <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[#8C9099]">
                  <span>Data Inquiries:</span>
                  <a
                    href="mailto:support@speedymealservices.com"
                    className="text-red hover:underline font-bold"
                  >
                    Email Support
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Document Content */}
          <article className="lg:col-span-8 bg-white border border-line p-6 sm:p-10 shadow-sm space-y-12 leading-relaxed">
            {/* Document Title Header */}
            <div className="border-b border-line pb-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-ink text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                  OFFICIAL LEGAL DOCUMENT
                </span>
                <span className="px-2.5 py-1 bg-paper-off border border-line text-ink-soft font-mono text-[10px] uppercase tracking-wider">
                  VERSION: 1.0
                </span>
                <span className="px-2.5 py-1 bg-[#10B981]/10 border border-[#10B981]/30 text-[#059669] font-mono text-[10px] uppercase font-bold tracking-wider">
                  STATUS: PRE-LAUNCH COMPLIANT
                </span>
              </div>

              <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-ink uppercase tracking-tight">
                Speedy Meals - Privacy Policy
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-xs text-ink-soft pt-2">
                <div>
                  <span className="font-semibold text-ink">Entity:</span> Speedy Meals Delivery Services (Pakistan)
                </div>
                <div>
                  <span className="font-semibold text-ink">Effective Date:</span> September 2026
                </div>
              </div>

              <div className="p-4 bg-paper-off border-l-4 border-red text-xs space-y-1.5 font-mono text-ink-soft">
                <div className="font-bold text-ink flex items-center space-x-1.5">
                  <WarningCircle size={15} className="text-red" weight="bold" />
                  <span>PRE-LAUNCH OPERATIONAL NOTICE</span>
                </div>
                <p>
                  Speedy Meals is currently in its pre-launch phase. At present, users can register their interest in becoming a Customer, Rider, or Restaurant Partner. Food ordering and live delivery services have not yet commenced. This Policy details how we handle pre-launch interest data today, and describes in Section 14 the comprehensive operational data disclosures that will apply upon full launch.
                </p>
              </div>
            </div>

            {/* SECTION 1 */}
            <section id="section-1" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">01</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Who We Are and What This Policy Covers
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                This Privacy Policy explains how <strong>Speedy Meals Delivery Services</strong>, a business registered in Pakistan and trading as <strong>Speedy Meals</strong> (&quot;Speedy Meals&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), collects, uses, shares, stores, and protects your personal data when you visit our website (www.speedymealservices.com) or interact with our services.
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">
                This Policy forms an integral part of our Terms and Conditions. Any defined terms not specifically defined in this Policy carry the respective meanings established in our Terms of Use.
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">
                <strong>Current Status:</strong> Speedy Meals is in an active pre-launch onboarding phase. Today, individuals and business entities can register their interest in partnering with us as a Customer, Rider, or Restaurant Partner. Full delivery operations have not commenced. This document transparently describes how data is handled now, and outlines in Section 14 how data handling expands at service launch.
              </p>
            </section>

            {/* SECTION 2 */}
            <section id="section-2" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">02</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Summary in Plain Language
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                We believe in full clarity and straightforward communication. The table below answers the most frequent privacy questions in plain language:
              </p>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3 w-1/2 border-r border-line">Question</th>
                      <th className="p-3 w-1/2">Speedy Meals Plain Answer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-soft">
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Does the mobile application collect my personal data right now?
                      </td>
                      <td className="p-3">
                        No. The pre-launch application displays a informational landing screen and launches our official Website in your device browser. It does not collect personal information.
                      </td>
                    </tr>
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Where is my data collected?
                      </td>
                      <td className="p-3">
                        Directly on our secure Website, only when you fill out and submit our voluntary pre-launch registration form.
                      </td>
                    </tr>
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        What exact details do you collect?
                      </td>
                      <td className="p-3">
                        The explicit fields entered on the form (name, mobile number, city or operating zone, selected persona, and commercial details if registering as a restaurant) plus essential technical transmission data.
                      </td>
                    </tr>
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Do you ask for CNIC, driving license, or identity documents now?
                      </td>
                      <td className="p-3">
                        No. Official identity verification documents are requested only after formal operational launch when verified user accounts are provisioned.
                      </td>
                    </tr>
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Do you sell my personal data?
                      </td>
                      <td className="p-3 font-bold text-ink">
                        Never. We do not sell, rent, or trade your personal data to any advertisers or third-party brokers.
                      </td>
                    </tr>
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Can I delete my data and cancel my registration?
                      </td>
                      <td className="p-3">
                        Yes, immediately at any time. Simply send an email request to{' '}
                        <a href="mailto:support@speedymealservices.com" className="text-red underline font-bold">
                          support@speedymealservices.com
                        </a>.
                      </td>
                    </tr>
                    <tr className="hover:bg-paper-off/50 transition-colors">
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        How long do you retain pre-launch registration data?
                      </td>
                      <td className="p-3">
                        Up to 12 months if an application is not approved or if service has not commenced, unless an earlier deletion request is made.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 3 */}
            <section id="section-3" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">03</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Data We Collect
                </h2>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-bold text-ink uppercase tracking-wider">
                  3.1 Data You Voluntarily Provide on the Website
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  When you submit the registration form on our website, we collect only the explicit information requested:
                </p>
                <ul className="list-disc list-inside text-sm text-ink-soft space-y-1 pl-2">
                  <li>Your full name;</li>
                  <li>Your mobile contact number;</li>
                  <li>Your primary city or geographical operating zone;</li>
                  <li>Your selected partnership role (Customer, Rider, or Restaurant Partner) and, for restaurant partners, business information such as trade name and branch location;</li>
                  <li>Any optional messages, operational notes, or feedback you choose to send us.</li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-heading text-sm font-bold text-ink uppercase tracking-wider">
                  3.2 Data Collected Automatically on the Website
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  When you access or browse our Website, our servers automatically log essential technical diagnostic telemetry necessary to maintain infrastructure stability and defend against cybersecurity threats:
                </p>
                <ul className="list-disc list-inside text-sm text-ink-soft space-y-1 pl-2">
                  <li>IP address, browser user-agent string, device type, and operating system;</li>
                  <li>Page access timestamps, referrers, and diagnostic session identifiers;</li>
                  <li>Security logs, rate-limit counters, and anomaly detection records.</li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-heading text-sm font-bold text-ink uppercase tracking-wider">
                  3.3 Records of Consent and Communications
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  We securely record your formal acceptance of our Terms of Use and this Privacy Policy, including policy versions, timestamps, and IP addresses. We also retain correspondence sent to our support email addresses to ensure prompt service resolution.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-heading text-sm font-bold text-ink uppercase tracking-wider">
                  3.4 Mobile Application Telemetry Disclosures
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Our pre-launch mobile application does not collect, store, or transmit personal data. It does not employ third-party advertising SDKs or tracking frameworks. The application requests solely the basic internet connectivity permission to launch our official website in your default device browser. It does not request access to device contacts, camera, audio hardware, SMS messages, fine background location, or external storage.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-heading text-sm font-bold text-ink uppercase tracking-wider">
                  3.5 Data Exclusions During Pre-Launch
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  At this pre-launch stage, Speedy Meals strictly does <strong>not</strong> collect: government identity documents (CNIC numbers or physical scans), driving licenses, personal photographs, precise live GPS coordinates, bank account credentials, credit/debit card numbers, or contact lists.
                </p>
              </div>
            </section>

            {/* SECTION 4 */}
            <section id="section-4" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">04</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Why We Use Your Data
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                We process your information exclusively for legitimate, defined business purposes under transparent operational standards:
              </p>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3 w-1/2 border-r border-line">Operational Purpose</th>
                      <th className="p-3 w-1/2">Data Elements Employed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-soft">
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Review, verify, and administer pre-launch registrations
                      </td>
                      <td className="p-3">Submitted form inputs, role selections, and consent audit logs</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Notify users of onboarding status, regional activations, and launch
                      </td>
                      <td className="p-3">Full name, mobile telephone number, and provided email</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Prevent fake registrations, automated spam bots, and platform abuse
                      </td>
                      <td className="p-3">Form details, IP address telemetry, and server security logs</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Respond to support inquiries, user questions, and feedback
                      </td>
                      <td className="p-3">Direct user emails, messages, and associated contact metadata</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Maintain legal verification of policy consent
                      </td>
                      <td className="p-3">Cryptographic records of terms acceptance and timestamp data</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Model regional route demand and optimize delivery territory logistics
                      </td>
                      <td className="p-3">City or zone details in aggregated, anonymized statistical form</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Comply with Pakistani taxation, regulatory, and law-enforcement mandates
                      </td>
                      <td className="p-3">Data strictly as legally subpoenaed or statutorily mandated</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 5 */}
            <section id="section-5" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">05</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Who We Share Data With
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                Speedy Meals does not sell, commercialize, or lease your personal information. We share data only under strictly governed circumstances:
              </p>
              <ul className="list-disc list-inside text-sm text-ink-soft space-y-2 pl-2">
                <li>
                  <strong>Authorized Service Providers:</strong> Trusted enterprise infrastructure vendors who assist in hosting our website, database persistence, SMS routing, and transaction monitoring. All providers process data strictly under non-disclosure obligations and our direct technical instructions.
                </li>
                <li>
                  <strong>Legal and Public Safety Disclosures:</strong> When compelled by valid judicial subpoenas, court orders, or statutory requests from recognized Pakistani regulatory bodies or law enforcement authorities, or where necessary to prevent fraud or protect public safety.
                </li>
                <li>
                  <strong>Corporate Reorganization:</strong> In the event of a merger, acquisition, corporate restructuring, or asset transition, subject to continuous data protection assurances and advance user notification.
                </li>
                <li>
                  <strong>Explicit User Consent:</strong> When you provide express affirmative permission to share data with a designated partner.
                </li>
              </ul>
              <p className="text-sm text-ink-soft leading-relaxed">
                Internal employee access to user data is restricted on a strict need-to-know basis and protected by multi-factor authentication.
              </p>
            </section>

            {/* SECTION 6 */}
            <section id="section-6" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">06</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Contacting You and Marketing
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                We may reach out to you via telephone, WhatsApp, SMS, or email regarding your registration status, verification milestones, and regional service activations.
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">
                Direct marketing or promotional campaigns are dispatched only to individuals who have opted in. You maintain an absolute right to opt out of marketing at any time by replying &quot;STOP&quot; to any message or emailing{' '}
                <a href="mailto:support@speedymealservices.com" className="text-red underline font-semibold">
                  support@speedymealservices.com
                </a>.
              </p>
              <p className="text-xs text-[#8C9099] font-mono leading-relaxed">
                Please note that unsubscribing from marketing does not disable mandatory operational notices, such as account security alerts, policy revisions, or registration verification confirmations.
              </p>
            </section>

            {/* SECTION 7 */}
            <section id="section-7" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">07</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  How Long We Keep Your Data
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                We retain personal data only for the durations necessary to fulfill the specific purposes outlined in this Policy:
              </p>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3 w-1/2 border-r border-line">Data Category</th>
                      <th className="p-3 w-1/2">Applicable Retention Horizon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-soft">
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Pre-Launch Registration Data (Unapproved or Pending Launch)
                      </td>
                      <td className="p-3">
                        Retained up to 12 months from registration, or deleted earlier upon user request.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Registration Data of Approved Network Partners
                      </td>
                      <td className="p-3">
                        Maintained through launch onboarding and migrated into active operational account records.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Legal and Policy Consent Records
                      </td>
                      <td className="p-3">
                        Preserved for the duration necessary to substantiate contractual compliance and resolve disputes.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Diagnostic Telemetry and Security Logs
                      </td>
                      <td className="p-3">
                        Purged routinely on rolling intervals once security audits and diagnostics conclude.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Customer Support Correspondence
                      </td>
                      <td className="p-3">
                        Retained for 12 months following ticket resolution to verify support quality.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 8 */}
            <section id="section-8" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">08</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Your Rights and Choices
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                Under applicable data protection principles, you are entitled to exercise full control over your personal records:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-mono text-xs">
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-1">1. Right of Access</span>
                  <span className="text-ink-soft">Request a comprehensive copy of all personal records we hold regarding your profile.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-1">2. Right of Rectification</span>
                  <span className="text-ink-soft">Request immediate correction of erroneous, incomplete, or outdated information.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-1">3. Right of Erasure</span>
                  <span className="text-ink-soft">Direct us to permanently delete your registration and operational records.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-1">4. Right to Withdraw</span>
                  <span className="text-ink-soft">Revoke consent to communications and cancel your waitlist expression at any point.</span>
                </div>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed pt-2">
                To exercise any of these statutory rights, email{' '}
                <a href="mailto:support@speedymealservices.com" className="text-red font-bold underline">
                  support@speedymealservices.com
                </a>{' '}
                from your registered email address or mobile number. We aim to complete all verified requests within 30 calendar days.
              </p>
            </section>

            {/* SECTION 9 */}
            <section id="section-9" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">09</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Data Deletion Protocol
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                You possess an unconditional right to request total deletion of your submitted registration data and withdraw from our onboarding program at any time.
              </p>
              
              <div className="p-4 border border-line bg-paper-off space-y-3 font-mono text-xs">
                <div className="font-bold text-ink uppercase tracking-wider flex items-center space-x-1.5">
                  <Trash size={15} className="text-red" weight="bold" />
                  <span>How to Request Permanent Deletion</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-ink-soft">
                  <li>
                    Compose an email to{' '}
                    <strong className="text-ink">support@speedymealservices.com</strong> with the subject line: &quot;Delete my data&quot;.
                  </li>
                  <li>
                    Specify the exact full name, mobile number, and city you used on the registration form.
                  </li>
                  <li>
                    Our security desk will verify identity credentials to protect against unauthorized account tampering.
                  </li>
                  <li>
                    Upon verification, we permanently purge or anonymize all associated records and issue written confirmation.
                  </li>
                </ol>
              </div>
              <p className="text-xs text-[#8C9099] font-mono leading-relaxed">
                Executing a complete deletion request terminates your pre-launch registration. Should you decide to join Speedy Meals in the future, a fresh registration will be required.
              </p>
            </section>

            {/* SECTION 10 */}
            <section id="section-10" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">10</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  How We Protect Your Data
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                We maintain enterprise-grade technical, cryptographic, and administrative safeguards designed to shield personal data against unauthorized interception, loss, or alteration:
              </p>
              <ul className="list-disc list-inside text-sm text-ink-soft space-y-1.5 pl-2">
                <li>
                  <strong>Transport Security:</strong> Strict HTTPS / TLS 1.3 encryption across all website communications and form transmissions;
                </li>
                <li>
                  <strong>Access Architecture:</strong> Role-based access controls with principle-of-least-privilege enforcement;
                </li>
                <li>
                  <strong>Intrusion Defense:</strong> Automated rate-limiting, web application firewall filtering, and intrusion prevention monitoring;
                </li>
                <li>
                  <strong>Data at Rest:</strong> Encrypted database storage with automated redundant backups and physical data center protections.
                </li>
              </ul>
              <p className="text-xs text-[#8C9099] font-mono leading-relaxed">
                While we deploy industry-standard countermeasures, no internet transmission is 100% immune from compromise. In the improbable event of a security breach affecting your records, we will notify you and relevant authorities in full accordance with applicable law.
              </p>
            </section>

            {/* SECTION 11 */}
            <section id="section-11" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">11</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Cookies and Similar Technologies
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                The Speedy Meals website uses only essential session tokens and technical cookies necessary to preserve user interface state, support form validation, and defend against cross-site request forgery attacks.
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">
                We do not employ third-party behavioral profiling cookies or ad retargeting trackers. If non-essential analytics tools are introduced in the future, this policy will be updated and affirmative user consent will be solicited where legally mandated.
              </p>
            </section>

            {/* SECTION 12 */}
            <section id="section-12" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">12</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Children and Minors Policy
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                The Speedy Meals platform and its services are strictly intended for individuals who are at least eighteen (18) years of age. We do not knowingly collect personal data from minors. If you believe that an individual under 18 has submitted personal details through our platform, please alert us immediately at{' '}
                <a href="mailto:support@speedymealservices.com" className="text-red font-bold underline">
                  support@speedymealservices.com
                </a>
                , and our team will promptly expunge the data.
              </p>
            </section>

            {/* SECTION 13 */}
            <section id="section-13" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">13</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Storage Location and Transfers Outside Pakistan
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                Our infrastructure and trusted cloud hosting providers utilize enterprise-tier servers that may be located in regional hubs outside Pakistan. In every instance of cross-border data transfer, Speedy Meals enforces standard contractual clauses and robust encryption to ensure your data receives protection equivalent to Pakistani statutory standards.
              </p>
            </section>

            {/* SECTION 14 */}
            <section id="section-14" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">14</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  What Will Change at Full Operational Launch
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                When Speedy Meals officially initiates live food ordering and dispatch operations, data handling will encompass the operational lifecycle. This Policy will be refreshed prior to full deployment, and all users will be prompted to review and accept the comprehensive operational disclosures:
              </p>

              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3 w-1/3 border-r border-line">User Persona</th>
                      <th className="p-3 w-2/3">Data Disclosures at Launch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-soft">
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Customers
                      </td>
                      <td className="p-3">
                        Name, delivery street addresses, precise drop-off coordinates, historical order receipts, delivery ratings, and payment transaction tokens (managed by licensed payment gateways).
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Delivery Riders
                      </td>
                      <td className="p-3">
                        Identity documents (CNIC copy, valid driving license, vehicle registration papers), verified rider portrait, real-time GPS telemetry while on duty, wallet balances, cash collection logs, and payout banking/wallet details.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Restaurant Partners
                      </td>
                      <td className="p-3">
                        Food authority licensing certificates, business registration proof, commercial kitchen menus, daily sales figures, and corporate bank settlement accounts.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 15 */}
            <section id="section-15" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">15</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Third-Party Links and External Portals
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                Our application and website may provide links to external websites, services, or social networks. Speedy Meals does not endorse and is not responsible for the independent privacy practices or content of third-party platforms. We encourage you to review their specific privacy policies before providing personal information.
              </p>
            </section>

            {/* SECTION 16 */}
            <section id="section-16" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">16</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Changes to This Privacy Policy
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                We reserve the right to revise or amend this Privacy Policy as our services develop or as statutory mandates evolve. The revised edition will be published on our website accompanied by an updated version number and effective date. In the event of material alterations, notice will be provided via email or a prominent banner. Continued use of our platform following notice constitutes acceptance of the amended terms.
              </p>
            </section>

            {/* SECTION 17 */}
            <section id="section-17" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">17</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Contact Information and Inquiries
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                For privacy questions, statutory access or deletion requests, or formal inquiries regarding this document, please communicate directly with our Data Protection Desk:
              </p>

              <div className="p-4 border border-line bg-paper-off space-y-2 font-mono text-xs">
                <div className="font-bold text-ink uppercase tracking-wider">
                  Speedy Meals Delivery Services - Legal &amp; Data Desk
                </div>
                <div className="text-ink-soft">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:support@speedymealservices.com" className="text-red underline font-bold">
                    support@speedymealservices.com
                  </a>
                </div>
                <div className="text-ink-soft">
                  <strong>Official Website:</strong>{' '}
                  <a href="https://www.speedymealservices.com" className="text-ink underline">
                    www.speedymealservices.com
                  </a>
                </div>
                <div className="text-[#8C9099] pt-2 border-t border-line/60">
                  Acknowledgement within 24 hours. Formal response for data requests provided within 30 days. Governed by the laws of the Islamic Republic of Pakistan.
                </div>
              </div>
            </section>

            {/* Back to top button */}
            <div className="pt-8 border-t border-line flex items-center justify-between">
              <Link
                href="/terms"
                className="text-xs font-mono font-bold text-red hover:underline uppercase tracking-wider flex items-center space-x-1"
              >
                <span>Read Terms &amp; Conditions</span>
                <CaretRight size={13} weight="bold" />
              </Link>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-line bg-paper-off hover:bg-ink hover:text-white transition-colors text-xs font-mono font-bold uppercase tracking-wider text-ink"
              >
                <ArrowUp size={13} weight="bold" />
                <span>Back to Top</span>
              </button>
            </div>
          </article>
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
