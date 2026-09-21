'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, Storefront, Bicycle, MapPin, CurrencyDollar } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getAdminOrder } from '@/lib/api/admin';
import { AdminOrderDetail } from '@/types/admin';

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getAdminOrder(resolvedParams.orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [resolvedParams.orderId]);

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title={`Order #${resolvedParams.orderId.slice(0, 8)}`}
        description="Detailed ledger audit view and delivery parameters."
        actions={
          <Link
            href="/admin/orders"
            className="px-3 py-1.5 font-mono text-xs font-semibold border border-line bg-paper hover:bg-paper-off text-ink transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Orders</span>
          </Link>
        }
      />

      <div className="p-6 max-w-3xl space-y-6">
        {isLoading ? (
          <div className="p-8 border border-line bg-paper animate-pulse space-y-4">
            <div className="h-6 bg-line/50 w-1/3" />
            <div className="h-4 bg-line/50 w-1/2" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-line bg-paper">
              <div className="flex items-center gap-3">
                <Receipt size={24} className="text-red" />
                <div>
                  <h2 className="font-heading font-bold text-base text-ink">
                    Order Tracking Reference
                  </h2>
                  <p className="font-mono text-xs text-ink-soft">
                    Placed: {new Date(order.placed_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-line bg-paper space-y-1">
                <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">Restaurant</div>
                <div className="font-heading font-bold text-sm text-ink">{order.restaurant_name}</div>
              </div>
              <div className="p-4 border border-line bg-paper space-y-1">
                <div className="font-mono text-[10px] text-ink-soft uppercase font-semibold">Assigned Courier</div>
                <div className="font-heading font-bold text-sm text-ink">
                  {order.rider_name || 'Unassigned'}
                </div>
              </div>
            </div>

            {/* Money Audit Card */}
            <div className="border border-line bg-paper p-5 space-y-3">
              <div className="font-mono text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                Contract Snapshot Breakdown
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between text-ink-soft">
                  <span>Food Subtotal</span>
                  <span className="text-ink">{formatPKR(order.food_subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Delivery Fee ({order.delivery_distance_km} km)</span>
                  <span className="text-ink">{formatPKR(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-ink pt-2 border-t border-line">
                  <span>Customer Total ({order.payment_method})</span>
                  <span>{formatPKR(order.total_amount)}</span>
                </div>
                <div className="pt-2 border-t border-dashed border-line space-y-1.5 text-xs">
                  <div className="flex justify-between text-red font-semibold">
                    <span>SpeedyMeals Commission (10%)</span>
                    <span>{formatPKR(order.commission_amount)}</span>
                  </div>
                  <div className="flex justify-between text-ink font-semibold">
                    <span>Restaurant Payable (90%)</span>
                    <span>{formatPKR(order.restaurant_payable)}</span>
                  </div>
                  <div className="flex justify-between text-[#1E7E34] font-semibold">
                    <span>Rider Earnings (100% Fee)</span>
                    <span>{formatPKR(order.rider_earning)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-sans text-ink-soft border border-line bg-paper">
            Order not found.
          </div>
        )}
      </div>
    </div>
  );
}
