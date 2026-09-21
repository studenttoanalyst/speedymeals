'use client';

import React, { useState } from 'react';
import { ChartLineUp, Receipt, Coins, Calendar } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable } from '@/components/dashboard/DataTable';

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

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Kitchen Sales Analytics"
        description="Daily sales volume, commission deductions, and periodic revenue performance."
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="7-Day Completed Orders"
            value={totalOrders}
            subValue="Fulfilled customer tickets"
            accent="blue"
            icon={<Receipt size={18} />}
          />
          <StatCard
            label="7-Day Gross Sales"
            value={formatPKR(totalGross)}
            subValue="Food merchandise total"
            accent="tan"
            icon={<Coins size={18} />}
          />
          <StatCard
            label="7-Day Net Payout"
            value={formatPKR(totalNet)}
            subValue="90% net after commission"
            accent="red"
            icon={<ChartLineUp size={18} />}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-ink-soft" />
            <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wide">
              Daily Breakdown History
            </h2>
          </div>

          <DataTable<DailyReportRow>
            data={mockDailyRows}
            keyExtractor={(r) => r.date}
            columns={[
              {
                key: 'date',
                title: 'Date',
                render: (r) => (
                  <span className="font-mono text-xs font-semibold text-ink">
                    {r.date}
                  </span>
                ),
              },
              {
                key: 'order_count',
                title: 'Orders Delivered',
                align: 'center',
                render: (r) => (
                  <span className="font-mono text-xs text-ink">{r.order_count}</span>
                ),
              },
              {
                key: 'gross_sales',
                title: 'Gross Food Sales',
                align: 'right',
                render: (r) => (
                  <span className="font-mono text-xs font-semibold text-ink">
                    {formatPKR(r.gross_sales)}
                  </span>
                ),
              },
              {
                key: 'commission',
                title: 'Platform Fee (10%)',
                align: 'right',
                render: (r) => (
                  <span className="font-mono text-xs text-red font-semibold">
                    -{formatPKR(r.commission)}
                  </span>
                ),
              },
              {
                key: 'net_earnings',
                title: 'Net Kitchen Earnings (90%)',
                align: 'right',
                render: (r) => (
                  <span className="font-mono text-xs font-bold text-[#1E7E34]">
                    {formatPKR(r.net_earnings)}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
