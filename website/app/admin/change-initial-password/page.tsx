'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, CheckCircle, WarningCircle, Eye, EyeSlash, ArrowRight } from '@phosphor-icons/react';
import { changeInitialPassword } from '@/lib/auth';

export default function AdminChangeInitialPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('Your new password must be different from your temporary password.');
      return;
    }

    setIsLoading(true);
    try {
      await changeInitialPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to rotate password. Please verify your current temporary password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/70">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
          <div>
            <div className="font-bold text-xl tracking-tight text-slate-900">
              SPEEDY<span className="text-rose-600">MEALS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Set Your New Password
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck size={22} weight="bold" />
          </div>
        </div>

        <div className="mb-6 p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-800 text-xs">
          <p className="font-semibold mb-1">First Login Notice</p>
          <p className="text-amber-700 leading-relaxed">
            Your account was created with a temporary password. Please choose your own secret password before continuing to the admin portal.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-center space-y-2">
            <CheckCircle size={32} weight="bold" className="mx-auto text-emerald-600 animate-bounce" />
            <h3 className="font-bold text-sm">Password Saved Successfully!</h3>
            <p className="text-xs text-emerald-700">
              Taking you to your admin dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Current Temporary Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                >
                  {showCurrent ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                >
                  {showNew ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Type New Password Again
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Saving Password...' : 'Save Password & Continue'}</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link
            href="/admin/login"
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            Cancel and return to login
          </Link>
        </div>
      </div>
    </div>
  );
}
