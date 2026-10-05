'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Timer, CheckCircle, WarningCircle, ShieldCheck, Lightning } from '@phosphor-icons/react';

interface SlaPercentile {
  label: string;
  value: string;
  status: string;
  color: string;
  bg: string;
}

interface SlaBucket {
  range: string;
  count: number;
  pct: number;
  color: string;
  label: string;
}

interface SlaLatencyChartProps {
  totalDeliveredOrders?: number;
  onTimeRate?: number;
  percentiles?: SlaPercentile[];
  buckets?: SlaBucket[];
}

export function SlaLatencyChart({
  totalDeliveredOrders = 0,
  onTimeRate = 0,
  percentiles = [
    { label: 'Average (Median)', value: '0.0 mins', status: 'No Data', color: 'text-slate-500', bg: 'bg-slate-100' },
    { label: 'Most Deliveries (90%)', value: '0.0 mins', status: 'No Data', color: 'text-slate-500', bg: 'bg-slate-100' },
    { label: 'Slowest (99%)', value: '0.0 mins', status: 'No Data', color: 'text-slate-500', bg: 'bg-slate-100' },
  ],
  buckets = [
    { range: '< 20 mins', count: 0, pct: 0, color: 'bg-emerald-500', label: 'Very Fast' },
    { range: '20-30 mins', count: 0, pct: 0, color: 'bg-blue-500', label: 'On Time' },
    { range: '30-40 mins', count: 0, pct: 0, color: 'bg-amber-500', label: 'Slower Prep' },
    { range: '> 40 mins', count: 0, pct: 0, color: 'bg-rose-600', label: 'Late (>40 mins)' },
  ],
}: SlaLatencyChartProps) {
  const errorBudgetCompliant = onTimeRate;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Timer size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Delivery Times & 30-Minute Target
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  TARGET: UNDER 30 MINS
                </span>
              </div>
              <p className="text-xs text-slate-400">Fastest, average, and slowest delivery times across Karachi</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-mono font-bold text-emerald-600">
              {errorBudgetCompliant}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">On-Time Rate</div>
          </div>
        </div>

        {/* Latency Percentiles Cards */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          {percentiles.map((p) => (
            <div key={p.label} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="text-[11px] font-mono text-slate-500">{p.label}</div>
              <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{p.value}</div>
              <span className={`inline-block text-[10px] font-medium mt-1 px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>

        {/* Latency Distribution Histogram */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Delivery Times Breakdown ({totalDeliveredOrders} orders)</span>
            <span>On-Time Score: {totalDeliveredOrders > 0 ? `${errorBudgetCompliant}%` : '100%'}</span>
          </div>

          <div className="space-y-2">
            {totalDeliveredOrders === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400 font-mono">
                No delivered orders recorded yet today
              </div>
            ) : (
              buckets.map((b) => (
                <div key={b.range} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-xs ${b.color}`} />
                      {b.range} <span className="text-slate-400">({b.label})</span>
                    </span>
                    <span className="font-mono text-slate-600">
                      {b.count} orders ({b.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${b.color}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer SLA Guarantee Notice */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 text-emerald-700">
          <ShieldCheck size={15} weight="bold" />
          <span>
            {totalDeliveredOrders > 0
              ? `${errorBudgetCompliant}% customer orders delivered within 30-minute promise`
              : 'SpeedyMeals 30-minute delivery guarantee active'}
          </span>
        </span>
        <span className="text-slate-400 font-mono text-[11px]">SpeedyMeals Dispatch</span>
      </div>
    </div>
  );
}
