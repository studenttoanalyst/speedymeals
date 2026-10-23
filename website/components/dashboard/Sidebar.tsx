'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
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
  Tag,
  ChefHat,
  ShieldCheck,
} from '@phosphor-icons/react';
import { logout, getStoredUser } from '@/lib/auth';
import type { AuthSessionUser } from '@/types/auth';

export interface SidebarProps {
  role: 'admin' | 'restaurant';
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size: number; weight?: any; className?: string }>;
  badge?: number | string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<AuthSessionUser | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  // One vocabulary everywhere: restaurants are "Merchants" in the UI, even
  // though the API role is "restaurant". Admins show their RBAC role name.
  const portalLabel = role === 'admin' ? 'Admin' : 'Merchant';
  const accountLabel =
    role === 'admin' ? (mounted && user?.role_name) || 'Admin' : 'Merchant';

  const handleLogout = async () => {
    await logout();
    router.push(role === 'admin' ? '/admin/login' : '/restaurant/login');
  };

  const adminSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Admin Dashboard', href: '/admin/dashboard', icon: ChartLineUp },
      ],
    },
    {
      title: 'Platform Management',
      items: [
        { label: 'Merchants', href: '/admin/restaurants', icon: Storefront },
        { label: 'Riders', href: '/admin/riders', icon: Bicycle },
        { label: 'Customers', href: '/admin/customers', icon: Users },
      ],
    },
    {
      title: 'Orders & Marketing',
      items: [
        { label: 'All Orders', href: '/admin/orders', icon: Receipt },
        { label: 'Offers & Discounts', href: '/admin/promotions', icon: Tag },
      ],
    },
    {
      title: 'Money & Payouts',
      items: [
        { label: 'Merchant Payouts', href: '/admin/settlements', icon: Coins },
        { label: 'Rider Payouts & Cash', href: '/admin/payouts', icon: CurrencyDollar },
        { label: 'Analytics & Reports', href: '/admin/reports', icon: ChartLineUp },
      ],
    },
    {
      title: 'Roles & Staff Access',
      items: [
        { label: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck },
        { label: 'Staff Accounts', href: '/admin/accounts', icon: Users },
      ],
    },
  ];

  const restaurantSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Merchant Dashboard', href: '/restaurant/dashboard', icon: ChartLineUp },
      ],
    },
    {
      title: 'Orders',
      items: [
        { label: 'Kitchen Orders', href: '/restaurant/orders', icon: Receipt },
      ],
    },
    {
      title: 'Food Menu',
      items: [
        { label: 'Food Menu & Dishes', href: '/restaurant/menu', icon: ForkKnife },
      ],
    },
    {
      title: 'Money & Earnings',
      items: [
        { label: 'Weekly Payouts', href: '/restaurant/settlements', icon: Coins },
        { label: 'Performance Reports', href: '/restaurant/reports', icon: ChartLineUp },
      ],
    },
    {
      title: 'Merchant Settings',
      items: [
        { label: 'Profile & Photos', href: '/restaurant/profile', icon: Sliders },
      ],
    },
  ];

  const sections = role === 'admin' ? adminSections : restaurantSections;

  return (
    <aside className="w-64 border-r border-ink-200 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 shadow-1 print:hidden">
      {/* Top Brand Header */}
      <div>
        <div className="h-16 border-b border-ink-100 px-5 flex items-center bg-white">
          <Link
            href={role === 'admin' ? '/admin/dashboard' : '/restaurant/dashboard'}
            className="flex min-w-0 items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center text-white shadow-1 group-hover:bg-red-700 transition-colors">
              {role === 'admin' ? (
                <ShieldCheck size={18} weight="bold" />
              ) : (
                <ChefHat size={18} weight="bold" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight text-ink-900 leading-tight truncate">
                SPEEDY<span className="text-red-600">MEALS</span>
              </div>
              <div className="text-2xs text-ink-600 font-medium truncate">
                {portalLabel} Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-145px)]">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 text-2xs font-semibold uppercase tracking-wider text-ink-400 mb-1.5">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' &&
                    item.href !== '/restaurant/dashboard' &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center justify-between px-3 py-2 text-xs font-medium rounded-sm transition-colors active:scale-[0.98] select-none ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/70'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-nav-pill"
                        className="absolute inset-0 rounded-md bg-ink-900 shadow-1"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-2.5">
                      <Icon
                        size={17}
                        weight={isActive ? 'bold' : 'regular'}
                        className={isActive ? 'text-white' : 'text-ink-400'}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className={`relative z-10 text-2xs font-semibold px-1.5 py-0.5 rounded-xs ${
                        isActive ? 'bg-ink-800 text-ink-200' : 'bg-ink-200 text-ink-700'
                      }`}>
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

      {/* Bottom User & Logout Card */}
      <div className="p-3 border-t border-ink-100 bg-ink-50/50">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white border border-ink-200">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {(mounted && user?.email ? user.email : accountLabel).charAt(0)}
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-semibold text-ink-800 truncate">{accountLabel}</div>
              <div className="text-2xs text-ink-600 truncate">
                {mounted && user?.email ? user.email : 'Signed in'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-sm transition-all duration-100 cursor-pointer active:scale-90 select-none"
          >
            <SignOut size={16} weight="bold" />
          </button>
        </div>
      </div>
    </aside>
  );
}
