'use client';

import React, { useState } from 'react';
import { ChartLineUp, Receipt, Coins, Calendar, DownloadSimple, TrendUp } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';

interface DailyReportRow {
  date: string;
  order_count: number;
  gross_sales: number;
  commission: number;
  net_earnings: number;
}

const mockDailyRows: DailyReportRow[] = [
  { date: '2026-09-12', order_count: 32, gross_sales: 41600.0, commission: 4160.0, net_earnings: 37440.0 },
  { date: '2026-09-11', order_count: 28, gross_sales: 36400.0, commission: 3640.0, net_earnings: 32760.0 },
  { date: '2026-09-10', order_count: 35, gross_sales: 45500.0, commission: 4550.0, net_earnings: 40950.0 },
  { date: '2026-09-09', order_count: 24, gross_sales: 31200.0, commission: 3120.0, net_earnings: 28080.0 },
  { date: '2026-09-08', order_count: 29, gross_sales: 37700.0, commission: 3770.0, net_earnings: 33930.0 },
  { date: '2026-09-07', order_count: 42, gross_sales: 54600.0, commission: 5460.0, net_earnings: 49140.0 },
  { date: '2026-09-06', order_count: 38, gross_sales: 49400.0, commission: 4940.0, net_earnings: 44460.0 },
];

export default function RestaurantReportsPage() {
  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalOrders = mockDailyRows.reduce((acc, r) => acc + r.order_count, 0);
  const totalGross = mockDailyRows.reduce((acc, r) => acc + r.gross_sales, 0);
  const totalNet = mockDailyRows.reduce((acc, r) => acc + r.net_earnings, 0);

  const columns: Column<DailyReportRow>[] = [
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {r.date}
        </span>
      ),
    },
    {
      key: 'order_count',
      title: 'Orders Delivered',
      align: 'center',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-800 px-2 py-0.5 rounded-md bg-slate-100">
          {r.order_count}
        </span>
      ),
    },
    {
      key: 'gross_sales',
      title: 'Gross Food Sales',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-medium text-slate-800">
          {formatPKR(r.gross_sales)}
        </span>
      ),
    },
    {
      key: 'commission',
      title: 'Platform Fee (10%)',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-medium text-rose-600">
          −{formatPKR(r.commission)}
        </span>
      ),
    },
    {
      key: 'net_earnings',
      title: 'Net Restaurant Payable',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-emerald-700">
          {formatPKR(r.net_earnings)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Sales Analytics & Trends"
        description="Daily sales volume, platform commission, and kitchen revenue performance."
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Export Analytics</span>
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 print:p-0 print:max-w-none print:space-y-4">
        {/* Document Header (Clean Print Version) */}
        <div className="hidden print:block pb-4 border-b-2 border-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold font-mono tracking-widest text-rose-600 uppercase">
                SpeedyMeals Restaurant Partner Portal
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Sales Analytics & Revenue Performance
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Kitchen Turnover, Platform Commission & Settlement Breakdown
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-400">
              Export Date: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="7-Day Completed Orders"
            value={totalOrders}
            change={{ value: '+18.4%', isPositive: true, period: 'vs prior 7 days' }}
            accent="blue"
            icon={<Receipt size={18} weight="bold" />}
            targetBenchmark="Fulfilled"
          />

          <StatCard
            label="7-Day Gross Sales"
            value={formatPKR(totalGross)}
            subValue="Food merchandise total"
            accent="amber"
            icon={<Coins size={18} weight="bold" />}
            targetBenchmark="Target Met"
          />

          <StatCard
            label="7-Day Net Payout"
            value={formatPKR(totalNet)}
            change={{ value: '+16.2%', isPositive: true, period: 'net growth' }}
            accent="emerald"
            icon={<ChartLineUp size={18} weight="bold" />}
            targetBenchmark="90% Net Share"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <h2 className="font-bold text-sm text-slate-900">
              Daily Breakdown History
            </h2>
          </div>

          <DataTable<DailyReportRow>
            data={mockDailyRows}
            columns={columns}
            keyExtractor={(r) => r.date}
            searchPlaceholder="Filter by date..."
            searchFilter={(r, q) => r.date.includes(q)}
          />
        </div>
      </div>
    </div>
  );
}
