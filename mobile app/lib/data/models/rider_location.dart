import '../json_utils.dart';

/// Immutable model representing the real-time geographic location of an
/// assigned delivery rider for Phase M3 Customer Live Rider Tracking.
///
/// Designed with strict coordinate validation so invalid GPS reads, NaN,
/// or out-of-bounds coordinates never reach the map renderer or crash the app.
class RiderLocation {
  /// Unique identifier of the rider, when the source endpoint provides one.
  ///
  /// The backend's `GET /orders/{order_id}/rider-location` response contains
  /// `order_id` but **no** `rider_id`, so this is null for the live-tracking
  /// contract. It stays populated for any payload that does carry the field.
  final String? riderId;

  /// Latitude in decimal degrees (must be within [-90.0, 90.0]).
  final double latitude;

  /// Longitude in decimal degrees (must be within [-180.0, 180.0]).
  final double longitude;

  /// Timestamp when this location was recorded by the rider device/server.
  final DateTime? timestamp;

  const RiderLocation({
    this.riderId,
    required this.latitude,
    required this.longitude,
    this.timestamp,
  });

  /// Validates whether the given [latitude] and [longitude] represent valid
  /// real-world geographic coordinates.
  static bool isValidCoordinate(double? latitude, double? longitude) {
    if (latitude == null || longitude == null) return false;
    if (latitude.isNaN || longitude.isNaN) return false;
    if (latitude.isInfinite || longitude.isInfinite) return false;
    if (latitude < -90.0 || latitude > 90.0) return false;
    if (longitude < -180.0 || longitude > 180.0) return false;
    return true;
  }

  /// Parses a [RiderLocation] from a JSON map.
  ///
  /// Returns `null` if coordinates are missing, non-numeric, or outside
  /// the valid geographic bounds [-90, 90] and [-180, 180].
  static RiderLocation? tryFromJson(Map<String, dynamic> json) {
    final riderId = Json.asStringOrNull(json['rider_id']) ??
        Json.asStringOrNull(json['riderId']);

    final lat = Json.asDoubleOrNull(json['latitude']) ??
        Json.asDoubleOrNull(json['lat']);
    final lng = Json.asDoubleOrNull(json['longitude']) ??
        Json.asDoubleOrNull(json['lng']);

    if (!isValidCoordinate(lat, lng)) {
      return null;
    }

    final timestamp = Json.asDateTimeOrNull(json['timestamp']) ??
        Json.asDateTimeOrNull(json['updated_at']);

    return RiderLocation(
      riderId: riderId,
      latitude: lat!,
      longitude: lng!,
      timestamp: timestamp,
    );
  }

  factory RiderLocation.fromJson(Map<String, dynamic> json) {
    final parsed = tryFromJson(json);
    if (parsed == null) {
      throw FormatException(
        'Invalid RiderLocation JSON: latitude and longitude must be valid geographic coordinates.',
        json,
      );
    }
    return parsed;
  }

  Map<String, dynamic> toJson() => {
        if (riderId != null) 'rider_id': riderId,
        'latitude': latitude,
        'longitude': longitude,
        if (timestamp != null) 'timestamp': timestamp!.toIso8601String(),
      };

  /// Determines whether this location is considered stale based on a [threshold].
  ///
  /// Returns `false` if [timestamp] is not available.
  bool isStale({Duration threshold = const Duration(minutes: 2)}) {
    if (timestamp == null) return false;
    final age = DateTime.now().difference(timestamp!);
    return age > threshold;
  }

  RiderLocation copyWith({
    String? riderId,
    double? latitude,
    double? longitude,
    DateTime? timestamp,
  }) {
    return RiderLocation(
      riderId: riderId ?? this.riderId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is RiderLocation &&
        other.riderId == riderId &&
        other.latitude == latitude &&
        other.longitude == longitude &&
        other.timestamp == timestamp;
  }

  @override
  int get hashCode => Object.hash(riderId, latitude, longitude, timestamp);

  @override
  String toString() =>
      'RiderLocation(riderId: $riderId, lat: $latitude, lng: $longitude, timestamp: $timestamp)';
}
