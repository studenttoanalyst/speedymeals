'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { tokens } from '@/lib/design-tokens';

export interface SeriesPoint {
  value: number;
  /** Display label for the x position (e.g. "14:00", "18 Mar"). */
  date: string;
}

export type MetricAccent = 'green' | 'red' | 'blue' | 'neutral';

export interface MetricSeries {
  name: string;
  data: SeriesPoint[];
  accent?: MetricAccent;
}

export type ChartView = 'curve' | 'bars';

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

/** `stroke` draws marks; `text` is the AA-safe color for labels on white. */
export const ACCENTS: Record<MetricAccent, { stroke: string; text: string }> = {
  green: { stroke: tokens.green500, text: tokens.green600 },
  red: { stroke: tokens.red500, text: tokens.red600 },
  blue: { stroke: tokens.blue600, text: tokens.blue600 },
  neutral: { stroke: tokens.ink400, text: tokens.ink600 },
};

export const SERIES_COLORS = [tokens.red500, tokens.blue600, tokens.tan700, tokens.ink600];

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const formatCompact = (n: number) => compact.format(n);

// Plot insets (px). Top clears the card header row plus the tooltip lane
// below it; right keeps the last point off the edge.
const PAD = { top: 112, right: 20, bottom: 16, left: 8 };
const TOOLTIP_TOP = 66;

type Pt = { x: number; y: number };

/**
 * Monotone cubic (Fritsch–Carlson) path: smooth, but never overshoots the
 * data, so troughs don't dip below real values or the baseline.
 */
function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t.push(0);
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t.push((w1 + w2) / (w1 / m[i - 1] + w2 / m[i]));
    }
  }
  t.push(m[n - 2]);
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

interface MetricChartProps {
  series: ChartSeries[];
  view: ChartView;
  /** Point highlighted when the pointer is not over the chart. */
  defaultIndex: number;
  valueFormatter: (value: number) => string;
  dateFormatter: (date: string) => string;
}

export function MetricChart({ series, view, defaultIndex, valueFormatter, dateFormatter }: MetricChartProps) {
  const uid = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = series[0]?.data.length ?? 0;
  const active = Math.min(hover ?? defaultIndex, count - 1);

  const geo = useMemo(() => {
    const { w, h } = size;
    const plotW = Math.max(0, w - PAD.left - PAD.right);
    const plotH = Math.max(0, h - PAD.top - PAD.bottom);
    const max = Math.max(1, ...series.flatMap((s) => s.data.map((d) => d.value))) * 1.1;
    const step = count > 1 ? plotW / (count - 1) : 0;
    const x = (i: number) => PAD.left + i * step;
    const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
    return { x, y, step, baseY: PAD.top + plotH, plotH };
  }, [size, series, count]);

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || count < 2) return 0;
      const i = Math.round((clientX - rect.left - PAD.left) / geo.step);
      return Math.max(0, Math.min(count - 1, i));
    },
    [count, geo.step],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setHover(Math.max(0, active - 1));
    else if (e.key === 'ArrowRight') setHover(Math.min(count - 1, active + 1));
    else return;
    e.preventDefault();
  };

  const ready = size.w > 0 && count > 0;
  const primary = series[0];
  const barGroupW = Math.max(2, Math.min(28, geo.step * 0.6));
  const barW = barGroupW / series.length;

  // Keep the tooltip inside the chart region.
  const tipX = ready ? geo.x(active) : 0;
  const tipAlign = tipX > size.w * 0.6 ? 'right' : 'left';

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
      tabIndex={0}
      role="img"
      aria-label={
        primary
          ? `${primary.name}: ${primary.data.map((d) => `${dateFormatter(d.date)} ${valueFormatter(d.value)}`).join(', ')}`
          : undefined
      }
      onPointerMove={(e) => setHover(indexFromClientX(e.clientX))}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setHover(null)}
      onKeyDown={onKeyDown}
    >
      {ready && (
        <svg width={size.w} height={size.h} className="block" aria-hidden>
          <defs>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={primary.color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <line x1={PAD.left} x2={size.w - PAD.right} y1={geo.baseY} y2={geo.baseY} stroke={tokens.ink200} />

          {view === 'bars'
            ? series.map((s, si) =>
                s.data.map((d, i) => {
                  const top = geo.y(d.value);
                  return (
                    <rect
                      key={`${s.name}-${d.date}`}
                      x={geo.x(i) - barGroupW / 2 + si * barW}
                      y={top}
                      width={Math.max(1, barW - 1)}
                      height={Math.max(0, geo.baseY - top)}
                      rx={1}
                      fill={s.color}
                      opacity={i === active ? 1 : 0.45}
                    />
                  );
                }),
              )
            : series.map((s, si) => {
                const pts = s.data.map((d, i) => ({ x: geo.x(i), y: geo.y(d.value) }));
                const path = monotonePath(pts);
                return (
                  <g key={s.name}>
                    {si === 0 && pts.length > 1 && (
                      <path
                        d={`${path} L${pts[pts.length - 1].x},${geo.baseY} L${pts[0].x},${geo.baseY} Z`}
                        fill={`url(#fill-${uid})`}
                      />
                    )}
                    <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                );
              })}

          {/* Active position: guide + markers */}
          <line
            x1={geo.x(active)}
            x2={geo.x(active)}
            y1={PAD.top - 8}
            y2={geo.baseY}
            stroke={tokens.ink300}
            strokeDasharray="3 3"
          />
          {view === 'curve' &&
            series.map((s) => (
              <circle
                key={s.name}
                cx={geo.x(active)}
                cy={geo.y(s.data[active]?.value ?? 0)}
                r={4}
                fill={tokens.paper}
                stroke={s.color}
                strokeWidth={2}
              />
            ))}
        </svg>
      )}

      {ready && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 rounded-sm border border-line bg-paper px-2.5 py-1.5 shadow-2"
          style={{
            top: TOOLTIP_TOP,
            ...(tipAlign === 'left' ? { left: tipX + 8 } : { right: size.w - tipX + 8 }),
          }}
        >
          <div className="font-mono text-2xs text-ink-600">{dateFormatter(primary.data[active].date)}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-ink-900">
              {series.length > 1 && <span className="h-2 w-2 rounded-xs" style={{ background: s.color }} />}
              {valueFormatter(s.data[active]?.value ?? 0)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
