/**
 * Web push for the restaurant and admin portals (Firebase Cloud Messaging).
 *
 * Flow: user clicks "Enable alerts" (a click is required for the browser
 * permission prompt and for audio) -> permission -> service worker -> FCM token
 * -> POST /devices. On logout the token is removed from the account and deleted
 * from FCM, so the next person on a shared computer does not get these alerts.
 *
 * Browser only. Every function is safe to call when push is unsupported or not
 * configured (it simply reports that).
 */
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';

import { registerDeviceToken, unregisterDeviceToken } from '@/lib/api/devices';
import { FIREBASE_VAPID_KEY, getFirebaseApp, isPushConfigured } from './client';

const TOKEN_KEY = 'sm_push_token';
export const CHIME_KEY = 'sm_chime';
export const PUSH_EVENT = 'sm:push';

export type PushState = 'unsupported' | 'unconfigured' | 'blocked' | 'off' | 'on';

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  if (!isPushConfigured()) return 'unconfigured';
  if (!(await isSupported().catch(() => false))) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted' && localStorage.getItem(TOKEN_KEY)) return 'on';
  return 'off';
}

/**
 * Requests permission (if needed), gets an FCM token and registers it.
 * Returns the resulting state. Pass the result of a user click.
 */
export async function enablePush(): Promise<PushState> {
  const state = await getPushState();
  if (state === 'unsupported' || state === 'unconfigured' || state === 'blocked') return state;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';

  // The worker is served by app/firebase-messaging-sw.js/route.ts (config from env).
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;

  const token = await getToken(getMessaging(getFirebaseApp()), {
    vapidKey: FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'off';

  await registerDeviceToken(token);
  localStorage.setItem(TOKEN_KEY, token);
  return 'on';
}

/**
 * Silent re-registration for a returning user who already granted permission
 * (tokens rotate, and the account may have changed on this browser).
 */
export async function refreshPushRegistration(): Promise<PushState> {
  const state = await getPushState();
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return state;
  if (state === 'unsupported' || state === 'unconfigured') return state;
  try {
    return await enablePush();
  } catch {
    return state;
  }
}

/** Removes this browser from the signed-in account. Call BEFORE clearing the session. Never throws. */
export async function disablePush(): Promise<void> {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  try {
    await unregisterDeviceToken(token);
  } catch {
    // Offline / expired session: the server re-points the token on next login anyway.
  }
  try {
    if (await isSupported()) await deleteToken(getMessaging(getFirebaseApp()));
  } catch {
    // best effort
  }
}

/** Foreground messages (page open). Returns an unsubscribe function. */
export function onForegroundMessage(cb: (payload: MessagePayload) => void): () => void {
  if (!isPushConfigured()) return () => {};
  try {
    return onMessage(getMessaging(getFirebaseApp()), cb);
  } catch {
    return () => {};
  }
}

// ---------------------------------------------------------------- chime

let audioCtx: AudioContext | null = null;

export function isChimeEnabled(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(CHIME_KEY) !== 'off';
}

export function setChimeEnabled(on: boolean): void {
  if (typeof window !== 'undefined') localStorage.setItem(CHIME_KEY, on ? 'on' : 'off');
}

/** Short two-tone chime generated with WebAudio (no audio asset to ship). */
export function playChime(): void {
  if (typeof window === 'undefined' || !isChimeEnabled()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    void audioCtx.resume();
    const start = audioCtx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.25, start + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.22 + 0.4);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(start + i * 0.22);
      osc.stop(start + i * 0.22 + 0.45);
    });
  } catch {
    // Audio is a nicety; never break the dashboard over it.
  }
}
