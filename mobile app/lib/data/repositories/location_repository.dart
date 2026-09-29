import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../models/location_models.dart';

/// Client for the backend's server-side Google Maps proxy:
///
///     GET  /api/v1/location/places/autocomplete?q=&session_token?
///     GET  /api/v1/location/places/details?place_id=&session_token?
///     GET  /api/v1/location/reverse-geocode?lat=&lng=
///
/// Why this exists: reverse geocoding and Places lookups use the **server's**
/// Google key, which must never ship in the app. The backend already caches
/// reverse-geocode results for 24 h in Redis, so routing through it also avoids
/// duplicate Google calls.
///
/// These three endpoints are unauthenticated on the backend, so requests are
/// sent without a bearer token (`authenticated: false`). No secret is ever
/// attached to them.
class LocationRepository {
  LocationRepository({ApiClient? client})
      : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// `GET /api/v1/location/places/autocomplete`
  Future<List<PlacePrediction>> autocompletePlaces(
    String query, {
    String? sessionToken,
  }) async {
    final params = <String, dynamic>{'q': query};
    if (sessionToken != null) params['session_token'] = sessionToken;

    final list = await _client.getJsonList(
      '/api/v1/location/places/autocomplete',
      query: params,
      authenticated: false,
    );
    return list
        .whereType<Map>()
        .map((entry) => PlacePrediction.fromJson(Map<String, dynamic>.from(entry)))
        .where((prediction) => prediction.placeId.isNotEmpty)
        .toList(growable: false);
  }

  /// `GET /api/v1/location/places/details`
  ///
  /// Returns null when the backend reports the place id is unknown (404) or the
  /// service is unavailable, so callers can keep the coordinate input they
  /// already have instead of crashing.
  Future<PlaceDetails?> placeDetails(
    String placeId, {
    String? sessionToken,
  }) async {
    final params = <String, dynamic>{'place_id': placeId};
    if (sessionToken != null) params['session_token'] = sessionToken;

    try {
      final json = await _client.getJson(
        '/api/v1/location/places/details',
        query: params,
        authenticated: false,
      );
      return PlaceDetails.fromJson(json);
    } on ApiException {
      return null;
    } catch (_) {
      return null;
    }
  }

  /// `GET /api/v1/location/reverse-geocode`
  ///
  /// Throws [ApiException] so callers can decide whether to show a message;
  /// see [resolveAddress] for the fire-and-forget UI variant.
  Future<ReverseGeocodeResult> reverseGeocode({
    required double latitude,
    required double longitude,
  }) async {
    final json = await _client.getJson(
      '/api/v1/location/reverse-geocode',
      query: {'lat': latitude, 'lng': longitude},
      authenticated: false,
    );
    return ReverseGeocodeResult.fromJson(json);
  }

  /// Best-effort coordinate → address for the UI.
  ///
  /// Never throws: returns null on 404 (no address for the point), rate limit
  /// (429), outage (503), timeout, or a malformed payload. The picker then keeps
  /// its existing coordinate-string fallback.
  Future<String?> resolveAddress({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final result = await reverseGeocode(
        latitude: latitude,
        longitude: longitude,
      );
      return result.displayAddress;
    } on ApiException {
      return null;
    } catch (_) {
      return null;
    }
  }
}
