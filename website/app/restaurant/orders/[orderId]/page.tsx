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
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title={`Kitchen Ticket #${resolvedParams.orderId.slice(0, 8)}`}
        description="Detailed prep requirements, customer notes, and courier handover signals."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <Printer size={14} weight="bold" />
              <span>Print Ticket</span>
            </button>
            <Link
              href="/restaurant/orders"
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Back to Board</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        ) : order ? (
          <div className="space-y-5">
            {/* Header Ticket Summary */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-slate-900">
                    Customer: {order.customer_name}
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {order.payment_method}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
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
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
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
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50/75 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-600">
                Itemized Dishes
              </div>

              <div className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center">
                        {item.quantity}x
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.selected_variant && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Modifier: {item.selected_variant}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {formatPKR(item.price_at_order * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Calculation */}
              <div className="p-5 bg-slate-50/50 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Food Merchandise Total</span>
                  <span className="font-mono">{formatPKR(order.food_subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-600">
                  <span>Platform Commission (10%)</span>
                  <span className="font-mono">−{formatPKR(order.commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-bold pt-3 border-t border-slate-200 text-sm">
                  <span>Net Restaurant Share</span>
                  <span className="font-mono text-emerald-700 text-base">
                    {formatPKR(order.restaurant_payable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Courier Dispatch Card */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bicycle size={20} weight="bold" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Assigned Courier: Tariq Mahmood</div>
                  <div className="text-[11px] text-slate-400 font-mono">Motorcycle (KHI-7890) · Proximity: 1.2 km</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Dispatch Active
              </span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {order.status === 'Placed' && (
                <button
                  onClick={() => handleAdvanceStatus('Preparing')}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Accept Order & Start Prep (20m)
                </button>
              )}

              {['Accepted', 'Preparing'].includes(order.status) && (
                <button
                  onClick={() => handleAdvanceStatus('Ready for Pickup')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
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
