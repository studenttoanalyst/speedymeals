'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChefHat, EnvelopeSimple, ArrowRight, WarningCircle, CheckCircle, ArrowLeft } from '@phosphor-icons/react';
import { requestRestaurantForgotPassword } from '@/lib/auth';

export default function RestaurantForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await requestRestaurantForgotPassword(email);
      setSuccess(res.message || 'Password reset instructions have been generated.');
      if (res.reset_token) {
        setDevResetToken(res.reset_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/70">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/restaurant/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>Back to Restaurant Login</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
          <div>
            <div className="font-bold text-xl tracking-tight text-slate-900">
              SPEEDY<span className="text-rose-600">MEALS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reset Restaurant Password
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ChefHat size={22} weight="bold" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
            {devResetToken && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60">
                <p className="text-[11px] text-emerald-700 font-mono mb-2">Development Reset Token generated:</p>
                <Link
                  href={`/restaurant/reset-password?token=${devResetToken}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  <span>Continue to Reset Password</span>
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
            )}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Enter your registered restaurant email address. We will generate a password reset link for you.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Restaurant Email
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
