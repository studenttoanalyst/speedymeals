import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:speedy_meals/core/constants/app_constants.dart';
import 'package:speedy_meals/data/models/rider_models.dart';
import 'package:speedy_meals/features/maps/maps.dart';
import 'package:url_launcher/url_launcher.dart';

class MockUrlLauncher {
  final List<Uri> canLaunchChecks = [];
  final List<Uri> launchedUris = [];
  bool canLaunchPrimary = true;
  bool canLaunchUniversal = true;
  bool launchResult = true;
  bool shouldThrowOnLaunch = false;

  Future<bool> canLaunchUrl(Uri uri) async {
    canLaunchChecks.add(uri);
    if (uri.scheme == 'google.navigation' || uri.scheme == 'comgooglemaps') {
      return canLaunchPrimary;
    }
    return canLaunchUniversal;
  }

  Future<bool> launchUrl(Uri uri, {LaunchMode mode = LaunchMode.platformDefault}) async {
    launchedUris.add(uri);
    if (shouldThrowOnLaunch) {
      throw Exception('Platform failure launching URL');
    }
    return launchResult;
  }
}

RiderAssignment createTestAssignment({
  String id = 'ord_123',
  OrderStatus status = OrderStatus.acceptedByRider,
  PaymentMethod paymentMethod = PaymentMethod.cod,
  String restaurantName = 'Speedy Burger',
  double? restaurantLatitude = 33.6844,
  double? restaurantLongitude = 73.0479,
  AssignmentAddress? deliveryAddress = const AssignmentAddress(
    label: 'Customer Residence',
    fullAddress: 'Street 4, Sector F-7, Islamabad',
    latitude: 33.7294,
    longitude: 73.0372,
  ),
  double deliveryDistanceKm = 3.5,
  double totalAmount = 1500,
  double riderEarning = 200,
}) {
  return RiderAssignment(
    id: id,
    status: status,
    paymentMethod: paymentMethod,
    restaurantName: restaurantName,
    restaurantLatitude: restaurantLatitude,
    restaurantLongitude: restaurantLongitude,
    deliveryAddress: deliveryAddress,
    deliveryDistanceKm: deliveryDistanceKm,
    totalAmount: totalAmount,
    riderEarning: riderEarning,
  );
}

void main() {
  group('Phase M4 RiderNavigationService Coordinate & URI Validation', () {
    test('1. Valid restaurant destination coordinates resolved properly', () {
      final assignment = createTestAssignment(
        restaurantLatitude: 33.6844,
        restaurantLongitude: 73.0479,
      );

      final coords = RiderNavigationService.getDestinationCoordinates(
        assignment,
        NavigationDestinationType.restaurant,
      );

      expect(coords, isNotNull);
      expect(coords!.latitude, equals(33.6844));
      expect(coords.longitude, equals(73.0479));
    });

    test('2. Valid customer destination coordinates resolved properly', () {
      final assignment = createTestAssignment(
        deliveryAddress: const AssignmentAddress(
          latitude: 33.7294,
          longitude: 73.0372,
        ),
      );

      final coords = RiderNavigationService.getDestinationCoordinates(
        assignment,
        NavigationDestinationType.customer,
      );

      expect(coords, isNotNull);
      expect(coords!.latitude, equals(33.7294));
      expect(coords.longitude, equals(73.0372));
    });

    test('3. Missing destination coordinates returns null', () {
      final missingRestaurant = createTestAssignment(
        restaurantLatitude: null,
        restaurantLongitude: null,
      );
      expect(
        RiderNavigationService.getDestinationCoordinates(
          missingRestaurant,
          NavigationDestinationType.restaurant,
        ),
        isNull,
      );

      final missingCustomer = createTestAssignment(
        deliveryAddress: null,
      );
      expect(
        RiderNavigationService.getDestinationCoordinates(
          missingCustomer,
          NavigationDestinationType.customer,
        ),
        isNull,
      );
    });

    test('4. Invalid latitude is rejected by coordinate validation', () {
      expect(RiderNavigationService.isValidCoordinate(null, 73.0479), isFalse);
      expect(RiderNavigationService.isValidCoordinate(90.001, 73.0479), isFalse);
      expect(RiderNavigationService.isValidCoordinate(-90.001, 73.0479), isFalse);
      expect(RiderNavigationService.isValidCoordinate(double.nan, 73.0479), isFalse);
      expect(RiderNavigationService.isValidCoordinate(double.infinity, 73.0479), isFalse);
    });

    test('5. Invalid longitude is rejected by coordinate validation', () {
      expect(RiderNavigationService.isValidCoordinate(33.6844, null), isFalse);
      expect(RiderNavigationService.isValidCoordinate(33.6844, 180.001), isFalse);
      expect(RiderNavigationService.isValidCoordinate(33.6844, -180.001), isFalse);
      expect(RiderNavigationService.isValidCoordinate(33.6844, double.nan), isFalse);
      expect(RiderNavigationService.isValidCoordinate(33.6844, double.negativeInfinity), isFalse);
    });

    test('6. Navigation URI generation matches expected schemes across platforms', () {
      const lat = 33.6844;
      const lng = 73.0479;

      final androidUri = RiderNavigationService.buildAndroidNavigationUri(lat, lng);
      expect(androidUri.scheme, equals('google.navigation'));
      expect(androidUri.toString(), contains('q=33.6844,73.0479'));
      expect(androidUri.toString(), contains('mode=d'));

      final iosUri = RiderNavigationService.buildIosNavigationUri(lat, lng);
      expect(iosUri.scheme, equals('comgooglemaps'));
      expect(iosUri.toString(), contains('daddr=33.6844,73.0479'));
      expect(iosUri.toString(), contains('directionsmode=driving'));

      final universalUri = RiderNavigationService.buildUniversalNavigationUri(lat, lng);
      expect(universalUri.scheme, equals('https'));
      expect(universalUri.host, equals('www.google.com'));
      expect(universalUri.path, equals('/maps/dir/'));
      expect(universalUri.queryParameters['api'], equals('1'));
      expect(universalUri.queryParameters['destination'], equals('33.6844,73.0479'));
      expect(universalUri.queryParameters['travelmode'], equals('driving'));
    });

    test('Lifecycle destination resolution: Before pickup is Restaurant, After pickup is Customer', () {
      expect(
        RiderNavigationService.defaultDestinationForStatus(OrderStatus.acceptedByRider),
        equals(NavigationDestinationType.restaurant),
      );
      expect(
        RiderNavigationService.defaultDestinationForStatus(OrderStatus.arrivedAtRestaurant),
        equals(NavigationDestinationType.restaurant),
      );
      expect(
        RiderNavigationService.defaultDestinationForStatus(OrderStatus.pickedUp),
        equals(NavigationDestinationType.customer),
      );
      expect(
        RiderNavigationService.defaultDestinationForStatus(OrderStatus.onTheWay),
        equals(NavigationDestinationType.customer),
      );
    });

    test('10. Completed or cancelled orders are not eligible for navigation', () {
      final deliveredOrder = createTestAssignment(status: OrderStatus.delivered);
      final cancelledOrder = createTestAssignment(status: OrderStatus.cancelled);
      final unacceptedOrder = createTestAssignment(status: OrderStatus.riderAssigned);
      final inProgressOrder = createTestAssignment(status: OrderStatus.acceptedByRider);

      expect(RiderNavigationService.isNavigationEligible(deliveredOrder), isFalse);
      expect(RiderNavigationService.isNavigationEligible(cancelledOrder), isFalse);
      expect(RiderNavigationService.isNavigationEligible(unacceptedOrder), isFalse);
      expect(RiderNavigationService.isNavigationEligible(inProgressOrder), isTrue);
    });
  });

  group('Phase M4 RiderNavigationService Launch & Error Handling', () {
    test('Launches primary native navigation when supported', () async {
      final mock = MockUrlLauncher();
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final result = await service.launchNavigation(latitude: 33.6844, longitude: 73.0479);

      expect(result.success, isTrue);
      expect(mock.canLaunchChecks, isNotEmpty);
      expect(mock.launchedUris, hasLength(1));
    });

    test('Falls back to universal URI if primary native navigation fails', () async {
      final mock = MockUrlLauncher()..canLaunchPrimary = false;
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final result = await service.launchNavigation(latitude: 33.6844, longitude: 73.0479);

      expect(result.success, isTrue);
      expect(result.launchedUri?.scheme, equals('https'));
      expect(result.launchedUri?.host, equals('www.google.com'));
    });

    test('9. Navigation unavailable error returned gracefully when both fail', () async {
      final mock = MockUrlLauncher()
        ..canLaunchPrimary = false
        ..canLaunchUniversal = false;
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final result = await service.launchNavigation(latitude: 33.6844, longitude: 73.0479);

      expect(result.success, isFalse);
      expect(result.errorMessage, contains('Could not launch Google Maps'));
    });

    test('Catches exception without crashing when launcher throws', () async {
      final mock = MockUrlLauncher()..shouldThrowOnLaunch = true;
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final result = await service.launchNavigation(latitude: 33.6844, longitude: 73.0479);

      expect(result.success, isFalse);
      expect(result.errorMessage, isNotNull);
    });
  });

  group('Phase M4 RiderNavigationSection Widget Tests', () {
    testWidgets('7. Restaurant navigation action rendered before pickup and launches restaurant coords', (tester) async {
      final mock = MockUrlLauncher();
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final assignment = createTestAssignment(
        status: OrderStatus.acceptedByRider,
        restaurantLatitude: 33.6844,
        restaurantLongitude: 73.0479,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RiderNavigationSection(
              assignment: assignment,
              navigationService: service,
            ),
          ),
        ),
      );

      expect(find.text('Navigate to Restaurant'), findsOneWidget);
      expect(find.byKey(const Key('navigate_to_restaurant_button')), findsOneWidget);

      await tester.tap(find.byKey(const Key('navigate_to_restaurant_button')));
      await tester.pumpAndSettle();

      expect(mock.launchedUris, isNotEmpty);
      expect(mock.launchedUris.first.toString(), contains('33.6844'));
      expect(mock.launchedUris.first.toString(), contains('73.0479'));
    });

    testWidgets('8. Customer navigation action rendered after pickup and launches customer coords', (tester) async {
      final mock = MockUrlLauncher();
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final assignment = createTestAssignment(
        status: OrderStatus.pickedUp,
        deliveryAddress: const AssignmentAddress(
          latitude: 33.7294,
          longitude: 73.0372,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RiderNavigationSection(
              assignment: assignment,
              navigationService: service,
            ),
          ),
        ),
      );

      expect(find.text('Navigate to Customer'), findsOneWidget);
      expect(find.byKey(const Key('navigate_to_customer_button')), findsOneWidget);

      await tester.tap(find.byKey(const Key('navigate_to_customer_button')));
      await tester.pumpAndSettle();

      expect(mock.launchedUris, isNotEmpty);
      expect(mock.launchedUris.first.toString(), contains('33.7294'));
      expect(mock.launchedUris.first.toString(), contains('73.0372'));
    });

    testWidgets('Destination selector toggles between Restaurant and Customer', (tester) async {
      final mock = MockUrlLauncher();
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final assignment = createTestAssignment(
        status: OrderStatus.acceptedByRider,
        restaurantLatitude: 33.6844,
        restaurantLongitude: 73.0479,
        deliveryAddress: const AssignmentAddress(
          latitude: 33.7294,
          longitude: 73.0372,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RiderNavigationSection(
              assignment: assignment,
              navigationService: service,
            ),
          ),
        ),
      );

      // Initially restaurant
      expect(find.text('Navigate to Restaurant'), findsOneWidget);

      // Tap Customer tab
      await tester.tap(find.text('Customer'));
      await tester.pumpAndSettle();

      // Now customer
      expect(find.text('Navigate to Customer'), findsOneWidget);

      // Tap Navigate to Customer
      await tester.tap(find.byKey(const Key('navigate_to_customer_button')));
      await tester.pumpAndSettle();

      expect(mock.launchedUris.last.toString(), contains('33.7294'));
    });

    testWidgets('Missing destination coordinates shows user-friendly unavailable message', (tester) async {
      final assignment = createTestAssignment(
        status: OrderStatus.acceptedByRider,
        restaurantLatitude: null,
        restaurantLongitude: null,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RiderNavigationSection(
              assignment: assignment,
            ),
          ),
        ),
      );

      expect(find.text('Destination location is unavailable.'), findsOneWidget);
      expect(find.byKey(const Key('navigation_unavailable_message')), findsOneWidget);
      expect(find.byKey(const Key('navigate_to_restaurant_button')), findsNothing);
    });

    testWidgets('Completed or terminal order renders nothing (no navigation buttons)', (tester) async {
      final assignment = createTestAssignment(
        status: OrderStatus.delivered,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RiderNavigationSection(
              assignment: assignment,
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('navigate_to_restaurant_button')), findsNothing);
      expect(find.byKey(const Key('navigate_to_customer_button')), findsNothing);
      expect(find.byKey(const Key('navigation_unavailable_message')), findsNothing);
    });

    testWidgets('Navigation failure displays user-friendly SnackBar and triggers onError', (tester) async {
      String? errorMessage;
      final mock = MockUrlLauncher()
        ..canLaunchPrimary = false
        ..canLaunchUniversal = false;
      final service = RiderNavigationService(
        canLaunchUrlFn: mock.canLaunchUrl,
        launchUrlFn: mock.launchUrl,
      );

      final assignment = createTestAssignment(
        status: OrderStatus.acceptedByRider,
        restaurantLatitude: 33.6844,
        restaurantLongitude: 73.0479,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RiderNavigationSection(
              assignment: assignment,
              navigationService: service,
              onError: (msg) => errorMessage = msg,
            ),
          ),
        ),
      );

      await tester.tap(find.byKey(const Key('navigate_to_restaurant_button')));
      await tester.pumpAndSettle();

      expect(errorMessage, isNotNull);
      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.textContaining('Could not launch Google Maps'), findsOneWidget);
    });
  });
}
