import 'package:uuid/uuid.dart';

import '../../core/network/api_client.dart';
import '../models/cart_models.dart';
import '../models/order_models.dart';

/// Checkout, order history, tracking and post-delivery actions.
///
/// The backend is authoritative for every amount: prices are re-read from
/// Postgres at preview and at placement, and the resulting values are frozen on
/// the order row. The client never computes a total it then sends.
class OrderRepository {
  OrderRepository({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  static const _uuid = Uuid();

  /// Idempotency key for the checkout attempt currently in flight (or one that
  /// failed and can still be retried). The backend caches a successful
  /// placement for 24h keyed by this UUID, so a retry after a timeout or
  /// network error must reuse it — otherwise a duplicate order could be placed.
  /// A genuinely new attempt (different restaurant/address/payment) or a
  /// successful placement gets a fresh key.
  String? _checkoutKey;

  /// Identifies the checkout attempt [_checkoutKey] belongs to. When this
  /// changes, the next [placeOrder] starts a new attempt with a new key.
  String? _checkoutAttempt;

  /// `GET /restaurants/{id}/cart/checkout-preview?address_id=…`
  ///
  /// `address_id` is mandatory. Distance comes from the Google Maps Distance
  /// Matrix (restaurant → address) and the fee is `50 + (km × 20)`. If Maps is
  /// unavailable the backend returns 503, surfaced here as
  /// [ApiErrorKind.unavailable].
  Future<CheckoutPreview> previewCheckout({
    required String restaurantId,
    required String addressId,
  }) async {
    final json = await _client.getJson(
      '/restaurants/$restaurantId/cart/checkout-preview',
      query: {'address_id': addressId},
    );
    return CheckoutPreview.fromJson(json);
  }

  /// `POST /restaurants/{id}/cart/checkout`
  ///
  /// Converts the Redis cart into a real order. The backend clears the cart only
  /// after the DB commit succeeds. A `Digital` payment declines with 402 (the
  /// gateway is an MVP stub); `COD` needs no equivalent step.
  Future<PlacedOrder> placeOrder({
    required String restaurantId,
    required PlaceOrderRequest request,
  }) async {
    // Same attempt -> reuse the key across retries (timeout / network error);
    // a different checkout -> mint a new one.
    final attempt =
        '$restaurantId|${request.addressId}|${request.paymentMethod.wireValue}';
    if (_checkoutKey == null || _checkoutAttempt != attempt) {
      _checkoutKey = _uuid.v4();
      _checkoutAttempt = attempt;
    }

    final json = await _client.postJson(
      '/restaurants/$restaurantId/cart/checkout',
      body: request.toJson(),
      headers: {'Idempotency-Key': _checkoutKey!},
    );

    // Placement succeeded: the next checkout is a new attempt and needs a new
    // key so it cannot replay this order's cached response.
    _checkoutKey = null;
    _checkoutAttempt = null;
    return PlacedOrder.fromJson(json);
  }

  /// `GET /orders` — own orders only, newest first.
  Future<List<OrderSummary>> history() async {
    final list = await _client.getJsonList('/orders');
    return list
        .whereType<Map>()
        .map((entry) => OrderSummary.fromJson(Map<String, dynamic>.from(entry)))
        .toList(growable: false);
  }

  /// `GET /orders/{order_id}/track` — the polling target for live tracking.
  ///
  /// Another customer's order id returns 404, not 403 (the backend's no-leak
  /// pattern), so an unknown id is indistinguishable from an unowned one.
  Future<OrderTracking> track(String orderId) async {
    final json = await _client.getJson('/orders/$orderId/track');
    return OrderTracking.fromJson(json);
  }

  /// `POST /orders/{order_id}/reorder` — clones past lines into that
  /// restaurant's current cart, skipping deleted/sold-out items.
  Future<ReorderResult> reorder(String orderId) async {
    final json = await _client.postJson('/orders/$orderId/reorder');
    return ReorderResult.fromJson(json);
  }

  /// `POST /orders/{order_id}/rating`
  ///
  /// Delivered orders only, once per order (a second attempt is a 400). At least
  /// one of the two ratings must be supplied.
  Future<void> submitRating({
    required String orderId,
    int? restaurantRating,
    int? riderRating,
    String? comment,
  }) async {
    await _client.postJson(
      '/orders/$orderId/rating',
      body: {
        'restaurant_rating': restaurantRating,
        'rider_rating': riderRating,
        'comment': comment,
      },
    );
  }
}
