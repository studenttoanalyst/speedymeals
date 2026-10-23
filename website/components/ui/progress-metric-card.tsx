'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import {
  ACCENTS,
  formatCompact,
  MetricChart,
  SERIES_COLORS,
  type ChartSeries,
  type ChartView,
  type MetricAccent,
  type MetricSeries,
  type SeriesPoint,
} from './metric-chart';
import { PeriodSelect, ViewToggle, type PeriodOption } from './metric-controls';
import { tokens } from '@/lib/design-tokens';

// Re-export so consumers only import this file.
export type { SeriesPoint, MetricSeries, MetricAccent, ChartView, PeriodOption };

export type CardSize = 'sm' | 'md' | 'lg';

export interface ProgressMetricCardProps {
  title: string;
  total?: string | number;
  delta?: string;
  deltaLabel?: string;
  percent?: string;
  trend?: 'up' | 'down';
  unit?: string;
  period?: string;
  periodOptions?: PeriodOption[];
  onPeriodChange?: (option: PeriodOption) => void;
  defaultView?: ChartView;
  accent?: MetricAccent;
  /** Single series. Provide this OR `series`. */
  data?: SeriesPoint[];
  /** Several named series. Takes precedence over `data`. */
  series?: MetricSeries[];
  defaultIndex?: number;
  size?: CardSize;
  /** Show secondary stats (peak / low / avg) in the footer. */
  showStats?: boolean;
  /** Value format. Default: compact in the headline, exact in the tooltip. */
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
  loading?: boolean;
  className?: string;
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { label: 'Past 7 days', points: 4 },
  { label: 'Past 14 days', points: 7 },
  { label: 'Past 30 days' },
];

// Share of the card width (from the right) used by the chart.
const REGION_W = 62; // %
// Change below this threshold reads as "flat" → neutral accent.
const NEUTRAL_PCT = 0.5;

const SIZES: Record<
  CardSize,
  { minH: string; pad: string; footer: string; title: string; headline: string }
> = {
  sm: { minH: 'min-h-[260px]', pad: 'px-5 pt-5', footer: 'px-5 py-3', title: 'text-sm', headline: 'text-5xl' },
  md: { minH: 'min-h-[380px]', pad: 'px-6 pt-6', footer: 'px-6 py-4', title: 'text-base', headline: 'text-6xl' },
  lg: { minH: 'min-h-[460px]', pad: 'px-8 pt-8', footer: 'px-8 py-5', title: 'text-lg', headline: 'text-7xl' },
};

const sliceWindow = (points: SeriesPoint[], n?: number) =>
  n && n < points.length ? points.slice(-n) : points;

export default function ProgressMetricCard({
  title,
  total,
  delta,
  deltaLabel = 'today',
  percent,
  trend,
  unit,
  period = 'Past 30 days',
  periodOptions,
  onPeriodChange,
  defaultView = 'curve',
  accent,
  data,
  series,
  defaultIndex,
  size = 'md',
  showStats = true,
  valueFormatter,
  dateFormatter,
  loading = false,
  className = '',
}: ProgressMetricCardProps) {
  const gridId = `grid-${useId().replace(/:/g, '')}`;
  const sz = SIZES[size];
  const shell = `relative flex ${sz.minH} w-full flex-col overflow-hidden rounded-md border border-line bg-paper shadow-1 ${className}`;

  const periods = periodOptions ?? DEFAULT_PERIODS;
  const [selectedLabel, setSelectedLabel] = useState(period);
  const [view, setView] = useState<ChartView>(defaultView);

  // Normalise input into a list of series (a plain `data` → one series).
  const baseSeries: MetricSeries[] = useMemo(
    () => (series?.length ? series : [{ name: title, data: data ?? [], accent }]),
    [series, data, title, accent],
  );

  const selectedOption =
    periods.find((p) => p.label === selectedLabel) ?? periods[periods.length - 1];

  // Slice every series to the selected period.
  const visibleSeries = useMemo(
    () => baseSeries.map((s) => ({ ...s, data: sliceWindow(s.data, selectedOption?.points) })),
    [baseSeries, selectedOption],
  );

  const primary = visibleSeries[0];
  const isMulti = visibleSeries.length > 1;
  const hasData = (primary?.data.length ?? 0) >= 2;

  // Every figure derives from the primary series so the card stays coherent
  // and reacts to period changes. Explicit props still win.
  const stats = useMemo(() => {
    const vals = primary?.data.map((d) => d.value) ?? [];
    const sum = vals.reduce((a, b) => a + b, 0);
    const first = vals[0] ?? 0;
    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? first;
    const net = last - first;
    return {
      sum,
      net,
      pct: first ? (net / first) * 100 : 0,
      step: last - prev,
      peak: vals.length ? Math.max(...vals) : 0,
      low: vals.length ? Math.min(...vals) : 0,
      avg: vals.length ? sum / vals.length : 0,
    };
  }, [primary]);

  // Direction (last vs first point), with a neutral band.
  const resolvedTrend: 'up' | 'down' | 'flat' =
    trend ?? (Math.abs(stats.pct) < NEUTRAL_PCT ? 'flat' : stats.net >= 0 ? 'up' : 'down');
  // Series are brand red by default. Trend figures stay neutral ink: a red
  // line beside a rising number must not read as a warning.
  const color = { stroke: ACCENTS[accent ?? 'red'].stroke, text: tokens.ink900 };
  const TrendIcon =
    resolvedTrend === 'flat' ? ArrowRight : resolvedTrend === 'down' ? ArrowDown : ArrowUp;

  const fmtCompact = valueFormatter ?? formatCompact;
  const fmtFull = valueFormatter ?? ((n: number) => n.toLocaleString() + (unit ? ` ${unit}` : ''));
  const fmtDate = dateFormatter ?? ((d: string) => d);
  const sign = (n: number) => (n >= 0 ? '+' : '−') + fmtCompact(Math.abs(n));

  const displayTotal = total ?? fmtCompact(stats.sum);
  const displayDelta = delta ?? sign(stats.step);
  const displayPercent = percent ?? `${Math.abs(stats.pct).toFixed(1)}%`;

  // Series color: explicit accent → palette (multi) → trend color (single).
  const chartSeries: ChartSeries[] = visibleSeries.map((s, i) => ({
    name: s.name,
    data: s.data,
    color: s.accent
      ? ACCENTS[s.accent].stroke
      : isMulti
        ? SERIES_COLORS[i % SERIES_COLORS.length]
        : color.stroke,
  }));

  const lastIndex = (primary?.data.length ?? 1) - 1;
  const fallback = Math.min(defaultIndex ?? lastIndex, lastIndex);

  const handlePeriodChange = (option: PeriodOption) => {
    setSelectedLabel(option.label);
    onPeriodChange?.(option);
  };

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded-xs bg-ink-100" />
            <div className="h-5 w-24 animate-pulse rounded-xs bg-ink-100" />
          </div>
          <div className="mt-6 h-14 w-48 animate-pulse rounded-sm bg-ink-100" />
          <div className="mb-4 mt-auto h-24 w-full animate-pulse rounded-sm bg-ink-50" />
        </div>
        <div className={`border-t border-line ${sz.footer}`}>
          <div className="h-4 w-40 animate-pulse rounded-xs bg-ink-100" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={shell}>
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <h3 className={`${sz.title} font-semibold tracking-tight text-ink-900`}>{title}</h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-ink-900">No data yet</p>
            <p className="text-xs text-ink-600">Metrics will appear once data is available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="relative flex flex-1 flex-col">
        {/* Chart region (right side, behind the content) */}
        <div className="absolute inset-y-0 right-0 z-0" style={{ width: `${REGION_W}%` }}>
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to left, ${color.stroke}14, transparent 75%)` }}
          />
          <div
            className="absolute inset-0 text-ink-300"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)',
              maskImage: 'linear-gradient(to right, transparent, black 55%)',
            }}
          >
            <svg className="h-full w-full" aria-hidden>
              <defs>
                <pattern id={gridId} width="14" height="14" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${gridId})`} />
            </svg>
          </div>

          <MetricChart
            series={chartSeries}
            view={view}
            defaultIndex={fallback}
            valueFormatter={fmtFull}
            dateFormatter={fmtDate}
          />
        </div>

        {/* Main content */}
        <div className={`pointer-events-none relative z-10 flex flex-1 flex-col pb-6 ${sz.pad}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className={`${sz.title} font-semibold tracking-tight text-ink-900`}>{title}</h3>
              <ViewToggle value={view} onChange={setView} />
            </div>
            <div className="flex items-center gap-3.5 text-sm">
              <span className="flex items-center gap-1 font-semibold tabular-nums" style={{ color: color.text }}>
                <TrendIcon size={16} strokeWidth={2.5} aria-hidden />
                <span className="sr-only">{resolvedTrend === 'flat' ? 'Flat' : resolvedTrend === 'up' ? 'Up' : 'Down'}</span>
                {displayPercent}
              </span>
              <PeriodSelect
                value={selectedLabel}
                options={periods}
                onChange={handlePeriodChange}
                accentText={color.text}
              />
            </div>
          </div>

          {/* Legend (multi-series only) */}
          {isMulti && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {chartSeries.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5 text-xs text-ink-600">
                  <span className="h-2 w-2 rounded-xs" style={{ background: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
          )}

          <div className={`mt-auto ${sz.headline} font-semibold leading-none tracking-tight tabular-nums text-ink-900`}>
            {displayTotal}
          </div>
        </div>
      </div>

      {/* Footer: delta on the left, secondary stats on the right */}
      <div
        className={`relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-paper ${sz.footer} text-sm`}
      >
        <div>
          <span className="font-semibold tabular-nums" style={{ color: color.text }}>
            {displayDelta}
          </span>{' '}
          <span className="text-ink-600">{deltaLabel}</span>
        </div>
        {showStats && (
          <div className="flex items-center gap-2.5 text-xs text-ink-600">
            <span>
              <span className="font-semibold tabular-nums text-ink-900">{fmtCompact(stats.peak)}</span> peak
            </span>
            <span aria-hidden className="text-ink-300">·</span>
            <span>
              <span className="font-semibold tabular-nums text-ink-900">{fmtCompact(stats.low)}</span> low
            </span>
            <span aria-hidden className="text-ink-300">·</span>
            <span>
              <span className="font-semibold tabular-nums text-ink-900">{fmtCompact(Math.round(stats.avg))}</span> avg
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
