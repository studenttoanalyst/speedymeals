import 'dart:developer' as developer;

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../models/rider_location.dart';

/// Abstract repository defining the contract for retrieving live rider location
/// data on the customer side for Phase M3.
///
/// Implementations must not crash on network errors, missing endpoints, or
/// malformed responses.
abstract class RiderLocationRepository {
  /// Fetches the latest geographic coordinates of the rider assigned to [orderId].
  ///
  /// Returns `null` if:
  /// - No rider has been assigned yet (backend returns null coordinates).
  /// - The rider's Redis location has expired (backend's 45 s TTL).
  /// - The order does not exist / is not owned by this customer (404).
  /// - The order already reached a terminal status (409 — nothing to track).
  /// - The response is malformed or the request failed (network/timeout/5xx).
  Future<RiderLocation?> getRiderLocation(String orderId);
}

/// Production implementation of [RiderLocationRepository] over the backend's
/// **dedicated** live-location endpoint:
///
///     GET /orders/{order_id}/rider-location
///
/// Exact backend response (`OrderRiderLocationResponseSchema`):
///
///     {"order_id": "<uuid>", "latitude": <float|null>,
///      "longitude": <float|null>, "updated_at": "<iso8601>|null"}
///
/// This is deliberately NOT `GET /orders/{id}/track`: that endpoint carries no
/// coordinates at all (only status, rider name/phone, distance and totals), so
/// reading rider coordinates from it was always a wrong-contract guess. The
/// dedicated endpoint is the one that reads the rider's Redis location.
///
/// The `rider_id` field is intentionally NOT expected — the endpoint does not
/// return one.
class HttpRiderLocationRepository implements RiderLocationRepository {
  HttpRiderLocationRepository({ApiClient? client})
      : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// The backend path this repository talks to. Exposed for tests/diagnostics.
  static String pathFor(String orderId) => '/orders/$orderId/rider-location';

  @override
  Future<RiderLocation?> getRiderLocation(String orderId) async {
    try {
      final json = await _client.getJson(pathFor(orderId));

      // The backend documents explicit nulls for "no rider assigned" and
      // "Redis TTL expired" — that is a normal state, not an error.
      if (json['latitude'] == null || json['longitude'] == null) {
        return null;
      }

      // tryFromJson validates the coordinate bounds and rejects NaN/Infinity,
      // so a malformed payload can never reach the map renderer.
      return RiderLocation.tryFromJson(json);
    } on ApiException catch (error) {
      // 401/403 (session/role), 404 (unknown or unowned order), 409 (terminal
      // order), 422/429/5xx and transport failures all degrade to "no live
      // location right now". The tracking screen keeps the last known marker
      // and surfaces its own unavailable banner; nothing here throws.
      developer.log(
        'Rider location unavailable [${error.kind.name}'
        '${error.statusCode == null ? '' : ' ${error.statusCode}'}]',
        name: 'RiderLocationRepository',
      );
      return null;
    } catch (error, stackTrace) {
      developer.log(
        'Rider location lookup failed',
        name: 'RiderLocationRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return null;
    }
  }
}
