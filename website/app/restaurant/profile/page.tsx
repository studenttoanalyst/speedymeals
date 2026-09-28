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
import { getRestaurantProfile, updateRestaurantProfile } from '@/lib/api/restaurant';
import { RestaurantProfile } from '@/types/restaurant';

export default function RestaurantProfilePage() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable fields
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
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
        setAddress(data.address || '');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateRestaurantProfile({
        name,
        address,
        opening_time: openingTime,
        closing_time: closingTime,
        prep_time_minutes: prepTime,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        cover_photo_url: bannerUrl,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Topbar title="Restaurant Profile & Photos" />

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {savedSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle size={16} weight="bold" className="text-emerald-600" />
            <span>Restaurant profile and photos updated successfully!</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/3" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* FACEBOOK-STYLE PROFILE HERO (Aspect Ratio Optimized + Overlapping Avatar) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {/* Cover Banner (16:9 / 2:1 widescreen frame to fit landscape photos naturally) */}
              <div className="relative w-full aspect-[2/1] sm:aspect-[2.3/1] md:aspect-[2.5/1] max-h-72 sm:max-h-80 bg-slate-900/10 overflow-hidden">
                {bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerUrl}
                    alt="Cover Preview"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No cover photo uploaded (Recommended wide photo, at least 1280x640px)
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Profile Bar with Overlapping Avatar */}
              <div className="px-6 sm:px-8 pb-6 pt-0 relative bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Left: Avatar (pulls up into cover) & Identity (fully on clean white background) */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
                    {/* Only the avatar overlaps the cover photo */}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white border-4 border-white shadow-xl overflow-hidden shrink-0 -mt-16 sm:-mt-20 z-10">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Storefront size={44} />
                        </div>
                      )}
                    </div>

                    {/* Identity sits cleanly and fully on the white background */}
                    <div className="pt-2 sm:pt-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                          {name || 'Restaurant Name'}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          <CheckCircle size={13} weight="fill" className="text-emerald-500" />
                          Verified Restaurant
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                        <MapPin size={14} className="text-rose-500 shrink-0" />
                        <span>{address}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                        <span>Hours: {openingTime} - {closingTime}</span>
                        <span>·</span>
                        <span>Cooking Time: {prepTime} mins</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Badges & Rates */}
                  <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 pt-2 md:pt-0">
                    <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs">
                      Platform Fee: <span className="text-rose-600 font-bold">10.0% Flat</span>
                    </div>
                    <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      Rider Auto-Dispatch: On
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MEDIA ASSETS UPLOAD SECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Logo & Cover Photos</h3>
                <p className="text-xs text-slate-400">
                  Upload your square restaurant logo and wide cover banner photo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1:1 Logo Uploader */}
                <ImageUpload
                  label="Restaurant Logo"
                  aspectRatio="1:1"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  hint="Square photo (1:1 ratio, min 512×512px)"
                />

                {/* 16:9 / 3:1 Cover Banner Uploader */}
                <ImageUpload
                  label="Restaurant Cover Photo"
                  aspectRatio="16:9"
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  hint="Wide banner photo (min 1280×720px)"
                />
              </div>
            </div>

            {/* OPERATIONAL PARAMETERS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Cooking Time & Daily Schedule</h3>
                <p className="text-xs text-slate-400">
                  Cooking time and daily store schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Restaurant Name</label>
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
                    Cooking Time / Food Prep (Minutes)
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
                disabled={isSaving}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FloppyDisk size={16} weight="bold" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
