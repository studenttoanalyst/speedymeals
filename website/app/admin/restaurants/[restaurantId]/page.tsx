'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Storefront, EnvelopeSimple, Phone, Percent } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getAdminRestaurant } from '@/lib/api/admin';
import { RestaurantAdmin } from '@/types/admin';

export default function AdminRestaurantDetailPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const resolvedParams = use(params);
  const [restaurant, setRestaurant] = useState<RestaurantAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const data = await getAdminRestaurant(resolvedParams.restaurantId);
        setRestaurant(data);
      } catch (err) {
        console.error('Failed to load restaurant', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurant();
  }, [resolvedParams.restaurantId]);

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title={restaurant?.name || 'Restaurant File'}
        description="Partner account parameters and contract conditions."
        actions={
          <Link
            href="/admin/restaurants"
            className="px-3 py-1.5 font-mono text-xs font-semibold border border-line bg-paper hover:bg-paper-off text-ink transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Restaurants</span>
          </Link>
        }
      />

      <div className="p-6 max-w-2xl space-y-6">
        {isLoading ? (
          <div className="p-8 border border-line bg-paper animate-pulse space-y-4">
            <div className="h-6 bg-line/50 w-1/3" />
            <div className="h-4 bg-line/50 w-1/2" />
          </div>
        ) : restaurant ? (
          <div className="bg-paper border border-line p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <Storefront size={24} className="text-red" />
                <div>
                  <h2 className="font-heading font-bold text-lg text-ink">
                    {restaurant.name}
                  </h2>
                  <p className="font-mono text-xs text-ink-soft">
                    Partner ID: #{restaurant.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <StatusBadge status={restaurant.status} />
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="flex items-center gap-2">
                <EnvelopeSimple size={16} className="text-ink-soft" />
                <span>Email: <span className="font-semibold text-ink">{restaurant.email}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-ink-soft" />
                <span>Phone: <span className="font-mono font-semibold text-ink">{restaurant.phone_number}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Percent size={16} className="text-ink-soft" />
                <span>Contract Commission: <span className="font-mono font-bold text-red">{restaurant.commission_rate}%</span></span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-sans text-ink-soft border border-line bg-paper">
            Restaurant not found.
          </div>
        )}
      </div>
    </div>
  );
}
