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
  Receipt,
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
  const [gstRate, setGstRate] = useState(0);
  const [includesGst, setIncludesGst] = useState(true);

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
        setGstRate(data.gst_rate ?? 0);
        setIncludesGst(data.prices_include_gst ?? true);
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
        gst_rate: gstRate,
        prices_include_gst: includesGst,
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
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar title="Merchant Profile & Photos" />

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {savedSuccess && (
          <div className="p-3.5 bg-green-50 border border-green-200 rounded-md text-xs font-semibold text-green-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle size={16} weight="bold" className="text-green-600" />
            <span>Merchant profile and photos updated successfully!</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-ink-200 rounded-md p-8 animate-pulse space-y-4">
            <div className="h-6 bg-ink-100 rounded w-1/3" />
            <div className="h-32 bg-ink-100 rounded-md" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* FACEBOOK-STYLE PROFILE HERO (Aspect Ratio Optimized + Overlapping Avatar) */}
            <div className="bg-white border border-ink-200 rounded-md overflow-hidden shadow-1">
              {/* Cover Banner (16:9 / 2:1 widescreen frame to fit landscape photos naturally) */}
              <div className="relative w-full aspect-[2/1] sm:aspect-[2.3/1] md:aspect-[2.5/1] max-h-72 sm:max-h-80 bg-ink-900/10 overflow-hidden">
                {bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerUrl}
                    alt="Cover Preview"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-ink-400">
                    No cover photo uploaded (Recommended wide photo, at least 1280x640px)
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-ink-950/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Profile Bar with Overlapping Avatar */}
              <div className="px-6 sm:px-8 pb-6 pt-0 relative bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Left: Avatar (pulls up into cover) & Identity (fully on clean white background) */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
                    {/* Only the avatar overlaps the cover photo */}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white border-4 border-white shadow-3 overflow-hidden shrink-0 -mt-16 sm:-mt-20 z-10">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-ink-100 flex items-center justify-center text-ink-400">
                          <Storefront size={44} />
                        </div>
                      )}
                    </div>

                    {/* Identity sits cleanly and fully on the white background */}
                    <div className="pt-2 sm:pt-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">
                          {name || 'Merchant Name'}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-0.5 rounded-xs bg-green-50 text-green-700 ring-1 ring-green-200">
                          <CheckCircle size={13} weight="fill" className="text-green-500" />
                          Verified Merchant
                        </span>
                      </div>
                      <p className="text-xs text-ink-600 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                        <MapPin size={14} className="text-red-500 shrink-0" />
                        <span>{address}</span>
                      </p>
                      <p className="text-2xs text-ink-500 font-mono flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                        <span>Hours: {openingTime} - {closingTime}</span>
                        <span>·</span>
                        <span>Cooking Time: {prepTime} mins</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Badges & Rates */}
                  <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 pt-2 md:pt-0">
                    <div className="text-xs font-semibold px-3 py-1.5 rounded-md bg-ink-50 text-ink-700 border border-ink-200 shadow-1">
                      Platform Fee: <span className="text-red-600 font-bold">10.0% Flat</span>
                    </div>
                    <div className="text-xs font-medium px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 shadow-1">
                      Rider Auto-Dispatch: On
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MEDIA ASSETS UPLOAD SECTION */}
            <div className="bg-white border border-ink-200 rounded-md p-6 shadow-1 space-y-5">
              <div className="border-b border-ink-100 pb-3">
                <h3 className="text-sm font-bold text-ink-900">Logo & Cover Photos</h3>
                <p className="text-xs text-ink-400">
                  Upload your square merchant logo and wide cover banner photo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1:1 Logo Uploader */}
                <ImageUpload
                  label="Merchant Logo"
                  aspectRatio="1:1"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  hint="Square photo (1:1 ratio, min 512×512px)"
                />

                {/* 16:9 / 3:1 Cover Banner Uploader */}
                <ImageUpload
                  label="Merchant Cover Photo"
                  aspectRatio="16:9"
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  hint="Wide banner photo (min 1280×720px)"
                />
              </div>
            </div>

            {/* OPERATIONAL PARAMETERS */}
            <div className="bg-white border border-ink-200 rounded-md p-6 shadow-1 space-y-5">
              <div className="border-b border-ink-100 pb-3">
                <h3 className="text-sm font-bold text-ink-900">Cooking Time & Daily Schedule</h3>
                <p className="text-xs text-ink-400">
                  Cooking time and daily store schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-ink-700">Merchant Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink-700 flex items-center gap-1">
                    <Timer size={13} className="text-ink-400" />
                    Cooking Time / Food Prep (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={90}
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 20)}
                    className="w-full p-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink-700">Physical Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1">
                  <label className="font-semibold text-ink-700 flex items-center gap-1">
                    <Clock size={13} className="text-ink-400" />
                    Daily Opening Time
                  </label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full p-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink-700 flex items-center gap-1">
                    <Clock size={13} className="text-ink-400" />
                    Daily Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full p-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900"
                  />
                </div>
              </div>
            </div>

            {/* TAX / GST SETTINGS */}
            <div className="bg-white border border-ink-200 rounded-md p-6 shadow-1 space-y-5">
              <div className="border-b border-ink-100 pb-3">
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <Receipt size={16} className="text-ink-400" />
                  Tax (GST) on Menu Prices
                </h3>
                <p className="text-xs text-ink-400">
                  Tell us whether the prices on your menu already include tax. Applies to new orders only;
                  existing orders keep the tax they were placed with.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-ink-700">GST / Sales Tax Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.01}
                    value={gstRate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setGstRate(Number.isNaN(v) ? 0 : Math.min(30, Math.max(0, v)));
                    }}
                    className="w-full p-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 font-mono font-bold"
                  />
                  <p className="text-2xs text-ink-400">Use the rate on your FBR / SRB registration. 0 = no tax charged.</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-semibold text-ink-700">Menu prices are</label>
                  <div role="radiogroup" aria-label="Menu price tax mode" className="grid grid-cols-2 gap-2">
                    {[
                      { value: true, title: 'Tax inclusive', hint: 'Price on menu is final. Tax is shown inside it on the receipt.' },
                      { value: false, title: 'Tax exclusive', hint: 'Tax is added on top of the menu price at checkout.' },
                    ].map((opt) => (
                      <button
                        key={opt.title}
                        type="button"
                        role="radio"
                        aria-checked={includesGst === opt.value}
                        onClick={() => setIncludesGst(opt.value)}
                        className={`text-left p-3 rounded-sm border transition-colors cursor-pointer ${
                          includesGst === opt.value
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : 'border-ink-200 bg-ink-50 text-ink-700 hover:border-ink-300'
                        }`}
                      >
                        <div className="font-bold">{opt.title}</div>
                        <div className="text-2xs opacity-80 pt-0.5">{opt.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {gstRate > 0 && (
                <div className="p-3 bg-ink-50 border border-ink-200 rounded-md text-2xs text-ink-600 font-mono">
                  {(() => {
                    const base = 1000;
                    const gst = includesGst ? base - base / (1 + gstRate / 100) : (base * gstRate) / 100;
                    const total = includesGst ? base : base + gst;
                    return `Example: Rs 1,000 menu item → customer pays Rs ${total.toFixed(2)} for food (GST Rs ${gst.toFixed(2)} ${includesGst ? 'included' : 'added'}).`;
                  })()}
                </div>
              )}
            </div>

            {/* SAVE BUTTON */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-sm text-xs font-semibold shadow-1 flex items-center gap-2 transition-colors cursor-pointer"
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
