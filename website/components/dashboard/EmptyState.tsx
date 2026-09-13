'use client';

import React from 'react';
import { Package } from '@phosphor-icons/react';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-line bg-paper-off/40"
      style={{ borderRadius: '0px' }}
    >
      <div className="p-3 border border-line bg-paper text-ink-soft mb-3" style={{ borderRadius: '0px' }}>
        {icon || <Package size={28} />}
      </div>
      <h3 className="font-heading font-semibold text-sm text-ink mb-1">
        {title}
      </h3>
      <p className="font-sans text-xs text-ink-soft max-w-sm mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-mono font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors"
          style={{ borderRadius: '0px' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
