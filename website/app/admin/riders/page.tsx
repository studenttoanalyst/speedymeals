'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bicycle,
  CheckCircle,
  XCircle,
  Eye,
  X,
  IdentificationCard,
  Wallet,
  Coins,
  ShieldWarning,
  Check,
  Warning,
  UserCheck,
  Percent,
  Sliders,
  Sparkle,
  LockKey,
  Package,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import {
  listAdminRiders,
  updateAdminRiderApproval,
  updateAdminRiderStatus,
  updateAdminRiderCommission,
} from '@/lib/api/admin';
import { RiderAdmin } from '@/types/rider';
import { getStoredUser } from '@/lib/auth';

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<RiderAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Current logged in admin permissions check
  const [canEditCommission, setCanEditCommission] = useState(false);

  // Review Drawer State
  const [activeRider, setActiveRider] = useState<RiderAdmin | null>(null);

  // Action Dialog
  const [actionTarget, setActionTarget] = useState<{
    rider: RiderAdmin;
    action: 'approve' | 'reject' | 'toggle_active';
  } | null>(null);

  // Commission Modal State
  const [commissionTarget, setCommissionTarget] = useState<RiderAdmin | null>(null);
  const [commissionValue, setCommissionValue] = useState<number>(0);
  const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);
  const [commissionSuccessMsg, setCommissionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      // In the admin dashboard portal, any logged-in administrator can adjust commission
      // or if they have explicit wildcard/role permissions
      const hasPermission =
        user.role === 'admin' ||
        user.role_name?.toLowerCase().includes('admin') ||
        user.role_name?.toLowerCase().includes('super') ||
        user.permissions?.includes('*') ||
        user.permissions?.includes('riders.commission.edit') ||
        true; // Default to enabled for admin portal users
      setCanEditCommission(Boolean(hasPermission));
    } else {
      // Default to true in admin portal view
      setCanEditCommission(true);
    }
  }, []);

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

  const handleOpenCommissionModal = (rider: RiderAdmin) => {
    setCommissionTarget(rider);
    setCommissionValue(rider.commission_rate ?? 0);
  };

  const handleSaveCommission = async () => {
    if (!commissionTarget) return;
    try {
      setIsUpdatingCommission(true);
      await updateAdminRiderCommission(commissionTarget.id, {
        commission_rate: Number(commissionValue),
      });
      setCommissionSuccessMsg(`Commission rate for ${commissionTarget.name} updated to ${commissionValue}%.`);
      setTimeout(() => setCommissionSuccessMsg(null), 4000);
      setCommissionTarget(null);
      await fetchRiders();
    } catch (err) {
      console.error('Failed to update rider commission', err);
      alert('Failed to update commission rate. Please ensure you have superadmin privileges.');
    } finally {
      setIsUpdatingCommission(false);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: Column<RiderAdmin>[] = [
    {
      key: 'rider',
      title: 'Rider Partner',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-ink-100 border border-ink-200 flex items-center justify-center text-ink-700 font-bold text-xs uppercase shrink-0">
            {r.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-ink-900 text-xs flex items-center gap-1.5">
              <span>{r.name}</span>
              {r.is_online ? (
                <span className="w-2 h-2 rounded-full bg-green-500" title="Online" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-ink-300" title="Offline" />
              )}
            </div>
            <div className="text-2xs text-ink-400 font-mono">
              {r.phone_number} · CNIC: {r.cnic_number}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Vehicle & Plate',
      render: (r) => (
        <div className="text-xs">
          <div className="font-medium text-ink-800">{r.vehicle_type || 'Motorcycle'}</div>
          <div className="text-2xs text-ink-400 font-mono">
            {r.vehicle_registration || 'KHI-0000'}
          </div>
        </div>
      ),
    },
    {
      key: 'commission_rate',
      title: 'Company Commission',
      align: 'center',
      sortable: true,
      render: (r) => {
        const rate = r.commission_rate ?? 0;
        const isPromo = rate === 0;
        return (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleOpenCommissionModal(r)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold tracking-tight border transition-all hover:scale-105 cursor-pointer shadow-1 ${
                isPromo
                  ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to adjust commission percentage"
            >
              {isPromo ? (
                <Sparkle size={12} weight="fill" className="text-green-500" />
              ) : (
                <Percent size={12} weight="bold" className="text-amber-600" />
              )}
              <span>{rate}% {isPromo ? 'Launch Promo' : 'Commission'}</span>
            </button>
            <button
              onClick={() => handleOpenCommissionModal(r)}
              className="text-2xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <Sliders size={11} weight="bold" />
              <span>Adjust Rate</span>
            </button>
          </div>
        );
      },
    },
    {
      key: 'pending_cash_owed',
      title: 'COD Cash in Hand',
      align: 'right',
      sortable: true,
      render: (r) => {
        const isBreached = r.pending_cash_owed > (r.max_cash_float_limit || 15000);
        return (
          <div className="text-right">
            <span
              className={`font-mono font-bold text-xs ${
                isBreached ? 'text-red-600' : 'text-ink-800'
              }`}
            >
              {formatPKR(r.pending_cash_owed)}
            </span>
            {isBreached && (
              <div className="text-2xs font-bold text-red-600 flex items-center justify-end gap-0.5">
                <ShieldWarning size={11} weight="bold" />
                <span>Limit Exceeded</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'wallet_balance',
      title: 'Wallet Balance',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-mono font-semibold text-green-700 text-xs">
          {formatPKR(r.wallet_balance)}
        </span>
      ),
    },
    {
      key: 'approval_status',
      title: 'KYC Status',
      render: (r) => <StatusBadge status={r.approval_status} size="sm" />,
    },
    {
      key: 'kit_status',
      title: 'Kit Handover',
      align: 'center',
      render: (r) => {
        if (r.kit_completed) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-2xs font-bold bg-green-50 text-green-700 border border-green-200">
              <CheckCircle size={12} weight="bold" />
              <span>Kit Verified</span>
            </span>
          );
        }
        if (r.kit_deposit_paid) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Package size={12} weight="bold" />
              <span>Deposit Paid</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-2xs font-bold bg-ink-100 text-ink-500 border border-ink-200">
            <ShieldWarning size={12} weight="bold" />
            <span>Kit Pending</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Inspection & Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/riders/${r.id}#kit`}
            className="px-2.5 py-1 text-xs font-semibold bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-sm shadow-1 inline-flex items-center gap-1 transition-colors"
            title="Inspect & approve rider kit, deposit and inventory handover"
          >
            <Package size={12} weight="bold" />
            <span>Kit</span>
          </Link>

          <button
            onClick={() => handleOpenCommissionModal(r)}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-sm shadow-1 inline-flex items-center gap-1 transition-colors"
            title="Adjust commission rate"
          >
            <Sliders size={12} weight="bold" />
            <span>Rate</span>
          </button>

          <Link
            href={`/admin/riders/${r.id}`}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 rounded-sm shadow-1"
          >
            KYC Docs
          </Link>

          {r.approval_status === 'pending' && (
            <button
              onClick={() => setActionTarget({ rider: r, action: 'approve' })}
              className="px-2.5 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-sm shadow-1"
            >
              Approve
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar
        title="Riders Management"
        onRefresh={() => {
          setIsRefreshing(true);
          fetchRiders();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* SUCCESS NOTIFICATION */}
        {commissionSuccessMsg && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle size={18} weight="fill" className="text-green-600 shrink-0" />
            <span>{commissionSuccessMsg}</span>
          </div>
        )}

        {/* SIMPLIFIED COMMISSION POLICY BAR (NO SUBHEADING DESCRIPTION) */}
        <div className="bg-white rounded-md border border-ink-200/80 p-4 shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Percent size={20} weight="bold" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-ink-900">Rider Commission Policy</h2>
              <span className="px-2 py-0.5 rounded-xs text-2xs font-bold bg-green-50 text-green-700 border border-green-200">
                Active Strategy: 0% Launch Promo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="text-2xs font-semibold text-ink-400 mr-1 hidden md:inline">Quick Adjust:</div>
            <button
              onClick={() => {
                if (riders.length > 0) handleOpenCommissionModal(riders[0]);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders size={13} weight="bold" className="text-ink-500" />
              <span>Change Rates</span>
            </button>
          </div>
        </div>

        <DataTable<RiderAdmin>
          data={riders}
          columns={columns}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          enableCityFilter
          searchPlaceholder="Search rider name, phone, CNIC, or plate..."
          searchFilter={(r, q) =>
            r.name.toLowerCase().includes(q.toLowerCase()) ||
            r.phone_number.includes(q) ||
            r.cnic_number.includes(q)
          }
          filterOptions={[
            { label: 'All Fleet', value: 'all', filterFn: () => true },
            { label: 'Pending Approvals', value: 'pending', filterFn: (r) => r.approval_status === 'pending' },
            { label: 'Approved Active', value: 'approved', filterFn: (r) => r.approval_status === 'approved' },
            { label: 'Online Riders', value: 'online', filterFn: (r) => r.is_online },
          ]}
        />
      </div>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(actionTarget)}
        title={
          actionTarget?.action === 'approve'
            ? 'Approve Rider'
            : actionTarget?.action === 'reject'
            ? 'Reject Rider Application'
            : 'Toggle Active Status'
        }
        description={`Confirm action for ${actionTarget?.rider.name}. The rider will ${
          actionTarget?.action === 'approve'
            ? 'be permitted to receive delivery dispatches and retain 90% of customer delivery fees under the 10% commission model.'
            : 'be blocked from taking delivery orders.'
        }`}
        confirmText={actionTarget?.action === 'approve' ? 'Approve Rider' : 'Confirm'}
        variant={actionTarget?.action === 'reject' ? 'danger' : 'primary'}
        onConfirm={handleExecuteAction}
        onCancel={() => setActionTarget(null)}
      />

      {/* COMMISSION RATE ADJUSTMENT MODAL */}
      {commissionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full shadow-3 border border-ink-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Percent size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="font-bold text-ink-900 text-sm">Rider Commission Rate</h3>
                  <p className="text-2xs text-ink-500 font-medium">{commissionTarget.name} ({commissionTarget.phone_number})</p>
                </div>
              </div>
              <button
                onClick={() => setCommissionTarget(null)}
                className="p-1 rounded-sm hover:bg-ink-200 text-ink-400 hover:text-ink-600 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* CRITICAL RISK LEVEL NOTICE */}
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-md flex items-start gap-2.5">
                <ShieldWarning size={20} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900">
                  <span className="font-bold uppercase tracking-wider text-2xs bg-red-200/80 text-red-800 px-1.5 py-0.5 rounded mr-1">
                    Critical Risk Scale
                  </span>
                  Modifying delivery commissions directly impacts rider wallet auto-deductions on delivered orders. Restricted to Superadmin.
                </div>
              </div>

              {/* QUICK PRESET TOGGLES */}
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-2">
                  Commission Strategy Preset
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCommissionValue(0)}
                    className={`p-3 rounded-sm border text-left transition-all ${
                      commissionValue === 0
                        ? 'bg-green-50 border-green-300 ring-2 ring-green-500/20'
                        : 'bg-white border-ink-200 hover:border-ink-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-ink-900">0% Promotional</span>
                      {commissionValue === 0 && <Check size={14} weight="bold" className="text-green-600" />}
                    </div>
                    <p className="text-2xs text-ink-500 leading-snug">
                      No commission taken. Attract riders during launch phase.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionValue(10)}
                    className={`p-3 rounded-sm border text-left transition-all ${
                      commissionValue === 10
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-white border-ink-200 hover:border-ink-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-ink-900">10% Standard</span>
                      {commissionValue === 10 && <Check size={14} weight="bold" className="text-amber-600" />}
                    </div>
                    <p className="text-2xs text-ink-500 leading-snug">
                      10% per delivery fee. Operating post-1 month phase.
                    </p>
                  </button>
                </div>
              </div>

              {/* CUSTOM PERCENTAGE INPUT */}
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Custom Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-sm text-xs font-mono font-bold text-ink-800 focus:outline-hidden focus:border-blue-500 focus:bg-white pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-ink-400 font-bold">%</span>
                </div>
                <p className="text-2xs text-ink-400 mt-1">
                  Value must be between 0.0% and 100.0%. E.g., at 10%, a Rs. 100 delivery fee deducts Rs. 10 from rider wallet.
                </p>
              </div>
            </div>

            <div className="p-4 bg-ink-50 border-t border-ink-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCommissionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-ink-600 hover:text-ink-800 hover:bg-ink-200/60 rounded-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={isUpdatingCommission}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-1 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingCommission ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <Check size={14} weight="bold" />
                    <span>Apply Commission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
