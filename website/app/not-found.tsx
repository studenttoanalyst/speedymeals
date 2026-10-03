import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="text-4xl font-extrabold text-rose-600 mb-2">404</div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          The requested route does not exist or may have been relocated.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors"
        >
          Return to SpeedyMeals Home
        </Link>
      </div>
    </div>
  );
}
