'use client';

import React, { useEffect, useRef } from 'react';

interface ReededGlassBackgroundProps {
  scrollProgress?: number;
}

export const ReededGlassBackground: React.FC<ReededGlassBackgroundProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displacementMapRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animFrameId: number;
    let targetX = window.innerWidth * 0.45;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let hasUserMoved = false;
    let idleAngle = 0;

    // Scroll-based section intensity tracking
    let currentIntensity = 1.0; // 1.0 for sections 1 & 2, interpolates to 0.35 in section 3, 0 in footer
    let targetIntensity = 1.0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      hasUserMoved = true;
      if ('touches' in e && e.touches.length > 0) {
        targetX = e.touches[0].clientX;
        targetY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        targetX = e.clientX;
        targetY = e.clientY;
      }
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const partnerSection = document.getElementById('partner');
      const footerSection = document.querySelector('footer');

      if (footerSection) {
        const footerRect = footerSection.getBoundingClientRect();
        if (footerRect.top <= window.innerHeight) {
          // Footer is entering view: smoothly fade out completely
          const footerVisibleRatio = Math.max(0, (window.innerHeight - footerRect.top) / window.innerHeight);
          targetIntensity = Math.max(0, 0.35 * (1 - footerVisibleRatio * 1.5));
          return;
        }
      }

      if (partnerSection) {
        const partnerRect = partnerSection.getBoundingClientRect();
        if (partnerRect.top < window.innerHeight && partnerRect.bottom > 0) {
          // Inside partner section: reduced intensity (~6-10% bloom, softened ribs)
          const enterRatio = Math.min(1, Math.max(0, (window.innerHeight - partnerRect.top) / (window.innerHeight * 0.8)));
          targetIntensity = 1.0 - enterRatio * 0.65; // goes from 1.0 down to 0.35
          return;
        } else if (partnerRect.top >= window.innerHeight) {
          // Before partner section (About & Services): full intensity (1.0)
          targetIntensity = 1.0;
          return;
        }
      }

      targetIntensity = 1.0;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Render loop with lerp easing
    const render = () => {
      if (!prefersReducedMotion) {
        if (!hasUserMoved) {
          // Autonomous slow drift when user hasn't interacted or on mobile
          idleAngle += 0.008;
          targetX = window.innerWidth * 0.5 + Math.cos(idleAngle) * (window.innerWidth * 0.28);
          targetY = window.innerHeight * 0.45 + Math.sin(idleAngle * 1.3) * (window.innerHeight * 0.22);
        }

        // Smooth spring/lerp (lag ~180ms)
        const lerpFactor = 0.065;
        currentX += (targetX - currentX) * lerpFactor;
        currentY += (targetY - currentY) * lerpFactor;

        // Smooth scroll intensity lerp
        currentIntensity += (targetIntensity - currentIntensity) * 0.08;

        if (containerRef.current) {
          containerRef.current.style.setProperty('--mx', `${currentX.toFixed(1)}px`);
          containerRef.current.style.setProperty('--my', `${currentY.toFixed(1)}px`);
          containerRef.current.style.setProperty('--bloom-intensity', currentIntensity.toFixed(3));
        }

        if (displacementMapRef.current) {
          // Scale ribs distortion from 22 down to 6 in partner section
          const scale = 6 + currentIntensity * 16;
          displacementMapRef.current.setAttribute('scale', scale.toFixed(1));
        }

        // Dynamic text-color coupling:
        // Calculate dynamic accent hue based on cursor angle and position
        // Zone 1: Red (#E23A2E), Zone 2: Tan (#C7A874), Zone 3: Blue (#1E5FA8)
        const normalizedX = currentX / (window.innerWidth || 1);
        const normalizedY = currentY / (window.innerHeight || 1);
        const angle = Math.atan2(normalizedY - 0.5, normalizedX - 0.5);

        let activeColor = '#E23A2E';
        let activeSoft = 'rgba(226, 58, 46, 0.15)';

        if (angle < -0.5) {
          activeColor = '#E23A2E'; // Red
          activeSoft = 'rgba(226, 58, 46, 0.16)';
        } else if (angle >= -0.5 && angle < 1.2) {
          activeColor = '#C7A874'; // Tan
          activeSoft = 'rgba(199, 168, 116, 0.20)';
        } else {
          activeColor = '#1E5FA8'; // Blue
          activeSoft = 'rgba(30, 95, 168, 0.16)';
        }

        document.documentElement.style.setProperty('--dynamic-accent', activeColor);
        document.documentElement.style.setProperty('--dynamic-accent-soft', activeSoft);
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();
    handleScroll();

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="reeded-glass-background"
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#FFFFFF]"
      style={{
        // default fallback position
        '--mx': '45vw',
        '--my': '35vh',
        '--bloom-intensity': '1.0',
      } as React.CSSProperties}
    >
      {/* Hidden SVG Filter for Vertical Fluted Glass Ribs */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="fluted-glass-filter"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            filterUnits="objectBoundingBox"
          >
            {/* Low frequency Y, horizontal ribbing frequency X */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045 0.0008"
              numOctaves="2"
              result="ribsNoise"
            />
            <feDisplacementMap
              ref={displacementMapRef}
              in="SourceGraphic"
              in2="ribsNoise"
              scale="22"
              xChannelSelector="R"
              yChannelSelector="G"
              result="refractedOutput"
            />
          </filter>
        </defs>
      </svg>

      {/* Radial Bloom Layer: Blend of Red -> Tan -> Blue with Dynamic Intensity */}
      <div
        className="absolute inset-0 transition-opacity duration-300 ease-out"
        style={{
          filter: 'url(#fluted-glass-filter)',
          opacity: 'calc(var(--bloom-intensity, 1) * 1)',
          background: `
            radial-gradient(
              circle 520px at var(--mx) var(--my),
              rgba(226, 58, 46, 0.24) 0%,
              rgba(199, 168, 116, 0.20) 38%,
              rgba(30, 95, 168, 0.16) 72%,
              rgba(255, 255, 255, 0) 100%
            )
          `,
        }}
      />

      {/* Optical Vertical Reeded Glass Ribs (repeating fluted glass surface) */}
      <div
        className="absolute inset-0 reeded-ribs opacity-90 transition-opacity duration-300"
        style={{
          opacity: 'calc(0.4 + var(--bloom-intensity, 1) * 0.55)',
        }}
      />

      {/* Delicate hairline vertical guides for editorial precision */}
      <div className="absolute inset-0 grid grid-cols-6 md:grid-cols-12 pointer-events-none opacity-25">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border-r border-[#E4E2DD] h-full" />
        ))}
      </div>
    </div>
  );
};
