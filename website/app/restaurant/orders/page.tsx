'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Clock,
  CheckCircle,
  X,
  MapPin,
  Note,
  ForkKnife,
  Bicycle,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
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

  const handleRowClick = async (o: RestaurantOrderSummary) => {
    try {
      const detail = await getRestaurantOrder(o.id);
      setSelectedOrder(detail);
    } catch (err) {
      console.error('Failed to load order detail', err);
    }
  };

  const handleAdvanceStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      const updated = await updateRestaurantOrderStatus(selectedOrder.id, newStatus);
      setSelectedOrder(updated);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Kitchen Orders Terminal"
        description="Inspect itemized tickets, kitchen preparation notes, and hand over to assigned couriers."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchOrders();
        }}
        isRefreshing={isRefreshing}
      />

      <div className="p-6">
        <DataTable<RestaurantOrderSummary>
          data={orders}
          keyExtractor={(o) => o.id}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          searchPlaceholder="Search orders by customer or ID..."
          searchFilter={(o, q) =>
            o.customer_name.toLowerCase().includes(q.toLowerCase()) ||
            o.id.toLowerCase().includes(q.toLowerCase())
          }
          filterOptions={[
            { label: 'Kitchen Queue', value: 'kitchen', filterFn: (o) => ['Accepted', 'Preparing'].includes(o.status) },
            { label: 'Ready for Pickup', value: 'ready', filterFn: (o) => o.status === 'Ready for Pickup' },
            { label: 'Completed', value: 'delivered', filterFn: (o) => o.status === 'Delivered' },
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
              key: 'customer_name',
              title: 'Customer Name',
              render: (o) => (
                <span className="font-sans text-xs font-bold text-ink">
                  {o.customer_name}
                </span>
              ),
            },
            {
              key: 'status',
              title: 'Current Status',
              render: (o) => <StatusBadge status={o.status} size="sm" />,
            },
            {
              key: 'food_subtotal',
              title: 'Food Subtotal',
              align: 'right',
              sortable: true,
              render: (o) => (
                <span className="font-mono text-xs font-semibold text-ink">
                  {formatPKR(o.food_subtotal)}
                </span>
              ),
            },
            {
              key: 'placed_at',
              title: 'Received At',
              render: (o) => (
                <span className="font-mono text-xs text-ink-soft">
                  {new Date(o.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Order Detail Drawer */}
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
                    Kitchen Ticket #{selectedOrder.id.slice(0, 8)}
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

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-3 border border-line bg-paper-off/50">
                  <StatusBadge status={selectedOrder.status} />
                  <span className="font-mono text-xs text-ink-soft">
                    {new Date(selectedOrder.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Itemized Kitchen Lines */}
                <div className="border border-line bg-paper divide-y divide-line">
                  <div className="p-3 font-mono text-[11px] font-bold text-ink uppercase tracking-wider bg-paper-off/40">
                    Ordered Dishes
                  </div>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-ink">
                          <span className="font-mono text-red font-bold mr-2">{item.quantity}x</span>
                          {item.name}
                        </div>
                        {item.selected_variant && (
                          <div className="text-[11px] font-mono text-ink-soft mt-0.5">
                            Variant: {item.selected_variant}
                          </div>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-ink">
                        {formatPKR(item.price_at_order * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="p-3 bg-paper-off/30 flex justify-between font-mono text-xs font-bold text-ink">
                    <span>Kitchen Food Total</span>
                    <span>{formatPKR(selectedOrder.food_subtotal)}</span>
                  </div>
                </div>

                {/* Special Instructions */}
                {selectedOrder.special_instructions && (
                  <div className="p-3 border border-line bg-[#FDF6E2] text-xs space-y-1">
                    <div className="font-mono text-[10px] uppercase font-bold text-[#8C6D1F] flex items-center gap-1">
                      <Note size={12} />
                      <span>Customer Kitchen Note</span>
                    </div>
                    <p className="font-sans text-ink font-medium">
                      {selectedOrder.special_instructions}
                    </p>
                  </div>
                )}

                {/* Delivery Information */}
                {selectedOrder.delivery_address && (
                  <div className="p-4 border border-line bg-paper space-y-1.5 text-xs">
                    <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold flex items-center gap-1">
                      <MapPin size={12} />
                      <span>Destination</span>
                    </div>
                    <div className="font-medium text-ink">
                      {selectedOrder.delivery_address.full_address}
                    </div>
                    <div className="font-mono text-[11px] text-ink-soft">
                      Road Distance: {selectedOrder.delivery_distance_km} km
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* State Machine Transition Actions */}
            <div className="p-4 border-t border-line bg-paper">
              {selectedOrder.status === 'Accepted' && (
                <button
                  onClick={() => handleAdvanceStatus('Preparing')}
                  className="w-full py-2.5 font-mono text-xs font-semibold uppercase tracking-wider bg-ink text-paper hover:bg-ink-soft transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  Start Preparing Ticket →
                </button>
              )}

              {selectedOrder.status === 'Preparing' && (
                <div className="space-y-1">
                  <button
                    onClick={() => handleAdvanceStatus('Ready for Pickup')}
                    className="w-full py-2.5 font-mono text-xs font-semibold uppercase tracking-wider bg-red text-paper hover:bg-[#C92A2E] transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    Mark Ready for Pickup (Dispatch Rider) →
                  </button>
                  <p className="font-mono text-[10px] text-ink-soft text-center">
                    Trigger: Automatically assigns nearest available courier via GPS haversine match.
                  </p>
                </div>
              )}

              {['Ready for Pickup', 'Rider Assigned'].includes(selectedOrder.status) && (
                <div className="p-3 border border-line bg-paper-off text-center font-mono text-xs text-[#1E5FA8] font-semibold">
                  Food Prepared. Courier assigned & en route to kitchen.
                </div>
              )}

              {['On the Way', 'Delivered'].includes(selectedOrder.status) && (
                <div className="p-3 border border-line bg-[#EBF7EE] text-center font-mono text-xs text-[#1E7E34] font-semibold">
                  Ticket Dispatched to Customer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
