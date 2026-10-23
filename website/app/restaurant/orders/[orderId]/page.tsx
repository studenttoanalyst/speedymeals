'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  MapPin,
  Note,
  Printer,
  Check,
  Clock,
  User,
  Phone,
  Bicycle,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getRestaurantOrder, updateRestaurantOrderStatus } from '@/lib/api/restaurant';
import { RestaurantOrderDetail } from '@/types/restaurant';
import { isInKitchen, isNewOrder } from '@/lib/orders/status';

export default function RestaurantOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<RestaurantOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const data = await getRestaurantOrder(resolvedParams.orderId);
      setOrder(data);
    } catch (err) {
      console.error('Failed to load order', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [resolvedParams.orderId]);

  const handleAdvanceStatus = async (nextStatus: string) => {
    if (!order) return;
    try {
      const updated = await updateRestaurantOrderStatus(order.id, nextStatus);
      setOrder(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar
        title={`Kitchen Ticket #${resolvedParams.orderId.slice(0, 8)}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 rounded-sm shadow-1 flex items-center gap-1.5"
            >
              <Printer size={14} weight="bold" />
              <span>Print Ticket</span>
            </button>
            <Link
              href="/restaurant/orders"
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 rounded-sm shadow-1 flex items-center gap-1.5"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Back to Board</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
        {isLoading ? (
          <div className="bg-white border border-ink-200 rounded-md p-8 animate-pulse space-y-4">
            <div className="h-6 bg-ink-100 rounded w-1/3" />
            <div className="h-4 bg-ink-100 rounded w-1/2" />
          </div>
        ) : order ? (
          <div className="space-y-5">
            {/* Header Ticket Summary */}
            <div className="p-5 bg-white border border-ink-200 rounded-md shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-ink-900">
                    Customer: {order.customer_name}
                  </h2>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {order.payment_method}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-1 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Placed: {new Date(order.placed_at).toLocaleTimeString()}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={order.status} />
              </div>
            </div>

            {/* Special Instructions Alert */}
            {order.special_instructions && (
              <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Note size={15} weight="bold" />
                  <span>Special Kitchen Instructions:</span>
                </div>
                <p className="font-medium text-amber-800 leading-relaxed">
                  {order.special_instructions}
                </p>
              </div>
            )}

            {/* Food Ticket Items */}
            <div className="bg-white border border-ink-200 rounded-md overflow-hidden shadow-1">
              <div className="p-4 bg-ink-50/75 border-b border-ink-200 font-bold text-xs uppercase tracking-wider text-ink-600">
                Itemized Dishes
              </div>

              <div className="divide-y divide-ink-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-md bg-red-50 text-red-700 font-bold text-xs flex items-center justify-center">
                        {item.quantity}x
                      </span>
                      <div>
                        <div className="font-bold text-ink-900">{item.name}</div>
                        {item.selected_variant && (
                          <div className="text-2xs text-ink-400 font-mono mt-0.5">
                            Modifier: {item.selected_variant}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-ink-800">
                      {formatPKR(item.price_at_order * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Calculation */}
              <div className="p-5 bg-ink-50/50 border-t border-ink-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-600">
                  <span>Food Merchandise Total</span>
                  <span className="font-mono">{formatPKR(order.food_subtotal)}</span>
                </div>
                {(order.gst_amount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-ink-600">
                    <span>
                      GST ({order.gst_rate}%) {order.prices_include_gst ? '(included in prices)' : '(added to bill)'}
                    </span>
                    <span className="font-mono">{formatPKR(order.gst_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-red-600">
                  <span>Platform Commission ({order.commission_rate ?? (order.net_subtotal && order.commission_amount ? Math.round((order.commission_amount / order.net_subtotal) * 100) : (order.food_subtotal && order.commission_amount ? Math.round((order.commission_amount / order.food_subtotal) * 100) : 10))}%)</span>
                  <span className="font-mono">−{formatPKR(order.commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-900 font-bold pt-3 border-t border-ink-200 text-sm">
                  <span>Net Merchant Share</span>
                  <span className="font-mono text-green-700 text-base">
                    {formatPKR(order.restaurant_payable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rider Dispatch Card */}
            <div className="p-4 bg-white border border-ink-200 rounded-md shadow-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bicycle size={20} weight="bold" />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink-900">Assigned Rider: Tariq Mahmood</div>
                  <div className="text-2xs text-ink-400 font-mono">Motorcycle (KHI-7890) · Proximity: 1.2 km</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xs border border-blue-200">
                Dispatch Active
              </span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {isNewOrder(order.status) && (
                <button
                  onClick={() => handleAdvanceStatus('Preparing')}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-sm text-xs font-semibold shadow-1 cursor-pointer"
                >
                  Accept Order & Start Prep ({order.prep_time_minutes || 20}m)
                </button>
              )}

              {isInKitchen(order.status) && (
                <button
                  onClick={() => handleAdvanceStatus('Ready for Pickup')}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs font-semibold shadow-1 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} weight="bold" />
                  <span>Mark Ready for Pickup</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
