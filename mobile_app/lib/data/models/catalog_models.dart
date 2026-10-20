import '../json_utils.dart';

/// One row of `GET /restaurants` (backend:
/// `food_delivery/schemas.py: CustomerRestaurantResponseSchema`).
///
/// Public fields only — the backend deliberately never exposes a restaurant's
/// email, phone, commission rate or status to customers.
class RestaurantSummary {
  final String id;
  final String name;
  final String? address;
  final String? logoUrl;
  final String? coverPhotoUrl;
  final String? openingTime;
  final String? closingTime;

  /// Real road distance from the customer's selected address, computed
  /// server-side. Present on every row — the endpoint 400s without an address.
  final double distanceKm;

  final double? avgRating;

  const RestaurantSummary({
    required this.id,
    required this.name,
    this.address,
    this.logoUrl,
    this.coverPhotoUrl,
    this.openingTime,
    this.closingTime,
    this.distanceKm = 0,
    this.avgRating,
  });

  factory RestaurantSummary.fromJson(Map<String, dynamic> json) =>
      RestaurantSummary(
        id: Json.asString(json['id']),
        name: Json.asString(json['name']),
        address: Json.asStringOrNull(json['address']),
        logoUrl: Json.asStringOrNull(json['logo_url']),
        coverPhotoUrl: Json.asStringOrNull(json['cover_photo_url']),
        // Backend `Time` columns arrive as "18:30:00".
        openingTime: Json.asClockString(json['opening_time']),
        closingTime: Json.asClockString(json['closing_time']),
        distanceKm: Json.asDouble(json['distance_km']),
        avgRating: Json.asDoubleOrNull(json['avg_rating']),
      );

  /// "2.1 km" / "850 m", matching the design's distance chip.
  String get distanceLabel {
    if (distanceKm < 1) return '${(distanceKm * 1000).round()} m';
    return '${distanceKm.toStringAsFixed(1)} km';
  }

  /// Opening hours for the info row; null when the restaurant never set them.
  String? get hoursLabel {
    if (openingTime == null || closingTime == null) return null;
    return '$openingTime – $closingTime';
  }

  /// Server-computed rating. Null when the restaurant has not been rated yet —
  /// the UI shows "New" rather than a fake 5.0.
  String get ratingLabel =>
      avgRating == null ? 'New' : avgRating!.toStringAsFixed(1);

  /// Rough ETA derived from the real distance, until the checkout preview
  /// returns an authoritative figure.
  String get etaLabel {
    final minutes = (10 + distanceKm * 3).round();
    return '$minutes min';
  }

  String get heroImage => coverPhotoUrl ?? logoUrl ?? '';
}

/// One dish (backend: `CustomerMenuItemSchema`).
class MenuItem {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String? category;
  final String? photoUrl;

  /// Free-form JSONB from the restaurant's menu editor. The cart API accepts a
  /// variant dict alongside an item, but this app's UI has no variant picker,
  /// so it is carried through untouched and sent as null.
  final Map<String, dynamic>? variants;

  /// Sold-out items are still returned by the backend, flagged here.
  final bool isAvailable;

  const MenuItem({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.category,
    this.photoUrl,
    this.variants,
    this.isAvailable = true,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: Json.asString(json['id']),
        name: Json.asString(json['name']),
        description: Json.asStringOrNull(json['description']),
        price: Json.asDouble(json['price']),
        category: Json.asStringOrNull(json['category']),
        photoUrl: Json.asStringOrNull(json['photo_url']),
        variants: Json.asMapOrNull(json['variants']),
        isAvailable: Json.asBool(json['is_available'], fallback: true),
      );

  String get priceLabel => formatPkr(price);

  bool get hasVariants => variants != null && variants!.isNotEmpty;
}

/// One category group (backend: `CustomerMenuCategorySchema`).
class MenuCategory {
  final String? category;
  final List<MenuItem> items;

  const MenuCategory({this.category, required this.items});

  factory MenuCategory.fromJson(Map<String, dynamic> json) => MenuCategory(
        category: Json.asStringOrNull(json['category']),
        items: Json.asList(json['items'], MenuItem.fromJson),
      );

  /// The backend's `category` column is nullable; items without one are grouped
  /// under this heading.
  String get displayName {
    final trimmed = category?.trim();
    if (trimmed == null || trimmed.isEmpty) return 'Menu';
    return trimmed;
  }
}

/// Presentation model mapping backend RestaurantSummary + MenuCategory data.
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
    this.deliveryFeeInfo = 'Rs. 100 base + Rs. 25/km',
    this.expressTime = 'Speedy Express: 20 mins',
    required this.heroAsset,
    this.logoAsset = 'assets/images/logo.png',
    this.categoryTag = 'Cloud Kitchen',
    required this.badges,
    this.freeDelivery = false,
    this.isExpressCloudKitchen = true,
    this.categories = const [],
  });

  /// Alias for hero image URL / path.
  String get image => heroAsset;

  /// True when the backend supplied a real cover/logo URL.
  bool get hasHeroImage => heroAsset.trim().isNotEmpty;

  /// Whether this restaurant has a backend photo at all.
  bool get hasAnyImage =>
      heroAsset.trim().isNotEmpty || logoAsset.trim().isNotEmpty;

  /// Builds the presentation model from the backend's browse row plus its menu.
  factory Restaurant.fromBackend(
    RestaurantSummary summary, {
    List<MenuCategory> menu = const [],
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
      deliveryFeeInfo:
          'Rs. ${AppConstantsFee.base} base + Rs. ${AppConstantsFee.perKm}/km',
      expressTime: summary.hoursLabel ?? '',
      heroAsset: summary.heroImage,
      logoAsset: summary.logoUrl ?? '',
      categoryTag:
          categoryNames.isNotEmpty ? categoryNames.first : 'Restaurant',
      badges: const [],
      freeDelivery: false,
      isExpressCloudKitchen: false,
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
/// `DELIVERY_FEE_BASE = 100`, `DELIVERY_FEE_PER_KM = 25`), used only to render
/// the fee RULE as display text on the storefront.
class AppConstantsFee {
  static const int base = 100;
  static const int perKm = 25;
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
  factory RestaurantMenuCategory.fromBackend(MenuCategory category) =>
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
  final String? tag;
  final String? tagType;

  /// Mirror of the backend's `is_available`.
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
  factory RestaurantMenuItem.fromBackend(MenuItem item) =>
      RestaurantMenuItem(
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
  MenuItem toBackendMenuItem() => MenuItem(
        id: id,
        name: name,
        description: description.isEmpty ? null : description,
        price: price,
        photoUrl: imageUrl.isEmpty ? null : imageUrl,
        isAvailable: isAvailable,
      );
}

