'use client';

import React from 'react';
import Image from 'next/image';

/**
 * ============================================================================
 * DYNAMIC ALLIANCE CONTINUOUS MARQUEE BELT CONFIGURATION
 * ============================================================================
 * 
 * MANDATORY ASPECT RATIO GUIDELINE:
 * ----------------------------------
 * All banner assets MUST follow a 526:129 aspect ratio (~4.077 : 1, roughly 4:1).
 * 
 * Recommended standard resolutions:
 * - 1x Standard: 526px  × 129px
 * - 2x Retina:   1052px × 258px
 * - 3x Ultra-HD: 1578px × 387px
 * 
 * To add new banners in the future:
 * 1. Ensure the image conforms to the 526:129 (4.08:1) aspect ratio.
 * 2. Save the graphic inside `/public/assets/` (or any public path).
 * 3. Append a new entry to the `PARTNER_BANNERS` array below.
 * ============================================================================
 */
export interface PartnerBannerItem {
  id: string;
  title: string;
  imageSrc: string;
  /** Aspect ratio string: 526/129 (~4.08 : 1) */
  aspectRatio: string;
}

export const PARTNER_BANNERS: PartnerBannerItem[] = [
  {
    id: 'pakistan-post-banner-1',
    title: 'Pakistan Post Strategic Alliance - Real-Time Distribution Fleet',
    imageSrc: '/assets/pakistan-post-banner.png',
    aspectRatio: '526/129',
  },
  {
    id: 'pakistan-post-banner-2',
    title: 'SpeedyMeals x Pakistan Post - National Priority Logistics',
    imageSrc: '/assets/pakistan-post-banner2.png',
    aspectRatio: '526/129',
  },
];

export const PartnerBannerMarquee: React.FC = () => {
  // Repeat banners 6 times so it forms a continuous, seamless belt without empty gaps
  const marqueeItems = [
    ...PARTNER_BANNERS,
    ...PARTNER_BANNERS,
    ...PARTNER_BANNERS,
    ...PARTNER_BANNERS,
    ...PARTNER_BANNERS,
    ...PARTNER_BANNERS,
  ];

  return (
    <div
      aria-label="Logistics Partner Banners"
      className="relative z-10 w-full py-2 sm:py-3 bg-[#FFFFFF] border-y border-line/60 overflow-hidden select-none"
    >
      {/* Soft gradient edge dissolves */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-20 md:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-20 md:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-20" />

      {/* Seamless Continuous Moving Tape — No text headers, no popping out, connected end-to-end */}
      <div className="animate-marquee flex items-center flex-nowrap shrink-0">
        {marqueeItems.map((banner, idx) => (
          <div
            key={`${banner.id}-${idx}`}
            className="relative shrink-0 flex items-center justify-center overflow-hidden border-r border-line/30"
            style={{
              aspectRatio: banner.aspectRatio,
            }}
          >
            <div className="relative h-12 sm:h-16 md:h-20 lg:h-22 w-auto flex items-center justify-center overflow-hidden">
              <Image
                src={banner.imageSrc}
                alt={banner.title}
                width={526}
                height={129}
                className="h-full w-auto object-contain select-none pointer-events-none"
                priority={idx < 4}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
