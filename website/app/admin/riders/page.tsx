'use client';

import React, { useEffect, useState } from 'react';
import {
  Bicycle,
  CheckCircle,
  XCircle,
  Eye,
  X,
  IdentificationCard,
  Wallet,
  Coins,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import {
  listAdminRiders,
  updateAdminRiderApproval,
  updateAdminRiderStatus,
} from '@/lib/api/admin';
import { RiderAdmin } from '@/types/rider';

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<RiderAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Review Drawer State
  const [activeRider, setActiveRider] = useState<RiderAdmin | null>(null);

  // Status Action Dialog State
  const [actionTarget, setActionTarget] = useState<{
    rider: RiderAdmin;
    action: 'approve' | 'reject' | 'toggle_active';
  } | null>(null);

  const fetchRiders = async () => {
    try {
      const data = await listAdminRiders();
      setRiders(data);
    } catch (err) {
      console.error('Failed to load riders', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleExecuteAction = async () => {
    if (!actionTarget) return;
    const { rider, action } = actionTarget;

    try {
      if (action === 'approve') {
        await updateAdminRiderApproval(rider.id, { approval_status: 'approved' });
      } else if (action === 'reject') {
        await updateAdminRiderApproval(rider.id, { approval_status: 'rejected' });
      } else if (action === 'toggle_active') {
        await updateAdminRiderStatus(rider.id, { is_active: !rider.is_active });
      }
      setActionTarget(null);
      if (activeRider?.id === rider.id) setActiveRider(null);
      await fetchRiders();
    } catch (err) {
      console.error('Failed to execute rider action', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Fleet & Rider Management"
        description="Verify onboarding credentials, inspect standing wallet balances, and manage dispatch eligibility."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchRiders();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6">
        <DataTable<RiderAdmin>
          data={riders}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          searchPlaceholder="Search by name, CNIC, or phone..."
          searchFilter={(r, query) =>
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.cnic_number.includes(query) ||
            r.phone_number.includes(query)
          }
          filterOptions={[
            { label: 'Pending Verification', value: 'pending', filterFn: (r) => r.approval_status === 'pending' },
            { label: 'Approved', value: 'approved', filterFn: (r) => r.approval_status === 'approved' },
            { label: 'Rejected', value: 'rejected', filterFn: (r) => r.approval_status === 'rejected' },
          ]}
          columns={[
            {
              key: 'name',
              title: 'Rider Info',
              sortable: true,
              render: (r) => (
                <div>
                  <div className="font-heading font-bold text-sm text-ink flex items-center gap-2">
                    <span
                      className={`w-2 h-2 shrink-0 ${r.is_online ? 'bg-[#1E7E34]' : 'bg-ink-soft/40'}`}
                      style={{ borderRadius: '0px' }}
                      title={r.is_online ? 'Online' : 'Offline'}
                    />
                    <span>{r.name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-ink-soft">{r.phone_number}</div>
                </div>
              ),
            },
            {
              key: 'cnic_number',
              title: 'CNIC / Vehicle',
              render: (r) => (
                <div>
                  <div className="font-mono text-xs text-ink">{r.cnic_number}</div>
                  <div className="font-sans text-[11px] text-ink-soft">
                    {r.vehicle_type || 'Motorcycle'} • {r.vehicle_registration || 'N/A'}
                  </div>
                </div>
              ),
            },
            {
              key: 'approval_status',
              title: 'Approval',
              render: (r) => <StatusBadge status={r.approval_status} size="sm" />,
            },
            {
              key: 'wallet_balance',
              title: 'Wallet Balance',
              align: 'right',
              sortable: true,
              render: (r) => (
                <div className="font-mono text-xs font-semibold text-ink">
                  {formatPKR(r.wallet_balance)}
                  {r.wallet_balance < 500 && (
                    <span className="block text-[10px] text-[#C92A2A] font-sans">
                      Below Rs 500 threshold
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'pending_cash_owed',
              title: 'Pending COD Cash',
              align: 'right',
              sortable: true,
              render: (r) => (
                <span className="font-mono text-xs font-semibold text-[#8C6D1F]">
                  {formatPKR(r.pending_cash_owed)}
                </span>
              ),
            },
            {
              key: 'is_active',
              title: 'Status',
              render: (r) => (
                <span
                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 border ${
                    r.is_active
                      ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#BCE4C7]'
                      : 'bg-[#FDF0EE] text-[#C92A2A] border-[#F5C2BC]'
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  {r.is_active ? 'Active' : 'Suspended'}
                </span>
              ),
            },
            {
              key: 'actions',
              title: 'Controls',
              align: 'right',
              render: (r) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setActiveRider(r)}
                    className="p-1.5 border border-line bg-paper-off hover:bg-paper text-ink transition-colors"
                    style={{ borderRadius: '0px' }}
                    title="Review Documents"
                  >
                    <Eye size={14} />
                  </button>

                  {r.approval_status === 'pending' && (
                    <>
                      <button
                        onClick={() => setActionTarget({ rider: r, action: 'approve' })}
                        className="px-2 py-1 text-[11px] font-mono font-semibold border border-[#BCE4C7] bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#D6EED9]"
                        style={{ borderRadius: '0px' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setActionTarget({ rider: r, action: 'reject' })}
                        className="px-2 py-1 text-[11px] font-mono font-semibold border border-[#F5C2BC] bg-[#FDF0EE] text-[#C92A2A] hover:bg-[#FADBD8]"
                        style={{ borderRadius: '0px' }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {r.approval_status !== 'pending' && (
                    <button
                      onClick={() => setActionTarget({ rider: r, action: 'toggle_active' })}
                      className="px-2 py-1 text-[11px] font-mono font-semibold border border-line hover:bg-paper-off text-ink-soft"
                      style={{ borderRadius: '0px' }}
                    >
                      {r.is_active ? 'Suspend' : 'Reinstate'}
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Review Rider Drawer */}
      {activeRider && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/60 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md bg-paper border-l border-line h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-150"
            style={{ borderRadius: '0px' }}
          >
            <div>
              <div className="h-16 border-b border-line px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IdentificationCard size={20} className="text-red" />
                  <h3 className="font-heading font-bold text-sm text-ink">
                    Rider Credential File
                  </h3>
                </div>
                <button
                  onClick={() => setActiveRider(null)}
                  className="p-1 border border-line hover:bg-paper-off text-ink-soft"
                  style={{ borderRadius: '0px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
                {/* Rider Header */}
                <div className="p-4 border border-line bg-paper-off/50 space-y-1">
                  <div className="text-base font-heading font-bold text-ink">{activeRider.name}</div>
                  <div className="text-xs font-mono text-ink-soft">{activeRider.phone_number}</div>
                  <div className="text-xs font-mono text-ink font-medium">CNIC: {activeRider.cnic_number}</div>
                </div>

                {/* Financial Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-line bg-paper">
                    <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">
                      Standing Wallet
                    </div>
                    <div className="font-mono text-lg font-bold text-ink mt-0.5">
                      {formatPKR(activeRider.wallet_balance)}
                    </div>
                  </div>
                  <div className="p-3 border border-line bg-paper">
                    <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">
                      Pending COD Debt
                    </div>
                    <div className="font-mono text-lg font-bold text-[#8C6D1F] mt-0.5">
                      {formatPKR(activeRider.pending_cash_owed)}
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-4 border border-line bg-paper space-y-2">
                  <div className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1">
                    Vehicle Specifications
                  </div>
                  <div className="text-xs font-sans text-ink space-y-1">
                    <div>Type: <span className="font-semibold">{activeRider.vehicle_type || 'Motorcycle'}</span></div>
                    <div>Registration Plate: <span className="font-mono font-semibold">{activeRider.vehicle_registration || 'Unspecified'}</span></div>
                  </div>
                </div>

                {/* Document Verification Previews */}
                <div className="space-y-3">
                  <div className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider">
                    Submitted Document Files
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {['National ID (CNIC Front/Back)', 'Driving License', 'Vehicle Registration Book'].map((docName) => (
                      <div key={docName} className="p-3 border border-line bg-paper-off/40 flex items-center justify-between text-xs font-sans">
                        <span className="font-medium text-ink">{docName}</span>
                        <span className="font-mono text-[11px] text-[#1E5FA8] underline cursor-pointer">
                          Inspect Image
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-line bg-paper flex items-center gap-2">
              {activeRider.approval_status === 'pending' ? (
                <>
                  <button
                    onClick={() => setActionTarget({ rider: activeRider, action: 'reject' })}
                    className="flex-1 py-2 font-mono text-xs font-semibold border border-[#F5C2BC] bg-[#FDF0EE] text-[#C92A2A] hover:bg-[#FADBD8]"
                    style={{ borderRadius: '0px' }}
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => setActionTarget({ rider: activeRider, action: 'approve' })}
                    className="flex-1 py-2 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E]"
                    style={{ borderRadius: '0px' }}
                  >
                    Approve Rider
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActionTarget({ rider: activeRider, action: 'toggle_active' })}
                  className={`w-full py-2 font-mono text-xs font-semibold border ${
                    activeRider.is_active
                      ? 'border-[#F5C2BC] text-[#C92A2A] hover:bg-[#FDF0EE]'
                      : 'border-[#BCE4C7] text-[#1E7E34] hover:bg-[#EBF7EE]'
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  {activeRider.is_active ? 'Suspend Account' : 'Reinstate Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={actionTarget !== null}
        title={
          actionTarget?.action === 'approve'
            ? 'Approve Rider Onboarding'
            : actionTarget?.action === 'reject'
            ? 'Reject Rider Application'
            : actionTarget?.rider.is_active
            ? 'Suspend Rider Account'
            : 'Reinstate Rider Account'
        }
        message={
          actionTarget?.action === 'approve'
            ? `Approving ${actionTarget?.rider.name} will grant them access to accept food delivery assignments immediately.`
            : actionTarget?.action === 'reject'
            ? `Rejecting ${actionTarget?.rider.name} will decline their submitted onboarding documents.`
            : `Are you sure you want to alter the active dispatch status of ${actionTarget?.rider.name}?`
        }
        confirmLabel="Confirm Action"
        variant={actionTarget?.action === 'approve' ? 'primary' : 'danger'}
        onConfirm={handleExecuteAction}
        onCancel={() => setActionTarget(null)}
      />
    </div>
  );
}
