'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Storefront, Lock, EnvelopeSimple, Phone, ArrowRight, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { loginRestaurant, requestRestaurantOTP, verifyRestaurantOTP } from '@/lib/auth';

export default function RestaurantLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'password' | 'otp'>('password');

  // Password Login State
  const [email, setEmail] = useState('contact@karachibiryani.pk');
  const [password, setPassword] = useState('Partner@123');

  // OTP Login State
  const [phoneNumber, setPhoneNumber] = useState('3001112233');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setSuccessMsg(res.message || 'OTP sent successfully to your mobile.');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP. Ensure your number is registered.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await verifyRestaurantOTP({ phone_number: phoneNumber, otp_code: otpCode });
      router.push('/restaurant/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper-off">
      <div
        className="w-full max-w-md bg-paper border border-line shadow-sm p-8"
        style={{ borderRadius: '0px' }}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red inline-block" style={{ borderRadius: '0px' }} />
              <span className="font-display font-black text-xl tracking-wider text-ink">
                SPEEDY<span className="text-red">MEALS</span>
              </span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft mt-1">
              Restaurant Partner Portal
            </p>
          </div>
          <div className="p-2 border border-line bg-paper-off text-ink">
            <Storefront size={20} weight="bold" />
          </div>
        </div>

        {/* Tab Toggle: Password vs OTP */}
        <div className="grid grid-cols-2 gap-0 border border-line mb-6" style={{ borderRadius: '0px' }}>
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
              tab === 'password' ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:text-ink'
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
            className={`py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
              tab === 'otp' ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:text-ink'
            }`}
          >
            Mobile OTP
          </button>
        </div>

        {error && (
          <div
            className="mb-6 p-3 border border-[#F5C2BC] bg-[#FDF0EE] text-[#C92A2A] text-xs font-mono flex items-start gap-2"
            style={{ borderRadius: '0px' }}
          >
            <WarningCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="mb-6 p-3 border border-[#BCE4C7] bg-[#EBF7EE] text-[#1E7E34] text-xs font-mono flex items-start gap-2"
            style={{ borderRadius: '0px' }}
          >
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form A: Password Login */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1.5 font-semibold">
                Partner Email
              </label>
              <div className="relative">
                <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@restaurant.pk"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-paper border border-line text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink font-sans transition-colors"
                  style={{ borderRadius: '0px' }}
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1.5 font-semibold">
                Portal Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-paper border border-line text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink font-sans transition-colors"
                  style={{ borderRadius: '0px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 font-mono text-xs font-semibold uppercase tracking-wider bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderRadius: '0px' }}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-paper border-t-transparent animate-spin inline-block" />
              ) : (
                <>
                  <span>Sign In as Restaurant</span>
                  <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Form B: Phone + OTP Login */}
        {tab === 'otp' && (
          <div className="space-y-4">
            <form onSubmit={handleRequestOTP}>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1.5 font-semibold">
                Registered Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink font-semibold">
                    +92
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="3001234567"
                    className="w-full pl-12 pr-3 py-2 text-sm bg-paper border border-line text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink font-mono transition-colors"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || cooldown > 0}
                  className="py-2 px-3 font-mono text-xs font-semibold border border-line bg-paper-off hover:bg-paper text-ink transition-colors disabled:opacity-50 shrink-0"
                  style={{ borderRadius: '0px' }}
                >
                  {cooldown > 0 ? `${cooldown}s` : otpSent ? 'Resend' : 'Send Code'}
                </button>
              </div>
            </form>

            {otpSent && (
              <form onSubmit={handleVerifyOTP} className="space-y-4 pt-2 border-t border-line">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1.5 font-semibold">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] py-2.5 text-lg font-mono font-bold bg-paper border border-line text-ink focus:outline-none focus:border-ink transition-colors"
                    style={{ borderRadius: '0px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full py-2.5 px-4 font-mono text-xs font-semibold uppercase tracking-wider bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ borderRadius: '0px' }}
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-paper border-t-transparent animate-spin inline-block" />
                  ) : (
                    <>
                      <span>Verify & Access Kitchen</span>
                      <ArrowRight size={14} weight="bold" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-line text-center">
          <p className="font-mono text-[11px] text-ink-soft">
            FastAPI Auth: <span className="font-bold text-ink">POST /auth/restaurant/login</span>
          </p>
          <p className="font-mono text-[10px] text-ink-soft/70 mt-1">
            Need partner credentials? Contact SpeedyMeals Platform Support.
          </p>
        </div>
      </div>
    </div>
  );
}
