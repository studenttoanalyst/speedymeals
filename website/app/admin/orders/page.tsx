'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Bicycle,
  X,
  Storefront,
  User,
  Clock,
  ArrowsClockwise,
  Warning,
  Eye,
  ShieldWarning,
  Check,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  listAdminOrders,
  getAdminOrder,
  cancelAdminOrder,
  reassignAdminOrder,
  listAdminRiders,
} from '@/lib/api/admin';
import { AdminOrderDetail, AdminOrderSummary } from '@/types/admin';
import { RiderAdmin } from '@/types/rider';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [availableRiders, setAvailableRiders] = useState<RiderAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Intervention Modals State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState('');

  const fetchOrders = async () => {
    try {
      const [orderData, riderData] = await Promise.all([
        listAdminOrders(),
        listAdminRiders({ approval_status: 'approved' }),
      ]);
      setOrders(orderData);
      setAvailableRiders(riderData);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRowClick = async (orderSummary: AdminOrderSummary) => {
    try {
      const detail = await getAdminOrder(orderSummary.id);
      setSelectedOrder(detail);
    } catch (err) {
      console.error('Failed to fetch order detail', err);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !cancelReason.trim()) return;

    try {
      const updated = await cancelAdminOrder(selectedOrder.id, { reason: cancelReason });
      setSelectedOrder(updated);
      setCancelModalOpen(false);
      setCancelReason('');
      await fetchOrders();
    } catch (err) {
      console.error('Failed to cancel order', err);
    }
  };

  const handleReassignRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedRiderId) return;

    try {
      const updated = await reassignAdminOrder(selectedOrder.id, { rider_id: selectedRiderId });
      setSelectedOrder(updated);
      setReassignModalOpen(false);
      setSelectedRiderId('');
      await fetchOrders();
    } catch (err) {
      console.error('Failed to reassign rider', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: Column<AdminOrderSummary>[] = [
    {
      key: 'id',
      title: 'Order ID',
      sortable: true,
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          #{o.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'restaurant_name',
      title: 'Restaurant Partner',
      sortable: true,
      render: (o) => <div className="font-semibold text-slate-800 text-xs">{o.restaurant_name}</div>,
    },
    {
      key: 'rider_name',
      title: 'Courier',
      render: (o) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Bicycle size={13} className="text-slate-400" />
          <span>{o.rider_name || <span className="text-amber-600 italic">Unassigned</span>}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (o) => <StatusBadge status={o.status} size="sm" />,
    },
    {
      key: 'payment_method',
      title: 'Method',
      render: (o) => (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
            o.payment_method === 'COD'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {o.payment_method}
        </span>
      ),
    },
    {
      key: 'total_amount',
      title: 'Gross Amount',
      align: 'right',
      sortable: true,
      render: (o) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          {formatPKR(o.total_amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Intervention',
      align: 'right',
      render: (o) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(o);
          }}
          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs"
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Global Order Operations Console"
        description="Monitor system-wide food delivery tickets, manage emergency courier reassignments, and authorize customer refunds."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchOrders();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <DataTable<AdminOrderSummary>
          data={orders}
          columns={columns}
          keyExtractor={(o) => o.id}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          searchPlaceholder="Search order ID, restaurant, or courier..."
          searchFilter={(o, q) =>
            o.id.toLowerCase().includes(q.toLowerCase()) ||
            o.restaurant_name.toLowerCase().includes(q.toLowerCase()) ||
            Boolean(o.rider_name && o.rider_name.toLowerCase().includes(q.toLowerCase()))
          }
          filterOptions={[
            { label: 'All Orders', value: 'all', filterFn: () => true },
            { label: 'Active In-Transit', value: 'transit', filterFn: (o) => ['On the Way', 'Picked Up'].includes(o.status) },
            { label: 'In Kitchen Prep', value: 'prep', filterFn: (o) => ['Accepted', 'Preparing'].includes(o.status) },
            { label: 'Delivered (Done)', value: 'delivered', filterFn: (o) => o.status === 'Delivered' },
          ]}
        />
      </div>

      {/* INSPECTION SLIDEOVER DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-rose-600">
                    #{selectedOrder.id.slice(0, 8)}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Order Telemetry</h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Status Pill */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Order Lifecycle State</div>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Payment</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {selectedOrder.payment_method}
                  </div>
                </div>
              </div>

              {/* Stakeholders */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Storefront size={14} className="text-slate-400" />
                    <span>Restaurant: {selectedOrder.restaurant_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 pt-1">
                    <User size={14} className="text-slate-400" />
                    <span>Customer: {selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Bicycle size={14} className="text-slate-400" />
                    <span>Courier: {selectedOrder.rider_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Financial Split (Strict SpeedyMeals Rules) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">
                  Financial Settlement Split
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Gross Food Volume</span>
                  <span className="font-mono">{formatPKR(selectedOrder.food_subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-600 font-semibold">
                  <span>Platform Commission (10%)</span>
                  <span className="font-mono">+{formatPKR(selectedOrder.commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Restaurant Net Payable (90%)</span>
                  <span className="font-mono">{formatPKR(selectedOrder.restaurant_payable)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-700 font-semibold">
                  <span>Courier Retained Fee (100%)</span>
                  <span className="font-mono">+{formatPKR(selectedOrder.rider_earning)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-bold pt-2 border-t border-slate-200 text-sm">
                  <span>Gross Customer Total</span>
                  <span className="font-mono">{formatPKR(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Cancellation Banner */}
              {selectedOrder.status === 'Cancelled' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Warning size={15} weight="bold" />
                    <span>Order Was Cancelled</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Reason: {selectedOrder.cancellation_reason || 'Administrative intervention'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
              <div className="p-5 border-t border-slate-200 bg-white flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(true)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Reassign Courier
                </button>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  Emergency Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REASSIGN MODAL */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Reassign Order Courier</h3>
            <form onSubmit={handleReassignRider} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Available Courier</label>
                <select
                  required
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                >
                  <option value="">Select courier...</option>
                  {availableRiders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.vehicle_type || 'Motorcycle'}) — {r.phone_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  Confirm Reassign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Emergency Cancel Order</h3>
            <form onSubmit={handleCancelOrder} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Cancellation Rationale</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify reason for manual administrative cancellation..."
                  className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  Cancel & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
