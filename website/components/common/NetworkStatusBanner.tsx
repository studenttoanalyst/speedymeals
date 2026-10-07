'use client';

import React, { useEffect, useState } from 'react';

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // Initial check (only in browser)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setJustReconnected(false);
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualRetry = async () => {
    try {
      await fetch('/favicon.jpeg', { method: 'HEAD', cache: 'no-store' });
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    } catch {
      setIsOffline(true);
    }
  };

  if (!isOffline && !justReconnected) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md w-full px-4 pointer-events-none"
    >
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-full border shadow-xl backdrop-blur-md transition-all duration-300 font-mono text-xs ${
          isOffline
            ? 'bg-[#15171A]/95 text-white border-amber-500/40'
            : 'bg-[#15171A]/95 text-white border-emerald-500/40'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isOffline ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="truncate text-[11px] sm:text-xs">
            {isOffline
              ? 'Weak network · Reconnecting to Speedy Meals...'
              : 'Network restored · Back online'}
          </span>
        </div>

        {isOffline && (
          <button
            type="button"
            onClick={handleManualRetry}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-[10px] uppercase tracking-wider font-bold rounded-full transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    </aside>
  );
}
