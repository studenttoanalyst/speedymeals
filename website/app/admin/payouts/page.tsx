'use client';

import React, { useEffect, useState } from 'react';
import {
  CurrencyDollar,
  Bicycle,
  Plus,
  X,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import {
  listAdminRiderPayouts,
  generateAdminRiderPayouts,
  markAdminRiderPayoutPaid,
} from '@/lib/api/admin';
import { RiderPayout } from '@/types/rider';
import { SettlementPeriodPayload } from '@/types/admin';

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<RiderPayout[]>([]);
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
  const [markPaidTarget, setMarkPaidTarget] = useState<RiderPayout | null>(null);

  const fetchPayouts = async () => {
    try {
      const data = await listAdminRiderPayouts();
      setPayouts(data);
    } catch (err) {
      console.error('Failed to load rider payouts', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await generateAdminRiderPayouts(period);
      setGenerateModalOpen(false);
      await fetchPayouts();
    } catch (err) {
      console.error('Failed to generate rider payouts', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidTarget) return;
    try {
      await markAdminRiderPayoutPaid(markPaidTarget.id);
      setMarkPaidTarget(null);
      await fetchPayouts();
    } catch (err) {
      console.error('Failed to mark payout paid', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Rider Payouts & Earnings Transfer"
        description="Weekly 100% delivery fee compensation ledger for active couriers."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchPayouts();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <Plus size={14} weight="bold" />
            <span>Generate Rider Payouts</span>
          </button>
        }
      />

      <div className="p-6">
        <DataTable<RiderPayout>
          data={payouts}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          searchPlaceholder="Search by rider name..."
          searchFilter={(p, query) => p.rider_name.toLowerCase().includes(query.toLowerCase())}
          filterOptions={[
            { label: 'Pending Transfer', value: 'Pending', filterFn: (p) => p.status === 'Pending' },
            { label: 'Paid', value: 'Paid', filterFn: (p) => p.status === 'Paid' },
          ]}
          columns={[
            {
              key: 'rider_name',
              title: 'Rider Name',
              render: (p) => (
                <div>
                  <div className="font-heading font-bold text-xs text-ink flex items-center gap-1.5">
                    <Bicycle size={14} className="text-ink-soft" />
                    <span>{p.rider_name}</span>
                  </div>
                  <div className="font-mono text-[10px] text-ink-soft">ID: #{p.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'period',
              title: 'Earnings Period',
              render: (p) => (
                <div className="font-mono text-xs text-ink">
                  {p.period_start} → {p.period_end}
                </div>
              ),
            },
            {
              key: 'total_earning',
              title: 'Total Delivery Earnings (100%)',
              align: 'right',
              sortable: true,
              render: (p) => (
                <span className="font-mono text-xs font-bold text-[#1E7E34]">
                  {formatPKR(p.total_earning)}
                </span>
              ),
            },
            {
              key: 'status',
              title: 'Payout Status',
              render: (p) => <StatusBadge status={p.status} size="sm" />,
            },
            {
              key: 'actions',
              title: 'Action',
              align: 'right',
              render: (p) => (
                <div>
                  {p.status === 'Pending' ? (
                    <button
                      onClick={() => setMarkPaidTarget(p)}
                      className="px-2.5 py-1 text-[11px] font-mono font-semibold border border-[#BCE4C7] bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#D6EED9] transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      Mark Paid
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-ink-soft">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'Paid'}
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Generate Payouts Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-paper border border-line shadow-2xl p-6" style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <CurrencyDollar size={18} className="text-red" />
                <h3 className="font-heading font-bold text-base text-ink">
                  Generate Rider Payout Batch
                </h3>
              </div>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="p-1 border border-line hover:bg-paper-off text-ink-soft"
                style={{ borderRadius: '0px' }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="font-sans text-xs text-ink-soft mb-4">
              Calculates 100% of delivery fees earned by couriers on Delivered orders in this period.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={period.period_start}
                    onChange={(e) => setPeriod({ ...period, period_start: e.target.value })}
                    className="w-full p-2 text-xs font-mono bg-paper border border-line text-ink focus:outline-none focus:border-ink"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={period.period_end}
                    onChange={(e) => setPeriod({ ...period, period_end: e.target.value })}
                    className="w-full p-2 text-xs font-mono bg-paper border border-line text-ink focus:outline-none focus:border-ink"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-3 py-1.5 font-mono text-xs border border-line bg-paper text-ink hover:bg-paper-off"
                  style={{ borderRadius: '0px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] disabled:opacity-50"
                  style={{ borderRadius: '0px' }}
                >
                  {isGenerating ? 'Calculating...' : 'Run Payout Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Mark Paid Dialog */}
      <ConfirmDialog
        isOpen={markPaidTarget !== null}
        title="Record Rider Earning Transfer"
        message={`Confirm that the weekly transfer of ${formatPKR(
          markPaidTarget?.total_earning
        )} has been dispatched to ${markPaidTarget?.rider_name}?`}
        confirmLabel="Confirm Transfer Dispatched"
        variant="primary"
        onConfirm={handleMarkPaid}
        onCancel={() => setMarkPaidTarget(null)}
      />
    </div>
  );
}
