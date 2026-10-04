/// Immutable model for a location selected by the customer during Phase M2
/// address capture.
///
/// Returned from [LocationPickerScreen] and produced by [AddressSearchField].
///
/// `address` and `placeId` are nullable:
/// - They are populated when the location comes from a Google Places
///   autocomplete selection.
/// - They are null (or hold a coordinate fallback string) when the location
///   comes from a map tap or the "Use current location" button.
///
/// Reusable by later phases (M3 address pre-fill, M5 checkout flow, etc.)
/// without modification.
class SelectedLocation {
  /// Latitude in decimal degrees. Always present.
  final double latitude;

  /// Longitude in decimal degrees. Always present.
  final double longitude;

  /// Human-readable display address from Places autocomplete, or null when
  /// the location was captured via pin-drop or current-location button.
  final String? address;

  /// Google Place ID returned by the Places API, or null when the location
  /// was not captured via autocomplete.
  final String? placeId;

  const SelectedLocation({
    required this.latitude,
    required this.longitude,
    this.address,
    this.placeId,
  });

  /// Human-readable label suitable for display in the UI.
  ///
  /// Returns [address] when it is a non-empty string, otherwise falls back
  /// to a formatted coordinate string (e.g. `"33.684400, 73.047900"`).
  /// This ensures the UI never shows a blank location label.
  String get displayAddress {
    final trimmed = address?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
  }

  /// Whether this location came from an autocomplete selection (has a Place ID).
  bool get isFromAutocomplete => placeId != null;

  /// Creates a copy of this [SelectedLocation] with the given fields replaced.
  SelectedLocation copyWith({
    double? latitude,
    double? longitude,
    String? address,
    String? placeId,
    bool clearAddress = false,
    bool clearPlaceId = false,
  }) {
    return SelectedLocation(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      address: clearAddress ? null : (address ?? this.address),
      placeId: clearPlaceId ? null : (placeId ?? this.placeId),
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is SelectedLocation &&
        other.latitude == latitude &&
        other.longitude == longitude &&
        other.address == address &&
        other.placeId == placeId;
  }

  @override
  int get hashCode => Object.hash(latitude, longitude, address, placeId);

  @override
  String toString() =>
      'SelectedLocation(lat: $latitude, lng: $longitude, '
      'address: $address, placeId: $placeId)';
}
