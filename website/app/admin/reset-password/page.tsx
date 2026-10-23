'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeSlash, ArrowRight, WarningCircle, CheckCircle, ArrowLeft, Key } from '@phosphor-icons/react';
import { resetAdminPassword } from '@/lib/auth';

function AdminResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetAdminPassword(token, newPassword);
      setSuccess(res.message || 'Password successfully reset.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-ink-200 rounded-md shadow-1 p-8">
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-ink-100">
        <div>
          <div className="font-bold text-xl tracking-tight text-ink-900">
            SPEEDY<span className="text-red-600">MEALS</span>
          </div>
          <p className="text-xs text-ink-400 mt-0.5">
            Set Your New Password
          </p>
        </div>
        <div className="w-10 h-10 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
          <Key size={22} weight="bold" />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2">
          <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-md border border-green-200 bg-green-50 text-green-800 text-xs space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-green-600" />
            <span>{success}</span>
          </div>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md text-xs transition-colors"
          >
            <span>Go to Admin Login</span>
            <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Reset Code
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste reset code from your email"
              className="w-full px-3 py-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-10 py-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Type New Password Again
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full pl-9 pr-10 py-2.5 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-sm shadow-1 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Resetting Password...' : 'Save New Password'}</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </form>
      )}
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-ink-50/70">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800 transition-colors font-medium"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-xs text-ink-500">Loading form...</div>}>
        <AdminResetPasswordForm />
      </Suspense>
    </div>
  );
}
