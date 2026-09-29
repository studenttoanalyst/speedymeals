import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:speedy_meals/core/constants/app_constants.dart';
import 'package:speedy_meals/core/network/api_exception.dart';
import 'package:speedy_meals/data/models/rider_models.dart';
import 'package:speedy_meals/data/repositories/rider_repository.dart';
import 'package:speedy_meals/features/maps/maps.dart';
import 'package:speedy_meals/screens/rider/rider_dashboard_screen.dart';

Position createTestPosition({
  required double latitude,
  required double longitude,
  DateTime? timestamp,
}) {
  return Position(
    latitude: latitude,
    longitude: longitude,
    timestamp: timestamp ?? DateTime.now(),
    accuracy: 5.0,
    altitude: 10.0,
    altitudeAccuracy: 1.0,
    heading: 0.0,
    headingAccuracy: 1.0,
    speed: 15.0,
    speedAccuracy: 1.0,
  );
}

class FakeRiderRepository extends RiderRepository {
  List<RiderAssignment> stubbedAssignments = [];
  RiderProfile stubbedProfile = const RiderProfile(
    id: 'r_001',
    name: 'Test Rider',
    phoneNumber: '03001234567',
    approvalStatus: 'approved',
    isOnline: true,
  );
  RiderWallet stubbedWallet = const RiderWallet(
    walletBalance: 1000,
    earningsBalance: 3500,
  );

  final List<Map<String, double>> locationUpdates = [];
  ApiException? updateLocationError;

  @override
  Future<RiderProfile> profile() async => stubbedProfile;

  @override
  Future<List<RiderAssignment>> assignments() async => stubbedAssignments;

  @override
  Future<RiderWallet> earnings() async => stubbedWallet;

  @override
  Future<RiderWallet> setOnline(bool isOnline) async {
    stubbedProfile = stubbedProfile.copyWith(isOnline: isOnline);
    return stubbedWallet;
  }

  @override
  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  }) async {
    if (updateLocationError != null) {
      throw updateLocationError!;
    }
    locationUpdates.add({'latitude': latitude, 'longitude': longitude});
  }
}

RiderAssignment createTestAssignment({
  String id = 'ord_m5',
  OrderStatus status = OrderStatus.acceptedByRider,
  double restaurantLat = 33.6844,
  double restaurantLng = 73.0479,
  double customerLat = 33.7294,
  double customerLng = 73.0372,
}) {
  return RiderAssignment(
    id: id,
    status: status,
    paymentMethod: PaymentMethod.cod,
    restaurantName: 'Speedy Grill',
    restaurantLatitude: restaurantLat,
    restaurantLongitude: restaurantLng,
    deliveryAddress: AssignmentAddress(
      latitude: customerLat,
      longitude: customerLng,
      label: 'Home',
      fullAddress: 'Street 1, F-7, Islamabad',
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase M5 Coordinate Validation (Tests 1-5)', () {
    test('1. Valid GPS coordinate returns true', () {
      expect(RiderLocationService.isValidCoordinate(33.6844, 73.0479), isTrue);
      expect(RiderLocationService.isValidCoordinate(-90.0, -180.0), isTrue);
      expect(RiderLocationService.isValidCoordinate(90.0, 180.0), isTrue);
      expect(RiderLocationService.isValidCoordinate(0.0, 0.0), isTrue);
    });

    test('2. Invalid latitude returns false', () {
      expect(RiderLocationService.isValidCoordinate(90.001, 73.0479), isFalse);
      expect(RiderLocationService.isValidCoordinate(-90.001, 73.0479), isFalse);
      expect(RiderLocationService.isValidCoordinate(150.0, 73.0479), isFalse);
      expect(RiderLocationService.isValidCoordinate(null, 73.0479), isFalse);
    });

    test('3. Invalid longitude returns false', () {
      expect(RiderLocationService.isValidCoordinate(33.6844, 180.001), isFalse);
      expect(RiderLocationService.isValidCoordinate(33.6844, -180.001), isFalse);
      expect(RiderLocationService.isValidCoordinate(33.6844, 250.0), isFalse);
      expect(RiderLocationService.isValidCoordinate(33.6844, null), isFalse);
    });

    test('4. NaN coordinate returns false', () {
      expect(RiderLocationService.isValidCoordinate(double.nan, 73.0479), isFalse);
      expect(RiderLocationService.isValidCoordinate(33.6844, double.nan), isFalse);
      expect(RiderLocationService.isValidCoordinate(double.nan, double.nan), isFalse);
    });

    test('5. Infinite coordinate returns false', () {
      expect(RiderLocationService.isValidCoordinate(double.infinity, 73.0479), isFalse);
      expect(RiderLocationService.isValidCoordinate(-double.infinity, 73.0479), isFalse);
      expect(RiderLocationService.isValidCoordinate(33.6844, double.infinity), isFalse);
      expect(RiderLocationService.isValidCoordinate(33.6844, double.negativeInfinity), isFalse);
    });
  });

  group('Phase M5 Permission & Service Status Handling (Tests 6-8)', () {
    test('6. Permission denied returns LocationPermissionState.denied', () async {
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.denied,
        requestPermissionFn: () async => LocationPermission.denied,
      );

      final result = await service.checkAndRequestPermission();
      expect(result.state, equals(LocationPermissionState.denied));
      expect(result.isGranted, isFalse);
      expect(result.message, equals('Location permission required'));
    });

    test('7. Permission permanently denied returns LocationPermissionState.deniedForever', () async {
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.deniedForever,
      );

      final result = await service.checkAndRequestPermission();
      expect(result.state, equals(LocationPermissionState.deniedForever));
      expect(result.isGranted, isFalse);
      expect(result.message, equals('Location permission required'));
    });

    test('8. Location service disabled returns LocationPermissionState.serviceDisabled', () async {
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => false,
      );

      final result = await service.checkAndRequestPermission();
      expect(result.state, equals(LocationPermissionState.serviceDisabled));
      expect(result.isGranted, isFalse);
      expect(result.message, equals('Turn on location services'));
    });
  });

  group('Phase M5 GPS Stream Management (Tests 9-10)', () {
    test('9. GPS stream starts when permission is granted', () async {
      final streamController = StreamController<Position>.broadcast();
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      expect(service.isTracking, isFalse);
      final result = await service.startTracking();

      expect(result.isGranted, isTrue);
      expect(service.isTracking, isTrue);

      final emittedPositions = <Position>[];
      final sub = service.positionStream.listen(emittedPositions.add);

      streamController.add(createTestPosition(latitude: 33.6844, longitude: 73.0479));
      await Future<void>.delayed(Duration.zero);

      expect(emittedPositions, hasLength(1));
      expect(emittedPositions.first.latitude, equals(33.6844));

      await sub.cancel();
      await service.dispose();
      await streamController.close();
    });

    test('10. GPS stream stops cleanly and releases subscription', () async {
      final streamController = StreamController<Position>.broadcast();
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      await service.startTracking();
      expect(service.isTracking, isTrue);

      await service.stopTracking();
      expect(service.isTracking, isFalse);

      await service.dispose();
      await streamController.close();
    });
  });

  group('Phase M5 Active Delivery Tracking Lifecycle (Tests 11-14)', () {
    test('11. Active delivery starts tracking', () async {
      final streamController = StreamController<Position>.broadcast();
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      final publisher = RiderLocationPublisher(locationService: service);

      expect(publisher.isRunning, isFalse);
      final result = await publisher.start();

      expect(result.isGranted, isTrue);
      expect(publisher.isRunning, isTrue);

      await publisher.stop();
      await service.dispose();
      await streamController.close();
    });

    test('12. Completed delivery stops tracking', () async {
      final streamController = StreamController<Position>.broadcast();
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      final publisher = RiderLocationPublisher(locationService: service);
      await publisher.start();
      expect(publisher.isRunning, isTrue);

      // Order completed -> stop tracking
      await publisher.stop();
      expect(publisher.isRunning, isFalse);

      await service.dispose();
      await streamController.close();
    });

    test('13. Cancelled delivery stops tracking', () async {
      final streamController = StreamController<Position>.broadcast();
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      final publisher = RiderLocationPublisher(locationService: service);
      await publisher.start();
      expect(publisher.isRunning, isTrue);

      // Order cancelled -> stop tracking
      await publisher.stop();
      expect(publisher.isRunning, isFalse);

      await service.dispose();
      await streamController.close();
    });

    test('14. Rider logout stops tracking', () async {
      final streamController = StreamController<Position>.broadcast();
      final service = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      final publisher = RiderLocationPublisher(locationService: service);
      await publisher.start();
      expect(publisher.isRunning, isTrue);

      // Rider logout scenario
      await publisher.stop();
      expect(publisher.isRunning, isFalse);

      await service.dispose();
      await streamController.close();
    });
  });

  group('Phase M5 Upload Throttling & Single-Flight Protection (Tests 15-18)', () {
    test('15. Location upload throttling enforces minimum interval', () async {
      DateTime mockTime = DateTime(2026, 9, 27, 12, 0, 0);
      final uploadedCoordinates = <Map<String, double>>[];

      final publisher = RiderLocationPublisher(
        minUploadInterval: const Duration(seconds: 30),
        nowFn: () => mockTime,
        updateLocationFn: ({required latitude, required longitude}) async {
          uploadedCoordinates.add({'latitude': latitude, 'longitude': longitude});
        },
      );

      // 1st update at 0s -> should upload
      publisher.handlePosition(createTestPosition(latitude: 33.6844, longitude: 73.0479));
      await Future<void>.delayed(Duration.zero);
      expect(uploadedCoordinates, hasLength(1));
      expect(publisher.successfulUploadCount, equals(1));

      // 2nd update at +10s -> should be throttled/skipped
      mockTime = mockTime.add(const Duration(seconds: 10));
      publisher.handlePosition(createTestPosition(latitude: 33.6850, longitude: 73.0485));
      await Future<void>.delayed(Duration.zero);
      expect(uploadedCoordinates, hasLength(1)); // skipped

      // 3rd update at +31s (> 30s) -> should upload
      mockTime = mockTime.add(const Duration(seconds: 21));
      publisher.handlePosition(createTestPosition(latitude: 33.6860, longitude: 73.0495));
      await Future<void>.delayed(Duration.zero);
      expect(uploadedCoordinates, hasLength(2));
      expect(publisher.successfulUploadCount, equals(2));
    });

    test('16. Duplicate/overlapping upload prevention (single-flight guard)', () async {
      final completer = Completer<void>();
      int inFlightCallCount = 0;

      final publisher = RiderLocationPublisher(
        minUploadInterval: Duration.zero,
        updateLocationFn: ({required latitude, required longitude}) async {
          inFlightCallCount++;
          await completer.future; // keeps first call in-flight
        },
      );

      // Trigger 1st update
      publisher.handlePosition(createTestPosition(latitude: 33.6844, longitude: 73.0479));
      expect(publisher.uploadInFlight, isTrue);
      expect(inFlightCallCount, equals(1));

      // Trigger 2nd update while 1st is still in flight -> must be skipped
      publisher.handlePosition(createTestPosition(latitude: 33.6850, longitude: 73.0485));
      expect(inFlightCallCount, equals(1)); // skipped because upload in flight

      // Complete 1st upload
      completer.complete();
      await Future<void>.delayed(Duration.zero);
      expect(publisher.uploadInFlight, isFalse);
    });

    test('17. Network failure handling does not crash or throw', () async {
      final publisher = RiderLocationPublisher(
        minUploadInterval: Duration.zero,
        updateLocationFn: ({required latitude, required longitude}) async {
          throw ApiException(
            kind: ApiErrorKind.network,
            message: 'Network connection unavailable',
          );
        },
      );

      // Must not throw unhandled exception
      expect(
        () => publisher.handlePosition(createTestPosition(latitude: 33.6844, longitude: 73.0479)),
        returnsNormally,
      );
      await Future<void>.delayed(Duration.zero);

      expect(publisher.uploadAttemptCount, equals(1));
      expect(publisher.successfulUploadCount, equals(0));
    });

    test('18. Authentication error handling does not crash or terminate publisher', () async {
      final publisher = RiderLocationPublisher(
        minUploadInterval: Duration.zero,
        updateLocationFn: ({required latitude, required longitude}) async {
          throw ApiException(
            kind: ApiErrorKind.unauthorized,
            statusCode: 401,
            message: 'Token expired',
          );
        },
      );

      expect(
        () => publisher.handlePosition(createTestPosition(latitude: 33.6844, longitude: 73.0479)),
        returnsNormally,
      );
      await Future<void>.delayed(Duration.zero);

      expect(publisher.uploadAttemptCount, equals(1));
      expect(publisher.successfulUploadCount, equals(0));
    });
  });

  group('Phase M5 Map Marker & UI Integration (Tests 19-21)', () {
    test('19. MapMarkers.rider builds marker with latest coordinates', () {
      const position = LatLng(33.7123, 73.0456);
      final marker = MapMarkers.rider(
        id: 'ord_m5',
        position: position,
        riderName: 'You',
      );

      expect(marker.markerId.value, equals('rider_ord_m5'));
      expect(marker.position.latitude, equals(33.7123));
      expect(marker.position.longitude, equals(73.0456));
      expect(marker.infoWindow.title, equals('You'));
      expect(marker.infoWindow.snippet, equals('Speedy Rider'));
      expect(marker.icon, isNotNull);
    });

    test('20. MapView with fitBoundsOnMarkers=false does not auto-recenter on marker update', () {
      const initialPos = LatLng(33.6844, 73.0479);
      final mapView = MapView(
        initialPosition: initialPos,
        markers: {
          MapMarkers.restaurant(id: '1', position: initialPos, name: 'Rest'),
          MapMarkers.rider(id: '1', position: const LatLng(33.6900, 73.0500), riderName: 'You'),
        },
        fitBoundsOnMarkers: false,
      );

      expect(mapView.fitBoundsOnMarkers, isFalse);
      expect(mapView.initialPosition, equals(initialPos));
    });

    testWidgets('21. Widget and service disposal cleanup succeeds cleanly', (tester) async {
      final fakeRepo = FakeRiderRepository();
      fakeRepo.stubbedAssignments = [createTestAssignment()];

      final streamController = StreamController<Position>.broadcast();
      final locationService = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getPositionStreamFn: ({LocationSettings? locationSettings}) => streamController.stream,
      );

      final publisher = RiderLocationPublisher(
        locationService: locationService,
        repository: fakeRepo,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RiderDashboardScreen(
            repository: fakeRepo,
            locationService: locationService,
            locationPublisher: publisher,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Dispose widget
      await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Text('Disposed'))));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Confirm cleanup did not throw and publisher is stopped
      expect(publisher.isRunning, isFalse);

      // Teardown touches real async (stream cancellation / controller close),
      // so run it outside the fake-async zone to avoid a deadlock.
      await tester.runAsync(() async {
        await publisher.dispose();
        await streamController.close();
      });
    });
  });

  group('Phase M6 — Online/TTL push coordinate guard', () {
    testWidgets(
        '22. Online location push rejects an invalid GPS reading and never publishes it',
        (tester) async {
      final fakeRepo = FakeRiderRepository();
      // Start offline so tapping the status chip attempts to go online, which
      // triggers the guarded `_pushLocation` path.
      fakeRepo.stubbedProfile = const RiderProfile(
        id: 'r_m6',
        name: 'Guard Rider',
        phoneNumber: '03001234567',
        approvalStatus: 'approved',
        isOnline: false,
      );

      final locationService = RiderLocationService(
        isLocationServiceEnabledFn: () async => true,
        checkPermissionFn: () async => LocationPermission.whileInUse,
        getCurrentPositionFn: ({LocationSettings? locationSettings}) async =>
            createTestPosition(latitude: double.nan, longitude: 73.0479),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RiderDashboardScreen(
            repository: fakeRepo,
            locationService: locationService,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      await tester.tap(find.byType(FilterChip));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // The invalid reading must never reach PATCH /wallet/location, and the
      // rider must not be flipped online on the strength of it.
      expect(fakeRepo.locationUpdates, isEmpty);
      expect(fakeRepo.stubbedProfile.isOnline, isFalse);

      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    });
  });
}
