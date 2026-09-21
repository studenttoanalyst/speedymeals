'use client';

import React, { useEffect, useState } from 'react';
import {
  Storefront,
  Clock,
  MapPin,
  EnvelopeSimple,
  Phone,
  Percent,
  CheckCircle,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { getRestaurantProfile } from '@/lib/api/restaurant';
import { RestaurantProfile } from '@/types/restaurant';

export default function RestaurantProfilePage() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getRestaurantProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Store Information & Profile"
        description="Review dining brand credentials, operating schedule, and contracted commission tier."
      />

      <div className="p-6 max-w-4xl space-y-6">
        {isLoading ? (
          <div className="p-8 border border-line bg-paper animate-pulse space-y-4">
            <div className="h-6 bg-line/50 w-1/3" />
            <div className="h-4 bg-line/50 w-1/2" />
          </div>
        ) : (
          profile && (
            <div className="space-y-6">
              {/* Brand Header */}
              <div className="bg-paper border border-line p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 border border-line bg-paper-off flex items-center justify-center text-red">
                    <Storefront size={28} weight="bold" />
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-xl text-ink">
                      {profile.name}
                    </h2>
                    <p className="font-mono text-xs text-ink-soft mt-0.5">
                      Merchant ID: #{profile.id.slice(0, 8)} • <span className="text-[#1E7E34] font-semibold uppercase">Verified Partner</span>
                    </p>
                  </div>
                </div>

                <div className="font-mono text-xs px-3 py-1.5 border border-line bg-paper-off text-ink">
                  Commission: <span className="font-bold text-red">{profile.commission_rate}%</span>
                </div>
              </div>

              {/* Detail Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact & Credentials */}
                <div className="bg-paper border border-line p-5 space-y-4">
                  <div className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                    Contact & Authentication
                  </div>
                  <div className="space-y-3 text-xs font-sans">
                    <div className="flex items-center gap-2 text-ink">
                      <EnvelopeSimple size={16} className="text-ink-soft shrink-0" />
                      <div>
                        <span className="text-ink-soft block text-[10px] font-mono uppercase">Login Email</span>
                        <span className="font-semibold">{profile.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-ink">
                      <Phone size={16} className="text-ink-soft shrink-0" />
                      <div>
                        <span className="text-ink-soft block text-[10px] font-mono uppercase">OTP Contact Number</span>
                        <span className="font-mono font-semibold">{profile.phone_number}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Schedule */}
                <div className="bg-paper border border-line p-5 space-y-4">
                  <div className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                    Kitchen Timings
                  </div>
                  <div className="space-y-3 text-xs font-sans">
                    <div className="flex items-center gap-2 text-ink">
                      <Clock size={16} className="text-ink-soft shrink-0" />
                      <div>
                        <span className="text-ink-soft block text-[10px] font-mono uppercase">Daily Operating Hours</span>
                        <span className="font-mono font-semibold">
                          {profile.opening_time || '11:00'} — {profile.closing_time || '23:30'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-ink">
                      <CheckCircle size={16} className="text-[#1E7E34] shrink-0" />
                      <div>
                        <span className="text-ink-soft block text-[10px] font-mono uppercase">Dispatch Readiness</span>
                        <span className="font-semibold">Automatic Dispatch Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Physical Location */}
                <div className="md:col-span-2 bg-paper border border-line p-5 space-y-4">
                  <div className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                    Kitchen Physical Address
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-sans">
                    <MapPin size={18} className="text-red shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-ink leading-relaxed">
                        {profile.address || 'Shop # 4, Main Boat Basin, Clifton Block 5, Karachi'}
                      </div>
                      <div className="font-mono text-[11px] text-ink-soft mt-1">
                        GPS Coordinates: {profile.latitude ?? 24.8234}, {profile.longitude ?? 67.0345} (Used for nearest-rider Haversine calculation)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
