'use client';

import React, { useEffect, useState } from 'react';
import { Coins, CheckCircle, Clock } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { listRestaurantSettlements } from '@/lib/api/restaurant';
import { RestaurantSettlement } from '@/types/restaurant';

export default function RestaurantSettlementsPage() {
  const [settlements, setSettlements] = useState<RestaurantSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSettlements = async () => {
    try {
      const data = await listRestaurantSettlements();
      setSettlements(data);
    } catch (err) {
      console.error('Failed to load settlements', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Weekly Settlement History"
        description="Transparent ledger of completed sales cycles, commission deductions, and net bank transfers."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchSettlements();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6">
        <DataTable<RestaurantSettlement>
          data={settlements}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          columns={[
            {
              key: 'period',
              title: 'Settlement Period',
              render: (s) => (
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">
                    {s.period_start} → {s.period_end}
                  </div>
                  <div className="font-mono text-[10px] text-ink-soft">Batch #{s.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'total_sales',
              title: 'Gross Customer Orders',
              align: 'right',
              render: (s) => (
                <span className="font-mono text-xs font-semibold text-ink">
                  {formatPKR(s.total_sales)}
                </span>
              ),
            },
            {
              key: 'commission_deducted',
              title: 'Platform Commission',
              align: 'right',
              render: (s) => (
                <span className="font-mono text-xs font-semibold text-red">
                  -{formatPKR(s.commission_deducted)}
                </span>
              ),
            },
            {
              key: 'net_payable',
              title: 'Net Transfer (90%)',
              align: 'right',
              render: (s) => (
                <span className="font-mono text-xs font-bold text-[#1E7E34]">
                  {formatPKR(s.net_payable)}
                </span>
              ),
            },
            {
              key: 'status',
              title: 'Settlement Status',
              render: (s) => <StatusBadge status={s.status} size="sm" />,
            },
            {
              key: 'paid_at',
              title: 'Transfer Timestamp',
              render: (s) => (
                <span className="font-mono text-xs text-ink-soft">
                  {s.paid_at ? new Date(s.paid_at).toLocaleDateString() : 'Pending Processing'}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
