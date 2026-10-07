'use client';

import React from 'react';
import {
  Tag,
  Percent,
  Bicycle,
  ShieldCheck,
  MapPin,
  CurrencyDollar,
  Sparkle,
} from '@phosphor-icons/react';

export interface PromotionOffer {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: 'tag' | 'percent' | 'bike' | 'shield' | 'pin' | 'dollar';
}

export const PROMOTIONAL_OFFERS: PromotionOffer[] = [
  {
    id: 'p1',
    badge: 'DELIVERY',
    title: 'Reliable & Fast',
    subtitle: 'Fair distance-based delivery pricing',
    icon: 'bike',
  },
  {
    id: 'p2',
    badge: 'MERCHANTS',
    title: '10% Flat Commission',
    subtitle: 'Restaurants keep their hard-earned margins',
    icon: 'percent',
  },
  {
    id: 'p3',
    badge: 'FOOD LOVERS',
    title: 'Zero Menu Markups',
    subtitle: 'Order at original kitchen menu prices',
    icon: 'tag',
  },
  {
    id: 'p4',
    badge: 'RIDERS',
    title: '90% Delivery Pay',
    subtitle: 'Reliable weekly payouts straight to riders',
    icon: 'dollar',
  },
  {
    id: 'p5',
    badge: 'CHECKOUT',
    title: 'Cash & Digital Pay',
    subtitle: 'Cash on delivery plus secure digital payments',
    icon: 'shield',
  },
  {
    id: 'p6',
    badge: 'NETWORK',
    title: 'Pakistan & Saudi Arabia',
    subtitle: 'Expanding neighborhood delivery coverage',
    icon: 'pin',
  },
];

export const PromoBanner: React.FC = () => {
  // Triple items for seamless infinite rolling marquee
  const tickerItems = [...PROMOTIONAL_OFFERS, ...PROMOTIONAL_OFFERS, ...PROMOTIONAL_OFFERS];

  const renderIcon = (type: PromotionOffer['icon']) => {
    switch (type) {
      case 'bike':
        return <Bicycle size={14} weight="bold" className="text-white" />;
      case 'percent':
        return <Percent size={14} weight="bold" className="text-white" />;
      case 'tag':
        return <Tag size={14} weight="bold" className="text-white" />;
      case 'dollar':
        return <CurrencyDollar size={14} weight="bold" className="text-white" />;
      case 'shield':
        return <ShieldCheck size={14} weight="bold" className="text-white" />;
      case 'pin':
        return <MapPin size={14} weight="bold" className="text-white" />;
      default:
        return <Sparkle size={14} weight="bold" className="text-white" />;
    }
  };

  return (
    <div
      aria-label="Speedy Meals Promotions and Guarantees"
      className="group relative z-10 w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] py-2.5 sm:py-3 bg-gradient-to-r from-[#DF3226] via-[#E23A2E] to-[#D3281C] text-white border-y border-[#C9251A] overflow-hidden select-none shadow-sm"
    >
      {/* Edge gradient dissolves matching rose red background */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#DF3226] to-transparent z-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#D3281C] to-transparent z-20" />

      {/* Continuous rolling promotion tape - pauses gracefully on hover */}
      <div className="animate-marquee group-hover:[animation-play-state:paused] flex items-center flex-nowrap shrink-0 space-x-4 sm:space-x-5">
        {tickerItems.map((offer, idx) => (
          <div
            key={`${offer.id}-${idx}`}
            className="inline-flex items-center space-x-2.5 px-3.5 sm:px-4 py-1.5 bg-white/12 hover:bg-white/22 border border-white/25 rounded-full shrink-0 backdrop-blur-md shadow-xs transition-all duration-200 cursor-default hover:scale-[1.02]"
          >
            {/* Icon circle */}
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {renderIcon(offer.icon)}
            </div>

            {/* Badge pill */}
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-white/90 bg-black/20 px-2 py-0.5 rounded-full">
              {offer.badge}
            </span>

            {/* Title */}
            <span className="font-heading font-extrabold text-xs text-white uppercase tracking-tight whitespace-nowrap">
              {offer.title}
            </span>

            {/* Divider dot */}
            <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />

            {/* Subtitle */}
            <span className="text-[11.5px] sm:text-xs text-white/90 font-sans font-medium whitespace-nowrap">
              {offer.subtitle}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Backwards-compatibility alias
export const PartnerBannerMarquee = PromoBanner;
