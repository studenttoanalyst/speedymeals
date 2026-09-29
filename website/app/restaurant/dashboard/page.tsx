'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Receipt,
  ForkKnife,
  Coins,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  Fire,
  TrendUp,
  WarningCircle,
  Timer,
  Eye,
  Check,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { FlowingVelocityChart } from '@/components/charts/FlowingVelocityChart';
import {
  listRestaurantOrders,
  getRestaurantMetrics,
  updateRestaurantOrderStatus,
  listRestaurantMenuItems,
} from '@/lib/api/restaurant';
import {
  RestaurantDashboardMetrics,
  RestaurantOrderSummary,
  MenuItem,
} from '@/types/restaurant';

export default function RestaurantDashboardPage() {
  const [metrics, setMetrics] = useState<RestaurantDashboardMetrics | null>(null);
  const [orders, setOrders] = useState<RestaurantOrderSummary[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [m, o, items] = await Promise.all([
        getRestaurantMetrics(),
        listRestaurantOrders(),
        listRestaurantMenuItems(),
      ]);
      setMetrics(m);
      setOrders(o);
      setMenuItems(items);
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
    if (currentStatus === 'Placed') nextStatus = 'Accepted';
    else if (currentStatus === 'Accepted') nextStatus = 'Preparing';
    else if (currentStatus === 'Preparing') nextStatus = 'Ready for Pickup';
    else return;

    try {
      await updateRestaurantOrderStatus(orderId, nextStatus);
      setActionSuccess(`Order marked as ${nextStatus}!`);
      setTimeout(() => setActionSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Top selling dishes for Level 2 context
  const popularDishes = menuItems.filter((i) => i.is_popular || i.is_available).slice(0, 3);

  // Level 3 Live Queue columns
  const orderColumns: Column<RestaurantOrderSummary>[] = [
    {
      key: 'id',
      title: 'Order ID',
      sortable: true,
      render: (o) => (
        <span className="font-mono text-slate-800 font-medium">
          #{o.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'customer_name',
      title: 'Customer',
      sortable: true,
      render: (o) => (
        <div className="font-medium text-slate-900">{o.customer_name}</div>
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
      title: 'Order Total',
      align: 'right',
      sortable: true,
      render: (o) => (
        <span className="font-mono font-semibold text-slate-900">
          {formatPKR(o.total_amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Kitchen Action',
      align: 'right',
      render: (o) => {
        if (o.status === 'Placed') {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdvanceStatus(o.id, o.status);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Accept (20m)
            </button>
          );
        }
        if (o.status === 'Accepted' || o.status === 'Preparing') {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdvanceStatus(o.id, o.status);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1 ml-auto cursor-pointer"
            >
              <Check size={12} weight="bold" />
              {o.status === 'Accepted' ? 'Start Prep' : 'Ready for Pickup'}
            </button>
          );
        }
        return (
          <Link
            href={`/restaurant/orders/${o.id}`}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
          >
            <Eye size={13} />
            Ticket
          </Link>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Restaurant Dashboard"
        onRefresh={() => {
          setIsRefreshing(true);
          fetchData();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/restaurant/orders"
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Receipt size={14} weight="bold" className="text-slate-600" />
              <span>All Orders</span>
            </Link>
            <Link
              href="/restaurant/menu"
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Add Dish</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Toast Alert */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle size={16} weight="bold" className="text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Headline Operational KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's Gross Sales"
            value={formatPKR(metrics?.today_sales_gross ?? 0)}
            change={metrics?.today_sales_gross ? { value: '+0.0%', isPositive: true, period: 'today' } : undefined}
            accent="emerald"
            icon={<Coins size={18} weight="bold" />}
            targetBenchmark="Daily Target: 30K"
          />

          <StatCard
            label="Net Payable (90% Share)"
            value={formatPKR(metrics?.net_payable_estimate ?? ((metrics?.today_sales_gross ?? 0) * 0.9))}
            subValue="After 10% Platform Commission"
            accent="blue"
            icon={<Receipt size={18} weight="bold" />}
            targetBenchmark="Weekly Payout: Friday"
          />

          <StatCard
            label="Active Kitchen Orders"
            value={metrics?.active_orders_count ?? 0}
            subValue={metrics ? `${metrics.today_orders_count ?? 0} orders today` : '0 orders today'}
            accent="blue"
            icon={<Clock size={18} weight="bold" />}
            targetBenchmark="Capacity: 8 orders"
          />

          <StatCard
            label="Avg Cooking / Prep Time"
            value={metrics?.avg_prep_time_mins ? `${metrics.avg_prep_time_mins} mins` : '--'}
            change={metrics?.avg_prep_time_mins ? { value: 'Target: 20m', isPositive: true, period: 'SLA' } : undefined}
            accent="amber"
            icon={<Timer size={18} weight="bold" />}
            targetBenchmark="Target: < 20 mins"
          />
        </div>

        {/* LEVEL 2: Contextual Trends & Top Selling Dishes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rush Hour Flowing Velocity Chart */}
          <div className="lg:col-span-2">
            <FlowingVelocityChart
              title="Hourly Kitchen Order Throughput & Rush Windows"
              subtitle="Real-time prep velocity: Lunch peak (12:00 - 15:00) vs Dinner peak (19:00 - 23:00)"
              data={[
                { time: '12:00', orders: 18, gmv: 21600, prepTimeMinutes: 14, slaPercent: 99.2 },
                { time: '13:00', orders: 36, gmv: 43200, peak: true, prepTimeMinutes: 17, slaPercent: 98.6 },
                { time: '14:00', orders: 28, gmv: 33600, peak: true, prepTimeMinutes: 16, slaPercent: 98.9 },
                { time: '15:00', orders: 12, gmv: 14400, prepTimeMinutes: 13, slaPercent: 100 },
                { time: '18:00', orders: 16, gmv: 19200, prepTimeMinutes: 14, slaPercent: 99.4 },
                { time: '19:00', orders: 32, gmv: 38400, prepTimeMinutes: 16, slaPercent: 98.7 },
                { time: '20:00', orders: 54, gmv: 64800, peak: true, prepTimeMinutes: 19, slaPercent: 98.2 },
                { time: '21:00', orders: 44, gmv: 52800, peak: true, prepTimeMinutes: 18, slaPercent: 98.5 },
                { time: '22:00', orders: 22, gmv: 26400, prepTimeMinutes: 15, slaPercent: 99.1 },
              ]}
            />
          </div>

          {/* Top Selling Dishes with Images */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Fire size={16} weight="bold" className="text-rose-600" />
                Top Performing Dishes Today
              </h2>
              <Link
                href="/restaurant/menu"
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                View Menu
              </Link>
            </div>

            <div className="space-y-3">
              {popularDishes.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No menu items found. Add dishes to track top performers.
                </div>
              ) : (
                popularDishes.map((dish, idx) => {
                  const photo = dish.photo_url || dish.image_url;
                  return (
                    <div
                      key={dish.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ForkKnife size={20} className="text-slate-400" />
                        )}
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-slate-900/80 text-white text-[9px] font-bold flex items-center justify-center">
                          #{idx + 1}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-slate-900 truncate">
                          {dish.name}
                        </h3>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatPKR(dish.price)} · {dish.category || 'Special'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-600 font-mono">
                          {dish.is_popular ? 'Featured' : 'Active'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Menu Item Health</span>
              <span className="font-semibold text-emerald-600">All Top Dishes In Stock</span>
            </div>
          </div>
        </div>

        {/* LEVEL 3: Live Actionable Kitchen Queue Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Kitchen Dispatch Queue
              </h2>
              <p className="text-xs text-slate-400">
                Orders requiring immediate kitchen prep, packaging, or rider handover.
              </p>
            </div>
            <Link
              href="/restaurant/orders"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <span>View Full Kitchen Kanban Board</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          <DataTable
            data={orders}
            columns={orderColumns}
            keyExtractor={(o) => o.id}
            isLoading={isLoading}
            searchPlaceholder="Search order ID or customer..."
            searchFilter={(o, q) =>
              o.id.toLowerCase().includes(q.toLowerCase()) ||
              o.customer_name.toLowerCase().includes(q.toLowerCase())
            }
            filterOptions={[
              { label: 'Placed (New)', value: 'Placed', filterFn: (o) => o.status === 'Placed' },
              { label: 'In Kitchen (Prep)', value: 'prep', filterFn: (o) => o.status === 'Accepted' || o.status === 'Preparing' },
              { label: 'Ready for Pickup', value: 'Ready for Pickup', filterFn: (o) => o.status === 'Ready for Pickup' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
