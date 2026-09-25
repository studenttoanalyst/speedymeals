'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Clock,
  CheckCircle,
  X,
  MapPin,
  ForkKnife,
  Bicycle,
  SpeakerHigh,
  SpeakerSlash,
  SquaresFour,
  ListDashes,
  Check,
  Warning,
  Printer,
  Timer,
  User,
  Phone,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  listRestaurantOrders,
  getRestaurantOrder,
  updateRestaurantOrderStatus,
} from '@/lib/api/restaurant';
import { RestaurantOrderDetail, RestaurantOrderSummary } from '@/types/restaurant';

export default function RestaurantOrdersPage() {
  const [orders, setOrders] = useState<RestaurantOrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RestaurantOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Accept modal state
  const [acceptModalOrder, setAcceptModalOrder] = useState<RestaurantOrderSummary | null>(null);
  const [prepMinutes, setPrepMinutes] = useState<number>(20);

  // Reject modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<RestaurantOrderSummary | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Kitchen at maximum capacity');

  const fetchOrders = async () => {
    try {
      const data = await listRestaurantOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load restaurant orders', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenDetail = async (orderId: string) => {
    try {
      const detail = await getRestaurantOrder(orderId);
      setSelectedOrder(detail);
    } catch (err) {
      console.error('Failed to load order detail', err);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateRestaurantOrderStatus(orderId, newStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAcceptSubmit = async () => {
    if (!acceptModalOrder) return;
    await handleUpdateStatus(acceptModalOrder.id, 'Preparing');
    setAcceptModalOrder(null);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalOrder) return;
    await handleUpdateStatus(rejectModalOrder.id, 'Rejected');
    setRejectModalOrder(null);
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Group orders for Kanban
  const placedOrders = orders.filter((o) => o.status === 'Placed');
  const prepOrders = orders.filter((o) => ['Accepted', 'Preparing'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'Ready for Pickup');
  const completedOrders = orders.filter((o) => ['Delivered', 'Cancelled', 'Rejected'].includes(o.status));

  // Table columns
  const tableColumns: Column<RestaurantOrderSummary>[] = [
    {
      key: 'id',
      title: 'Order ID',
      sortable: true,
      render: (o) => <span className="font-mono font-medium text-slate-800">#{o.id.slice(0, 8)}</span>,
    },
    {
      key: 'customer_name',
      title: 'Customer',
      sortable: true,
      render: (o) => <div className="font-medium text-slate-900">{o.customer_name}</div>,
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
      title: 'Total',
      align: 'right',
      sortable: true,
      render: (o) => <span className="font-mono font-semibold text-slate-900">{formatPKR(o.total_amount)}</span>,
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (o) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetail(o.id);
          }}
          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs"
        >
          View Ticket
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Kitchen Dispatch Terminal"
        description="Incoming order audio chime, prep time countdowns, and courier handover signals."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchOrders();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            {/* Audio Chime Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {soundEnabled ? <SpeakerHigh size={15} weight="bold" /> : <SpeakerSlash size={15} />}
              <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-slate-200 bg-white">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-rose-50 text-rose-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Kanban Board View"
              >
                <SquaresFour size={16} weight="bold" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table'
                    ? 'bg-rose-50 text-rose-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dense List View"
              >
                <ListDashes size={16} weight="bold" />
              </button>
            </div>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {viewMode === 'table' ? (
          <DataTable
            data={orders}
            columns={tableColumns}
            keyExtractor={(o) => o.id}
            isLoading={isLoading}
            onRowClick={(o) => handleOpenDetail(o.id)}
            searchPlaceholder="Search by customer name or ID..."
            searchFilter={(o, q) =>
              o.customer_name.toLowerCase().includes(q.toLowerCase()) ||
              o.id.toLowerCase().includes(q.toLowerCase())
            }
          />
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {/* Column 1: New / Placed */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    New Incoming
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {placedOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {placedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-4 bg-white border border-rose-200 rounded-xl shadow-xs space-y-3 cursor-pointer hover:border-rose-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-rose-600">
                          #{o.id.slice(0, 8)}
                        </span>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {o.customer_name}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        {o.payment_method}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-mono font-bold text-slate-900">{formatPKR(o.total_amount)}</span>
                      <span className="text-[11px] text-slate-400">Just now</span>
                    </div>

                    {/* Quick Accept/Reject Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectModalOrder(o);
                        }}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold rounded-lg transition-colors text-center"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAcceptModalOrder(o);
                        }}
                        className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors text-center"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
                {placedOrders.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">No new incoming orders</div>
                )}
              </div>
            </div>

            {/* Column 2: In Preparation */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    In Kitchen Prep
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {prepOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {prepOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 cursor-pointer hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-medium text-slate-500">
                          #{o.id.slice(0, 8)}
                        </span>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {o.customer_name}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200 flex items-center gap-1">
                        <Clock size={12} weight="bold" />
                        14m left
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-mono font-bold text-slate-900">{formatPKR(o.total_amount)}</span>
                      <span className="text-[11px] text-slate-400">Prep in progress</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(o.id, 'Ready for Pickup');
                      }}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} weight="bold" />
                      Mark Ready for Pickup
                    </button>
                  </div>
                ))}
                {prepOrders.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">Kitchen is idle</div>
                )}
              </div>
            </div>

            {/* Column 3: Ready for Pickup (Courier Handover) */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Ready for Pickup
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {readyOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {readyOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-4 bg-white border border-blue-200 rounded-xl shadow-xs space-y-3 cursor-pointer hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-medium text-slate-500">
                          #{o.id.slice(0, 8)}
                        </span>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {o.customer_name}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                        Bagged
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50/50 rounded-lg text-xs text-blue-900 flex items-center gap-2 border border-blue-100">
                      <Bicycle size={16} weight="bold" className="text-blue-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold truncate">Courier Assigned: Tariq M.</div>
                        <div className="text-[10px] text-blue-600">Arriving in ~4 mins</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-mono font-bold text-slate-900">{formatPKR(o.total_amount)}</span>
                      <span className="text-[11px] text-slate-400">Waiting courier</span>
                    </div>
                  </div>
                ))}
                {readyOrders.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">No packaged orders waiting</div>
                )}
              </div>
            </div>

            {/* Column 4: Completed / Dispatched */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Delivered / Past
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {completedOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {completedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 cursor-pointer hover:border-slate-300 transition-all opacity-85"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-500">#{o.id.slice(0, 8)}</span>
                      <StatusBadge status={o.status} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate">{o.customer_name}</div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                      <span className="font-mono font-medium text-slate-700">{formatPKR(o.total_amount)}</span>
                      <span className="text-[10px]">Settled</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL SLIDEOVER / MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-600">
                    #{selectedOrder.id.slice(0, 8)}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Order Ticket Details</h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Status & Payment Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Current Order State</div>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Payment Type</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {selectedOrder.payment_method}
                  </div>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Customer & Delivery
                </h3>
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <User size={14} className="text-slate-400" />
                    <span>{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="flex items-start gap-2 text-slate-500 pt-1">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedOrder.delivery_address.full_address}</span>
                    </div>
                  )}
                  {selectedOrder.special_instructions && (
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-medium text-[11px] mt-2">
                      <strong>Special Request:</strong> {selectedOrder.special_instructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Food Ticket */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ordered Items
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] flex items-center justify-center">
                          {item.quantity}x
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          {item.selected_variant && (
                            <div className="text-[11px] text-slate-400">{item.selected_variant}</div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-medium text-slate-800">
                        {formatPKR(item.price_at_order * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Money Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Food Subtotal</span>
                  <span className="font-mono">{formatPKR(selectedOrder.food_subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-600">
                  <span>Platform Commission (10%)</span>
                  <span className="font-mono">−{formatPKR(selectedOrder.commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-bold pt-2 border-t border-slate-200 text-sm">
                  <span>Your Net Payable</span>
                  <span className="font-mono text-emerald-700">
                    {formatPKR(selectedOrder.restaurant_payable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-5 border-t border-slate-200 bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>

              {selectedOrder.status === 'Placed' && (
                <button
                  type="button"
                  onClick={() => {
                    const current = selectedOrder;
                    setSelectedOrder(null);
                    setAcceptModalOrder(orders.find((o) => o.id === current.id) || null);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Accept Order
                </button>
              )}

              {['Accepted', 'Preparing'].includes(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateStatus(selectedOrder.id, 'Ready for Pickup');
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check size={14} weight="bold" />
                  Mark Ready for Pickup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACCEPT MODAL WITH PREP TIME ESTIMATOR */}
      {acceptModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-slate-900">Accept Order & Set Prep Time</h3>
              <p className="text-xs text-slate-500 mt-1">
                Order #{acceptModalOrder.id.slice(0, 8)} · {acceptModalOrder.customer_name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Estimated Kitchen Prep SLA</label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 25, 35].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setPrepMinutes(mins)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      prepMinutes === mins
                        ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-2xs ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAcceptModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptSubmit}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
              >
                Confirm & Start Kitchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL WITH REASON */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Warning size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Decline Order</h3>
                <p className="text-xs text-slate-500">
                  Order #{rejectModalOrder.id.slice(0, 8)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Reason for Declining</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Kitchen at maximum capacity">Kitchen at maximum capacity</option>
                <option value="Key ingredient out of stock">Key ingredient out of stock</option>
                <option value="Store closing early">Store closing early</option>
                <option value="Item temporarily unavailable">Item temporarily unavailable</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
              >
                Decline & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
