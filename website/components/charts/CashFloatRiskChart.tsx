'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Coins, ShieldWarning, CheckCircle, Warning, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { RiderAdmin } from '@/types/rider';

interface CashFloatRiskChartProps {
  riders?: RiderAdmin[];
}

export function CashFloatRiskChart({ riders = [] }: CashFloatRiskChartProps) {
  const safeRiders = riders.filter((r) => (r.pending_cash_owed || 0) < 10000);
  const warningRiders = riders.filter(
    (r) => (r.pending_cash_owed || 0) >= 10000 && (r.pending_cash_owed || 0) <= (r.max_cash_float_limit || 15000)
  );
  const breachedRiders = riders.filter(
    (r) => (r.pending_cash_owed || 0) > (r.max_cash_float_limit || 15000)
  );

  const safeCash = safeRiders.reduce((acc, r) => acc + (r.pending_cash_owed || 0), 0);
  const warningCash = warningRiders.reduce((acc, r) => acc + (r.pending_cash_owed || 0), 0);
  const breachedCash = breachedRiders.reduce((acc, r) => acc + (r.pending_cash_owed || 0), 0);
  const totalCashInTransit = safeCash + warningCash + breachedCash;

  const floatTiers = [
    {
      tier: 'Safe Holding (< PKR 10k)',
      courierCount: safeRiders.length,
      totalCash: safeCash,
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgLight: 'bg-green-50',
      status: 'Compliant',
    },
    {
      tier: 'Warning Window (PKR 10k–15k)',
      courierCount: warningRiders.length,
      totalCash: warningCash,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgLight: 'bg-amber-50',
      status: 'Approaching Cap',
    },
    {
      tier: 'Limit Breached (> PKR 15k)',
      courierCount: breachedRiders.length,
      totalCash: breachedCash,
      color: 'bg-red-600',
      textColor: 'text-red-700',
      bgLight: 'bg-red-50',
      status: breachedRiders.length > 0 ? 'Action Required' : 'Zero Breaches',
    },
  ];

  const maxSafePlatformCap = 250000;
  const floatConsumptionPct = Math.round((totalCashInTransit / maxSafePlatformCap) * 100);

  return (
    <div className="bg-white border border-ink-200 rounded-md p-6 shadow-1 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Coins size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink-900 tracking-tight">
                  Fleet COD Cash Float & Risk Distribution
                </h2>
                <span className="text-2xs font-mono px-2 py-0.5 rounded-xs bg-red-50 text-red-700 border border-red-200 font-semibold">
                  CAP: PKR 15,000 / RIDER
                </span>
              </div>
              <p className="text-xs text-ink-400">Cash on delivery held by active riders before daily reconciliation deposit</p>
            </div>
          </div>

          <Link
            href="/admin/riders"
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <span>Audit Fleet</span>
            <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        {/* Global Float Consumption Gauge */}
        <div className="p-4 rounded-md bg-ink-50 border border-ink-200/80 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-ink-700">Total Uncollected Float in Transit:</span>
            <span className="font-mono font-bold text-ink-900 text-sm">
              PKR {totalCashInTransit.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 rounded-xs bg-ink-200 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${floatConsumptionPct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-600"
            />
          </div>
          <div className="flex items-center justify-between text-2xs font-mono text-ink-500 mt-1">
            <span>Safety Threshold: {floatConsumptionPct}% utilized</span>
            <span>Platform Cap: PKR {maxSafePlatformCap.toLocaleString()}</span>
          </div>
        </div>

        {/* Risk Distribution Breakdown */}
        <div className="space-y-2.5">
          {floatTiers.map((t) => (
            <div
              key={t.tier}
              className="p-3 bg-white border border-ink-200/80 rounded-md flex items-center justify-between hover:bg-ink-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.color}`} />
                <div>
                  <div className="text-xs font-semibold text-ink-800">{t.tier}</div>
                  <div className="text-2xs font-mono text-ink-400">
                    {t.courierCount} active riders · PKR {t.totalCash.toLocaleString()}
                  </div>
                </div>
              </div>

              <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-md border ${t.bgLight} ${t.textColor} border-current/20`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Alert Banner if Breached */}
      <div className="mt-5 pt-3 border-t border-ink-100 flex items-center justify-between text-xs">
        {breachedRiders.length > 0 ? (
          <div className="flex items-center gap-1.5 text-red-700">
            <ShieldWarning size={15} weight="bold" />
            <span className="font-semibold">
              {breachedRiders.length} Rider{breachedRiders.length > 1 ? 's' : ''} ({breachedRiders[0].name}) exceeded PKR 15,000 float cap
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-green-700">
            <CheckCircle size={15} weight="bold" />
            <span className="font-semibold">All fleet COD cash within safe threshold limits</span>
          </div>
        )}
        <span className="text-2xs font-mono text-ink-400">
          {breachedRiders.length > 0 ? 'Deposit Locked' : 'Reconciliation Clear'}
        </span>
      </div>
    </div>
  );
}
