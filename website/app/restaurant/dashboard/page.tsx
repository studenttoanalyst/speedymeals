'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Receipt,
  ForkKnife,
  Coins,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  listRestaurantOrders,
  getRestaurantMetrics,
  updateRestaurantOrderStatus,
} from '@/lib/api/restaurant';
import { RestaurantDashboardMetrics, RestaurantOrderSummary } from '@/types/restaurant';

export default function RestaurantDashboardPage() {
  const [metrics, setMetrics] = useState<RestaurantDashboardMetrics | null>(null);
  const [orders, setOrders] = useState<RestaurantOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [m, o] = await Promise.all([
        getRestaurantMetrics(),
        listRestaurantOrders(),
      ]);
      setMetrics(m);
      setOrders(o);
    } catch (err) {
      console.error('Failed to load restaurant dashboard data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = '';
    if (currentStatus === 'Accepted') nextStatus = 'Preparing';
    else if (currentStatus === 'Preparing') nextStatus = 'Ready for Pickup';
    else return;

    try {
      await updateRestaurantOrderStatus(orderId, nextStatus);
      await fetchData();
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
        title="Kitchen Dispatch Console"
        description="Incoming orders queue, prep timer management, and daily turnover stats."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchData();
        }}
        isRefreshing={isRefreshing}
        actions={
          <Link
            href="/restaurant/menu"
            className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <Plus size={14} weight="bold" />
            <span>Manage Menu</span>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Kitchen Orders"
            value={metrics?.active_orders_count ?? 0}
            subValue="Accepted or Preparing"
            accent="red"
            icon={<Clock size={18} />}
          />
          <StatCard
            label="Today's Orders"
            value={metrics?.today_orders_count ?? 0}
            subValue="Completed today"
            accent="blue"
            icon={<Receipt size={18} />}
          />
          <StatCard
            label="Today's Gross Sales"
            value={formatPKR(metrics?.today_sales_gross)}
            subValue="Food sales total"
            accent="tan"
            icon={<Coins size={18} />}
          />
          <StatCard
            label="Est. Pending Settlement"
            value={formatPKR(metrics?.pending_settlement_estimate)}
            subValue="90% net after commission"
            icon={<CheckCircle size={18} />}
          />
        </div>

        {/* Live Orders List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-red" />
              <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wide">
                Live Kitchen Dispatch Queue
              </h2>
            </div>
            <Link
              href="/restaurant/orders"
              className="font-mono text-xs text-red hover:underline flex items-center gap-1"
            >
              <span>Full Order Terminal</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <DataTable<RestaurantOrderSummary>
            data={orders}
            keyExtractor={(o) => o.id}
            isLoading={isLoading}
            pageSize={6}
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
                title: 'Customer',
                render: (o) => (
                  <div className="font-sans text-xs font-semibold text-ink">
                    {o.customer_name}
                  </div>
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
                render: (o) => (
                  <span className="font-mono text-xs font-semibold text-ink">
                    {formatPKR(o.food_subtotal)}
                  </span>
                ),
              },
              {
                key: 'placed_at',
                title: 'Received',
                render: (o) => (
                  <span className="font-mono text-xs text-ink-soft">
                    {new Date(o.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ),
              },
              {
                key: 'action',
                title: 'Advance State Machine',
                align: 'right',
                render: (o) => (
                  <div>
                    {o.status === 'Accepted' && (
                      <button
                        onClick={() => handleAdvanceStatus(o.id, o.status)}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold border border-[#F1DC9B] bg-[#FDF6E2] text-[#8C6D1F] hover:bg-[#F9EDC7] transition-colors"
                        style={{ borderRadius: '0px' }}
                      >
                        Start Preparing →
                      </button>
                    )}
                    {o.status === 'Preparing' && (
                      <button
                        onClick={() => handleAdvanceStatus(o.id, o.status)}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold border border-[#BAD6F0] bg-[#EAF3FA] text-[#1E5FA8] hover:bg-[#D5E6F5] transition-colors"
                        style={{ borderRadius: '0px' }}
                      >
                        Ready for Pickup →
                      </button>
                    )}
                    {o.status === 'Ready for Pickup' && (
                      <span className="font-mono text-[11px] text-[#1E5FA8] font-semibold">
                        Awaiting Courier
                      </span>
                    )}
                    {['On the Way', 'Delivered'].includes(o.status) && (
                      <span className="font-mono text-[11px] text-[#1E7E34]">
                        En Route / Handed Over
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
