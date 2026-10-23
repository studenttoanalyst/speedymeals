'use client';

import { ChartColumn, ChartSpline, ChevronDown } from 'lucide-react';
import type { ChartView } from './metric-chart';

export interface PeriodOption {
  label: string;
  /** Number of trailing points to show; omit for all. */
  points?: number;
}

const VIEWS: { value: ChartView; label: string; Icon: typeof ChartSpline }[] = [
  { value: 'curve', label: 'Line view', Icon: ChartSpline },
  { value: 'bars', label: 'Bar view', Icon: ChartColumn },
];

export function ViewToggle({ value, onChange }: { value: ChartView; onChange: (v: ChartView) => void }) {
  return (
    <div role="group" aria-label="Chart view" className="pointer-events-auto flex rounded-sm border border-line p-0.5">
      {VIEWS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-label={label}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex h-6 w-7 items-center justify-center rounded-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
            value === v ? 'bg-ink-900 text-paper' : 'text-ink-600 hover:bg-ink-100'
          }`}
        >
          <Icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

export function PeriodSelect({
  value,
  options,
  onChange,
  accentText,
}: {
  value: string;
  options: PeriodOption[];
  onChange: (option: PeriodOption) => void;
  accentText?: string;
}) {
  return (
    <label className="pointer-events-auto relative flex items-center">
      <span className="sr-only">Period</span>
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.label === e.target.value);
          if (next) onChange(next);
        }}
        className="h-8 cursor-pointer appearance-none rounded-sm border border-line bg-paper py-0 pl-2.5 pr-7 text-sm font-medium text-ink-900 hover:border-ink-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
      >
        {options.map((o) => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2"
        style={{ color: accentText }}
        aria-hidden
      />
    </label>
  );
}
