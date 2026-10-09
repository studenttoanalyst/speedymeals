import React from 'react';

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Speedy Meals"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs select-none pointer-events-none px-4"
    >
      {/* Centered Brand Emblem */}
      <div className="relative flex flex-col items-center">
        {/* Ambient Glow */}
        <div className="absolute -inset-4 bg-red/10 rounded-full blur-xl animate-pulse pointer-events-none" />

        {/* Logo Frame */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-[#E4E2DD] shadow-md flex items-center justify-center overflow-hidden">
          <img
            src="/favicon.webp"
            alt="Speedy Meals"
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-lg"
          />
        </div>

        {/* Micro-Progress Bar (Zero-weight pure CSS) */}
        <div className="w-24 sm:w-32 h-1 bg-[#F0EEEB] rounded-full overflow-hidden mt-4 relative">
          <div className="absolute inset-y-0 w-1/2 bg-red rounded-full animate-loader-slide" />
        </div>
      </div>
    </div>
  );
}
