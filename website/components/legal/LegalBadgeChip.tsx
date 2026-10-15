import React from 'react';

interface LegalBadgeChipProps {
  label: string;
  title?: string;
  ariaLabel?: string;
  isActive?: boolean;
  type?: 'part' | 'table' | 'matrix' | 'law';
}

export const LegalBadgeChip: React.FC<LegalBadgeChipProps> = ({
  label,
  title,
  ariaLabel,
  isActive = false,
  type = 'part',
}) => {
  let activeStyle = 'bg-white/20 text-white border-white/30';
  let inactiveStyle = 'bg-black/[0.04] text-[#8C9099] border-black/[0.06] group-hover:text-ink group-hover:bg-black/[0.08]';

  if (type === 'law') {
    if (isActive) {
      activeStyle = 'bg-white text-emerald-800 border-white/80 font-bold';
    } else {
      inactiveStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 font-bold';
    }
  }

  return (
    <span
      title={title || ariaLabel || label}
      aria-label={ariaLabel || title || label}
      className={`w-14 text-center shrink-0 ml-1.5 px-1 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider rounded-xs border transition-colors ${
        isActive ? activeStyle : inactiveStyle
      }`}
    >
      {label}
    </span>
  );
};
