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
  TShirt,
  Package,
  HardHat,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getAdminRider, updateAdminRiderApproval, getRiderKit, updateRiderKit, updateAdminRiderStatus } from '@/lib/api/admin';
import { RiderAdmin, RiderKitDetails } from '@/types/rider';

export default function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ riderId: string }>;
}) {
  const resolvedParams = use(params);
  const [rider, setRider] = useState<RiderAdmin | null>(null);
  const [kit, setKit] = useState<RiderKitDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Kit Form Fields
  const [depositPaid, setDepositPaid] = useState(false);
  const [shirtsIssued, setShirtsIssued] = useState(0);
  const [boxIssued, setBoxIssued] = useState(false);
  const [shirtSerials, setShirtSerials] = useState('');
  const [boxSerial, setBoxSerial] = useState('');
  const [helmetSerial, setHelmetSerial] = useState('');
  const [isKitSaving, setIsKitSaving] = useState(false);

  useEffect(() => {
    const fetchRiderData = async () => {
      try {
        const [riderData, kitData] = await Promise.all([
          getAdminRider(resolvedParams.riderId),
          getRiderKit(resolvedParams.riderId),
        ]);
        setRider(riderData);
        if (kitData) {
          setKit(kitData);
          setDepositPaid(kitData.kit_deposit_paid ?? false);
          setShirtsIssued(kitData.kit_shirts_issued ?? 0);
          setBoxIssued(kitData.kit_box_issued ?? false);
          setShirtSerials(
            kitData.shirt_serial_numbers && kitData.shirt_serial_numbers.length > 0
              ? kitData.shirt_serial_numbers.join(', ')
              : kitData.shirt_serial_number || ''
          );
          setBoxSerial(kitData.box_serial_number || '');
          setHelmetSerial(kitData.helmet_serial_number || '');
        }
      } catch (err) {
        console.error('Failed to load rider details', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRiderData();
  }, [resolvedParams.riderId]);

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!rider) return;
    try {
      await updateAdminRiderApproval(rider.id, { approval_status: status });
      setRider((prev) => (prev ? { ...prev, approval_status: status } : null));
      setActionSuccess(`Rider KYC ${status === 'approved' ? 'Approved' : 'Rejected'}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update approval', err);
    }
  };

  const handleToggleActive = async () => {
    if (!rider) return;
    try {
      const nextActive = !rider.is_active;
      await updateAdminRiderStatus(rider.id, { is_active: nextActive });
      setRider((prev) => (prev ? { ...prev, is_active: nextActive, is_online: nextActive ? prev.is_online : false } : null));
      setActionSuccess(`Rider account ${nextActive ? 'activated' : 'suspended'}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to toggle active status', err);
    }
  };

  const handleToggleOnline = async () => {
    if (!rider) return;
    try {
      const nextOnline = !rider.is_online;
      await updateAdminRiderStatus(rider.id, { is_online: nextOnline });
      setRider((prev) => (prev ? { ...prev, is_online: nextOnline } : null));
      setActionSuccess(`Rider dispatch forced ${nextOnline ? 'ONLINE' : 'OFFLINE'}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to toggle online status', err);
    }
  };

  const handleSaveKit = async () => {
    if (!rider) return;
    setIsKitSaving(true);
    try {
      const serialList = shirtSerials
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await updateRiderKit(rider.id, {
        kit_deposit_paid: depositPaid,
        kit_shirts_issued: Number(shirtsIssued),
        kit_box_issued: boxIssued,
        shirt_serial_numbers: serialList.length > 0 ? serialList : null,
        shirt_serial_number: serialList.length > 0 ? serialList.join(', ') : null,
        box_serial_number: boxSerial.trim() || null,
        helmet_serial_number: helmetSerial.trim() || null,
      });

      setKit(updated);
      setActionSuccess('Kit handover and security deposit updated successfully!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error('Failed to save kit information', err);
    } finally {
      setIsKitSaving(false);
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
        title={rider?.name || 'Rider KYC File'}
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
            {/* Rider Profile Header */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xl uppercase shrink-0">
                  {rider.name.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      {rider.name}
                    </h2>
                    <StatusBadge status={rider.approval_status} />
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        rider.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {rider.is_active ? 'Account Active' : 'Account Suspended'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        rider.is_online
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${rider.is_online ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                      <span>{rider.is_online ? 'Live Online' : 'Offline'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                    <span>CNIC: {rider.cnic_number}</span>
                    <span>•</span>
                    <span>Phone: {rider.phone_number}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Online / Offline Dispatch Toggle */}
                <button
                  onClick={handleToggleOnline}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    rider.is_online
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={rider.is_online ? 'Force rider offline to stop new dispatches' : 'Set rider online for order dispatches'}
                >
                  {rider.is_online ? 'Force Offline' : 'Set Online'}
                </button>

                {/* Account Active / Suspend Toggle */}
                <button
                  onClick={handleToggleActive}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    rider.is_active
                      ? 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50'
                      : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {rider.is_active ? 'Suspend Account' : 'Reactivate Account'}
                </button>

                {rider.approval_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApproval('rejected')}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproval('approved')}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check size={14} weight="bold" />
                      <span>Approve</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Financial & Float Guard Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Rider Wallet Balance</span>
                  <Wallet size={16} className="text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {formatPKR(rider.wallet_balance)}
                </div>
                <p className="text-xs text-slate-500">
                  90% of customer delivery fees credited to rider (10% commission split).
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
                  <span>{rider.max_cash_float_limit ? `Float Limit: ${formatPKR(rider.max_cash_float_limit)}` : 'Standard Float Limit'}</span>
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
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative flex items-center justify-center">
                    {rider.cnic_front_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rider.cnic_front_url}
                        alt="CNIC Front"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 p-4 text-center">
                        <IdentificationCard size={32} />
                        <span className="text-[11px] font-medium">Document Not Provided</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CNIC Back */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">CNIC Back Side</div>
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative flex items-center justify-center">
                    {rider.cnic_back_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rider.cnic_back_url}
                        alt="CNIC Back"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 p-4 text-center">
                        <IdentificationCard size={32} />
                        <span className="text-[11px] font-medium">Document Not Provided</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driving License */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">Motorcycle License</div>
                  <div className="aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative flex items-center justify-center">
                    {rider.license_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rider.license_url}
                        alt="Driving License"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 p-4 text-center">
                        <IdentificationCard size={32} />
                        <span className="text-[11px] font-medium">License Not Provided</span>
                      </div>
                    )}
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
                  <span className="font-semibold text-slate-800">{rider.vehicle_type || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registration Plate</span>
                  <span className="font-mono font-bold text-slate-800">{rider.vehicle_registration || 'Not Registered'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Completed Deliveries</span>
                  <span className="font-mono font-bold text-slate-800">{rider.completed_deliveries_count ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer Rating</span>
                  <span className="font-mono font-bold text-amber-600">
                    {rider.rating ? `★ ${rider.rating}` : 'Unrated'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rider Kit & Inventory Handover Card */}
            <div id="kit" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5 scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package size={18} className="text-slate-700" />
                      <span>Kit Deposit & Accessories Handover</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Going online requires: Rs. 5,000 security deposit, ≥2 official shirts, and 1 delivery box.
                  </p>
                </div>

                <div>
                  {kit?.kit_completed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={14} weight="bold" />
                      <span>Kit Complete (Online Allowed)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <ShieldWarning size={14} weight="bold" />
                      <span>Kit Incomplete (Online Blocked)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Deposit Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={depositPaid}
                    onChange={(e) => setDepositPaid(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Rs. 5,000 Cash Security Deposit Received at Outlet
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Rider deposited cash for company inventory. Required for dispatch activation.
                    </div>
                    {kit?.kit_deposit_date && (
                      <div className="text-[11px] font-mono text-emerald-700 mt-1">
                        Deposit recorded: {new Date(kit.kit_deposit_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Items & Serials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Shirts */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <TShirt size={16} className="text-slate-600" />
                    <span>Uniform Shirts</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Shirts Issued (min. 2 required)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={shirtsIssued}
                      onChange={(e) => setShirtsIssued(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Shirt Serials (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SHT-101, SHT-102"
                      value={shirtSerials}
                      onChange={(e) => setShirtSerials(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Delivery Box */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Package size={16} className="text-slate-600" />
                    <span>Delivery Box</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={boxIssued}
                      onChange={(e) => setBoxIssued(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">1 Insulated Box Issued</span>
                  </label>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Box Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BOX-8821"
                      value={boxSerial}
                      onChange={(e) => setBoxSerial(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Helmet (Optional) */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <HardHat size={16} className="text-slate-600" />
                    <span>Safety Helmet (Optional)</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Helmet Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HLM-441"
                      value={helmetSerial}
                      onChange={(e) => setHelmetSerial(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 pt-3">
                    Safety equipment tracked for outlet inventory audits.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveKit}
                  disabled={isKitSaving}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} weight="bold" />
                  <span>{isKitSaving ? 'Saving Kit...' : 'Save & Update Kit Status'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
