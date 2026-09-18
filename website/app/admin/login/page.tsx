'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, EnvelopeSimple, ArrowRight, WarningCircle, ArrowLeft, Eye, EyeSlash } from '@phosphor-icons/react';
import { loginAdmin, getStoredRole, getStoredAccessToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect to dashboard if previously logged in
  useEffect(() => {
    const role = getStoredRole();
    const token = getStoredAccessToken();
    if (role === 'admin' && token) {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sm_remembered_admin_email', email);
      }
      await loginAdmin({ email, password });
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or server error.');
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
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
          <div>
            <div className="font-bold text-xl tracking-tight text-slate-900">
              SPEEDY<span className="text-rose-600">MEALS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Platform Administration Center
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldCheck size={22} weight="bold" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Administrator Email
            </label>
            <div className="relative">
              <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@speedymeals.pk"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Secret Password
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
            <span>{isLoading ? 'Verifying Admin Session...' : 'Authenticate as Admin'}</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Are you a Restaurant Partner?</span>
          <Link
            href="/restaurant/login"
            className="text-rose-600 font-semibold hover:underline"
          >
            Partner Portal Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
