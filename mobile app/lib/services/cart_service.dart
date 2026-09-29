import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/network/api_exception.dart';
import '../data/models/cart_models.dart';
import '../data/models/catalog_models.dart';
import '../data/repositories/cart_repository.dart';

/// A single line inside the cart, shaped for the existing cart UI.
///
/// Prices here are always the backend's menu prices (fetched from
/// `GET /restaurants/{id}/menu`), never values typed into the client.
class CartLine {
  final String id;
  final String name;
  final String restaurantName;
  final double unitPrice;
  final String? imageUrl;
  final int quantity;

  /// False when the restaurant has since marked this item sold out — checkout
  /// would fail with a 400 until it is removed.
  final bool isAvailable;

  const CartLine({
    required this.id,
    required this.name,
    required this.restaurantName,
    required this.unitPrice,
    this.imageUrl,
    this.quantity = 1,
    this.isAvailable = true,
  });

  double get lineTotal => unitPrice * quantity;
}

/// The app's cart, backed by the backend's per-restaurant Redis carts.
///
/// Behavioural contract, matching the backend:
///  - A cart belongs to exactly one restaurant. The backend keeps one cart per
///    (customer, restaurant) pair, so switching restaurants switches which cart
///    is displayed — it never merges two restaurants into one order.
///  - Every mutation is sent to the backend, which returns the authoritative
///    cart. The local view is updated optimistically so taps feel instant, then
///    replaced by the server's answer; a failed mutation reloads from the server
///    so the UI can never drift out of sync.
///  - No totals are invented here. [subtotal] is a sum of backend menu prices and
///    is for DISPLAY only — the chargeable delivery fee and final total come from
///    `GET /restaurants/{id}/cart/checkout-preview`.
///
/// A [ChangeNotifier] singleton, so the existing `AnimatedBuilder`-based screens
/// keep working unchanged.
class CartService extends ChangeNotifier {
  CartService._internal();

  static final CartService instance = CartService._internal();

  final CartRepository _cartRepository = CartRepository();

  /// Restaurant whose cart is currently on screen.
  String? _restaurantId;

  /// Display name of [_restaurantId], supplied by the screen that opened it.
  String _restaurantName = '';

  /// Menu of [_restaurantId], cached so a quantity tap does not refetch it.
  List<MenuCategory> _menu = const [];

  ResolvedCart _cart = ResolvedCart.empty;
  bool _isLoading = false;
  ApiException? _error;

  /// Lines whose change is still in flight, used to disable their controls.
  final Set<String> _pendingItemIds = <String>{};

  String? get restaurantId => _restaurantId;
  String get restaurantName => _restaurantName;
  bool get isLoading => _isLoading;
  ApiException? get error => _error;
  bool get hasError => _error != null;

  /// True once a cart has been loaded from the backend.
  bool get isReady => _restaurantId != null && !_isLoading;

  /// Display lines, with backend menu names and prices.
  List<CartLine> get lines => [
        for (final line in _cart.lines)
          CartLine(
            id: line.id,
            name: line.name,
            restaurantName: _restaurantName,
            unitPrice: line.unitPrice,
            imageUrl: line.imageUrl,
            quantity: line.qty,
            isAvailable: line.isAvailable,
          ),
      ];

  int get itemCount => _cart.itemCount;
  double get subtotal => _cart.subtotal;
  bool get isEmpty => _cart.isEmpty;
  bool get isNotEmpty => _cart.lines.isNotEmpty;

  /// Cart lines whose menu entry no longer exists — the backend rejects checkout
  /// for these, so the UI prompts the customer to clear the cart.
  bool get hasUnresolvedItems => _cart.hasUnresolvedItems;

  /// Cart lines that are currently sold out.
  bool get hasUnavailableItems => _cart.hasUnavailableItems;

  /// True when checkout should be blocked locally. The backend re-validates
  /// regardless; this only avoids a guaranteed-failing round trip.
  bool get isCheckoutBlocked =>
      isEmpty || hasUnresolvedItems || hasUnavailableItems;

  bool isItemPending(String itemId) => _pendingItemIds.contains(itemId);

  /// Key for the restaurant whose cart was last opened.
  ///
  /// The backend keys carts by (customer, restaurant) and deliberately offers no
  /// "list my carts" endpoint, so remembering the active restaurant locally is
  /// the only way the Cart tab can restore a cart that already exists server-side
  /// after a restart.
  static const _scopeKeyRestaurantId = 'sm.cart.restaurant_id';
  static const _scopeKeyRestaurantName = 'sm.cart.restaurant_name';

  /// Reloads the cart the customer was last using, if any.
  Future<void> restorePersistedScope() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final restaurantId = prefs.getString(_scopeKeyRestaurantId);
      if (restaurantId == null || restaurantId.isEmpty) return;
      await load(
        restaurantId,
        restaurantName: prefs.getString(_scopeKeyRestaurantName),
      );
    } catch (error) {
      debugPrint('Could not restore the previous cart scope: $error');
    }
  }

  Future<void> _persistScope(String restaurantId, String restaurantName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_scopeKeyRestaurantId, restaurantId);
      await prefs.setString(_scopeKeyRestaurantName, restaurantName);
    } catch (error) {
      debugPrint('Could not persist the cart scope: $error');
    }
  }

  /// Loads (or switches to) the cart for [restaurantId].
  ///
  /// The menu and cart are fetched together because a cart line stores only
  /// `{item_id, qty}` — the menu is what gives it a name and a price.
  Future<void> load(
    String restaurantId, {
    String? restaurantName,
    bool force = false,
  }) async {
    unawaited(_persistScope(restaurantId, restaurantName ?? _restaurantName));

    if (restaurantName != null && restaurantName.isNotEmpty) {
      _restaurantName = restaurantName;
    }

    // Switching restaurants always refetches: the cached menu belongs to the
    // previous one.
    final isSameRestaurant = _restaurantId == restaurantId;
    if (!force && isSameRestaurant && _isLoading) return;

    _restaurantId = restaurantId;
    _isLoading = true;
    _error = null;
    if (!isSameRestaurant) {
      _cart = ResolvedCart(restaurantId: restaurantId);
      _menu = const [];
    }
    notifyListeners();

    try {
      final menu = await _cartRepository.menuFor(restaurantId);
      final cart = await _cartRepository.getCart(restaurantId);
      _menu = menu;
      _cart = ResolvedCart.resolve(cart: cart, menu: menu);
    } on ApiException catch (error) {
      _error = error;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Reloads the active cart from the backend, keeping the cached menu.
  Future<void> refresh() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;

    try {
      final cart = await _cartRepository.getCart(restaurantId);
      _cart = ResolvedCart.resolve(cart: cart, menu: _menu);
      _error = null;
    } on ApiException catch (error) {
      _error = error;
    } finally {
      notifyListeners();
    }
  }

  /// Adds [quantity] of [item] to [restaurantId]'s cart.
  ///
  /// Passing a different [restaurantId] than the one currently loaded switches
  /// carts — the backend never mixes two restaurants in one order.
  Future<void> addItem({
    required String restaurantId,
    required MenuItem item,
    String? restaurantName,
    int quantity = 1,
  }) async {
    if (quantity <= 0) return;

    if (_restaurantId != restaurantId) {
      await load(restaurantId, restaurantName: restaurantName);
    }
    if (restaurantName != null && restaurantName.isNotEmpty) {
      _restaurantName = restaurantName;
    }

    // Make sure the menu is present so the optimistic line can be resolved.
    if (_menu.isEmpty) {
      try {
        _menu = await _cartRepository.menuFor(restaurantId);
      } on ApiException catch (error) {
        _error = error;
        notifyListeners();
        return;
      }
    }

    _applyOptimisticMerge(item: item, quantity: quantity);
    notifyListeners();

    await _mutate(
      () => _cartRepository.addItem(
        restaurantId,
        itemId: item.id,
        qty: quantity,
      ),
      pendingItemId: item.id,
    );
  }

  /// Sets an absolute quantity for [itemId] (the backend's PATCH semantics).
  Future<void> setQuantity(String itemId, int qty) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;

    if (qty <= 0) {
      await removeItem(itemId);
      return;
    }

    _applyOptimisticQuantity(itemId, qty);
    notifyListeners();

    await _mutate(
      () => _cartRepository.updateQuantity(
        restaurantId,
        itemId: itemId,
        qty: qty,
      ),
      pendingItemId: itemId,
    );
  }

  Future<void> increment(String itemId) async {
    final current = _quantityOf(itemId);
    if (current == null) return;
    await setQuantity(itemId, current + 1);
  }

  /// Decrements, removing the line entirely when it would drop to zero — the
  /// backend's minimum quantity is 1.
  Future<void> decrement(String itemId) async {
    final current = _quantityOf(itemId);
    if (current == null) return;
    if (current <= 1) {
      await removeItem(itemId);
      return;
    }
    await setQuantity(itemId, current - 1);
  }

  Future<void> removeItem(String itemId) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;

    _applyOptimisticRemove(itemId);
    notifyListeners();

    await _mutate(
      () => _cartRepository.removeItem(restaurantId, itemId: itemId),
      pendingItemId: itemId,
    );
  }

  /// Empties the active restaurant's cart. Other restaurants are unaffected.
  Future<void> clear() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;

    final previous = _cart;
    _cart = ResolvedCart(restaurantId: restaurantId);
    notifyListeners();

    try {
      await _cartRepository.clearCart(restaurantId);
      _error = null;
    } on ApiException catch (error) {
      // Put the lines back so the customer does not silently lose them.
      _cart = previous;
      _error = error;
    } finally {
      notifyListeners();
    }
  }

  /// Forgets the local view of the cart (used after a successful checkout, when
  /// the backend has already cleared it).
  void resetAfterCheckout() {
    final restaurantId = _restaurantId;
    _cart = ResolvedCart(restaurantId: restaurantId ?? '');
    _pendingItemIds.clear();
    _error = null;
    notifyListeners();
  }

  void clearError() {
    if (_error == null) return;
    _error = null;
    notifyListeners();
  }

  // ------------------------------------------------------------- internals

  /// Sends a mutation and reconciles with the backend's authoritative cart.
  Future<void> _mutate(
    Future<Cart> Function() operation, {
    String? pendingItemId,
  }) async {
    if (pendingItemId != null) _pendingItemIds.add(pendingItemId);

    try {
      final cart = await operation();
      _cart = ResolvedCart.resolve(cart: cart, menu: _menu);
      _error = null;
    } on ApiException catch (error) {
      _error = error;
      // The optimistic change may be wrong (e.g. the item just sold out) —
      // re-read the real cart rather than leaving the UI lying.
      final restaurantId = _restaurantId;
      if (restaurantId != null) {
        try {
          final cart = await _cartRepository.getCart(restaurantId);
          _cart = ResolvedCart.resolve(cart: cart, menu: _menu);
        } on ApiException {
          // Keep the original error; it is the more useful one.
        }
      }
    } finally {
      if (pendingItemId != null) _pendingItemIds.remove(pendingItemId);
      notifyListeners();
    }
  }

  int? _quantityOf(String itemId) {
    for (final line in _cart.lines) {
      if (line.id == itemId) return line.qty;
    }
    return null;
  }

  void _applyOptimisticMerge({required MenuItem item, required int quantity}) {
    final updated = <ResolvedCartLine>[];
    var merged = false;

    for (final line in _cart.lines) {
      if (line.id == item.id) {
        updated.add(ResolvedCartLine(menuItem: item, qty: line.qty + quantity));
        merged = true;
      } else {
        updated.add(line);
      }
    }
    if (!merged) {
      updated.add(ResolvedCartLine(menuItem: item, qty: quantity));
    }

    _cart = ResolvedCart(restaurantId: _cart.restaurantId, lines: updated);
  }

  void _applyOptimisticQuantity(String itemId, int qty) {
    _cart = ResolvedCart(
      restaurantId: _cart.restaurantId,
      lines: [
        for (final line in _cart.lines)
          if (line.id == itemId)
            ResolvedCartLine(menuItem: line.menuItem, qty: qty)
          else
            line,
      ],
    );
  }

  void _applyOptimisticRemove(String itemId) {
    _cart = ResolvedCart(
      restaurantId: _cart.restaurantId,
      lines: [
        for (final line in _cart.lines)
          if (line.id != itemId) line,
      ],
    );
  }
}
