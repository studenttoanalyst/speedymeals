'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendUp, Flame, Clock, Timer, CheckCircle } from '@phosphor-icons/react';

export interface VelocityDataPoint {
  time: string;
  orders: number;
  gmv: number;
  peak?: boolean;
  prepTimeMinutes?: number;
  slaPercent?: number;
}

interface FlowingVelocityChartProps {
  data?: VelocityDataPoint[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_DATA: VelocityDataPoint[] = [
  { time: '08:00', orders: 6, gmv: 8400, prepTimeMinutes: 12, slaPercent: 100 },
  { time: '10:00', orders: 14, gmv: 19600, prepTimeMinutes: 14, slaPercent: 99.1 },
  { time: '12:00', orders: 38, gmv: 53200, peak: true, prepTimeMinutes: 16, slaPercent: 98.5 },
  { time: '14:00', orders: 45, gmv: 63000, peak: true, prepTimeMinutes: 18, slaPercent: 97.9 },
  { time: '16:00', orders: 18, gmv: 25200, prepTimeMinutes: 13, slaPercent: 99.4 },
  { time: '18:00', orders: 25, gmv: 35000, prepTimeMinutes: 15, slaPercent: 98.8 },
  { time: '20:00', orders: 54, gmv: 75600, peak: true, prepTimeMinutes: 19, slaPercent: 98.4 },
  { time: '22:00', orders: 42, gmv: 58800, peak: true, prepTimeMinutes: 17, slaPercent: 98.1 },
  { time: '00:00', orders: 12, gmv: 16800, prepTimeMinutes: 11, slaPercent: 100 },
];

export function FlowingVelocityChart({
  data = DEFAULT_DATA,
  title = 'Hourly Kitchen Order Throughput & Rush Windows',
  subtitle = 'Dual-peak velocity tracking: Lunch (12:00 - 15:00) vs Dinner (19:00 - 23:00)',
}: FlowingVelocityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(true);

  const width = 800;
  const height = 230;
  const paddingX = 42;
  const paddingY = 32;

  const maxOrders = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.orders), 1);
    return Math.ceil(highest * 1.25);
  }, [data]);

  const totalOrders = useMemo(() => data.reduce((acc, curr) => acc + curr.orders, 0), [data]);
  const peakPoint = useMemo(() => {
    return [...data].sort((a, b) => b.orders - a.orders)[0] || data[0];
  }, [data]);

  // Compute (x, y) coordinates for each point
  const points = useMemo(() => {
    const count = data.length;
    const availableWidth = width - paddingX * 2;
    const availableHeight = height - paddingY * 2;

    return data.map((d, i) => {
      const x = paddingX + (i / Math.max(count - 1, 1)) * availableWidth;
      const y = height - paddingY - (d.orders / maxOrders) * availableHeight;
      const barHeight = (d.orders / maxOrders) * availableHeight;
      const hourNum = parseInt(d.time.split(':')[0], 10) || 0;
      const isLunchRush = hourNum >= 12 && hourNum <= 15;
      const isDinnerRush = hourNum >= 19 && hourNum <= 23;

      return {
        ...d,
        x,
        y,
        barHeight,
        barY: height - paddingY - barHeight,
        isLunchRush,
        isDinnerRush,
        prepMins: d.prepTimeMinutes || (d.peak ? 18 : 13),
        sla: d.slaPercent || (d.peak ? 98.4 : 99.5),
      };
    });
  }, [data, maxOrders]);

  // Spline line and area
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      return { linePath: `M ${points[0].x},${points[0].y}`, areaPath: '' };
    }

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = height - paddingY;
    const area = `${d} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

    return { linePath: d, areaPath: area };
  }, [points]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points.find((p) => p.time === peakPoint.time) || points[points.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
      {/* Top Header & Telemetry Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition-colors ${
              showComparison
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showComparison ? '✓ Capacity Bands' : '+ Show Bands'}
          </button>
          <div className="text-right pl-3 border-l border-slate-200 hidden xs:block">
            <div className="text-xs font-mono font-bold text-slate-900">
              {totalOrders} Orders
            </div>
            <div className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendUp size={12} weight="bold" />
              <span>+18.2% peak surge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rush Window Legend Indicators */}
      <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px] font-mono">
        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
          <span className="w-2 h-2 rounded-xs bg-amber-400" />
          Lunch Peak: 12:00 - 15:00
        </span>
        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1 font-semibold">
          <span className="w-2 h-2 rounded-xs bg-rose-500" />
          Dinner Peak: 19:00 - 23:00
        </span>
        <span className="text-slate-400 ml-auto hidden md:inline">
          Hover hours to inspect order count & speed
        </span>
      </div>

      {/* SVG Multi-Layer Operational Chart */}
      <div className="relative w-full overflow-hidden select-none bg-slate-50/50 rounded-xl border border-slate-100 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 sm:h-60 overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Shaded Area Gradient */}
            <linearGradient id="opVelocityAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E23A2E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#E23A2E" stopOpacity="0.01" />
            </linearGradient>

            {/* Glowing Spline Stroke */}
            <linearGradient id="opStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E23A2E" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E23A2E" />
            </linearGradient>

            {/* Background Grid Pattern */}
            <pattern id="opGridLines" width={width} height="40" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2={width} y2="40" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect x="0" y="0" width={width} height={height - paddingY} fill="url(#opGridLines)" />

          {/* Rush Hour Window Shaded Bands (When Enabled) */}
          {showComparison && points.map((p, i) => {
            if (!p.isLunchRush && !p.isDinnerRush) return null;
            const barW = Math.max(32, (width - paddingX * 2) / points.length);
            const fillCol = p.isLunchRush ? 'rgba(251, 191, 36, 0.09)' : 'rgba(244, 63, 94, 0.09)';
            const strokeCol = p.isLunchRush ? 'rgba(245, 158, 11, 0.25)' : 'rgba(225, 29, 72, 0.25)';

            return (
              <rect
                key={`band-${p.time}`}
                x={p.x - barW / 2}
                y={paddingY}
                width={barW}
                height={height - paddingY * 2}
                fill={fillCol}
                stroke={strokeCol}
                strokeWidth="1"
                rx="6"
              />
            );
          })}

          {/* Hourly Volume Columns (Bars) */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            const barW = Math.max(16, (width - paddingX * 2) / (points.length * 2.4));
            const fill = isHovered
              ? '#BE123C'
              : p.peak
              ? '#E23A2E'
              : '#94A3B8';

            return (
              <g key={`bar-${p.time}`} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)}>
                {/* Column Bar */}
                <rect
                  x={p.x - barW / 2}
                  y={p.barY}
                  width={barW}
                  height={Math.max(4, p.barHeight)}
                  rx="4"
                  fill={fill}
                  opacity={isHovered ? 0.95 : p.peak ? 0.75 : 0.4}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}

          {/* Spline Area Fill */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            d={areaPath}
            fill="url(#opVelocityAreaGradient)"
          />

          {/* Spline Stroke Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
            d={linePath}
            fill="none"
            stroke="url(#opStrokeGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points Nodes */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            const isPeak = p.peak;

            return (
              <g key={`point-${p.time}`} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)}>
                {/* Wide invisible scrub target */}
                <rect
                  x={p.x - 22}
                  y={0}
                  width={44}
                  height={height}
                  fill="transparent"
                />

                {/* Vertical scrub guide */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={height - paddingY}
                    stroke="#E23A2E"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Node Circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : isPeak ? 4.5 : 3.5}
                  fill={isHovered ? '#FFFFFF' : isPeak ? '#E23A2E' : '#FFFFFF'}
                  stroke={isHovered ? '#E23A2E' : isPeak ? '#FFFFFF' : '#64748B'}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150 shadow-sm"
                />

                {/* Pulsing halo on peak point */}
                {isPeak && !isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="#E23A2E"
                    opacity="0.25"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}

          {/* Baseline X-axis */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
        </svg>

        {/* Hour Labels */}
        <div className="flex justify-between px-6 pt-1 text-[11px] font-mono text-slate-500 font-semibold">
          {data.map((d) => (
            <span
              key={d.time}
              className={`transition-colors ${
                activePoint?.time === d.time ? 'text-rose-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              {d.time}
            </span>
          ))}
        </div>
      </div>

      {/* Floating Operational Detail Bar (Guaranteed Unclipped & High Information) */}
      {activePoint && (
        <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md border border-slate-800 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center shrink-0">
              <Clock size={16} weight="bold" />
            </div>
            <div>
              <div className="font-mono font-bold text-slate-100 flex items-center gap-2">
                <span>{activePoint.time} Operational Block</span>
                {activePoint.peak && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-rose-500 text-white font-sans uppercase font-bold flex items-center gap-0.5">
                    <Flame size={10} weight="fill" />
                    Rush Peak
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {activePoint.isLunchRush ? 'Lunch Rush Window' : activePoint.isDinnerRush ? 'Dinner Rush Window' : 'Standard Kitchen Shift'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Volume</span>
              <strong className="text-white text-sm">{activePoint.orders} Tickets</strong>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">GMV</span>
              <strong className="text-emerald-400 text-sm">PKR {activePoint.gmv.toLocaleString()}</strong>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Avg Kitchen Cooking</span>
              <span className="text-amber-300 font-bold flex items-center justify-end gap-1">
                <Timer size={12} weight="bold" />
                {activePoint.prepMins}m Prep
              </span>
            </div>

            <div className="text-right pl-3 border-l border-slate-700">
              <span className="text-[10px] text-slate-400 block uppercase">Delivery Speed</span>
              <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                <CheckCircle size={12} weight="bold" />
                {activePoint.sla}% On-Time
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Summary Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-2xs" />
            <span className="font-medium text-slate-700">Orders Flow Trend</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
            <span>Hourly Orders Bar</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-600">
            Peak Hour: <strong className="text-slate-900">{peakPoint.orders} orders/hr</strong> ({peakPoint.time})
          </span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
            All-Day On-Time: 98.4%
          </span>
        </div>
      </div>
    </div>
  );
}
