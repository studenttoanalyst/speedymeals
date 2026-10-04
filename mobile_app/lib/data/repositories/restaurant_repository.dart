import '../../core/network/api_client.dart';
import '../models/catalog_models.dart';

/// How to order the browse results (backend validates against
/// `^(distance|rating)$`).
enum RestaurantSort {
  distance('distance'),
  rating('rating');

  const RestaurantSort(this.wireValue);
  final String wireValue;
}

/// Customer-facing restaurant browsing and menus.
class RestaurantRepository {
  RestaurantRepository({ApiClient? client})
      : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// `GET /restaurants`
  ///
  /// Location is mandatory: the endpoint reads the customer's own saved address
  /// (the given [addressId], else their default/most recent) and returns 400
  /// when none exists, since every row carries a distance. It also only returns
  /// restaurants within [radiusKm] that have coordinates configured.
  Future<List<RestaurantSummary>> browse({
    String? addressId,
    String? search,
    RestaurantSort sort = RestaurantSort.distance,
    double? radiusKm,
  }) async {
    final list = await _client.getJsonList(
      '/restaurants',
      query: {
        'address_id': addressId,
        'search': (search != null && search.trim().isNotEmpty) ? search.trim() : null,
        'sort': sort.wireValue,
        'radius_km': radiusKm,
      },
    );
    return list
        .whereType<Map>()
        .map((entry) => RestaurantSummary.fromJson(Map<String, dynamic>.from(entry)))
        .toList(growable: false);
  }

  /// `GET /restaurants/{restaurant_id}/menu`
  ///
  /// Returns items grouped by their category, with sold-out items present but
  /// flagged `is_available = false`. Only active restaurants resolve; anything
  /// else is a 404.
  Future<List<MenuCategory>> menu(
    String restaurantId, {
    String? category,
  }) async {
    final list = await _client.getJsonList(
      '/restaurants/$restaurantId/menu',
      query: {
        if (category != null && category.trim().isNotEmpty) 'category': category.trim(),
      },
    );
    return list
        .whereType<Map>()
        .map((entry) => MenuCategory.fromJson(Map<String, dynamic>.from(entry)))
        .toList(growable: false);
  }

  /// Flattens a menu into a single list of items (used for search and for
  /// resolving cart lines).
  static List<MenuItem> flatten(List<MenuCategory> menu) =>
      [for (final category in menu) ...category.items];
}
