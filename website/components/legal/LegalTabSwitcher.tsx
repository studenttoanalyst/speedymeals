'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LockKey } from '@phosphor-icons/react';

export const LegalTabSwitcher: React.FC = () => {
  const pathname = usePathname();
  const isTerms = pathname === '/terms' || pathname?.startsWith('/terms');
  const isPrivacy = pathname === '/privacy' || pathname?.startsWith('/privacy');

  return (
    <div className="flex items-center bg-[#ECEEF1] p-1 border border-[#D5D8DC] rounded-xs select-none">
      <Link
        href="/terms"
        scroll={true}
        className={`px-2.5 sm:px-3 py-1 text-xs font-mono transition-colors flex items-center space-x-1.5 rounded-xs ${
          isTerms
            ? 'bg-white text-ink font-bold shadow-xs border border-line/60'
            : 'text-[#5B5F66] hover:text-ink hover:bg-white/50'
        }`}
      >
        <FileText size={13} weight="bold" className={isTerms ? 'text-red' : 'text-[#8C9099]'} />
        <span>Terms</span>
      </Link>
      <Link
        href="/privacy"
        scroll={true}
        className={`px-2.5 sm:px-3 py-1 text-xs font-mono transition-colors flex items-center space-x-1.5 rounded-xs ${
          isPrivacy
            ? 'bg-white text-ink font-bold shadow-xs border border-line/60'
            : 'text-[#5B5F66] hover:text-ink hover:bg-white/50'
        }`}
      >
        <LockKey size={13} weight="bold" className={isPrivacy ? 'text-red' : 'text-[#8C9099]'} />
        <span>Privacy</span>
      </Link>
    </div>
  );
};
