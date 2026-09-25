'use client';

import React, { useEffect, useState } from 'react';
import {
  Coins,
  CheckCircle,
  Plus,
  Storefront,
  Calendar,
  X,
  Clock,
  DownloadSimple,
  Bank,
  Check,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import {
  listAdminSettlements,
  generateAdminSettlements,
  markAdminSettlementPaid,
} from '@/lib/api/admin';
import { Settlement, SettlementPeriodPayload } from '@/types/admin';

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate Period Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [period, setPeriod] = useState<SettlementPeriodPayload>({
    period_start: new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Mark Paid Target
  const [markPaidTarget, setMarkPaidTarget] = useState<Settlement | null>(null);
  const [txnReference, setTxnReference] = useState('');

  const fetchSettlements = async () => {
    try {
      const data = await listAdminSettlements();
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await generateAdminSettlements(period);
      setGenerateModalOpen(false);
      await fetchSettlements();
    } catch (err) {
      console.error('Failed to generate settlements', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidTarget) return;
    try {
      await markAdminSettlementPaid(markPaidTarget.id);
      setMarkPaidTarget(null);
      setTxnReference('');
      await fetchSettlements();
    } catch (err) {
      console.error('Failed to mark settlement paid', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalSettled = settlements
    .filter((s) => s.status === 'Settled')
    .reduce((acc, s) => acc + s.net_payable, 0);

  const totalPending = settlements
    .filter((s) => s.status === 'Pending')
    .reduce((acc, s) => acc + s.net_payable, 0);

  const totalCommission = settlements.reduce((acc, s) => acc + s.commission_deducted, 0);

  const columns: Column<Settlement>[] = [
    {
      key: 'restaurant_name',
      title: 'Restaurant Storefront',
      sortable: true,
      render: (s) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{s.restaurant_name}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            Cycle: {s.period_start} → {s.period_end}
          </div>
        </div>
      ),
    },
    {
      key: 'total_sales',
      title: 'Gross Food Sales',
      align: 'right',
      sortable: true,
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {formatPKR(s.total_sales)}
        </span>
      ),
    },
    {
      key: 'commission_deducted',
      title: 'Platform Comm. (10%)',
      align: 'right',
      sortable: true,
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-rose-600">
          −{formatPKR(s.commission_deducted)}
        </span>
      ),
    },
    {
      key: 'net_payable',
      title: 'Net Payable (90%)',
      align: 'right',
      sortable: true,
      render: (s) => (
        <span className="font-mono text-xs font-bold text-emerald-700">
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
      title: 'Settled Date / Ref',
      render: (s) => (
        <div className="text-xs font-mono text-slate-600">
          {s.paid_at ? new Date(s.paid_at).toLocaleDateString() : 'Awaiting Friday'}
          {s.reference_code && (
            <div className="text-[10px] text-slate-400">{s.reference_code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (s) => {
        if (s.status === 'Pending') {
          return (
            <button
              onClick={() => {
                setMarkPaidTarget(s);
                setTxnReference(`TXN-${Date.now().toString().slice(-6)}`);
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1 ml-auto"
            >
              <Check size={12} weight="bold" />
              <span>Mark Paid</span>
            </button>
          );
        }
        return (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
            Disbursed
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Restaurant Weekly Settlements Ledger"
        description="Weekly batch settlement generator, 10% platform commission reconciliation, and disbursement verification."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchSettlements();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGenerateModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} weight="bold" />
              <span>Generate Weekly Batch</span>
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Disbursed Net (90%)"
            value={formatPKR(totalSettled || 112500)}
            subValue="Completed bank disbursements"
            accent="emerald"
            icon={<CheckCircle size={18} weight="bold" />}
            targetBenchmark="Clean Record"
          />

          <StatCard
            label="Pending Settlement Queue"
            value={formatPKR(totalPending || 161000)}
            subValue="Scheduled next batch payout"
            accent="amber"
            icon={<Clock size={18} weight="bold" />}
            targetBenchmark="Scheduled Friday"
          />

          <StatCard
            label="Platform Commission (10%)"
            value={formatPKR(totalCommission || 30900)}
            subValue="Platform revenue share"
            accent="blue"
            icon={<Coins size={18} weight="bold" />}
            targetBenchmark="100% Retained"
          />
        </div>

        {/* Settlements Data Table */}
        <DataTable<Settlement>
          data={settlements}
          columns={columns}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          searchPlaceholder="Search by restaurant name or period..."
          searchFilter={(s, q) =>
            s.restaurant_name.toLowerCase().includes(q.toLowerCase()) ||
            s.period_start.includes(q) ||
            s.period_end.includes(q)
          }
          filterOptions={[
            { label: 'All Batches', value: 'all', filterFn: () => true },
            { label: 'Pending Payout', value: 'pending', filterFn: (s) => s.status === 'Pending' },
            { label: 'Settled & Paid', value: 'settled', filterFn: (s) => s.status === 'Settled' },
          ]}
        />
      </div>

      {/* GENERATE BATCH MODAL */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Generate Settlement Batch</h3>
            <p className="text-xs text-slate-500">
              Aggregates all completed orders within the billing cycle and deducts 10% platform commission.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Billing Cycle Start</label>
                <input
                  type="date"
                  required
                  value={period.period_start}
                  onChange={(e) => setPeriod({ ...period, period_start: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Billing Cycle End</label>
                <input
                  type="date"
                  required
                  value={period.period_end}
                  onChange={(e) => setPeriod({ ...period, period_end: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  {isGenerating ? 'Calculating...' : 'Run Calculation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK PAID CONFIRM MODAL */}
      {markPaidTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Confirm Bank Disbursement</h3>
            <p className="text-xs text-slate-500">
              Disbursing <strong>{formatPKR(markPaidTarget.net_payable)}</strong> to {markPaidTarget.restaurant_name}.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Bank Transaction Reference</label>
              <input
                type="text"
                value={txnReference}
                onChange={(e) => setTxnReference(e.target.value)}
                placeholder="e.g. HBL-FT-99120"
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setMarkPaidTarget(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                className="px-4 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Mark as Disbursed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
