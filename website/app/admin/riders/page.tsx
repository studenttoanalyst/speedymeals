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
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase shrink-0">
            {r.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span>{r.name}</span>
              {r.is_online ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" title="Offline" />
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
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
          <div className="font-medium text-slate-800">{r.vehicle_type || 'Motorcycle'}</div>
          <div className="text-[11px] text-slate-400 font-mono">
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
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight border transition-all hover:scale-105 cursor-pointer shadow-2xs ${
                isPromo
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to adjust commission percentage"
            >
              {isPromo ? (
                <Sparkle size={12} weight="fill" className="text-emerald-500" />
              ) : (
                <Percent size={12} weight="bold" className="text-amber-600" />
              )}
              <span>{rate}% {isPromo ? 'Launch Promo' : 'Commission'}</span>
            </button>
            <button
              onClick={() => handleOpenCommissionModal(r)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 transition-colors"
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
                isBreached ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {formatPKR(r.pending_cash_owed)}
            </span>
            {isBreached && (
              <div className="text-[10px] font-bold text-rose-600 flex items-center justify-end gap-0.5">
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
        <span className="font-mono font-semibold text-emerald-700 text-xs">
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
      key: 'actions',
      title: 'Inspection & Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenCommissionModal(r)}
            className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors"
            title="Adjust commission rate"
          >
            <Sliders size={12} weight="bold" />
            <span>Rate</span>
          </button>

          <Link
            href={`/admin/riders/${r.id}`}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs"
          >
            KYC Docs
          </Link>

          {r.approval_status === 'pending' && (
            <button
              onClick={() => setActionTarget({ rider: r, action: 'approve' })}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
            >
              Approve
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
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
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
            <span>{commissionSuccessMsg}</span>
          </div>
        )}

        {/* SIMPLIFIED COMMISSION POLICY BAR (NO SUBHEADING DESCRIPTION) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Percent size={20} weight="bold" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">Rider Commission Policy</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Strategy: 0% Launch Promo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="text-[11px] font-semibold text-slate-400 mr-1 hidden md:inline">Quick Adjust:</div>
            <button
              onClick={() => {
                if (riders.length > 0) handleOpenCommissionModal(riders[0]);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders size={13} weight="bold" className="text-slate-500" />
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
            ? 'be permitted to receive delivery dispatches and retain 100% of customer delivery fees.'
            : 'be blocked from taking delivery orders.'
        }`}
        confirmText={actionTarget?.action === 'approve' ? 'Approve Rider' : 'Confirm'}
        variant={actionTarget?.action === 'reject' ? 'danger' : 'primary'}
        onConfirm={handleExecuteAction}
        onCancel={() => setActionTarget(null)}
      />

      {/* COMMISSION RATE ADJUSTMENT MODAL */}
      {commissionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Percent size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Rider Commission Rate</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{commissionTarget.name} ({commissionTarget.phone_number})</p>
                </div>
              </div>
              <button
                onClick={() => setCommissionTarget(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* CRITICAL RISK LEVEL NOTICE */}
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5">
                <ShieldWarning size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900">
                  <span className="font-bold uppercase tracking-wider text-[10px] bg-rose-200/80 text-rose-800 px-1.5 py-0.5 rounded mr-1">
                    Critical Risk Scale
                  </span>
                  Modifying delivery commissions directly impacts rider wallet auto-deductions on delivered orders. Restricted to Superadmin.
                </div>
              </div>

              {/* QUICK PRESET TOGGLES */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Commission Strategy Preset
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCommissionValue(0)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      commissionValue === 0
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">0% Promotional</span>
                      {commissionValue === 0 && <Check size={14} weight="bold" className="text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      No commission taken. Attract riders during launch phase.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionValue(10)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      commissionValue === 10
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">10% Standard</span>
                      {commissionValue === 10 && <Check size={14} weight="bold" className="text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      10% per delivery fee. Operating post-1 month phase.
                    </p>
                  </button>
                </div>
              </div>

              {/* CUSTOM PERCENTAGE INPUT */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Value must be between 0.0% and 100.0%. E.g., at 10%, a Rs. 100 delivery fee deducts Rs. 10 from rider wallet.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCommissionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={isUpdatingCommission}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
