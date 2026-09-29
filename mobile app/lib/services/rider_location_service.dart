import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// GPS permission / service result returned to callers.
enum LocationPermissionState {
  /// All good — location stream/reads are available.
  granted,

  /// User denied permission; can be requested again.
  denied,

  /// User denied permanently — must navigate to app settings.
  deniedForever,

  /// Device location services (GPS/network) are disabled.
  serviceDisabled,
}

/// Result object from a single permission check / request cycle.
class LocationPermissionResult {
  final LocationPermissionState state;

  /// Human-readable reason suitable for a UI tooltip / chip.
  final String message;

  const LocationPermissionResult._(this.state, this.message);

  factory LocationPermissionResult.granted() =>
      const LocationPermissionResult._(
        LocationPermissionState.granted,
        'Location sharing active',
      );

  factory LocationPermissionResult.denied() =>
      const LocationPermissionResult._(
        LocationPermissionState.denied,
        'Location permission required',
      );

  factory LocationPermissionResult.deniedForever() =>
      const LocationPermissionResult._(
        LocationPermissionState.deniedForever,
        'Location permission required',
      );

  factory LocationPermissionResult.serviceDisabled() =>
      const LocationPermissionResult._(
        LocationPermissionState.serviceDisabled,
        'Turn on location services',
      );

  bool get isGranted => state == LocationPermissionState.granted;
}

typedef LocationServiceEnabledFn = Future<bool> Function();
typedef CheckPermissionFn = Future<LocationPermission> Function();
typedef RequestPermissionFn = Future<LocationPermission> Function();
typedef GetPositionStreamFn = Stream<Position> Function({
  LocationSettings? locationSettings,
});
typedef GetCurrentPositionFn = Future<Position> Function({
  LocationSettings? locationSettings,
});

/// Reusable Rider GPS service built on the existing `geolocator ^14` package.
///
/// Responsibilities:
/// • Request / check location permission.
/// • Check whether device location services are enabled.
/// • Provide a clean, validated [Position] stream for active-delivery tracking.
/// • Validate every incoming position (lat ∈ [-90,90], lng ∈ [-180,180], no NaN/∞).
/// • Stop the stream cleanly when the caller calls [stopTracking] or disposes.
///
/// Battery policy:
/// • Distance filter: 30 m  (no update until the rider moves 30 m)
/// • Interval (Android): 15 s
/// • Accuracy: [LocationAccuracy.high]
class RiderLocationService {
  /// Distance a rider must travel (metres) before a new position is emitted.
  static const int distanceFilterMetres = 30;

  /// Minimum interval between OS-level position updates (Android only).
  static const int intervalMilliseconds = 15000; // 15 s

  final LocationServiceEnabledFn _isLocationServiceEnabled;
  final CheckPermissionFn _checkPermission;
  final RequestPermissionFn _requestPermission;
  final GetPositionStreamFn _getPositionStream;
  final GetCurrentPositionFn _getCurrentPosition;

  RiderLocationService({
    LocationServiceEnabledFn? isLocationServiceEnabledFn,
    CheckPermissionFn? checkPermissionFn,
    RequestPermissionFn? requestPermissionFn,
    GetPositionStreamFn? getPositionStreamFn,
    GetCurrentPositionFn? getCurrentPositionFn,
  })  : _isLocationServiceEnabled = isLocationServiceEnabledFn ?? Geolocator.isLocationServiceEnabled,
        _checkPermission = checkPermissionFn ?? Geolocator.checkPermission,
        _requestPermission = requestPermissionFn ?? Geolocator.requestPermission,
        _getPositionStream = getPositionStreamFn ?? Geolocator.getPositionStream,
        _getCurrentPosition = getCurrentPositionFn ?? Geolocator.getCurrentPosition;

  StreamSubscription<Position>? _subscription;
  final StreamController<Position> _controller =
      StreamController<Position>.broadcast();

  /// Whether [startTracking] has been called and the stream is currently live.
  bool get isTracking => _subscription != null;

  /// Emits validated [Position] objects while tracking is active.
  Stream<Position> get positionStream => _controller.stream;

  // ─────────────────────────────── permission ───────────────────────────────

  /// Checks and — if needed — requests location permission.
  ///
  /// Only requests permission when required; does NOT request background
  /// permission on startup.
  Future<LocationPermissionResult> checkAndRequestPermission() async {
    try {
      final serviceEnabled = await _isLocationServiceEnabled();
      if (!serviceEnabled) {
        return LocationPermissionResult.serviceDisabled();
      }

      var permission = await _checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await _requestPermission();
      }

      if (permission == LocationPermission.deniedForever) {
        return LocationPermissionResult.deniedForever();
      }

      if (permission == LocationPermission.denied) {
        return LocationPermissionResult.denied();
      }

      // whileInUse and always are both acceptable.
      return LocationPermissionResult.granted();
    } catch (error, stack) {
      developer.log(
        'RiderLocationService: permission check failed',
        name: 'RiderLocationService',
        error: error,
        stackTrace: stack,
      );
      return LocationPermissionResult.denied();
    }
  }

  // ─────────────────────────────── tracking ─────────────────────────────────

  /// Starts a continuous GPS position stream and exposes it via [positionStream].
  ///
  /// Checks permissions first. If permission is not granted the stream is not
  /// started and the returned [LocationPermissionResult] tells the caller why.
  ///
  /// Safe to call multiple times — if tracking is already active it is a no-op
  /// and returns [LocationPermissionResult.granted].
  Future<LocationPermissionResult> startTracking() async {
    if (isTracking) return LocationPermissionResult.granted();

    final permResult = await checkAndRequestPermission();
    if (!permResult.isGranted) return permResult;

    try {
      _subscription = _getPositionStream(
        locationSettings: buildLocationSettings(),
      ).listen(
        _onPosition,
        onError: _onStreamError,
        cancelOnError: false,
      );
    } catch (error, stack) {
      developer.log(
        'RiderLocationService: failed to start stream',
        name: 'RiderLocationService',
        error: error,
        stackTrace: stack,
      );
      return LocationPermissionResult.denied();
    }

    developer.log(
      'RiderLocationService: tracking started',
      name: 'RiderLocationService',
    );
    return LocationPermissionResult.granted();
  }

  /// Stops the GPS stream and releases resources.
  ///
  /// Safe to call even when tracking is not active.
  Future<void> stopTracking() async {
    final sub = _subscription;
    _subscription = null;
    await sub?.cancel();
    developer.log(
      'RiderLocationService: tracking stopped',
      name: 'RiderLocationService',
    );
  }

  /// One-shot current position read (does not start the continuous stream).
  ///
  /// Returns `null` if permission is denied or an error occurs.
  Future<Position?> getCurrentPosition() async {
    final perm = await checkAndRequestPermission();
    if (!perm.isGranted) return null;
    try {
      return await _getCurrentPosition(
        locationSettings: buildLocationSettings(),
      );
    } catch (error, stack) {
      developer.log(
        'RiderLocationService: getCurrentPosition failed',
        name: 'RiderLocationService',
        error: error,
        stackTrace: stack,
      );
      return null;
    }
  }

  /// Releases the internal broadcast [StreamController].
  ///
  /// Call this only when the service object itself is being discarded.
  Future<void> dispose() async {
    await stopTracking();
    await _controller.close();
  }

  // ─────────────────────────────── validation ───────────────────────────────

  /// Returns true when [lat] and [lng] represent valid geographic coordinates.
  ///
  /// Rejects:
  /// • null values
  /// • NaN
  /// • ±Infinity
  /// • latitude outside [-90, 90]
  /// • longitude outside [-180, 180]
  static bool isValidCoordinate(double? lat, double? lng) {
    if (lat == null || lng == null) return false;
    if (lat.isNaN || lng.isNaN) return false;
    if (lat.isInfinite || lng.isInfinite) return false;
    if (lat < -90.0 || lat > 90.0) return false;
    if (lng < -180.0 || lng > 180.0) return false;
    return true;
  }

  // ─────────────────────────────── internals ────────────────────────────────

  void _onPosition(Position position) {
    if (!isValidCoordinate(position.latitude, position.longitude)) {
      developer.log(
        'RiderLocationService: rejected invalid position '
        '(${position.latitude}, ${position.longitude})',
        name: 'RiderLocationService',
      );
      return;
    }
    if (!_controller.isClosed) {
      _controller.add(position);
    }
  }

  void _onStreamError(Object error, StackTrace stack) {
    developer.log(
      'RiderLocationService: stream error',
      name: 'RiderLocationService',
      error: error,
      stackTrace: stack,
    );
  }

  LocationSettings buildLocationSettings() {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distanceFilterMetres,
        intervalDuration: const Duration(milliseconds: intervalMilliseconds),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distanceFilterMetres,
        pauseLocationUpdatesAutomatically: true,
        showBackgroundLocationIndicator: true,
      );
    }
    return const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: distanceFilterMetres,
    );
  }
}
