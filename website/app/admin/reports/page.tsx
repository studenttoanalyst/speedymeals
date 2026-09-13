'use client';

import React, { useEffect, useState } from 'react';
import {
  ChartLineUp,
  WarningCircle,
  Storefront,
  Coins,
  MapPin,
  Bicycle,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable } from '@/components/dashboard/DataTable';
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

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Platform Analytics & Cash Reconciliation"
        description="Comprehensive volume trends, partner performance, and cash deposit audit exceptions."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchReports();
        }}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="px-2 py-1 text-xs font-mono bg-paper border border-line text-ink"
              style={{ borderRadius: '0px' }}
            />
            <span className="text-xs text-ink-soft">→</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="px-2 py-1 text-xs font-mono bg-paper border border-line text-ink"
              style={{ borderRadius: '0px' }}
            />
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders in Period"
            value={reports?.total_orders ?? 0}
            subValue="Delivered volume"
            accent="blue"
            icon={<ChartLineUp size={18} />}
          />
          <StatCard
            label="Gross Merchandise (GMV)"
            value={formatPKR(reports?.total_revenue)}
            subValue="Customer payments total"
            accent="red"
            icon={<Coins size={18} />}
          />
          <StatCard
            label="Avg Delivery Distance"
            value={`${reports?.average_delivery_distance_km ?? 0} km`}
            subValue={`Avg fee: ${formatPKR(reports?.average_delivery_fee)}`}
            accent="tan"
            icon={<MapPin size={18} />}
          />
          <StatCard
            label="Total Cash Discrepancy"
            value={formatPKR(reports?.cash_discrepancy_total)}
            subValue="Unreconciled variance"
            icon={<WarningCircle size={18} className="text-[#C92A2A]" />}
          />
        </div>

        {/* Top Performing Restaurants */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Storefront size={16} className="text-ink-soft" />
            <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wide">
              Top Performing Restaurants by Revenue
            </h2>
          </div>

          <DataTable<TopRestaurant>
            data={reports?.top_restaurants ?? []}
            keyExtractor={(r) => r.restaurant_id}
            isLoading={isLoading}
            columns={[
              {
                key: 'restaurant_name',
                title: 'Restaurant Name',
                render: (r) => (
                  <span className="font-heading font-bold text-xs text-ink">
                    {r.restaurant_name}
                  </span>
                ),
              },
              {
                key: 'order_count',
                title: 'Fulfilled Orders',
                align: 'center',
                render: (r) => (
                  <span className="font-mono text-xs text-ink">
                    {r.order_count}
                  </span>
                ),
              },
              {
                key: 'revenue',
                title: 'Total Gross Volume',
                align: 'right',
                render: (r) => (
                  <span className="font-mono text-xs font-bold text-ink">
                    {formatPKR(r.revenue)}
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Daily Cash Discrepancies Audit Table */}
        <div className="space-y-3" id="discrepancies">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="text-[#C92A2A]" />
            <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wide">
              COD Daily Cash Discrepancy Log (Spec Sec 3.4 & 6)
            </h2>
          </div>

          <DataTable<CashDiscrepancy>
            data={discrepancies}
            keyExtractor={(d) => d.id}
            isLoading={isLoading}
            searchPlaceholder="Search by rider name..."
            searchFilter={(d, q) => d.rider_name.toLowerCase().includes(q.toLowerCase())}
            columns={[
              {
                key: 'rider_name',
                title: 'Rider Name',
                render: (d) => (
                  <div className="flex items-center gap-2">
                    <Bicycle size={14} className="text-ink-soft" />
                    <span className="font-sans text-xs font-bold text-ink">{d.rider_name}</span>
                  </div>
                ),
              },
              {
                key: 'expected_amount',
                title: 'Expected Cash',
                align: 'right',
                render: (d) => (
                  <span className="font-mono text-xs text-ink">{formatPKR(d.expected_amount)}</span>
                ),
              },
              {
                key: 'amount_submitted',
                title: 'Submitted Amount',
                align: 'right',
                render: (d) => (
                  <span className="font-mono text-xs font-semibold text-ink">
                    {formatPKR(d.amount_submitted)}
                  </span>
                ),
              },
              {
                key: 'discrepancy',
                title: 'Variance',
                align: 'right',
                render: (d) => (
                  <span
                    className={`font-mono text-xs font-bold ${
                      d.discrepancy < 0 ? 'text-[#C92A2A]' : 'text-[#1E7E34]'
                    }`}
                  >
                    {d.discrepancy < 0 ? '-' : '+'}
                    {formatPKR(Math.abs(d.discrepancy))}
                  </span>
                ),
              },
              {
                key: 'verified_by_admin',
                title: 'Admin Verification',
                render: (d) => (
                  <span
                    className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border ${
                      d.verified_by_admin
                        ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#BCE4C7]'
                        : 'bg-[#FDF6E2] text-[#8C6D1F] border-[#F1DC9B]'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    {d.verified_by_admin ? 'Reconciled' : 'Under Review'}
                  </span>
                ),
              },
              {
                key: 'created_at',
                title: 'Deposit Date',
                render: (d) => (
                  <span className="font-mono text-xs text-ink-soft">
                    {new Date(d.created_at).toLocaleDateString()}
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
