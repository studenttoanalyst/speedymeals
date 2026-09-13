'use client';

import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: {
    value: string;
    isPositive?: boolean;
  };
  accent?: 'red' | 'blue' | 'tan' | 'none';
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  subValue,
  change,
  accent = 'none',
  icon,
}: StatCardProps) {
  let accentClass = '';
  if (accent === 'red') accentClass = 'border-t-2 border-t-red';
  else if (accent === 'blue') accentClass = 'border-t-2 border-t-blue';
  else if (accent === 'tan') accentClass = 'border-t-2 border-t-tan';

  return (
    <div
      className={`bg-paper border border-line p-5 flex flex-col justify-between transition-colors hover:border-ink-soft/40 ${accentClass}`}
      style={{ borderRadius: '0px' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          {label}
        </span>
        {icon && <div className="text-ink-soft">{icon}</div>}
      </div>

      <div className="flex flex-col gap-1">
        <div className="font-mono text-2xl lg:text-3xl font-bold tracking-tight text-ink">
          {value}
        </div>

        {(subValue || change) && (
          <div className="flex items-center gap-2 mt-1">
            {change && (
              <span
                className={`font-mono text-xs font-semibold ${
                  change.isPositive ? 'text-[#1E7E34]' : 'text-[#C92A2A]'
                }`}
              >
                {change.isPositive ? '↑' : '↓'} {change.value}
              </span>
            )}
            {subValue && (
              <span className="font-sans text-xs text-ink-soft">
                {subValue}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
