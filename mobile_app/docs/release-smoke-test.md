# Release smoke test — physical Android device

Run this checklist on a **real Android device** with the **signed release
build** (not `flutter run`, not a debug build — R8 minification and resource
shrink only run in release, and permission/foreground-service behaviour only
shows on a real device).

Build under test:

```bash
cd mobile_app
flutter build appbundle --release --dart-define=API_BASE_URL=https://<your-production-api-domain>
# or, to sideload on the test device:
flutter build apk --release --split-per-abi --dart-define=API_BASE_URL=https://<your-production-api-domain>
adb install -r build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

Record device model, Android version and the versionCode under test for every
run. Tick every row; anything failing blocks the Play submission.

## 1. Install & first launch

- [ ] Installs from the built artifact (no signature/version errors).
- [ ] Launcher icon renders correctly (adaptive icon, no square crop artefacts).
- [ ] App label shows **SpeedyMeals** on the home screen and in the task switcher.
- [ ] Splash shows the brand red background, then the app — no white flash or crash.
- [ ] App opens in portrait and stays portrait.
- [ ] Cold start < ~3 s, no ANR.

## 2. Customer flow

- [ ] **OTP login**: request code, receive the SMS (production `SMS_MODE=sendpk`),
      verify, land on the dashboard.
- [ ] **Location disclosure** appears before the OS location prompt when adding an
      address with "Use my current location"; "Not now" cancels cleanly.
- [ ] Add a saved address (map pin + reverse geocode).
- [ ] **Browse**: restaurants load with real distance; search works.
- [ ] **Menu + cart**: add items, change quantity, GST/fees shown from the server.
- [ ] **Checkout**: COD is the only payment method; "Pay Online" is **not**
      offered (online payments are disabled).
- [ ] Place a COD order; order id is real; cart is cleared.
- [ ] **Tracking**: progress steps advance; rider marker appears on the map once
      a rider is assigned (REST polling fallback works if the socket is down).
- [ ] **Order history** shows the order; **reorder** and **rating** work.
- [ ] **Notifications**: when an order status changes, the notification appears
      (Android 13+ prompt was accepted).

## 3. Rider flow

- [ ] Rider OTP registration/login; approval banner shown for a new account.
- [ ] **Location disclosure** appears once, before the OS prompt; accept it.
- [ ] Go online (Rs. 500 minimum enforced by the backend).
- [ ] Accept an assignment; progress arrived → picked up → on the way → delivered.
- [ ] **GPS while the screen is off / app backgrounded during an active
      delivery**: the customer's map keeps updating, and a persistent
      foreground-service notification is visible. If this fails on Android 10+,
      the delivery tracking stops — report it before shipping.
- [ ] Wallet, earnings, COD eligibility, recharge and cash deposit work.
- [ ] KYC document upload works with a photo under 5 MB; the 5 MB guard shows a
      clear message for larger files.

## 4. Account deletion (Play requirement)

- [ ] Customer: Profile → Delete account → confirmation → 204; app signs out.
      With an active order it must show the 409 explanation instead.
- [ ] Rider: Account & deletion → request shows the grace date; cancel works.
- [ ] Web page `https://speedymealservices.com/delete-account` opens in a
      browser **without signing in**.

## 5. Legal links & settings

- [ ] Terms and Privacy Policy open in the browser from login, signup, OTP,
      profile and the rider account screen.
- [ ] Delete-account link opens the hosted page.
- [ ] Logout clears the session; relaunching returns to login.

## 6. Resilience

- [ ] Airplane mode on: friendly network error (no crash, no spinner forever) on
      dashboard, cart, checkout and tracking.
- [ ] Background the app for 10 minutes, return: session restored, no crash.
- [ ] Kill and relaunch during an active delivery (rider): tracking resumes.
- [ ] Rotate the device: app stays portrait (locked).

## 7. Release-build specific

- [ ] R8 result: no `ClassNotFoundException`/`MissingPluginException` in
      `adb logcat` while running the flows above (this is the real proof that
      the keep rules in `android/app/proguard-rules.pro` are right).
- [ ] `adb logcat` shows **no** localhost / `10.0.2.2` / `http://` requests.
- [ ] App size: `du -h build/app/outputs/bundle/release/app-release.aab`
      recorded below; if > ~80 MB investigate split delivery.

```
Device:  ____________________   Android: ______   versionCode: ______
AAB size: __________   APK size (arm64): __________
Tested by: __________   Date: __________
Result:  PASS / FAIL   Blockers: ______________________________
```
