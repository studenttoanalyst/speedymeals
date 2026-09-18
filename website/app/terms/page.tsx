'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUp,
  ShieldCheck,
  Scales,
  WarningCircle,
  FileText,
  EnvelopeSimple,
  CaretRight,
} from '@phosphor-icons/react';
import { Footer } from '@/components/home/Footer';

interface LegalSection {
  id: string;
  number: string;
  title: string;
}

const SECTIONS: LegalSection[] = [
  { id: 'section-1', number: '01', title: 'SpeedyMeals Platform & Operations' },
  { id: 'section-2', number: '02', title: 'Account Registration & Security' },
  { id: 'section-3', number: '03', title: 'Platform Use Restrictions' },
  { id: 'section-4', number: '04', title: 'Intellectual Property Rights' },
  { id: 'section-5', number: '05', title: 'Restrictions on Regulated Goods' },
  { id: 'section-6', number: '06', title: 'Orders, Cancellations & Refunds' },
  { id: 'section-7', number: '07', title: 'Prices, Delivery Formula & Payments' },
  { id: 'section-8', number: '08', title: 'Delivery & Fulfilment Standards' },
  { id: 'section-9', number: '09', title: 'Vouchers & Promotional Codes' },
  { id: 'section-10', number: '10', title: 'Food Safety & Allergen Disclaimer' },
  { id: 'section-11', number: '11', title: 'Warranties & Liability Limits' },
  { id: 'section-12', number: '12', title: 'Courier & Rider Operational Terms' },
  { id: 'section-13', number: '13', title: 'Restaurant Partner Terms' },
  { id: 'section-14', number: '14', title: 'Personal Data & PECA Compliance' },
  { id: 'section-15', number: '15', title: 'User Indemnification' },
  { id: 'section-16', number: '16', title: 'Third-Party Links & Services' },
  { id: 'section-17', number: '17', title: 'Account Suspension & Termination' },
  { id: 'section-18', number: '18', title: 'Amendments & Updates' },
  { id: 'section-19', number: '19', title: 'Severability of Provisions' },
  { id: 'section-20', number: '20', title: 'Governing Law & Jurisdiction' },
  { id: 'section-21', number: '21', title: 'Official Contacts & Notices' },
  { id: 'section-22', number: '22', title: 'Speedy Courier Logistics' },
  { id: 'section-23', number: '23', title: 'Speedy Drive Ride-Hailing' },
  { id: 'section-24', number: '24', title: 'Speedy Mall Marketplace' },
  { id: 'section-25', number: '25', title: 'On-Demand Technical Services' },
  { id: 'section-26', number: '26', title: 'Prevailing Language' },
];

export default function TermsOfUsePage() {
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
      {/* Sleek Minimal Legal Top Header (Replaces default navigation bar) */}
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

      {/* Main Document Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Left Navigation Index */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-2">
            <div className="bg-white border border-line p-4 shadow-xs">
              <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#8C9099] pb-3 mb-3 border-b border-line flex items-center justify-between">
                <span>DOCUMENT INDEX</span>
                <span className="text-red">{SECTIONS.length} CLAUSES</span>
              </div>

              <nav className="space-y-0.5">
                {SECTIONS.map((sec) => {
                  const isActive = activeSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors flex items-center justify-between cursor-pointer rounded-xs ${isActive
                          ? 'bg-red text-white font-bold'
                          : 'text-[#5B5F66] hover:bg-paper hover:text-ink'
                        }`}
                    >
                      <span className="truncate pr-1">
                        <span className="opacity-70 mr-1">{sec.number}.</span>
                        {sec.title}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 pt-3 border-t border-line font-mono text-[10px] text-[#8C9099] space-y-1">
                <div>SPEEDYMEALS NETWORK (PVT) LTD</div>
                <div>support@speedymealservices.com</div>
              </div>
            </div>
          </aside>

          {/* Legal Document Sheet */}
          <div className="lg:col-span-9">
            <article className="bg-white border border-line p-6 sm:p-10 lg:p-12 shadow-xs">
              {/* Document Header */}
              <div className="border-b border-line pb-6 mb-8">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#8C9099] uppercase tracking-wider mb-2">
                  <span>CONTRACTUAL AGREEMENT</span>
                  <span>&middot;</span>
                  <span>VERSION 1.0</span>
                  <span>&middot;</span>
                  <span className="text-red font-bold">LIVE DIRECTIVE</span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-ink leading-tight mb-4">
                  Terms of Use &amp; Service Agreement
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-paper border border-line font-mono text-xs text-[#5B5F66]">
                  <div>
                    <span className="text-[#8C9099] block text-[10px] uppercase">Entity</span>
                    <strong className="text-ink font-bold">SpeedyMeals Network (Pvt) Ltd</strong>
                  </div>
                  <div>
                    <span className="text-[#8C9099] block text-[10px] uppercase">Effective Date</span>
                    <strong className="text-ink font-bold">September 2026</strong>
                  </div>
                  <div>
                    <span className="text-[#8C9099] block text-[10px] uppercase">Official Portal</span>
                    <strong className="text-blue font-bold">speedymealservices.com</strong>
                  </div>
                </div>
              </div>

              {/* Preamble */}
              <div className="p-4 bg-[#FFF8F7] border-l-3 border-l-red text-sm text-ink-soft leading-relaxed mb-10">
                <p>
                  These Terms of Use govern access to and utilization of the website, mobile applications, API gateways, and logistics services provided by <strong>SpeedyMeals Network (Private) Limited</strong> (&ldquo;SpeedyMeals,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) across Pakistan. By accessing our platform as a customer, merchant partner, or courier, you confirm that you have read, understood, and agreed to be legally bound by these terms and our Privacy Policy.
                </p>
              </div>

              {/* Sections Stream */}
              <div className="space-y-8 divide-y divide-line">
                {/* 01 */}
                <section id="section-1" className="scroll-mt-20 pt-6 first:pt-0">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">01.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      SpeedyMeals Platform &amp; Scope of Services
                    </h2>
                  </div>
                  <div className="space-y-3 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>1.1 Corporate Identity:</strong> These Terms form the binding agreement between you and <strong>SpeedyMeals Network (Private) Limited</strong>, a company incorporated under the Companies Act of the Islamic Republic of Pakistan, operating the primary domain <strong>speedymealservices.com</strong> and associated mobile client applications.
                    </p>
                    <p>
                      <strong>1.2 Role as Technology Facilitator:</strong> Through the Platform, SpeedyMeals connects customers with independent Restaurant Partners, freelance couriers, retail merchants, and specialized service professionals (&ldquo;Partners&rdquo;). SpeedyMeals acts as a software and logistics facilitator to coordinate order placement, routing telemetry, and customer handover. Unless expressly stated in writing, SpeedyMeals is not the food preparer, manufacturer, or vendor of goods sold by third-party partners.
                    </p>
                    <p>
                      <strong>1.3 Official Contact:</strong> For inquiries or assistance, contact our administration desk at <strong className="text-ink">support@speedymealservices.com</strong> or via the in-app Help Center.
                    </p>
                  </div>
                </section>

                {/* 02 */}
                <section id="section-2" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">02.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      User Accounts &amp; Security
                    </h2>
                  </div>
                  <div className="space-y-2.5 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>2.1 Registration:</strong> Users must register with authentic personal details including full legal name, verified Pakistani phone number, and a functional email address. Account credentials must remain confidential.
                    </p>
                    <p>
                      <strong>2.2 Account Responsibility:</strong> All orders, delivery requests, and transactions initiated under your credentials remain your sole financial and legal responsibility.
                    </p>
                    <p>
                      <strong>2.3 Verification Checks:</strong> SpeedyMeals reserves the right to conduct identity checks on users and background verification on couriers and restaurant partners on an ongoing basis. Accounts with fraudulent or mismatched identity records are subject to immediate suspension.
                    </p>
                  </div>
                </section>

                {/* 03 */}
                <section id="section-3" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">03.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Prohibited Activities
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>The following conduct is strictly prohibited:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Using the platform for fraudulent, deceptive, or money-laundering schemes.</li>
                      <li>Harassing, threatening, or abusing delivery riders, merchant staff, or customer support personnel.</li>
                      <li>Impersonating another person, restaurant entity, or state official.</li>
                      <li>Scraping, crawling, or extracting platform data without written authorization.</li>
                      <li>Manipulating dispatch algorithms, promo vouchers, or referral systems.</li>
                    </ul>
                  </div>
                </section>

                {/* 04 */}
                <section id="section-4" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">04.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Intellectual Property Rights
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    All trademarks, brand names (&ldquo;SpeedyMeals,&rdquo; &ldquo;Speedy Courier,&rdquo; &ldquo;Speedy Mall,&rdquo; &ldquo;Speedy Drive,&rdquo; and &ldquo;Speedy Kitchen&rdquo;), application code, logos, and UI assets are the proprietary intellectual property of SpeedyMeals Network (Private) Limited. Unauthorized copying, reverse-engineering, or commercial misuse is prohibited under Pakistani law.
                  </p>
                </section>

                {/* 05 */}
                <section id="section-5" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">05.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Restrictions on Regulated Goods
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    Certain merchandise may be restricted under provincial or national laws. Customers ordering restricted items must provide proof of legal age or valid identity (CNIC) upon courier request. Failure to present valid identification results in non-delivery without refund eligibility.
                  </p>
                </section>

                {/* 06 */}
                <section id="section-6" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">06.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Orders, Cancellations &amp; Refunds
                    </h2>
                  </div>
                  <div className="space-y-2.5 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>6.1 Free Cancellation Window:</strong> You may cancel an order without penalty only before the Restaurant Partner accepts it and initiates cooking. Once accepted, cancellations incur a cancellation fee to compensate the merchant and assigned courier.
                    </p>
                    <p>
                      <strong>6.2 Digital Refunds:</strong> Valid refunds for verified fulfillment failures or eligible cancellations are credited to the original payment source or in-app wallet within 3 to 7 working days.
                    </p>
                    <p>
                      <strong>6.3 Cash on Delivery (COD):</strong> Refusing delivery or failing to pay for confirmed COD orders causes immediate restriction or removal of COD privileges from your account.
                    </p>
                    <p>
                      <strong>6.4 Reporting Discrepancies:</strong> Missing items, damaged merchandise, or incorrect dishes must be reported with photographic evidence via in-app support <strong>within [X hours, e.g., 24 hours] of delivery</strong>.
                    </p>
                  </div>
                </section>

                {/* 07 */}
                <section id="section-7" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">07.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Prices, Delivery Fee Formula &amp; Payments
                    </h2>
                  </div>
                  <div className="space-y-3 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      All prices are denominated in Pakistani Rupees (PKR) and include applicable taxes where merchants are tax-registered.
                    </p>
                    <div className="p-3 bg-paper border border-line font-mono text-xs">
                      <span className="text-red font-bold uppercase block mb-1">Standard Delivery Fee Formula:</span>
                      <code className="text-ink font-bold block text-xs sm:text-sm">
                        Delivery Fee = Base Fee (Rs. 50, or Rs. [50/100, to be confirmed]) + [ Distance in KM &times; Rs. 20 ]
                      </code>
                      <span className="text-[11px] text-[#5B5F66] block mt-1">
                        100% of the customer delivery fee is paid directly to the assigned courier.
                      </span>
                    </div>
                    <p>
                      Payments are processed through Cash on Delivery or approved digital gateways (JazzCash, EasyPaisa, credit/debit cards). Payment credentials are handled through PCI-DSS certified partners; SpeedyMeals does not store card numbers.
                    </p>
                  </div>
                </section>

                {/* 08 */}
                <section id="section-8" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">08.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Delivery, Multi-Cart &amp; Handover
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>8.1 Multi-Restaurant Orders:</strong> Items ordered from distinct restaurant kitchens are treated as independent orders, each with dedicated rider dispatch, tracking, and delivery fees.
                    </p>
                    <p>
                      <strong>8.2 Waiting Limit:</strong> Couriers will wait a maximum of <strong>ten (10) minutes</strong> upon arriving at your drop-off address. If you remain uncontactable, the order is cancelled without refund.
                    </p>
                  </div>
                </section>

                {/* 09 */}
                <section id="section-9" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">09.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Vouchers &amp; Promotional Codes
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    Promotional vouchers are non-transferable, non-cashable, and valid only for specified promotional periods and minimum baskets. Vouchers obtained through abusive multiple-account generation will be voided.
                  </p>
                </section>

                {/* 10 */}
                <section id="section-10" className="scroll-mt-20 pt-6">
                  <div className="p-4 bg-[#FFF8F7] border border-red/30">
                    <div className="flex items-baseline space-x-2 mb-2">
                      <span className="font-mono text-xs font-bold text-red">10.</span>
                      <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                        Food Safety, Health &amp; Allergen Disclaimer
                      </h2>
                    </div>
                    <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                      <p className="text-red font-semibold">
                        Statutory Notice Regarding Food Preparation and Handling:
                      </p>
                      <p>
                        SpeedyMeals is solely a digital platform and last-mile logistics provider. <strong>SpeedyMeals does not cook, prepare, package, or inspect food items sold by independent Restaurant Partners.</strong>
                      </p>
                      <p>
                        To the fullest extent permitted by applicable law, statutory and operational responsibility for food preparation, hygiene, safety, allergen disclosure, and adherence to Provincial Food Authority regulations (including the Sindh Food Authority, Punjab Food Authority, and Khyber Pakhtunkhwa Food Safety and Halal Food Authority) rests exclusively with the Restaurant Partner. SpeedyMeals facilitates digital ordering and transport and does not manufacture or package food items.
                      </p>
                      <p>
                        Nothing in this clause or these Terms shall limit or exclude any statutory liability that cannot lawfully be excluded under applicable consumer protection legislation or provincial food safety regulations, including liability for death or personal injury resulting directly from proven gross negligence or willful misconduct of SpeedyMeals.
                      </p>
                      <p>
                        Customers with food allergies or medical dietary constraints must contact the restaurant kitchen directly before placing an order.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 11 */}
                <section id="section-11" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">11.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Warranties &amp; Limitation of Liability
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      The platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of uninterrupted availability. To the maximum extent permitted by Pakistani law, SpeedyMeals excludes liability for indirect, incidental, or consequential damages.
                    </p>
                    <p>
                      Subject to non-excludable statutory rights, where liability is established in a court of competent jurisdiction, the total aggregate financial liability of SpeedyMeals arising out of any specific claim or Order shall not exceed the gross value of that specific Order giving rise to the claim.
                    </p>
                    <p>
                      <strong>11.3 Partner Conduct:</strong> Couriers and Restaurant Partners operate as independent parties. SpeedyMeals bears no liability for unlawful acts committed by third-party partners, but enforces immediate termination and cooperates with law enforcement.
                    </p>
                    <p>
                      <strong>11.4 Non-Excludable Statutory Rights:</strong> Nothing in these Terms shall limit or exclude any statutory rights, guarantees, or remedies that cannot lawfully be excluded, restricted, or modified under the substantive laws of Pakistan, including liability for death or personal injury caused by proven gross negligence, fraud, or willful misconduct.
                    </p>
                  </div>
                </section>

                {/* 12 */}
                <section id="section-12" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">12.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Courier &amp; Rider Operational Terms
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>12.1 Independent Contractor:</strong> Couriers operate as independent contractors, responsible for driving licenses, helmet compliance, and vehicle roadworthiness.
                    </p>
                    <p>
                      <strong>12.2 Full Earnings Retention:</strong> Couriers receive 100% of customer delivery fees for completed trips, disbursed weekly.
                    </p>
                    <p>
                      <strong>12.3 Working Balance &amp; Maintenance:</strong> Couriers maintain a minimum prepaid wallet float of <strong>Rs. 500</strong> to remain active on the dispatch network. A platform software maintenance fee of <strong>Rs. 10</strong> is deducted automatically per completed order.
                    </p>
                    <p>
                      <strong>12.4 Equipment Deposit:</strong> Delivery boxes and safety uniforms are provided against a security deposit of <strong>Rs. [4,000]</strong>, fully refundable upon account closure and return of undamaged equipment.
                    </p>
                    <p>
                      <strong>12.5 Cash Remittance:</strong> Couriers collecting Cash-on-Delivery (COD) payments must remit and deposit collected cash within the required operational shift window. Failure to do so constitutes a material breach and shall result in immediate account suspension, permanent platform blacklisting, and the registration of a First Information Report (FIR) with relevant law enforcement authorities for unlawful conversion.
                    </p>
                  </div>
                </section>

                {/* 13 */}
                <section id="section-13" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-blue">13.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Restaurant Partner Terms
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>13.1 Quality &amp; Hygiene:</strong> Restaurant Partners warrant that all dishes comply with provincial food safety standards and represent genuine dine-in retail quality.
                    </p>
                    <p>
                      <strong>13.2 Transparent 10% Commission:</strong> SpeedyMeals charges a commission of <strong>10%</strong> calculated strictly on the food subtotal, excluding customer delivery fees and applicable taxes. The assigned courier receives 100% of the customer delivery fee. SpeedyMeals settles partner earnings weekly regardless of whether the Order was paid via digital payment or Cash-on-Delivery (COD). No forced ad auction fees or search placement surcharges apply.
                    </p>
                    <p>
                      <strong>13.3 Timely Pickup:</strong> Kitchens must mark orders as ready only when packaged, avoiding courier wait times.
                    </p>
                  </div>
                </section>

                {/* 14 */}
                <section id="section-14" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">14.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Personal Data &amp; PECA Compliance
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    Data handling complies with the Prevention of Electronic Crimes Act (PECA 2016). Personal information is shared with couriers strictly to fulfill active deliveries. SpeedyMeals does not sell user data to advertising brokers.
                  </p>
                </section>

                {/* 15 */}
                <section id="section-15" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">15.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      User Indemnification
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    You agree to indemnify and hold harmless SpeedyMeals Network (Private) Limited, its directors, and personnel against any third-party claims, losses, or legal costs arising from platform misuse or statutory violations.
                  </p>
                </section>

                {/* 16 */}
                <section id="section-16" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">16.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Third-Party Links &amp; Mapping
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    The Platform utilizes third-party mapping and digital payment gateways. SpeedyMeals is not liable for external content or third-party service interruptions.
                  </p>
                </section>

                {/* 17 */}
                <section id="section-17" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">17.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Suspension &amp; Termination
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    SpeedyMeals may suspend or terminate user accounts immediately upon verified fraud, harassment, non-payment, or safety risks without prior notice.
                  </p>
                </section>

                {/* 18 */}
                <section id="section-18" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">18.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Amendments to Terms
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    SpeedyMeals may update these Terms periodically. Continued platform use following published revisions indicates acceptance of the updated terms.
                  </p>
                </section>

                {/* 19 */}
                <section id="section-19" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">19.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Severability
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    If any provision of these Terms is deemed unlawful or unenforceable by a court of competent jurisdiction, all remaining provisions remain in full force.
                  </p>
                </section>

                {/* 20 */}
                <section id="section-20" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">20.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Governing Law &amp; Jurisdiction
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      These Terms are governed by the substantive laws of the <strong>Islamic Republic of Pakistan</strong>.
                    </p>
                    <p>
                      Disputes not resolved through internal mediation shall fall under the exclusive jurisdiction of the competent courts of <strong>[City, e.g., Karachi], Pakistan</strong>.
                    </p>
                  </div>
                </section>

                {/* 21 */}
                <section id="section-21" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">21.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Official Contacts &amp; Notices
                    </h2>
                  </div>
                  <div className="p-3 bg-paper border border-line font-mono text-xs space-y-1 text-ink">
                    <div><strong>Legal Entity:</strong> SpeedyMeals Network (Private) Limited</div>
                    <div><strong>Official Domain:</strong> speedymealservices.com</div>
                    <div><strong>Customer Support:</strong> support@speedymealservices.com</div>
                    <div><strong>Legal Inquiries:</strong> legal@speedymealservices.com</div>
                    <div><strong>Headquarters:</strong> Karachi, Sindh, Pakistan</div>
                  </div>
                </section>

                {/* 22 */}
                <section id="section-22" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-tan">22.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Speedy Courier Logistics
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm text-ink-soft leading-relaxed font-sans">
                    <p>
                      <strong>22.1 Scope:</strong> On-demand parcel dispatch within cities, inter-city, and inter-provincial corridors in alliance with regional hubs and national postal infrastructure.
                    </p>
                    <p>
                      <strong>22.2 Rates:</strong> Calculated by distance (Rs. 20/km) and weight brackets (Rs. 190/kg city, Rs. 260/kg inter-city, Rs. 340/kg provincial).
                    </p>
                    <p>
                      <strong>22.3 Prohibited Parcels:</strong> Hazardous materials, firearms, narcotics, cash, and contraband are strictly prohibited.
                    </p>
                    <p>
                      <strong>22.4 Liability Limit:</strong> In the absence of declared insurance, maximum carrier liability for parcel damage or loss is capped at <strong>Rs. [amount to be defined, e.g., Rs. 5,000]</strong> per parcel or declared invoice value, whichever is lower.
                    </p>
                  </div>
                </section>

                {/* 23 */}
                <section id="section-23" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-[#8C9099]">23.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Speedy Drive Ride-Hailing (Future Service)
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    Where activated, Speedy Drive links passengers with independent licensed drivers. SpeedyMeals operates as a communications coordinator; drivers remain liable for their driving conduct.
                  </p>
                </section>

                {/* 24 */}
                <section id="section-24" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-[#8C9099]">24.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Speedy Mall Marketplace (Future Service)
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    Independent vendors list products directly on the platform. Vendors bear statutory responsibility for warranties, authentic product condition, and consumer protection returns.
                  </p>
                </section>

                {/* 25 */}
                <section id="section-25" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-[#8C9099]">25.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      On-Demand Technical Services (Future Service)
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    Where activated, the platform facilitates bookings for skilled technicians (electricians, plumbing, HVAC). Work is executed by independent technicians.
                  </p>
                </section>

                {/* 26 */}
                <section id="section-26" className="scroll-mt-20 pt-6">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="font-mono text-xs font-bold text-red">26.</span>
                    <h2 className="font-display text-xl uppercase tracking-tight text-ink">
                      Prevailing Language &amp; Interpretation
                    </h2>
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed font-sans">
                    In the event of any linguistic conflict or ambiguity between translations, the <strong>English language version shall govern and prevail</strong> in all legal proceedings.
                  </p>
                </section>
              </div>

              {/* Bottom Return Bar */}
              <div className="mt-10 pt-6 border-t border-line flex items-center justify-between font-mono text-xs">
                <Link href="/" className="text-red hover:underline flex items-center space-x-1.5 font-bold">
                  <ArrowLeft size={14} weight="bold" />
                  <span>Return to Home</span>
                </Link>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-3.5 py-2 border border-line bg-paper text-ink hover:bg-ink hover:text-white transition-colors flex items-center space-x-1.5 cursor-pointer font-bold"
                >
                  <ArrowUp size={14} weight="bold" />
                  <span>Back to Top</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
