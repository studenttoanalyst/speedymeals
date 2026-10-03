'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('SpeedyMeals Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          An unexpected error occurred while loading this page. Our team has been notified.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
