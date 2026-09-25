'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Timer, CheckCircle, WarningCircle, ShieldCheck, Lightning } from '@phosphor-icons/react';

export function SlaLatencyChart() {
  const percentiles = [
    { label: 'P50 (Median)', value: '18.4 mins', status: 'Lightning', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'P90 Target', value: '25.8 mins', status: 'On Track', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'P99 Tail', value: '34.2 mins', status: 'Investigating', color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const buckets = [
    { range: '< 20 mins', count: 94, pct: 51.1, color: 'bg-emerald-500', label: 'Ultra Fast' },
    { range: '20–30 mins', count: 72, pct: 39.1, color: 'bg-blue-500', label: 'On Target' },
    { range: '30–40 mins', count: 14, pct: 7.6, color: 'bg-amber-500', label: 'Elevated Prep' },
    { range: '> 40 mins', count: 4, pct: 2.2, color: 'bg-rose-600', label: 'SLA Breached' },
  ];

  const errorBudgetCompliant = 97.4;

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
                  Delivery Latency & SLO Error Budget
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  SLO TARGET &lt; 30 MINS
                </span>
              </div>
              <p className="text-xs text-slate-400">P50 / P90 / P99 fulfillment latency percentiles across active Karachi zones</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-mono font-bold text-emerald-600">
              {errorBudgetCompliant}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">SLO Adherence</div>
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
            <span>Fulfillment Time Distribution (184 orders)</span>
            <span>Error Budget Remaining: 89.2%</span>
          </div>

          <div className="space-y-2">
            {buckets.map((b) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Footer SLA Guarantee Notice */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 text-emerald-700">
          <ShieldCheck size={15} weight="bold" />
          <span>97.4% customer orders delivered within 30-minute promise</span>
        </span>
        <span className="text-slate-400 font-mono text-[11px]">SRE Engine v2.4</span>
      </div>
    </div>
  );
}
