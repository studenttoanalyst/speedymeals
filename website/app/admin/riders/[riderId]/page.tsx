'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bicycle, IdentificationCard, Wallet, Coins } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getAdminRider } from '@/lib/api/admin';
import { RiderAdmin } from '@/types/rider';

export default function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ riderId: string }>;
}) {
  const resolvedParams = use(params);
  const [rider, setRider] = useState<RiderAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRider = async () => {
      try {
        const data = await getAdminRider(resolvedParams.riderId);
        setRider(data);
      } catch (err) {
        console.error('Failed to load rider', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRider();
  }, [resolvedParams.riderId]);

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title={rider?.name || 'Rider Courier File'}
        description="Courier compliance records, vehicle registration, and cash float."
        actions={
          <Link
            href="/admin/riders"
            className="px-3 py-1.5 font-mono text-xs font-semibold border border-line bg-paper hover:bg-paper-off text-ink transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Fleet</span>
          </Link>
        }
      />

      <div className="p-6 max-w-2xl space-y-6">
        {isLoading ? (
          <div className="p-8 border border-line bg-paper animate-pulse space-y-4">
            <div className="h-6 bg-line/50 w-1/3" />
            <div className="h-4 bg-line/50 w-1/2" />
          </div>
        ) : rider ? (
          <div className="bg-paper border border-line p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <Bicycle size={24} className="text-red" />
                <div>
                  <h2 className="font-heading font-bold text-lg text-ink">
                    {rider.name}
                  </h2>
                  <p className="font-mono text-xs text-ink-soft">
                    CNIC: {rider.cnic_number} • Phone: {rider.phone_number}
                  </p>
                </div>
              </div>
              <StatusBadge status={rider.approval_status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-line bg-paper-off/50">
                <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">
                  Wallet Balance
                </div>
                <div className="font-mono text-lg font-bold text-ink mt-0.5">
                  {formatPKR(rider.wallet_balance)}
                </div>
              </div>
              <div className="p-4 border border-line bg-paper-off/50">
                <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">
                  Pending COD Cash
                </div>
                <div className="font-mono text-lg font-bold text-[#8C6D1F] mt-0.5">
                  {formatPKR(rider.pending_cash_owed)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-sans text-ink-soft border border-line bg-paper">
            Rider not found.
          </div>
        )}
      </div>
    </div>
  );
}
