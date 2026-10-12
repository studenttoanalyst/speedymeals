import { NextResponse } from 'next/server';

/**
 * Serves the FCM service worker at /firebase-messaging-sw.js.
 *
 * It is a route (not a static file in /public) so the Firebase web config comes
 * from NEXT_PUBLIC_FIREBASE_* env vars instead of being hardcoded and committed:
 * service workers cannot read process.env themselves.
 *
 * The Firebase SDK inside the worker displays notification messages while the
 * portal tab is closed or in the background and opens the link the backend set
 * on click. The CDN version below must match the `firebase` version in package.json.
 */
export const dynamic = 'force-static';

const FIREBASE_CDN_VERSION = '12.19.0';

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const script = `
importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});
firebase.messaging();
`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
