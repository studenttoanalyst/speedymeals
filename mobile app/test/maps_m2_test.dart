import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:speedy_meals/features/address/address.dart';

void main() {
  group('Phase M2 SelectedLocation Model Tests', () {
    test('SelectedLocation full constructor initializes correctly', () {
      const location = SelectedLocation(
        latitude: 33.6844,
        longitude: 73.0479,
        address: 'F-7 Markaz, Islamabad',
        placeId: 'ChIJ1234567890',
      );

      expect(location.latitude, equals(33.6844));
      expect(location.longitude, equals(73.0479));
      expect(location.address, equals('F-7 Markaz, Islamabad'));
      expect(location.placeId, equals('ChIJ1234567890'));
      expect(location.isFromAutocomplete, isTrue);
      expect(location.displayAddress, equals('F-7 Markaz, Islamabad'));
    });

    test('SelectedLocation minimal constructor initializes correctly without address', () {
      const location = SelectedLocation(
        latitude: 33.6844,
        longitude: 73.0479,
      );

      expect(location.latitude, equals(33.6844));
      expect(location.longitude, equals(73.0479));
      expect(location.address, isNull);
      expect(location.placeId, isNull);
      expect(location.isFromAutocomplete, isFalse);
      expect(location.displayAddress, equals('33.684400, 73.047900'));
    });

    test('SelectedLocation copyWith updates fields correctly', () {
      const location = SelectedLocation(
        latitude: 33.6844,
        longitude: 73.0479,
        address: 'Initial Address',
        placeId: 'PID1',
      );

      final updated = location.copyWith(
        latitude: 34.0000,
        address: 'New Address',
      );

      expect(updated.latitude, equals(34.0000));
      expect(updated.longitude, equals(73.0479));
      expect(updated.address, equals('New Address'));
      expect(updated.placeId, equals('PID1'));

      final cleared = location.copyWith(
        clearAddress: true,
        clearPlaceId: true,
      );
      expect(cleared.address, isNull);
      expect(cleared.placeId, isNull);
    });

    test('SelectedLocation equality and hashCode match', () {
      const loc1 = SelectedLocation(
        latitude: 33.6844,
        longitude: 73.0479,
        address: 'Address A',
        placeId: 'PID_A',
      );
      const loc2 = SelectedLocation(
        latitude: 33.6844,
        longitude: 73.0479,
        address: 'Address A',
        placeId: 'PID_A',
      );
      const loc3 = SelectedLocation(
        latitude: 33.6844,
        longitude: 73.0479,
      );

      expect(loc1, equals(loc2));
      expect(loc1.hashCode, equals(loc2.hashCode));
      expect(loc1, isNot(equals(loc3)));
    });
  });

  group('Phase M2 Address Widgets Widget Tests', () {
    testWidgets('AddressSearchField displays placeholder when key is empty', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AddressSearchField(
              onLocationSelected: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('Map services are not configured yet.'), findsOneWidget);
    });

    testWidgets('LocationPickerScreen mounts without throwing', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: LocationPickerScreen(),
        ),
      );

      expect(find.text('Pick a Location'), findsOneWidget);
      expect(find.text('Confirm Location'), findsOneWidget);
      expect(find.text('Use current location'), findsOneWidget);
      expect(
        find.text('Search for an address or tap the map to select a location.'),
        findsOneWidget,
      );
    });
  });
}
