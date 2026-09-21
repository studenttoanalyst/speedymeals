'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartLineUp,
  Storefront,
  Bicycle,
  Receipt,
  Coins,
  CurrencyDollar,
  WarningCircle,
  Users,
  ForkKnife,
  SignOut,
  Sliders,
  Sparkle,
} from '@phosphor-icons/react';
import { logout, getStoredUser } from '@/lib/auth';

export interface SidebarProps {
  role: 'admin' | 'restaurant';
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  badge?: number | string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  const handleLogout = async () => {
    await logout();
    router.push(role === 'admin' ? '/admin/login' : '/restaurant/login');
  };

  const adminSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: ChartLineUp },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Restaurants', href: '/admin/restaurants', icon: Storefront },
        { label: 'Riders', href: '/admin/riders', icon: Bicycle },
        { label: 'Customers', href: '/admin/customers', icon: Users },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Global Orders', href: '/admin/orders', icon: Receipt },
      ],
    },
    {
      title: 'Finance & Ledger',
      items: [
        { label: 'Settlements', href: '/admin/settlements', icon: Coins },
        { label: 'Rider Payouts', href: '/admin/payouts', icon: CurrencyDollar },
        { label: 'Discrepancies', href: '/admin/reports#discrepancies', icon: WarningCircle },
        { label: 'Reports', href: '/admin/reports', icon: ChartLineUp },
      ],
    },
  ];

  const restaurantSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/restaurant/dashboard', icon: ChartLineUp },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Live Orders', href: '/restaurant/orders', icon: Receipt },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { label: 'Menu Items', href: '/restaurant/menu', icon: ForkKnife },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Settlements', href: '/restaurant/settlements', icon: Coins },
        { label: 'Reports', href: '/restaurant/reports', icon: ChartLineUp },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Store Profile', href: '/restaurant/profile', icon: Sliders },
      ],
    },
  ];

  const sections = role === 'admin' ? adminSections : restaurantSections;

  return (
    <aside
      className="w-64 border-r border-line bg-paper flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30"
      style={{ borderRadius: '0px' }}
    >
      {/* Top Header */}
      <div>
        <div className="h-16 border-b border-line px-5 flex items-center justify-between bg-paper">
          <Link href={role === 'admin' ? '/admin/dashboard' : '/restaurant/dashboard'} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red inline-block" style={{ borderRadius: '0px' }} />
            <span className="font-display font-black text-lg tracking-wider text-ink">
              SPEEDY<span className="text-red">MEALS</span>
            </span>
          </Link>
          <span
            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-line bg-paper-off text-ink-soft font-semibold"
            style={{ borderRadius: '0px' }}
          >
            {role === 'admin' ? 'ADMIN' : 'PARTNER'}
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 text-[10px] font-mono uppercase tracking-widest text-ink-soft/70 font-semibold mb-1">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/restaurant/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-sans transition-colors border-l-2 ${
                      isActive
                        ? 'border-red bg-paper-off text-ink font-semibold'
                        : 'border-transparent text-ink-soft hover:text-ink hover:bg-paper-off/50'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className={isActive ? 'text-red' : 'text-ink-soft'} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className="font-mono text-[10px] font-semibold px-1.5 py-0.2 bg-red/10 text-red border border-red/20"
                        style={{ borderRadius: '0px' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-line bg-paper-off/40">
        <div className="px-2 py-2 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <div className="text-xs font-semibold font-sans text-ink truncate">
              {user?.name || (role === 'admin' ? 'Super Admin' : 'Restaurant Staff')}
            </div>
            <div className="text-[11px] font-mono text-ink-soft truncate">
              {user?.email || user?.phoneNumber || (role === 'admin' ? 'admin@speedymeals.pk' : '+923001112233')}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 border border-line bg-paper hover:bg-red hover:text-paper hover:border-red transition-colors text-ink-soft"
            style={{ borderRadius: '0px' }}
          >
            <SignOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
