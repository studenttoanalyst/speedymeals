'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Coins, ShieldWarning, CheckCircle, Warning, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

export function CashFloatRiskChart() {
  const floatTiers = [
    {
      tier: 'Safe Holding (< PKR 10k)',
      courierCount: 14,
      totalCash: 62400,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      status: 'Compliant',
    },
    {
      tier: 'Warning Window (PKR 10k–15k)',
      courierCount: 3,
      totalCash: 37800,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgLight: 'bg-amber-50',
      status: 'Approaching Cap',
    },
    {
      tier: 'Limit Breached (> PKR 15k)',
      courierCount: 1,
      totalCash: 18450,
      color: 'bg-rose-600',
      textColor: 'text-rose-700',
      bgLight: 'bg-rose-50',
      status: 'Action Required',
    },
  ];

  const totalCashInTransit = 118650;
  const maxSafePlatformCap = 250000;
  const floatConsumptionPct = Math.round((totalCashInTransit / maxSafePlatformCap) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Coins size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Fleet COD Cash Float & Risk Distribution
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  CAP: PKR 15,000 / RIDER
                </span>
              </div>
              <p className="text-xs text-slate-400">Cash on delivery held by active couriers before daily reconciliation deposit</p>
            </div>
          </div>

          <Link
            href="/admin/riders"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <span>Audit Fleet</span>
            <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        {/* Global Float Consumption Gauge */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Total Uncollected Float in Transit:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              PKR {totalCashInTransit.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${floatConsumptionPct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1">
            <span>Safety Threshold: {floatConsumptionPct}% utilized</span>
            <span>Platform Cap: PKR {maxSafePlatformCap.toLocaleString()}</span>
          </div>
        </div>

        {/* Risk Distribution Breakdown */}
        <div className="space-y-2.5">
          {floatTiers.map((t) => (
            <div
              key={t.tier}
              className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.color}`} />
                <div>
                  <div className="text-xs font-semibold text-slate-800">{t.tier}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {t.courierCount} active couriers · PKR {t.totalCash.toLocaleString()}
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${t.bgLight} ${t.textColor} border-current/20`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Alert Banner if Breached */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-rose-700">
          <ShieldWarning size={15} weight="bold" />
          <span className="font-semibold">1 Courier (Kashif Ali) has reached PKR 18,450 float</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Deposit Locked</span>
      </div>
    </div>
  );
}
