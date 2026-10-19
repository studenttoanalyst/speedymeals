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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login State
  const [phoneNumber, setPhoneNumber] = useState('');
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
      if (savedEmail === 'contact@karachibiryani.pk') {
        localStorage.removeItem('sm_remembered_restaurant_email');
      } else {
        setEmail(savedEmail);
      }
    }
    const savedPhone = localStorage.getItem('sm_remembered_restaurant_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }

    if (typeof window !== 'undefined' && window.location.search.includes('expired=true')) {
      setError('Your session has expired. Please sign in with your credentials to refresh access.');
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
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sm_remembered_restaurant_email', email);
      }
      await loginRestaurant({ email, password });
      router.push('/restaurant/dashboard');
    } catch (err: any) {
      setSuccessMsg(null);
      setError(err.message || 'Invalid partner credentials or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!phoneNumber || cooldown > 0) return;

    setError(null);
    setSuccessMsg(null);
    setOtpCode(''); // Always clear code input field when sending/resending

    // Validate Pakistani mobile format client-side before invoking backend/gateway
    let clean = phoneNumber.trim().replace(/\D/g, '');
    if (clean.startsWith('92') && clean.length > 10) clean = clean.slice(2);
    while (clean.startsWith('0')) clean = clean.slice(1);

    if (!/^3[0-7]\d{8}$/.test(clean)) {
      setSuccessMsg(null);
      setError('Please enter a valid 10-digit Pakistani mobile number (e.g. 3341234567).');
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestRestaurantOTP({ phone_number: clean });
      setOtpSent(true);
      setCooldown(45);
      setError(null);
      setSuccessMsg(res.message || 'OTP sent successfully.');
    } catch (err: any) {
      setOtpCode('');
      setSuccessMsg(null);
      setError(err.message || 'Failed to request OTP. Ensure your phone number is registered.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setError(null);
    setSuccessMsg(null); // Remove "OTP sent successfully" disclaimer upon submission
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sm_remembered_restaurant_phone', phoneNumber);
      }
      await verifyRestaurantOTP({ phone_number: phoneNumber, otp_code: otpCode });
      router.push('/restaurant/dashboard');
    } catch (err: any) {
      setOtpCode(''); // Clear invalid OTP input so user can re-enter fresh
      setSuccessMsg(null); // Ensure "OTP sent successfully" is discarded
      setError(err.message || 'Incorrect OTP.');
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
          <span>Back to SpeedyMeals Home</span>
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
              Merchant Portal
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
              setOtpCode('');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-all font-semibold cursor-pointer ${
              tab === 'password'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('otp');
              setOtpCode('');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-all font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'otp'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Phone size={14} weight="bold" />
            <span>Mobile Code</span>
          </button>
        </div>

        {/* Strictly 1 disclaimer at a time: error overrides success message */}
        {error ? (
          <div className="mb-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : successMsg ? (
          <div className="mb-5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        ) : null}

        {/* Form 1: Password */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Merchant Email
              </label>
              <div className="relative">
                <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="karachibiryani@speedymeals.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
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
              <Link
                href="/restaurant/forgot-password"
                className="absolute right-0 top-0 text-slate-400 hover:text-rose-600 transition-colors font-medium text-[11px]"
              >
                Forgot password?
              </Link>
            </div>

            {/* Quick Demo Partner Login Card */}
            <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <ChefHat size={14} className="text-rose-600" weight="bold" />
                  <span>Demo Partner Account</span>
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-md uppercase">
                  Karachi Biryani
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-mono flex items-center justify-between">
                <span>karachibiryani@speedymeals.com</span>
                <span className="text-slate-400">Partner@123</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('karachibiryani@speedymeals.com');
                  setPassword('Partner@123');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-1.5 px-3 bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Fill Demo Credentials</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Logging In...' : 'Log In to Merchant Portal'}</span>
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
                    Registered Mobile Number
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
                        maxLength={11}
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value.replace(/\D/g, ''));
                          setOtpCode('');
                          setError(null);
                        }}
                        placeholder="3001234567"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || phoneNumber.length < 10}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Sending SMS Code...' : 'Send Login Code'}</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Enter 6-Digit Code</label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, ''));
                      setError(null);
                    }}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 4}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Verifying Code...' : 'Verify Code & Log In'}</span>
                  <ArrowRight size={14} weight="bold" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={() => handleRequestOTP()}
                    className="text-slate-400 hover:text-slate-700 text-[11px] disabled:opacity-50 font-medium cursor-pointer"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code by SMS'}
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
