'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  WarningCircle,
  Bicycle,
  X,
  Storefront,
  User,
  MapPin,
  Clock,
  CurrencyDollar,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
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
        listAdminRiders('approved'),
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

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Global Order Monitor"
        description="Inspect system-wide orders, track live statuses, and intervene on stuck dispatches."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchOrders();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6">
        <DataTable<AdminOrderSummary>
          data={orders}
          keyExtractor={(o) => o.id}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          searchPlaceholder="Search by Order ID, restaurant, or status..."
          searchFilter={(o, query) =>
            o.id.toLowerCase().includes(query.toLowerCase()) ||
            o.restaurant_name.toLowerCase().includes(query.toLowerCase()) ||
            o.status.toLowerCase().includes(query.toLowerCase())
          }
          filterOptions={[
            { label: 'Active Dispatches', value: 'active', filterFn: (o) => !['Delivered', 'Cancelled'].includes(o.status) },
            { label: 'Delivered', value: 'delivered', filterFn: (o) => o.status === 'Delivered' },
            { label: 'Cancelled', value: 'cancelled', filterFn: (o) => o.status === 'Cancelled' },
          ]}
          columns={[
            {
              key: 'id',
              title: 'Order ID',
              render: (o) => (
                <span className="font-mono text-xs font-semibold text-ink">
                  #{o.id.slice(0, 8)}
                </span>
              ),
            },
            {
              key: 'restaurant_name',
              title: 'Restaurant',
              render: (o) => (
                <div className="font-sans text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Storefront size={14} className="text-ink-soft shrink-0" />
                  <span>{o.restaurant_name}</span>
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
              title: 'Payment',
              render: (o) => (
                <span className="font-mono text-[11px] px-1.5 py-0.5 border border-line bg-paper-off text-ink-soft">
                  {o.payment_method}
                </span>
              ),
            },
            {
              key: 'total_amount',
              title: 'Total Amount',
              align: 'right',
              sortable: true,
              render: (o) => (
                <span className="font-mono text-xs font-semibold text-ink">
                  {formatPKR(o.total_amount)}
                </span>
              ),
            },
            {
              key: 'placed_at',
              title: 'Placed At',
              render: (o) => (
                <span className="font-mono text-xs text-ink-soft">
                  {new Date(o.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Order Detail Drawer with Intervention Options */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/60 backdrop-blur-[2px]">
          <div
            className="w-full max-w-lg bg-paper border-l border-line h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-150"
            style={{ borderRadius: '0px' }}
          >
            <div>
              <div className="h-16 border-b border-line px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-red" />
                  <h3 className="font-heading font-bold text-sm text-ink">
                    Order Breakdown #{selectedOrder.id.slice(0, 8)}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 border border-line hover:bg-paper-off text-ink-soft"
                  style={{ borderRadius: '0px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
                {/* Status & Placement Bar */}
                <div className="flex items-center justify-between p-3 border border-line bg-paper-off/50">
                  <StatusBadge status={selectedOrder.status} />
                  <span className="font-mono text-xs text-ink-soft">
                    Placed: {new Date(selectedOrder.placed_at).toLocaleString()}
                  </span>
                </div>

                {/* Counterparties */}
                <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                  <div className="p-3 border border-line bg-paper space-y-1">
                    <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">
                      Restaurant
                    </div>
                    <div className="font-bold text-ink">{selectedOrder.restaurant_name}</div>
                  </div>
                  <div className="p-3 border border-line bg-paper space-y-1">
                    <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">
                      Assigned Rider
                    </div>
                    <div className="font-bold text-ink">
                      {selectedOrder.rider_name || (
                        <span className="text-ink-soft font-normal italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Frozen Financial Snapshot (Single Source of Truth) */}
                <div className="border border-line bg-paper p-4 space-y-2.5">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink border-b border-line pb-1.5 flex items-center justify-between">
                    <span>Audit Financial Breakdown</span>
                    <span className="text-[10px] text-ink-soft font-normal">Spec Sec 11 Frozen Snapshot</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-ink-soft">
                      <span>Food Subtotal</span>
                      <span className="text-ink">{formatPKR(selectedOrder.food_subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <span>Road Distance</span>
                      <span className="text-ink">{selectedOrder.delivery_distance_km} km</span>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <span>Delivery Fee [50 + (km × 20)]</span>
                      <span className="text-ink">{formatPKR(selectedOrder.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-ink pt-1.5 border-t border-line text-sm">
                      <span>Total Paid by Customer</span>
                      <span>{formatPKR(selectedOrder.total_amount)}</span>
                    </div>

                    <div className="pt-3 border-t border-dashed border-line space-y-1 text-[11px]">
                      <div className="flex justify-between text-ink-soft">
                        <span>SpeedyMeals Commission (10%)</span>
                        <span className="text-red font-semibold">{formatPKR(selectedOrder.commission_amount)}</span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Restaurant Net Payable (90%)</span>
                        <span className="text-ink font-semibold">{formatPKR(selectedOrder.restaurant_payable)}</span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Rider Earnings (100% Delivery Fee)</span>
                        <span className="text-[#1E7E34] font-semibold">{formatPKR(selectedOrder.rider_earning)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.cancellation_reason && (
                  <div className="p-3 border border-[#F5C2BC] bg-[#FDF0EE] text-xs font-mono text-[#C92A2A]">
                    <span className="font-bold">Cancellation Reason: </span>
                    {selectedOrder.cancellation_reason} (By: {selectedOrder.cancelled_by})
                  </div>
                )}
              </div>
            </div>

            {/* Admin Intervention Controls */}
            {!['Delivered', 'Cancelled'].includes(selectedOrder.status) && (
              <div className="p-4 border-t border-line bg-paper flex items-center gap-2">
                <button
                  onClick={() => setReassignModalOpen(true)}
                  className="flex-1 py-2 font-mono text-xs font-semibold border border-line bg-paper-off hover:bg-paper text-ink transition-colors flex items-center justify-center gap-1.5"
                  style={{ borderRadius: '0px' }}
                >
                  <ArrowsClockwise size={14} />
                  <span>Reassign Rider</span>
                </button>
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="flex-1 py-2 font-mono text-xs font-semibold border border-[#F5C2BC] bg-[#FDF0EE] text-[#C92A2A] hover:bg-[#FADBD8] transition-colors flex items-center justify-center gap-1.5"
                  style={{ borderRadius: '0px' }}
                >
                  <WarningCircle size={14} />
                  <span>Force Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-paper border border-line shadow-2xl p-6" style={{ borderRadius: '0px' }}>
            <h3 className="font-heading font-bold text-sm text-ink mb-1">
              Confirm Force Cancellation
            </h3>
            <p className="font-sans text-xs text-ink-soft mb-4">
              Enter the official administrative reason for aborting Order #{selectedOrder?.id.slice(0, 8)}.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Rider vehicle breakdown, customer unreachable..."
                className="w-full p-2.5 text-xs bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                style={{ borderRadius: '0px' }}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 font-mono text-xs border border-line bg-paper text-ink hover:bg-paper-off"
                  style={{ borderRadius: '0px' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 font-mono text-xs font-semibold bg-[#C92A2A] text-paper hover:bg-[#A82222]"
                  style={{ borderRadius: '0px' }}
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Rider Modal */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-paper border border-line shadow-2xl p-6" style={{ borderRadius: '0px' }}>
            <h3 className="font-heading font-bold text-sm text-ink mb-1">
              Manually Reassign Rider
            </h3>
            <p className="font-sans text-xs text-ink-soft mb-4">
              Select an approved rider to dispatch for this delivery.
            </p>

            <form onSubmit={handleReassignRider} className="space-y-4">
              <select
                required
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="w-full p-2 text-xs font-sans bg-paper border border-line text-ink focus:outline-none focus:border-ink"
                style={{ borderRadius: '0px' }}
              >
                <option value="">Choose an approved rider...</option>
                {availableRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.phone_number})
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-3 py-1.5 font-mono text-xs border border-line bg-paper text-ink hover:bg-paper-off"
                  style={{ borderRadius: '0px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRiderId}
                  className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] disabled:opacity-40"
                  style={{ borderRadius: '0px' }}
                >
                  Confirm Reassign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
