import 'dart:async';
import 'dart:developer' as developer;

import 'package:geolocator/geolocator.dart';

import '../data/repositories/rider_repository.dart';
import '../core/network/api_exception.dart';
import 'rider_location_service.dart';

typedef UpdateLocationFn = Future<void> Function({
  required double latitude,
  required double longitude,
});

/// Throttled, single-flight location publisher for M5.
///
/// Bridges the [RiderLocationService] GPS stream with the existing
/// `PATCH /wallet/location` backend endpoint exposed by [RiderRepository].
///
/// Update / throttle policy
/// ─────────────────────────
/// • Minimum time between uploads: 30 seconds (configurable for tests).
/// • Minimum distance change: 30 m (enforced at the GPS stream level by
///   [RiderLocationService.distanceFilterMetres]).
/// • Single-flight guard: if an upload is already in-flight the next position
///   is silently dropped (no queue, no overlap).
///
/// Error policy
/// ─────────────
/// • Network / timeout errors: logged, tracking continues, next update retries.
/// • 401 / 403: logged, tracking continues (token refresh is handled by ApiClient).
/// • 404 / 500: logged, tracking continues.
/// • No blocking UI error is shown for every failed GPS upload.
class RiderLocationPublisher {
  final RiderLocationService _locationService;
  final RiderRepository _repository;
  final UpdateLocationFn? updateLocationFn;
  final Duration minUploadInterval;
  final DateTime Function() _now;

  RiderLocationPublisher({
    RiderLocationService? locationService,
    RiderRepository? repository,
    this.updateLocationFn,
    this.minUploadInterval = const Duration(seconds: 30),
    DateTime Function()? nowFn,
  })  : _locationService = locationService ?? RiderLocationService(),
        _repository = repository ?? RiderRepository(),
        _now = nowFn ?? DateTime.now;

  RiderLocationService get locationService => _locationService;

  // ─────────────────────────────── state ────────────────────────────────────

  StreamSubscription<Position>? _positionSubscription;

  /// Whether an HTTP upload is currently in-flight (single-flight guard).
  bool _uploadInFlight = false;
  bool get uploadInFlight => _uploadInFlight;

  /// Timestamp of the last successful upload attempt.
  DateTime? _lastUploadAt;
  DateTime? get lastUploadAt => _lastUploadAt;

  /// The most recently published coordinates (null if none yet).
  double? _lastLat;
  double? _lastLng;

  /// Count of total upload attempts triggered.
  int _uploadAttemptCount = 0;
  int get uploadAttemptCount => _uploadAttemptCount;

  /// Count of successful uploads completed.
  int _successfulUploadCount = 0;
  int get successfulUploadCount => _successfulUploadCount;

  /// True while the publisher is active (i.e. [start] has been called and
  /// [stop] has not).
  bool get isRunning => _positionSubscription != null;

  /// Last known latitude; null until a valid position is published.
  double? get lastLatitude => _lastLat;

  /// Last known longitude; null until a valid position is published.
  double? get lastLongitude => _lastLng;

  // ─────────────────────────────── lifecycle ────────────────────────────────

  /// Starts GPS tracking and location publishing.
  ///
  /// Returns the [LocationPermissionResult] so the caller can surface the
  /// appropriate UI state.
  ///
  /// If already running this is a no-op and returns
  /// [LocationPermissionResult.granted].
  Future<LocationPermissionResult> start() async {
    if (isRunning) return LocationPermissionResult.granted();

    final result = await _locationService.startTracking();
    if (!result.isGranted) return result;

    _positionSubscription = _locationService.positionStream.listen(
      _onPosition,
      onError: (Object error) {
        developer.log(
          'RiderLocationPublisher: position stream error',
          name: 'RiderLocationPublisher',
          error: error,
        );
      },
      cancelOnError: false,
    );

    developer.log(
      'RiderLocationPublisher: started',
      name: 'RiderLocationPublisher',
    );
    return result;
  }

  /// Stops GPS tracking and publishing.
  ///
  /// Safe to call when not running.
  Future<void> stop() async {
    final sub = _positionSubscription;
    _positionSubscription = null;
    await sub?.cancel();
    await _locationService.stopTracking();
    developer.log(
      'RiderLocationPublisher: stopped',
      name: 'RiderLocationPublisher',
    );
  }

  /// Stops tracking and disposes the underlying [RiderLocationService].
  ///
  /// Call only when the owning object is being permanently discarded.
  Future<void> dispose() async {
    await stop();
    await _locationService.dispose();
  }

  // ─────────────────────────────── upload pipeline ──────────────────────────

  /// GPS stream callback — validates → throttles → single-flight guards → uploads.
  void _onPosition(Position position) {
    final lat = position.latitude;
    final lng = position.longitude;

    // Step 1: validate
    if (!RiderLocationService.isValidCoordinate(lat, lng)) {
      developer.log(
        'RiderLocationPublisher: skipping invalid coordinate ($lat, $lng)',
        name: 'RiderLocationPublisher',
      );
      return;
    }

    // Step 2: throttle — skip if not enough time has passed since last upload
    final now = _now();
    final lastUpload = _lastUploadAt;
    if (lastUpload != null && now.difference(lastUpload) < minUploadInterval) {
      return;
    }

    // Step 3: single-flight — skip if an upload is already in progress
    if (_uploadInFlight) {
      developer.log(
        'RiderLocationPublisher: upload already in-flight, skipping',
        name: 'RiderLocationPublisher',
      );
      return;
    }

    // Step 4: upload (fire-and-forget; errors are caught inside)
    _upload(lat, lng);
  }

  Future<void> _upload(double lat, double lng) async {
    _uploadInFlight = true;
    _uploadAttemptCount++;
    try {
      final updateFn = updateLocationFn;
      if (updateFn != null) {
        await updateFn(latitude: lat, longitude: lng);
      } else {
        await _repository.updateLocation(latitude: lat, longitude: lng);
      }
      _lastUploadAt = _now();
      _lastLat = lat;
      _lastLng = lng;
      _successfulUploadCount++;
      developer.log(
        'RiderLocationPublisher: uploaded ($lat, $lng)',
        name: 'RiderLocationPublisher',
      );
    } on ApiException catch (error) {
      // All API errors are logged but do NOT stop tracking.
      developer.log(
        'RiderLocationPublisher: upload failed [${error.kind.name}] ${error.message}',
        name: 'RiderLocationPublisher',
      );
    } catch (error, stack) {
      developer.log(
        'RiderLocationPublisher: unexpected upload error',
        name: 'RiderLocationPublisher',
        error: error,
        stackTrace: stack,
      );
    } finally {
      _uploadInFlight = false;
    }
  }

  /// Manually trigger a position evaluation (convenient for testing and one-shots).
  void handlePosition(Position position) => _onPosition(position);
}
