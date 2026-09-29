import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:speedy_meals/core/constants/app_constants.dart';
import 'package:speedy_meals/core/network/api_client.dart';
import 'package:speedy_meals/data/models/order_models.dart';
import 'package:speedy_meals/data/models/rider_location.dart';
import 'package:speedy_meals/data/repositories/order_repository.dart';
import 'package:speedy_meals/data/repositories/rider_location_repository.dart';
import 'package:speedy_meals/features/maps/maps.dart';
import 'package:speedy_meals/screens/tracking/order_tracking_screen.dart';

/// Test mock implementation of [RiderLocationRepository].
class FakeRiderLocationRepository implements RiderLocationRepository {
  RiderLocation? nextResult;
  bool shouldThrow = false;
  int callCount = 0;
  Completer<RiderLocation?>? completer;

  @override
  Future<RiderLocation?> getRiderLocation(String orderId) async {
    callCount++;
    if (completer != null) {
      return completer!.future;
    }
    if (shouldThrow) {
      throw Exception('Simulated network error');
    }
    return nextResult;
  }
}

/// Test fake of [OrderRepository] returning pre-configured [OrderTracking].
class FakeOrderRepository extends OrderRepository {
  OrderTracking trackingResult;
  int trackCallCount = 0;

  FakeOrderRepository(this.trackingResult);

  @override
  Future<OrderTracking> track(String orderId) async {
    trackCallCount++;
    return trackingResult;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase M3 RiderLocation Model Tests', () {
    test('valid coordinates pass isValidCoordinate check', () {
      expect(RiderLocation.isValidCoordinate(33.6844, 73.0479), isTrue);
      expect(RiderLocation.isValidCoordinate(0.0, 0.0), isTrue);
      expect(RiderLocation.isValidCoordinate(-90.0, -180.0), isTrue);
      expect(RiderLocation.isValidCoordinate(90.0, 180.0), isTrue);
    });

    test('invalid or out-of-bounds coordinates are rejected', () {
      expect(RiderLocation.isValidCoordinate(null, 73.0479), isFalse);
      expect(RiderLocation.isValidCoordinate(33.6844, null), isFalse);
      expect(RiderLocation.isValidCoordinate(91.0, 73.0479), isFalse);
      expect(RiderLocation.isValidCoordinate(-91.0, 73.0479), isFalse);
      expect(RiderLocation.isValidCoordinate(33.6844, 181.0), isFalse);
      expect(RiderLocation.isValidCoordinate(33.6844, -181.0), isFalse);
      expect(RiderLocation.isValidCoordinate(double.nan, 73.0479), isFalse);
      expect(RiderLocation.isValidCoordinate(33.6844, double.infinity), isFalse);
    });

    test('tryFromJson parses valid JSON correctly', () {
      final json = {
        'rider_id': 'r_123',
        'latitude': 33.6922,
        'longitude': 73.0539,
        'timestamp': '2026-09-26T20:00:00.000Z',
      };

      final location = RiderLocation.tryFromJson(json);
      expect(location, isNotNull);
      expect(location!.riderId, equals('r_123'));
      expect(location.latitude, equals(33.6922));
      expect(location.longitude, equals(73.0539));
      expect(location.timestamp, isNotNull);
    });

    test('tryFromJson handles alternative camelCase and lat/lng keys', () {
      final json = {
        'riderId': 'r_camel',
        'lat': 24.8607,
        'lng': 67.0011,
        'updated_at': '2026-09-26T21:00:00.000Z',
      };

      final location = RiderLocation.tryFromJson(json);
      expect(location, isNotNull);
      expect(location!.riderId, equals('r_camel'));
      expect(location.latitude, equals(24.8607));
      expect(location.longitude, equals(67.0011));
    });

    test('tryFromJson returns null on invalid coordinates without throwing', () {
      final json = {
        'rider_id': 'r_123',
        'latitude': 999.0, // Invalid lat
        'longitude': 73.0539,
      };

      final location = RiderLocation.tryFromJson(json);
      expect(location, isNull);
    });

    test('fromJson throws FormatException on invalid coordinate JSON', () {
      final json = {
        'rider_id': 'r_123',
        'latitude': 'invalid',
        'longitude': 73.0539,
      };

      expect(() => RiderLocation.fromJson(json), throwsFormatException);
    });

    test('toJson serializes correctly', () {
      final location = RiderLocation(
        riderId: 'r_456',
        latitude: 33.7000,
        longitude: 73.0600,
        timestamp: DateTime.parse('2026-09-26T12:00:00.000Z'),
      );

      final json = location.toJson();
      expect(json['rider_id'], equals('r_456'));
      expect(json['latitude'], equals(33.7000));
      expect(json['longitude'], equals(73.0600));
      expect(json['timestamp'], equals('2026-09-26T12:00:00.000Z'));
    });

    test('isStale correctly identifies outdated timestamps', () {
      final fresh = RiderLocation(
        riderId: 'r_fresh',
        latitude: 33.7,
        longitude: 73.0,
        timestamp: DateTime.now().subtract(const Duration(seconds: 15)),
      );
      expect(fresh.isStale(threshold: const Duration(minutes: 1)), isFalse);

      final stale = RiderLocation(
        riderId: 'r_stale',
        latitude: 33.7,
        longitude: 73.0,
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
      );
      expect(stale.isStale(threshold: const Duration(minutes: 2)), isTrue);
    });
  });

  group('Phase M3 RiderLocationRepository Tests', () {
    test('FakeRiderLocationRepository returns expected location', () async {
      final repo = FakeRiderLocationRepository();
      repo.nextResult = const RiderLocation(
        riderId: 'rider_99',
        latitude: 33.6844,
        longitude: 73.0479,
      );

      final result = await repo.getRiderLocation('order_1');
      expect(result, isNotNull);
      expect(result!.riderId, equals('rider_99'));
      expect(repo.callCount, equals(1));
    });

    test('FakeRiderLocationRepository handles failure without crashing', () async {
      final repo = FakeRiderLocationRepository();
      repo.shouldThrow = true;

      expect(() => repo.getRiderLocation('order_1'), throwsException);
    });

    test('HttpRiderLocationRepository reads the dedicated backend endpoint', () async {
      // Contract: GET /orders/{order_id}/rider-location
      // {"order_id", "latitude", "longitude", "updated_at"} — no rider_id.
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, equals('/orders/ord-abc/rider-location'));
        return http.Response(
          jsonEncode({
            'order_id': 'ord-abc',
            'latitude': 33.7011,
            'longitude': 73.0622,
            'updated_at': '2026-09-26T21:30:00Z',
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = HttpRiderLocationRepository(client: apiClient);

      final location = await repo.getRiderLocation('ord-abc');
      expect(location, isNotNull);
      expect(location!.latitude, equals(33.7011));
      expect(location.longitude, equals(73.0622));
      expect(location.timestamp, isNotNull);
      // The dedicated endpoint does not send a rider id — it must not be invented.
      expect(location.riderId, isNull);
    });

    test('HttpRiderLocationRepository returns null for the documented null-coordinate case', () async {
      // No rider assigned yet, or the 45s Redis TTL expired.
      final mockClient = MockClient((request) async {
        expect(request.url.path, equals('/orders/ord-none/rider-location'));
        return http.Response(
          jsonEncode({
            'order_id': 'ord-none',
            'latitude': null,
            'longitude': null,
            'updated_at': null,
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = HttpRiderLocationRepository(client: apiClient);

      expect(await repo.getRiderLocation('ord-none'), isNull);
    });

    test('HttpRiderLocationRepository ignores out-of-range coordinates', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'order_id': 'ord-bad',
            'latitude': 999.0,
            'longitude': 73.0622,
            'updated_at': '2026-09-26T21:30:00Z',
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = HttpRiderLocationRepository(client: apiClient);

      expect(await repo.getRiderLocation('ord-bad'), isNull);
    });

    test('HttpRiderLocationRepository gracefully returns null on 404 (order not found)', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, equals('/orders/ord-missing/rider-location'));
        return http.Response(
          jsonEncode({'detail': 'Order not found.'}),
          404,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = HttpRiderLocationRepository(client: apiClient);

      final location = await repo.getRiderLocation('ord-missing');
      expect(location, isNull);
    });

    test('HttpRiderLocationRepository gracefully returns null on network failure without throwing', () async {
      final mockClient = MockClient((request) async {
        throw http.ClientException('Connection reset by peer');
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = HttpRiderLocationRepository(client: apiClient);

      final location = await repo.getRiderLocation('ord-fail');
      expect(location, isNull);
    });
  });

  group('Phase M3 Rider Marker Updates', () {
    test('MapMarkers.rider creates marker matching live coordinates', () {
      const livePos = LatLng(33.7123, 73.0891);
      final marker = MapMarkers.rider(
        id: 'ord_live',
        position: livePos,
        riderName: 'Tariq Rider',
      );

      expect(marker.markerId.value, equals('rider_ord_live'));
      expect(marker.position.latitude, equals(33.7123));
      expect(marker.position.longitude, equals(73.0891));
      expect(marker.infoWindow.title, equals('Tariq Rider'));
    });
  });

  group('Phase M3 OrderTrackingScreen Integration & Lifecycle', () {
    final orderWithRider = OrderTracking(
      id: 'test-order-uuid-1234',
      status: OrderStatus.riderAssigned,
      paymentMethod: PaymentMethod.cod,
      restaurantName: 'Speedy Pizza',
      riderName: 'Hamza Khan',
      riderPhone: '+923001234567',
      deliveryDistanceKm: 3.5,
      foodSubtotal: 1200,
      deliveryFee: 120,
      totalAmount: 1320,
    );

    testWidgets('Screen polls rider location when rider is assigned and shows unavailable banner when null',
        (tester) async {
      final orderRepo = FakeOrderRepository(orderWithRider);
      final riderLocationRepo = FakeRiderLocationRepository();
      riderLocationRepo.nextResult = null; // Location not yet available

      await tester.pumpWidget(
        MaterialApp(
          home: OrderTrackingScreen(
            orderId: 'test-order-uuid-1234',
            orderRepository: orderRepo,
            riderLocationRepository: riderLocationRepo,
          ),
        ),
      );

      // Settle the initial load without waiting indefinitely on repeating animations
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Live Order Tracking'), findsOneWidget);
      expect(orderRepo.trackCallCount, equals(1));
      expect(riderLocationRepo.callCount, equals(1));

      // Unavailable banner should be visible
      expect(
        find.text('Rider location is currently unavailable.'),
        findsOneWidget,
      );
    });

    testWidgets('Screen receives live coordinates and hides unavailable banner',
        (tester) async {
      final orderRepo = FakeOrderRepository(orderWithRider);
      final riderLocationRepo = FakeRiderLocationRepository();
      riderLocationRepo.nextResult = const RiderLocation(
        riderId: 'r_hamza',
        latitude: 33.7050,
        longitude: 73.0650,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: OrderTrackingScreen(
            orderId: 'test-order-uuid-1234',
            orderRepository: orderRepo,
            riderLocationRepository: riderLocationRepo,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(riderLocationRepo.callCount, equals(1));
      // Unavailable banner should NOT be present when live location is obtained
      expect(
        find.text('Rider location is currently unavailable.'),
        findsNothing,
      );
    });

    testWidgets('Screen disposal cancels polling and does not throw or call setState',
        (tester) async {
      final orderRepo = FakeOrderRepository(orderWithRider);
      final riderLocationRepo = FakeRiderLocationRepository();
      final completer = Completer<RiderLocation?>();
      riderLocationRepo.completer = completer;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OrderTrackingScreen(
                        orderId: 'test-order-uuid-1234',
                        orderRepository: orderRepo,
                        riderLocationRepository: riderLocationRepo,
                      ),
                    ),
                  );
                },
                child: const Text('Open Tracking'),
              ),
            ),
          ),
        ),
      );

      // Tap to open tracking screen
      await tester.tap(find.text('Open Tracking'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Live Order Tracking'), findsOneWidget);
      expect(riderLocationRepo.callCount, equals(1));

      // Pop the screen while request is pending
      Navigator.of(tester.element(find.text('Live Order Tracking'))).pop();
      await tester.pumpAndSettle();

      expect(find.text('Open Tracking'), findsOneWidget);
      expect(find.text('Live Order Tracking'), findsNothing);

      // Now complete the pending request after screen is disposed
      completer.complete(const RiderLocation(
        riderId: 'r_delayed',
        latitude: 33.7000,
        longitude: 73.0600,
      ));

      // Advance time past the poll interval (8s)
      await tester.pump(const Duration(seconds: 10));

      // No new calls should happen because the timer was cancelled on dispose
      expect(riderLocationRepo.callCount, equals(1));
      // No uncaught exceptions occurred
      expect(tester.takeException(), isNull);
    });
  });
}
