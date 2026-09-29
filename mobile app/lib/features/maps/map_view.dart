import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../constants/colors.dart';

/// Reusable Google Maps widget for Speedy Meals mobile application.
///
/// Designed for Phase M1 and future phases (Customer tracking, address selection,
/// and Rider active delivery screens).
///
/// Handles:
/// - Map rendering with configurable camera position & zoom
/// - Multiple marker rendering
/// - Optional polyline rendering
/// - Graceful fallback on initialization errors or unsupported platforms
/// - Automatic bounds fitting when multiple markers are present
class MapView extends StatefulWidget {
  /// Default center coordinates (Islamabad, Pakistan) used if no initial position
  /// or markers are provided.
  static const LatLng defaultCoordinates = LatLng(33.6844, 73.0479);

  /// Default camera zoom level.
  static const double defaultZoom = 14.5;

  /// Initial camera target position. If null and markers are non-empty,
  /// uses the first marker's position, otherwise falls back to [defaultCoordinates].
  final LatLng? initialPosition;

  /// Initial camera zoom level. Defaults to [defaultZoom].
  final double initialZoom;

  /// Markers to display on the map.
  final Set<Marker> markers;

  /// Optional polylines to display on the map (supported at the rendering level).
  final Set<Polyline> polylines;

  /// Type of map tiles to display. Defaults to [MapType.normal].
  final MapType mapType;

  /// Whether to display user's current location blue dot.
  /// Defaults to false so map rendering does not require GPS permissions.
  final bool myLocationEnabled;

  /// Whether to show the default "My Location" button.
  final bool myLocationButtonEnabled;

  /// Whether to show default zoom controls.
  final bool zoomControlsEnabled;

  /// Whether compass is enabled.
  final bool compassEnabled;

  /// Whether map toolbar is enabled (Android only).
  final bool mapToolbarEnabled;

  /// Whether traffic layer is enabled.
  final bool trafficEnabled;

  /// Gesture controls.
  final bool scrollGesturesEnabled;
  final bool zoomGesturesEnabled;
  final bool rotateGesturesEnabled;
  final bool tiltGesturesEnabled;

  /// Internal padding for map controls and legal notices.
  final EdgeInsets padding;

  /// Optional border radius clipping for the map viewport.
  final BorderRadiusGeometry? borderRadius;

  /// Whether the camera should automatically adjust bounds to include all markers.
  final bool fitBoundsOnMarkers;

  /// Callback when [GoogleMapController] has been initialized.
  final void Function(GoogleMapController controller)? onMapCreated;

  /// Callback when map is tapped.
  final void Function(LatLng position)? onTap;

  /// Callback when map is long pressed.
  final void Function(LatLng position)? onLongPress;

  /// Callback when camera moves.
  final void Function(CameraPosition position)? onCameraMove;

  /// Callback when camera becomes idle.
  final VoidCallback? onCameraIdle;

  /// Custom fallback builder invoked if map initialization fails.
  final Widget Function(BuildContext context, Object? error)? fallbackBuilder;

  const MapView({
    super.key,
    this.initialPosition,
    this.initialZoom = defaultZoom,
    this.markers = const {},
    this.polylines = const {},
    this.mapType = MapType.normal,
    this.myLocationEnabled = false,
    this.myLocationButtonEnabled = false,
    this.zoomControlsEnabled = false,
    this.compassEnabled = true,
    this.mapToolbarEnabled = false,
    this.trafficEnabled = false,
    this.scrollGesturesEnabled = true,
    this.zoomGesturesEnabled = true,
    this.rotateGesturesEnabled = true,
    this.tiltGesturesEnabled = true,
    this.padding = EdgeInsets.zero,
    this.borderRadius,
    this.fitBoundsOnMarkers = false,
    this.onMapCreated,
    this.onTap,
    this.onLongPress,
    this.onCameraMove,
    this.onCameraIdle,
    this.fallbackBuilder,
  });

  @override
  State<MapView> createState() => _MapViewState();
}

class _MapViewState extends State<MapView> {
  GoogleMapController? _controller;
  Object? _initializationError;

  LatLng get _resolvedInitialPosition {
    if (widget.initialPosition != null) {
      return widget.initialPosition!;
    }
    if (widget.markers.isNotEmpty) {
      return widget.markers.first.position;
    }
    return MapView.defaultCoordinates;
  }

  @override
  void didUpdateWidget(covariant MapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_controller != null && widget.fitBoundsOnMarkers && widget.markers.length > 1) {
      if (oldWidget.markers != widget.markers) {
        _fitBounds();
      }
    }
  }

  void _onMapCreated(GoogleMapController controller) {
    _controller = controller;
    widget.onMapCreated?.call(controller);

    if (widget.fitBoundsOnMarkers && widget.markers.length > 1) {
      // Allow map view to lay out before adjusting bounds
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _fitBounds();
      });
    }
  }

  void _fitBounds() {
    if (_controller == null || widget.markers.length < 2) return;

    double? minLat;
    double? maxLat;
    double? minLng;
    double? maxLng;

    for (final marker in widget.markers) {
      final lat = marker.position.latitude;
      final lng = marker.position.longitude;
      if (minLat == null || lat < minLat) minLat = lat;
      if (maxLat == null || lat > maxLat) maxLat = lat;
      if (minLng == null || lng < minLng) minLng = lng;
      if (maxLng == null || lng > maxLng) maxLng = lng;
    }

    if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
      final bounds = LatLngBounds(
        southwest: LatLng(minLat, minLng),
        northeast: LatLng(maxLat, maxLng),
      );
      _controller?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 50));
    }
  }

  @override
  void dispose() {
    _controller = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_initializationError != null) {
      return _buildFallback(context, _initializationError);
    }

    Widget mapWidget;
    try {
      mapWidget = GoogleMap(
        initialCameraPosition: CameraPosition(
          target: _resolvedInitialPosition,
          zoom: widget.initialZoom,
        ),
        markers: widget.markers,
        polylines: widget.polylines,
        mapType: widget.mapType,
        myLocationEnabled: widget.myLocationEnabled,
        myLocationButtonEnabled: widget.myLocationButtonEnabled,
        zoomControlsEnabled: widget.zoomControlsEnabled,
        compassEnabled: widget.compassEnabled,
        mapToolbarEnabled: widget.mapToolbarEnabled,
        trafficEnabled: widget.trafficEnabled,
        scrollGesturesEnabled: widget.scrollGesturesEnabled,
        zoomGesturesEnabled: widget.zoomGesturesEnabled,
        rotateGesturesEnabled: widget.rotateGesturesEnabled,
        tiltGesturesEnabled: widget.tiltGesturesEnabled,
        padding: widget.padding,
        onMapCreated: _onMapCreated,
        onTap: widget.onTap,
        onLongPress: widget.onLongPress,
        onCameraMove: widget.onCameraMove,
        onCameraIdle: widget.onCameraIdle,
      );
    } catch (e) {
      mapWidget = _buildFallback(context, e);
    }

    if (widget.borderRadius != null) {
      mapWidget = ClipRRect(
        borderRadius: widget.borderRadius!,
        child: mapWidget,
      );
    }

    return mapWidget;
  }

  Widget _buildFallback(BuildContext context, Object? error) {
    if (widget.fallbackBuilder != null) {
      return widget.fallbackBuilder!(context, error);
    }

    return Container(
      width: double.infinity,
      color: SpeedyMealsColors.surfaceContainer,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.map_outlined,
                size: 36,
                color: SpeedyMealsColors.secondary,
              ),
              const SizedBox(height: 8),
              const Text(
                'Map View',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: SpeedyMealsColors.onSurface,
                ),
              ),
              if (widget.markers.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  '${widget.markers.length} location pin${widget.markers.length > 1 ? 's' : ''}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: SpeedyMealsColors.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
