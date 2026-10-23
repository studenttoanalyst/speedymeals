'use client';

import React, { useEffect, useState } from 'react';
import { PUSH_EVENT, isChimeEnabled, setChimeEnabled } from '@/lib/firebase/push';
import { isInKitchen, isNewOrder } from '@/lib/orders/status';
import Link from 'next/link';
import { motion } from 'motion/react';
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
  rejectRestaurantOrder,
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
    } catch (err: any) {
      // 401s are handled by apiClient (token refresh, then redirect to login).
      console.error('Failed to load restaurant orders', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Restore the persisted chime preference (read after mount to avoid SSR mismatch).
  useEffect(() => {
    setSoundEnabled(isChimeEnabled());
  }, []);

  // A push arrived while this page is open: refetch so the new order shows
  // immediately (the chime itself is played by PushAlertsButton).
  useEffect(() => {
    const onPush = () => {
      fetchOrders();
    };
    window.addEventListener(PUSH_EVENT, onPush);
    return () => window.removeEventListener(PUSH_EVENT, onPush);
  }, []);

  const handleOpenDetail = async (orderId: string) => {
    try {
      const detail = await getRestaurantOrder(orderId);
      setSelectedOrder(detail);
    } catch (err) {
      console.error('Failed to load order detail', err);
    }
  };

  const [statusError, setStatusError] = useState<string | null>(null);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setStatusError(null);
    try {
      await updateRestaurantOrderStatus(orderId, newStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      await fetchOrders();
    } catch (err: any) {
      console.error('Failed to update status', err);
      const errMsg = String(err?.message || '').toLowerCase();

      // If error is 404 / Order not found, the ticket on the board was stale/mock.
      // Auto-refresh the board with live orders so the user sees valid DB records.
      if (err?.status === 404 || errMsg.includes('not found')) {
        await fetchOrders();
        setStatusError('Order not found on server. Board refreshed with live database orders.');
        setTimeout(() => setStatusError(null), 5000);
        return;
      }

      const msg = err?.message || 'Failed to update order status';
      setStatusError(msg);
      setTimeout(() => setStatusError(null), 5000);
    }
  };

  const handleAcceptSubmit = async () => {
    if (!acceptModalOrder) return;
    await handleUpdateStatus(acceptModalOrder.id, 'Preparing');
    setAcceptModalOrder(null);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalOrder) return;
    try {
      await rejectRestaurantOrder(rejectModalOrder.id, rejectReason);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to reject order', err);
    }
    setRejectModalOrder(null);
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Group orders for Kanban
  const placedOrders = orders.filter((o) => isNewOrder(o.status));
  const prepOrders = orders.filter((o) => isInKitchen(o.status));
  const readyOrders = orders.filter((o) => ['Ready for Pickup', 'Rider Assigned'].includes(o.status));
  const completedOrders = orders.filter((o) =>
    ['Accepted by Rider', 'Arrived at Restaurant', 'Picked Up', 'On the Way', 'Delivered', 'Cancelled', 'Rejected'].includes(o.status)
  );

  // Operator Keyboard Hotkeys: [A] Accept, [P] Prep Ready, [K] Toggle View, [Esc] Close Modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        if (acceptModalOrder) setAcceptModalOrder(null);
        else if (rejectModalOrder) setRejectModalOrder(null);
        else if (selectedOrder) setSelectedOrder(null);
        return;
      }

      if (isInput) return;

      const key = e.key.toLowerCase();
      if (key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (acceptModalOrder) {
          handleAcceptSubmit();
        } else if (placedOrders.length > 0) {
          setAcceptModalOrder(placedOrders[0]);
        }
      } else if (key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (selectedOrder && isInKitchen(selectedOrder.status)) {
          handleUpdateStatus(selectedOrder.id, 'Ready for Pickup');
        } else if (prepOrders.length > 0) {
          handleUpdateStatus(prepOrders[0].id, 'Ready for Pickup');
        }
      } else if (key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setViewMode((v) => (v === 'kanban' ? 'table' : 'kanban'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [acceptModalOrder, rejectModalOrder, selectedOrder, placedOrders, prepOrders]);

  // Table columns
  const tableColumns: Column<RestaurantOrderSummary>[] = [
    {
      key: 'id',
      title: 'Order ID',
      sortable: true,
      render: (o) => <span className="font-mono font-medium text-ink-800">#{o.id.slice(0, 8)}</span>,
    },
    {
      key: 'customer_name',
      title: 'Customer',
      sortable: true,
      render: (o) => <div className="font-medium text-ink-900">{o.customer_name}</div>,
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
          className={`text-2xs font-semibold px-2 py-0.5 rounded-md ${
            o.payment_method === 'COD'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-green-50 text-green-800 border border-green-200'
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
      render: (o) => <span className="font-mono font-semibold text-ink-900">{formatPKR(o.total_amount)}</span>,
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
          className="px-2.5 py-1 text-xs font-semibold bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 rounded-sm shadow-1"
        >
          View Ticket
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar
        title="Kitchen Dispatch Terminal"
        onRefresh={() => {
          setIsRefreshing(true);
          fetchOrders();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            {/* Audio Chime Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                setChimeEnabled(next);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-ink-200 text-ink-500 hover:bg-ink-50'
              }`}
            >
              {soundEnabled ? <SpeakerHigh size={15} weight="bold" /> : <SpeakerSlash size={15} />}
              <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="relative flex items-center p-0.5 rounded-md border border-ink-200 bg-white shadow-1">
              {(['kanban', 'table'] as const).map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="relative p-1.5 rounded-sm text-xs transition-colors cursor-pointer active:scale-95 select-none"
                    title={mode === 'kanban' ? 'Kanban Board View' : 'Dense List View'}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="orders-viewmode-pill"
                        className="absolute inset-0 rounded-md bg-ink-900 shadow-1"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center justify-center ${
                      isActive ? 'text-white' : 'text-ink-500 hover:text-ink-800'
                    }`}>
                      {mode === 'kanban' ? <SquaresFour size={16} weight="bold" /> : <ListDashes size={16} weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {statusError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-md text-xs font-semibold text-red-800 flex items-center justify-between shadow-1 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Warning size={16} className="text-red-600 shrink-0" weight="bold" />
              <span>{statusError}</span>
              {(statusError.toLowerCase().includes('token') || statusError.toLowerCase().includes('expired') || statusError.toLowerCase().includes('authenticated')) && (
                <Link
                  href="/restaurant/login?expired=true"
                  className="ml-2 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-sm text-2xs transition-colors inline-block"
                >
                  Log In Again →
                </Link>
              )}
            </div>
            <button
              onClick={() => setStatusError(null)}
              className="text-red-500 hover:text-red-800 font-bold px-2 py-0.5 rounded-sm cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hotkey Operator Command Bar */}
        <div className="mb-4 px-3.5 py-2 rounded-md bg-white border border-ink-200 shadow-1 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-ink-600">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-ink-400 uppercase tracking-wider text-2xs">
              Hotkeys:
            </span>
            <span className="inline-flex items-center gap-1 text-2xs">
              <kbd className="px-1.5 py-0.5 bg-ink-100 border border-ink-300 rounded text-ink-800 font-bold shadow-1">A</kbd>
              <span>Accept Next Ticket</span>
            </span>
            <span className="inline-flex items-center gap-1 text-2xs">
              <kbd className="px-1.5 py-0.5 bg-ink-100 border border-ink-300 rounded text-ink-800 font-bold shadow-1">P</kbd>
              <span>Prep Ready</span>
            </span>
            <span className="inline-flex items-center gap-1 text-2xs">
              <kbd className="px-1.5 py-0.5 bg-ink-100 border border-ink-300 rounded text-ink-800 font-bold shadow-1">/</kbd>
              <span>Search</span>
            </span>
            <span className="inline-flex items-center gap-1 text-2xs">
              <kbd className="px-1.5 py-0.5 bg-ink-100 border border-ink-300 rounded text-ink-800 font-bold shadow-1">K</kbd>
              <span>Toggle Board</span>
            </span>
            <span className="inline-flex items-center gap-1 text-2xs">
              <kbd className="px-1.5 py-0.5 bg-ink-100 border border-ink-300 rounded text-ink-800 font-bold shadow-1">Esc</kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="text-2xs text-ink-500 font-medium">
            <span className="text-amber-600 font-bold">{placedOrders.length}</span> New Incoming · <span className="text-blue-600 font-bold">{prepOrders.length}</span> In Kitchen
          </div>
        </div>

        {viewMode === 'table' ? (
          <DataTable
            data={orders}
            columns={tableColumns}
            keyExtractor={(o) => o.id}
            isLoading={isLoading}
            enableCityFilter
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
            <div className="bg-ink-100/70 border border-ink-200 rounded-md p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-800">
                    New Incoming
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-xs bg-amber-100 text-amber-800">
                  {placedOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {placedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-4 bg-white border border-ink-200 rounded-md shadow-1 space-y-3 cursor-pointer hover:border-ink-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-2xs font-mono font-medium text-ink-500">
                          #{o.id.slice(0, 8)}
                        </span>
                        <div className="text-sm font-bold text-ink-900 mt-0.5">
                          {o.customer_name}
                        </div>
                      </div>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        {o.payment_method}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-500 pt-1 border-t border-ink-100">
                      <span className="font-mono font-bold text-ink-900">{formatPKR(o.total_amount)}</span>
                      <span className="text-2xs text-ink-400">Just now</span>
                    </div>

                    {/* Quick Accept/Reject Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectModalOrder(o);
                        }}
                        className="py-1.5 px-2 bg-ink-100 hover:bg-ink-200 text-ink-600 text-xs font-semibold rounded-sm transition-colors text-center cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAcceptModalOrder(o);
                        }}
                        className="py-1.5 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-sm shadow-1 transition-colors text-center cursor-pointer"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
                {placedOrders.length === 0 && (
                  <div className="text-center py-8 text-xs text-ink-400">No new incoming orders</div>
                )}
              </div>
            </div>

            {/* Column 2: In Preparation */}
            <div className="bg-ink-100/70 border border-ink-200 rounded-md p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-800">
                    In Kitchen Prep
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-xs bg-amber-100 text-amber-800">
                  {prepOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {prepOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-4 bg-white border border-ink-200 rounded-md shadow-1 space-y-3 cursor-pointer hover:border-ink-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-2xs font-mono font-medium text-ink-500">
                          #{o.id.slice(0, 8)}
                        </span>
                        <div className="text-sm font-bold text-ink-900 mt-0.5">
                          {o.customer_name}
                        </div>
                      </div>
                      <span className="text-2xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-xs ring-1 ring-amber-200 flex items-center gap-1">
                        <Clock size={12} weight="bold" />
                        14m left
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-500 pt-1 border-t border-ink-100">
                      <span className="font-mono font-bold text-ink-900">{formatPKR(o.total_amount)}</span>
                      <span className="text-2xs text-ink-400">Prep in progress</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(o.id, 'Ready for Pickup');
                      }}
                      className="w-full py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-sm shadow-1 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} weight="bold" />
                      Mark Ready for Pickup
                    </button>
                  </div>
                ))}
                {prepOrders.length === 0 && (
                  <div className="text-center py-8 text-xs text-ink-400">Kitchen is idle</div>
                )}
              </div>
            </div>

            {/* Column 3: Ready for Pickup (Rider Handover) */}
            <div className="bg-ink-100/70 border border-ink-200 rounded-md p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-800">
                    Ready for Pickup
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-xs bg-blue-100 text-blue-800">
                  {readyOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {readyOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-4 bg-white border border-blue-200 rounded-md shadow-1 space-y-3 cursor-pointer hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-2xs font-mono font-medium text-ink-500">
                          #{o.id.slice(0, 8)}
                        </span>
                        <div className="text-sm font-bold text-ink-900 mt-0.5">
                          {o.customer_name}
                        </div>
                      </div>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                        Bagged
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50/50 rounded-md text-xs text-blue-900 flex items-center gap-2 border border-blue-100">
                      <Bicycle size={16} weight="bold" className="text-blue-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold truncate">Rider Assigned: Tariq M.</div>
                        <div className="text-2xs text-blue-600">Arriving in ~4 mins</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-500 pt-1 border-t border-ink-100">
                      <span className="font-mono font-bold text-ink-900">{formatPKR(o.total_amount)}</span>
                      <span className="text-2xs text-ink-400">Waiting rider</span>
                    </div>
                  </div>
                ))}
                {readyOrders.length === 0 && (
                  <div className="text-center py-8 text-xs text-ink-400">No packaged orders waiting</div>
                )}
              </div>
            </div>

            {/* Column 4: Completed / Dispatched */}
            <div className="bg-ink-100/70 border border-ink-200 rounded-md p-3.5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-ink-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-800">
                    Delivered / Past
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-xs bg-ink-200 text-ink-700">
                  {completedOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {completedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleOpenDetail(o.id)}
                    className="p-3.5 bg-white border border-ink-200 rounded-md shadow-1 space-y-2 cursor-pointer hover:border-ink-300 transition-all opacity-85"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-mono text-ink-500">#{o.id.slice(0, 8)}</span>
                      <StatusBadge status={o.status} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-ink-800 truncate">{o.customer_name}</div>
                    <div className="flex items-center justify-between text-xs text-ink-400 pt-1 border-t border-ink-100">
                      <span className="font-mono font-medium text-ink-700">{formatPKR(o.total_amount)}</span>
                      <span className="text-2xs">Settled</span>
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
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-3 flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-ink-100 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-red-600">
                    #{selectedOrder.id.slice(0, 8)}
                  </span>
                  <h2 className="text-base font-bold text-ink-900">Order Ticket Details</h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-sm text-ink-400 hover:text-ink-600 hover:bg-ink-100"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Status & Payment Header */}
              <div className="p-4 rounded-md bg-ink-50 border border-ink-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink-400">Current Order State</div>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-400">Payment Type</div>
                  <div className="text-xs font-bold text-ink-800 mt-1">
                    {selectedOrder.payment_method}
                  </div>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                  Customer & Delivery
                </h3>
                <div className="p-3.5 rounded-md border border-ink-200 space-y-1.5 text-xs text-ink-700">
                  <div className="flex items-center gap-2 font-semibold text-ink-900">
                    <User size={14} className="text-ink-400" />
                    <span>{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="flex items-start gap-2 text-ink-500 pt-1">
                      <MapPin size={14} className="text-ink-400 shrink-0 mt-0.5" />
                      <span>{selectedOrder.delivery_address.full_address}</span>
                    </div>
                  )}
                  {selectedOrder.special_instructions && (
                    <div className="p-2 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium text-2xs mt-2">
                      <strong>Special Request:</strong> {selectedOrder.special_instructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Food Ticket */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                  Ordered Items
                </h3>
                <div className="divide-y divide-ink-100 border border-ink-200 rounded-md overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-red-50 text-red-700 font-bold text-2xs flex items-center justify-center">
                          {item.quantity}x
                        </span>
                        <div>
                          <div className="font-semibold text-ink-900">{item.name}</div>
                          {item.selected_variant && (
                            <div className="text-2xs text-ink-400">{item.selected_variant}</div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-medium text-ink-800">
                        {formatPKR(item.price_at_order * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Money Breakdown */}
              <div className="p-4 rounded-md bg-ink-50 border border-ink-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-600">
                  <span>Food Subtotal</span>
                  <span className="font-mono">{formatPKR(selectedOrder.food_subtotal)}</span>
                </div>
                {(selectedOrder.gst_amount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-ink-600">
                    <span>
                      GST ({selectedOrder.gst_rate}%) {selectedOrder.prices_include_gst ? '(included in prices)' : '(added to bill)'}
                    </span>
                    <span className="font-mono">{formatPKR(selectedOrder.gst_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-red-600">
                  <span>Platform Commission ({selectedOrder.commission_rate ?? (selectedOrder.net_subtotal && selectedOrder.commission_amount ? Math.round((selectedOrder.commission_amount / selectedOrder.net_subtotal) * 100) : (selectedOrder.food_subtotal && selectedOrder.commission_amount ? Math.round((selectedOrder.commission_amount / selectedOrder.food_subtotal) * 100) : 10))}%)</span>
                  <span className="font-mono">−{formatPKR(selectedOrder.commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-900 font-bold pt-2 border-t border-ink-200 text-sm">
                  <span>Your Net Payable</span>
                  <span className="font-mono text-green-700">
                    {formatPKR(selectedOrder.restaurant_payable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-5 border-t border-ink-200 bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-sm border border-ink-200 hover:bg-ink-50 text-ink-700 flex items-center gap-1.5 text-xs font-semibold"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>

              {isNewOrder(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={() => {
                    const current = selectedOrder;
                    setSelectedOrder(null);
                    setAcceptModalOrder(orders.find((o) => o.id === current.id) || null);
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs font-semibold shadow-1 cursor-pointer"
                >
                  Accept Order
                </button>
              )}

              {isInKitchen(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateStatus(selectedOrder.id, 'Ready for Pickup');
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs font-semibold shadow-1 flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-lg p-6 shadow-3 border border-ink-200 space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-ink-900">Accept Order & Set Prep Time</h3>
              <p className="text-xs text-ink-500 mt-1">
                Order #{acceptModalOrder.id.slice(0, 8)} · {acceptModalOrder.customer_name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-700">Estimated Cooking / Prep Time</label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 25, 35].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setPrepMinutes(mins)}
                    className={`py-2 px-3 rounded-sm border text-xs font-bold transition-all cursor-pointer ${
                      prepMinutes === mins
                        ? 'border-ink-900 bg-ink-900 text-white shadow-1'
                        : 'border-ink-200 text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
              <button
                type="button"
                onClick={() => setAcceptModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100 rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptSubmit}
                className="px-4 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-sm shadow-1 cursor-pointer"
              >
                Confirm & Start Kitchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL WITH REASON */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-lg p-6 shadow-3 border border-ink-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Warning size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-900">Decline Order</h3>
                <p className="text-xs text-ink-500">
                  Order #{rejectModalOrder.id.slice(0, 8)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-700">Reason for Declining</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 text-xs rounded-sm border border-ink-200 bg-ink-50 text-ink-800 focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="Kitchen at maximum capacity">Kitchen at maximum capacity</option>
                <option value="Key ingredient out of stock">Key ingredient out of stock</option>
                <option value="Store closing early">Store closing early</option>
                <option value="Item temporarily unavailable">Item temporarily unavailable</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100 rounded-sm"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-sm shadow-1"
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
