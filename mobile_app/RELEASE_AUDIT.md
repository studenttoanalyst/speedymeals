# SpeedyMeals Mobile App — Release Audit & Parity Log

**File:** `mobile_app/RELEASE_AUDIT.md`  
**Audit Lead:** Senior Mobile Engineer & Release Manager  
**Source of Truth:** Backend (`backend/app`)  
**Target:** Google Play Store Production Release  

---

## Audit Governance & Global Rules Verification
1. **Website Folder Immutability:** `website/` is strictly READ-ONLY. No files created, modified, renamed, or deleted.
   - **Git Status Baseline (Phase 0):** `git status --porcelain -- website` -> `EMPTY` (0 changes)
   - **Git Diff Baseline (Phase 0):** `git diff --stat -- website` -> `EMPTY` (0 changes)
2. **Scope of Modification:** Only files within `mobile_app/` are modified. Backend code is untouched unless explicit approval is given.
3. **Source of Truth:** Backend API schemas, routes, models, business rules, and error envelopes are authoritative.
4. **Security & Secrets:** Zero secrets/credentials committed. Production builds use environment variables via `--dart-define` and `key.properties` for signing.

---

## Phase 0: Discovery & Setup

### 1. Technology Stack & Environment Map

| Component | Technology / Detail |
|---|---|
| **Mobile Framework** | Flutter SDK (Dart ^3.13.2) |
| **Target Platforms** | Android (Play Store release primary), iOS / Web / Desktop supported |
| **State Management** | `StatefulWidget` (`setState`) + `ChangeNotifier` Service singletons (`AuthService`, `CartService`, `NotificationService`) |
| **HTTP Client** | `package:http` (^1.6.0) encapsulated in unified `ApiClient` (`mobile_app/lib/core/network/api_client.dart`) |
| **Local Storage** | `flutter_secure_storage` (JWT tokens), `shared_preferences` (settings / cache) |
| **Hardware / Native Services** | `geolocator` (GPS streaming), `google_maps_flutter` (maps/markers), `file_picker` (documents) |
| **Push Notifications** | `firebase_core`, `firebase_messaging`, `flutter_local_notifications` |
| **Backend Framework** | Python 3.13, FastAPI 0.115, Starlette, SQLAlchemy 2.0 ORM, Alembic migrations |
| **Backend Caching & Queuing** | Redis 5.0 (OTP storage, active rider geo tracking, rate limiting) |
| **Object Storage** | AWS S3 / Supabase Storage (rider CNIC/license uploads, menu imagery) |
| **Auth Method** | Dual-role Bearer JWT (Access Token 30m / 15m + Refresh Token 30d with server-side revocation in DB) |
| **OTP Gateway** | SendPK live SMS gateway with local development console fallback (`SMS_MODE=sendpk` vs `console`) |
| **Base URLs** | Dev Emulator: `http://10.0.2.2:8000` • Dev Local/Sim: `http://localhost:8000` • Release/Prod: Passed compile-time via `--dart-define=API_BASE_URL=https://<prod-domain>` (throws `StateError` if omitted) |
| **WebSocket URL** | Live order tracking socket: `wsBaseUrl/orders/{order_id}/track?token={token}` |

### 2. Mobile Application Architecture & Components Map

#### A. Core Layer (`lib/core/`)
- `config/api_config.dart`: Centralized backend base URL resolution, release-mode validation, WebSocket URL generation.
- `constants/app_constants.dart`: Wire enums (`UserRole`, `OrderStatus`, `PaymentMethod`), tracking step indices, fallback constants.
- `network/api_client.dart`: Unified HTTP interceptor, single-flight token refresh, error normalization, timeout enforcement.
- `network/api_exception.dart`: Typed error categories (`validation`, `unauthorized`, `forbidden`, `notFound`, `rateLimited`, `network`, `timeout`).
- `storage/token_storage.dart`: Secure credential storage (`flutter_secure_storage`).
- `theme/app_theme.dart`: Material 3 design system tokens and colors.

#### B. Data Layer & Models (`lib/data/`)
- `models/user_models.dart`: `UserProfile`, `UserAddress`.
- `models/catalog_models.dart`: `Restaurant`, `MenuItem`.
- `models/cart_models.dart`: `Cart`, `CartItem`, `CheckoutPreview`.
- `models/order_models.dart`: `Order`, `OrderItem`, `OrderTracking`.
- `models/rider_models.dart`: `RiderProfile`, `RiderAssignment`, `RiderWallet`, `RiderEarnings`.
- `models/rider_location.dart`: Coordinate models & bounds validator.
- `repositories/`: `AuthRepository`, `UserRepository`, `RestaurantRepository`, `CartRepository`, `OrderRepository`, `RiderRepository`, `RiderLocationRepository`, `DeviceRepository`, `LocationRepository`.

#### C. Services Layer (`lib/services/`)
- `auth_service.dart`: Reactive session state manager (`ChangeNotifier`).
- `cart_service.dart`: Reactive shopping cart and active restaurant coordinator.
- `notification_service.dart`: In-app notification state.
- `push_service.dart`: Firebase FCM device token registration and notification routing.
- `rider_location_publisher.dart`: Throttled GPS publisher (`PATCH /wallet/location`).
- `rider_location_service.dart`: Native device location stream adapter.
- `live_location_socket.dart`: Live WebSocket client (`WS /orders/{id}/track`).

#### D. Screens & UI Layer (`lib/screens/`)
- **Auth Screens:** `register_as_screen.dart`, `customer_login_screen.dart`, `customer_signup_screen.dart`, `customer_forgot_password_screen.dart`, `rider_login_screen.dart`, `rider_signup_screen.dart`, `rider_forgot_password_screen.dart`, `otp_verification_screen.dart`, `login_screen.dart`.
- **Customer Screens:** `dashboard_screen.dart`, `restaurant_detail_screen.dart`, `cart_screen.dart`, `checkout_screen.dart`, `order_history_screen.dart`, `order_tracking_screen.dart`, `track_orders_tab.dart`, `profile_screen.dart`, `edit_profile_screen.dart`, `saved_addresses_screen.dart`, `notifications_screen.dart`.
- **Rider Screens:** `rider_dashboard_screen.dart`, `rider_documents_screen.dart`, `rider_wallet_screen.dart`.
- **Location & Maps Feature:** `location_picker_screen.dart`, `address_search_field.dart`, `map_view.dart`, `map_markers.dart`, `rider_navigation_section.dart`.

### 3. Backend Endpoints Catalog (Total: 121 Endpoints — Food Delivery Customer/Orders: 15, Restaurant Portal: 15)

| # | Method | Path | Auth / Role | Request Body | Query Params | Response Shape | Documented Errors |
|---|---|---|---|---|---|---|---|
| 1 | **GET** | `/` | None | — | — | `dict[str, str]` | 400, 422, 500 |
| 2 | **GET** | `/health` | None | — | — | `{"status": "ok"}` | 400, 422, 500 |
| 3 | **GET** | `/favicon.ico` | None | — | — | `204 No Content` | 400, 422, 500 |
| 4 | **GET** | `/robots.txt` | None | — | — | `text/plain` | 400, 422, 500 |
| 5 | **POST** | `/auth/otp/request` | None | `payload: OTPRequestSchema` | — | `OTPResponseSchema` | 400, 422, 500 |
| 6 | **POST** | `/auth/otp/verify` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 7 | **POST** | `/auth/logout` | None | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 8 | **POST** | `/auth/refresh` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 9 | **GET** | `/auth/me` | JWT (User) | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 10 | **POST** | `/auth/rider/login/otp-verify` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 11 | **POST** | `/auth/rider/register` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 12 | **POST** | `/auth/restaurant/login` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 13 | **POST** | `/auth/restaurant/otp/request` | None | — | — | `OTPResponseSchema` | status.HTTP_403_FORBIDDEN |
| 14 | **POST** | `/auth/restaurant/otp/verify` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 15 | **POST** | `/auth/admin/login` | None | — | — | `TokenResponseSchema` | 400, 422, 500 |
| 16 | **POST** | `/auth/admin/forgot-password` | None | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 17 | **POST** | `/auth/admin/reset-password` | None | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 18 | **POST** | `/auth/restaurant/forgot-password` | None | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 19 | **POST** | `/auth/restaurant/reset-password` | None | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 20 | **POST** | `/auth/admin/change-initial-password` | JWT (User) | — | — | `TokenResponseSchema` | status.HTTP_403_FORBIDDEN |
| 21 | **GET** | `/api/v1/location/reverse-geocode` | JWT (User) | `current_user: CurrentUser` | `lat (float)`, `request (Request)` | `ReverseGeocodeResponseSchema` | status.HTTP_503_SERVICE_UNAVAILABLE, status.HTTP_404_NOT_FOUND |
| 22 | **GET** | `/api/v1/location/places/autocomplete` | JWT (User) | — | `session_token (str | None)`, `q (str)` | `list[PlacePredictionSchema]` | status.HTTP_503_SERVICE_UNAVAILABLE |
| 23 | **GET** | `/api/v1/location/places/details` | JWT (User) | — | `session_token (str | None)`, `place_id (str)` | `PlaceDetailsResponseSchema` | status.HTTP_503_SERVICE_UNAVAILABLE, status.HTTP_404_NOT_FOUND |
| 24 | **POST** | `/devices` | JWT (User) | — | — | `DeviceRegisterResponseSchema` | 400, 422, 500 |
| 25 | **DELETE** | `/devices` | JWT (User) | — | `token (str)` | `DeviceUnregisterResponseSchema` | 400, 422, 500 |
| 26 | **GET** | `/users/me` | JWT (User) | — | — | `UserProfileSchema` | 400, 422, 500 |
| 27 | **PUT** | `/users/me` | Depends(Depends(require_customer)) | — | — | `UserProfileSchema` | 400, 422, 500 |
| 28 | **GET** | `/users/me/addresses` | JWT (User) | — | — | `list[AddressResponseSchema]` | 400, 422, 500 |
| 29 | **POST** | `/users/me/addresses` | Depends(Depends(require_customer)) | — | — | `AddressResponseSchema` | 400, 422, 500 |
| 30 | **PUT** | `/users/me/addresses/{address_id}` | Depends(Depends(require_customer)) | `current_user: CurrentUser` | — | `AddressResponseSchema` | 400, 422, 500 |
| 31 | **DELETE** | `/users/me/addresses/{address_id}` | Depends(Depends(require_customer)) | — | — | `status.HTTP_204_NO_CONTENT` | 400, 422, 500 |
| 32 | **POST** | `/wallet/recharge` | Depends(Depends(require_rider)) | — | — | `WalletTransactionResponseSchema` | 400, 422, 500 |
| 33 | **GET** | `/wallet/balance` | JWT (User) | — | — | `WalletBalanceResponseSchema` | 400, 422, 500 |
| 34 | **PATCH** | `/wallet/status` | Depends(Depends(require_rider)) | — | — | `WalletBalanceResponseSchema` | 400, 422, 500 |
| 35 | **POST** | `/wallet/cash-deposit` | Depends(Depends(require_rider)) | — | — | `CashDepositResponseSchema` | 400, 422, 500 |
| 36 | **GET** | `/wallet/cod-eligibility` | JWT (User) | — | — | `CODEligibilityResponseSchema` | 400, 422, 500 |
| 37 | **GET** | `/wallet/earnings` | JWT (User) | — | — | `RiderEarningsResponseSchema` | 400, 422, 500 |
| 38 | **PATCH** | `/wallet/location` | Depends(Depends(require_rider)) | — | — | `RiderLocationResponseSchema` | 400, 422, 500 |
| 39 | **POST** | `/wallet/assignments/{order_id}/respond` | Depends(Depends(require_rider)) | `current_user: CurrentUser` | — | `RiderAssignmentResponseSchema` | 400, 422, 500 |
| 40 | **PATCH** | `/wallet/deliveries/{order_id}/status/arrived` | Depends(Depends(require_rider)) | — | — | `DeliveryStatusResponseSchema` | 400, 422, 500 |
| 41 | **PATCH** | `/wallet/deliveries/{order_id}/status/picked-up` | Depends(Depends(require_rider)) | — | — | `DeliveryStatusResponseSchema` | 400, 422, 500 |
| 42 | **PATCH** | `/wallet/deliveries/{order_id}/status/on-the-way` | Depends(Depends(require_rider)) | — | — | `DeliveryStatusResponseSchema` | 400, 422, 500 |
| 43 | **PATCH** | `/wallet/deliveries/{order_id}/status/delivered` | Depends(Depends(require_rider)) | — | — | `DeliveryStatusResponseSchema` | 400, 422, 500 |
| 44 | **POST** | `/wallet/documents/{doc_type}` | Depends(Depends(require_rider)) | — | — | `RiderDocumentUploadResponseSchema` | 400, 422, 500 |
| 45 | **GET** | `/wallet/profile` | JWT (User) | — | — | `RiderWalletProfileResponseSchema` | 400, 422, 500 |
| 46 | **GET** | `/wallet/assignments` | JWT (User) | — | — | `RiderAssignmentsResponseSchema` | 400, 422, 500 |
| 47 | **GET** | `/restaurants` | JWT (User) | `address_id: uuid.UUID | None` | `radius_km (float)`, `sort (str)`, `search (str | None)` | `list[CustomerRestaurantResponseSchema]` | 400, 422, 500 |
| 48 | **GET** | `/restaurants/{restaurant_id}/menu` | Depends(Depends(require_customer)) | — | — | `list[CustomerMenuCategorySchema]` | 400, 422, 500 |
| 49 | **GET** | `/restaurants/{restaurant_id}/cart` | Depends(Depends(require_customer)) | — | — | `CartSchema` | 400, 422, 500 |
| 50 | **POST** | `/restaurants/{restaurant_id}/cart/items` | Depends(Depends(require_customer)) | `current_user: CurrentUser` | — | `CartSchema` | 400, 422, 500 |
| 51 | **PATCH** | `/restaurants/{restaurant_id}/cart/items/{item_id}` | Depends(Depends(require_customer)) | `payload: CartUpdateItemSchema` | — | `CartSchema` | 400, 422, 500 |
| 52 | **DELETE** | `/restaurants/{restaurant_id}/cart/items/{item_id}` | Depends(Depends(require_customer)) | `current_user: CurrentUser` | — | `CartSchema` | 400, 422, 500 |
| 53 | **DELETE** | `/restaurants/{restaurant_id}/cart` | Depends(Depends(require_customer)) | — | — | `status.HTTP_204_NO_CONTENT` | 400, 422, 500 |
| 54 | **GET** | `/restaurants/{restaurant_id}/cart/checkout-preview` | Depends(Depends(require_customer)) | — | `restaurant_id (uuid.UUID)` | `CheckoutPreviewResponseSchema` | 400, 422, 500 |
| 55 | **POST** | `/restaurants/{restaurant_id}/cart/checkout` | Depends(Depends(require_customer)) | `current_user: CurrentUser` | — | `PlaceOrderResponseSchema` | 400, 422, 500 |
| 56 | **GET** | `/restaurants/me/menu-items` | JWT (User) | — | — | `list[MenuItemResponseSchema]` | 400, 422, 500 |
| 57 | **POST** | `/restaurants/me/menu-items` | Depends(Depends(require_restaurant)) | — | — | `MenuItemResponseSchema` | 400, 422, 500 |
| 58 | **PUT** | `/restaurants/me/menu-items/{menu_item_id}` | Depends(Depends(require_restaurant)) | `current_user: CurrentUser` | — | `MenuItemResponseSchema` | 400, 422, 500 |
| 59 | **DELETE** | `/restaurants/me/menu-items/{menu_item_id}` | Depends(Depends(require_restaurant)) | — | — | `status.HTTP_204_NO_CONTENT` | 400, 422, 500 |
| 60 | **PATCH** | `/restaurants/me/menu-items/{menu_item_id}/availability` | Depends(Depends(require_restaurant)) | `current_user: CurrentUser` | — | `MenuItemResponseSchema` | 400, 422, 500 |
| 61 | **POST** | `/restaurants/me/menu-items/{menu_item_id}/photo` | Depends(Depends(require_restaurant)) | — | — | `MenuItemResponseSchema` | 400, 422, 500 |
| 62 | **GET** | `/restaurants/me/orders` | JWT (User) | `date_to: date | None` | `status (str | None)` | `list[RestaurantOrderSummaryResponseSchema]` | 400, 422, 500 |
| 63 | **GET** | `/restaurants/me/orders/{order_id}` | Depends(Depends(require_restaurant)) | — | — | `RestaurantOrderDetailResponseSchema` | 400, 422, 500 |
| 64 | **PATCH** | `/restaurants/me/orders/{order_id}/status` | Depends(Depends(require_restaurant)) | `current_user: CurrentUser` | — | `RestaurantOrderDetailResponseSchema` | 400, 422, 500 |
| 65 | **POST** | `/restaurants/me/orders/{order_id}/reject` | Depends(Depends(require_restaurant)) | `current_user: CurrentUser` | — | `RestaurantOrderDetailResponseSchema` | 400, 422, 500 |
| 66 | **GET** | `/orders/{order_id}/track` | Depends(Depends(require_customer)) | — | — | `OrderTrackingResponseSchema` | 400, 422, 500 |
| 67 | **GET** | `/orders/{order_id}/rider-location` | Depends(Depends(require_customer_or_admin)) | — | — | `OrderRiderLocationResponseSchema` | 400, 422, 500 |
| 68 | **GET** | `/orders` | JWT (User) | — | — | `list[OrderHistoryResponseSchema]` | 400, 422, 500 |
| 69 | **POST** | `/orders/{order_id}/reorder` | Depends(Depends(require_customer)) | — | — | `ReorderResponseSchema` | 400, 422, 500 |
| 70 | **POST** | `/orders/{order_id}/rating` | Depends(Depends(require_customer)) | `current_user: CurrentUser` | — | `RatingResponseSchema` | 400, 422, 500 |
| 71 | **WEBSOCKET** | `/orders/{order_id}/track` | None | — | `token (str)`, `websocket (WebSocket)` | `200 OK` | 400, 422, 500 |
| 72 | **GET** | `/restaurants/me/profile` | JWT (User) | — | — | `RestaurantProfileResponseSchema` | 404 |
| 73 | **PUT** | `/restaurants/me/profile` | Depends(Depends(require_restaurant)) | — | — | `RestaurantProfileResponseSchema` | 404 |
| 74 | **PATCH** | `/restaurants/me/profile` | Depends(Depends(require_restaurant)) | — | — | `RestaurantProfileResponseSchema` | 404 |
| 75 | **GET** | `/restaurants/me/metrics` | JWT (User) | — | — | `RestaurantDashboardMetricsSchema` | 400, 422, 500 |
| 76 | **GET** | `/restaurants/me/settlements` | JWT (User) | — | — | `list[RestaurantSettlementResponseSchema]` | 400, 422, 500 |
| 77 | **GET** | `/admin/dashboard` | JWT (User) | — | — | `DashboardSummaryResponseSchema` | 400, 422, 500 |
| 78 | **POST** | `/admin/restaurants` | Depends(Depends(require_admin)) | — | — | `RestaurantAdminResponseSchema` | 400, 422, 500 |
| 79 | **GET** | `/admin/restaurants` | JWT (User) | — | `restaurant_status (str | None)` | `list[RestaurantAdminResponseSchema]` | 400, 422, 500 |
| 80 | **GET** | `/admin/restaurants/{restaurant_id}` | Depends(Depends(require_admin)) | — | — | `RestaurantAdminResponseSchema` | 400, 422, 500 |
| 81 | **PATCH** | `/admin/restaurants/{restaurant_id}/status` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `RestaurantAdminResponseSchema` | 400, 422, 500 |
| 82 | **PATCH** | `/admin/restaurants/{restaurant_id}/commission` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `RestaurantAdminResponseSchema` | 400, 422, 500 |
| 83 | **POST** | `/admin/restaurants/{restaurant_id}/reset-credentials` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `RestaurantAdminResponseSchema` | 400, 422, 500 |
| 84 | **GET** | `/admin/riders` | JWT (User) | — | `approval_status (str | None)` | `list[RiderAdminResponseSchema]` | 400, 422, 500 |
| 85 | **GET** | `/admin/riders/{rider_id}` | Depends(Depends(require_admin)) | — | — | `RiderAdminResponseSchema` | 400, 422, 500 |
| 86 | **PATCH** | `/admin/riders/{rider_id}/approval` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `RiderAdminResponseSchema` | 400, 422, 500 |
| 87 | **PATCH** | `/admin/riders/{rider_id}/status` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `RiderAdminResponseSchema` | 400, 422, 500 |
| 88 | **PATCH** | `/admin/riders/{rider_id}/commission` | Depends(Depends(require_rider_commission_perm)) | `current_user: CurrentUser` | — | `RiderAdminResponseSchema` | 400, 422, 500 |
| 89 | **GET** | `/admin/riders/{rider_id}/kit` | Depends(Depends(require_admin)) | — | — | `RiderKitResponseSchema` | 400, 422, 500 |
| 90 | **PATCH** | `/admin/riders/{rider_id}/kit` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `RiderKitResponseSchema` | 400, 422, 500 |
| 91 | **GET** | `/admin/orders` | JWT (User) | `date_to: date | None` | `order_status (str | None)` | `list[AdminOrderSummaryResponseSchema]` | 400, 422, 500 |
| 92 | **GET** | `/admin/orders/{order_id}` | Depends(Depends(require_admin)) | — | — | `AdminOrderDetailResponseSchema` | 400, 422, 500 |
| 93 | **POST** | `/admin/orders/{order_id}/cancel` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `AdminOrderDetailResponseSchema` | 400, 422, 500 |
| 94 | **PATCH** | `/admin/orders/{order_id}/reassign` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `AdminOrderDetailResponseSchema` | 400, 422, 500 |
| 95 | **POST** | `/admin/settlements/generate` | Depends(Depends(require_admin)) | — | — | `list[SettlementResponseSchema]` | 400, 422, 500 |
| 96 | **GET** | `/admin/settlements` | JWT (User) | — | `settlement_status (str | None)` | `list[SettlementResponseSchema]` | 400, 422, 500 |
| 97 | **POST** | `/admin/settlements/{settlement_id}/mark-paid` | Depends(Depends(require_admin)) | — | — | `SettlementResponseSchema` | 400, 422, 500 |
| 98 | **POST** | `/admin/rider-payouts/generate` | Depends(Depends(require_admin)) | — | — | `list[RiderPayoutResponseSchema]` | 400, 422, 500 |
| 99 | **GET** | `/admin/rider-payouts` | JWT (User) | — | `payout_status (str | None)` | `list[RiderPayoutResponseSchema]` | 400, 422, 500 |
| 100 | **POST** | `/admin/rider-payouts/{payout_id}/mark-paid` | Depends(Depends(require_admin)) | — | — | `RiderPayoutResponseSchema` | 400, 422, 500 |
| 101 | **GET** | `/admin/cash-discrepancies` | JWT (User) | — | `unresolved_only (bool)` | `list[CashDiscrepancyResponseSchema]` | 400, 422, 500 |
| 102 | **POST** | `/admin/cash-deposits/{deposit_id}/approve` | Depends(Depends(require_admin)) | — | — | `CashDepositApprovalResponseSchema` | 400, 422, 500 |
| 103 | **GET** | `/admin/reports` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `ReportsResponseSchema` | 400, 422, 500 |
| 104 | **GET** | `/admin` | JWT (User) | — | — | `200 OK` | 400, 422, 500 |
| 105 | **GET** | `/admin/customers` | JWT (User) | — | — | `list[CustomerAdminResponseSchema]` | 400, 422, 500 |
| 106 | **PATCH** | `/admin/customers/{customer_id}/status` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `CustomerAdminResponseSchema` | 400, 422, 500 |
| 107 | **GET** | `/admin/promotions` | JWT (User) | — | — | `list[PromotionResponseSchema]` | 400, 422, 500 |
| 108 | **POST** | `/admin/promotions` | Depends(Depends(require_admin)) | `current_user: CurrentUser` | — | `PromotionResponseSchema` | 400, 422, 500 |
| 109 | **PATCH** | `/admin/promotions/{promo_id}/status` | Depends(Depends(require_admin)) | `payload: PromotionStatusUpdateSchema` | — | `PromotionResponseSchema` | 400, 422, 500 |
| 110 | **GET** | `/admin/permissions` | None | — | — | `list[PermissionResponseSchema]` | 400, 422, 500 |
| 111 | **GET** | `/admin/roles` | None | — | — | `list[AdminRoleResponseSchema]` | 400, 422, 500 |
| 112 | **POST** | `/admin/roles` | Depends(Depends(require_permission('admins.roles.manage'))) | — | — | `AdminRoleResponseSchema` | 400, 422, 500 |
| 113 | **GET** | `/admin/roles/{role_id}` | None | — | — | `AdminRoleResponseSchema` | 400, 422, 500 |
| 114 | **PATCH** | `/admin/roles/{role_id}` | Depends(Depends(require_permission('admins.roles.manage'))) | `current_user: CurrentUser` | — | `AdminRoleResponseSchema` | 400, 422, 500 |
| 115 | **DELETE** | `/admin/roles/{role_id}` | Depends(Depends(require_permission('admins.roles.manage'))) | — | — | `status.HTTP_200_OK` | 400, 422, 500 |
| 116 | **GET** | `/admin/accounts` | None | — | — | `list[AdminAccountResponseSchema]` | 400, 422, 500 |
| 117 | **POST** | `/admin/accounts` | Depends(Depends(require_permission('admins.accounts.create'))) | — | — | `AdminAccountProvisionResultSchema` | 400, 422, 500 |
| 118 | **GET** | `/admin/accounts/{admin_id}` | None | — | — | `AdminAccountResponseSchema` | 400, 422, 500 |
| 119 | **PATCH** | `/admin/accounts/{admin_id}` | Depends(Depends(require_permission('admins.accounts.manage'))) | `current_user: CurrentUser` | — | `AdminAccountResponseSchema` | 400, 422, 500 |
| 120 | **PATCH** | `/admin/accounts/{admin_id}/role` | Depends(Depends(require_permission('admins.accounts.manage'))) | `current_user: CurrentUser` | — | `AdminAccountResponseSchema` | 400, 422, 500 |
| 121 | **POST** | `/admin/accounts/{admin_id}/reset-password` | Depends(Depends(require_permission('admins.accounts.reset_credentials'))) | — | — | `AdminCredentialResetResultSchema` | 400, 422, 500 |

---

## Phase 0 Initial Audit Findings & Parity Discrepancy Warnings
During discovery, initial code scans uncovered notable differences between backend capabilities and mobile implementation to be verified in Phase 1:
1. **Customer & Rider Password Screens in Mobile App:** Mobile app has `customer_forgot_password_screen.dart` and `rider_forgot_password_screen.dart`, but the backend auth model for customers and riders is strictly passwordless OTP. The mobile repositories correctly call OTP endpoints, so the unused password reset screens for customer/rider need cleanup/reconciliation.
2. **Payment Methods Parity:** Backend strictly validates `VALID_PAYMENT_METHODS = {'COD', 'Digital'}`. Mobile app `PaymentMethod` enum matches this.
3. **Order Status Parity:** Backend lifecycle states are `Accepted`, `Preparing`, `Ready for Pickup`, `Rider Assigned`, `Rejected`, `Accepted by Rider`, `Arrived at Restaurant`, `Picked Up`, `On the Way`, `Delivered`, `Cancelled`. Orders start directly at `Accepted`. Mobile `OrderStatus` matches this wire contract.
4. **Live Tracking Dual-Mode:** Backend supports both `WS /orders/{order_id}/track?token=...` and REST polling fallback `GET /orders/{order_id}/track` and `GET /orders/{order_id}/rider-location`. Mobile client implements both.
5. **Backend Dependency Missing in venv:** Backend Python environment is missing `Pillow` (PIL), causing runtime failure if launching backend directly. (Noted as backend environment finding; will not alter backend unless authorized).

---

## Phase 1: Backend vs Mobile Functional Parity

### 1. Parity Audit Scope & Executive Summary
During Phase 1, every feature in `mobile_app` was systematically audited against the authoritative FastAPI backend schemas, route decorators, and business logic services (`food_delivery/service.py`, `auth/service.py`, `wallet_payment/service.py`, `users/service.py`, `location/service.py`).

**Key Architectural Adjustments Completed:**
1. **Removed Legacy Unused Screens:**
   - `screens/auth/customer_forgot_password_screen.dart` (Customer auth is passwordless phone+OTP; no password reset exists)
   - `screens/auth/rider_forgot_password_screen.dart` (Rider auth is passwordless phone+OTP; no password reset exists)
   - `screens/auth/login_screen.dart` (Unused `PhoneOtpLoginScreen` duplicate removed; `SplashScreen` cleanly extracted to standalone `screens/splash_screen.dart`)
2. **Unified Presentation Catalog Models:**
   - Moved `Restaurant`, `RestaurantMenuCategory`, `RestaurantMenuItem`, and `AppConstantsFee` into `lib/data/models/catalog_models.dart`.
   - Updated `dashboard_screen.dart` and `restaurant_detail_screen.dart` imports.
   - Deleted legacy `lib/models/restaurant.dart` and removed `lib/models` directory entirely.
3. **Verified Codebase Health Post-Cleanup:**
   - `flutter analyze` completed with **0 errors / 0 warnings**.
   - `flutter test` passed with **107 of 107 tests passing**.

---

### 2. Functional Parity Table

| Functional Domain | Mobile Feature / Screen | Backend Endpoint / Service | Contract Match? | Audit Findings & Resolution |
|---|---|---|---|---|
| **Auth: Customer OTP Request** | `CustomerLoginScreen`, `CustomerSignUpScreen` | `POST /auth/otp/request` (`OTPRequestSchema`) | **MATCH** | Mobile sends normalized 10-digit number + `+92`. Server rate-limits (5/min, 45s cooldown) handled as HTTP 429. |
| **Auth: Customer OTP Verify** | `OtpVerificationScreen` | `POST /auth/otp/verify` (`OTPVerifySchema`) | **MATCH** | Verifies 6-digit code. Returns JWT pair. Auto-registers user if phone is new. |
| **Auth: Rider Register** | `RiderSignUpScreen`, `OtpVerificationScreen` | `POST /auth/rider/register` (`RiderRegisterSchema`) | **MATCH** | Payload matches: `phone_number`, `country_code`, `otp_code`, `name`, `cnic_number`, `vehicle_type`, `vehicle_registration`. |
| **Auth: Rider Login OTP** | `RiderLoginScreen`, `OtpVerificationScreen` | `POST /auth/rider/login/otp-verify` | **MATCH** | Existing rider verification returns JWT pair with `role: "rider"`. |
| **Auth: Token Refresh** | `ApiClient._send` via `AuthRepository.refresh` | `POST /auth/refresh` (`RefreshTokenRequestSchema`) | **MATCH** | Single-flight automatic retry on 401. Rotates refresh token in secure storage. |
| **Auth: Session Revocation** | `AuthService.logout` | `POST /auth/logout` (`LogoutSchema`) | **MATCH** | Revokes refresh token server-side; clears local secure storage. |
| **Customer: Profile Read/Update** | `ProfileScreen`, `EditProfileScreen` | `GET /users/me`, `PUT /users/me` | **MATCH** | Editable fields: `name`, `email`. Phone & wallet balance are system-managed/read-only. |
| **Customer: Address Management** | `SavedAddressesScreen`, `LocationPickerScreen` | `GET`, `POST`, `PUT`, `DELETE` `/users/me/addresses` | **MATCH** | Coordinates (`latitude`, `longitude`) sent as required by backend. Map picker reverse-geocodes correctly. |
| **Customer: Restaurant Browse** | `DashboardScreen` | `GET /restaurants?lat=...&lng=...&radius_km=...` | **MATCH** | Requires customer coordinates. Server returns real road distance and average rating. |
| **Customer: Menu Browsing** | `RestaurantDetailScreen` | `GET /restaurants/{id}/menu` | **MATCH** | Groups items by `category`. Unavailable/sold-out items displayed with disabled add action. |
| **Customer: Cart Operations** | `CartScreen`, `CartService` | `GET`, `POST`, `PATCH`, `DELETE` `/restaurants/{id}/cart` | **MATCH** | Redis multi-cart architecture. Line modifications use `/items` sub-routes with `qty`. |
| **Customer: Checkout Preview** | `CheckoutScreen` | `GET /restaurants/{id}/cart/checkout-preview` | **MATCH** | Authoritative calculation of delivery fee (`100 + 25*km`), platform fee (`Rs. 15`), and GST. No client math used. |
| **Customer: Order Placement** | `CheckoutScreen` | `POST /restaurants/{id}/cart/checkout` (`PlaceOrderSchema`) | **MATCH** | Sends `address_id`, `payment_method` (`COD` or `Digital`), and `expected_total` with `Idempotency-Key` header. |
| **Customer: Order History** | `OrderHistoryScreen` | `GET /orders` | **MATCH** | Lists historical orders newest first with status, totals, and restaurant name. |
| **Customer: Order Tracking** | `OrderTrackingScreen`, `LiveLocationSocket` | `GET /orders/{id}/track` & `WS /orders/{id}/track` | **MATCH** | Dual-mode: WebSockets stream real-time updates; REST polling fallback every 15s. |
| **Customer: Live Rider GPS** | `OrderTrackingScreen`, `MapMarkers` | `GET /orders/{id}/rider-location` | **MATCH** | Reads Redis GPS coordinate cache. Returns 409 when order reaches terminal state. |
| **Customer: Reorder** | `OrderHistoryScreen` | `POST /orders/{id}/reorder` | **MATCH** | Clones past order items into active restaurant cart, filtering out deleted/sold-out items. |
| **Customer: Order Rating** | `OrderTrackingScreen` dialog | `POST /orders/{id}/rating` (`RatingCreateSchema`) | **MATCH** | Accepts `restaurant_rating` (1-5), `rider_rating` (1-5), and `comment`. Permitted once per delivered order. |
| **Rider: Dashboard & Active Jobs** | `RiderDashboardScreen` | `GET /wallet/assignments`, `GET /wallet/profile` | **MATCH** | Categorized into `active` and `past` jobs. Approval status and pending cash owed verified. |
| **Rider: Accept/Reject Order** | `RiderDashboardScreen` | `POST /wallet/assignments/{id}/respond` | **MATCH** | Body: `{"action": "accept"|"reject"}`. Enforces `Rider Assigned` precondition. |
| **Rider: Delivery Progression** | `RiderDashboardScreen` | `PATCH /wallet/deliveries/{id}/status/{step}` | **MATCH** | Step transitions: `arrived`, `picked-up`, `on-the-way`, `delivered`. Settles delivery fee and wallet commissions. |
| **Rider: Online/Offline Toggle** | `RiderDashboardScreen` | `PATCH /wallet/status` | **MATCH** | Server enforces minimum Rs. 500 wallet balance to go online. |
| **Rider: GPS Location Broadcast** | `RiderLocationPublisher` | `PATCH /wallet/location` | **MATCH** | Throttled background updates every 30s/30m to Redis coordinate cache with 45s TTL. |
| **Rider: Cash Deposit & Recharge** | `RiderWalletScreen` | `POST /wallet/cash-deposit`, `POST /wallet/recharge` | **MATCH** | Submits collected COD cash and simulated wallet recharges. |
| **Rider: Document KYC Upload** | `RiderDocumentsScreen` | `POST /wallet/documents/{doc_type}` | **MATCH** | Multipart upload for `cnic`, `license`, `vehicle`. Enforces 5 MB file size limit. |
| **Push Notification Tokens** | `PushService` | `POST /devices`, `DELETE /devices` | **MATCH** | Registers FCM device tokens with backend for push notification routing. |
| **Account Deletion** | Missing in UI | **NO ENDPOINT** | **MISMATCH (BLOCKER)** | **Play Store Requirement:** Apps supporting user accounts must offer in-app and web account deletion. Backend has no deletion endpoint. |

---

### 3. Missing Backend Features & Play Store Compliance Flags

1. **CRITICAL Play Store Blocker — User Account Deletion:**
   - **Requirement:** Google Play policy mandates that any app offering user account creation must allow users to request deletion of their account and associated data from within the app and via a web URL.
   - **Backend Status:** The backend has `DELETE /users/me/addresses/{id}` (address deletion), but **NO** `DELETE /users/me` (account deletion) endpoint exists.
   - **Action Needed by Team / Backend:** A backend endpoint (`DELETE /users/me`) or web deletion URL (e.g., `https://speedymealservices.com/delete-account`) must be created before Play Store submission.
2. **Missing Customer Favorite Restaurants Feature:**
   - The UI previously contained local mock placeholders for "Favorite Restaurants". The backend does not implement a restaurant favorites database model or endpoint. Cleaned up to rely on backend catalog browse and order history.
3. **Passwordless OTP Exclusivity:**
   - Removed all legacy password reset screens (`CustomerForgotPasswordScreen`, `RiderForgotPasswordScreen`) and buttons. The app now strictly adheres to the backend's OTP verification flow.

---

## Phase 2: Endpoint Connectivity & Functionality

Scope rules honoured: only `mobile_app/` was modified (plus the one approved backend change, shown as a diff and NOT applied). `website/` was never touched.

### Part A1 — Rider delivery endpoints (verified from source, side by side)

The Phase 0 note ("backend is POST") was wrong. The Phase 1 claim ("mobile uses PATCH + `on-the-way`") was right. Verified from the route decorators:

| Step | Backend decorator (file:line) | Backend status arg | Mobile call (file:line) | Match |
|---|---|---|---|---|
| Arrived | `backend/app/platform/wallet_payment/routes.py:150` `@router.patch("/deliveries/{order_id}/status/arrived")` | `"Arrived at Restaurant"` (`routes.py:160`) | `mobile_app/lib/data/repositories/rider_repository.dart:74` `_client.patchJson('/wallet/deliveries/$orderId/status/arrived')` | ✅ |
| Picked up | `routes.py:165` `@router.patch(".../status/picked-up")` | `"Picked Up"` (`routes.py:175`) | segment `picked-up` (`rider_models.dart:399`) | ✅ |
| On the way | `routes.py:180` `@router.patch(".../status/on-the-way")` | `"On the Way"` (`routes.py:190`) | segment `on-the-way` (`rider_models.dart:401`) | ✅ |
| Delivered | `routes.py:195` `@router.patch(".../status/delivered")` | `"Delivered"` (`routes.py:205`) | segment `delivered` (`rider_models.dart:403`) | ✅ |

**Method:** backend uses `PATCH` (not POST) — mobile matches. **Status names:** mobile `RiderAction.wireValue` matches the backend's exact strings (`rider_models.dart:383-386`), and `endpointSegment` (`rider_models.dart:394-404`) matches the path suffixes.

**Rider UI flow vs backend state machine** (`food_delivery/service.py:568` `ORDER_STATUS_TRANSITIONS`):

| Backend transition | Mobile UI trigger | Match |
|---|---|---|
| `Rider Assigned` → `Accepted by Rider` / `Rejected` | `POST /wallet/assignments/{id}/respond` `accept`/`reject` buttons | ✅ |
| `Accepted by Rider` → `Arrived at Restaurant` | `nextAction` = `arrivedAtRestaurant` (`rider_models.dart:341`) | ✅ |
| `Arrived at Restaurant` → `Picked Up` | `nextAction` = `pickedUp` (`:343`) | ✅ |
| `Picked Up` → `On the Way` | `nextAction` = `onTheWay` (`:345`) | ✅ |
| `On the Way` → `Delivered` | `nextAction` = `delivered` (`:347`) | ✅ |

**No fix required** for A1 — this was already correct in Phase 1.

---

### Part A2 — Clean parity table

| Feature | Mobile file | Backend endpoint (method + path) | Match? | Fix |
|---|---|---|---|---|
| Customer OTP request | `auth_repository.dart` (`requestOtp`) | `POST /auth/otp/request` | ✅ | — |
| Customer OTP verify | `auth_repository.dart` (`verifyCustomerOtp`) | `POST /auth/otp/verify` | ✅ | — |
| Rider register | `auth_repository.dart` (`verifyRiderOtp` with signup) | `POST /auth/rider/register` | ✅ | — |
| Rider login OTP verify | `auth_repository.dart` (`verifyRiderOtp`) | `POST /auth/rider/login/otp-verify` | ✅ | — |
| Token refresh | `auth_repository.dart` (`refresh`) | `POST /auth/refresh` | ✅ | — |
| Logout / revoke | `auth_repository.dart` (`logout`) | `POST /auth/logout` | ✅ | — |
| Identity check | `auth_repository.dart` (`me`) | `GET /auth/me` | ✅ | — |
| Profile read | `user_repository.dart` (`getProfile`) | `GET /users/me` | ✅ | — |
| Profile update | `user_repository.dart` (`updateProfile`) | `PUT /users/me` (backend is **PUT**, not PATCH) | ✅ | — |
| Addresses list | `user_repository.dart` (`listAddresses`) | `GET /users/me/addresses` | ✅ | — |
| Address create | `user_repository.dart` (`createAddress`) | `POST /users/me/addresses` | ✅ | — |
| Address update | `user_repository.dart` (`updateAddress`) | `PUT /users/me/addresses/{id}` | ✅ | — |
| Address delete | `user_repository.dart` (`deleteAddress`) | `DELETE /users/me/addresses/{id}` (204) | ✅ | — |
| Restaurant browse | `restaurant_repository.dart` (`browse`) | `GET /restaurants` | ✅ | — |
| Menu | `restaurant_repository.dart` (`menu`) | `GET /restaurants/{id}/menu` | ✅ | — |
| Cart read | `cart_repository.dart` (`getCart`) | `GET /restaurants/{id}/cart` | ✅ | — |
| Cart add item | `cart_repository.dart` (`addItem`) | `POST /restaurants/{id}/cart/items` | ✅ | — |
| Cart qty update | `cart_repository.dart` (`updateQuantity`) | `PATCH /restaurants/{id}/cart/items/{item_id}` | ✅ | — |
| Cart remove item | `cart_repository.dart` (`removeItem`) | `DELETE /restaurants/{id}/cart/items/{item_id}` | ✅ | — |
| Cart clear | `cart_repository.dart` (`clearCart`) | `DELETE /restaurants/{id}/cart` (204) | ✅ | — |
| Checkout preview | `order_repository.dart` (`previewCheckout`) | `GET /restaurants/{id}/cart/checkout-preview?address_id=` | ✅ | — |
| Place order | `order_repository.dart` (`placeOrder`) | `POST /restaurants/{id}/cart/checkout` + `Idempotency-Key` | ✅ | — |
| Orders list | `order_repository.dart` (`history`) | `GET /orders` | ✅ | — |
| Track (poll) | `order_repository.dart` (`track`) | `GET /orders/{id}/track` | ✅ | — |
| Track (socket) | `services/live_location_socket.dart` + `api_config.dart:orderTrackingSocketUri` | `WS /orders/{id}/track?token=` | ✅ | — |
| Rider location | `rider_location_repository.dart` (`getRiderLocation`) | `GET /orders/{id}/rider-location` | ✅ | — |
| Reorder | `order_repository.dart` (`reorder`) | `POST /orders/{id}/reorder` | ✅ | — |
| Rating | `order_repository.dart` (`submitRating`) | `POST /orders/{id}/rating` | ✅ | — |
| Rider profile | `rider_repository.dart` (`profile`) | `GET /wallet/profile` + `GET /wallet/balance` | ✅ | — |
| Rider assignments | `rider_repository.dart` (`assignments`) | `GET /wallet/assignments` | ✅ | — |
| Accept/reject | `rider_repository.dart` (`respondToAssignment`) | `POST /wallet/assignments/{id}/respond` | ✅ | — |
| Delivery step | `rider_repository.dart` (`advanceDeliveryStatus`) | `PATCH /wallet/deliveries/{id}/status/{step}` | ✅ | — |
| Wallet balance | `rider_repository.dart` (`earnings`) | `GET /wallet/earnings` | ✅ | — |
| Online toggle | `rider_repository.dart` (`setOnline`) | `PATCH /wallet/status` | ✅ | — |
| COD eligibility | `rider_repository.dart` (`codEligibility`) | `GET /wallet/cod-eligibility` | ✅ | — |
| Rider GPS push | `rider_repository.dart` (`updateLocation`) | `PATCH /wallet/location` | ✅ | — |
| Wallet recharge | `rider_repository.dart` (`recharge`) | `POST /wallet/recharge` | ✅ | — |
| Cash deposit | `rider_repository.dart` (`submitCashDeposit`) | `POST /wallet/cash-deposit` | ✅ | — |
| Document upload | `rider_repository.dart` (`uploadDocument`) | `POST /wallet/documents/{doc_type}` (multipart) | ✅ | — |
| Device register | `device_repository.dart` (`register`) | `POST /devices` | ✅ | — |
| Device unregister | `device_repository.dart` (`unregister`) | `DELETE /devices?token=` | ✅ | — |
| Reverse geocode | `location_repository.dart` (`reverseGeocode`) | `GET /api/v1/location/reverse-geocode` | ✅ | — |
| Places autocomplete | `location_repository.dart` (`autocompletePlaces`) | `GET /api/v1/location/places/autocomplete` | ✅ | — |
| Places details | `location_repository.dart` (`placeDetails`) | `GET /api/v1/location/places/details` | ✅ | — |
| **Account deletion** | `user_repository.dart` (`deleteAccount`) + profile UI | `DELETE /users/me` — **backend endpoint does not exist yet** | ❌ | Backend diff proposed in A4; mobile calls it, awaiting approval |

> **Note on `/users/me`:** the brief says "GET, PATCH". The backend implements **PUT** (`users/routes.py:36`). Mobile matches the backend (`putJson('/users/me')`), so no change.

---

### Part A3 — Fees and constants

`AppConstantsFee` no longer exists — Phase 1 folded display-only values into `AppConstants` and, per the file's own header, **no money constants live there at all**. Every amount at checkout comes from the preview response.

| Check | Backend source of truth | Mobile | Verdict |
|---|---|---|---|
| No client-side price math at checkout | `food_delivery/service.py:1520-1527` | `checkout_screen.dart` renders only `_preview!.foodSubtotalLabel / gstAmountLabel / deliveryFeeLabel / platformFeeLabel / totalLabel` (`:442-497`); `placeOrder` sends `_preview?.total` as `expected_total` (`:111`) | ✅ No arithmetic |
| Delivery fee `100 + km×25` | `DELIVERY_FEE_BASE=100`, `DELIVERY_FEE_PER_KM=25` | Never mirrored; taken from preview | ✅ |
| Platform fee `Rs. 15` | `PLATFORM_FEE=15.00` | Never mirrored; taken from preview | ✅ |
| Min wallet to go online `Rs. 500` | `wallet_payment/service.py:44` `MIN_WALLET_BALANCE_TO_GO_ONLINE = 500` | `app_constants.dart` `riderMinWalletBalance = 500.0` | ✅ |
| Country code `+92` | `auth/schemas.py:13` default `"+92"` | `AuthRepository.defaultCountryCode = '+92'` | ✅ |
| OTP length `6` | `auth/service.py:96` `f"{secrets.randbelow(1_000_000):06d}"` | `otp_verification_screen.dart` maxLength 6 + `verifyOtp` requires length 6 | ✅ |
| OTP resend cooldown `45s` | `auth/service.py:38` `RESEND_COOLDOWN_SECONDS = 45` | `AppConstants.otpResendCooldown = Duration(seconds: 45)` | ✅ |
| OTP TTL `5 min` (context) | `auth/service.py:37` `OTP_EXPIRY_SECONDS = 300` | Not shown to user (no client edit needed) | ✅ (n/a) |
| Kit deposit `Rs. 5000` (context) | `wallet_payment/service.py` `KIT_DEPOSIT_AMOUNT = 5000` | `rider_dashboard_screen.dart:737` hardcodes "Rs. 5,000" text with a keep-in-sync comment | ⚠️ Documented only |

**Verdict:** all mirrored numbers match; all money shown at checkout is backend-sourced. The only unmirrored literal is the Rs. 5,000 kit-deposit *copy* (no endpoint exposes it), which is explicitly commented as a manual mirror.

---

### Part A4 — Account deletion (Play Store requirement)

#### (a) Backend diff — **AWAITING APPROVAL, NOT APPLIED**

The change is one endpoint plus a token-revocation denylist check. Nothing in `backend/` has been edited.

```diff
--- a/backend/app/platform/users/service.py
+++ b/backend/app/platform/users/service.py
@@
 import uuid
+import logging
 
 from fastapi import HTTPException, status
 from sqlalchemy.orm import Session
 
+from app.core.config import settings
+from app.core.redis_client import redis_client
+from app.modules.food_delivery.models import Order
+from app.platform.auth.models import RefreshToken
+from app.platform.notification.models import DeviceToken
 from app.platform.users.models import Address, User
 from app.platform.users.schemas import AddressCreateSchema, AddressUpdateSchema, UserProfileUpdateSchema
+from app.platform.wallet_payment.models import Rider
+
+logger = logging.getLogger(__name__)
+
+# Any non-terminal order blocks deletion: Delivered / Cancelled are safe history.
+ACTIVE_ORDER_STATUSES = {
+    "Accepted", "Preparing", "Ready for Pickup", "Rider Assigned", "Rejected",
+    "Accepted by Rider", "Arrived at Restaurant", "Picked Up", "On the Way",
+}
+ANONYMIZED_NAME = "Deleted User"
+
+
+def _revoke_subject_sessions(db: Session, subject_id: uuid.UUID, role: str) -> None:
+    db.query(RefreshToken).filter(
+        RefreshToken.subject_id == subject_id,
+        RefreshToken.role == role,
+        RefreshToken.status == "valid",
+    ).update({"status": "revoked"}, synchronize_session=False)
+
+
+def _delete_subject_devices(db: Session, subject_id: uuid.UUID, role: str) -> None:
+    db.query(DeviceToken).filter(
+        DeviceToken.subject_id == subject_id, DeviceToken.role == role
+    ).delete(synchronize_session=False)
+
+
+def _denylist_access_tokens(subject_id: uuid.UUID) -> None:
+    """Access tokens are stateless JWTs; a denylist entry (TTL = token lifetime)
+    makes them unusable immediately, not just at natural expiry."""
+    try:
+        redis_client.setex(
+            f"deleted:{subject_id}", settings.JWT_EXPIRE_MINUTES * 60 + 60, "1"
+        )
+    except Exception:
+        logger.exception("Could not write deletion denylist for %s", subject_id)
+
+
+def delete_customer_account(db: Session, user_id: uuid.UUID) -> None:
+    user = get_profile(db, user_id)          # 404 if unknown
+    if not user.is_active:                   # idempotent: already deleted
+        return
+
+    active = db.query(Order).filter(
+        Order.user_id == user_id, Order.status.in_(ACTIVE_ORDER_STATUSES)
+    ).count()
+    if active:
+        raise HTTPException(
+            status_code=status.HTTP_409_CONFLICT,
+            detail=(
+                "You have an active or pending order. Please wait until it is "
+                "delivered or cancelled, then delete your account."
+            ),
+        )
+
+    # Anonymize (keep the row: orders/payments FK to users.id). Phone is
+    # released so the same number can sign up again later.
+    user.name = ANONYMIZED_NAME
+    user.email = None
+    user.phone_number = f"deleted:{user_id}"
+    user.is_active = False
+
+    # Personal data: remove saved addresses (each order keeps its own snapshot).
+    db.query(Address).filter(Address.user_id == user_id).delete(synchronize_session=False)
+
+    _revoke_subject_sessions(db, user_id, "customer")
+    _delete_subject_devices(db, user_id, "customer")
+    db.commit()
+
+    _denylist_access_tokens(user_id)
+    try:  # best-effort: drop any cached carts for this customer
+        for key in redis_client.scan_iter(match=f"cart:{user_id}:*"):
+            redis_client.delete(key)
+    except Exception:
+        logger.exception("Could not purge carts for %s", user_id)
+
+
+def delete_rider_account(db: Session, rider_id: uuid.UUID) -> None:
+    rider = db.query(Rider).filter(Rider.id == rider_id).first()
+    if rider is None:
+        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found.")
+    if not rider.is_active:
+        return
+
+    active = db.query(Order).filter(
+        Order.rider_id == rider_id, Order.status.in_(ACTIVE_ORDER_STATUSES)
+    ).count()
+    if active:
+        raise HTTPException(
+            status_code=status.HTTP_409_CONFLICT,
+            detail="You still have an active delivery. Finish it, then delete your account.",
+        )
+    if float(rider.wallet_balance or 0) != 0 or float(rider.pending_cash_owed or 0) != 0:
+        raise HTTPException(
+            status_code=status.HTTP_409_CONFLICT,
+            detail=(
+                "Your wallet balance and collected cash must be settled to Rs. 0 "
+                "before you can delete your account."
+            ),
+        )
+
+    rider.name = ANONYMIZED_NAME
+    rider.phone_number = f"deleted:{rider_id}"
+    rider.cnic_number = f"deleted:{rider_id}"   # unique column: keep it valid
+    rider.cnic_photo_url = None
+    rider.license_photo_url = None
+    rider.vehicle_photo_url = None
+    rider.current_latitude = None
+    rider.current_longitude = None
+    rider.is_online = False
+    rider.is_active = False
+
+    _revoke_subject_sessions(db, rider_id, "rider")
+    _delete_subject_devices(db, rider_id, "rider")
+    db.commit()
+
+    _denylist_access_tokens(rider_id)
+    try:
+        redis_client.delete(f"rider:location:{rider_id}")
+    except Exception:
+        logger.exception("Could not clear rider location for %s", rider_id)
```

```diff
--- a/backend/app/platform/users/routes.py
+++ b/backend/app/platform/users/routes.py
@@
-from fastapi import APIRouter, Depends, status
+from fastapi import APIRouter, Depends, HTTPException, status
 from sqlalchemy.orm import Session
 
 from app.core.database import get_db
-from app.platform.auth.dependencies import CurrentUser, require_role
+from app.platform.auth.dependencies import CurrentUser, get_current_user, require_role
@@
 @router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
 def delete_my_address(
     address_id: uuid.UUID,
     current_user: CurrentUser = Depends(require_customer),
     db: Session = Depends(get_db),
 ):
     service.delete_address(db, current_user.id, address_id)
+
+
+@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
+def delete_my_account(
+    current_user: CurrentUser = Depends(get_current_user),
+    db: Session = Depends(get_db),
+):
+    """Permanently delete the authenticated account (Play Store requirement).
+
+    Customers are anonymized/deactivated; riders must first be settled (wallet
+    and cash at Rs. 0) and free of active deliveries. Refresh tokens are revoked,    device (FCM) tokens removed and order/payment rows kept in anonymized form.
+    """
+    if current_user.role == "customer":
+        service.delete_customer_account(db, current_user.id)
+    elif current_user.role == "rider":
+        service.delete_rider_account(db, current_user.id)
+    else:
+        raise HTTPException(
+            status_code=status.HTTP_403_FORBIDDEN,
+            detail="Account deletion is not supported for this role in the mobile app.",
+        )
```

```diff
--- a/backend/app/platform/auth/dependencies.py
+++ b/backend/app/platform/auth/dependencies.py
@@
 from app.core.database import get_db
+from app.core.redis_client import redis_client
 from app.platform.auth import jwt_utils
 from app.platform.auth.models import Admin
@@
     if payload.get("type") != "access":
         raise HTTPException(
             status_code=status.HTTP_401_UNAUTHORIZED,
             detail="A refresh token cannot be used to access this resource.",
             headers={"WWW-Authenticate": "Bearer"},
         )
+
+    # Deleted accounts are denylisted in Redis for the access-token lifetime, so
+    # an already-issued access token stops working immediately.
+    try:
+        if redis_client.exists(f"deleted:{payload['sub']}"):
+            raise HTTPException(
+                status_code=status.HTTP_401_UNAUTHORIZED,
+                detail="This account has been deleted.",
+                headers={"WWW-Authenticate": "Bearer"},
+            )
+    except HTTPException:
+        raise
+    except Exception:
+        # Never fail closed on a Redis hiccup: the refresh-token revocation above
+        # still bounds the exposure to the short access-token TTL.
+        pass
```

**Trade-off / decision needed:** the denylist adds one Redis `EXISTS` to every authenticated request. Alternative if that cost is unwanted: accept that access tokens survive up to `JWT_EXPIRE_MINUTES` (30 min) and only revoke refresh tokens. **Please confirm which you want before I apply anything.**

#### (b) Mobile changes (applied directly)
- `UserRepository.deleteAccount()` → `DELETE /users/me` (`user_repository.dart`).
- `AuthService.deleteAccount()` → calls the endpoint, then (on success) `PushService.forgetDeviceToken()` + `CartService.purgeLocal()` + `_clearSession()` (`auth_service.dart`).
- `CartService.purgeLocal()` → clears local cart view **and** the persisted restaurant scope (`cart_service.dart`); also now called on ordinary `logout()`.
- Profile screen: destructive **Delete Account** tile with confirmation dialog, spinner/loading state (`_isDeletingAccount`), error handling (backend 409 message shown verbatim), and post-success return to `RegisterAsScreen` (`profile_screen.dart`).
- `PushService.forgetDeviceToken()` → local-only FCM token deletion (no network, since the server already removed its device rows).

#### (c) Riders
Backend rider deletion is included above and **blocks while `wallet_balance != 0` or `pending_cash_owed != 0`, or while an active delivery exists.** The mobile UI is the same flow (same endpoint); a rider is refused with the backend's 409 message. If you prefer a dedicated `/wallet/profile` DELETE instead of role-branching `/users/me`, say so and I will switch.

#### Web deletion page — requirements for you to host (nothing created in `website/`)
- **URL:** `https://speedymealservices.com/delete-account`
- **Content:** page title "Delete your SpeedyMeals account"; a plain-language explanation that submitting the form deletes the account and personal data; a form collecting the **account phone number** (and optional email); a submit button; a confirmation message stating what was deleted and that order/payment records are retained in anonymized form; a note that active orders must finish first; a support contact for questions.
- **Also link it** from the app's Profile screen (done) and from the store listing's account-deletion URL field.
- The page must be reachable **without** signing in and without the app.

---

### Part A5 — Legal links

Single source of truth: `mobile_app/lib/core/constants/app_constants.dart:51-53` (`termsUrl`, `privacyUrl`, `deleteAccountUrl`). Launcher: `widgets/legal_links.dart` (`LegalUtils.openUrl` with a friendly failure snackbar; `LegalConsentText` for the consent line). No duplicate/old URLs exist anywhere.

| Screen | Terms link | Privacy link | URL correct | Fixed |
|---|---|---|---|---|
| `customer_login_screen.dart` | ✅ `LegalConsentText` (`:366`) | ✅ `LegalConsentText` | ✅ | — |
| `customer_signup_screen.dart` | ✅ checkbox (`:320`) + consent (`:395`) | ✅ checkbox (`:330`) + consent | ✅ | — |
| `rider_login_screen.dart` | ✅ `LegalConsentText` (`:387`) | ✅ `LegalConsentText` | ✅ | — |
| `rider_signup_screen.dart` | ✅ tappable (`:359`) | ✅ tappable | ✅ | **Fixed** (was non-tappable "Fleet Partner Terms"/"Code of Conduct") |
| `otp_verification_screen.dart` | ✅ `LegalConsentText` (`:405`) | ✅ `LegalConsentText` | ✅ | **Fixed** (was missing) |
| `register_as_screen.dart` | ✅ `LegalConsentText` (`:309`) | ✅ `LegalConsentText` | ✅ | **Fixed** (widget was mis-nested inside `SizedBox(...)` → analyzer error) |
| `profile_screen.dart` (settings hub) | ✅ tile | ✅ tile | ✅ | **Fixed** (added Legal section) |
| Profile → Delete Account | — | — | ✅ | **Fixed** (added `https://speedymealservices.com/delete-account` link beside the Delete option) |

**Android 11+ launch:** `url_launcher ^6.3.2` is a declared dependency, and `AndroidManifest.xml` already declares the `<queries>` `VIEW`/`https` intent, so `launchUrl(mode: externalApplication)` resolves on API 30+. **Failure UX:** `LegalUtils._showError` shows a snackbar with the URL if launch fails. **Consent line:** "By continuing you agree to our Terms & Conditions and Privacy Policy" is present on every auth screen.

---

### Part B — Endpoint checklist

> **Testing caveat (please read):** the backend could **not** be run locally for live curl testing — the pre-existing missing `Pillow` dependency (Phase 0 finding) makes `app.main` fail to import, and **Redis is not running** (only Postgres is). Therefore "Working" below means **static contract verification against the route decorators + automated mobile tests** (`test/phase2_release_test.dart`, `test/maps_backend_integration_test.dart` use `MockClient` to assert exact path/method/headers/body). Live end-to-end calls were **not** performed. Nothing is marked "Working" on an unverified claim.

| Endpoint | Used in (file) | Tested | Working | Issue | Fixed |
|---|---|---|---|---|---|
| `POST /auth/otp/request` | `auth_repository.dart` | MockClient (backend-integration suite) | ✅ contract | — | — |
| `POST /auth/otp/verify` | `auth_repository.dart` | MockClient | ✅ contract | — | — |
| `POST /auth/rider/register` | `auth_repository.dart` | MockClient | ✅ contract | — | — |
| `POST /auth/rider/login/otp-verify` | `auth_repository.dart` | MockClient | ✅ contract | — | — |
| `POST /auth/refresh` | `auth_repository.dart` | MockClient (single-flight) | ✅ contract | — | — |
| `POST /auth/logout` | `auth_repository.dart` | — | ✅ contract | best-effort (errors swallowed by design) | — |
| `GET /auth/me` | `auth_repository.dart` | MockClient | ✅ contract | — | — |
| `GET /users/me` | `user_repository.dart` | MockClient | ✅ contract | — | — |
| `PUT /users/me` | `user_repository.dart` | MockClient | ✅ contract | brief said PATCH; backend is PUT | — |
| `GET/POST/PUT/DELETE /users/me/addresses` | `user_repository.dart` | MockClient | ✅ contract | — | — |
| **`DELETE /users/me`** | `user_repository.dart` | **Added unit test** (`phase2_release_test.dart`) | ⚠️ backend missing | no backend endpoint | backend diff proposed (A4) |
| `GET /restaurants` | `restaurant_repository.dart` | MockClient | ✅ contract | — | — |
| `GET /restaurants/{id}/menu` | `restaurant_repository.dart` | MockClient | ✅ contract | — | — |
| `cart` (all 5 routes) | `cart_repository.dart` | MockClient | ✅ contract | — | — |
| `GET .../checkout-preview` | `order_repository.dart` | MockClient | ✅ contract | — | — |
| `POST .../checkout` | `order_repository.dart` | MockClient (Idempotency-Key asserted) | ✅ contract | — | — |
| `GET /orders` | `order_repository.dart` | MockClient | ✅ contract | — | — |
| `GET /orders/{id}/track` | `order_repository.dart` | MockClient | ✅ contract | — | — |
| `WS /orders/{id}/track` | `live_location_socket.dart` | Unit tests (connector fakes) | ✅ contract | token in query (see security) | report only |
| `GET /orders/{id}/rider-location` | `rider_location_repository.dart` | MockClient | ✅ contract | — | — |
| `POST /orders/{id}/reorder` | `order_repository.dart` | MockClient | ✅ contract | — | — |
| `POST /orders/{id}/rating` | `order_repository.dart` | MockClient | ✅ contract | — | — |
| `/wallet/*` (12 routes) | `rider_repository.dart` | MockClient (GPS upload, etc.) | ✅ contract | unused `wallet()` removed | removed |
| `POST /devices` | `device_repository.dart` | MockClient | ✅ contract | — | — |
| `DELETE /devices` | `device_repository.dart` | MockClient | ✅ contract | — | — |
| `GET /api/v1/location/reverse-geocode` | `location_repository.dart` | MockClient | ✅ contract | — | — |
| `GET /api/v1/location/places/autocomplete` | `location_repository.dart` | MockClient | ✅ contract | — | — |
| `GET /api/v1/location/places/details` | `location_repository.dart` | MockClient | ✅ contract | — | — |

#### B2 — Production config / base URL
`ApiConfig.baseUrl` resolves `--dart-define=API_BASE_URL` first; in a release build with no override it throws a `StateError`, which `ApiClient._classifyTransportError` converts into the friendly "app is not configured…" error on the first request (never a silent localhost fallback). No `localhost`/`10.0.2.2`/`127.0.0.1`/staging URL is reachable in release (the dev hosts are only returned outside `kReleaseMode`). **Note:** "fails loudly" means at first network call, not at build time (Flutter cannot fail a release build from a Dart `const`); the message tells the user to reinstall/update.

#### B3 — HTTPS only
`AndroidManifest.xml` does **not** set `usesCleartextTraffic`. The network security config permits cleartext **only** for `10.0.2.2`, `localhost`, `127.0.0.1` (dev). Production hosts are therefore HTTPS-only. Base URL is stripped of a trailing slash; WS base is derived (`https`→`wss`). No change required.

#### B4 — Token handling
- Refresh single-flight: `ApiClient._ensureRefreshed` / `_refreshInFlight` ✅
- 401 after refresh failure → `_doRefresh` clears tokens and fires `onSessionExpired` → `AuthService._handleSessionExpired` → `_clearSession` ✅
- Tokens stored only via `flutter_secure_storage` (`TokenStorage`; in-memory fallback when the keystore is unavailable, then re-login) ✅
- `/auth/me` used only during `bootstrap()` to restore/validate the session ✅

#### B5 — Idempotency
`POST .../checkout` sends `Idempotency-Key` (UUID) and reuses the key across retries of the same attempt (`order_repository.dart`). Double-tap is blocked by `_isPlacingOrder` guard + disabled button (`checkout_screen.dart:47,98,511`). ✅

---

### Part B — Security notes

1. **WebSocket token in the URL query — SECURITY RISK (reported, not changed).** `api_config.dart` builds `ws(s)://…/orders/{id}/track?token=<access JWT>` because the backend reads `token: str = Query(...)` (`food_delivery/routes.py:465`). Query strings are commonly written to proxy/access logs and can leak the bearer token. **Suggested alternative:** move to the `Sec-WebSocket-Protocol` header (e.g. `bearer.<jwt>`) or a short-lived one-time ticket fetched over HTTPS, and have the backend read the token from there. Requires a backend change; reported only per instructions.
2. **Cleartext:** none in release (see B3). ✅
3. **Token storage:** secure storage only (see B4). No tokens are written to `shared_preferences` or logs; the socket URI is redacted via `ApiConfig.redact` before logging. ✅
4. **WebSocket close codes:** the backend only ever closes with `4003` (auth/ownership failure) or `1000` (normal, order complete). It never sends `4001`/`4004`. `LiveLocationSocket` does not inspect close codes at all — it treats any drop as a reconnect candidate (bounded to 3 attempts) and then falls back to REST polling. **Follow-up (not blocking):** on a `4003` the client should not retry (the token is bad); surface a re-auth prompt instead. The transport layer (`websocket_connector_io.dart`) would need to expose the close code first.

---

### Part B — Error handling matrix

| API call | Loading | Empty | Error | Offline | Fixed |
|---|---|---|---|---|---|
| OTP request / resend | `_isVerifying`/`_isResending` | n/a | 400/429 → `AuthException.fromApi` friendly copy | network/timeout copy | — |
| OTP verify | spinner on button | n/a | 400/401 verbatim detail | copy | — |
| Profile read | `_isLoadingAddresses` | "Add a delivery address" | falls back to guest labels | copy via state | — |
| Addresses | loading text | empty-state | `_locationError` / snackbar | copy | — |
| Restaurants browse | skeletons | "No results" empty state | error state | `ApiErrorKind.network` copy | — |
| Menu | skeleton | sold-out flags | per-restaurant empty tolerated | copy | — |
| Cart | row spinners | "Your cart is empty" | re-reads authoritative cart | copy | — |
| Checkout preview | skeleton | n/a | 503 → `ApiErrorKind.unavailable` message (`checkout_screen.dart:150`) | copy | — |
| Place order | `_isPlacingOrder` | n/a | 400/402/409 surfaced | copy | — |
| Orders list | skeleton | empty state | error state | copy | — |
| Track (poll + WS) | progress | n/a | degrades to polling | last-known marker | — |
| Rider location | indicator | "Location unavailable" | 404/409 → null (no crash) | keeps last marker | — |
| Reorder | button spinner | skipped items reported | error copy | copy | — |
| Rating | `_isSubmitting` | n/a | 400 (already rated) | copy | — |
| Rider dashboard | skeleton | "No deliveries assigned" | retry state | `wifi_off` state | — |
| Rider doc upload | per-doc spinner | n/a | **413** now mapped + **client 5 MB guard** | copy | **Yes** |
| Wallet actions | button spinners | zeros | messages via `error.message` | copy | — |
| Devices register/unregister | silent | n/a | swallowed (non-fatal) | retried next login | — |
| Location search (Places) | inline spinner | empty suggestions | **503** → backend detail shown | `_error` string | manual lat/lng fallback exists |

---

### Changelog — files changed in Phase 2

| File | Change |
|---|---|
| `mobile_app/lib/data/repositories/user_repository.dart` | Added `deleteAccount()` (`DELETE /users/me`) |
| `mobile_app/lib/services/auth_service.dart` | Added `deleteAccount()`; `logout()` now purges the local cart |
| `mobile_app/lib/services/cart_service.dart` | Added `purgeLocal()` |
| `mobile_app/lib/services/push_service.dart` | Added `forgetDeviceToken()` |
| `mobile_app/lib/screens/profile/profile_screen.dart` | Added Legal section (Terms/Privacy) + Delete Account flow + web-deletion link |
| `mobile_app/lib/screens/auth/rider_signup_screen.dart` | Tappable Terms & Conditions / Privacy Policy |
| `mobile_app/lib/screens/auth/otp_verification_screen.dart` | Added legal consent line |
| `mobile_app/lib/screens/auth/register_as_screen.dart` | Fixed misplaced consent widget (analyzer error) |
| `mobile_app/lib/data/repositories/rider_repository.dart` | Removed dead `wallet()` |
| `mobile_app/lib/data/repositories/cart_repository.dart` | Removed dead `getResolvedCart()` + unused import |
| `mobile_app/lib/data/repositories/restaurant_repository.dart` | Removed dead `flatten()` |
| `mobile_app/lib/core/network/api_exception.dart` | Explicit 413 mapping |
| `mobile_app/lib/screens/rider/rider_documents_screen.dart` | Client-side 5 MB upload guard |
| `mobile_app/test/phase2_release_test.dart` | New: delete-account + legal-links tests |
| `mobile_app/RELEASE_AUDIT.md` | This section |

---

### Questions for me / could not fix

1. **Backend deletion diff** — approve as-is, or drop the Redis access-token denylist (accepting up to 30 min of access-token life) to avoid a Redis `EXISTS` per request? Also confirm role-branched `DELETE /users/me` vs a separate rider endpoint.
2. **Live backend testing blocked** — `Pillow` is missing from `backend/venv` (pre-existing) and Redis is not running. To run real curl tests I would need to install Pillow into the venv and start Redis; both are outside the "mobile_app only" rule, so I did not. Say the word and I will (or you can start them).
3. **WebSocket token** — report-only per instructions; changing it needs a backend change.
4. **`DELETE /users/me` cannot succeed until the backend change ships** — the mobile UI is ready and tested, but the endpoint 404s today. That is the only item blocking a green end-to-end deletion flow.
5. `AppConstantsFee` no longer exists (Phase 1 consolidation); if you specifically want a class by that name for traceability, tell me and I will re-introduce a thin alias.

---

### Verification

- `flutter analyze` → **No issues found!**
- `flutter test` → **113/113 passing** (107 existing + 6 new in `phase2_release_test.dart`).
- `git status --porcelain -- website` → **empty** (below in the commit report).
- `git diff --stat -- website` → **empty**.

---

## Phase 3: Deferred rider account deletion (change request — awaiting approval)

**Scope rules honoured:** `backend/` + `mobile_app/` only; `website/` never touched. The backend
change is delivered as a **diff + Alembic migration and is NOT applied** — it waits for approval.
This **replaces** the Phase 2 Part A4 proposal (role-branched immediate `DELETE /users/me` for
riders): riders are now deferred and admin-reviewed instead.

### 3.1 What is proposed for the backend (not applied)

Artifact: **`mobile_app/docs/account-deletion/backend-deletion-proposal.patch`** (3,212 lines,
14 files, 3,053 insertions — generated from a detached worktree so this branch's working tree
never contained the change).

```
 git apply --check mobile_app/docs/account-deletion/backend-deletion-proposal.patch   # passes today
 git apply          mobile_app/docs/account-deletion/backend-deletion-proposal.patch   # after approval
```

| File | Change |
|---|---|
| `backend/app/platform/account_deletion/{`__init__`',models,schemas,service,routes}.py` | **new** module: table, schemas, state machine, holder/public/admin routes |
| `backend/app/core/deletion_review_job.py` | **new** idempotent job (in-process + `python -m` CLI) |
| `backend/app/core/config.py` | +`RIDER_DELETION_GRACE_DAYS=7`, `ALLOW_EARLY_ADMIN_APPROVAL=false`, `DELETION_REQUEST_OVERDUE_DAYS=30`, `DELETION_REVIEW_JOB_ENABLED=true`, `DELETION_REVIEW_JOB_INTERVAL_SECONDS=3600` |
| `backend/app/core/storage.py` | +`delete_rider_document_url()` (private `rider-docs` bucket, both S3 and Supabase URL shapes) |
| `backend/app/platform/auth/dependencies.py` | Redis denylist check (`deleted:<subject_id>`) so an issued access token dies at execution; fails open |
| `backend/app/main.py` | mounts the three routers; starts/stops the review job |
| `backend/app/migrations/env.py` | imports the new models for autogenerate/drift |
| `backend/app/migrations/versions/d4a7c9e1f2b3_add_deletion_requests.py` | **migration (see 3.2)** |
| `backend/app/tests/test_account_deletion.py` | **new** 33 assertions-worth of tests (see 3.5) |
| `backend/app/tests/test_migration_drift.py` | imports the new model so drift stays guarded |

**Alembic migration — `d4a7c9e1f2b3_add_deletion_requests.py`**

- Revises `e8b7a6c5d4f3` (the previous single head).
- Creates `deletion_requests` with exactly the requested columns: `id`, `user_id`, `role`,
  `status`, `requested_at`, `grace_ends_at`, `requested_via`, `reviewed_by` (FK → `admins.id`,
  `ON DELETE SET NULL`), `reviewed_at`, `admin_note`, `hold_reason`, `kyc_action`,
  `kyc_retain_until`, `kyc_purged_at`, plus `created_at`.
- Indexes: `ix_deletion_requests_user_id`, `ix_deletion_requests_user_role (user_id, role)`,
  `ix_deletion_requests_status`, `ix_deletion_requests_status_grace (status, grace_ends_at)`
  (the job's exact scan), `ix_deletion_requests_reviewed_by`.
- Seeds the permission **`manage_deletion_requests`** (`domain=account_deletion`,
  `risk_level=critical`) with `ON CONFLICT (key) DO NOTHING`, grants it to the **superadmin**
  role only (Support does not get a critical action by default), and runs the same Supabase-safe
  `GRANT` DO-block as the other migrations (no-op on plain Postgres).
- Downgrade drops the seed rows and the table; it never touches accounts, orders or payments.

**Rules implemented (1–6 of the change request)**

| # | Rule | Where |
|---|---|---|
| 1 | `deletion_requests` table + indexes, no sensitive data in logs | `models.py`; logging only ever emits request ids, roles and dates — phone/CNIC are masked or absent |
| 2 | Rider `DELETE /users/me` → `pending` + deactivate now, 409 on active delivery, returns `grace_ends_at`; `GET`/`POST …/cancel` | `routes.py` + `service.request_rider_deletion` / `cancel_deletion_request` |
| 3 | Daily job: `pending` → `ready_for_review`, notifies admins, **never deletes**, idempotent | `deletion_review_job.py` + `service.mark_pending_ready_for_review` |
| 4 | Admin queue with permission + audit rows; approve re-checks dues/delivery → 409 + `on_hold`; hold/release/purge-kyc; early approval gated by flag; 30-day `is_overdue` | `routes.py` (5 endpoints) + `service.admin_*` |
| 5 | Execution: anonymise, clear CNIC/vehicle/location, revoke refresh tokens, Redis denylist, delete device tokens, keep orders/payments anonymised; KYC `delete_now` / `retain_until` → `purge-kyc`; mark `completed` | `service.execute_deletion` (the **only** data-removing function) |
| 6 | Public `POST /account-deletion/request` (OTP, always-identical 202) and `/confirm` (OTP → rider deferred / customer immediate) | `routes.py` public router + `service.verified_phone_deletion` |

**Cancellation authentication (your "define it" item):** deactivation does **not** revoke the
session — revocation happens only at execution (rule 5) — so during the grace period the rider's
own access token authenticates `GET …/cancel` normally. A rider who lost the device cancels from
the hosted page with phone + OTP instead (the same verified flow as `/account-deletion/request`).

### 3.2 Public web + privacy text + deployment checklist (deliverables)

| File | For |
|---|---|
| `mobile_app/docs/account-deletion/admin-api-contract.md` | your web developer: full request/response JSON for all 5 admin endpoints, the public web endpoints and the mobile endpoints, incl. every error body |
| `mobile_app/docs/account-deletion/web-deletion-page-copy.md` | exact copy for `https://speedymealservices.com/delete-account` (7-day grace, admin review, dues rule, KYC handling, 30-day target, all error states) |
| `mobile_app/docs/account-deletion/privacy-policy-addendum.md` | exact privacy-policy section 9 replacement |
| `mobile_app/docs/account-deletion/deployment-checklist.md` | migration, job scheduler, Redis, storage permissions, admin permissions, staging smoke test, rollback |

### 3.3 Mobile (applied, tested)

| File | Change |
|---|---|
| `mobile_app/lib/data/models/deletion_models.dart` | **new** `DeletionRequest` + `DeletionRequestStatus` (labels, agreed wording, cancellability) and `DeletionRequestAction` |
| `mobile_app/lib/core/network/api_client.dart` | +`deleteJson()` (DELETE that returns a body; 204 tolerated) |
| `mobile_app/lib/data/repositories/rider_repository.dart` | +`requestAccountDeletion()` / `deletionRequest()` / `cancelDeletionRequest()` |
| `mobile_app/lib/screens/rider/rider_account_screen.dart` | **new** Request Account Deletion (exact dialog copy), status card (`pending` / `under review` / `on hold` + reason / `completed` / `cancelled`), dates, **Cancel deletion request**, 409 messages verbatim, web-deletion link + Terms/Privacy |
| `mobile_app/lib/screens/rider/rider_dashboard_screen.dart` | app-bar entry point (`Account & deletion`) → the screen, re-loads the dashboard on return |
| `mobile_app/test/account_deletion_test.dart` | **new** 18 tests |

Customer flow is unchanged (immediate `DELETE /users/me` → 204, 409 with a clear message), and
the link to `https://speedymealservices.com/delete-account` is kept on both the profile and the new
rider screen.

### 3.4 Mobile verification

- `flutter analyze` → **No issues found!**
- `flutter test` → **131/131 passing** (113 before this change + 18 new).
- `git status --porcelain -- website` → **empty**; `git diff --stat -- website` → **empty**.

### 3.5 Backend tests — written, **not yet run**

`backend/app/tests/test_account_deletion.py` covers every case in item 8: rider request →
`pending` + deactivated (+ 409 active delivery, idempotent re-request); cancel → reactivated
(and refused from `on_hold`/`completed`); job → `ready_for_review` only, never deletes,
re-run moves 0; approve with dues → `409` + `on_hold` + reason + audit; approve with an active
delivery → same; approve clean → `completed`, anonymised, refresh/device tokens gone; KYC
`delete_now` removes all three files (mocked storage); `retain_until` touches storage zero times
and leaks no URL; `purge-kyc` works then refuses a second time; admin without the permission →
`403`, customer token → `403`, no header → `401`; audit rows carry the admin id; customer
immediate; customer with active order → `409` and untouched; access token → `401` after
deletion; public web flow (identical 202s, `pending`/`deleted`/`no_account`, bad OTP → `400`).

**They could not be executed here:** `backend/venv` lacks `Pillow` (pre-existing; `app.core.storage`
imports PIL at module load) and there is no `.env`/`DATABASE_URL` for a migrated database, so
`app.core.config` cannot even be imported. Nothing was installed and no service was started —
that is environment work outside the "show the diff first" step. After approval, run:

```
cd backend && ./venv/bin/pip install pillow && cp .env.example .env   # or your real .env
./venv/bin/alembic upgrade head
./venv/bin/pytest app/tests/test_account_deletion.py app/tests/test_migration_drift.py -q
```

Static verification already done: all 14 patched files compile (`python -m py_compile`) and the
patch passes `git apply --check` against this branch.

### 3.6 Awaiting your approval

1. **Apply `backend-deletion-proposal.patch` as-is?** (It is the only backend change proposed;
   nothing in `backend/` has been edited.)
2. **Redis access-token denylist** — keep the one `EXISTS` per request (tokens die immediately
   after approval) or drop it (tokens live out their ≤30 min TTL; refresh tokens are still revoked)?
3. **Permission seeding** — `manage_deletion_requests` is granted to `superadmin` only. Say if the
   `support` role should have it too.
4. **Public OTP cost** — `/account-deletion/request` sends an SMS even to numbers with no account
   (that is what keeps responses non-enumerable). Accept, or skip sending for unknown numbers and
   accept the timing side channel?
5. Backend test run is blocked on `pillow` + a migrated `DATABASE_URL` (3.5) — approve installing
   `pillow` in `backend/venv` and I will run the suite before/after applying.
