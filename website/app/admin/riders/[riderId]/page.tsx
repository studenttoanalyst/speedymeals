'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bicycle,
  IdentificationCard,
  Wallet,
  Coins,
  ShieldWarning,
  CheckCircle,
  XCircle,
  Phone,
  ShieldCheck,
  Check,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getAdminRider, updateAdminRiderApproval } from '@/lib/api/admin';
import { RiderAdmin } from '@/types/rider';

export default function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ riderId: string }>;
}) {
  const resolvedParams = use(params);
  const [rider, setRider] = useState<RiderAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchRider = async () => {
      try {
        const data = await getAdminRider(resolvedParams.riderId);
        setRider(data);
      } catch (err) {
        console.error('Failed to load rider', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRider();
  }, [resolvedParams.riderId]);

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!rider) return;
    try {
      await updateAdminRiderApproval(rider.id, { approval_status: status });
      setRider((prev) => (prev ? { ...prev, approval_status: status } : null));
      setActionSuccess(`Courier KYC ${status === 'approved' ? 'Approved' : 'Rejected'}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update approval', err);
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isFloatBreached = (rider?.pending_cash_owed || 0) > (rider?.max_cash_float_limit || 15000);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title={rider?.name || 'Courier KYC File'}
        description="Official CNIC, driving license verification, vehicle registration, and COD cash float control."
        actions={
          <Link
            href="/admin/riders"
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Back to Fleet</span>
          </Link>
        }
      />

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        {actionSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle size={16} weight="bold" className="text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/3" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        ) : rider ? (
          <div className="space-y-6">
            {/* Courier Profile Header */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xl uppercase shrink-0">
                  {rider.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      {rider.name}
                    </h2>
                    <StatusBadge status={rider.approval_status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                    <span>CNIC: {rider.cnic_number}</span>
                    <span>•</span>
                    <span>Phone: {rider.phone_number}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {rider.approval_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApproval('rejected')}
                      className="px-3.5 py-2 text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApproval('approved')}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Check size={14} weight="bold" />
                      <span>Approve Courier</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Financial & Float Guard Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Courier Wallet Balance</span>
                  <Wallet size={16} className="text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {formatPKR(rider.wallet_balance)}
                </div>
                <p className="text-xs text-slate-500">
                  100% of customer delivery fees credited directly to courier.
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl shadow-xs space-y-2 border ${
                  isFloatBreached
                    ? 'bg-rose-50/40 border-rose-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>COD Cash in Hand (Unremitted)</span>
                  <ShieldWarning
                    size={16}
                    className={isFloatBreached ? 'text-rose-600' : 'text-slate-400'}
                  />
                </div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    isFloatBreached ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {formatPKR(rider.pending_cash_owed)}
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Float Limit: PKR {rider.max_cash_float_limit || 15000}</span>
                  {isFloatBreached && (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                      Dispatch Suspended
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KYC DOCUMENT IMAGES (CNIC Front, Back, License) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  KYC Verification Documents
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect official government identification and motorcycle driving license.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* CNIC Front */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">CNIC Front Side</div>
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rider.cnic_front_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'}
                      alt="CNIC Front"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                    />
                  </div>
                </div>

                {/* CNIC Back */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">CNIC Back Side</div>
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rider.cnic_back_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'}
                      alt="CNIC Back"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                    />
                  </div>
                </div>

                {/* Driving License */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">Motorcycle License</div>
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rider.license_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600'}
                      alt="Driving License"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Registered Vehicle Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Vehicle Category</span>
                  <span className="font-semibold text-slate-800">{rider.vehicle_type || 'Motorcycle'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registration Plate</span>
                  <span className="font-mono font-bold text-slate-800">{rider.vehicle_registration || 'KHI-7890'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Completed Deliveries</span>
                  <span className="font-mono font-bold text-slate-800">{rider.completed_deliveries_count || 384}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer Rating</span>
                  <span className="font-mono font-bold text-amber-600">★ {rider.rating || 4.9}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
