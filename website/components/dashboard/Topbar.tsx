'use client';

import React, { useEffect, useState } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';

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
    <header className="h-16 border-b border-line bg-paper px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="font-heading text-lg font-bold text-ink tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {description && (
          <p className="font-sans text-xs text-ink-soft hidden sm:block">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Connectivity Indicator */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 border border-line bg-paper-off font-mono text-[10px] text-ink-soft"
          style={{ borderRadius: '0px' }}
        >
          <span
            className={`w-1.5 h-1.5 inline-block ${
              backendStatus === 'connected'
                ? 'bg-[#1E7E34] animate-pulse'
                : backendStatus === 'checking'
                ? 'bg-[#8C6D1F]'
                : 'bg-[#C92A2A]'
            }`}
            style={{ borderRadius: '0px' }}
          />
          <span>
            {backendStatus === 'connected'
              ? 'FastAPI Connected'
              : backendStatus === 'checking'
              ? 'Checking API...'
              : 'Offline Fixture Mode'}
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            className="p-1.5 border border-line bg-paper text-ink-soft hover:text-ink hover:bg-paper-off transition-colors disabled:opacity-40"
            style={{ borderRadius: '0px' }}
          >
            <ArrowClockwise size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
