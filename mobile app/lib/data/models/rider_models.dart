import '../../core/constants/app_constants.dart';
import '../json_utils.dart';
import 'order_models.dart';

/// Rider account as returned by `GET /wallet/profile`.
///
/// The audit found no way for a rider client to learn its own `approval_status`
/// (`GET /auth/me` returns only `{id, role}`), so this endpoint and model were
/// added to close that gap. Approval is enforced server-side; this is only what
/// lets the UI show the right state instead of guessing.
class RiderProfile {
  final String id;
  final String name;
  final String phoneNumber;
  final String countryCode;

  /// `pending` | `approved` | `rejected` (backend `riders.approval_status`).
  final String approvalStatus;

  final bool isOnline;
  final bool isActive;
  final double walletBalance;
  final double pendingCashOwed;
  final String? vehicleType;
  final String? vehicleRegistration;
  final String? cnicNumber;

  // Document presence — the URLs themselves are never needed by the rider UI,
  // only whether each required document is on file.
  final bool hasCnicPhoto;
  final bool hasLicensePhoto;
  final bool hasVehiclePhoto;

  const RiderProfile({
    required this.id,
    required this.name,
    required this.phoneNumber,
    this.countryCode = '+92',
    this.approvalStatus = 'pending',
    this.isOnline = false,
    this.isActive = true,
    this.walletBalance = 0,
    this.pendingCashOwed = 0,
    this.vehicleType,
    this.vehicleRegistration,
    this.cnicNumber,
    this.hasCnicPhoto = false,
    this.hasLicensePhoto = false,
    this.hasVehiclePhoto = false,
  });

  factory RiderProfile.fromJson(Map<String, dynamic> json) => RiderProfile(
        id: Json.asString(json['id']),
        name: Json.asString(json['name'], fallback: 'Rider'),
        phoneNumber: Json.asString(json['phone_number']),
        countryCode: Json.asString(json['country_code'], fallback: '+92'),
        approvalStatus: Json.asString(json['approval_status'], fallback: 'pending'),
        isOnline: Json.asBool(json['is_online']),
        isActive: Json.asBool(json['is_active'], fallback: true),
        walletBalance: Json.asDouble(json['wallet_balance']),
        pendingCashOwed: Json.asDouble(json['pending_cash_owed']),
        vehicleType: Json.asStringOrNull(json['vehicle_type']),
        vehicleRegistration: Json.asStringOrNull(json['vehicle_registration']),
        cnicNumber: Json.asStringOrNull(json['cnic_number']),
        hasCnicPhoto: Json.asBool(json['has_cnic_photo']),
        hasLicensePhoto: Json.asBool(json['has_license_photo']),
        hasVehiclePhoto: Json.asBool(json['has_vehicle_photo']),
      );

  /// Copy with a changed online/wallet state (used after `PATCH /wallet/status`
  /// so the UI reflects the server's answer without a second round trip).
  RiderProfile copyWith({bool? isOnline, double? walletBalance, double? pendingCashOwed}) =>
      RiderProfile(
        id: id,
        name: name,
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        approvalStatus: approvalStatus,
        isOnline: isOnline ?? this.isOnline,
        isActive: isActive,
        walletBalance: walletBalance ?? this.walletBalance,
        pendingCashOwed: pendingCashOwed ?? this.pendingCashOwed,
        vehicleType: vehicleType,
        vehicleRegistration: vehicleRegistration,
        cnicNumber: cnicNumber,
        hasCnicPhoto: hasCnicPhoto,
        hasLicensePhoto: hasLicensePhoto,
        hasVehiclePhoto: hasVehiclePhoto,
      );

  bool get isApproved => approvalStatus == 'approved';
  bool get isPending => approvalStatus == 'pending';
  bool get isRejected => approvalStatus == 'rejected';

  /// Whether the rider may take delivery work. Mirrors the server-side guard
  /// added to the assignment endpoints — the backend remains the real boundary.
  bool get canWork => isApproved && isActive;

  /// True when every required document is on file.
  bool get hasAllDocuments =>
      hasCnicPhoto && hasLicensePhoto && hasVehiclePhoto;

  int get uploadedDocumentCount => [
        hasCnicPhoto,
        hasLicensePhoto,
        hasVehiclePhoto,
      ].where((has) => has).length;

  /// Wallet is below the Rs. 500 floor required to go online.
  bool get isBelowMinWallet =>
      walletBalance < AppConstants.riderMinWalletBalance;

  String get displayName => name.trim().isEmpty ? 'Rider' : name.trim();

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return 'R';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }

  String get approvalLabel {
    switch (approvalStatus) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Not approved';
      default:
        return 'Pending review';
    }
  }
}

/// Delivery address attached to a rider's assignment.
class AssignmentAddress {
  final String? label;
  final String? fullAddress;
  final double latitude;
  final double longitude;

  const AssignmentAddress({
    this.label,
    this.fullAddress,
    required this.latitude,
    required this.longitude,
  });

  factory AssignmentAddress.fromJson(Map<String, dynamic> json) =>
      AssignmentAddress(
        label: Json.asStringOrNull(json['label']),
        fullAddress: Json.asStringOrNull(json['full_address']),
        latitude: Json.asDouble(json['latitude']),
        longitude: Json.asDouble(json['longitude']),
      );

  String get displayTitle {
    final trimmedLabel = label?.trim();
    if (trimmedLabel != null && trimmedLabel.isNotEmpty) return trimmedLabel;
    final trimmedAddress = fullAddress?.trim();
    if (trimmedAddress != null && trimmedAddress.isNotEmpty) return trimmedAddress;
    return 'Customer address';
  }

  String get displaySubtitle {
    final trimmed = fullAddress?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    return '${latitude.toStringAsFixed(4)}, ${longitude.toStringAsFixed(4)}';
  }
}

/// A job on the rider's board, from `GET /wallet/assignments`.
///
/// Serves both the "new assignment to accept/reject" case
/// (`status == "Rider Assigned"`) and the "in progress" case, since the backend
/// auto-assigns riders (there is no open order pool to browse).
class RiderAssignment {
  final String id;
  final OrderStatus status;
  final PaymentMethod paymentMethod;
  final String restaurantName;
  final String? restaurantAddress;
  final double? restaurantLatitude;
  final double? restaurantLongitude;
  final AssignmentAddress? deliveryAddress;
  final double deliveryDistanceKm;
  final double deliveryFee;
  final double totalAmount;
  final double riderEarning;
  final String? customerName;
  final DateTime? placedAt;
  final List<OrderLineItem> items;

  const RiderAssignment({
    required this.id,
    required this.status,
    required this.paymentMethod,
    required this.restaurantName,
    this.restaurantAddress,
    this.restaurantLatitude,
    this.restaurantLongitude,
    this.deliveryAddress,
    this.deliveryDistanceKm = 0,
    this.deliveryFee = 0,
    this.totalAmount = 0,
    this.riderEarning = 0,
    this.customerName,
    this.placedAt,
    this.items = const [],
  });

  factory RiderAssignment.fromJson(Map<String, dynamic> json) => RiderAssignment(
        id: Json.asString(json['id']),
        status: OrderStatus.fromWire(Json.asStringOrNull(json['status'])),
        paymentMethod: PaymentMethod.fromWire(Json.asStringOrNull(json['payment_method'])),
        restaurantName: Json.asString(json['restaurant_name'], fallback: 'Restaurant'),
        restaurantAddress: Json.asStringOrNull(json['restaurant_address']),
        restaurantLatitude: Json.asDoubleOrNull(json['restaurant_latitude']),
        restaurantLongitude: Json.asDoubleOrNull(json['restaurant_longitude']),
        deliveryAddress: Json.asMapOrNull(json['delivery_address']) == null
            ? null
            : AssignmentAddress.fromJson(
                Json.asMapOrNull(json['delivery_address'])!),
        deliveryDistanceKm: Json.asDouble(json['delivery_distance_km']),
        deliveryFee: Json.asDouble(json['delivery_fee']),
        totalAmount: Json.asDouble(json['total_amount']),
        riderEarning: Json.asDouble(json['rider_earning']),
        customerName: Json.asStringOrNull(json['customer_name']),
        placedAt: Json.asDateTimeOrNull(json['placed_at']),
        items: Json.asList(json['items'], OrderLineItem.fromJson),
      );

  String get shortId => shortOrderId(id);
  String get totalLabel => formatPkr(totalAmount);
  String get riderEarningLabel => formatPkr(riderEarning);
  String get distanceLabel => '${deliveryDistanceKm.toStringAsFixed(1)} km';
  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  /// True when this job is waiting for an accept/reject decision — the only
  /// status the backend's `POST /wallet/assignments/{id}/respond` accepts.
  bool get needsResponse => status == OrderStatus.riderAssigned;

  /// True once the rider has accepted and the job is in progress.
  bool get isInProgress =>
      status == OrderStatus.acceptedByRider ||
      status == OrderStatus.arrivedAtRestaurant ||
      status == OrderStatus.pickedUp ||
      status == OrderStatus.onTheWay;

  bool get isCompleted => status == OrderStatus.delivered;

  /// Cash the rider must collect from the customer on arrival.
  bool get requiresCashCollection => paymentMethod == PaymentMethod.cod;

  /// The single next action a rider can take, or null when none applies yet.
  /// Mirrors `ORDER_STATUS_TRANSITIONS` on the backend.
  RiderAction? get nextAction {
    switch (status) {
      case OrderStatus.acceptedByRider:
        return RiderAction.arrivedAtRestaurant;
      case OrderStatus.arrivedAtRestaurant:
        return RiderAction.pickedUp;
      case OrderStatus.pickedUp:
        return RiderAction.onTheWay;
      case OrderStatus.onTheWay:
        return RiderAction.delivered;
      default:
        return null;
    }
  }
}

/// The rider's own delivery status transitions, matching the backend's
/// `wallet_payment/routes.py` PATCH endpoints one-for-one.
enum RiderAction {
  arrivedAtRestaurant('Arrived at Restaurant', 'Arrived at restaurant'),
  pickedUp('Picked Up', 'Confirm pickup'),
  onTheWay('On the Way', 'Start delivery'),
  delivered('Delivered', 'Mark delivered');

  const RiderAction(this.wireValue, this.label);

  final String wireValue;
  final String label;

  /// The `PATCH /wallet/deliveries/{order_id}/status/...` sub-path.
  String get endpointSegment {
    switch (this) {
      case RiderAction.arrivedAtRestaurant:
        return 'arrived';
      case RiderAction.pickedUp:
        return 'picked-up';
      case RiderAction.onTheWay:
        return 'on-the-way';
      case RiderAction.delivered:
        return 'delivered';
    }
  }
}

/// `GET /wallet/balance` and `PATCH /wallet/status` response
/// (backend: `WalletBalanceResponseSchema`).
class RiderWallet {
  final double walletBalance;
  final double pendingCashOwed;
  final bool isOnline;
  final double earningsBalance;

  const RiderWallet({
    required this.walletBalance,
    this.pendingCashOwed = 0,
    this.isOnline = false,
    this.earningsBalance = 0,
  });

  factory RiderWallet.fromJson(Map<String, dynamic> json) {
    final walletBalance = Json.asDouble(json['wallet_balance']);
    return RiderWallet(
      walletBalance: walletBalance,
      pendingCashOwed: Json.asDouble(json['pending_cash_owed']),
      isOnline: Json.asBool(json['is_online']),
      // `/wallet/balance` omits earnings_balance; `/wallet/earnings` includes
      // it. Reading both keys lets one model serve both endpoints.
      earningsBalance: Json.asDouble(json['earnings_balance'], fallback: walletBalance),
    );
  }

  String get walletBalanceLabel => formatPkr(walletBalance);
  String get pendingCashLabel => formatPkr(pendingCashOwed);
  String get earningsLabel => formatPkr(earningsBalance);

  bool get isBelowMinWallet =>
      walletBalance < AppConstants.riderMinWalletBalance;

  /// Shortfall the rider must top up before going online.
  double get topUpNeeded =>
      (AppConstants.riderMinWalletBalance - walletBalance).clamp(0, double.infinity);
}

/// `GET /wallet/cod-eligibility` (backend: `CODEligibilityResponseSchema`).
///
/// Cash-on-delivery work is capped: a rider already holding more than the cap in
/// unsubmitted COD cash is not offered more.
class CODEligibility {
  final bool canAcceptCod;
  final double pendingCashOwed;
  final double cap;

  const CODEligibility({
    required this.canAcceptCod,
    this.pendingCashOwed = 0,
    this.cap = 0,
  });

  factory CODEligibility.fromJson(Map<String, dynamic> json) => CODEligibility(
        canAcceptCod: Json.asBool(json['can_accept_cod'], fallback: true),
        pendingCashOwed: Json.asDouble(json['pending_cash_owed']),
        cap: Json.asDouble(json['cap']),
      );

  String get pendingCashLabel => formatPkr(pendingCashOwed);
  String get capLabel => formatPkr(cap);
}
