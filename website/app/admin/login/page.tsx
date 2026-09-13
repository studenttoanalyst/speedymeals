'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, EnvelopeSimple, ArrowRight, WarningCircle } from '@phosphor-icons/react';
import { loginAdmin } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@speedymeals.pk');
  const [password, setPassword] = useState('Admin@123456');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await loginAdmin({ email, password });
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or server error.');
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
              Platform Administration
            </p>
          </div>
          <div className="p-2 border border-line bg-paper-off text-ink">
            <ShieldCheck size={20} weight="bold" />
          </div>
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1.5 font-semibold">
              Administrator Email
            </label>
            <div className="relative">
              <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@speedymeals.pk"
                className="w-full pl-9 pr-3 py-2 text-sm bg-paper border border-line text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink font-sans transition-colors"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1.5 font-semibold">
              Master Password
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
                <span>Sign In to Console</span>
                <ArrowRight size={14} weight="bold" />
              </>
            )}
          </button>
        </form>

        {/* Security / Dev Hint Footer */}
        <div className="mt-8 pt-4 border-t border-line text-center">
          <p className="font-mono text-[11px] text-ink-soft">
            FastAPI Auth Endpoint: <span className="font-bold text-ink">POST /auth/admin/login</span>
          </p>
          <p className="font-mono text-[10px] text-ink-soft/70 mt-1">
            Protected internal route. All operations are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
