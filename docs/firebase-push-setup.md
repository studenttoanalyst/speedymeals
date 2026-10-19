# Firebase push notifications setup

One Firebase project, three registered apps (Android, iOS, Web). The backend
sends with the Firebase Admin SDK; push is **optional** and is a silent no-op
until credentials are configured.

| Who | Surface | Receives |
|---|---|---|
| Customer | Flutter app | order status updates |
| Rider | Flutter app | delivery requests (high-priority channel), cancellations, low-wallet reminder |
| Restaurant | Web portal | new orders, cancellations |
| Admin | Web portal | (token registry ready; no events wired yet) |

## 1. Firebase console
1. Create project, then add apps:
   - **Android**: package `com.speedymealservices.app`. Download `google-services.json` to `mobile_app/android/app/` (gitignored).
   - **iOS**: bundle id `com.speedymealservices.app`. Download `GoogleService-Info.plist`, add it to the Runner target in Xcode (gitignored). Upload an APNs auth key (.p8) under Project settings -> Cloud Messaging. Enable the Push Notifications capability if Xcode does not pick up `Runner.entitlements`.
   - **Web**: nickname `SpeedyMeals Web Portals`, Hosting unchecked. Copy the config values.
2. Cloud Messaging -> Web Push certificates -> generate key pair (VAPID key).
3. Project settings -> Service accounts -> Generate new private key (backend only).

## 2. Backend
- `FIREBASE_CREDENTIALS_JSON` = the service-account JSON on **one line** (preferred on the server), or `FIREBASE_CREDENTIALS_PATH` = path to the file (local dev, e.g. `backend/app/secrets/firebase-adminsdk.json`).
- `WEB_PUSH_BASE_URL` = `https://speedymealservices.com`.
- Migration: `alembic -c app/alembic.ini upgrade head` (adds `device_tokens`).
- On Lightsail put the variables in `backend/.env` (compose `env_file`). Do not put the key in the repo or GitHub workflow.

## 3. Website (Vercel env vars)
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
The service worker is served from `/firebase-messaging-sw.js` (`app/firebase-messaging-sw.js/route.ts`); keep its CDN version equal to the `firebase` version in `package.json`.

## 4. Mobile
```bash
cd mobile_app && flutter clean && flutter pub get
flutter run --dart-define=API_BASE_URL=http://<LAN-IP>:8000
```
Without the Firebase config files the app runs normally with push disabled.

## 5. Test
1. Sign in on a real device (emulator needs Google Play services image) and accept the permission prompt.
2. Check `select role, platform, last_seen_at from device_tokens;` has a row.
3. Place an order -> restaurant portal (alerts enabled) gets a push; move it through statuses -> customer device gets one per status.
4. Firebase console -> Messaging -> send test message to the token to isolate client from backend problems.

## Behaviour notes
- Pushes are sent after the DB commit on a background thread; a Firebase outage never fails or rolls back an order.
- Dead tokens (uninstalled apps) are deleted automatically on the next send. Max 10 devices per account.
- Logout removes the device from the account and discards its FCM token.
- Delivery is best effort. Keep the existing polling as fallback; some Android vendors kill background apps.
