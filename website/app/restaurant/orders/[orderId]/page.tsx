'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, MapPin, Note } from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getRestaurantOrder, updateRestaurantOrderStatus } from '@/lib/api/restaurant';
import { RestaurantOrderDetail } from '@/types/restaurant';

export default function RestaurantOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<RestaurantOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const data = await getRestaurantOrder(resolvedParams.orderId);
      setOrder(data);
    } catch (err) {
      console.error('Failed to load order', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [resolvedParams.orderId]);

  const handleAdvanceStatus = async (nextStatus: string) => {
    if (!order) return;
    try {
      const updated = await updateRestaurantOrderStatus(order.id, nextStatus);
      setOrder(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title={`Kitchen Ticket #${resolvedParams.orderId.slice(0, 8)}`}
        description="Ticket lines, customer notes, and courier dispatch controls."
        actions={
          <Link
            href="/restaurant/orders"
            className="px-3 py-1.5 font-mono text-xs font-semibold border border-line bg-paper hover:bg-paper-off text-ink transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Kitchen</span>
          </Link>
        }
      />

      <div className="p-6 max-w-2xl space-y-6">
        {isLoading ? (
          <div className="p-8 border border-line bg-paper animate-pulse space-y-4">
            <div className="h-6 bg-line/50 w-1/3" />
            <div className="h-4 bg-line/50 w-1/2" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-line bg-paper">
              <div>
                <h2 className="font-heading font-bold text-base text-ink">
                  Customer: {order.customer_name}
                </h2>
                <p className="font-mono text-xs text-ink-soft">
                  Received: {new Date(order.placed_at).toLocaleTimeString()}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Dishes */}
            <div className="border border-line bg-paper divide-y divide-line">
              <div className="p-3 font-mono text-xs font-bold text-ink uppercase tracking-wider bg-paper-off/40">
                Ticket Items
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-red font-bold mr-2">{item.quantity}x</span>
                    <span className="font-bold text-ink">{item.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-ink">
                    {formatPKR(item.price_at_order * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="p-3 bg-paper-off/30 flex justify-between font-mono text-xs font-bold text-ink">
                <span>Food Subtotal</span>
                <span>{formatPKR(order.food_subtotal)}</span>
              </div>
            </div>

            {/* Controls */}
            {order.status === 'Accepted' && (
              <button
                onClick={() => handleAdvanceStatus('Preparing')}
                className="w-full py-2.5 font-mono text-xs font-semibold bg-ink text-paper hover:bg-ink-soft uppercase tracking-wider"
                style={{ borderRadius: '0px' }}
              >
                Start Preparing Ticket →
              </button>
            )}

            {order.status === 'Preparing' && (
              <button
                onClick={() => handleAdvanceStatus('Ready for Pickup')}
                className="w-full py-2.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] uppercase tracking-wider"
                style={{ borderRadius: '0px' }}
              >
                Mark Ready for Pickup (Dispatch Courier) →
              </button>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-sans text-ink-soft border border-line bg-paper">
            Ticket not found.
          </div>
        )}
      </div>
    </div>
  );
}
