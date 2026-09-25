'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Storefront,
  X,
  CheckCircle,
  Percent,
  ToggleLeft,
  ToggleRight,
  PencilSimple,
  Sliders,
  MapPin,
  Buildings,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import { ImageUpload } from '@/components/common/ImageUpload';
import {
  listAdminRestaurants,
  createAdminRestaurant,
  updateAdminRestaurantStatus,
  updateAdminRestaurantCommission,
} from '@/lib/api/admin';
import { RestaurantAdmin, RestaurantCreatePayload } from '@/types/admin';

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Onboarding Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RestaurantCreatePayload>({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    commission_rate: 10.0,
    country_code: '+92',
    logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    banner_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
  });

  // Commission Modal State
  const [commissionTarget, setCommissionTarget] = useState<RestaurantAdmin | null>(null);
  const [newCommission, setNewCommission] = useState<number>(10.0);

  // Status Change Dialog State
  const [statusTarget, setStatusTarget] = useState<RestaurantAdmin | null>(null);

  const fetchRestaurants = async () => {
    try {
      const data = await listAdminRestaurants();
      setRestaurants(data);
    } catch (err) {
      console.error('Failed to load restaurants', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createAdminRestaurant(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        commission_rate: 10.0,
        country_code: '+92',
        logo_url: '',
        banner_url: '',
      });
      await fetchRestaurants();
    } catch (err) {
      console.error('Failed to onboard restaurant', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    try {
      const newActive = statusTarget.status !== 'active';
      await updateAdminRestaurantStatus(statusTarget.id, { is_active: newActive });
      setStatusTarget(null);
      await fetchRestaurants();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionTarget) return;
    try {
      await updateAdminRestaurantCommission(commissionTarget.id, {
        commission_rate: newCommission,
      });
      setCommissionTarget(null);
      await fetchRestaurants();
    } catch (err) {
      console.error('Failed to update commission', err);
    }
  };

  const columns: Column<RestaurantAdmin>[] = [
    {
      key: 'restaurant',
      title: 'Restaurant Storefront',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
              alt={r.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">{r.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">#{r.id.slice(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Contact Credentials',
      render: (r) => (
        <div className="space-y-0.5 text-xs">
          <div className="text-slate-800">{r.email}</div>
          <div className="text-slate-400 font-mono text-[11px]">{r.phone_number}</div>
        </div>
      ),
    },
    {
      key: 'commission_rate',
      title: 'Platform Commission',
      align: 'center',
      sortable: true,
      render: (r) => (
        <button
          onClick={() => {
            setCommissionTarget(r);
            setNewCommission(r.commission_rate);
          }}
          className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200"
          title="Click to adjust commission override"
        >
          <span>{r.commission_rate}%</span>
          <PencilSimple size={11} weight="bold" />
        </button>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      key: 'created_at',
      title: 'Onboarded',
      render: (r) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Store Control',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => setStatusTarget(r)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
            r.status === 'active'
              ? 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {r.status === 'active' ? 'Suspend' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Restaurant Partners Directory"
        description="Partner onboarding, brand asset verification, contracted 10% commission tiers, and operational status."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchRestaurants();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} weight="bold" />
            <span>Onboard Restaurant</span>
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <DataTable<RestaurantAdmin>
          data={restaurants}
          columns={columns}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          searchPlaceholder="Search restaurant name, email, or ID..."
          searchFilter={(r, q) =>
            r.name.toLowerCase().includes(q.toLowerCase()) ||
            r.email.toLowerCase().includes(q.toLowerCase()) ||
            r.id.toLowerCase().includes(q.toLowerCase())
          }
          filterOptions={[
            { label: 'Active Partners', value: 'active', filterFn: (r) => r.status === 'active' },
            { label: 'Pending KYC Review', value: 'pending', filterFn: (r) => r.status === 'pending' },
            { label: 'Suspended', value: 'inactive', filterFn: (r) => r.status === 'inactive' },
          ]}
        />
      </div>

      {/* ONBOARD RESTAURANT MODAL WITH LOGO & BANNER UPLOAD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Onboard New Restaurant Partner</h3>
                <p className="text-xs text-slate-400">
                  Provide credentials, storefront branding media, and default commission.
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
              {/* Media Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ImageUpload
                  label="Restaurant Logo"
                  aspectRatio="1:1"
                  value={formData.logo_url}
                  onChange={(url) => setFormData({ ...formData, logo_url: url })}
                  hint="Square 512×512px"
                />
                <ImageUpload
                  label="Storefront Cover"
                  aspectRatio="16:9"
                  value={formData.banner_url}
                  onChange={(url) => setFormData({ ...formData, banner_url: url })}
                  hint="Widescreen cover"
                />
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ginsoy Chinese"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Commission Rate (%)</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={formData.commission_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 10.0 })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Login Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@store.pk"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Phone Number (OTP Verification)</label>
                <input
                  type="text"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+923001234567"
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono"
                />
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
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Partner...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMISSION OVERRIDE MODAL */}
      {commissionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-slate-900">Adjust Platform Commission</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {commissionTarget.name} (Default: 10.0%)
              </p>
            </div>

            <form onSubmit={handleUpdateCommission} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">New Commission Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newCommission}
                  onChange={(e) => setNewCommission(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono font-bold text-base"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCommissionTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  Update Commission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CHANGE CONFIRM */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.status === 'active' ? 'Suspend Restaurant' : 'Activate Restaurant'}
        description={`Are you sure you want to ${
          statusTarget?.status === 'active' ? 'suspend' : 'activate'
        } "${statusTarget?.name}"? ${
          statusTarget?.status === 'active'
            ? 'The restaurant will immediately be hidden from customer app search and orders will be paused.'
            : 'The restaurant will become visible and ready to receive customer orders.'
        }`}
        confirmText={statusTarget?.status === 'active' ? 'Suspend Store' : 'Activate Store'}
        cancelText="Cancel"
        variant={statusTarget?.status === 'active' ? 'danger' : 'primary'}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
