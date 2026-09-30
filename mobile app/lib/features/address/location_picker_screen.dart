import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../constants/colors.dart';
import '../../data/repositories/location_repository.dart';
import '../../features/maps/maps.dart';
import 'address_search_field.dart';
import 'selected_location.dart';

/// Full-screen location picker for Phase M2.
///
/// Allows the customer to:
/// 1. Search for an address via Google Places autocomplete.
/// 2. Tap the map to drop a pin at any coordinate.
/// 3. Use their current GPS location.
/// 4. Confirm the selection, returning a [SelectedLocation].
///
/// ## Returning a result
/// ```dart
/// final location = await Navigator.of(context).push<SelectedLocation>(
///   MaterialPageRoute(builder: (_) => const LocationPickerScreen()),
/// );
/// if (location != null) { /* use location */ }
/// ```
///
/// Returns `null` if the user pops the screen without confirming.
///
/// ## API key note
/// Map rendering uses the Maps SDK key (native layer, configured in M1).
/// Places autocomplete goes through the **backend** proxy
/// (`/api/v1/location/places/*`), so the app needs no client-side Places key.
///
/// ## Reverse geocoding
/// Pin-drop and current-location results are resolved to a human-readable
/// address through the **backend** proxy (`GET /api/v1/location/reverse-geocode`),
/// never through a Google Geocoding call from the app. The server key stays on
/// the server and results are cached there for 24 h.
///
/// If the proxy is unavailable (404 no address, 429 rate limit, 503 outage,
/// offline), the display address silently falls back to the existing coordinate
/// string — the pin and the coordinates are always still usable.
class LocationPickerScreen extends StatefulWidget {
  /// Optional initial location to pre-center the map and pre-select a pin.
  final SelectedLocation? initialLocation;

  /// Optional injected backend location client (tests pass a fake).
  final LocationRepository? locationRepository;

  const LocationPickerScreen({
    super.key,
    this.initialLocation,
    this.locationRepository,
  });

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  /// Default center: Islamabad, Pakistan — matches [MapView.defaultCoordinates].
  static const LatLng _defaultCenter = LatLng(33.6844, 73.0479);

  GoogleMapController? _mapController;
  late final LocationRepository _locationRepository;

  /// Currently selected location. Null until the user interacts.
  SelectedLocation? _selected;

  bool _isLocating = false;
  String? _locationError;

  /// True while a backend reverse-geocode is in flight (informational only —
  /// the coordinate string is already displayed until an address arrives).
  bool _isResolvingAddress = false;

  @override
  void initState() {
    super.initState();
    _locationRepository = widget.locationRepository ?? LocationRepository();
    if (widget.initialLocation != null) {
      _selected = widget.initialLocation;
    }
  }

  @override
  void dispose() {
    _mapController = null;
    super.dispose();
  }

  // ─── Autocomplete callback ──────────────────────────────────────────────────

  void _onLocationSelected(SelectedLocation location) {
    setState(() {
      _selected = location;
      _locationError = null;
    });
    _animateCameraTo(LatLng(location.latitude, location.longitude));
  }

  // ─── Map tap callback ───────────────────────────────────────────────────────

  void _onMapTap(LatLng position) {
    final lat = position.latitude;
    final lng = position.longitude;

    // Guard against impossible coordinates (should not occur from a map tap,
    // but defensive programming prevents a bad state crash).
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    setState(() {
      // Pin-drop clears autocomplete address/placeId — only coordinates are
      // known. displayAddress falls back to coordinate string automatically
      // until the backend proxy resolves a real address.
      _selected = SelectedLocation(
        latitude: lat,
        longitude: lng,
      );
      _locationError = null;
    });
    unawaited(_resolveAddress(lat, lng));
  }

  /// Asks the backend proxy to turn a coordinate into a readable address and
  /// fills [SelectedLocation.address] when it answers.
  ///
  /// Never throws and never replaces coordinates — a failed lookup simply
  /// leaves the existing coordinate-string fallback in place.
  Future<void> _resolveAddress(double latitude, double longitude) async {
    if (mounted) setState(() => _isResolvingAddress = true);
    try {
      final address = await _locationRepository.resolveAddress(
        latitude: latitude,
        longitude: longitude,
      );
      if (!mounted || address == null) return;

      final current = _selected;
      // Only apply if the pin is still the one we resolved for.
      if (current == null ||
          current.latitude != latitude ||
          current.longitude != longitude) {
        return;
      }
      // Never overwrite an address that came from Places autocomplete.
      if (current.isFromAutocomplete) return;

      setState(() {
        _selected = current.copyWith(address: address);
      });
    } finally {
      if (mounted) setState(() => _isResolvingAddress = false);
    }
  }

  // ─── Current location ───────────────────────────────────────────────────────

  /// Reads device GPS and sets the selected location to current coordinates.
  ///
  /// Reuses the same geolocator permission pattern already established in
  /// [SavedAddressesScreen] and [RiderDashboardScreen].
  Future<void> _useCurrentLocation() async {
    if (_isLocating) return;
    setState(() {
      _isLocating = true;
      _locationError = null;
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw _LocationException(
          'Location services are turned off. Enable GPS and try again.',
        );
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        throw _LocationException(
          'Location permission was denied. '
          'Grant location access to use this feature.',
        );
      }
      if (permission == LocationPermission.deniedForever) {
        throw _LocationException(
          'Location permission is permanently denied. '
          'Enable it in system settings to use current location.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      if (!mounted) return;

      final lat = position.latitude;
      final lng = position.longitude;

      setState(() {
        _selected = SelectedLocation(
          latitude: lat,
          longitude: lng,
        );
      });
      _animateCameraTo(LatLng(lat, lng));
      unawaited(_resolveAddress(lat, lng));
    } on _LocationException catch (e) {
      if (!mounted) return;
      setState(() => _locationError = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() =>
          _locationError = 'Could not read your location. Please try again.');
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  // ─── Camera helpers ─────────────────────────────────────────────────────────

  void _animateCameraTo(LatLng target) {
    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: 16.0),
      ),
    );
  }

  // ─── Confirm ────────────────────────────────────────────────────────────────

  void _confirm() {
    final location = _selected;
    if (location == null) return;
    Navigator.of(context).pop(location);
  }

  // ─── Markers ────────────────────────────────────────────────────────────────

  Set<Marker> get _markers {
    final location = _selected;
    if (location == null) return const {};
    return {
      MapMarkers.customer(
        id: 'picker',
        position: LatLng(location.latitude, location.longitude),
        title: 'Selected Location',
        address: location.address,
      ),
    };
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            // ── App bar ───────────────────────────────────────────────────
            _PickerAppBar(onBack: () => Navigator.of(context).maybePop()),

            // ── Search field ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: AddressSearchField(
                onLocationSelected: _onLocationSelected,
                initialText: _selected?.address,
              ),
            ),

            // ── Map ───────────────────────────────────────────────────────
            Expanded(
              child: Stack(
                children: [
                  // Map layer — reuses M1 MapView.
                  Positioned.fill(
                    child: MapView(
                      initialPosition: _selected != null
                          ? LatLng(_selected!.latitude, _selected!.longitude)
                          : _defaultCenter,
                      initialZoom: _selected != null ? 16.0 : 13.0,
                      markers: _markers,
                      onMapCreated: (controller) =>
                          _mapController = controller,
                      onTap: _onMapTap,
                      myLocationEnabled: false,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: true,
                      compassEnabled: true,
                      fallbackBuilder: (context, _) => _MapFallback(
                        onTap: _onMapTap,
                      ),
                    ),
                  ),

                  // "Use current location" button — bottom-left of map.
                  Positioned(
                    bottom: 16,
                    left: 16,
                    child: _CurrentLocationButton(
                      isLocating: _isLocating,
                      onTap: _useCurrentLocation,
                    ),
                  ),

                  // Tap-to-pin hint — shown only when no location is set.
                  if (_selected == null)
                    const Positioned(
                      top: 16,
                      left: 0,
                      right: 0,
                      child: Center(
                        child: _TapHintBubble(),
                      ),
                    ),
                ],
              ),
            ),

            // ── Location error ────────────────────────────────────────────
            if (_locationError != null)
              _LocationErrorBanner(message: _locationError!),

            // ── Confirmation bar ──────────────────────────────────────────
            _ConfirmationBar(
              selected: _selected,
              isResolvingAddress: _isResolvingAddress,
              onConfirm: _selected != null ? _confirm : null,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App Bar
// ─────────────────────────────────────────────────────────────────────────────

class _PickerAppBar extends StatelessWidget {
  final VoidCallback onBack;

  const _PickerAppBar({required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            color: SpeedyMealsColors.onSurface,
            onPressed: onBack,
          ),
          const Text(
            'Pick a Location',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: SpeedyMealsColors.onSurface,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// "Use current location" button
// ─────────────────────────────────────────────────────────────────────────────

class _CurrentLocationButton extends StatelessWidget {
  final bool isLocating;
  final VoidCallback onTap;

  const _CurrentLocationButton({
    required this.isLocating,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      elevation: 3,
      shadowColor: Colors.black26,
      child: InkWell(
        onTap: isLocating ? null : onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              isLocating
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(
                      Icons.my_location_rounded,
                      size: 16,
                      color: SpeedyMealsColors.secondary,
                    ),
              const SizedBox(width: 6),
              Text(
                isLocating ? 'Locating…' : 'Use current location',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: SpeedyMealsColors.secondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tap-to-pin hint bubble
// ─────────────────────────────────────────────────────────────────────────────

class _TapHintBubble extends StatelessWidget {
  const _TapHintBubble();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: SpeedyMealsColors.onSurface.withValues(alpha: 0.75),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.touch_app_rounded, size: 14, color: Colors.white),
          SizedBox(width: 5),
          Text(
            'Tap the map to drop a pin',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Location error banner
// ─────────────────────────────────────────────────────────────────────────────

class _LocationErrorBanner extends StatelessWidget {
  final String message;

  const _LocationErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: SpeedyMealsColors.errorContainer,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.location_off_rounded,
            size: 16,
            color: SpeedyMealsColors.onErrorContainer,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: SpeedyMealsColors.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirmation bar
// ─────────────────────────────────────────────────────────────────────────────

class _ConfirmationBar extends StatelessWidget {
  final bool isResolvingAddress;
  final SelectedLocation? selected;
  final VoidCallback? onConfirm;

  const _ConfirmationBar({
    required this.selected,
    required this.onConfirm,
    this.isResolvingAddress = false,
  });

  @override
  Widget build(BuildContext context) {
    final location = selected;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Selected address display
          if (location != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.location_on_rounded,
                  size: 18,
                  color: Color(0xFFDC2626),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    location.displayAddress,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: SpeedyMealsColors.onSurface,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isResolvingAddress) ...[
                  const SizedBox(width: 8),
                  const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 1.6),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
          ] else ...[
            const Text(
              'Search for an address or tap the map to select a location.',
              style: TextStyle(
                fontSize: 12,
                color: SpeedyMealsColors.onSurfaceVariant,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
          ],

          // Confirm button
          SizedBox(
            height: 48,
            child: FilledButton.icon(
              onPressed: onConfirm,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                disabledBackgroundColor:
                    SpeedyMealsColors.surfaceContainerHigh,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: Icon(
                Icons.check_circle_outline_rounded,
                size: 18,
                color: onConfirm != null
                    ? Colors.white
                    : SpeedyMealsColors.onSurfaceVariant,
              ),
              label: Text(
                'Confirm Location',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: onConfirm != null
                      ? Colors.white
                      : SpeedyMealsColors.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Map fallback (shown when GoogleMap platform view is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

/// Minimal non-interactive fallback shown when the native map view cannot
/// initialize (e.g. no API key, simulator without map support).
class _MapFallback extends StatelessWidget {
  final void Function(LatLng) onTap;

  const _MapFallback({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapUp: (details) {
        // Provide a static coordinate for testing when real map is unavailable.
        onTap(MapView.defaultCoordinates);
      },
      child: Container(
        width: double.infinity,
        height: double.infinity,
        color: SpeedyMealsColors.surfaceContainerHigh,
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.map_outlined,
                size: 48,
                color: SpeedyMealsColors.secondary,
              ),
              SizedBox(height: 12),
              Text(
                'Map View',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: SpeedyMealsColors.onSurface,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'Map services are not configured yet.',
                style: TextStyle(
                  fontSize: 12,
                  color: SpeedyMealsColors.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal exception type
// ─────────────────────────────────────────────────────────────────────────────

class _LocationException implements Exception {
  final String message;
  const _LocationException(this.message);
}
