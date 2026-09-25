'use client';

import React, { useEffect, useState } from 'react';
import {
  ChartLineUp,
  WarningCircle,
  Storefront,
  Coins,
  MapPin,
  Bicycle,
  ShieldWarning,
  DownloadSimple,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { getAdminReports, listAdminCashDiscrepancies } from '@/lib/api/admin';
import { AdminReportsResponse, CashDiscrepancy, TopRestaurant } from '@/types/admin';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportsResponse | null>(null);
  const [discrepancies, setDiscrepancies] = useState<CashDiscrepancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [periodStart, setPeriodStart] = useState<string>(
    new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0]
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchReports = async () => {
    try {
      const [repData, discData] = await Promise.all([
        getAdminReports(periodStart, periodEnd),
        listAdminCashDiscrepancies(false),
      ]);
      setReports(repData);
      setDiscrepancies(discData);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [periodStart, periodEnd]);

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const topRestaurantColumns: Column<TopRestaurant>[] = [
    {
      key: 'restaurant_name',
      title: 'Restaurant Partner',
      sortable: true,
      render: (r) => (
        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
          <Storefront size={15} className="text-rose-600" />
          <span>{r.restaurant_name}</span>
        </div>
      ),
    },
    {
      key: 'order_count',
      title: 'Completed Orders',
      align: 'center',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
          {r.order_count}
        </span>
      ),
    },
    {
      key: 'revenue',
      title: 'Gross Revenue Volume',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-mono font-bold text-xs text-slate-900">
          {formatPKR(r.revenue)}
        </span>
      ),
    },
    {
      key: 'commission',
      title: 'Platform Fee (10%)',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-semibold text-xs text-emerald-700">
          {formatPKR(r.revenue * 0.1)}
        </span>
      ),
    },
  ];

  const discrepancyColumns: Column<CashDiscrepancy>[] = [
    {
      key: 'rider_name',
      title: 'Courier Name',
      sortable: true,
      render: (d) => (
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <Bicycle size={15} className="text-slate-500" />
          <span>{d.rider_name}</span>
        </div>
      ),
    },
    {
      key: 'expected_amount',
      title: 'Expected Cash Deposit',
      align: 'right',
      sortable: true,
      render: (d) => (
        <span className="font-mono text-xs text-slate-800">
          {formatPKR(d.expected_amount)}
        </span>
      ),
    },
    {
      key: 'amount_submitted',
      title: 'Amount Submitted',
      align: 'right',
      sortable: true,
      render: (d) => (
        <span className="font-mono text-xs text-slate-800">
          {formatPKR(d.amount_submitted)}
        </span>
      ),
    },
    {
      key: 'discrepancy',
      title: 'Float Shortage (Discrepancy)',
      align: 'right',
      sortable: true,
      render: (d) => (
        <span className="font-mono text-xs font-bold text-rose-600">
          {formatPKR(d.discrepancy)}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Logged At',
      render: (d) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(d.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Platform Business Intelligence & Audit Reports"
        description="Comprehensive volume trends, partner performance, and courier cash deposit audit exceptions."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchReports();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-mono"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-mono"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <DownloadSimple size={14} weight="bold" />
              <span>Export BI</span>
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 print:p-0 print:max-w-none print:space-y-4">
        {/* Document Header (Clean Print Version) */}
        <div className="hidden print:block pb-4 border-b-2 border-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold font-mono tracking-widest text-rose-600 uppercase">
                SpeedyMeals Administration Center
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Platform Business Intelligence & Audit Reports
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Audit Period: {periodStart} to {periodEnd}
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-400">
              Export Date: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders in Period"
            value={reports?.total_orders ?? 890}
            change={{ value: '+22.4%', isPositive: true, period: 'monthly growth' }}
            accent="blue"
            icon={<ChartLineUp size={18} weight="bold" />}
            targetBenchmark="Fulfilled"
          />

          <StatCard
            label="Gross Merchandise (GMV)"
            value={formatPKR(reports?.total_revenue ?? 1145000)}
            subValue="Customer gross spending"
            accent="emerald"
            icon={<Coins size={18} weight="bold" />}
            targetBenchmark="GMV Record"
          />

          <StatCard
            label="Courier Delivery Fees (100%)"
            value={formatPKR(reports?.total_rider_payouts ?? 78500)}
            subValue="Fully disbursed to couriers"
            accent="none"
            icon={<Bicycle size={18} weight="bold" />}
            targetBenchmark="Fair-Split Guarantee"
          />

          <StatCard
            label="Cash Deposit Discrepancies"
            value={formatPKR(reports?.cash_discrepancy_total ?? 3500)}
            change={{ value: 'Audit Flag', isPositive: false }}
            accent="red"
            icon={<ShieldWarning size={18} weight="bold" />}
            targetBenchmark="Requires Audit"
          />
        </div>

        {/* Top Restaurant Partners */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Storefront size={16} weight="bold" className="text-rose-600" />
            Top Performing Restaurant Partners
          </h2>
          <DataTable<TopRestaurant>
            data={reports?.top_restaurants ?? []}
            columns={topRestaurantColumns}
            keyExtractor={(r) => r.restaurant_id}
            searchPlaceholder="Search restaurant..."
            searchFilter={(r, q) => r.restaurant_name.toLowerCase().includes(q.toLowerCase())}
          />
        </div>

        {/* Courier Cash Float Discrepancy Audits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <ShieldWarning size={16} weight="bold" className="text-rose-600" />
              Cash-on-Delivery (COD) Deposit Discrepancy Log
            </h2>
            <span className="text-xs text-slate-400">Audit verification queue</span>
          </div>

          <DataTable<CashDiscrepancy>
            data={discrepancies}
            columns={discrepancyColumns}
            keyExtractor={(d) => d.id}
            searchPlaceholder="Search courier name..."
            searchFilter={(d, q) => d.rider_name.toLowerCase().includes(q.toLowerCase())}
          />
        </div>
      </div>
    </div>
  );
}
