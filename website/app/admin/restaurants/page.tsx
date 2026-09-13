'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Storefront,
  X,
  CheckCircle,
  Percent,
  LockKeyOpen,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
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
      await updateAdminRestaurantCommission(commissionTarget.id, { commission_rate: newCommission });
      setCommissionTarget(null);
      await fetchRestaurants();
    } catch (err) {
      console.error('Failed to update commission', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Restaurant Management"
        description="Onboard dining partners, override commission rates, and manage merchant access."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchRestaurants();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <Plus size={14} weight="bold" />
            <span>Onboard New Partner</span>
          </button>
        }
      />

      <div className="p-6">
        <DataTable<RestaurantAdmin>
          data={restaurants}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          searchPlaceholder="Search by name, email, or phone..."
          searchFilter={(r, query) =>
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.email.toLowerCase().includes(query.toLowerCase()) ||
            r.phone_number.includes(query)
          }
          filterOptions={[
            { label: 'Active', value: 'active', filterFn: (r) => r.status === 'active' },
            { label: 'Inactive', value: 'inactive', filterFn: (r) => r.status === 'inactive' },
          ]}
          columns={[
            {
              key: 'name',
              title: 'Restaurant Name',
              sortable: true,
              render: (r) => (
                <div>
                  <div className="font-heading font-bold text-sm text-ink flex items-center gap-2">
                    <Storefront size={16} className="text-red" />
                    <span>{r.name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-ink-soft">{r.email}</div>
                </div>
              ),
            },
            {
              key: 'phone_number',
              title: 'Phone / OTP',
              render: (r) => <span className="font-mono text-xs text-ink">{r.phone_number}</span>,
            },
            {
              key: 'commission_rate',
              title: 'Commission',
              align: 'center',
              sortable: true,
              render: (r) => (
                <button
                  onClick={() => {
                    setCommissionTarget(r);
                    setNewCommission(r.commission_rate);
                  }}
                  className="font-mono text-xs font-semibold px-2 py-0.5 border border-line bg-paper-off hover:border-ink transition-colors flex items-center gap-1 mx-auto"
                  style={{ borderRadius: '0px' }}
                  title="Click to override commission"
                >
                  <span>{r.commission_rate}%</span>
                  <Percent size={12} className="text-ink-soft" />
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
              sortable: true,
              render: (r) => (
                <span className="font-mono text-xs text-ink-soft">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'actions',
              title: 'Controls',
              align: 'right',
              render: (r) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setStatusTarget(r)}
                    className={`px-2.5 py-1 text-[11px] font-mono font-semibold border transition-colors ${
                      r.status === 'active'
                        ? 'border-[#F5C2BC] text-[#C92A2A] hover:bg-[#FDF0EE]'
                        : 'border-[#BCE4C7] text-[#1E7E34] hover:bg-[#EBF7EE]'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    {r.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Onboard Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div
            className="w-full max-w-lg bg-paper border border-line shadow-2xl p-6"
            style={{ borderRadius: '0px' }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <Storefront size={18} className="text-red" />
                <h3 className="font-heading font-bold text-base text-ink">
                  Onboard Restaurant Partner
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 border border-line hover:bg-paper-off text-ink-soft"
                style={{ borderRadius: '0px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                  Restaurant Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Student Biryani Saddar"
                  className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                  style={{ borderRadius: '0px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@restaurant.pk"
                    className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Phone (for OTP Login) *
                  </label>
                  <div className="flex">
                    <span className="px-2.5 py-2 font-mono text-xs border border-r-0 border-line bg-paper-off text-ink font-semibold">
                      +92
                    </span>
                    <input
                      type="tel"
                      required
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="3001234567"
                      className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-mono"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Commission Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    required
                    value={formData.commission_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 10.0 })
                    }
                    className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-mono"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs border border-line bg-paper text-ink hover:bg-paper-off"
                  style={{ borderRadius: '0px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] disabled:opacity-50"
                  style={{ borderRadius: '0px' }}
                >
                  {isSubmitting ? 'Onboarding...' : 'Confirm Partner Onboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Commission Modal */}
      {commissionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div
            className="w-full max-w-sm bg-paper border border-line shadow-2xl p-6"
            style={{ borderRadius: '0px' }}
          >
            <h3 className="font-heading font-bold text-sm text-ink mb-1">
              Override Commission Rate
            </h3>
            <p className="font-sans text-xs text-ink-soft mb-4">
              Update platform fee percentage for <span className="font-semibold text-ink">{commissionTarget.name}</span>.
            </p>

            <form onSubmit={handleUpdateCommission} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                  Commission Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="100"
                  required
                  value={newCommission}
                  onChange={(e) => setNewCommission(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-mono font-bold bg-paper border border-line text-ink focus:outline-none focus:border-ink"
                  style={{ borderRadius: '0px' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCommissionTarget(null)}
                  className="px-3 py-1.5 font-mono text-xs border border-line bg-paper text-ink hover:bg-paper-off"
                  style={{ borderRadius: '0px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E]"
                  style={{ borderRadius: '0px' }}
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deactivate / Activate Dialog */}
      <ConfirmDialog
        isOpen={statusTarget !== null}
        title={statusTarget?.status === 'active' ? 'Deactivate Restaurant Partner' : 'Activate Restaurant Partner'}
        message={
          statusTarget?.status === 'active'
            ? `Deactivating ${statusTarget?.name} will hide all their menu items from customer search and reject new orders.`
            : `Activating ${statusTarget?.name} will restore their store visibility to customers immediately.`
        }
        confirmLabel={statusTarget?.status === 'active' ? 'Confirm Deactivate' : 'Confirm Activate'}
        variant={statusTarget?.status === 'active' ? 'danger' : 'primary'}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
