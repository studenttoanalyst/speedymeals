/**
 * Hourly order throughput for the admin and restaurant dashboards.
 *
 * Buckets orders into the last `hours` *completed* clock hours (local time),
 * one point per hour with no gaps, so the chart's x-axis is linear in time.
 * The in-progress hour is returned separately: comparing a partial hour with
 * full ones would make every live trend look like a drop.
 */
import type { SeriesPoint } from '@/components/ui/progress-metric-card';

const HOUR_MS = 60 * 60 * 1000;

const hourLabel = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:00`;

export interface HourlyThroughput {
  series: SeriesPoint[];
  /** Orders placed so far in the current, incomplete hour. */
  currentHourCount: number;
  /** "HH:00" label of the current hour. */
  currentHourLabel: string;
}

export function hourlyThroughput(
  orders: readonly { placed_at: string }[],
  hours = 24,
  now: Date = new Date(),
): HourlyThroughput {
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);
  const windowStart = currentHourStart.getTime() - hours * HOUR_MS;

  const counts = new Array<number>(hours).fill(0);
  let currentHourCount = 0;

  for (const o of orders) {
    const t = new Date(o.placed_at).getTime();
    if (Number.isNaN(t) || t < windowStart || t > now.getTime()) continue;
    if (t >= currentHourStart.getTime()) {
      currentHourCount++;
    } else {
      counts[Math.floor((t - windowStart) / HOUR_MS)]++;
    }
  }

  return {
    series: counts.map((value, i) => ({
      value,
      date: hourLabel(new Date(windowStart + i * HOUR_MS)),
    })),
    currentHourCount,
    currentHourLabel: hourLabel(currentHourStart),
  };
}

export const HOURLY_PERIODS = [
  { label: 'Last 6 hours', points: 6 },
  { label: 'Last 12 hours', points: 12 },
  { label: 'Last 24 hours' },
];
