import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../models/cart_models.dart';
import '../models/catalog_models.dart';
import 'restaurant_repository.dart';

/// Cart calls.
///
/// The backend keeps a SEPARATE cart per (customer, restaurant) pair in Redis
/// (`cart:{customer_id}:{restaurant_id}`, 7-day TTL), so `restaurant_id` is part
/// of every path. The cart payload itself stores only `{item_id, qty, variant}` —
/// never prices — because every price is re-read from Postgres at checkout.
class CartRepository {
  CartRepository({ApiClient? client, RestaurantRepository? restaurants})
      : _client = client ?? ApiClient.instance,
        _restaurants = restaurants ?? RestaurantRepository(client: client);

  final ApiClient _client;
  final RestaurantRepository _restaurants;

  /// `GET /restaurants/{id}/cart` — an absent cart reads as empty rather than
  /// 404ing.
  Future<Cart> getCart(String restaurantId) async {
    final json = await _client.getJson('/restaurants/$restaurantId/cart');
    return Cart.fromJson(json);
  }

  /// The menu for [restaurantId].
  ///
  /// Exposed here because a cart stores only `{item_id, qty}` — resolving it
  /// into renderable lines always needs the menu alongside.
  Future<List<MenuCategory>> menuFor(String restaurantId) =>
      _restaurants.menu(restaurantId);

  /// Cart plus the menu it refers to, resolved into renderable lines.
  ///
  /// The menu is only fetched when there is something in the cart, so an empty
  /// cart costs one request instead of two.
  Future<ResolvedCart> getResolvedCart(String restaurantId) async {
    final cart = await getCart(restaurantId);
    if (cart.isEmpty) {
      return ResolvedCart(restaurantId: restaurantId);
    }

    try {
      final menu = await _restaurants.menu(restaurantId);
      return ResolvedCart.resolve(cart: cart, menu: menu);
    } on ApiException {
      // The restaurant went inactive (menu 404s) while the cart still exists.
      // Surface the lines as unresolved instead of blanking the cart screen.
      return ResolvedCart(
        restaurantId: restaurantId,
        unresolvedItemIds: [for (final line in cart.items) line.itemId],
      );
    }
  }

  /// `POST /restaurants/{id}/cart/items`
  ///
  /// Merges with an existing line for the same item+variant. The item must
  /// belong to this restaurant and be available, otherwise 400.
  Future<Cart> addItem(
    String restaurantId, {
    required String itemId,
    int qty = 1,
    Map<String, dynamic>? variant,
  }) async {
    final json = await _client.postJson(
      '/restaurants/$restaurantId/cart/items',
      body: {
        'item_id': itemId,
        'qty': qty,
        'variant': variant,
      },
    );
    return Cart.fromJson(json);
  }

  /// `PATCH /restaurants/{id}/cart/items/{item_id}` — absolute quantity, not a
  /// delta. The line must already exist.
  Future<Cart> updateQuantity(
    String restaurantId, {
    required String itemId,
    required int qty,
  }) async {
    final json = await _client.patchJson(
      '/restaurants/$restaurantId/cart/items/$itemId',
      body: {'qty': qty},
    );
    return Cart.fromJson(json);
  }

  /// `DELETE /restaurants/{id}/cart/items/{item_id}`
  Future<Cart> removeItem(
    String restaurantId, {
    required String itemId,
  }) async {
    final json = await _client.request(
      'DELETE',
      '/restaurants/$restaurantId/cart/items/$itemId',
    );
    if (json == null) return Cart(restaurantId: restaurantId);
    return Cart.fromJson(json as Map<String, dynamic>);
  }

  /// `DELETE /restaurants/{id}/cart` — 204, no body. Other restaurants' carts
  /// are untouched.
  Future<void> clearCart(String restaurantId) async {
    await _client.delete('/restaurants/$restaurantId/cart');
  }
}
