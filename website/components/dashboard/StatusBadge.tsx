'use client';

import React from 'react';

export interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/_/g, ' ').trim();

  let colors = 'bg-paper-off text-ink-soft border-line';
  let dotColor = 'bg-ink-soft';

  switch (normalized) {
    case 'delivered':
    case 'settled':
    case 'paid':
    case 'approved':
    case 'active':
      colors = 'bg-[#EBF7EE] text-[#1E7E34] border-[#BCE4C7]';
      dotColor = 'bg-[#1E7E34]';
      break;

    case 'ready for pickup':
    case 'accepted by rider':
    case 'on the way':
    case 'picked up':
    case 'rider assigned':
    case 'accepted':
      colors = 'bg-[#EAF3FA] text-[#1E5FA8] border-[#BAD6F0]';
      dotColor = 'bg-[#1E5FA8]';
      break;

    case 'preparing':
    case 'pending':
    case 'pending approval':
      colors = 'bg-[#FDF6E2] text-[#8C6D1F] border-[#F1DC9B]';
      dotColor = 'bg-[#8C6D1F]';
      break;

    case 'cancelled':
    case 'rejected':
    case 'inactive':
    case 'suspended':
      colors = 'bg-[#FDF0EE] text-[#C92A2A] border-[#F5C2BC]';
      dotColor = 'bg-[#C92A2A]';
      break;

    case 'placed':
    default:
      colors = 'bg-paper-off text-ink-soft border-line';
      dotColor = 'bg-ink-soft';
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px]'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-medium border ${colors} ${sizeClasses} ${className}`}
      style={{ borderRadius: '0px' }}
    >
      <span className={`w-1.5 h-1.5 ${dotColor}`} style={{ borderRadius: '0px' }} />
      {status}
    </span>
  );
}
