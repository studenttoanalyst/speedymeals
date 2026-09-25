'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { getStoredRole, getStoredAccessToken } from '@/lib/auth';
import { Spinner } from '@phosphor-icons/react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthorized(true);
      return;
    }

    const role = getStoredRole();
    const token = getStoredAccessToken();

    if (!token || role !== 'admin') {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-paper-off">{children}</main>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-off">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Spinner size={32} className="animate-spin text-rose-600" />
          <p className="text-xs font-medium tracking-wide uppercase">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-off">
      <Sidebar role="admin" />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
