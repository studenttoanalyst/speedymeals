import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Helper factory for constructing Speedy Meals map markers.
///
/// Ensures consistent naming, color hue, and info windows across Customer
/// and Rider screens.
class MapMarkers {
  MapMarkers._();

  /// Create a restaurant location marker.
  static Marker restaurant({
    required String id,
    required LatLng position,
    required String name,
    String? address,
    VoidCallback? onTap,
  }) {
    return Marker(
      markerId: MarkerId('restaurant_$id'),
      position: position,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      infoWindow: InfoWindow(
        title: name,
        snippet: address ?? 'Restaurant Location',
      ),
      onTap: onTap,
    );
  }

  /// Create a customer delivery address marker.
  static Marker customer({
    required String id,
    required LatLng position,
    required String title,
    String? address,
    VoidCallback? onTap,
  }) {
    return Marker(
      markerId: MarkerId('customer_$id'),
      position: position,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
      infoWindow: InfoWindow(
        title: title,
        snippet: address ?? 'Delivery Destination',
      ),
      onTap: onTap,
    );
  }

  /// Create a static/demo rider marker (for M1 demo rendering; live tracking belongs to M3).
  static Marker rider({
    required String id,
    required LatLng position,
    required String riderName,
    VoidCallback? onTap,
  }) {
    return Marker(
      markerId: MarkerId('rider_$id'),
      position: position,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      infoWindow: InfoWindow(
        title: riderName,
        snippet: 'Speedy Rider',
      ),
      onTap: onTap,
    );
  }
}
