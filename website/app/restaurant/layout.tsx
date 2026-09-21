'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/restaurant/login';

  if (isLoginPage) {
    return <main className="min-h-screen bg-paper-off">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-paper-off">
      <Sidebar role="restaurant" />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
