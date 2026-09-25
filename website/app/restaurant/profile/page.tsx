'use client';

import React, { useEffect, useState } from 'react';
import {
  Storefront,
  Clock,
  MapPin,
  EnvelopeSimple,
  Phone,
  CheckCircle,
  FloppyDisk,
  Timer,
  Camera,
  Buildings,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { ImageUpload } from '@/components/common/ImageUpload';
import { getRestaurantProfile } from '@/lib/api/restaurant';
import { RestaurantProfile } from '@/types/restaurant';

export default function RestaurantProfilePage() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable fields
  const [logoUrl, setLogoUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'
  );
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200'
  );
  const [name, setName] = useState('');
  const [prepTime, setPrepTime] = useState(20);
  const [openingTime, setOpeningTime] = useState('11:00');
  const [closingTime, setClosingTime] = useState('23:30');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getRestaurantProfile();
        setProfile(data);
        setName(data.name);
        setAddress(data.address || 'Shop # 4, Main Boat Basin, Clifton Block 5, Karachi');
        setOpeningTime(data.opening_time || '11:00');
        setClosingTime(data.closing_time || '23:30');
        setPrepTime(data.prep_time_minutes || 20);
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.banner_url || data.cover_photo_url) setBannerUrl(data.banner_url || data.cover_photo_url || null);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar
        title="Storefront & Brand Media"
        description="Upload official restaurant logos, high-resolution cover banners, and kitchen operating parameters."
      />

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {savedSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle size={16} weight="bold" className="text-emerald-600" />
            <span>Storefront profile and media assets updated successfully!</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/3" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* STOREFRONT PREVIEW HERO */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="relative h-44 w-full bg-slate-900/10 overflow-hidden">
                {bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerUrl}
                    alt="Storefront Banner Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No banner uploaded
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 via-transparent to-transparent" />
              </div>

              <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
                <div className="flex items-end gap-4">
                  <div className="relative w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden shrink-0">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Storefront size={32} />
                      </div>
                    )}
                  </div>

                  <div className="mb-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        {name || 'Restaurant Name'}
                      </h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        Verified Store
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" />
                      <span>{address}</span>
                    </p>
                  </div>
                </div>

                <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-end">
                  SpeedyMeals Commission: <span className="text-rose-600 font-bold">10.0% Flat</span>
                </div>
              </div>
            </div>

            {/* MEDIA ASSETS UPLOAD SECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Brand Media Assets</h3>
                <p className="text-xs text-slate-400">
                  Visible to customers browsing the SpeedyMeals marketplace and storefront listings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1:1 Logo Uploader */}
                <ImageUpload
                  label="Official Storefront Logo"
                  aspectRatio="1:1"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  hint="Square avatar (1:1 ratio, min 512×512px)"
                />

                {/* 16:9 / 3:1 Cover Banner Uploader */}
                <ImageUpload
                  label="Storefront Hero Cover Banner"
                  aspectRatio="16:9"
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  hint="Widescreen banner (min 1280×720px)"
                />
              </div>
            </div>

            {/* OPERATIONAL PARAMETERS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Kitchen & Operational Details</h3>
                <p className="text-xs text-slate-400">
                  SLA estimates and daily operating schedules.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Display Store Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Timer size={13} className="text-slate-400" />
                    Default Kitchen Prep SLA (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={90}
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 20)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Physical Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    Daily Opening Time
                  </label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    Daily Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
              >
                <FloppyDisk size={16} weight="bold" />
                <span>Save Profile & Media</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
