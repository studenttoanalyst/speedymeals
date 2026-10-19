/// SpeedyMeals application constants and backend-aligned enums.
///
/// This file is the single source of truth for the vocabulary shared between
/// the Flutter UI and the FastAPI backend. Every wire string here was copied
/// from the backend source — do not invent values, and change them here only
/// when the backend changes.
///
/// Money: the backend is authoritative for every price. The fee constants below
/// are DISPLAY FALLBACKS ONLY (used for empty/estimate states before the
/// checkout preview responds). The authoritative numbers always come from
/// `GET /restaurants/{restaurant_id}/cart/checkout-preview`.
library;

class AppConstants {
  // NOTE: no delivery-fee / rider-deduction constants live here. The backend is
  // authoritative for every amount (`food_delivery/service.py`:
  // `DELIVERY_FEE_BASE = 100`, `DELIVERY_FEE_PER_KM = 25`, `PLATFORM_FEE = 15`),
  // and the only correct source in the app is the API response
  // (`GET /restaurants/{id}/cart/checkout-preview`). A duplicated client copy
  // inevitably drifts from the server, so money values are never mirrored here.

  /// ETA shown before a real estimate is available (base + per-km factor).
  ///
  /// Display estimate only; whenever the backend supplies an ETA (`eta` or
  /// `duration_mins` on tracking) that value wins over this fallback.
  static const int baseEtaMinutes = 10;
  static const double etaPerKmFactor = 3.0;

  /// Minimum rider wallet balance to go online (0.0 after commit 3a49219
  /// removed the threshold from `wallet_payment/service.py`).
  static const double riderMinWalletBalance = 0.0;

  /// Rider OTP resend cooldown enforced server-side
  /// (`auth/service.py`, surfaced as HTTP 429).
  static const Duration otpResendCooldown = Duration(seconds: 45);

  /// How often an in-flight order is re-polled as a fallback. Live updates are
  /// primarily streamed over `WS /orders/{id}/track`
  /// (`services/live_location_socket.dart`); this REST poll
  /// (`GET /orders/{id}/track`) is the safety net when the socket is unavailable.
  static const Duration orderPollInterval = Duration(seconds: 15);

  // App info — single source of truth for the brand name and tagline.
  // Every screen (splash, dashboards, notifications, network errors) reads
  // these instead of hardcoding the strings, so the name can never drift.
  static const String appName = 'SpeedyMeals';
  static const String appTagline = 'Lightning Fast Delights';

  /// Placeholder shown when a customer has no saved address yet.
  static const String noAddressLabel = 'Add a delivery address';

  /// Support contact shown in the app and in the published policy pages.
  static const String supportEmail = 'support@speedymealservices.com';

  // Legal & Support URLs
  static const String termsUrl = 'https://speedymealservices.com/terms';
  static const String privacyUrl = 'https://speedymealservices.com/privacy';
  static const String deleteAccountUrl = 'https://speedymealservices.com/delete-account';
}

/// User roles, matching the `role` claim the backend embeds in every JWT and
/// the `role` column on `refresh_tokens`.
///
/// `restaurant` and `admin` exist so a stray token is understood rather than
/// crashing the app; this mobile client only ever signs in as `customer` or
/// `rider`.
enum UserRole {
  customer('customer'),
  rider('rider'),
  restaurant('restaurant'),
  admin('admin'),

  /// Fallback for an unrecognised or absent role.
  unknown('unknown');

  const UserRole(this.wireName);

  /// Exact string used by the backend.
  final String wireName;

  /// Rider sign-in uses the rider-specific OTP endpoints instead of
  /// `POST /auth/otp/verify`: `POST /auth/rider/login/otp-verify` for an
  /// existing rider and `POST /auth/rider/register` for first-time signup.
  /// Everything else about the flow is identical.
  bool get isRider => this == UserRole.rider;

  static UserRole fromWire(String? value) {
    if (value == null) return UserRole.unknown;
    for (final role in values) {
      if (role.wireName == value) return role;
    }
    return UserRole.unknown;
  }
}

/// Order lifecycle statuses.
///
/// Wire values are copied verbatim from backend
/// `food_delivery/service.py: ORDER_STATUS_TRANSITIONS` and placement constants:
///
/// Order Lifecycle Flow:
///   1. Customer placement creates order directly as `Accepted` (no `Placed` state).
///   2. Restaurant advances: `Accepted` -> `Preparing`.
///   3. Restaurant marks food ready: `Preparing` -> `Ready for Pickup`.
///   4. Backend auto-assignment assigns rider: `Ready for Pickup` -> `Rider Assigned`.
///   5. Rider response: `Rider Assigned` -> `Accepted by Rider` (or `Rejected` -> reassigns next rider).
///   6. Rider travels to restaurant: `Accepted by Rider` -> `Arrived at Restaurant`.
///   7. Rider picks up meal: `Arrived at Restaurant` -> `Picked Up`.
///   8. Delivery in progress: `Picked Up` -> `On the Way`.
///   9. Completion: `On the Way` -> `Delivered`.
///  10. Admin cancellation: `Cancelled` (terminal at any point).
///
/// Orders are created as `Accepted` (the restaurant accepted at placement), so
/// `Placed` is deliberately NOT a status here.
enum OrderStatus {
  accepted('Accepted'),
  preparing('Preparing'),
  readyForPickup('Ready for Pickup'),
  riderAssigned('Rider Assigned'),
  rejected('Rejected'),
  acceptedByRider('Accepted by Rider'),
  arrivedAtRestaurant('Arrived at Restaurant'),
  pickedUp('Picked Up'),
  onTheWay('On the Way'),
  delivered('Delivered'),
  cancelled('Cancelled'),

  /// A status this app version does not know about. Renders the raw string
  /// through [OrderStatus.rawWireValue] rather than crashing.
  unknown('Unknown');

  const OrderStatus(this.wireValue);

  /// Exact string used by the backend.
  final String wireValue;

  /// Populated only for [OrderStatus.unknown], so newer backend states still
  /// display something accurate instead of "Unknown".
  static String? lastUnknownWireValue;

  static OrderStatus fromWire(String? value) {
    if (value == null) return OrderStatus.unknown;
    for (final status in values) {
      if (status.wireValue == value) return status;
    }
    lastUnknownWireValue = value;
    return OrderStatus.unknown;
  }

  /// True once no further status change is possible.
  bool get isTerminal => this == delivered || this == cancelled;

  /// True while the customer should keep polling for updates.
  bool get isActive => !isTerminal;

  /// Customer-facing copy (the design's wording, not the backend's).
  String get customerLabel {
    switch (this) {
      case OrderStatus.accepted:
        return 'Order confirmed';
      case OrderStatus.preparing:
        return 'Preparing your food';
      case OrderStatus.readyForPickup:
        return 'Ready for pickup';
      case OrderStatus.riderAssigned:
        return 'Rider assigned';
      case OrderStatus.rejected:
        return 'Reassigning a rider';
      case OrderStatus.acceptedByRider:
        return 'Rider on the way to restaurant';
      case OrderStatus.arrivedAtRestaurant:
        return 'Rider at the restaurant';
      case OrderStatus.pickedUp:
        return 'Order picked up';
      case OrderStatus.onTheWay:
        return 'On the way to you';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.unknown:
        return lastUnknownWireValue ?? 'In progress';
    }
  }

  /// Compact label for chips and list rows.
  String get shortLabel {
    switch (this) {
      case OrderStatus.accepted:
        return 'Confirmed';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.readyForPickup:
        return 'Ready';
      case OrderStatus.riderAssigned:
        return 'Assigned';
      case OrderStatus.rejected:
        return 'Reassigning';
      case OrderStatus.acceptedByRider:
        return 'Rider accepted';
      case OrderStatus.arrivedAtRestaurant:
        return 'At restaurant';
      case OrderStatus.pickedUp:
        return 'Picked up';
      case OrderStatus.onTheWay:
        return 'On the way';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.unknown:
        return lastUnknownWireValue ?? 'In progress';
    }
  }

  /// Index of this status on the customer's 5-step tracker.
  ///
  /// Steps: 0 accepted · 1 preparing · 2 rider assigned · 3 on the way ·
  /// 4 delivered. Cancelled returns -1 so the tracker can render a distinct
  /// cancelled state instead of a progress position.
  int get trackerStep {
    switch (this) {
      case OrderStatus.accepted:
        return 0;
      case OrderStatus.preparing:
      case OrderStatus.readyForPickup:
        return 1;
      case OrderStatus.riderAssigned:
      case OrderStatus.rejected:
        return 2;
      case OrderStatus.acceptedByRider:
      case OrderStatus.arrivedAtRestaurant:
      case OrderStatus.pickedUp:
      case OrderStatus.onTheWay:
        return 3;
      case OrderStatus.delivered:
        return 4;
      case OrderStatus.cancelled:
      case OrderStatus.unknown:
        return -1;
    }
  }

  /// Labels for the 5-step customer tracker, in order.
  static const List<String> trackerLabels = [
    'Confirmed',
    'Preparing',
    'Rider assigned',
    'On the way',
    'Delivered',
  ];

  /// Convert this status back to its wire string (used when the UI needs to
  /// send a status the backend will validate against its state machine).
  String toWire() => wireValue;
}

/// Payment methods accepted by
/// `food_delivery/service.py: VALID_PAYMENT_METHODS = {"COD", "Digital"}`.
///
/// There is no card / JazzCash / EasyPaisa / wallet order flow in this backend:
/// `Digital` is an explicitly documented MVP stub
/// (`_process_digital_payment`). Anything else sent to
/// `POST /restaurants/{id}/cart/checkout` is rejected with 400.
enum PaymentMethod {
  /// Cash on delivery — cash changes hands when the rider delivers.
  cod('COD', 'Cash on Delivery'),

  /// Online payment. The backend accepts it and completes the order; the
  /// gateway itself is an MVP stub that records a reference and moves on
  /// (`food_delivery/service.py: _process_digital_payment`), so no
  /// customer-facing screen should label it as a demo/test payment.
  digital('Digital', 'Pay Online');

  const PaymentMethod(this.wireValue, this.label);

  /// Exact string used by the backend.
  final String wireValue;
  final String label;

  static PaymentMethod fromWire(String? value) {
    for (final method in values) {
      if (method.wireValue == value) return method;
    }
    return PaymentMethod.cod;
  }
}

/// Broad food categories used for the dashboard's category chips and icons.
///
/// Presentation-only: the backend groups `menu_items` by their free-text
/// `category` column, so this enum feeds icons/labels, not filtering logic.
enum FoodCategory {
  pizza,
  burgers,
  drinks,
  dessert,
  fastFood,
  shawarma,
}
