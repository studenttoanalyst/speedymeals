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
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getAdminDashboard, listAdminOrders, listAdminRiders } from '@/lib/api/admin';
import { AdminDashboardSummary, AdminOrderSummary } from '@/types/admin';
import { RiderAdmin } from '@/types/rider';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrderSummary[]>([]);
  const [pendingRiders, setPendingRiders] = useState<RiderAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [dash, orders, riders] = await Promise.all([
        getAdminDashboard(),
        listAdminOrders(),
        listAdminRiders('pending'),
      ]);
      setSummary(dash);
      setRecentOrders(orders.slice(0, 5));
      setPendingRiders(riders.slice(0, 5));
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Platform Overview"
        description="Live operational telemetry, revenue aggregation, and pending reconciliation."
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={
          <Link
            href="/admin/restaurants"
            className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <Plus size={14} weight="bold" />
            <span>Onboard Partner</span>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Today's Orders"
            value={summary?.total_orders_today ?? 0}
            subValue="Completed & live"
            accent="red"
            icon={<Receipt size={18} />}
          />
          <StatCard
            label="Gross Merchandise (GMV)"
            value={formatPKR(summary?.gross_revenue_today)}
            subValue="Food + delivery sum"
            accent="blue"
            icon={<ChartLineUp size={18} />}
          />
          <StatCard
            label="Platform Net Revenue"
            value={formatPKR(summary?.net_revenue_today)}
            subValue="Commission + Rs 10 fee"
            accent="tan"
            icon={<CurrencyDollar size={18} />}
          />
          <StatCard
            label="Pending Settlements"
            value={formatPKR(summary?.pending_restaurant_settlements)}
            subValue="Owed to restaurants"
            icon={<Coins size={18} />}
          />
          <StatCard
            label="Rider Wallet Float"
            value={formatPKR(summary?.total_rider_wallet_balance)}
            subValue="Standing deposits"
            icon={<Bicycle size={18} />}
          />
          <StatCard
            label="Pending COD Cash"
            value={formatPKR(summary?.total_pending_cod_cash)}
            subValue="Cash in riders' hands"
            icon={<Coins size={18} />}
          />
        </div>

        {/* Two-Column Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Recent Orders */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-ink-soft" />
                <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wide">
                  Live System Orders
                </h2>
              </div>
              <Link
                href="/admin/orders"
                className="font-mono text-xs text-red hover:underline flex items-center gap-1"
              >
                <span>View all orders</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <DataTable<AdminOrderSummary>
              data={recentOrders}
              keyExtractor={(o) => o.id}
              isLoading={isLoading}
              pageSize={5}
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
                  key: 'restaurant_name',
                  title: 'Restaurant',
                  render: (o) => (
                    <div className="font-sans text-xs font-medium text-ink">
                      {o.restaurant_name}
                    </div>
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
                    <span className="font-mono text-[11px] px-1.5 py-0.5 border border-line bg-paper-off text-ink-soft">
                      {o.payment_method}
                    </span>
                  ),
                },
                {
                  key: 'total_amount',
                  title: 'Total',
                  align: 'right',
                  render: (o) => (
                    <span className="font-mono text-xs font-semibold text-ink">
                      {formatPKR(o.total_amount)}
                    </span>
                  ),
                },
              ]}
            />
          </div>

          {/* Pending Rider Applications & Onboarding Alert */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bicycle size={16} className="text-ink-soft" />
                <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wide">
                  Rider Approvals ({pendingRiders.length})
                </h2>
              </div>
              <Link
                href="/admin/riders"
                className="font-mono text-xs text-red hover:underline flex items-center gap-1"
              >
                <span>Review all</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="bg-paper border border-line p-4 divide-y divide-line">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-12 bg-line/50 animate-pulse" />
                  <div className="h-12 bg-line/50 animate-pulse" />
                </div>
              ) : pendingRiders.length === 0 ? (
                <div className="py-8 text-center text-xs font-sans text-ink-soft">
                  No riders pending document verification.
                </div>
              ) : (
                pendingRiders.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="font-sans text-xs font-bold text-ink">{r.name}</div>
                      <div className="font-mono text-[11px] text-ink-soft">{r.cnic_number}</div>
                      <div className="font-mono text-[10px] text-ink-soft/80">{r.phone_number}</div>
                    </div>
                    <Link
                      href={`/admin/riders`}
                      className="px-2.5 py-1 text-[11px] font-mono font-semibold border border-line bg-paper-off hover:bg-paper text-ink transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      Review
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Platform Quick Links */}
            <div className="bg-paper border border-line p-4 space-y-3">
              <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft border-b border-line pb-2">
                Fast Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/admin/settlements"
                  className="p-2.5 border border-line bg-paper-off hover:bg-paper text-xs font-sans font-medium text-ink transition-colors flex items-center gap-2"
                >
                  <Coins size={14} className="text-tan" />
                  <span>Generate Payouts</span>
                </Link>
                <Link
                  href="/admin/restaurants"
                  className="p-2.5 border border-line bg-paper-off hover:bg-paper text-xs font-sans font-medium text-ink transition-colors flex items-center gap-2"
                >
                  <Storefront size={14} className="text-blue" />
                  <span>Partners List</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
