'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Storefront,
  Lock,
  EnvelopeSimple,
  Phone,
  ArrowRight,
  WarningCircle,
  CheckCircle,
  ArrowLeft,
  ChefHat,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import {
  loginRestaurant,
  requestRestaurantOTP,
  verifyRestaurantOTP,
  getStoredRole,
  getStoredAccessToken,
} from '@/lib/auth';

export default function RestaurantLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'password' | 'otp'>('password');

  // Password Login State
  const [email, setEmail] = useState('contact@karachibiryani.pk');
  const [password, setPassword] = useState('Partner@123');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login State
  const [phoneNumber, setPhoneNumber] = useState('3001112233');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-redirect to dashboard if previously logged in
  useEffect(() => {
    const role = getStoredRole();
    const token = getStoredAccessToken();
    if (role === 'restaurant' && token) {
      router.replace('/restaurant/dashboard');
    }

    const savedEmail = localStorage.getItem('sm_remembered_restaurant_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
    const savedPhone = localStorage.getItem('sm_remembered_restaurant_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }
  }, [router]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sm_remembered_restaurant_email', email);
      }
      await loginRestaurant({ email, password });
      router.push('/restaurant/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid partner credentials or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || cooldown > 0) return;

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await requestRestaurantOTP({ phone_number: phoneNumber });
      setOtpSent(true);
      setCooldown(45);
      setSuccessMsg(res.message || 'OTP sent successfully to your registered phone.');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP. Ensure your phone number is registered.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setError(null);
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sm_remembered_restaurant_phone', phoneNumber);
      }
      await verifyRestaurantOTP({ phone_number: phoneNumber, otp_code: otpCode });
      router.push('/restaurant/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/70">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>Return to SpeedyMeals Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        {/* Branding Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
          <div>
            <div className="font-bold text-xl tracking-tight text-slate-900">
              SPEEDY<span className="text-rose-600">MEALS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Restaurant Partner Portal
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ChefHat size={22} weight="bold" />
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              tab === 'password'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('otp');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              tab === 'otp'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mobile OTP Login
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form 1: Password */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Storefront Email
              </label>
              <div className="relative">
                <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@karachibiryani.pk"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Store Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating Partner...' : 'Enter Kitchen Console'}</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </form>
        )}

        {/* Form 2: Mobile OTP */}
        {tab === 'otp' && (
          <div className="space-y-4 text-xs">
            {!otpSent ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Store Registered Mobile (Pakistan)
                  </label>
                  <div className="flex gap-2">
                    <div className="px-3 py-2.5 border border-slate-200 bg-slate-100 rounded-xl font-mono text-slate-600 font-semibold">
                      +92
                    </div>
                    <div className="relative flex-1">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="3001112233"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !phoneNumber}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Sending SMS OTP...' : 'Send Verification OTP'}</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Enter 6-Digit OTP</label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 4}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying OTP...' : 'Verify OTP & Log In'}</span>
                  <ArrowRight size={14} weight="bold" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={handleRequestOTP}
                    className="text-slate-400 hover:text-slate-700 text-[11px] disabled:opacity-50 font-medium"
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP to Mobile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Are you a Platform Admin?</span>
          <Link
            href="/admin/login"
            className="text-rose-600 font-semibold hover:underline"
          >
            Admin Portal Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
