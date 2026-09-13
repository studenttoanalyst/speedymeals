'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ForkKnife, Tag } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { listRestaurantMenuItems } from '@/lib/api/restaurant';
import { MenuItem } from '@/types/restaurant';

export default function RestaurantMenuItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const resolvedParams = use(params);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const items = await listRestaurantMenuItems();
        const found = items.find((m) => m.id === resolvedParams.itemId);
        setItem(found || null);
      } catch (err) {
        console.error('Failed to load item', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItem();
  }, [resolvedParams.itemId]);

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title={item?.name || 'Dish Details'}
        description="Individual recipe parameters, price schedule, and inventory."
        actions={
          <Link
            href="/restaurant/menu"
            className="px-3 py-1.5 font-mono text-xs font-semibold border border-line bg-paper hover:bg-paper-off text-ink transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Menu</span>
          </Link>
        }
      />

      <div className="p-6 max-w-xl space-y-6">
        {isLoading ? (
          <div className="p-8 border border-line bg-paper animate-pulse space-y-4">
            <div className="h-6 bg-line/50 w-1/3" />
            <div className="h-4 bg-line/50 w-1/2" />
          </div>
        ) : item ? (
          <div className="bg-paper border border-line p-6 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-line pb-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-ink">{item.name}</h2>
                <div className="flex items-center gap-1 text-xs text-ink-soft mt-1">
                  <Tag size={14} className="text-red" />
                  <span>{item.category || 'Main Course'}</span>
                </div>
              </div>
              <span className="font-mono text-base font-bold text-ink">{formatPKR(item.price)}</span>
            </div>

            {item.description && (
              <p className="font-sans text-xs text-ink-soft leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="pt-2">
              <span
                className={`font-mono text-xs font-semibold px-2.5 py-1 border ${
                  item.is_available
                    ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#BCE4C7]'
                    : 'bg-[#FDF0EE] text-[#C92A2A] border-[#F5C2BC]'
                }`}
                style={{ borderRadius: '0px' }}
              >
                {item.is_available ? 'In Stock (Live)' : 'Sold Out'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-sans text-ink-soft border border-line bg-paper">
            Menu dish not found.
          </div>
        )}
      </div>
    </div>
  );
}
