'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bicycle,
  Storefront,
  Users,
  Check,
  ShieldCheck,
  Percent,
  Coins,
  ArrowRight,
  ClipboardText,
} from '@phosphor-icons/react';
import { PersonaType } from '@/types/home';

interface PartnerSectionProps {
  activePersona: PersonaType;
  onSelectPersona: (persona: PersonaType) => void;
}

export const PartnerSection: React.FC<PartnerSectionProps> = ({
  activePersona,
  onSelectPersona,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+971',
    city: 'Dubai',
    vehicleType: 'Motorcycle',
    businessName: '',
    cuisineType: 'Middle Eastern / Grills',
    branches: '1-3',
    agreed: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const randomRef = `SM-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedId(randomRef);
    }, 600);
  };

  const handleReset = () => {
    setSubmittedId(null);
    setFormData({
      ...formData,
      fullName: '',
      email: '',
      phone: '',
      businessName: '',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section
      id="partner"
      className="relative z-10 py-24 sm:py-32 border-t border-[#E4E2DD] bg-[#FFFFFF]/85"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12 sm:mb-16"
        >
          <div className="flex items-center space-x-3 mb-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#5B5F66]">
              [ <span className="text-[#5B5F66]">03</span> ]
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-[#15171A] font-bold">
              Partner With Us
            </span>
            <div className="h-px flex-1 bg-[#E4E2DD]" />
            <span className="font-mono text-xs text-[#E23A2E] tracking-wider uppercase font-semibold">
              ENROLLMENT OPEN
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2 className="font-['Archivo_Black'] text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-[#15171A]">
              Direct Partnership. <br className="hidden sm:inline" />
              <span
                className="transition-colors duration-300"
                style={{ color: 'var(--dynamic-accent, #E23A2E)' }}
              >
                No Extraction.
              </span>
            </h2>

            <p className="text-sm font-mono text-[#5B5F66] max-w-sm">
              Select your persona below to join our pilot launch network across South Asia and the
              Middle East.
            </p>
          </div>
        </motion.div>

        {/* Persona-Split Entry: Three Hairline-Divided Columns */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#E4E2DD] mb-12 bg-[#FFFFFF]"
        >
          {/* Column 1: RIDE (--red accent) */}
          <motion.div
            variants={itemVariants}
            id="persona-col-rider"
            className={`p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E4E2DD] transition-colors duration-150 ${
              activePersona === 'rider' ? 'bg-[#F6F5F3]' : 'bg-[#FFFFFF] hover:bg-[#F6F5F3]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-[#E23A2E] text-[#E23A2E] flex items-center justify-center bg-[#E23A2E]/5">
                  <Bicycle size={24} weight="bold" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#E23A2E] font-bold">
                  COURIER DISPATCH
                </span>
              </div>
              <h3 className="font-['Archivo_Black'] text-2xl uppercase tracking-tight text-[#15171A] mb-2">
                Ride
              </h3>
              <p className="text-sm text-[#5B5F66] mb-6 leading-relaxed">
                Keep 100% of your delivery customer fees. Zero platform deduction on distance, zero
                security deposit, with daily automated payouts.
              </p>
            </div>

            <div>
              <div className="py-2 mb-4 border-t border-b border-[#E4E2DD] font-mono text-xs text-[#15171A] flex justify-between">
                <span className="text-[#5B5F66]">FEE RETENTION:</span>
                <span className="font-bold text-[#E23A2E]">100% TO RIDER</span>
              </div>
              <button
                type="button"
                id="btn-select-rider"
                onClick={() => onSelectPersona('rider')}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border transition-colors duration-150 flex items-center justify-center space-x-2 ${
                  activePersona === 'rider'
                    ? 'bg-[#E23A2E] text-white border-[#E23A2E]'
                    : 'bg-transparent text-[#15171A] border-[#15171A] hover:bg-[#15171A] hover:text-white'
                }`}
              >
                <span>{activePersona === 'rider' ? 'ACTIVE FORM' : 'APPLY TO RIDE'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          </motion.div>

          {/* Column 2: RESTAURANT (--tan accent) */}
          <motion.div
            variants={itemVariants}
            id="persona-col-restaurant"
            className={`p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E4E2DD] transition-colors duration-150 ${
              activePersona === 'restaurant'
                ? 'bg-[#F6F5F3]'
                : 'bg-[#FFFFFF] hover:bg-[#F6F5F3]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-[#C7A874] text-[#C7A874] flex items-center justify-center bg-[#C7A874]/5">
                  <Storefront size={24} weight="bold" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#C7A874] font-bold">
                  MERCHANT DIRECT
                </span>
              </div>
              <h3 className="font-['Archivo_Black'] text-2xl uppercase tracking-tight text-[#15171A] mb-2">
                Restaurant
              </h3>
              <p className="text-sm text-[#5B5F66] mb-6 leading-relaxed">
                Flat 10% commission. No onboarding penalty, no mandatory sponsored placements to
                stay visible, and complete menu control.
              </p>
            </div>

            <div>
              <div className="py-2 mb-4 border-t border-b border-[#E4E2DD] font-mono text-xs text-[#15171A] flex justify-between">
                <span className="text-[#5B5F66]">COMMISSION:</span>
                <span className="font-bold text-[#C7A874]">10% FLAT RATE</span>
              </div>
              <button
                type="button"
                id="btn-select-restaurant"
                onClick={() => onSelectPersona('restaurant')}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border transition-colors duration-150 flex items-center justify-center space-x-2 ${
                  activePersona === 'restaurant'
                    ? 'bg-[#C7A874] text-white border-[#C7A874]'
                    : 'bg-transparent text-[#15171A] border-[#15171A] hover:bg-[#15171A] hover:text-white'
                }`}
              >
                <span>{activePersona === 'restaurant' ? 'ACTIVE FORM' : 'PARTNER RESTAURANT'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          </motion.div>

          {/* Column 3: CUSTOMER (Optional soft anticipation note) */}
          <motion.div
            variants={itemVariants}
            id="persona-col-customer"
            className={`p-6 sm:p-8 flex flex-col justify-between transition-colors duration-150 ${
              activePersona === 'customer'
                ? 'bg-[#F6F5F3]'
                : 'bg-[#FFFFFF] hover:bg-[#F6F5F3]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-[#1E5FA8] text-[#1E5FA8] flex items-center justify-center bg-[#1E5FA8]/5">
                  <Users size={24} weight="bold" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#1E5FA8] font-bold">
                  EARLY ACCESS
                </span>
              </div>
              <h3 className="font-['Archivo_Black'] text-2xl uppercase tracking-tight text-[#15171A] mb-2">
                Customer
              </h3>
              <p className="text-sm text-[#5B5F66] mb-6 leading-relaxed">
                Real food prices without sneaky packaging fees or arbitrary delivery inflation. Get
                notified when SpeedyMeals launches on iOS & Android in your city.
              </p>
            </div>

            <div>
              <div className="py-2 mb-4 border-t border-b border-[#E4E2DD] font-mono text-xs text-[#15171A] flex justify-between">
                <span className="text-[#5B5F66]">MARKUP:</span>
                <span className="font-bold text-[#1E5FA8]">0% MENU MARKUP</span>
              </div>
              <button
                type="button"
                id="btn-select-customer"
                onClick={() => onSelectPersona('customer')}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider border transition-colors duration-150 flex items-center justify-center space-x-2 ${
                  activePersona === 'customer'
                    ? 'bg-[#1E5FA8] text-white border-[#1E5FA8]'
                    : 'bg-transparent text-[#5B5F66] border-[#E4E2DD] hover:border-[#15171A] hover:text-[#15171A]'
                }`}
              >
                <span>{activePersona === 'customer' ? 'ACTIVE FORM' : 'JOIN WAITLIST'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* REGISTRATION FORM PANEL: DARK --INK PANEL (Seed Dark-Mode Pattern) */}
        {/* Sharp hairline fields, no rounded inputs */}
        <motion.div
          id="registration-flow-panel"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#15171A] text-white border border-[#2D3139] p-6 sm:p-10 lg:p-12"
        >
          {/* Top Panel Nav & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2D3139] mb-8">
            <div>
              <div className="font-mono text-xs text-[#C7A874] uppercase tracking-widest mb-1 flex items-center space-x-2">
                <span className="w-2 h-2 bg-[#C7A874] inline-block" />
                <span>REGISTRATION GATEWAY</span>
              </div>
              <h3 className="font-['Archivo_Black'] text-2xl sm:text-3xl uppercase tracking-tight text-white">
                {activePersona === 'rider' && 'Rider Application Form'}
                {activePersona === 'restaurant' && 'Restaurant Partner Onboarding'}
                {activePersona === 'customer' && 'Customer Early Access Invite'}
              </h3>
            </div>

            {/* Persona Switcher Tabs inside dark panel */}
            <div className="flex border border-[#2D3139] font-mono text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onSelectPersona('rider')}
                className={`px-4 py-2 uppercase tracking-wider transition-colors ${
                  activePersona === 'rider'
                    ? 'bg-[#E23A2E] text-white font-bold'
                    : 'bg-[#15171A] text-[#5B5F66] hover:text-white'
                }`}
              >
                Rider
              </button>
              <button
                type="button"
                onClick={() => onSelectPersona('restaurant')}
                className={`px-4 py-2 uppercase tracking-wider border-l border-[#2D3139] transition-colors ${
                  activePersona === 'restaurant'
                    ? 'bg-[#C7A874] text-[#15171A] font-bold'
                    : 'bg-[#15171A] text-[#5B5F66] hover:text-white'
                }`}
              >
                Restaurant
              </button>
              <button
                type="button"
                onClick={() => onSelectPersona('customer')}
                className={`px-4 py-2 uppercase tracking-wider border-l border-[#2D3139] transition-colors ${
                  activePersona === 'customer'
                    ? 'bg-[#1E5FA8] text-white font-bold'
                    : 'bg-[#15171A] text-[#5B5F66] hover:text-white'
                }`}
              >
                Waitlist
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {submittedId ? (
              /* Success State Ticket */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="border border-[#2D3139] bg-[#1E2126] p-8 max-w-2xl mx-auto font-mono text-left"
              >
                <div className="flex items-center space-x-3 mb-4 text-[#C7A874]">
                  <Check size={28} weight="bold" />
                  <span className="font-['Archivo_Black'] text-xl uppercase tracking-tight text-white">
                    Application Received
                  </span>
                </div>
                <p className="text-sm text-[#A0A4AB] mb-6 font-sans">
                  Your registration has been logged directly with our regional dispatch operations.
                  Verification review is conducted within 24 hours.
                </p>

                <div className="p-4 bg-[#15171A] border border-[#2D3139] space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66]">REFERENCE CODE:</span>
                    <span className="text-[#C7A874] font-bold tracking-widest">{submittedId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66]">TARGET ROLE:</span>
                    <span className="text-white uppercase">{activePersona}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66]">CONTACT EMAIL:</span>
                    <span className="text-white">{formData.email}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B5F66]">DEPLOYMENT ZONE:</span>
                    <span className="text-white">
                      {formData.city} ({formData.countryCode})
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-[#E23A2E] text-white text-xs uppercase tracking-widest font-bold border border-[#E23A2E] hover:bg-white hover:text-[#15171A] transition-colors"
                  >
                    Submit Another Application
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Interactive Registration Form */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-full-name"
                      className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                    >
                      {activePersona === 'restaurant' ? 'Authorized Representative' : 'Full Legal Name'} *
                    </label>
                    <input
                      id="form-full-name"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={activePersona === 'restaurant' ? 'e.g. Tariq Al-Mansoor' : 'e.g. Imran Khan'}
                      className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#C7A874] transition-colors"
                    />
                  </div>

                  {/* Business Name (for Restaurant) or Vehicle Selection (for Rider) */}
                  {activePersona === 'restaurant' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-business-name"
                        className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                      >
                        Restaurant Brand Name *
                      </label>
                      <input
                        id="form-business-name"
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Damascus Charcoal Grill"
                        className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#C7A874] transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-vehicle"
                        className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                      >
                        Primary Mode of Transport
                      </label>
                      <select
                        id="form-vehicle"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#E23A2E] transition-colors font-sans"
                      >
                        <option value="Motorcycle">Motorcycle (125cc - 250cc)</option>
                        <option value="Electric Scooter">Electric Scooter / E-Bike</option>
                        <option value="Bicycle">Bicycle (Urban Zones)</option>
                        <option value="Sedan Car">Car / Sedan</option>
                      </select>
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-email"
                      className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                    >
                      Email Address *
                    </label>
                    <input
                      id="form-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@domain.com"
                      className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#C7A874] transition-colors"
                    />
                  </div>

                  {/* Phone with Country Code Selector */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-phone"
                      className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                    >
                      Phone Number *
                    </label>
                    <div className="flex">
                      <select
                        id="form-country-code"
                        value={formData.countryCode}
                        onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                        className="bg-[#1E2126] border border-r-0 border-[#2D3139] px-3 py-3.5 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value="+971">🇦🇪 UAE (+971)</option>
                        <option value="+966">🇸🇦 KSA (+966)</option>
                        <option value="+92">🇵🇰 PK (+92)</option>
                        <option value="+91">🇮🇳 IN (+91)</option>
                        <option value="+880">🇧🇩 BD (+880)</option>
                        <option value="+974">🇶🇦 QA (+974)</option>
                        <option value="+973">🇧🇭 BH (+973)</option>
                        <option value="+965">🇰🇼 KW (+965)</option>
                        <option value="+968">🇴🇲 OM (+968)</option>
                      </select>
                      <input
                        id="form-phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="50 123 4567"
                        className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#C7A874] transition-colors"
                      />
                    </div>
                  </div>

                  {/* City Selection */}
                  <div className="space-y-2">
                    <label
                      htmlFor="form-city"
                      className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                    >
                      Operating City *
                    </label>
                    <select
                      id="form-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C7A874] transition-colors font-sans"
                    >
                      <option value="Dubai">Dubai, UAE</option>
                      <option value="Abu Dhabi">Abu Dhabi, UAE</option>
                      <option value="Sharjah">Sharjah, UAE</option>
                      <option value="Riyadh">Riyadh, Saudi Arabia</option>
                      <option value="Jeddah">Jeddah, Saudi Arabia</option>
                      <option value="Doha">Doha, Qatar</option>
                      <option value="Karachi">Karachi, Pakistan</option>
                      <option value="Lahore">Lahore, Pakistan</option>
                      <option value="Islamabad">Islamabad, Pakistan</option>
                      <option value="Mumbai">Mumbai, India</option>
                      <option value="Delhi">Delhi NCR, India</option>
                      <option value="Dhaka">Dhaka, Bangladesh</option>
                    </select>
                  </div>

                  {/* Additional Persona-Specific Question */}
                  {activePersona === 'restaurant' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-cuisine"
                        className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                      >
                        Primary Cuisine Category
                      </label>
                      <input
                        id="form-cuisine"
                        type="text"
                        value={formData.cuisineType}
                        onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                        placeholder="e.g. Biryani & Kebabs, Cafe, Pizza"
                        className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white placeholder-[#5B5F66] focus:outline-none focus:border-[#C7A874]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="form-experience"
                        className="block font-mono text-xs uppercase tracking-wider text-[#A0A4AB]"
                      >
                        Delivery Experience
                      </label>
                      <select
                        id="form-experience"
                        className="w-full bg-[#15171A] border border-[#2D3139] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#C7A874] font-sans"
                      >
                        <option>Over 1 Year (Active courier)</option>
                        <option>6 - 12 Months</option>
                        <option>New Courier (Needs onboarding)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Terms agreement */}
                <div className="pt-2 flex items-start space-x-3">
                  <input
                    id="form-agreed"
                    type="checkbox"
                    checked={formData.agreed}
                    onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                    className="mt-1 accent-[#E23A2E]"
                  />
                  <label htmlFor="form-agreed" className="text-xs text-[#A0A4AB] leading-relaxed">
                    I verify all submitted data is accurate and acknowledge the SpeedyMeals transparent
                    terms (100% rider fee retention / 10% flat merchant fee).
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[#2D3139]">
                  <div className="font-mono text-xs text-[#5B5F66]">
                    RESPONSE TIME: <span className="text-[#C7A874]">UNDER 24 HOURS</span>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-registration"
                    disabled={submitting}
                    className="px-8 py-4 bg-[#E23A2E] text-white font-mono text-xs uppercase tracking-widest font-bold border border-[#E23A2E] hover:bg-white hover:text-[#15171A] hover:border-white transition-colors duration-150 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <span>PROCESSING DISPATCH ENROLLMENT...</span>
                    ) : (
                      <>
                        <ClipboardText size={15} weight="bold" />
                        <span>SUBMIT PARTNERSHIP APPLICATION</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Trust Signals repeated near conversion */}
          <div className="mt-10 pt-8 border-t border-[#2D3139] grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="flex items-center space-x-3 text-[#A0A4AB]">
              <Coins size={20} weight="bold" className="text-[#E23A2E] shrink-0" />
              <span>100% delivery fee to rider</span>
            </div>

            <div className="flex items-center space-x-3 text-[#A0A4AB]">
              <Percent size={20} weight="bold" className="text-[#C7A874] shrink-0" />
              <span>10% flat commission</span>
            </div>

            <div className="flex items-center space-x-3 text-[#A0A4AB]">
              <ShieldCheck size={20} weight="bold" className="text-[#1E5FA8] shrink-0" />
              <span>0 security deposit required</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
