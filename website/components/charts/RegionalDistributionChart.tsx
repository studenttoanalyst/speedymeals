'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, NavigationArrow, Bicycle, Storefront, ChartPieSlice } from '@phosphor-icons/react';
import { tokens } from '@/lib/design-tokens';

export interface RegionalZoneData {
  id: string;
  name: string;
  sharePct: number;
  orderCount: number;
  avgSlaMins: number;
  activeCouriers: number;
  activeRestaurants: number;
  color: string;
  bgLight: string;
  borderColor: string;
}

const DEFAULT_ZONES: RegionalZoneData[] = [
  {
    id: 'clifton',
    name: 'Clifton & Defence',
    sharePct: 0,
    orderCount: 0,
    avgSlaMins: 0,
    activeCouriers: 0,
    activeRestaurants: 0,
    color: tokens.red500,
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'dha',
    name: 'DHA Phases 1–8',
    sharePct: 0,
    orderCount: 0,
    avgSlaMins: 0,
    activeCouriers: 0,
    activeRestaurants: 0,
    color: tokens.blue600,
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'gulshan',
    name: 'Gulshan-e-Iqbal',
    sharePct: 0,
    orderCount: 0,
    avgSlaMins: 0,
    activeCouriers: 0,
    activeRestaurants: 0,
    color: tokens.green600,
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    id: 'johar',
    name: 'Gulistan-e-Johar',
    sharePct: 0,
    orderCount: 0,
    avgSlaMins: 0,
    activeCouriers: 0,
    activeRestaurants: 0,
    color: tokens.amber600,
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
];

export function RegionalDistributionChart({
  zones = DEFAULT_ZONES,
  title = 'Karachi Regional Order Distribution (%)',
  subtitle = 'Geographic order share and fleet delivery performance across delivery zones',
}: {
  zones?: RegionalZoneData[];
  title?: string;
  subtitle?: string;
}) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const totalOrders = zones.reduce((acc, z) => acc + z.orderCount, 0);

  return (
    <div className="bg-white border border-ink-200 rounded-md p-6 shadow-1 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <ChartPieSlice size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900 tracking-tight">{title}</h2>
              <p className="text-xs text-ink-400">{subtitle}</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xs bg-ink-100 text-ink-700 border border-ink-200">
            {totalOrders} Orders Total
          </span>
        </div>

        {/* Multi-Segment Stacked Distribution Bar */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs font-mono text-ink-500">
            <span>Zone Share (%)</span>
            <span>{totalOrders > 0 ? '100.0% Allocation' : '0.0% Allocation (No orders today)'}</span>
          </div>

          <div className="h-4 w-full rounded-full bg-ink-100 overflow-hidden flex p-0.5 gap-0.5 border border-ink-200/80">
            {totalOrders === 0 ? (
              <div className="w-full h-full bg-ink-200/50 rounded-full flex items-center justify-center text-2xs text-ink-400 font-mono">
                No orders dispatched today
              </div>
            ) : (
              zones.map((z) => {
                if (z.sharePct <= 0) return null;
                const isSelected = selectedZone === z.id;
                return (
                  <motion.div
                    key={z.id}
                    style={{
                      width: `${z.sharePct}%`,
                      backgroundColor: z.color,
                    }}
                    whileHover={{ scaleY: 1.25 }}
                    onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                    className={`h-full rounded-full transition-all cursor-pointer relative group ${
                      selectedZone && !isSelected ? 'opacity-35' : 'opacity-100'
                    }`}
                    title={`${z.name}: ${z.sharePct}% (${z.orderCount} orders)`}
                  >
                    {z.sharePct > 20 && (
                      <div className="w-full h-full bg-white/20 rounded-full" />
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Quick Legend Tags */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                className={`flex items-center gap-1.5 text-xs transition-opacity cursor-pointer ${
                  selectedZone && selectedZone !== z.id ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                <span className="font-medium text-ink-700">{z.name}</span>
                <span className="font-mono font-bold text-ink-900">{z.sharePct}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Detail Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-ink-100">
        {zones.map((z) => {
          const isSelected = selectedZone === z.id;
          return (
            <div
              key={z.id}
              onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
              className={`p-3.5 rounded-md border transition-all cursor-pointer ${
                isSelected
                  ? 'border-ink-900 ring-2 ring-ink-900/10 shadow-1 bg-ink-50'
                  : 'border-ink-200/90 bg-white hover:border-ink-300 hover:bg-ink-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                  <span className="text-xs font-bold text-ink-800 truncate">{z.name}</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border" style={{
                  color: z.color,
                  borderColor: `${z.color}40`,
                  backgroundColor: `${z.color}10`,
                }}>
                  {z.sharePct}%
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-ink-600">
                <div className="flex items-center justify-between">
                  <span className="text-ink-400">Order Volume:</span>
                  <span className="font-mono font-bold text-ink-900">{z.orderCount} orders</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-400">Avg Delivery Time:</span>
                  <span className="font-mono font-semibold text-green-600">{z.avgSlaMins} mins</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-ink-100 text-2xs">
                  <span className="flex items-center gap-1 text-ink-500">
                    <Bicycle size={12} />
                    <span>{z.activeCouriers} riders</span>
                  </span>
                  <span className="flex items-center gap-1 text-ink-500">
                    <Storefront size={12} />
                    <span>{z.activeRestaurants} restaurants</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
