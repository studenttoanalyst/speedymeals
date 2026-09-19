'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUp,
  ShieldCheck,
  Scales,
  WarningCircle,
  FileText,
  EnvelopeSimple,
  CaretRight,
  CheckCircle,
  CurrencyCircleDollar,
  Handshake,
  Bicycle,
  Storefront,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';

interface LegalSection {
  id: string;
  number: string;
  title: string;
}

const SECTIONS: LegalSection[] = [
  { id: 'section-intro', number: '00', title: 'Introduction & Structure' },
  { id: 'section-definitions', number: '01', title: 'Key Definitions' },
  { id: 'section-part-a', number: '02', title: 'Part A: General Terms' },
  { id: 'section-part-b', number: '03', title: 'Part B: Pre-Launch Registration' },
  { id: 'section-part-c', number: '04', title: 'Part C: Customer Terms' },
  { id: 'section-part-d', number: '05', title: 'Part D: Rider Terms' },
  { id: 'section-part-e', number: '06', title: 'Part E: Restaurant Partner Terms' },
  { id: 'section-schedule-1', number: '07', title: 'Schedule 1: Rates & Limits' },
  { id: 'section-schedule-2', number: '08', title: 'Schedule 2: Failed Order Allocation' },
  { id: 'section-compliance', number: '09', title: 'Compliance with Pakistani Laws' },
];

export default function TermsOfUsePage() {
  const [activeSectionId, setActiveSectionId] = useState<string>('section-intro');

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
                  <Scales size={14} weight="bold" />
                  <span>REGULATORY CODE</span>
                </div>
                <h2 className="font-heading text-lg font-bold text-ink uppercase tracking-tight">
                  Terms &amp; Conditions
                </h2>
                <p className="font-mono text-xs text-ink-soft mt-1">
                  Version 1.1 (Effective September 2026)
                </p>
              </div>

              {/* Quick Jump List */}
              <nav className="space-y-0.5 pt-2 border-t border-line" aria-label="Legal sections">
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

              {/* Quick Summary / Legal Info Card */}
              <div className="p-4 border border-line bg-white mt-4 space-y-3 font-mono text-[11px]">
                <div className="flex items-center space-x-2 text-ink font-bold uppercase tracking-wider">
                  <ShieldCheck size={16} className="text-red" weight="bold" />
                  <span>Enforceability Notice</span>
                </div>
                <p className="text-ink-soft leading-relaxed">
                  These Terms constitute a legally binding agreement under the Electronic Transactions Ordinance and Contract Act of Pakistan. All riders, customers, and restaurants are required to comply.
                </p>
                <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[#8C9099]">
                  <span>Privacy Policy:</span>
                  <Link href="/privacy" className="text-red hover:underline font-bold">
                    View Privacy
                  </Link>
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
                  VERSION: 1.1
                </span>
                <span className="px-2.5 py-1 bg-[#10B981]/10 border border-[#10B981]/30 text-[#059669] font-mono text-[10px] uppercase font-bold tracking-wider">
                  STATUS: PRE-LAUNCH ACTIVE
                </span>
              </div>

              <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-ink uppercase tracking-tight">
                Speedy Meals - Terms and Conditions
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
                  Speedy Meals is currently in its pre-launch phase. At present, the Platform allows people to register their interest in becoming a Customer, Rider, or Restaurant Partner. Food ordering and delivery services have not yet started. <strong>Part B applies now. Parts C, D, and E apply only from the Launch Date.</strong>
                </p>
              </div>
            </div>

            {/* SECTION 00: INTRO & STRUCTURE */}
            <section id="section-intro" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">00</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Introduction, Acceptance &amp; Organisation
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                These Terms and Conditions govern your access to and use of the Platform and the services made available through it. The Platform is operated by <strong>Speedy Meals Delivery Services</strong>, a business registered in Pakistan, trading under the brand <strong>Speedy Meals</strong> (&quot;Speedy Meals&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">
                By registering your interest, accessing or using the Platform, you confirm that you have read, understood, and agree to these Terms and to our Privacy Policy, available on our website. If you do not agree, you must not use the Platform.
              </p>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  How These Terms Are Organised
                </h3>
                <div className="overflow-x-auto border border-line">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-3 border-r border-line">Part</th>
                        <th className="p-3 border-r border-line">Applies To</th>
                        <th className="p-3">When Effective</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink-soft">
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Part A: General Terms</td>
                        <td className="p-3 border-r border-line">All users</td>
                        <td className="p-3 font-semibold text-[#059669]">Now</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Part B: Pre-Launch Registration Terms</td>
                        <td className="p-3 border-r border-line">Everyone who registers interest</td>
                        <td className="p-3 font-semibold text-[#059669]">Now, until the Launch Date</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Part C: Customer Terms</td>
                        <td className="p-3 border-r border-line">Customers placing orders</td>
                        <td className="p-3 text-ink-soft">From the Launch Date</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Part D: Rider Terms</td>
                        <td className="p-3 border-r border-line">Delivery riders</td>
                        <td className="p-3 text-ink-soft">From the Launch Date</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Part E: Restaurant Partner Terms</td>
                        <td className="p-3 border-r border-line">Restaurant partners</td>
                        <td className="p-3 text-ink-soft">From the Launch Date</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Schedule 1: Key Rates and Limits</td>
                        <td className="p-3 border-r border-line">All users</td>
                        <td className="p-3 text-ink-soft">From the Launch Date</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">Schedule 2: Failed Order Allocation</td>
                        <td className="p-3 border-r border-line">All users</td>
                        <td className="p-3 text-ink-soft">From the Launch Date</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[#8C9099] font-mono">
                  If Part A conflicts with Part B, C, D, or E, the more specific Part applies to the user it addresses.
                </p>
              </div>
            </section>

            {/* SECTION 01: DEFINITIONS */}
            <section id="section-definitions" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">01</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Key Definitions
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Customer&quot;</span>
                  <span className="text-ink-soft">A person who uses the Platform to place an Order.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Restaurant Partner&quot;</span>
                  <span className="text-ink-soft">An independently operated restaurant or food business listed on the Platform.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Rider&quot;</span>
                  <span className="text-ink-soft">An independent delivery provider approved by Speedy Meals to deliver Orders.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Order&quot;</span>
                  <span className="text-ink-soft">A request by a Customer for food and related items from a Restaurant Partner, including its delivery.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Food Subtotal&quot;</span>
                  <span className="text-ink-soft">The price of the items in an Order, excluding the Delivery Fee and taxes.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Delivery Fee&quot;</span>
                  <span className="text-ink-soft">The fee for delivering an Order, calculated under Clause C3 (Base Fee + Distance x Per-KM Rate).</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;COD&quot;</span>
                  <span className="text-ink-soft">Cash on Delivery.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Digital Payment&quot;</span>
                  <span className="text-ink-soft">Payment made through the Platform by an approved online payment method.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Wallet&quot;</span>
                  <span className="text-ink-soft">A Rider&apos;s prepaid operational balance held with Speedy Meals under Part D.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Kit Deposit&quot;</span>
                  <span className="text-ink-soft">The refundable security amount paid by a Rider for Speedy Meals-issued equipment under Clause D5.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Pending Cash&quot;</span>
                  <span className="text-ink-soft">COD cash collected by a Rider from Customers and not yet deposited with Speedy Meals.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off">
                  <span className="font-bold text-ink block mb-0.5">&quot;Registration&quot;</span>
                  <span className="text-ink-soft">The pre-launch registration of interest submitted through the website under Part B.</span>
                </div>
                <div className="p-3 border border-line bg-paper-off md:col-span-2">
                  <span className="font-bold text-ink block mb-0.5">&quot;Launch Date&quot;</span>
                  <span className="text-ink-soft">The date on which Speedy Meals begins offering live ordering and delivery services and announces this on the Platform or by direct notice.</span>
                </div>
              </div>
            </section>

            {/* SECTION 02: PART A - GENERAL TERMS */}
            <section id="section-part-a" className="space-y-5 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">02</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Part A: General Terms (Applies to All Users)
                </h2>
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A1. About Speedy Meals
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A1.1</strong> Speedy Meals is a technology and logistics platform. It connects Customers with independent Restaurant Partners and Riders for the ordering and delivery of food.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A1.2</strong> Speedy Meals does not prepare, cook, or inspect food, and is not the producer or seller of food unless expressly stated. Restaurant Partners and Riders are independent businesses or contractors. They are not employees, agents, or partners of Speedy Meals.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A2. Eligibility and Accounts
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A2.1</strong> You must be at least 18 years old, or a legal entity acting through an authorised representative, to use the Platform.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A2.2</strong> From the Launch Date, you must create an account using accurate information, including a valid mobile number. Access is by one-time password (OTP) or, for Restaurant Partners, email and password. Registration under Part B does not create an account.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A2.3</strong> You are responsible for keeping your login credentials confidential and for all activity under your account, except where you can show fraud that is not attributable to you. Notify us immediately of any unauthorised use.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A2.4</strong> Speedy Meals is not liable for delivery failures caused by incomplete, incorrect, or outdated information you provide, including your address and contact number.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A2.5</strong> Speedy Meals may carry out identity and background verification on Riders and Restaurant Partners at onboarding and afterwards, and may suspend or terminate an account that fails verification.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A3. Acceptable Use Restrictions
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A3.1</strong> You must not:
                </p>
                <ul className="list-disc list-inside text-sm text-ink-soft space-y-1 pl-2">
                  <li>use the Platform for any unlawful, fraudulent, or deceptive purpose;</li>
                  <li>impersonate any person or entity, or provide false information or documents;</li>
                  <li>post or transmit content that is unlawful, obscene, defamatory, threatening, abusive, or infringes the rights of others;</li>
                  <li>harass, threaten, or abuse any Customer, Rider, Restaurant Partner, or Speedy Meals staff;</li>
                  <li>harvest or misuse the personal data of other users;</li>
                  <li>interfere with, reverse-engineer, or attempt to gain unauthorised access to the Platform, or submit automated or bulk registrations;</li>
                  <li>circumvent the Platform&apos;s payment, Wallet, or commission systems, including by arranging off-Platform transactions with a person introduced through the Platform to avoid fees.</li>
                </ul>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A3.2</strong> Speedy Meals may investigate suspected violations, monitor Platform activity for safety, fraud, and compliance purposes, remove content, and restrict or suspend access.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A4. Intellectual Property
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  The &quot;Speedy Meals&quot; name, logo, brand elements, and Platform content belong to Speedy Meals or its licensors. You may not copy, reproduce, or use them without our prior written consent. Restaurant Partners grant Speedy Meals a non-exclusive licence to display their names, logos, menus, and images on the Platform for the purpose of providing the services.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A5. Privacy and Data
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A5.1</strong> We collect and process personal data as described in our Privacy Policy, which forms part of these Terms.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A5.2</strong> From the Launch Date, to fulfil an Order: the assigned Rider&apos;s name, phone number, and live location are visible to the Customer; the Customer&apos;s name, phone number, and delivery address are visible to the Restaurant Partner and Rider.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A5.3</strong> Rider and Restaurant Partner identity and business documents (such as CNIC, licence, vehicle, and food-business documents) are collected at verification after the Launch Date, stored securely, and used only for verification, fraud prevention, and legal compliance.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A5.4</strong> Speedy Meals does not sell personal data. We may share data with service providers who help us operate the Platform (such as hosting, payment, mapping, and messaging providers), and with law enforcement or regulators where legally required.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A5.5</strong> By using the Platform you consent to receive OTP, service, and onboarding messages by SMS, WhatsApp, phone call, or email. Marketing messages are sent only if you opt in, and you may opt out at any time.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A5.6 Data Deletion:</strong> You may ask us to delete your personal data and any account at any time by emailing support@speedymealservices.com from your registered contact, or by using any deletion request option we provide. We will act on verified requests within a reasonable time. We may retain limited data where needed for fraud prevention, security, resolving disputes, tax or accounting records, or legal compliance, and only for as long as necessary.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A6. Third-Party Services
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  The Platform relies on third-party services, including hosting, payment gateways, and mapping services. Speedy Meals is not responsible for the content, security, or practices of third parties. Links to third-party sites are provided for convenience only.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A7. Disclaimers and Limitation of Liability
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A7.1</strong> The Platform is provided &quot;as is&quot; and &quot;as available&quot;. Speedy Meals does not guarantee that it will be uninterrupted or error-free.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A7.2</strong> To the maximum extent permitted by law, Speedy Meals excludes liability for indirect or consequential loss. Where Speedy Meals is found liable, its total liability for a claim relating to an Order is limited to the value of that Order.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A7.3</strong> Nothing in these Terms excludes or limits liability for fraud, for death or personal injury caused by negligence, or for any liability that cannot be excluded under applicable law.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A7.4</strong> Restaurant Partners and Riders act independently and are responsible for their own conduct. Speedy Meals is not liable for their unlawful acts. Speedy Meals will suspend or terminate involved accounts and cooperate with law enforcement. This clause does not limit Speedy Meals&apos; own responsibilities stated in Clause C9.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A8. Indemnity
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  You agree to compensate Speedy Meals for losses, claims, and reasonable costs arising from your breach of these Terms, your unlawful use of the Platform, or your infringement of third-party rights.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A9. Suspension and Termination
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A9.1</strong> Speedy Meals may restrict, suspend, or terminate access, or reject or remove a registration or account, where it reasonably believes that someone other than the account holder is using it, these Terms have been breached, verification was unsatisfactory, or fraudulent conduct is suspected.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A9.2</strong> Speedy Meals may act without prior notice for serious breaches (including fraud, safety risk, or illegality). You may close your account or withdraw your registration at any time, subject to settlement of amounts owed.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A10. Changes to These Terms
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Speedy Meals may update these Terms. We will post the updated version on the Platform with a new version number and effective date, and will give reasonable notice of material changes. Continued use after the effective date means acceptance.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A11. Force Majeure
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Speedy Meals is not liable for delay or failure caused by events beyond its reasonable control, including natural disasters, severe weather, strikes, civil unrest, government action, power or network failures, or third-party service outages.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A12. General Legal Provisions
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A12.1 Severability:</strong> If any provision is held invalid, the rest remain in force. <strong>A12.2 Entire Agreement:</strong> These Terms and referenced policies are the entire agreement. <strong>A12.3 No Waiver:</strong> A failure to enforce a provision is not a waiver. <strong>A12.4 Language:</strong> The English version prevails over any translation.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A13. Complaints and Dispute Resolution
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A13.1</strong> Raise complaints through support@speedymealservices.com (and in-app Help Center at launch). Speedy Meals acknowledges complaints within 24 hours and aims to respond substantively within 7 working days.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>A13.2</strong> These Terms are governed by the laws of the Islamic Republic of Pakistan. If a dispute is not resolved amicably, the courts of Karachi have exclusive jurisdiction.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A14. Mobile Application (Google Play)
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  These Terms are between you and Speedy Meals only. Google is not a party and has no maintenance or support obligation. During pre-launch, the application acts as a gateway opening the website in your browser and does not collect personal data.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  A15. Official Contacts
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Speedy Meals Delivery Services | Emails: support@speedymealservices.com, info@speedymealservices.com | Website: www.speedymealservices.com
                </p>
              </div>
            </section>

            {/* SECTION 03: PART B - PRE-LAUNCH REGISTRATION */}
            <section id="section-part-b" className="space-y-5 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">03</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Part B: Pre-Launch Registration Terms
                </h2>
              </div>
              <p className="text-xs font-mono text-ink-soft">
                These terms apply to everyone who registers interest through the website or the application before the Launch Date.
              </p>

              <div className="space-y-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  B1. Nature of Registration
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>B1.1</strong> Registration lets you express interest in becoming a Customer, Rider, or Restaurant Partner when services launch. <strong>B1.2</strong> Registration is an expression of interest only. It does not create an account, a contract for services, or any right to use the services. <strong>B1.3</strong> No ordering, delivery, payment, or earning service is available until the Launch Date.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  B2. No Guarantee
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>B2.1</strong> Speedy Meals does not guarantee that your Registration will be approved, that services will launch in your area or by any date, or that you will earn any income or receive any orders. <strong>B2.2</strong> Speedy Meals may accept, waitlist, defer, or reject any Registration at its discretion. <strong>B2.3</strong> Registration does not create any employment, agency, partnership, franchise, or exclusivity relationship.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  B3. Accuracy of Information &amp; B4. One Registration
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  You must provide accurate, complete, and current information belonging to you or a business you represent. Each person may register once for each role using their own mobile number. Duplicate, fake, or automated registrations will be rejected.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  B5. No Fees at Registration
                </h3>
                <div className="p-3 bg-paper-off border border-line font-mono text-xs text-ink-soft space-y-1">
                  <p className="font-bold text-ink">
                    B5.1 Speedy Meals does not charge any fee for Registration.
                  </p>
                  <p>
                    No employee, agent, or third party is authorised to request payment, a deposit, or a &quot;registration fee&quot; from you on our behalf.
                  </p>
                  <p>
                    B5.2 Any Rider Wallet recharge, Kit Deposit, or commission applies only after the Launch Date, after approval, and only as set out in Parts D and E.
                  </p>
                  <p>
                    B5.3 If anyone asks you for money in connection with Registration, report it immediately to support@speedymealservices.com.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  B6. Information Handling &amp; B7. Retention
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  We collect only the fields requested on the registration form and do not request identity or business documents at this stage. If your Registration is not approved, or services have not launched, we retain data for up to 12 months, or delete it earlier upon your request under Clause A5.6.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  B8. Moving to Launch &amp; B9. Discontinuation
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  We will notify you when the Launch Date is confirmed. To use live services, you must create an account and complete verification. Parts C, D, and E do not apply to you until accepted at that stage. Speedy Meals may delay or change the launch without liability for reliance costs (subject to Clause A7.3).
                </p>
              </div>
            </section>

            {/* SECTION 04: PART C - CUSTOMER TERMS */}
            <section id="section-part-c" className="space-y-5 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">04</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Part C: Customer Terms (Applies from Launch Date)
                </h2>
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  C1. Placing an Order &amp; C2. Prices and Taxes
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Orders can be placed only within serviceable areas. Prices are in Pakistani Rupees (PKR) and include applicable taxes where the restaurant is tax-registered. Before checkout, a complete itemised breakdown is displayed: Food Subtotal, Delivery Fee, and Total. Carts from different restaurants are checked out as separate Orders with their own Rider and Delivery Fee.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  C3. Delivery Fee Formula
                </h3>
                <div className="p-3 bg-paper-off border border-line font-mono text-xs text-ink space-y-1">
                  <div className="font-bold text-red">Delivery Fee = Base Fee + (Road Distance in KM x Per-KM Rate)</div>
                  <div className="text-ink-soft">
                    Base Fee: Rs. 100 | Per-KM Rate: Rs. 20 per km. Road distance is calculated via verified mapping services.
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  C4. Payment Methods &amp; COD Rules
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  You may pay by Cash on Delivery (COD) or approved Digital Payment. Digital payment is handled by certified payment gateways. For COD, you pay the Rider the full Order Total in cash on delivery; you must never pay the Restaurant Partner directly. Speedy Meals may disable COD for any account with two (2) or more failed deliveries or suspected fraud.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  C5. Delivery &amp; 10-Minute Waiting Policy
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Delivery times are estimates. Customers must remain reachable at the delivery address. Where delivery fails due to customer unavailability, unreachable phone, wrong address, or refusal to pay COD, the Rider waits up to ten (10) minutes after arrival and logs contact attempts before the Order is cancelled without refund under Schedule 2.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  C6. Cancellation, C7. Refunds &amp; C8. Reporting Issues
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Cancellations are free only before the Restaurant Partner accepts the order. Once accepted, preparation has commenced and cancellation is disallowed except under Schedule 2 causes. Digital refunds are processed within 5-7 working days. COD refunds are remitted via bank transfer or mobile wallet within 5-7 working days. Order issues (missing items, spillage, wrong items) must be reported via in-app support within two (2) hours of delivery with photographic evidence.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  C9. Food Safety and Responsibility Allocation
                </h3>
                <div className="overflow-x-auto border border-line font-mono text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-3 w-1/2 border-r border-line">Order Lifecycle Stage</th>
                        <th className="p-3 w-1/2">Responsible Entity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink-soft">
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">
                          Preparation, ingredients, hygiene, allergens, packing and sealing
                        </td>
                        <td className="p-3 font-bold text-ink">Restaurant Partner</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">
                          Handling and transit (tampering, spillage, unreasonable transit delay)
                        </td>
                        <td className="p-3 font-bold text-ink">Rider</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-ink border-r border-line">
                          Incorrect address, unreachable contact, unavailability to receive
                        </td>
                        <td className="p-3 font-bold text-ink">Customer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-ink-soft">
                  Speedy Meals provides technological matchmaking and logistics management. Food quality, allergen disclosures, and hygiene remain the direct legal responsibility of the preparing restaurant.
                </p>
              </div>
            </section>

            {/* SECTION 05: PART D - RIDER TERMS */}
            <section id="section-part-d" className="space-y-5 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">05</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Part D: Rider Terms (Applies from Launch Date)
                </h2>
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  D1. Independent Status &amp; Compliance with Pakistani Laws
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>D1.1</strong> Riders are independent contractors, not employees or agents of Speedy Meals. Riders control their own hours and may accept or decline delivery requests.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>D1.2</strong> Riders are responsible for their own vehicle, fuel, roadworthiness, licence, insurance, traffic compliance, taxes, and conduct.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed font-semibold text-ink">
                  <strong>D1.3</strong> Riders must strictly follow the laws and regulations of the Government of Pakistan. For any illegal activity, the rider will be personally responsible. Riders must verify the parcel when picking up from customers, restaurants, or shops.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  D2. Verification &amp; D3. Prepaid Wallet Mechanics
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Account verification requires valid phone, CNIC, driving license, vehicle registration, and photos. Forged documents result in immediate permanent termination and legal reporting.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
                  <div className="p-2.5 border border-line bg-paper-off">
                    <span className="font-bold text-ink block">First Recharge</span>
                    <span className="text-ink-soft">Minimum Rs. 500</span>
                  </div>
                  <div className="p-2.5 border border-line bg-paper-off">
                    <span className="font-bold text-ink block">Going Online Balance</span>
                    <span className="text-ink-soft">At least Rs. 100</span>
                  </div>
                  <div className="p-2.5 border border-line bg-paper-off">
                    <span className="font-bold text-ink block">Per-Delivery Fee</span>
                    <span className="text-ink-soft">Rs. 10 deducted on delivery</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  D4. 100% Delivery Fee Earnings to Rider
                </h3>
                <div className="p-3 bg-paper-off border-l-4 border-[#10B981] font-mono text-xs text-ink-soft">
                  <p className="font-bold text-ink text-sm">
                    D4.1 A Rider receives 100% of the Delivery Fee for each completed delivery. Speedy Meals takes no share of it.
                  </p>
                  <p className="pt-1">
                    Earnings are remitted weekly by bank transfer or mobile wallet, separately from any COD cash deposits.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  D5. Equipment and Refundable Kit Deposit
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Speedy Meals issues branded uniforms and insulated delivery bags against a refundable Kit Deposit of <strong>Rs. 4,000</strong>. The Kit Deposit is refunded within seven (7) working days after the account is closed, gear is returned in acceptable condition, and all rider accounts are settled.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  D6. Deliveries &amp; D7. Cash on Delivery Handling
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Riders must never exchange money with restaurant partners. Collected COD cash is Speedy Meals money held in trust. Riders must deposit all Pending Cash by the end of each day.
                </p>
                <div className="p-3 border border-line bg-paper-off font-mono text-xs space-y-1 text-ink-soft">
                  <p className="font-bold text-ink">Cash Limits &amp; Safeguards:</p>
                  <p>When Pending Cash reaches Rs. 4,000, the app issues a cash deposit warning.</p>
                  <p>When Pending Cash reaches Rs. 5,000, no new COD orders are assigned until deposited.</p>
                  <p>A rider with undeposited cash from a previous day cannot go online until settled.</p>
                  <p className="text-red">Failure to deposit cash constitutes a material breach and may result in suspension, blacklisting, and criminal reporting (FIR) using verified CNIC records.</p>
                </div>
              </div>
            </section>

            {/* SECTION 06: PART E - RESTAURANT PARTNER TERMS */}
            <section id="section-part-e" className="space-y-5 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">06</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Part E: Restaurant Partner Terms (Applies from Launch Date)
                </h2>
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  E1. Onboarding &amp; E2. Responsibilities
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Restaurant Partners warrant that they hold all required food authority registrations (e.g. Sindh Food Authority, Punjab Food Authority, KP Food Safety Authority) and operating licences. They maintain sole responsibility for food safety, hygiene, accurate menus, allergen disclosures, and secure order packing. Food must be handed to Riders without any monetary exchange.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  E3. Commission Clarity: 10% of Food Subtotal Only
                </h3>
                <div className="p-3 bg-paper-off border-l-4 border-red font-mono text-xs text-ink-soft space-y-1">
                  <p className="font-bold text-ink text-sm">
                    E3.1 Speedy Meals charges a commission of 10% of the Food Subtotal of each completed Order (excluding delivery fee and taxes).
                  </p>
                  <p>
                    The Delivery Fee is non-commissionable and belongs entirely to the Rider.
                  </p>
                  <p>
                    E3.2 Commission rate is recorded as an immutable snapshot at the moment an Order is placed.
                  </p>
                  <p>
                    E3.3 No upfront deposit or registration fee is charged to restaurant partners.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-heading text-xs font-bold text-ink uppercase tracking-wider">
                  E4. Payment and Settlement: Weekly Every Monday
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>E4.1</strong> Speedy Meals pays the Restaurant Partner directly, weekly, via bank transfer. The Net Payable is 90% of the Food Subtotal of eligible completed orders. This applies whether the Customer paid by COD or Digital Payment. A Rider never pays a Restaurant Partner.
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  <strong>E4.2</strong> Settlements occur every Monday for Orders completed in the preceding Monday-to-Sunday cycle. Restaurant partners have a seven (7) day window to raise any billing dispute.
                </p>
              </div>
            </section>

            {/* SECTION 07: SCHEDULE 1 - KEY RATES AND LIMITS */}
            <section id="section-schedule-1" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">07</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Schedule 1: Key Rates and Limits
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                The following operational schedule defines the active financial parameters and thresholds across the Speedy Meals network:
              </p>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3 w-1/2 border-r border-line">Operational Item</th>
                      <th className="p-3 w-1/2">Stipulated Limit / Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-soft">
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Registration Fee (Pre-Launch)</td>
                      <td className="p-2.5 font-bold text-[#059669]">None (100% Free)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Registration Data Retention</td>
                      <td className="p-2.5">Up to 12 months</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Delivery Fee - Base Fee</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 100</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Delivery Fee - Per-KM Rate</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 20 per km</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Restaurant Commission (Default)</td>
                      <td className="p-2.5 font-bold text-red">10% of Food Subtotal only</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Rider Share of Delivery Fee</td>
                      <td className="p-2.5 font-bold text-[#059669]">100% to Rider</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Rider Wallet - Minimum First Recharge</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 500</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Rider Wallet - Minimum Balance to Go Online</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 100</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Rider Wallet - Per-Delivery Platform Fee</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 10 (Non-refundable)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Rider Kit Deposit (Refundable)</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 4,000</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">COD Warning / COD Assignment Cutoff</td>
                      <td className="p-2.5 font-bold text-ink">Rs. 4,000 / Rs. 5,000</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Customer Wait Time Before Failed Delivery</td>
                      <td className="p-2.5 font-bold text-ink">10 minutes</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Customer Issue Reporting Window</td>
                      <td className="p-2.5 font-bold text-ink">2 hours after delivery</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Digital / COD Refund Processing Window</td>
                      <td className="p-2.5 font-bold text-ink">5-7 working days</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Kit Deposit &amp; Wallet Refund Horizon</td>
                      <td className="p-2.5 font-bold text-ink">7 working days upon clearance</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Restaurant Partner Settlement Schedule</td>
                      <td className="p-2.5 font-bold text-ink">Weekly, every Monday</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Restaurant Settlement Dispute Window</td>
                      <td className="p-2.5 font-bold text-ink">7 days from statement</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-ink border-r border-line">Support Acknowledgement / Formal Response</td>
                      <td className="p-2.5 font-bold text-ink">24 hours / 7 working days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 08: SCHEDULE 2 - FAILED ORDER ALLOCATION */}
            <section id="section-schedule-2" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">08</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Schedule 2: Failed Order Allocation Matrix
                </h2>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                Speedy Meals investigates the verified operational cause of a failed or cancelled order via audit logs, GPS telemetry, timestamps, and photos:
              </p>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-paper-off border-b border-line text-ink uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3 border-r border-line">Cause of Failure</th>
                      <th className="p-3 border-r border-line">Customer</th>
                      <th className="p-3 border-r border-line">Restaurant Partner</th>
                      <th className="p-3">Rider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-soft">
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Customer Fault (Unavailable, unreachable, wrong address, refuses COD)
                      </td>
                      <td className="p-3 text-red border-r border-line">No refund</td>
                      <td className="p-3 text-[#059669] border-r border-line">Receives Net Payable (90% Subtotal)</td>
                      <td className="p-3 text-[#059669]">Receives Full Delivery Fee</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Restaurant Fault (Rejects late, wrong/missing items, food not ready, quality issue)
                      </td>
                      <td className="p-3 text-[#059669] border-r border-line">Refunded in Full</td>
                      <td className="p-3 text-red border-r border-line">No payment for that Order</td>
                      <td className="p-3 text-[#059669]">Receives Delivery Fee if dispatched</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Rider Fault (Loss, tampering, non-delivery)
                      </td>
                      <td className="p-3 text-[#059669] border-r border-line">Refunded in Full</td>
                      <td className="p-3 text-[#059669] border-r border-line">Receives Net Payable if prepared correctly</td>
                      <td className="p-3 text-red">No Delivery Fee (Subject to inquiry)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink border-r border-line">
                        Cancelled Prior to Restaurant Acceptance
                      </td>
                      <td className="p-3 text-[#059669] border-r border-line">Full Refund</td>
                      <td className="p-3 border-r border-line">No payment, no commission</td>
                      <td className="p-3">No fee (Not dispatched)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 09: COMPLIANCE WITH PAKISTANI LAWS */}
            <section id="section-compliance" className="space-y-4 scroll-mt-24">
              <div className="flex items-center space-x-3 border-b border-line/60 pb-2">
                <span className="font-mono text-sm font-bold text-red">09</span>
                <h2 className="font-heading text-xl font-bold text-ink uppercase tracking-tight">
                  Compliance with Applicable Pakistani Laws
                </h2>
              </div>

              <div className="space-y-3 text-sm text-ink-soft leading-relaxed">
                <div className="p-3 border border-line bg-paper-off">
                  <strong className="text-ink font-heading block uppercase text-xs mb-1">
                    Following Pakistani Laws
                  </strong>
                  All riders, customers, restaurants, business partners, and other users connected with SpeedyMeals are required to follow the applicable laws, rules, and regulations of Pakistan.
                </div>

                <div className="p-3 border border-line bg-paper-off">
                  <strong className="text-ink font-heading block uppercase text-xs mb-1">
                    Responsibility for Individual Actions
                  </strong>
                  Every rider, customer, restaurant, business partner, or other user is responsible for their own actions and conduct. SpeedyMeals will not be responsible for any illegal, unlawful, fraudulent, or unauthorized activity carried out by a user or business through or outside the platform.
                </div>

                <div className="p-3 border border-line bg-paper-off">
                  <strong className="text-ink font-heading block uppercase text-xs mb-1">
                    Reporting Illegal Activities
                  </strong>
                  If SpeedyMeals becomes aware of any illegal or unlawful activity involving its platform, users, or business partners, the company may report the matter to the relevant government authorities, law-enforcement agencies, or other competent organizations in Pakistan, where appropriate or required by law.
                </div>

                <div className="p-3 border border-line bg-paper-off">
                  <strong className="text-ink font-heading block uppercase text-xs mb-1">
                    Fake or Fraudulent Documents
                  </strong>
                  Users and businesses must provide genuine and valid documents when requested by SpeedyMeals. This may include CNICs, driving licenses, business registration documents, permits, or other relevant documents. Anyone who knowingly provides fake, forged, altered, or fraudulent documents may have their account or partnership terminated, and SpeedyMeals may report the matter to the relevant authorities.
                </div>

                <div className="p-3 border border-line bg-paper-off">
                  <strong className="text-ink font-heading block uppercase text-xs mb-1">
                    Accurate Information and Verification
                  </strong>
                  Riders, customers, restaurants, and business partners must provide accurate and truthful information during registration and verification. SpeedyMeals may request documents or additional information when necessary to verify identity, eligibility, business status, or compliance with applicable requirements.
                </div>
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="pt-8 border-t border-line flex items-center justify-between">
              <Link
                href="/privacy"
                className="text-xs font-mono font-bold text-red hover:underline uppercase tracking-wider flex items-center space-x-1"
              >
                <span>Read Privacy Policy</span>
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
