/**
 * Firebase web client (Cloud Messaging only). Config comes from
 * NEXT_PUBLIC_FIREBASE_* env vars; these are public identifiers, not secrets.
 * When they are not set, push is simply unavailable (isPushConfigured() is false)
 * and the dashboards keep working.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function isPushConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      FIREBASE_VAPID_KEY,
  );
}

export function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}
