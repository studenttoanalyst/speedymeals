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

  const handleLogout = async () => {
    await logout();
    router.push(role === 'admin' ? '/admin/login' : '/restaurant/login');
  };

  const adminSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Executive Dashboard', href: '/admin/dashboard', icon: ChartLineUp },
      ],
    },
    {
      title: 'Platform Management',
      items: [
        { label: 'Restaurants', href: '/admin/restaurants', icon: Storefront },
        { label: 'Riders Fleet', href: '/admin/riders', icon: Bicycle },
        { label: 'Customers', href: '/admin/customers', icon: Users },
      ],
    },
    {
      title: 'Operations & Marketing',
      items: [
        { label: 'Global Orders', href: '/admin/orders', icon: Receipt },
        { label: 'Promotions & Banners', href: '/admin/promotions', icon: Tag },
      ],
    },
    {
      title: 'Finance & Ledgers',
      items: [
        { label: 'Restaurant Settlements', href: '/admin/settlements', icon: Coins },
        { label: 'Rider Payouts & Float', href: '/admin/payouts', icon: CurrencyDollar },
        { label: 'Analytics & Reports', href: '/admin/reports', icon: ChartLineUp },
      ],
    },
  ];

  const restaurantSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Kitchen Overview', href: '/restaurant/dashboard', icon: ChartLineUp },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Live Kitchen Orders', href: '/restaurant/orders', icon: Receipt },
      ],
    },
    {
      title: 'Menu Catalog',
      items: [
        { label: 'Dishes & Modifiers', href: '/restaurant/menu', icon: ForkKnife },
      ],
    },
    {
      title: 'Finance & Earnings',
      items: [
        { label: 'Weekly Settlements', href: '/restaurant/settlements', icon: Coins },
        { label: 'Performance Reports', href: '/restaurant/reports', icon: ChartLineUp },
      ],
    },
    {
      title: 'Storefront Settings',
      items: [
        { label: 'Brand & Media Profile', href: '/restaurant/profile', icon: Sliders },
      ],
    },
  ];

  const sections = role === 'admin' ? adminSections : restaurantSections;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 shadow-xs print:hidden">
      {/* Top Brand Header */}
      <div>
        <div className="h-16 border-b border-slate-100 px-5 flex items-center justify-between bg-white">
          <Link
            href={role === 'admin' ? '/admin/dashboard' : '/restaurant/dashboard'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-xs group-hover:bg-rose-700 transition-colors">
              {role === 'admin' ? (
                <ShieldCheck size={18} weight="bold" />
              ) : (
                <ChefHat size={18} weight="bold" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
                SPEEDY<span className="text-rose-600">MEALS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {role === 'admin' ? 'Administration Center' : 'Partner Restaurant Portal'}
              </div>
            </div>
          </Link>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              role === 'admin'
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            }`}
          >
            {role === 'admin' ? 'Admin' : 'Partner'}
          </span>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-145px)]">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                    className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-rose-50 text-rose-700 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={17}
                        weight={isActive ? 'bold' : 'regular'}
                        className={isActive ? 'text-rose-600' : 'text-slate-400'}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
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
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white border border-slate-200">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 uppercase shrink-0">
              {mounted && user?.email ? user.email.charAt(0) : (role === 'admin' ? 'A' : 'R')}
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {mounted && user?.role ? user.role.toUpperCase() : (role === 'admin' ? 'Super Admin' : 'Store Owner')}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {mounted && user?.email ? user.email : 'authenticated'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <SignOut size={16} weight="bold" />
          </button>
        </div>
      </div>
    </aside>
  );
}
