import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_constants.dart';
import '../../data/models/rider_models.dart';

/// Destination targets supported for rider navigation.
enum NavigationDestinationType {
  restaurant,
  customer,
}

/// Structured outcome of an attempted navigation launch.
class NavigationResult {
  final bool success;
  final String? errorMessage;
  final Uri? launchedUri;

  const NavigationResult._({
    required this.success,
    this.errorMessage,
    this.launchedUri,
  });

  factory NavigationResult.success([Uri? uri]) => NavigationResult._(
        success: true,
        launchedUri: uri,
      );

  factory NavigationResult.failure(String message) => NavigationResult._(
        success: false,
        errorMessage: message,
      );
}

typedef UrlLauncherFn = Future<bool> Function(Uri uri, {LaunchMode mode});
typedef CanLaunchUrlFn = Future<bool> Function(Uri uri);

/// Service providing platform-safe navigation URL generation and Google Maps app hand-off.
class RiderNavigationService {
  final UrlLauncherFn _launchUrl;
  final CanLaunchUrlFn _canLaunchUrl;

  const RiderNavigationService({
    UrlLauncherFn launchUrlFn = launchUrl,
    CanLaunchUrlFn canLaunchUrlFn = canLaunchUrl,
  })  : _launchUrl = launchUrlFn,
        _canLaunchUrl = canLaunchUrlFn;

  /// Validates whether latitude and longitude are non-null and within valid geographic bounds.
  static bool isValidCoordinate(double? latitude, double? longitude) {
    if (latitude == null || longitude == null) return false;
    if (latitude.isNaN || longitude.isNaN || latitude.isInfinite || longitude.isInfinite) {
      return false;
    }
    return latitude >= -90.0 && latitude <= 90.0 && longitude >= -180.0 && longitude <= 180.0;
  }

  /// Builds platform-safe Android navigation URI:
  /// `google.navigation:q=<lat>,<lng>&mode=d`
  static Uri buildAndroidNavigationUri(double latitude, double longitude) {
    return Uri.parse('google.navigation:q=$latitude,$longitude&mode=d');
  }

  /// Builds iOS Google Maps scheme URI:
  /// `comgooglemaps://?daddr=<lat>,<lng>&directionsmode=driving`
  static Uri buildIosNavigationUri(double latitude, double longitude) {
    return Uri.parse('comgooglemaps://?daddr=$latitude,$longitude&directionsmode=driving');
  }

  /// Builds cross-platform universal Google Maps web/app directions URI:
  /// `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving`
  static Uri buildUniversalNavigationUri(double latitude, double longitude) {
    return Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': '$latitude,$longitude',
      'travelmode': 'driving',
    });
  }

  /// Builds the primary platform-specific navigation URI based on [defaultTargetPlatform].
  static Uri buildPrimaryNavigationUri(double latitude, double longitude) {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return buildIosNavigationUri(latitude, longitude);
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      return buildAndroidNavigationUri(latitude, longitude);
    }
    return buildUniversalNavigationUri(latitude, longitude);
  }

  /// Resolves destination coordinates from a [RiderAssignment] for the specified [NavigationDestinationType].
  ///
  /// Returns `null` if the destination coordinates are missing or invalid.
  static LatLng? getDestinationCoordinates(
    RiderAssignment? assignment,
    NavigationDestinationType type,
  ) {
    if (assignment == null) return null;
    switch (type) {
      case NavigationDestinationType.restaurant:
        final lat = assignment.restaurantLatitude;
        final lng = assignment.restaurantLongitude;
        if (isValidCoordinate(lat, lng)) {
          return LatLng(lat!, lng!);
        }
        return null;
      case NavigationDestinationType.customer:
        final lat = assignment.customerLatitude;
        final lng = assignment.customerLongitude;
        if (isValidCoordinate(lat, lng)) {
          return LatLng(lat!, lng!);
        }
        return null;
    }
  }

  /// Resolves the default destination type based on the active delivery lifecycle:
  /// - Before pickup (`acceptedByRider`, `arrivedAtRestaurant`): Restaurant
  /// - After pickup (`pickedUp`, `onTheWay`): Customer
  static NavigationDestinationType defaultDestinationForStatus(OrderStatus status) {
    switch (status) {
      case OrderStatus.pickedUp:
      case OrderStatus.onTheWay:
        return NavigationDestinationType.customer;
      case OrderStatus.acceptedByRider:
      case OrderStatus.arrivedAtRestaurant:
      default:
        return NavigationDestinationType.restaurant;
    }
  }

  /// Checks whether an assignment is active and eligible for navigation.
  ///
  /// Deliberately returns `false` for terminal (`delivered`, `cancelled`) or unaccepted orders.
  static bool isNavigationEligible(RiderAssignment? assignment) {
    if (assignment == null) return false;
    return assignment.isInProgress;
  }

  /// Launches external Google Maps navigation for destination [latitude] and [longitude].
  ///
  /// 1. Validates coordinates.
  /// 2. Attempts native platform URI (`google.navigation` on Android, `comgooglemaps` on iOS).
  /// 3. Falls back gracefully to universal Google Maps URI (`https://www.google.com/maps/dir/...`).
  /// 4. Returns a user-friendly [NavigationResult] without throwing unhandled exceptions.
  Future<NavigationResult> launchNavigation({
    required double latitude,
    required double longitude,
  }) async {
    if (!isValidCoordinate(latitude, longitude)) {
      return NavigationResult.failure(
        'Invalid destination coordinates (${latitude.toStringAsFixed(4)}, ${longitude.toStringAsFixed(4)}).',
      );
    }

    final primaryUri = buildPrimaryNavigationUri(latitude, longitude);
    final universalUri = buildUniversalNavigationUri(latitude, longitude);

    try {
      if (await _canLaunchUrl(primaryUri)) {
        final launched = await _launchUrl(
          primaryUri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) {
          return NavigationResult.success(primaryUri);
        }
      }
    } catch (_) {
      // Primary native URI launch threw or unsupported, proceed to universal fallback.
    }

    try {
      if (await _canLaunchUrl(universalUri)) {
        final launched = await _launchUrl(
          universalUri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) {
          return NavigationResult.success(universalUri);
        }
      }
    } catch (_) {
      // Universal URI launch failed.
    }

    return NavigationResult.failure(
      'Could not launch Google Maps or navigation on this device.',
    );
  }

  /// Convenience method to launch navigation for an active [RiderAssignment].
  Future<NavigationResult> navigateForAssignment(
    RiderAssignment assignment, {
    NavigationDestinationType? destinationType,
  }) async {
    if (!isNavigationEligible(assignment)) {
      return NavigationResult.failure(
        'Navigation is only available for active in-progress deliveries.',
      );
    }

    final targetType = destinationType ?? defaultDestinationForStatus(assignment.status);
    final coords = getDestinationCoordinates(assignment, targetType);

    if (coords == null) {
      final name = targetType == NavigationDestinationType.restaurant ? 'Restaurant' : 'Customer';
      return NavigationResult.failure(
        '$name destination location is unavailable.',
      );
    }

    return launchNavigation(
      latitude: coords.latitude,
      longitude: coords.longitude,
    );
  }
}
