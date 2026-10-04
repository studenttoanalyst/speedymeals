import '../json_utils.dart';

/// One address suggestion from
/// `GET /api/v1/location/places/autocomplete`
/// (backend: `PlacePredictionSchema`).
class PlacePrediction {
  final String placeId;
  final String description;

  const PlacePrediction({required this.placeId, required this.description});

  factory PlacePrediction.fromJson(Map<String, dynamic> json) =>
      PlacePrediction(
        placeId: Json.asString(json['place_id']),
        description: Json.asString(json['description']),
      );
}

/// Structured address components shared by the geocoding responses
/// (backend: `AddressComponentsSchema`).
class AddressComponents {
  final String street;
  final String neighborhood;
  final String city;

  const AddressComponents({
    this.street = '',
    this.neighborhood = '',
    this.city = '',
  });

  factory AddressComponents.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AddressComponents();
    return AddressComponents(
      street: Json.asString(json['street']),
      neighborhood: Json.asString(json['neighborhood']),
      city: Json.asString(json['city']),
    );
  }

  /// Single-line rendering of whichever components the backend filled in.
  String get oneLine => [street, neighborhood, city]
      .where((part) => part.trim().isNotEmpty)
      .join(', ');
}

/// Response of `GET /api/v1/location/reverse-geocode`
/// (backend: `ReverseGeocodeResponseSchema`).
class ReverseGeocodeResult {
  final String formattedAddress;
  final String placeId;
  final AddressComponents components;

  const ReverseGeocodeResult({
    required this.formattedAddress,
    this.placeId = '',
    this.components = const AddressComponents(),
  });

  factory ReverseGeocodeResult.fromJson(Map<String, dynamic> json) =>
      ReverseGeocodeResult(
        formattedAddress: Json.asString(json['formatted_address']),
        placeId: Json.asString(json['place_id']),
        components: AddressComponents.fromJson(
          Json.asMapOrNull(json['components']),
        ),
      );

  /// Best available human-readable label, or null when the backend returned
  /// nothing usable. Never fabricates text.
  String? get displayAddress {
    final formatted = formattedAddress.trim();
    if (formatted.isNotEmpty) return formatted;
    final oneLine = components.oneLine;
    return oneLine.isEmpty ? null : oneLine;
  }
}

/// Response of `GET /api/v1/location/places/details`
/// (backend: `PlaceDetailsResponseSchema`).
class PlaceDetails {
  final String placeId;
  final String formattedAddress;
  final double latitude;
  final double longitude;
  final AddressComponents components;

  const PlaceDetails({
    required this.placeId,
    required this.formattedAddress,
    required this.latitude,
    required this.longitude,
    this.components = const AddressComponents(),
  });

  factory PlaceDetails.fromJson(Map<String, dynamic> json) => PlaceDetails(
        placeId: Json.asString(json['place_id']),
        formattedAddress: Json.asString(json['formatted_address']),
        latitude: Json.asDouble(json['lat']),
        longitude: Json.asDouble(json['lng']),
        components: AddressComponents.fromJson(
          Json.asMapOrNull(json['components']),
        ),
      );
}
