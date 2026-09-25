'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, NavigationArrow, Bicycle, Storefront, ChartPieSlice } from '@phosphor-icons/react';

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
    sharePct: 31.5,
    orderCount: 58,
    avgSlaMins: 18.2,
    activeCouriers: 7,
    activeRestaurants: 14,
    color: '#E23A2E',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  {
    id: 'dha',
    name: 'DHA Phases 1–8',
    sharePct: 25.0,
    orderCount: 46,
    avgSlaMins: 21.4,
    activeCouriers: 5,
    activeRestaurants: 11,
    color: '#2563EB',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'gulshan',
    name: 'Gulshan-e-Iqbal',
    sharePct: 23.9,
    orderCount: 44,
    avgSlaMins: 25.6,
    activeCouriers: 5,
    activeRestaurants: 12,
    color: '#059669',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'johar',
    name: 'Gulistan-e-Johar',
    sharePct: 19.6,
    orderCount: 36,
    avgSlaMins: 28.1,
    activeCouriers: 4,
    activeRestaurants: 8,
    color: '#D97706',
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ChartPieSlice size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {totalOrders} Orders Total
          </span>
        </div>

        {/* Multi-Segment Stacked Distribution Bar */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Zone Share (%)</span>
            <span>100.0% Allocation</span>
          </div>

          <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/80">
            {zones.map((z) => {
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
                  {/* Subtle shine effect on top zones */}
                  {z.sharePct > 20 && (
                    <div className="w-full h-full bg-white/20 rounded-full" />
                  )}
                </motion.div>
              );
            })}
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
                <span className="font-medium text-slate-700">{z.name}</span>
                <span className="font-mono font-bold text-slate-900">{z.sharePct}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Detail Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
        {zones.map((z) => {
          const isSelected = selectedZone === z.id;
          return (
            <div
              key={z.id}
              onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm bg-slate-50'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                  <span className="text-xs font-bold text-slate-800 truncate">{z.name}</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border" style={{
                  color: z.color,
                  borderColor: `${z.color}40`,
                  backgroundColor: `${z.color}10`,
                }}>
                  {z.sharePct}%
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Order Volume:</span>
                  <span className="font-mono font-bold text-slate-900">{z.orderCount} orders</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Delivery SLA:</span>
                  <span className="font-mono font-semibold text-emerald-600">{z.avgSlaMins} mins</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Bicycle size={12} />
                    <span>{z.activeCouriers} couriers</span>
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Storefront size={12} />
                    <span>{z.activeRestaurants} stores</span>
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
