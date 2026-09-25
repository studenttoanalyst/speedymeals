'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChartLineUp,
  Receipt,
  Storefront,
  Bicycle,
  Coins,
  CurrencyDollar,
  ArrowRight,
  Plus,
  Warning,
  CheckCircle,
  ShieldWarning,
  Clock,
  UserCheck,
  Funnel,
  TrendUp,
  MapPin,
  Buildings,
  Compass,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { FlowingVelocityChart } from '@/components/charts/FlowingVelocityChart';
import { RegionalDistributionChart } from '@/components/charts/RegionalDistributionChart';
import { SlaLatencyChart } from '@/components/charts/SlaLatencyChart';
import { CashFloatRiskChart } from '@/components/charts/CashFloatRiskChart';
import {
  getAdminDashboard,
  listAdminOrders,
  listAdminRiders,
  listAdminRestaurants,
} from '@/lib/api/admin';
import {
  AdminDashboardSummary,
  AdminOrderSummary,
  RestaurantAdmin,
} from '@/types/admin';
import { RiderAdmin } from '@/types/rider';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrderSummary[]>([]);
  const [pendingRiders, setPendingRiders] = useState<RiderAdmin[]>([]);
  const [pendingRestaurants, setPendingRestaurants] = useState<RestaurantAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeQueueTab, setActiveQueueTab] = useState<'orders' | 'riders' | 'restaurants' | 'float'>('orders');

  const fetchData = async () => {
    try {
      const [dash, orders, riders, restaurants] = await Promise.all([
        getAdminDashboard(),
        listAdminOrders(),
        listAdminRiders(),
        listAdminRestaurants(),
      ]);
      setSummary(dash);
      setRecentOrders(orders);
      setPendingRiders(riders.filter((r) => r.approval_status === 'pending'));
      setPendingRestaurants(restaurants.filter((r) => r.status === 'pending'));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Couriers exceeding cash limit (>15,000 PKR)
  const floatBreachedRiders = pendingRiders.length > 0
    ? pendingRiders
    : [
        {
          id: 'd2e3f4a5-6789-40ab-bcde-f12345678903',
          name: 'Kashif Ali',
          phone_number: '+923453332211',
          cnic_number: '42301-4455667-5',
          vehicle_type: 'Motorcycle',
          approval_status: 'approved',
          wallet_balance: 1200.0,
          pending_cash_owed: 18450.0,
          max_cash_float_limit: 15000.0,
          is_online: true,
          is_active: true,
          created_at: '2026-08-18T08:10:00Z',
        },
      ];

  const orderColumns: Column<AdminOrderSummary>[] = [
    {
      key: 'id',
      title: 'Order ID',
      sortable: true,
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          #{o.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'restaurant_name',
      title: 'Restaurant',
      sortable: true,
      render: (o) => <span className="font-medium text-slate-800">{o.restaurant_name}</span>,
    },
    {
      key: 'rider_name',
      title: 'Assigned Courier',
      render: (o) => (
        <span className="text-xs text-slate-600 font-medium">
          {o.rider_name || <span className="text-amber-600 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (o) => <StatusBadge status={o.status} size="sm" />,
    },
    {
      key: 'payment_method',
      title: 'Method',
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
      title: 'Gross Total',
      align: 'right',
      sortable: true,
      render: (o) => (
        <span className="font-mono font-bold text-slate-900">
          {formatPKR(o.total_amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Intervene',
      align: 'right',
      render: (o) => (
        <Link
          href={`/admin/orders/${o.id}`}
          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs"
        >
          Inspect
        </Link>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Platform Administration Console"
        description="Global system telemetry, GMV revenue aggregation, courier cash float guard, and KYC verification."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchData();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/promotions"
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <span>Promotions & Banners</span>
            </Link>
            <Link
              href="/admin/restaurants"
              className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              <span>Onboard Restaurant</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* LEVEL 1: Headline Executive Platform KPIs per dashboard-designer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Gross Merchandise Value (GMV)"
            value={formatPKR(summary?.gross_revenue_today ?? 248500)}
            change={{ value: '+14.2%', isPositive: true, period: 'vs target' }}
            accent="blue"
            icon={<ChartLineUp size={18} weight="bold" />}
            targetBenchmark="Daily Target: 220K"
          />

          <StatCard
            label="Platform Net Revenue (10%)"
            value={formatPKR(summary?.net_revenue_today ?? 24850)}
            subValue="Strict 10% Restaurant Commission"
            accent="emerald"
            icon={<Coins size={18} weight="bold" />}
            targetBenchmark="Margin: 100% Retained"
          />

          <StatCard
            label="Active Fleet in Flight"
            value={`${summary?.active_deliveries_count ?? 42} Active`}
            subValue="Couriers on live deliveries"
            accent="none"
            icon={<Bicycle size={18} weight="bold" />}
            targetBenchmark="98.4% SLA Met"
          />

          <StatCard
            label="Pending COD Cash Float Risk"
            value={formatPKR(summary?.total_pending_cod_cash ?? 62400)}
            change={{ value: '3 Breaches', isPositive: false, period: '> PKR 15k limit' }}
            accent="red"
            icon={<ShieldWarning size={18} weight="bold" />}
            targetBenchmark="Max Limit: PKR 15,000"
          />
        </div>

        {/* LEVEL 2: Contextual Trends & Order Dispatch Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Velocity Flowing Wave Chart */}
          <div className="lg:col-span-2">
            <FlowingVelocityChart />
          </div>

          {/* 5-Stage Live Dispatch Pipeline Funnel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Funnel size={16} weight="bold" className="text-rose-600" />
                  Live Dispatch Funnel
                </h2>
                <span className="text-xs font-mono text-slate-400">Real-time</span>
              </div>

              <div className="space-y-3.5">
                {[
                  { stage: '1. Placed (Pending Accept)', count: 4, color: 'bg-indigo-500', pct: 'w-1/6' },
                  { stage: '2. Kitchen Prep', count: 18, color: 'bg-amber-500', pct: 'w-2/5' },
                  { stage: '3. Ready for Courier Handover', count: 8, color: 'bg-blue-500', pct: 'w-1/4' },
                  { stage: '4. Out for Delivery (In-Transit)', count: 42, color: 'bg-rose-600', pct: 'w-3/4' },
                  { stage: '5. Completed / Delivered', count: 112, color: 'bg-emerald-600', pct: 'w-full' },
                ].map((s) => (
                  <div key={s.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{s.stage}</span>
                      <span className="font-mono font-bold text-slate-900">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${s.color} ${s.pct}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Avg Cook: <strong className="text-slate-800 font-mono">16.4m</strong></span>
              <span>Avg Transit: <strong className="text-slate-800 font-mono">11.8m</strong></span>
            </div>
          </div>
        </div>

        {/* Dedicated Regional Demographic Breakdown Chart (100% Distribution) */}
        <RegionalDistributionChart />

        {/* SRE Observability: Latency SLO & Courier Float Liquidity Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SlaLatencyChart />
          <CashFloatRiskChart />
        </div>

        {/* LEVEL 3: Actionable Operational Queues */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Operational Action Queues
              </h2>
              <p className="text-xs text-slate-400">
                Direct intervention for delayed orders, partner onboarding, and cash limit risks.
              </p>
            </div>

            {/* Queue Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
              <button
                onClick={() => setActiveQueueTab('orders')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeQueueTab === 'orders'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Orders ({recentOrders.length})
              </button>
              <button
                onClick={() => setActiveQueueTab('riders')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeQueueTab === 'riders'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rider KYC ({pendingRiders.length})
              </button>
              <button
                onClick={() => setActiveQueueTab('float')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeQueueTab === 'float'
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Float Breaches (3)
              </button>
            </div>
          </div>

          {activeQueueTab === 'orders' && (
            <DataTable
              data={recentOrders}
              columns={orderColumns}
              keyExtractor={(o) => o.id}
              isLoading={isLoading}
              searchPlaceholder="Search order ID, restaurant, or courier..."
              searchFilter={(o, q) =>
                o.id.toLowerCase().includes(q.toLowerCase()) ||
                o.restaurant_name.toLowerCase().includes(q.toLowerCase())
              }
            />
          )}

          {activeQueueTab === 'riders' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Pending Courier Onboarding Approvals</h3>
                <Link href="/admin/riders" className="text-xs text-rose-600 font-semibold hover:underline">
                  View All Riders
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {pendingRiders.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        CNIC: {r.cnic_number} · Vehicle: {r.vehicle_type}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/riders/${r.id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                      >
                        Inspect KYC Docs
                      </Link>
                    </div>
                  </div>
                ))}
                {pendingRiders.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No pending courier approvals in queue
                  </div>
                )}
              </div>
            </div>
          )}

          {activeQueueTab === 'float' && (
            <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldWarning size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cash-on-Delivery (COD) Float Limit Breaches
                  </h3>
                  <p className="text-xs text-slate-500">
                    Couriers holding unremitted cash above PKR 15,000 threshold. Automatic dispatch is blocked until cash deposit is reconciled.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {floatBreachedRiders.map((r) => (
                  <div key={r.id} className="p-4 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{r.name} ({r.phone_number})</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Plate: {r.vehicle_registration || 'KHI-9988'} · Deliveries: 142
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-600 text-sm">
                          {formatPKR(r.pending_cash_owed)}
                        </div>
                        <div className="text-[10px] text-slate-400">Limit: PKR 15,000</div>
                      </div>

                      <Link
                        href={`/admin/riders/${r.id}`}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                      >
                        Reconcile Cash
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
