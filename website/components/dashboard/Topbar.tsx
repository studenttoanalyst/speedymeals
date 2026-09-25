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

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/health', { method: 'GET' });
        if (isMounted) {
          if (res.ok) setBackendStatus('connected');
          else setBackendStatus('fallback');
        }
      } catch {
        if (isMounted) setBackendStatus('fallback');
      }
    };
    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs print:hidden">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-500 hidden sm:block print:block print:mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 print:hidden">
        {/* Backend API Live Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
          {backendStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FastAPI Backend Active</span>
            </>
          ) : backendStatus === 'checking' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Checking Backend...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Offline / Local Data Mode</span>
            </>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            <ArrowClockwise size={15} weight="bold" className={isRefreshing ? 'animate-spin text-rose-600' : ''} />
          </button>
        )}

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
