# notification

Firebase Cloud Messaging (FCM) push for the Flutter app (customer + rider) and the
web portals (restaurant + admin).

- `models.py`   `DeviceToken` registry (`device_tokens` table)
- `routes.py`   `POST /devices`, `DELETE /devices?token=...` (any authenticated role)
- `service.py`  register/unregister + `dispatch_push()` (fire-and-forget, after commit)
- `fcm.py`      Firebase Admin SDK sender; no-op when credentials are not configured

Order-specific messages live in `modules/food_delivery/order_notifications.py`.

## Configuration

Set ONE of (leave both empty to disable push):

- `FIREBASE_CREDENTIALS_JSON` - full service-account JSON as a single-line string
- `FIREBASE_CREDENTIALS_PATH` - path to the service-account JSON file

Also `WEB_PUSH_BASE_URL` (default `https://speedymealservices.com`) for web click links.

Never commit the service-account key. See `docs/firebase-push-setup.md`.
