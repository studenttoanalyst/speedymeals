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
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
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

  // Action Dialog
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

  const columns: Column<RiderAdmin>[] = [
    {
      key: 'rider',
      title: 'Courier Partner',
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
        title="Fleet & Courier Management"
        description="Courier compliance verification, CNIC/License inspection, real-time COD cash float control, and wallet payouts."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchRiders();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <DataTable<RiderAdmin>
          data={riders}
          columns={columns}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          searchPlaceholder="Search courier name, phone, CNIC, or plate..."
          searchFilter={(r, q) =>
            r.name.toLowerCase().includes(q.toLowerCase()) ||
            r.phone_number.includes(q) ||
            r.cnic_number.includes(q)
          }
          filterOptions={[
            { label: 'All Fleet', value: 'all', filterFn: () => true },
            { label: 'Pending Approvals', value: 'pending', filterFn: (r) => r.approval_status === 'pending' },
            { label: 'Approved Active', value: 'approved', filterFn: (r) => r.approval_status === 'approved' },
            { label: 'Online Couriers', value: 'online', filterFn: (r) => r.is_online },
          ]}
        />
      </div>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(actionTarget)}
        title={
          actionTarget?.action === 'approve'
            ? 'Approve Courier'
            : actionTarget?.action === 'reject'
            ? 'Reject Courier Application'
            : 'Toggle Active Status'
        }
        description={`Confirm action for ${actionTarget?.rider.name}. The courier will ${
          actionTarget?.action === 'approve'
            ? 'be permitted to receive delivery dispatches and retain 100% of customer delivery fees.'
            : 'be blocked from taking delivery orders.'
        }`}
        confirmText={actionTarget?.action === 'approve' ? 'Approve Courier' : 'Confirm'}
        variant={actionTarget?.action === 'reject' ? 'danger' : 'primary'}
        onConfirm={handleExecuteAction}
        onCancel={() => setActionTarget(null)}
      />
    </div>
  );
}
