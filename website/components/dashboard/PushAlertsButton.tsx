'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellRinging, BellSlash } from '@phosphor-icons/react';

import {
  PUSH_EVENT,
  enablePush,
  getPushState,
  onForegroundMessage,
  playChime,
  refreshPushRegistration,
  type PushState,
} from '@/lib/firebase/push';

interface Toast {
  title: string;
  body: string;
}

/**
 * Topbar control for order/system alerts (Firebase Cloud Messaging).
 * - Not configured / unsupported browser: renders nothing.
 * - Permission already granted: silently re-registers this browser on load.
 * - While the page is open, incoming alerts show a toast, play the chime (if
 *   enabled) and fire a `sm:push` window event so pages can refetch.
 */
export function PushAlertsButton() {
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await getPushState();
      if (cancelled) return;
      setState(current);
      if (current !== 'unsupported' && current !== 'unconfigured') {
        const refreshed = await refreshPushRegistration();
        if (!cancelled) setState(refreshed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== 'on') return;
    return onForegroundMessage((payload) => {
      playChime();
      window.dispatchEvent(new CustomEvent(PUSH_EVENT, { detail: payload.data ?? {} }));
      setToast({
        title: payload.notification?.title ?? 'New alert',
        body: payload.notification?.body ?? '',
      });
    });
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleEnable = useCallback(async () => {
    setBusy(true);
    try {
      setState(await enablePush());
      playChime(); // user gesture: also unlocks audio for later alerts
    } catch (err) {
      console.error('Could not enable push alerts', err);
    } finally {
      setBusy(false);
    }
  }, []);

  if (state === 'unsupported' || state === 'unconfigured') return null;

  const base =
    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-100 select-none';

  return (
    <>
      {state === 'on' ? (
        <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`} title="Order alerts are on for this browser">
          <BellRinging size={13} weight="bold" />
          <span className="hidden md:inline">Alerts on</span>
        </span>
      ) : state === 'blocked' ? (
        <span
          className={`${base} border-slate-200 bg-slate-50 text-slate-500`}
          title="Notifications are blocked. Allow them for this site in your browser settings, then reload."
        >
          <BellSlash size={13} weight="bold" />
          <span className="hidden md:inline">Alerts blocked</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className={`${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 disabled:opacity-50`}
          title="Get a sound and notification when new orders arrive"
        >
          <Bell size={13} weight="bold" />
          <span>{busy ? 'Enabling...' : 'Enable alerts'}</span>
        </button>
      )}

      {toast && (
        <div
          role="status"
          className="fixed top-4 right-4 z-50 max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg print:hidden"
        >
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-xs text-slate-600">{toast.body}</p>}
        </div>
      )}
    </>
  );
}
