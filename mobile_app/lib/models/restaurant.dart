import '../data/models/catalog_models.dart' as api;

/// Restaurant and Menu Data Models for Speedy Meals.
///
/// These are PRESENTATION models — the shape the existing UI was designed
/// around. They are never populated by hand any more: [Restaurant.fromBackend]
/// maps the backend's `GET /restaurants` + `GET /restaurants/{id}/menu`
/// responses onto them so every widget below keeps working unchanged.
///
/// Where the backend genuinely has no equivalent field (promo codes, engagement
/// badges, review counts) the mapper leaves it empty or neutral rather than
/// inventing a value, and the UI hides the corresponding element.
class Restaurant {
  final String id;
  final String name;
  final String tagline;
  final String location;
  final String distance;
  final double rating;
  final String reviewCount;
  final String deliveryTime;
  final String deliveryFeeInfo;
  final String expressTime;
  final String heroAsset;
  final String logoAsset;
  final String categoryTag;
  final List<String> badges;
  final bool freeDelivery;
  final bool isExpressCloudKitchen;
  final String promoCode;
  final String promoDiscount;
  final List<RestaurantMenuCategory> categories;

  const Restaurant({
    required this.id,
    required this.name,
    required this.tagline,
    required this.location,
    required this.distance,
    required this.rating,
    this.reviewCount = '1.2k+',
    required this.deliveryTime,
    this.deliveryFeeInfo = 'Rs. 50 Base + Rs. 20/km',
    this.expressTime = 'Speedy Express: 20 mins',
    required this.heroAsset,
    this.logoAsset = 'assets/images/logo.png',
    this.categoryTag = 'Cloud Kitchen',
    required this.badges,
    this.freeDelivery = false,
    this.isExpressCloudKitchen = true,
    this.promoCode = 'SPEEDY50',
    this.promoDiscount = '50% off delivery',
    this.categories = const [],
  });

  /// Alias for hero image URL / path.
  String get image => heroAsset;

  /// True when the backend supplied a real cover/logo URL. Widgets use this to
  /// avoid asking `Image.network` to fetch an empty string.
  bool get hasHeroImage => heroAsset.trim().isNotEmpty;

  /// Whether this restaurant has a backend photo at all.
  bool get hasAnyImage =>
      heroAsset.trim().isNotEmpty || logoAsset.trim().isNotEmpty;

  /// Builds the presentation model from the backend's browse row plus its menu.
  ///
  /// Only fields with a real source are filled in:
  ///  - [name], [id], [heroAsset], [logoAsset], [distance], [rating] and
  ///    [deliveryTime] come straight from the backend;
  ///  - [tagline] and [categoryTag] are derived from the restaurant's own menu
  ///    categories (e.g. "Pizza • Burgers"), which is real menu data;
  ///  - [categories] is the real menu, grouped exactly as the backend returned
  ///    it.
  ///
  /// Deliberately left neutral: [badges], [promoCode], [promoDiscount],
  /// [freeDelivery] and [isExpressCloudKitchen] (no backend source — showing
  /// them would be a fabricated claim) and [reviewCount] (the backend stores an
  /// average rating but no review count).
  factory Restaurant.fromBackend(
    api.RestaurantSummary summary, {
    List<api.MenuCategory> menu = const [],
  }) {
    final categoryNames = <String>[];
    for (final category in menu) {
      final name = category.displayName;
      if (!categoryNames.contains(name)) categoryNames.add(name);
    }

    return Restaurant(
      id: summary.id,
      name: summary.name,
      tagline: categoryNames.isEmpty
          ? (summary.address ?? 'Food delivery')
          : categoryNames.join(' • '),
      location: summary.address ?? 'Location not provided',
      distance: summary.distanceLabel,
      rating: summary.avgRating ?? 0,
      reviewCount: summary.avgRating == null ? 'New' : '',
      deliveryTime: summary.etaLabel,
      // The real, locked fee rule the backend implements.
      deliveryFeeInfo: 'Rs. ${AppConstantsFee.base} base + Rs. ${AppConstantsFee.perKm}/km',
      expressTime: summary.hoursLabel ?? '',
      heroAsset: summary.heroImage,
      logoAsset: summary.logoUrl ?? '',
      categoryTag:
          categoryNames.isNotEmpty ? categoryNames.first : 'Restaurant',
      badges: const [],
      freeDelivery: false,
      isExpressCloudKitchen: false,
      promoCode: '',
      promoDiscount: '',
      categories: [
        for (final category in menu)
          RestaurantMenuCategory(
            id: category.displayName,
            name: category.displayName,
            items: [
              for (final item in category.items)
                RestaurantMenuItem.fromBackend(item),
            ],
          ),
      ],
    );
  }
}

/// Mirrors the backend's fee constants (`food_delivery/service.py`:
/// `DELIVERY_FEE_BASE = 50`, `DELIVERY_FEE_PER_KM = 20`), used only to render
/// the fee rule as text.
class AppConstantsFee {
  static const int base = 50;
  static const int perKm = 20;
}

class RestaurantMenuCategory {
  final String id;
  final String name;
  final String? emoji;
  final List<RestaurantMenuItem> items;

  const RestaurantMenuCategory({
    required this.id,
    required this.name,
    this.emoji,
    required this.items,
  });

  /// Maps one group from `GET /restaurants/{id}/menu`.
  factory RestaurantMenuCategory.fromBackend(api.MenuCategory category) =>
      RestaurantMenuCategory(
        id: category.displayName,
        name: category.displayName,
        items: [
          for (final item in category.items)
            RestaurantMenuItem.fromBackend(item),
        ],
      );
}

class RestaurantMenuItem {
  final String id;
  final String name;
  final String description;
  final double price;
  final double rating;
  final String imageUrl;
  final String? tag; // e.g. "MUST TRY", "SPICY FAVORITE", "CHEF'S SIGNATURE"
  final String? tagType; // "must_try", "spicy", "signature"

  /// Mirror of the backend's `is_available`. Sold-out items stay visible in the
  /// design but cannot be added to the cart.
  final bool isAvailable;

  const RestaurantMenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.rating,
    required this.imageUrl,
    this.tag,
    this.tagType,
    this.isAvailable = true,
  });

  /// Maps a backend menu item onto this presentation model.
  ///
  /// [rating] is 0 because the backend rates restaurants, not individual dishes,
  /// and [tag]/[tagType] are null because it has no dish badges — the design
  /// hides both when they are absent.
  factory RestaurantMenuItem.fromBackend(api.MenuItem item) => RestaurantMenuItem(
        id: item.id,
        name: item.name,
        description: item.description ?? '',
        price: item.price,
        rating: 0,
        imageUrl: item.photoUrl ?? '',
        isAvailable: item.isAvailable,
      );

  bool get hasImage => imageUrl.trim().isNotEmpty;

  /// Rebuilds the backend model needed to add this dish to the cart.
  ///
  /// The backend cart API takes only `{item_id, qty}`; the rest is carried so
  /// the cart's optimistic update can render the line before the response
  /// arrives.
  api.MenuItem toBackendMenuItem() => api.MenuItem(
        id: id,
        name: name,
        description: description.isEmpty ? null : description,
        price: price,
        photoUrl: imageUrl.isEmpty ? null : imageUrl,
        isAvailable: isAvailable,
      );
}

// NOTE: the former hardcoded `sampleRestaurants` list lived here. It was
// removed during backend integration because it was the app's source of
// "real" restaurant data (4 fake restaurants, 11 fake dishes, fake review
// counts and promo codes). Every restaurant, menu, price and image now comes
// from `GET /restaurants` and `GET /restaurants/{id}/menu`, mapped through
// [Restaurant.fromBackend].
