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

    const savedEmail = localStorage.getItem('sm_remembered_admin_email');
    if (savedEmail) {
      if (savedEmail === 'admin@speedymeals.com' || savedEmail === 'admin@speedymealservices.com') {
        localStorage.removeItem('sm_remembered_admin_email');
      } else {
        setEmail(savedEmail);
      }
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
      const tokens = await loginAdmin({ email, password });
      if (tokens.must_change_password) {
        router.push('/admin/change-initial-password');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-ink-50/70">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800 transition-colors font-medium"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>Return to SpeedyMeals Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-ink-200 rounded-md shadow-1 p-8">
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-ink-100">
          <div>
            <div className="font-bold text-xl tracking-tight text-ink-900">
              SPEEDY<span className="text-red-600">MEALS</span>
            </div>
            <p className="text-xs text-ink-400 mt-0.5">
              Admin Portal
            </p>
          </div>
          <div className="w-10 h-10 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldCheck size={22} weight="bold" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Admin Email
            </label>
            <div className="relative">
              <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="admin@speedymealservices.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
              />
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-ink-700">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 focus:outline-hidden transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Link
              href="/admin/forgot-password"
              className="absolute right-0 top-0 text-ink-400 hover:text-red-600 transition-colors font-medium text-2xs"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-sm shadow-1 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{isLoading ? 'Signing in...' : 'Log In to Admin Portal'}</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
          <span>Are you a Merchant Partner?</span>
          <Link
            href="/restaurant/login"
            className="text-red-600 font-semibold hover:underline"
          >
            Partner Portal Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
