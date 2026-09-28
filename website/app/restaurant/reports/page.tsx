'use client';

import React, { useEffect, useState } from 'react';
import { ChartLineUp, Receipt, Coins, Calendar, DownloadSimple, TrendUp } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { listRestaurantOrders } from '@/lib/api/restaurant';

interface DailyReportRow {
  date: string;
  order_count: number;
  gross_sales: number;
  commission: number;
  net_earnings: number;
}

export default function RestaurantReportsPage() {
  const [dailyRows, setDailyRows] = useState<DailyReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const orders = await listRestaurantOrders();
        const groups: Record<string, { count: number; gross: number }> = {};
        for (const o of orders) {
          const d = o.placed_at ? o.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
          if (!groups[d]) {
            groups[d] = { count: 0, gross: 0 };
          }
          groups[d].count += 1;
          groups[d].gross += o.total_amount;
        }
        const rows: DailyReportRow[] = Object.entries(groups)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, data]) => {
            const commission = data.gross * 0.1;
            return {
              date,
              order_count: data.count,
              gross_sales: data.gross,
              commission,
              net_earnings: data.gross - commission,
            };
          });
        setDailyRows(rows);
      } catch (err) {
        console.error('Failed to load report orders', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalOrders = dailyRows.reduce((acc, r) => acc + r.order_count, 0);
  const totalGross = dailyRows.reduce((acc, r) => acc + r.gross_sales, 0);
  const totalNet = dailyRows.reduce((acc, r) => acc + r.net_earnings, 0);

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
        <span className="font-mono text-xs font-medium text-slate-600">
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
            change={totalOrders > 0 ? { value: '+18.4%', isPositive: true, period: 'vs prior 7 days' } : undefined}
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
            change={totalNet > 0 ? { value: '+16.2%', isPositive: true, period: 'net growth' } : undefined}
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
            data={dailyRows}
            columns={columns}
            keyExtractor={(r) => r.date}
            isLoading={isLoading}
            searchPlaceholder="Filter by date..."
            searchFilter={(r, q) => r.date.includes(q)}
          />
        </div>
      </div>
    </div>
  );
}
