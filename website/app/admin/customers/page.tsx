'use client';

import React, { useState } from 'react';
import { Users, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
import { CustomerAdmin } from '@/types/admin';

const mockCustomers: CustomerAdmin[] = [
  {
    id: 'c1-1111-2222-3333-444455556661',
    name: 'Ahmed Faraz',
    phone_number: '+923001234567',
    email: 'ahmed.faraz@gmail.com',
    wallet_balance: 0.0,
    is_active: true,
    created_at: '2026-08-15T10:00:00Z',
  },
  {
    id: 'c1-1111-2222-3333-444455556662',
    name: 'Sara Khan',
    phone_number: '+923219876543',
    email: 'sara.k@outlook.com',
    wallet_balance: 500.0,
    is_active: true,
    created_at: '2026-08-18T14:30:00Z',
  },
  {
    id: 'c1-1111-2222-3333-444455556663',
    name: 'Bilal Siddiqui',
    phone_number: '+923335554433',
    email: 'bilal.s@yahoo.com',
    wallet_balance: 0.0,
    is_active: false,
    created_at: '2026-08-22T09:15:00Z',
  },
  {
    id: 'c1-1111-2222-3333-444455556664',
    name: 'Zainab Fatima',
    phone_number: '+923457778899',
    email: 'zainab.f@gmail.com',
    wallet_balance: 1200.0,
    is_active: true,
    created_at: '2026-08-30T16:45:00Z',
  },
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerAdmin[]>(mockCustomers);

  const handleToggleStatus = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
  };

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Customer Directory & Account Controls"
        description="Search consumer accounts, inspect stored credits, and manage platform access."
      />

      <div className="p-6">
        <DataTable<CustomerAdmin>
          data={customers}
          keyExtractor={(c) => c.id}
          searchPlaceholder="Search by customer name, phone, or email..."
          searchFilter={(c, q) =>
            (c.name?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
            c.phone_number.includes(q) ||
            (c.email?.toLowerCase().includes(q.toLowerCase()) ?? false)
          }
          filterOptions={[
            { label: 'Active', value: 'active', filterFn: (c) => c.is_active },
            { label: 'Blocked', value: 'blocked', filterFn: (c) => !c.is_active },
          ]}
          columns={[
            {
              key: 'name',
              title: 'Customer Name',
              render: (c) => (
                <div>
                  <div className="font-heading font-bold text-xs text-ink">{c.name || 'Anonymous User'}</div>
                  <div className="font-mono text-[10px] text-ink-soft">ID: #{c.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'phone_number',
              title: 'Mobile Number',
              render: (c) => <span className="font-mono text-xs text-ink">{c.phone_number}</span>,
            },
            {
              key: 'email',
              title: 'Email',
              render: (c) => <span className="font-sans text-xs text-ink-soft">{c.email || 'N/A'}</span>,
            },
            {
              key: 'wallet_balance',
              title: 'Wallet Credit',
              align: 'right',
              render: (c) => (
                <span className="font-mono text-xs font-semibold text-ink">
                  {formatPKR(c.wallet_balance)}
                </span>
              ),
            },
            {
              key: 'is_active',
              title: 'Status',
              render: (c) => (
                <span
                  className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border ${
                    c.is_active
                      ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#BCE4C7]'
                      : 'bg-[#FDF0EE] text-[#C92A2A] border-[#F5C2BC]'
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  {c.is_active ? 'Active' : 'Blocked'}
                </span>
              ),
            },
            {
              key: 'created_at',
              title: 'Registered',
              render: (c) => (
                <span className="font-mono text-xs text-ink-soft">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'actions',
              title: 'Controls',
              align: 'right',
              render: (c) => (
                <button
                  onClick={() => handleToggleStatus(c.id)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-semibold border transition-colors ${
                    c.is_active
                      ? 'border-[#F5C2BC] text-[#C92A2A] hover:bg-[#FDF0EE]'
                      : 'border-[#BCE4C7] text-[#1E7E34] hover:bg-[#EBF7EE]'
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  {c.is_active ? 'Block' : 'Unblock'}
                </button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
