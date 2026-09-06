'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, ShieldCheck, CurrencyCircleDollar, Lightning } from '@phosphor-icons/react';

interface HeroSectionProps {
  onSelectPersona: (persona: 'rider' | 'restaurant') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPersona }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High-performance loopable animated canvas depicting the SpeedyMeals courier delivery to home
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      t += 0.015;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Gradient backdrop with transparency at top and sides so reeded glass shines through
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      bgGrad.addColorStop(0.5, 'rgba(246, 245, 243, 0.4)');
      bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Stylized architectural skyline backdrop (South Asia & Middle East silhouette)
      ctx.strokeStyle = 'rgba(228, 226, 221, 0.5)';
      ctx.lineWidth = 1;
      const buildingWidth = 70;
      const numBuildings = Math.ceil(w / buildingWidth) + 1;
      for (let i = 0; i < numBuildings; i++) {
        const bx = i * buildingWidth;
        const bh = 140 + Math.sin(i * 1.7) * 70;
        ctx.strokeRect(bx, h - bh - 60, buildingWidth, bh);
        // Architectural window grids
        for (let wy = h - bh - 40; wy < h - 70; wy += 22) {
          if ((i + wy) % 2 === 0) {
            ctx.fillStyle = 'rgba(199, 168, 116, 0.12)';
            ctx.fillRect(bx + 14, wy, 16, 12);
          }
        }
      }

      // Ground horizon line
      ctx.beginPath();
      ctx.moveTo(0, h - 60);
      ctx.lineTo(w, h - 60);
      ctx.strokeStyle = '#E4E2DD';
      ctx.stroke();

      // Modern Home Entrance (Destination) on the right side
      const homeX = w * 0.72;
      const homeY = h - 180;
      // Home facade outline
      ctx.fillStyle = 'rgba(246, 245, 243, 0.85)';
      ctx.fillRect(homeX, homeY, 180, 120);
      ctx.strokeStyle = '#15171A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(homeX, homeY, 180, 120);

      // Warm doorway light (symbolizing welcoming delivery)
      const doorLight = ctx.createRadialGradient(homeX + 50, homeY + 60, 5, homeX + 50, homeY + 60, 70);
      doorLight.addColorStop(0, 'rgba(199, 168, 116, 0.35)');
      doorLight.addColorStop(1, 'rgba(199, 168, 116, 0)');
      ctx.fillStyle = doorLight;
      ctx.fillRect(homeX - 20, homeY, 140, 120);

      // Door frame
      ctx.strokeRect(homeX + 35, homeY + 30, 45, 90);
      ctx.fillStyle = '#15171A';
      ctx.fillRect(homeX + 37, homeY + 32, 41, 88);
      // Door handle
      ctx.fillStyle = '#C7A874';
      ctx.fillRect(homeX + 70, homeY + 75, 4, 10);

      // Animated Delivery Courier Figure (moving smoothly toward home entrance, loopable)
      const cycleDuration = 8; // seconds per cycle
      const cycleProgress = (t % cycleDuration) / cycleDuration;
      // Courier travels from left (w * 0.25) to destination (homeX + 15), pauses to deliver parcel, then loops
      let courierX: number;
      let isDelivering = false;

      if (cycleProgress < 0.65) {
        // Approaching
        const p = cycleProgress / 0.65;
        courierX = w * 0.25 + (homeX - 10 - w * 0.25) * Math.sin((p * Math.PI) / 2);
      } else if (cycleProgress < 0.85) {
        // Handover at door
        courierX = homeX - 10;
        isDelivering = true;
      } else {
        // Fade or loop restart
        courierX = w * 0.25;
      }

      const courierY = h - 60;

      // Draw Courier on Electric Delivery Bike / Scooter
      ctx.save();
      ctx.translate(courierX, courierY);

      // Wheels
      const wheelRotation = t * 8;
      ctx.strokeStyle = '#15171A';
      ctx.lineWidth = 2.5;

      // Back wheel
      ctx.beginPath();
      ctx.arc(-26, -14, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Front wheel
      ctx.beginPath();
      ctx.arc(26, -14, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Wheel spokes
      if (!isDelivering) {
        ctx.beginPath();
        ctx.moveTo(-26 + Math.cos(wheelRotation) * 12, -14 + Math.sin(wheelRotation) * 12);
        ctx.lineTo(-26 - Math.cos(wheelRotation) * 12, -14 - Math.sin(wheelRotation) * 12);
        ctx.moveTo(26 + Math.cos(wheelRotation) * 12, -14 + Math.sin(wheelRotation) * 12);
        ctx.lineTo(26 - Math.cos(wheelRotation) * 12, -14 - Math.sin(wheelRotation) * 12);
        ctx.stroke();
      }

      // Bike chassis (sharp hairline geometric)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-26, -14);
      ctx.lineTo(0, -18);
      ctx.lineTo(18, -36);
      ctx.lineTo(26, -14);
      ctx.moveTo(0, -18);
      ctx.lineTo(2, -38);
      ctx.stroke();

      // SpeedyMeals Insulated Delivery Backpack (Signature --red)
      ctx.fillStyle = '#E23A2E';
      ctx.fillRect(-22, -62, 16, 22);
      ctx.strokeStyle = '#15171A';
      ctx.lineWidth = 1;
      ctx.strokeRect(-22, -62, 16, 22);
      // Bag white reflective stripe
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-22, -52, 16, 3);

      // Courier Figure
      // Torso
      ctx.fillStyle = '#15171A';
      ctx.fillRect(-6, -58, 14, 26);
      // Helmet / Head
      ctx.beginPath();
      ctx.arc(4, -68, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#15171A';
      ctx.fill();
      // Helmet Visor (reflecting city light)
      ctx.fillStyle = '#1E5FA8';
      ctx.fillRect(7, -70, 5, 4);

      // Handlebars and arms
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, -50);
      ctx.lineTo(16, -38);
      ctx.stroke();

      // Parcel in hand during delivery moment
      if (isDelivering) {
        const parcelHover = Math.sin(t * 4) * 2;
        ctx.fillStyle = '#C7A874';
        ctx.fillRect(20, -50 + parcelHover, 14, 12);
        ctx.strokeStyle = '#15171A';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, -50 + parcelHover, 14, 12);
        // Ribbon
        ctx.fillStyle = '#E23A2E';
        ctx.fillRect(26, -50 + parcelHover, 2, 12);
      }

      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleScrollToPartner = (persona: 'rider' | 'restaurant') => {
    onSelectPersona(persona);
    const partnerSection = document.getElementById('partner');
    if (partnerSection) {
      partnerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToServices = () => {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Motion variants with staggerChildren: 0.1
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const, // momentum-forward easing
      },
    },
  };

  return (
    <section
      id="about"
      className="relative min-h-screen flex flex-col justify-between pt-24 pb-12 overflow-hidden"
    >
      {/* BACKGROUND VIDEO / ANIMATED COURIER DELIVERY CANVAS LAYER */}
      {/* Sits ABOVE reeded glass, but BELOW content scrim */}
      <div
        id="hero-video-canvas-layer"
        className="absolute inset-0 z-0 pointer-events-none opacity-80"
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        {/* Dark-to-transparent overlay gradient bottom-up over video for legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.75) 45%, rgba(255,255,255,0.98) 85%)',
          }}
        />
      </div>

      {/* Hero Content Container (Semi-opaque 95%+ scrim for pristine readability) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl"
        >
          {/* Eyebrow: FAST & SAFE TO YOU (mono, tracking-widest, --red, subtle color coupling) */}
          <motion.div variants={itemVariants} className="flex items-center space-x-3 mb-5">
            <span
              className="inline-block w-2 h-2 transition-colors duration-300"
              style={{ backgroundColor: 'var(--dynamic-accent, #E23A2E)' }}
            />
            <span
              id="hero-eyebrow"
              className="font-mono text-xs uppercase tracking-[0.25em] font-semibold text-[#E23A2E]"
            >
              FAST & SAFE TO YOU
            </span>
            <div className="h-px w-12 bg-[#E4E2DD]" />
            <span className="font-mono text-[11px] text-[#5B5F66] tracking-wider uppercase hidden sm:inline-block">
              SOUTH ASIA & MIDDLE EAST NETWORK
            </span>
          </motion.div>

          {/* Headline (Archivo Black, huge, --ink): SPEEDYMEALS / FAST. FAIR. GLOBAL. */}
          <motion.div variants={itemVariants} className="mb-6">
            <h1
              id="hero-headline"
              className="font-['Archivo_Black'] text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-[#15171A] uppercase leading-[0.92]"
            >
              SPEEDYMEALS
              <br />
              <span className="text-[#15171A] flex flex-wrap items-center gap-x-3 sm:gap-x-4">
                <span>FAST.</span>
                <span
                  className="transition-colors duration-300"
                  style={{ color: 'var(--dynamic-accent, #E23A2E)' }}
                >
                  FAIR.
                </span>
                <span>GLOBAL.</span>
              </span>
            </h1>
          </motion.div>

          {/* Subhead with Scrim background */}
          <motion.div
            variants={itemVariants}
            className="mb-8 p-5 bg-[#FFFFFF]/95 border-l-2 border-[#15171A] border-y border-r border-[#E4E2DD] max-w-3xl"
          >
            <p className="text-base sm:text-lg text-[#15171A] leading-relaxed font-sans font-normal">
              A new delivery platform for South Asia & the Middle East — built so riders keep{' '}
              <strong className="font-semibold text-[#E23A2E] underline decoration-1 underline-offset-4">
                100% of the delivery fee
              </strong>{' '}
              and restaurants pay a flat{' '}
              <strong className="font-semibold text-[#1E5FA8]">10%</strong>. No hidden cuts, no
              extraction.
            </p>
          </motion.div>

          {/* Company detail block (small, mono labels): editorial not corporate */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 max-w-3xl font-mono"
          >
            <div className="p-3 bg-[#FFFFFF]/90 border border-[#E4E2DD]">
              <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] flex items-center space-x-1 mb-1">
                <CurrencyCircleDollar size={13} weight="bold" className="text-[#E23A2E]" />
                <span>RIDER REMUNERATION</span>
              </div>
              <div className="text-sm font-bold text-[#15171A]">100% Retained</div>
              <div className="text-[11px] text-[#5B5F66]">Zero commission off rider mileage</div>
            </div>

            <div className="p-3 bg-[#FFFFFF]/90 border border-[#E4E2DD]">
              <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] flex items-center space-x-1 mb-1">
                <ShieldCheck size={13} weight="bold" className="text-[#1E5FA8]" />
                <span>MERCHANT CONTRACT</span>
              </div>
              <div className="text-sm font-bold text-[#15171A]">10% Flat Rate</div>
              <div className="text-[11px] text-[#5B5F66]">No promotion gouging or tiers</div>
            </div>

            <div className="p-3 bg-[#FFFFFF]/90 border border-[#E4E2DD]">
              <div className="text-[10px] uppercase tracking-wider text-[#5B5F66] flex items-center space-x-1 mb-1">
                <Lightning size={13} weight="bold" className="text-[#C7A874]" />
                <span>INFRASTRUCTURE</span>
              </div>
              <div className="text-sm font-bold text-[#15171A]">Real-Time Dispatch</div>
              <div className="text-[11px] text-[#5B5F66]">Direct routing telemetry</div>
            </div>
          </motion.div>

          {/* Two CTAs: RIDE WITH US (--red) / PARTNER YOUR RESTAURANT (--blue outline) */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8"
          >
            <button
              id="hero-cta-ride"
              type="button"
              onClick={() => handleScrollToPartner('rider')}
              className="px-8 py-4 bg-[#E23A2E] text-white font-mono text-xs uppercase tracking-widest font-bold border border-[#E23A2E] hover:bg-[#15171A] hover:border-[#15171A] transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <span>RIDE WITH US</span>
              <ArrowRight size={14} weight="bold" />
            </button>

            <button
              id="hero-cta-restaurant"
              type="button"
              onClick={() => handleScrollToPartner('restaurant')}
              className="px-8 py-4 bg-transparent text-[#1E5FA8] font-mono text-xs uppercase tracking-widest font-bold border border-[#1E5FA8] hover:bg-[#1E5FA8] hover:text-white transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <span>PARTNER YOUR RESTAURANT</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom-left: "SCROLL TO DISCOVER" mono label + scroll indicator */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between pt-4 border-t border-[#E4E2DD]">
          <button
            id="hero-scroll-indicator"
            type="button"
            onClick={handleScrollToServices}
            className="flex items-center space-x-3 text-[#5B5F66] hover:text-[#15171A] transition-colors duration-150 font-mono text-xs uppercase tracking-widest"
          >
            <span className="w-5 h-5 border border-[#15171A] flex items-center justify-center text-[#15171A]">
              <ArrowDown size={12} weight="bold" />
            </span>
            <span>SCROLL TO DISCOVER SERVICES</span>
          </button>

          <div className="font-mono text-[11px] text-[#5B5F66] tracking-wider hidden sm:block">
            DEPLOYMENT: DUBAI · DOHA · KARACHI · LAHORE · RIYADH
          </div>
        </div>
      </div>
    </section>
  );
};
