import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:speedy_meals/features/maps/maps.dart';

void main() {
  group('Phase M1 MapMarkers Tests', () {
    test('MapMarkers.restaurant creates correct marker structure', () {
      const pos = LatLng(33.6844, 73.0479);
      final marker = MapMarkers.restaurant(
        id: 'ord_123',
        position: pos,
        name: 'Speedy Burger',
        address: 'F-7 Markaz, Islamabad',
      );

      expect(marker.markerId.value, equals('restaurant_ord_123'));
      expect(marker.position.latitude, equals(33.6844));
      expect(marker.position.longitude, equals(73.0479));
      expect(marker.infoWindow.title, equals('Speedy Burger'));
      expect(marker.infoWindow.snippet, equals('F-7 Markaz, Islamabad'));
    });

    test('MapMarkers.customer creates correct marker structure', () {
      const pos = LatLng(33.7000, 73.0600);
      final marker = MapMarkers.customer(
        id: 'ord_123',
        position: pos,
        title: 'Delivery Destination',
        address: 'House 42, Street 10',
      );

      expect(marker.markerId.value, equals('customer_ord_123'));
      expect(marker.position.latitude, equals(33.7000));
      expect(marker.position.longitude, equals(73.0600));
      expect(marker.infoWindow.title, equals('Delivery Destination'));
      expect(marker.infoWindow.snippet, equals('House 42, Street 10'));
    });

    test('MapMarkers.rider creates correct marker structure', () {
      const pos = LatLng(33.6922, 73.0539);
      final marker = MapMarkers.rider(
        id: 'ord_123',
        position: pos,
        riderName: 'Ali Khan',
      );

      expect(marker.markerId.value, equals('rider_ord_123'));
      expect(marker.position.latitude, equals(33.6922));
      expect(marker.position.longitude, equals(73.0539));
      expect(marker.infoWindow.title, equals('Ali Khan'));
      expect(marker.infoWindow.snippet, equals('Speedy Rider'));
    });
  });

  group('Phase M1 MapView Component Tests', () {
    test('MapView default constants are defined', () {
      expect(MapView.defaultCoordinates.latitude, equals(33.6844));
      expect(MapView.defaultCoordinates.longitude, equals(73.0479));
      expect(MapView.defaultZoom, equals(14.5));
    });

    testWidgets('MapView renders with custom fallback or platform view gracefully', (tester) async {
      const testPos = LatLng(33.6844, 73.0479);
      final marker = MapMarkers.restaurant(
        id: 'test_1',
        position: testPos,
        name: 'Test Restaurant',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              height: 250,
              width: 350,
              child: MapView(
                initialPosition: testPos,
                markers: {marker},
                fitBoundsOnMarkers: true,
                fallbackBuilder: (context, error) {
                  return const Text('Fallback Map Preview');
                },
              ),
            ),
          ),
        ),
      );

      // Verify the MapView widget tree mounts cleanly without throwing
      expect(find.byType(MapView), findsOneWidget);
    });
  });
}
