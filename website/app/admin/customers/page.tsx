'use client';

import React, { useEffect, useState } from 'react';
import { Users, WarningCircle, CheckCircle, Wallet, UserCheck, UserMinus } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { listAdminCustomers, toggleAdminCustomerStatus } from '@/lib/api/admin';
import { CustomerAdmin } from '@/types/admin';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const data = await listAdminCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleStatus = async (customer: CustomerAdmin) => {
    try {
      await toggleAdminCustomerStatus(customer.id, !customer.is_active);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, is_active: !customer.is_active } : c))
      );
    } catch (err) {
      console.error('Failed to toggle customer', err);
    }
  };

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: Column<CustomerAdmin>[] = [
    {
      key: 'name',
      title: 'Customer Details',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-ink-100 border border-ink-200 flex items-center justify-center font-bold text-xs text-ink-700 uppercase shrink-0">
            {c.name ? c.name.charAt(0) : 'U'}
          </div>
          <div>
            <div className="font-bold text-ink-900 text-xs">{c.name || 'Registered Customer'}</div>
            <div className="text-2xs text-ink-400 font-mono">#{c.id.slice(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone_number',
      title: 'Phone & Auth',
      render: (c) => (
        <div className="text-xs">
          <div className="font-mono font-medium text-ink-800">{c.phone_number}</div>
          <div className="text-2xs text-ink-400">{c.email || 'No email provided'}</div>
        </div>
      ),
    },
    {
      key: 'wallet_balance',
      title: 'Wallet Credits',
      align: 'right',
      sortable: true,
      render: (c) => (
        <span className="font-mono text-xs font-semibold text-green-700">
          {formatPKR(c.wallet_balance)}
        </span>
      ),
    },
    {
      key: 'total_orders_count',
      title: 'Completed Orders',
      align: 'center',
      sortable: true,
      render: (c) => (
        <span className="font-mono text-xs font-semibold text-ink-800 px-2 py-0.5 rounded-md bg-ink-100">
          {c.total_orders_count ?? 0} orders
        </span>
      ),
    },
    {
      key: 'is_active',
      title: 'Account Status',
      render: (c) => (
        <StatusBadge status={c.is_active ? 'active' : 'suspended'} size="sm" />
      ),
    },
    {
      key: 'actions',
      title: 'Security Control',
      align: 'right',
      render: (c) => (
        <button
          onClick={() => handleToggleStatus(c)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-sm border transition-colors ${
            c.is_active
              ? 'border-ink-200 text-ink-600 hover:bg-red-50 hover:text-red-600'
              : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {c.is_active ? 'Block Account' : 'Unblock Account'}
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar
        title="Customer Directory & Account Controls"
        onRefresh={fetchCustomers}
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <DataTable<CustomerAdmin>
          data={customers}
          columns={columns}
          keyExtractor={(c) => c.id}
          isLoading={isLoading}
          enableCityFilter
          searchPlaceholder="Search by customer name, phone, or email..."
          searchFilter={(c, q) =>
            (c.name?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
            c.phone_number.includes(q) ||
            (c.email?.toLowerCase().includes(q.toLowerCase()) ?? false)
          }
          filterOptions={[
            { label: 'All Accounts', value: 'all', filterFn: () => true },
            { label: 'Active', value: 'active', filterFn: (c) => c.is_active },
            { label: 'Blocked / Suspended', value: 'blocked', filterFn: (c) => !c.is_active },
          ]}
        />
      </div>
    </div>
  );
}
