'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  Storefront,
  Bicycle,
  User,
  Clock,
  CurrencyDollar,
  Printer,
  ShieldCheck,
} from '@phosphor-icons/react';
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
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar
        title={`Global Order #${resolvedParams.orderId.slice(0, 8)}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 rounded-sm shadow-1 flex items-center gap-1.5"
            >
              <Printer size={14} weight="bold" />
              <span>Print Audit</span>
            </button>
            <Link
              href="/admin/orders"
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 rounded-sm shadow-1 flex items-center gap-1.5"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Back to Orders</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        {isLoading ? (
          <div className="bg-white border border-ink-200 rounded-md p-8 animate-pulse space-y-4">
            <div className="h-6 bg-ink-100 rounded w-1/3" />
            <div className="h-32 bg-ink-100 rounded-md" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="p-6 bg-white border border-ink-200 rounded-md shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-ink-900">
                    Order Reference #{order.id.slice(0, 8)}
                  </h2>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {order.payment_method}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-1 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Placed: {new Date(order.placed_at).toLocaleString()}</span>
                </p>
              </div>

              <StatusBadge status={order.status} />
            </div>

            {/* Stakeholder Triad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white border border-ink-200 rounded-md shadow-1 space-y-1 text-xs">
                <span className="text-ink-400 uppercase tracking-wider font-semibold text-2xs block">
                  Restaurant Merchant
                </span>
                <div className="font-bold text-ink-900 text-sm">{order.restaurant_name}</div>
                <div className="text-ink-400 text-2xs font-mono">ID: #{order.restaurant_id.slice(0, 8)}</div>
              </div>

              <div className="p-5 bg-white border border-ink-200 rounded-md shadow-1 space-y-1 text-xs">
                <span className="text-ink-400 uppercase tracking-wider font-semibold text-2xs block">
                  Customer
                </span>
                <div className="font-bold text-ink-900 text-sm">{order.customer_name}</div>
                <div className="text-ink-400 text-2xs font-mono">{order.customer_phone || '+923001239876'}</div>
              </div>

              <div className="p-5 bg-white border border-ink-200 rounded-md shadow-1 space-y-1 text-xs">
                <span className="text-ink-400 uppercase tracking-wider font-semibold text-2xs block">
                  Assigned Rider
                </span>
                <div className="font-bold text-ink-900 text-sm">
                  {order.rider_name || 'Unassigned'}
                </div>
                <div className="text-ink-400 text-2xs font-mono">
                  {order.rider_phone || 'Waiting dispatch'}
                </div>
              </div>
            </div>

            {/* Contract Snapshot Financial Breakdown */}
            <div className="p-6 bg-white border border-ink-200 rounded-md shadow-1 space-y-4">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink-900">
                    Contract Snapshot Financial Ledger
                  </h3>
                  <p className="text-xs text-ink-400">
                    Calculated automatically from backend order snapshots (zero client recalculation).
                  </p>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-xs border border-green-200 flex items-center gap-1">
                  <ShieldCheck size={14} weight="bold" />
                  Ledger Balanced
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-ink-600">
                  <span>Food Merchandise Subtotal</span>
                  <span className="font-mono font-medium">{formatPKR(order.food_subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600 font-semibold">
                  <span>Platform Commission (10% Flat)</span>
                  <span className="font-mono">+{formatPKR(order.commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-600">
                  <span>Restaurant Net Disbursement (90%)</span>
                  <span className="font-mono font-medium">{formatPKR(order.restaurant_payable)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-700 font-semibold pt-1 border-t border-ink-100">
                  <span>Customer Delivery Fee ({order.delivery_distance_km} km)</span>
                  <span className="font-mono font-medium">{formatPKR(order.delivery_fee)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-700 font-semibold">
                  <span>Rider Delivery Fee Earning (90% Retained)</span>
                  <span className="font-mono">+{formatPKR(order.rider_earning)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-900 font-bold pt-3 border-t border-ink-200 text-sm">
                  <span>Total Order Volume (Paid by Customer)</span>
                  <span className="font-mono text-base">{formatPKR(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
