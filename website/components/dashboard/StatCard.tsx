'use client';

import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

/**
 * StatCard component built for Admin and Merchant (Restaurant) portals.
 *
 * Implements a strict 3-zone layout for pixel-perfect card alignment:
 * 1. Header (fixed height h-8): Single-line truncated label with title tooltip + fixed 32x32 icon box.
 * 2. Value (fixed line-height, tabular-nums): Fluid responsive font scaling to prevent wrapping of PKR strings.
 * 3. Footer (anchored via mt-auto): Always renders two fixed-height rows (Row A = context/change/subValue,
 *    Row B = target/benchmark) with space preserved even when empty.
 *
 * Semantic Accent Mapping:
 * - 'emerald': Money, Gross Revenue, Food Sales, Net Platform Revenue
 * - 'blue': Payable, Payouts, Settlement, Net Share
 * - 'slate' | 'none': Operations, Kitchen Counts, Rider Deliveries
 * - 'amber': Risk, COD Cash Hold, Cooking Prep SLA
 * - 'red': Urgent alerts, threshold violations
 */
export interface StatCardProps {
  /** Metric title/heading (rendered single-line, uppercase, truncated) */
  label: string;
  /** Primary metric value (PKR amounts, counts, percentages) */
  value: string | number;
  /** Secondary contextual description (shown in Row A if no change pill) */
  subValue?: string;
  /** Delta indicator with trend arrow and period (shown in Row A) */
  change?: {
    value: string;
    isPositive?: boolean;
    period?: string; // e.g. "vs target", "today"
  };
  /** Semantic color theme matching platform design standards */
  accent?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate' | 'none';
  /** Phosphor icon (rendered in a fixed 32x32 container) */
  icon?: React.ReactNode;
  /** Target comparison or benchmark reference (rendered in Row B) */
  targetBenchmark?: string;
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
  // Semantic Accent Mapping
  const accentStyles = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
    amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
    slate: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
    red: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
    none: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  }[accent || 'none'];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-full min-w-0 transition-all duration-200 hover:border-slate-300 hover:shadow-xs group">
      {/* Zone 1: Header (Fixed height h-8 with single-line truncated label + icon box) */}
      <div className="h-8 flex items-center justify-between gap-2 mb-3 min-w-0">
        <span
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate min-w-0 flex-1"
          title={label}
        >
          {label}
        </span>
        {icon && (
          <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors ${accentStyles}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Zone 2: Main Metric Value (Fixed line-height, tabular-nums, fluid scaling) */}
      <div className="my-auto py-1 min-w-0">
        <div
          className="text-2xl sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums leading-tight truncate"
          title={String(value)}
        >
          {value}
        </div>
      </div>

      {/* Zone 3: Footer with 2 Fixed-Height Rows & Fixed Divider Position */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-1 min-w-0">
        {/* Row A: Context (Pill + Period OR SubValue; reserved empty space if neither) */}
        <div className="h-5 flex items-center min-w-0">
          {change ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] leading-tight shrink-0 ${
                  change.isPositive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                }`}
              >
                {change.isPositive ? (
                  <TrendUp size={11} weight="bold" />
                ) : (
                  <TrendDown size={11} weight="bold" />
                )}
                <span>{change.value}</span>
              </span>
              {change.period && (
                <span className="text-slate-400 text-[11px] truncate min-w-0" title={change.period}>
                  {change.period}
                </span>
              )}
            </div>
          ) : subValue ? (
            <span
              className="text-slate-500 text-xs font-medium truncate min-w-0"
              title={subValue}
            >
              {subValue}
            </span>
          ) : (
            <div className="h-5" aria-hidden="true" />
          )}
        </div>

        {/* Row B: Benchmark (Target comparison; reserved empty space if none) */}
        <div className="h-4 flex items-center min-w-0">
          {targetBenchmark ? (
            <span
              className="text-[11px] text-slate-400 font-mono truncate min-w-0"
              title={targetBenchmark}
            >
              {targetBenchmark}
            </span>
          ) : (
            <div className="h-4" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
