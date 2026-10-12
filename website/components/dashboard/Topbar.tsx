'use client';

import React, { useEffect, useState } from 'react';
import { ArrowClockwise, WifiHigh, WifiSlash } from '@phosphor-icons/react';

export interface TopbarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Topbar({
  title,
  description,
  actions,
  onRefresh,
  isRefreshing = false,
}: TopbarProps) {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'checking' | 'fallback'>('checking');

  const checkHealth = React.useCallback(async () => {
    try {
      const res = await fetch('/api/health', { method: 'GET' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setBackendStatus(data.status === 'connected' ? 'connected' : 'fallback');
      } else {
        setBackendStatus('fallback');
      }
    } catch {
      setBackendStatus('fallback');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl saturate-180 px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] print:hidden">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 print:hidden">
        {/* Backend API Live Indicator */}
        <button
          type="button"
          onClick={() => checkHealth()}
          title="Click to recheck server connection"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-600 transition-all duration-100 cursor-pointer active:scale-95 select-none"
        >
          {backendStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Server Connected</span>
            </>
          ) : backendStatus === 'checking' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Connecting to Server...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Offline Mode (Local Data)</span>
            </>
          )}
        </button>

        {onRefresh ? (
          <button
            onClick={() => {
              checkHealth();
              onRefresh();
            }}
            disabled={isRefreshing}
            title="Refresh Data"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-100 disabled:opacity-40 cursor-pointer active:scale-90 select-none"
          >
            <ArrowClockwise size={15} weight="bold" className={isRefreshing ? 'animate-spin text-slate-700' : ''} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => checkHealth()}
            title="Recheck Server Connection"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-100 cursor-pointer active:scale-90 select-none"
          >
            <ArrowClockwise size={15} weight="bold" />
          </button>
        )}

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
