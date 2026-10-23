'use client';

import React from 'react';

export interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/_/g, ' ').trim();

  let colors = 'bg-ink-50 text-ink-700 ring-ink-200';
  let dotColor = 'bg-ink-400';

  switch (normalized) {
    case 'delivered':
    case 'settled':
    case 'paid':
    case 'approved':
    case 'active':
    case 'online':
      colors = 'bg-green-50 text-green-700 ring-green-600/20';
      dotColor = 'bg-green-500';
      break;

    case 'ready for pickup':
    case 'accepted by rider':
    case 'on the way':
    case 'picked up':
    case 'rider assigned':
    case 'accepted':
    case 'delivering':
      colors = 'bg-blue-50 text-blue-700 ring-blue-600/20';
      dotColor = 'bg-blue-500';
      break;

    case 'preparing':
    case 'pending':
    case 'pending approval':
      colors = 'bg-amber-50 text-amber-800 ring-amber-600/20';
      dotColor = 'bg-amber-500';
      break;

    case 'cancelled':
    case 'rejected':
    case 'inactive':
    case 'suspended':
    case 'offline':
      colors = 'bg-red-50 text-red-700 ring-red-600/20';
      dotColor = 'bg-red-500';
      break;

    case 'placed':
    default:
      colors = 'bg-blue-50 text-blue-700 ring-blue-600/20';
      dotColor = 'bg-blue-500';
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-2xs'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ring-1 ring-inset ${colors} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
    </span>
  );
}
