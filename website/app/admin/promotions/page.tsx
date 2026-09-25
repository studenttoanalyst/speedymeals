'use client';

import React, { useEffect, useState } from 'react';
import {
  Tag,
  Plus,
  X,
  CheckCircle,
  Calendar,
  Percent,
  Coins,
  ToggleLeft,
  ToggleRight,
  Eye,
  Megaphone,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { ImageUpload } from '@/components/common/ImageUpload';
import {
  listAdminPromotions,
  createAdminPromotion,
  toggleAdminPromotionStatus,
} from '@/lib/api/admin';
import { PromotionAdmin, PromotionCreatePayload } from '@/types/admin';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<PromotionCreatePayload>({
    code: '',
    title: '',
    description: '',
    banner_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_value: 1000,
    max_discount_amount: 500,
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 14 * 86400000).toISOString(),
    is_active: true,
  });

  const fetchPromotions = async () => {
    try {
      const data = await listAdminPromotions();
      setPromotions(data);
    } catch (err) {
      console.error('Failed to load promotions', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminPromotion(formData);
      setIsModalOpen(false);
      setFormData({
        code: '',
        title: '',
        description: '',
        banner_url: '',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_value: 1000,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString(),
        is_active: true,
      });
      await fetchPromotions();
    } catch (err) {
      console.error('Failed to create promotion', err);
    }
  };

  const handleToggle = async (promo: PromotionAdmin) => {
    try {
      await toggleAdminPromotionStatus(promo.id, !promo.is_active);
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: !promo.is_active } : p))
      );
    } catch (err) {
      console.error('Failed to toggle promotion', err);
    }
  };

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  const columns: Column<PromotionAdmin>[] = [
    {
      key: 'banner',
      title: 'Campaign Banner',
      render: (p) => (
        <div className="relative w-28 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
          {p.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.banner_url} alt={p.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
              No Banner
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      title: 'Voucher Code & Title',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            {p.code}
          </span>
          <div className="font-semibold text-slate-900 text-xs mt-1">{p.title}</div>
        </div>
      ),
    },
    {
      key: 'discount',
      title: 'Discount Value',
      render: (p) => (
        <div className="text-xs font-mono font-bold text-slate-800">
          {p.discount_type === 'percentage' ? `${p.discount_value}% OFF` : `-${formatPKR(p.discount_value)}`}
          <div className="text-[10px] text-slate-400 font-normal">
            Min Order: {formatPKR(p.min_order_value)}
          </div>
        </div>
      ),
    },
    {
      key: 'usage_count',
      title: 'Total Redemptions',
      align: 'center',
      sortable: true,
      render: (p) => (
        <span className="font-mono font-semibold text-xs text-slate-800 px-2 py-0.5 rounded-md bg-slate-100">
          {p.usage_count} uses
        </span>
      ),
    },
    {
      key: 'valid_until',
      title: 'Expiration',
      render: (p) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(p.valid_until).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'is_active',
      title: 'Status',
      align: 'right',
      render: (p) => (
        <button
          onClick={() => handleToggle(p)}
          className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto ${
            p.is_active ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {p.is_active ? (
            <ToggleRight size={22} weight="fill" className="text-emerald-600" />
          ) : (
            <ToggleLeft size={22} weight="fill" className="text-slate-300" />
          )}
          <span>{p.is_active ? 'Active' : 'Paused'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Promotions & Marketing Studio"
        description="Platform-wide customer discount vouchers, promo carousel banners, and subsidized marketing campaigns."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchPromotions();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} weight="bold" />
            <span>Create Campaign</span>
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Active Banner Showcase */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone size={16} weight="bold" className="text-rose-600" />
              Live Customer App Carousel Banners
            </h3>
            <span className="text-xs text-slate-400">Dimensions: 1200×400px (3:1)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="relative aspect-[3/1] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={promo.banner_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200'}
                  alt={promo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-900/70 via-slate-900/20 to-transparent p-3 flex flex-col justify-end">
                  <div className="font-mono text-[10px] font-bold text-rose-300">
                    CODE: {promo.code}
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">
                    {promo.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promotions Data Table */}
        <DataTable
          data={promotions}
          columns={columns}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          searchPlaceholder="Search coupon code or title..."
          searchFilter={(p, q) =>
            p.code.toLowerCase().includes(q.toLowerCase()) ||
            p.title.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>

      {/* CREATE PROMO CAMPAIGN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Marketing Promotion</h3>
                <p className="text-xs text-slate-400">
                  Upload customer app carousel banner and configure coupon discount rules.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* 3:1 Promo Banner Uploader */}
              <ImageUpload
                label="Campaign Hero Carousel Banner"
                aspectRatio="3:1"
                value={formData.banner_url}
                onChange={(url) => setFormData({ ...formData, banner_url: url })}
                hint="Wide 3:1 banner (1200×400px, max 4MB)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Voucher Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SPEEDY50"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono font-bold uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="50% Weekend Feast"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'flat' })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat PKR Off</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Value</label>
                  <input
                    type="number"
                    required
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Min Order (PKR)</label>
                  <input
                    type="number"
                    required
                    value={formData.min_order_value}
                    onChange={(e) =>
                      setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
