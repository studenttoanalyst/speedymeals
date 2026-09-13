'use client';

import React, { useEffect, useState } from 'react';
import {
  Coins,
  CheckCircle,
  Plus,
  Storefront,
  Calendar,
  X,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
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
      await fetchSettlements();
    } catch (err) {
      console.error('Failed to mark settlement paid', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Restaurant Settlements Ledger"
        description="Calculate periodic restaurant payouts, reconcile commissions, and mark manual transfers."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchSettlements();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <Plus size={14} weight="bold" />
            <span>Generate Period Settlements</span>
          </button>
        }
      />

      <div className="p-6">
        <DataTable<Settlement>
          data={settlements}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          searchPlaceholder="Search by restaurant name..."
          searchFilter={(s, query) => s.restaurant_name.toLowerCase().includes(query.toLowerCase())}
          filterOptions={[
            { label: 'Pending Payment', value: 'Pending', filterFn: (s) => s.status === 'Pending' },
            { label: 'Settled / Paid', value: 'Settled', filterFn: (s) => s.status === 'Settled' },
          ]}
          columns={[
            {
              key: 'restaurant_name',
              title: 'Restaurant',
              render: (s) => (
                <div>
                  <div className="font-heading font-bold text-xs text-ink flex items-center gap-1.5">
                    <Storefront size={14} className="text-ink-soft" />
                    <span>{s.restaurant_name}</span>
                  </div>
                  <div className="font-mono text-[10px] text-ink-soft">ID: #{s.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'period',
              title: 'Billing Period',
              render: (s) => (
                <div className="font-mono text-xs text-ink">
                  {s.period_start} → {s.period_end}
                </div>
              ),
            },
            {
              key: 'total_sales',
              title: 'Gross Sales',
              align: 'right',
              sortable: true,
              render: (s) => (
                <span className="font-mono text-xs font-semibold text-ink">
                  {formatPKR(s.total_sales)}
                </span>
              ),
            },
            {
              key: 'commission_deducted',
              title: 'Commission (10%)',
              align: 'right',
              sortable: true,
              render: (s) => (
                <span className="font-mono text-xs text-red font-semibold">
                  -{formatPKR(s.commission_deducted)}
                </span>
              ),
            },
            {
              key: 'net_payable',
              title: 'Net Payable',
              align: 'right',
              sortable: true,
              render: (s) => (
                <span className="font-mono text-xs font-bold text-[#1E7E34]">
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
              key: 'actions',
              title: 'Action',
              align: 'right',
              render: (s) => (
                <div>
                  {s.status === 'Pending' ? (
                    <button
                      onClick={() => setMarkPaidTarget(s)}
                      className="px-2.5 py-1 text-[11px] font-mono font-semibold border border-[#BCE4C7] bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#D6EED9] transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      Mark Paid
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-ink-soft">
                      {s.paid_at ? new Date(s.paid_at).toLocaleDateString() : 'Paid'}
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Generate Settlements Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-paper border border-line shadow-2xl p-6" style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-red" />
                <h3 className="font-heading font-bold text-base text-ink">
                  Calculate Period Settlements
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
              Computes and upserts settlement ledger rows for every restaurant with completed orders during this window. Idempotent per restaurant and period.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Period Start
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
                    Period End
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
                  {isGenerating ? 'Calculating...' : 'Run Settlement Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Mark Paid Dialog */}
      <ConfirmDialog
        isOpen={markPaidTarget !== null}
        title="Record Bank Settlement Transfer"
        message={`Confirm that the net transfer of ${formatPKR(
          markPaidTarget?.net_payable
        )} has been successfully executed to ${markPaidTarget?.restaurant_name}?`}
        confirmLabel="Confirm Payment Sent"
        variant="primary"
        onConfirm={handleMarkPaid}
        onCancel={() => setMarkPaidTarget(null)}
      />
    </div>
  );
}
