'use client';

import { useEffect, useState } from 'react';

/**
 * Local-only synthetic orders for developing the dashboard charts.
 *
 * Loads `public/dev-seed/orders.js` (gitignored, never deployed) at runtime
 * when running `next dev` with NEXT_PUBLIC_DEV_SEED=true in .env.local.
 * The import is excluded from bundling, so the file may be absent: the hook
 * then returns an empty list. Seed rows feed charts only — never tables or
 * actions, since their ids don't exist in the API.
 */
export interface SeedOrder {
  placed_at: string;
  total_amount: number;
}

export type SeedScope = 'admin' | 'restaurant';

const ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_SEED === 'true';
const SEED_URL = '/dev-seed/orders.js';
const NO_ORDERS: SeedOrder[] = [];

export function useDevSeedOrders(scope: SeedScope): SeedOrder[] {
  const [orders, setOrders] = useState<SeedOrder[]>(NO_ORDERS);

  useEffect(() => {
    if (!ENABLED) return;
    let cancelled = false;
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ SEED_URL)
      .then((mod: { generateOrders: (scope: SeedScope, now: Date) => SeedOrder[] }) => {
        if (!cancelled) setOrders(mod.generateOrders(scope, new Date()));
      })
      .catch(() => {
        console.info(`[dev-seed] ${SEED_URL} not found; charts show live data only.`);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return orders;
}
