import '../../core/constants/app_constants.dart';
import '../json_utils.dart';

/// One line of an order (backend: `RestaurantOrderItemResponseSchema`).
///
/// `priceAtOrder` is the FROZEN snapshot written when the order was placed — it
/// deliberately does not follow later menu price changes.
class OrderLineItem {
  final String menuItemId;
  final String name;
  final int quantity;
  final String? selectedVariant;
  final double priceAtOrder;

  const OrderLineItem({
    required this.menuItemId,
    required this.name,
    required this.quantity,
    this.selectedVariant,
    required this.priceAtOrder,
  });

  factory OrderLineItem.fromJson(Map<String, dynamic> json) => OrderLineItem(
        menuItemId: Json.asString(json['menu_item_id']),
        name: Json.asString(json['name']),
        quantity: Json.asInt(json['quantity'], fallback: 1),
        selectedVariant: Json.asStringOrNull(json['selected_variant']),
        priceAtOrder: Json.asDouble(json['price_at_order']),
      );

  double get lineTotal => priceAtOrder * quantity;
  String get lineTotalLabel => formatPkr(lineTotal);
  String get quantityLabel => '${quantity}x';
}

/// One row of `GET /orders` (backend: `OrderHistoryResponseSchema`).
class OrderSummary {
  final String id;
  final String restaurantId;
  final String restaurantName;
  final OrderStatus status;
  final PaymentMethod paymentMethod;
  final double totalAmount;
  final DateTime? placedAt;

  const OrderSummary({
    required this.id,
    required this.restaurantId,
    required this.restaurantName,
    required this.status,
    required this.paymentMethod,
    required this.totalAmount,
    this.placedAt,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        id: Json.asString(json['id']),
        restaurantId: Json.asString(json['restaurant_id']),
        restaurantName: Json.asString(json['restaurant_name'], fallback: 'Restaurant'),
        status: OrderStatus.fromWire(Json.asStringOrNull(json['status'])),
        paymentMethod: PaymentMethod.fromWire(Json.asStringOrNull(json['payment_method'])),
        totalAmount: Json.asDouble(json['total_amount']),
        placedAt: Json.asDateTimeOrNull(json['placed_at']),
      );

  String get totalLabel => formatPkr(totalAmount);

  /// Short, human-quotable form of the real order id.
  ///
  /// The backend uses UUID primary keys, so there is no "SM-89241"-style order
  /// number to display. This is a display-only abbreviation of the genuine id —
  /// never a fabricated identifier.
  String get shortId => shortOrderId(id);

  bool get isActive => status.isActive;
}

/// Abbreviates a UUID for display: `3f9c1a24-…` becomes `3F9C1A24`.
///
/// The full id remains available from [OrderSummary.id] for support and for
/// every API call.
String shortOrderId(String id) {
  final compact = id.replaceAll('-', '');
  if (compact.length <= 8) return compact.toUpperCase();
  return compact.substring(0, 8).toUpperCase();
}

/// Response of `GET /orders/{order_id}/track` (backend:
/// `OrderTrackingResponseSchema`).
///
/// This is the poll target while an order is in flight — the backend has no
/// WebSockets or push notifications (spec §14).
class OrderTracking {
  final String id;
  final OrderStatus status;
  final PaymentMethod paymentMethod;
  final double foodSubtotal;
  final double deliveryDistanceKm;
  final double deliveryFee;
  final double totalAmount;

  /// Name of the restaurant the order is coming from.
  ///
  /// Added to `OrderTrackingResponseSchema` alongside this integration — the
  /// tracking screen has to say where the food is coming from, and the original
  /// response carried only the restaurant's id.
  final String restaurantName;

  /// Populated only once a rider is assigned — null before that, never a
  /// placeholder.
  final String? riderName;
  final String? riderPhone;

  // ── Real tracking geometry (Phase 7, Point 3) ──────────────────────────
  //
  // Every coordinate is nullable: the backend omits a point it does not know
  // rather than sending a placeholder, so the UI must never invent one.

  /// Restaurant location snapshot (`restaurant_lat`/`restaurant_lng`).
  final double? restaurantLatitude;
  final double? restaurantLongitude;

  /// Customer delivery location (`customer_lat`/`customer_lng`).
  final double? customerLatitude;
  final double? customerLongitude;

  /// Live rider location (`rider_lat`/`rider_lng`); null until a fix exists.
  final double? riderLatitude;
  final double? riderLongitude;

  /// Road distance for the restaurant → customer route (`route_distance_km`).
  final double? routeDistanceKm;

  /// Backend duration estimate in minutes (`duration_mins`).
  final int? durationMins;

  /// Backend-computed arrival timestamp (`eta`).
  final DateTime? eta;

  /// Google-encoded route polyline (`overview_polyline.points`), null when the
  /// route came from the distance fallback and has no geometry.
  final String? polyline;

  final DateTime? placedAt;
  final DateTime? deliveredAt;
  final List<OrderLineItem> items;

  const OrderTracking({
    required this.id,
    required this.status,
    required this.paymentMethod,
    this.restaurantName = 'Restaurant',
    this.foodSubtotal = 0,
    this.deliveryDistanceKm = 0,
    this.deliveryFee = 0,
    this.totalAmount = 0,
    this.riderName,
    this.riderPhone,
    this.restaurantLatitude,
    this.restaurantLongitude,
    this.customerLatitude,
    this.customerLongitude,
    this.riderLatitude,
    this.riderLongitude,
    this.routeDistanceKm,
    this.durationMins,
    this.eta,
    this.polyline,
    this.placedAt,
    this.deliveredAt,
    this.items = const [],
  });

  factory OrderTracking.fromJson(Map<String, dynamic> json) => OrderTracking(
        id: Json.asString(json['id']),
        status: OrderStatus.fromWire(Json.asStringOrNull(json['status'])),
        paymentMethod: PaymentMethod.fromWire(Json.asStringOrNull(json['payment_method'])),
        restaurantName:
            Json.asString(json['restaurant_name'], fallback: 'Restaurant'),
        foodSubtotal: Json.asDouble(json['food_subtotal']),
        deliveryDistanceKm: Json.asDouble(json['delivery_distance_km']),
        deliveryFee: Json.asDouble(json['delivery_fee']),
        totalAmount: Json.asDouble(json['total_amount']),
        riderName: Json.asStringOrNull(json['rider_name']),
        riderPhone: Json.asStringOrNull(json['rider_phone']),
        restaurantLatitude: Json.asDoubleOrNull(json['restaurant_lat']),
        restaurantLongitude: Json.asDoubleOrNull(json['restaurant_lng']),
        customerLatitude: Json.asDoubleOrNull(json['customer_lat']),
        customerLongitude: Json.asDoubleOrNull(json['customer_lng']),
        riderLatitude: Json.asDoubleOrNull(json['rider_lat']),
        riderLongitude: Json.asDoubleOrNull(json['rider_lng']),
        routeDistanceKm: Json.asDoubleOrNull(json['route_distance_km']),
        durationMins: Json.asIntOrNull(json['duration_mins']),
        eta: Json.asDateTimeOrNull(json['eta']),
        polyline: Json.asStringOrNull(json['polyline']),
        placedAt: Json.asDateTimeOrNull(json['placed_at']),
        deliveredAt: Json.asDateTimeOrNull(json['delivered_at']),
        items: Json.asList(json['items'], OrderLineItem.fromJson),
      );

  String get shortId => shortOrderId(id);
  String get totalLabel => formatPkr(totalAmount);
  String get foodSubtotalLabel => formatPkr(foodSubtotal);
  String get deliveryFeeLabel => formatPkr(deliveryFee);
  String get distanceLabel => '${deliveryDistanceKm.toStringAsFixed(1)} km';

  /// True when a rider has been attached to this order.
  bool get hasRider => riderName != null;

  /// Whether the client should keep polling.
  bool get shouldKeepPolling => status.isActive;
}

/// One Google Directions route (`RouteDetailSchema`, Point 3).
///
/// `eta` is an ISO-8601 timestamp and `polyline` is the encoded
/// `overview_polyline.points`; both are null when the route came from the
/// Haversine fallback (no real geometry without Google). All fields optional.
class RouteDetail {
  final double? distanceKm;
  final int? durationMins;
  final DateTime? eta;
  final String? polyline;

  const RouteDetail({
    this.distanceKm,
    this.durationMins,
    this.eta,
    this.polyline,
  });

  factory RouteDetail.fromJson(Map<String, dynamic> json) => RouteDetail(
        distanceKm: Json.asDoubleOrNull(json['distance_km']),
        durationMins: Json.asIntOrNull(json['duration_mins']),
        eta: Json.asDateTimeOrNull(json['eta']),
        polyline: Json.asStringOrNull(json['polyline']),
      );
}

/// Response of `GET /restaurants/{id}/cart/checkout-preview`
/// (backend: `CheckoutPreviewResponseSchema`).
///
/// This is the ONLY authority for what the customer will be charged:
/// `food_subtotal + delivery_fee = total`, where
/// `delivery_fee = 50 + (km × 20)`. There is no platform fee and no tax — the
/// backend has neither.
class CheckoutPreview {
  final double foodSubtotal;
  final double deliveryDistanceKm;
  final double deliveryFee;
  final double total;

  /// Point 3 route parameters (distance, duration, ETA, polyline); null when
  /// the backend could not compute a route.
  final RouteDetail? route;

  const CheckoutPreview({
    required this.foodSubtotal,
    required this.deliveryDistanceKm,
    required this.deliveryFee,
    required this.total,
    this.route,
  });

  factory CheckoutPreview.fromJson(Map<String, dynamic> json) => CheckoutPreview(
        foodSubtotal: Json.asDouble(json['food_subtotal']),
        deliveryDistanceKm: Json.asDouble(json['delivery_distance_km']),
        deliveryFee: Json.asDouble(json['delivery_fee']),
        total: Json.asDouble(json['total']),
        route: _routeOrNull(json['route']),
      );

  String get foodSubtotalLabel => formatPkr(foodSubtotal);
  String get deliveryFeeLabel => formatPkr(deliveryFee);
  String get totalLabel => formatPkr(total);
  String get distanceLabel => '${deliveryDistanceKm.toStringAsFixed(1)} km';
}

/// Response of `POST /restaurants/{id}/cart/checkout`
/// (backend: `PlaceOrderResponseSchema`).
///
/// Financial values are the frozen snapshot written at placement.
class PlacedOrder {
  final String id;
  final OrderStatus status;
  final PaymentMethod paymentMethod;

  /// Echoed for `Digital` payments only. The backend does not persist it (no
  /// `payment_reference` column exists), so it is display-only.
  final String? paymentReference;

  final double foodSubtotal;
  final double deliveryDistanceKm;
  final double deliveryFee;
  final double totalAmount;
  final double commissionAmount;
  final double restaurantPayable;
  final double riderEarning;

  /// Route snapshot captured at placement (Point 3); null when unavailable.
  final RouteDetail? route;

  final DateTime? placedAt;
  final List<OrderLineItem> items;

  const PlacedOrder({
    required this.id,
    required this.status,
    required this.paymentMethod,
    this.paymentReference,
    this.foodSubtotal = 0,
    this.deliveryDistanceKm = 0,
    this.deliveryFee = 0,
    this.totalAmount = 0,
    this.commissionAmount = 0,
    this.restaurantPayable = 0,
    this.riderEarning = 0,
    this.route,
    this.placedAt,
    this.items = const [],
  });

  factory PlacedOrder.fromJson(Map<String, dynamic> json) => PlacedOrder(
        id: Json.asString(json['id']),
        status: OrderStatus.fromWire(Json.asStringOrNull(json['status'])),
        paymentMethod: PaymentMethod.fromWire(Json.asStringOrNull(json['payment_method'])),
        paymentReference: Json.asStringOrNull(json['payment_reference']),
        foodSubtotal: Json.asDouble(json['food_subtotal']),
        deliveryDistanceKm: Json.asDouble(json['delivery_distance_km']),
        deliveryFee: Json.asDouble(json['delivery_fee']),
        totalAmount: Json.asDouble(json['total_amount']),
        commissionAmount: Json.asDouble(json['commission_amount']),
        restaurantPayable: Json.asDouble(json['restaurant_payable']),
        riderEarning: Json.asDouble(json['rider_earning']),
        route: _routeOrNull(json['route']),
        placedAt: Json.asDateTimeOrNull(json['placed_at']),
        items: Json.asList(json['items'], OrderLineItem.fromJson),
      );

  String get shortId => shortOrderId(id);
  String get totalLabel => formatPkr(totalAmount);
}

/// Parses a nested `route` object, tolerating a missing/null/non-object value.
RouteDetail? _routeOrNull(Object? value) {
  final map = Json.asMapOrNull(value);
  return map == null ? null : RouteDetail.fromJson(map);
}

/// Body of `POST /restaurants/{id}/cart/checkout`
/// (backend: `PlaceOrderSchema`).
///
/// Note there is no `special_instructions` field: the column exists on `orders`
/// but the request schema does not accept it, so the UI must not offer it as if
/// it were persisted. It is sent only if [specialInstructions] is non-null AND
/// the backend has been extended to accept it.
class PlaceOrderRequest {
  final String addressId;
  final PaymentMethod paymentMethod;

  const PlaceOrderRequest({
    required this.addressId,
    required this.paymentMethod,
  });

  Map<String, dynamic> toJson() => {
        'address_id': addressId,
        'payment_method': paymentMethod.wireValue,
      };
}
