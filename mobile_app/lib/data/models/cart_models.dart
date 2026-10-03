import '../json_utils.dart';
import 'catalog_models.dart';

/// A raw cart line as returned by the backend
/// (backend: `food_delivery/schemas.py: CartItemSchema`).
///
/// Note what is absent: name, price and photo. The backend stores only
/// `{item_id, qty, variant}` in Redis — every price is re-read from Postgres at
/// checkout time. Prices are resolved for display by [ResolvedCart].
class CartLine {
  final String itemId;
  final int qty;
  final Map<String, dynamic>? variant;

  const CartLine({required this.itemId, required this.qty, this.variant});

  factory CartLine.fromJson(Map<String, dynamic> json) => CartLine(
        itemId: Json.asString(json['item_id']),
        qty: Json.asInt(json['qty'], fallback: 1),
        variant: Json.asMapOrNull(json['variant']),
      );

  Map<String, dynamic> toJson() => {
        'item_id': itemId,
        'qty': qty,
        'variant': variant,
      };
}

/// Raw cart envelope (backend: `CartSchema`).
class Cart {
  final String restaurantId;
  final List<CartLine> items;

  const Cart({required this.restaurantId, this.items = const []});

  factory Cart.fromJson(Map<String, dynamic> json) => Cart(
        restaurantId: Json.asString(json['restaurant_id']),
        items: Json.asList(json['items'], CartLine.fromJson),
      );

  static const Cart empty = Cart(restaurantId: '');

  bool get isEmpty => items.isEmpty;
  int get itemCount => items.fold(0, (sum, line) => sum + line.qty);
}

/// A cart line joined with its current menu item — what the cart UI renders.
class ResolvedCartLine {
  final MenuItem menuItem;
  final int qty;

  const ResolvedCartLine({required this.menuItem, required this.qty});

  String get id => menuItem.id;
  String get name => menuItem.name;
  double get unitPrice => menuItem.price;
  double get lineTotal => menuItem.price * qty;
  String? get imageUrl => menuItem.photoUrl;
  bool get isAvailable => menuItem.isAvailable;

  String get lineTotalLabel => formatPkr(lineTotal);
}

/// The cart as the UI needs it: authoritative names/prices resolved from the
/// menu, plus a subtotal.
///
/// A cart line whose menu item no longer exists is dropped from [lines] and
/// listed in [unresolvedItemIds]; the backend would reject checkout for such a
/// cart with a 400 ("no longer on the menu"), so the UI can prompt the customer
/// to clear it.
class ResolvedCart {
  final String restaurantId;
  final List<ResolvedCartLine> lines;
  final List<String> unresolvedItemIds;

  const ResolvedCart({
    required this.restaurantId,
    this.lines = const [],
    this.unresolvedItemIds = const [],
  });

  static const ResolvedCart empty = ResolvedCart(restaurantId: '');

  bool get isEmpty => lines.isEmpty;
  int get itemCount => lines.fold(0, (sum, line) => sum + line.qty);
  double get subtotal => lines.fold(0, (sum, line) => sum + line.lineTotal);
  String get subtotalLabel => formatPkr(subtotal);

  bool get hasUnresolvedItems => unresolvedItemIds.isNotEmpty;

  /// True when any line is sold out — checkout will fail with a 400 until the
  /// customer removes it.
  bool get hasUnavailableItems =>
      lines.any((line) => !line.isAvailable);

  /// Resolves a raw [Cart] against a fetched menu.
  static ResolvedCart resolve({
    required Cart cart,
    required List<MenuCategory> menu,
  }) {
    final byId = <String, MenuItem>{};
    for (final category in menu) {
      for (final item in category.items) {
        byId[item.id] = item;
      }
    }

    final lines = <ResolvedCartLine>[];
    final unresolved = <String>[];

    for (final line in cart.items) {
      final item = byId[line.itemId];
      if (item == null) {
        unresolved.add(line.itemId);
        continue;
      }
      lines.add(ResolvedCartLine(menuItem: item, qty: line.qty));
    }

    return ResolvedCart(
      restaurantId: cart.restaurantId,
      lines: lines,
      unresolvedItemIds: unresolved,
    );
  }
}

/// Response of `POST /orders/{id}/reorder`
/// (backend: `ReorderResponseSchema`).
class ReorderResult {
  final Cart cart;

  /// Menu item ids that could not be carried over (deleted or sold out).
  final List<String> skippedItemIds;

  const ReorderResult({required this.cart, this.skippedItemIds = const []});

  factory ReorderResult.fromJson(Map<String, dynamic> json) => ReorderResult(
        cart: Cart.fromJson(Json.asMapOrNull(json['cart']) ?? const {}),
        skippedItemIds: Json.asStringList(json['skipped_items']),
      );

  int get skippedCount => skippedItemIds.length;
}
