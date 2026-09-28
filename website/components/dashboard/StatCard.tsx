'use client';

import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: {
    value: string;
    isPositive?: boolean;
    period?: string; // e.g. "vs last week"
  };
  accent?: 'red' | 'blue' | 'emerald' | 'amber' | 'none';
  icon?: React.ReactNode;
  targetBenchmark?: string; // per dashboard-designer: benchmark or target comparison
}

export function StatCard({
  label,
  value,
  subValue,
  change,
  accent = 'none',
  icon,
  targetBenchmark,
}: StatCardProps) {
  // Accent badge backgrounds
  const accentStyles = {
    red: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
    none: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  }[accent];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-slate-300 hover:shadow-xs group">
      {/* Card Header: Label & Icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg transition-colors ${accentStyles}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value (Level 1 KPI per dashboard-designer) */}
      <div className="space-y-2">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </div>

        {/* Supporting Context (Period comparison, Subtext, Target) */}
        {(change || subValue || targetBenchmark) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            {change && (
              <span
                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                  change.isPositive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                }`}
              >
                {change.isPositive ? (
                  <TrendUp size={12} weight="bold" />
                ) : (
                  <TrendDown size={12} weight="bold" />
                )}
                {change.value}
              </span>
            )}
            {change?.period && (
              <span className="text-slate-400 text-[11px]">{change.period}</span>
            )}
            {subValue && !change?.period && (
              <span className="text-slate-500 text-xs font-medium">{subValue}</span>
            )}
            {targetBenchmark && (
              <span className="ml-auto text-[11px] text-slate-400 font-mono">
                {targetBenchmark}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
