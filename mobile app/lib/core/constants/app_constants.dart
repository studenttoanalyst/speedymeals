/// Speedy Meals application constants and backend-aligned enums.
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
  /// Delivery fee rule — mirrors backend
  /// `food_delivery/service.py: DELIVERY_FEE_BASE / DELIVERY_FEE_PER_KM`:
  /// `fee = 50 + (km x 20)`.
  ///
  /// Display fallback only; never used to compute an order total.
  static const double deliveryFeeBase = 50.0;
  static const double deliveryFeePerKm = 20.0;

  /// ETA shown before a real estimate is available (base + per-km factor).
  static const int baseEtaMinutes = 10;
  static const double etaPerKmFactor = 3.0;

  /// Flat fee the backend deducts from a rider's wallet per completed delivery
  /// (`wallet_payment/service.py: DELIVERY_DEDUCTION_AMOUNT`).
  static const double riderDeliveryDeduction = 10.0;

  /// Minimum rider wallet balance required to go online
  /// (`wallet_payment/service.py: MIN_WALLET_BALANCE`).
  static const double riderMinWalletBalance = 500.0;

  /// Rider OTP resend cooldown enforced server-side
  /// (`auth/service.py`, surfaced as HTTP 429).
  static const Duration otpResendCooldown = Duration(seconds: 45);

  /// How often an in-flight order is re-polled. The backend has no WebSockets
  /// or push (spec §14) — the client polls `GET /orders/{id}/track` instead.
  static const Duration orderPollInterval = Duration(seconds: 15);

  // App info
  static const String appName = 'Speedy Meals';
  static const String appTagline = 'Fast & Fresh Delivery';

  /// Placeholder shown when a customer has no saved address yet.
  static const String noAddressLabel = 'Add a delivery address';
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

  /// Rider sign-in uses `POST /auth/rider/otp/verify` instead of
  /// `POST /auth/otp/verify`; everything else about the flow is identical.
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
/// Wire values are copied verbatim from
/// `food_delivery/service.py: ORDER_STATUS_TRANSITIONS` plus the two terminal
/// states the backend can also write (`Cancelled` via
/// `POST /admin/orders/{id}/cancel`, and `Rejected` when a rider declines).
///
/// The backend transitions:
///
///     Accepted -> Preparing -> Ready for Pickup
///     Ready for Pickup -> Rider Assigned        (auto-assignment)
///     Rider Assigned -> Accepted by Rider | Rejected
///     Rejected -> Rider Assigned                (re-assignment)
///     Accepted by Rider -> Arrived at Restaurant -> Picked Up
///     Picked Up -> On the Way -> Delivered
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
        return 'Finding your rider';
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

  /// Simulated online payment (no real gateway in the MVP).
  digital('Digital', 'Pay Online (demo)');

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
