/// Speedy Meals Application Constants
///
/// Migrated from `lib/constants/app_constants.dart` into the core layer so
/// other modules can import business rules from a single stable location.
class AppConstants {
  // Delivery Fee Rules: Rs. 50 base + Rs. 20 per km
  static const double deliveryFeeBase = 50.0;
  static const double deliveryFeePerKm = 20.0;

  // Minimum order value
  static const double minimumOrderValue = 500.0;

  // ETA calculation (base minutes + distance factor)
  static const int baseEtaMinutes = 10;
  static const double etaPerKmFactor = 3.0;

  // Platform service fee
  static const double platformServiceFee = 25.0;

  // Tax rate (if applicable)
  static const double taxRate = 0.17; // 17% GST

  // App info
  static const String appName = 'Speedy Meals';
  static const String appTagline = 'Fast & Fresh Delivery';

  // Default location (for mock data)
  static const String defaultAddress = 'Home • Street 5, Block B, Clifton';

  // Cache durations
  static const Duration locationCacheDuration = Duration(hours: 24);
  static const Duration menuCacheDuration = Duration(hours: 1);
}

/// Order status enum for tracking
enum OrderStatus {
  placed,
  confirmed,
  prepared,
  onDelivery,
  delivered,
}

/// Payment method types
enum PaymentMethod {
  cod,
  card,
  easypaisa,
  jazzcash,
}

/// Cloud Kitchen badge types
enum CloudKitchenBadgeType {
  cloudExclusive,
  topRated,
  fastDelivery,
  freeDelivery,
}

/// Category icons mapping
enum FoodCategory {
  pizza,
  burgers,
  drinks,
  dessert,
  fastFood,
  shawarma,
}
