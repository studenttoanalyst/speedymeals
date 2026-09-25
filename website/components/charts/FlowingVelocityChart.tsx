'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendUp, Flame, Clock } from '@phosphor-icons/react';

export interface VelocityDataPoint {
  time: string;
  orders: number;
  gmv: number;
  peak?: boolean;
}

interface FlowingVelocityChartProps {
  data?: VelocityDataPoint[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_DATA: VelocityDataPoint[] = [
  { time: '08:00', orders: 6, gmv: 8400 },
  { time: '10:00', orders: 14, gmv: 19600 },
  { time: '12:00', orders: 38, gmv: 53200, peak: true },
  { time: '14:00', orders: 45, gmv: 63000, peak: true },
  { time: '16:00', orders: 18, gmv: 25200 },
  { time: '18:00', orders: 25, gmv: 35000 },
  { time: '20:00', orders: 54, gmv: 75600, peak: true },
  { time: '22:00', orders: 42, gmv: 58800, peak: true },
  { time: '00:00', orders: 12, gmv: 16800 },
];

export function FlowingVelocityChart({
  data = DEFAULT_DATA,
  title = '24-Hour Platform Order Velocity & Volume',
  subtitle = 'Real-time throughput curve with continuous flow telemetry',
}: FlowingVelocityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(true);

  const width = 800;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxOrders = useMemo(() => Math.max(...data.map((d) => d.orders)) * 1.15, [data]);

  // Compute (x, y) coordinates for each point
  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - (d.orders / maxOrders) * (height - paddingY * 2);
      return { x, y, ...d };
    });
  }, [data, maxOrders]);

  // Smooth Catmull-Rom / Cubic Bezier curve path calculation
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };

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

    const area = `${d} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

    return { linePath: d, areaPath: area };
  }, [points]);

  // Yesterday comparison baseline (slightly lower volume)
  const comparisonPath = useMemo(() => {
    if (points.length === 0) return '';
    const compPoints = points.map((p) => ({
      x: p.x,
      y: p.y + 16 + (Math.sin(p.x) * 6),
    }));

    let d = `M ${compPoints[0].x},${compPoints[0].y}`;
    for (let i = 0; i < compPoints.length - 1; i++) {
      const p0 = compPoints[i === 0 ? 0 : i - 1];
      const p1 = compPoints[i];
      const p2 = compPoints[i + 1];
      const p3 = compPoints[i + 2 >= compPoints.length ? compPoints.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }, [points]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 3];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
      {/* Top Header & Telemetry Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              LIVE STREAM
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
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
            {showComparison ? '✓ vs Yesterday' : '+ Compare'}
          </button>
          <div className="text-right pl-2 border-l border-slate-200 hidden xs:block">
            <div className="text-xs font-mono font-bold text-slate-900">
              {data.reduce((acc, curr) => acc + curr.orders, 0)} Orders
            </div>
            <div className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendUp size={12} weight="bold" />
              <span>+18.2% velocity</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Flowing Interactive Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 sm:h-56 overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Soft glowing area gradient */}
            <linearGradient id="velocityAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E23A2E" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#E23A2E" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#E23A2E" stopOpacity="0.0" />
            </linearGradient>

            {/* Continuous Flowing Electrical Stroke Gradient */}
            <linearGradient id="flowingStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E23A2E">
                <animate attributeName="stop-color" values="#E23A2E;#F43F5E;#FB7185;#E23A2E" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#FB7185">
                <animate attributeName="stop-color" values="#FB7185;#E23A2E;#F43F5E;#FB7185" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#E23A2E">
                <animate attributeName="stop-color" values="#E23A2E;#F43F5E;#FB7185;#E23A2E" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            {/* Horizontal Grid Pattern */}
            <pattern id="gridLines" width={width} height="40" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2={width} y2="40" stroke="#F1F5F9" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect x="0" y="0" width={width} height={height - paddingY} fill="url(#gridLines)" />

          {/* Yesterday Comparison Curve (Dashed) */}
          {showComparison && (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              transition={{ duration: 0.6 }}
              d={comparisonPath}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Animated Area Fill */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            d={areaPath}
            fill="url(#velocityAreaGradient)"
          />

          {/* Primary Flowing Wave Path */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            d={linePath}
            fill="none"
            stroke="url(#flowingStrokeGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Secondary animated glowing pulse line gliding along the stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeDasharray="40 180"
            className="opacity-75"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="220"
              to="-220"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>

          {/* Interactive Data Points & Hover Targets */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            const isPeak = p.peak;

            return (
              <g
                key={p.time}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Transparent wider touch/hover target */}
                <rect
                  x={p.x - 20}
                  y={0}
                  width={40}
                  height={height}
                  fill="transparent"
                />

                {/* Vertical scrub line when hovered */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={height - paddingY}
                    stroke="#E23A2E"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="opacity-70"
                  />
                )}

                {/* Point circles */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : isPeak ? 4.5 : 3}
                  fill={isHovered ? '#E23A2E' : isPeak ? '#E23A2E' : '#FFFFFF'}
                  stroke={isHovered ? '#FFFFFF' : '#E23A2E'}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />

                {/* Live pulsating beacon on active peak point */}
                {isPeak && !isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="9"
                    fill="#E23A2E"
                    opacity="0.25"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}

          {/* Bottom X-Axis Time Baseline */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
        </svg>

        {/* Dynamic Tooltip Float on Scrub */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-2 pointer-events-none z-10 bg-slate-900/90 text-white backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-700/60 text-xs font-sans"
              style={{
                left: `${(activePoint.x / width) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-mono mb-0.5">
                <Clock size={11} weight="bold" />
                <span>{activePoint.time} Window</span>
                {activePoint.peak && (
                  <span className="flex items-center gap-0.5 text-rose-400 font-bold ml-auto">
                    <Flame size={11} weight="fill" />
                    PEAK
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-sm text-white">{activePoint.orders} Orders</span>
                <span className="font-mono text-[11px] text-emerald-400">PKR {activePoint.gmv.toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* X-Axis Hour Labels Row */}
        <div className="flex justify-between px-6 pt-1 text-[11px] font-mono text-slate-400">
          {data.map((d) => (
            <span key={d.time} className="hover:text-slate-800 transition-colors">
              {d.time}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Observability Metrics Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-2xs" />
            <span className="font-medium text-slate-700">Today Velocity Curve</span>
          </span>
          {showComparison && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-slate-400" />
              <span>Yesterday Baseline</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-500">
            Peak Throughput: <strong className="text-slate-900">54 orders/hr</strong> (8:00 PM)
          </span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            SLA 98.4% On-Time
          </span>
        </div>
      </div>
    </div>
  );
}
