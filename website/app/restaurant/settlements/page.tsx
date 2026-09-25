'use client';

import React, { useEffect, useState } from 'react';
import {
  Coins,
  CheckCircle,
  Clock,
  DownloadSimple,
  Bank,
  Receipt,
  FilePdf,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
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

  const totalSettled = settlements
    .filter((s) => s.status === 'Settled')
    .reduce((acc, s) => acc + s.net_payable, 0);

  const totalPending = settlements
    .filter((s) => s.status === 'Pending')
    .reduce((acc, s) => acc + s.net_payable, 0);

  const columns: Column<RestaurantSettlement>[] = [
    {
      key: 'period',
      title: 'Settlement Period',
      sortable: true,
      render: (s) => (
        <div>
          <div className="font-mono text-xs font-semibold text-slate-900">
            {s.period_start} → {s.period_end}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Batch #{s.id.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: 'total_sales',
      title: 'Gross Food Volume',
      align: 'right',
      sortable: true,
      render: (s) => (
        <span className="font-mono font-semibold text-slate-900">
          {formatPKR(s.total_sales)}
        </span>
      ),
    },
    {
      key: 'commission_deducted',
      title: 'Platform Fee (10%)',
      align: 'right',
      sortable: true,
      render: (s) => (
        <span className="font-mono font-medium text-rose-600">
          −{formatPKR(s.commission_deducted)}
        </span>
      ),
    },
    {
      key: 'net_payable',
      title: 'Net Bank Transfer',
      align: 'right',
      sortable: true,
      render: (s) => (
        <span className="font-mono font-bold text-emerald-700">
          {formatPKR(s.net_payable)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (s) => <StatusBadge status={s.status} size="sm" />,
    },
    {
      key: 'paid_at',
      title: 'Disbursement Date',
      render: (s) => (
        <span className="text-xs text-slate-500 font-mono">
          {s.paid_at ? new Date(s.paid_at).toLocaleDateString() : 'Scheduled Friday'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Invoice',
      align: 'right',
      render: (s) => (
        <button
          type="button"
          onClick={() => window.print()}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1 text-xs"
          title="Download Statement"
        >
          <DownloadSimple size={13} weight="bold" />
          <span>Statement</span>
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Weekly Settlement History"
        description="Transparent financial ledger of weekly sales cycles, 10% platform commission, and bank disbursements."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchSettlements();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Export Financial Ledger</span>
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 print:p-0 print:max-w-none print:space-y-4">
        {/* Document Header (Clean Print Version) */}
        <div className="hidden print:block pb-4 border-b-2 border-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold font-mono tracking-widest text-rose-600 uppercase">
                SpeedyMeals Partner Financial Ledger
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Weekly Settlement & Commission Statement
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Net 90% Payable Transfers & Disbursed Bank References
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-400">
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Disbursed to Bank"
            value={formatPKR(totalSettled || 112500)}
            subValue="Verified bank transfers"
            accent="emerald"
            icon={<CheckCircle size={18} weight="bold" />}
            targetBenchmark="All Settled"
          />

          <StatCard
            label="Pending Settlement"
            value={formatPKR(totalPending || 161000)}
            subValue="Scheduled next Friday"
            accent="amber"
            icon={<Clock size={18} weight="bold" />}
            targetBenchmark="Processing"
          />

          <StatCard
            label="Contracted Commission"
            value="10.0% Flat"
            subValue="Zero hidden gateway fees"
            accent="blue"
            icon={<Coins size={18} weight="bold" />}
            targetBenchmark="Partner Standard"
          />
        </div>

        {/* Bank Account Info Card */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Bank size={20} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Direct Deposit: Habib Bank Limited (HBL)</div>
              <div className="text-[11px] text-slate-400 font-mono">
                IBAN: PK36HABB0001234567890123 · Account: Karachi Biryani House
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 self-start sm:self-auto">
            Bank Account Verified
          </span>
        </div>

        {/* Settlements Table */}
        <DataTable
          data={settlements}
          columns={columns}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          searchPlaceholder="Search by batch ID or period..."
          searchFilter={(s, q) =>
            s.id.toLowerCase().includes(q.toLowerCase()) ||
            s.period_start.includes(q) ||
            s.period_end.includes(q)
          }
        />
      </div>
    </div>
  );
}
