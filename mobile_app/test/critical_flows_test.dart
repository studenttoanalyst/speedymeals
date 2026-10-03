// Regression tests for the audited critical flows, updated for the
// backend-integrated app.
//
// These are intentionally offline-safe: every screen now talks to the FastAPI
// backend, so with no server reachable they must fall back to their
// loading/empty/error states instead of throwing or fabricating data. That is
// exactly what these tests assert.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:speedy_meals/data/models/user_models.dart';
import 'package:speedy_meals/screens/cart/cart_screen.dart';
import 'package:speedy_meals/screens/checkout/checkout_screen.dart';
import 'package:speedy_meals/screens/dashboard/dashboard_screen.dart';
import 'package:speedy_meals/screens/notifications/notifications_screen.dart';
import 'package:speedy_meals/screens/profile/profile_screen.dart';
import 'package:speedy_meals/services/cart_service.dart';
import 'package:speedy_meals/services/notification_service.dart';
import 'package:speedy_meals/widgets/home_navigation.dart';

Widget _wrap(Widget child) => MaterialApp(home: child);

const _address = UserAddress(
  id: 'addr-1',
  latitude: 24.8607,
  longitude: 67.0011,
  fullAddress: 'Street 5, Block B, Clifton',
  isDefault: true,
);

void main() {
  setUp(() {
    // SharedPreferences has no platform implementation under `flutter test`;
    // without this mock its method channel never answers, which would hang any
    // code that awaits it (cart scope, notification read state).
    SharedPreferences.setMockInitialValues({});
    // Start every test from an empty local cart view.
    CartService.instance.resetAfterCheckout();
  });

  testWidgets('Cart screen shows its empty state when nothing is added',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const CartScreen()));
    await tester.pump();

    expect(find.text('Your cart is empty'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });

  testWidgets('Checkout screen renders without a layout assertion',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const CheckoutScreen(address: _address)));
    await tester.pump();

    // The title renders regardless of backend availability.
    expect(find.text('Checkout'), findsOneWidget);
    // The old layout threw a RenderFlex unbounded-height assertion here.
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });

  testWidgets('Dashboard renders and search filters without a backend',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const DashboardScreen()));
    await tester.pump();

    final searchField = find.byType(TextField);
    expect(searchField, findsOneWidget);

    // A query that matches a known category still shows the results header.
    await tester.enterText(searchField, 'Pizza');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.text('Results for "Pizza"'), findsOneWidget);

    // A miss renders the empty search state rather than a blank screen.
    await tester.enterText(searchField, 'sushi');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.textContaining('No results'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // Dispose the tree so the promo carousel timer is cancelled.
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });

  testWidgets('HomeNavigation exposes a Profile tab that opens ProfileScreen',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const HomeNavigation()));
    await tester.pump();

    // The shell uses an IndexedStack, so every tab is mounted at once.
    // Assert on the selected index rather than on widget presence.
    final stackFinder = find.byType(IndexedStack).first;
    expect(tester.widget<IndexedStack>(stackFinder).index, 0);

    // The inactive tab renders the outlined person icon, which is unique here.
    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(tester.widget<IndexedStack>(stackFinder).index, 3);
    expect(find.byType(ProfileScreen), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });

  testWidgets('Profile screen renders its sections without a session',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const ProfileScreen()));
    await tester.pump();

    expect(find.text('My Orders'), findsOneWidget);
    expect(find.text('Saved Addresses'), findsOneWidget);
    expect(find.text('Payment Methods'), findsOneWidget);
    expect(find.text('App Settings & Notifications'), findsOneWidget);
    expect(find.text('Powered by Discovertech'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });

  testWidgets('Notifications screen renders; feed is empty without a backend',
      (WidgetTester tester) async {
    // The notification feed is derived from real orders, so with no backend
    // reachable there is nothing to show — and crucially nothing fabricated.
    await tester.runAsync(() async {
      NotificationService.instance.clear();
      await NotificationService.instance.refresh();
    });
    expect(NotificationService.instance.items, isEmpty);

    await tester.pumpWidget(_wrap(const NotificationsScreen()));
    await tester.pump();

    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('No notifications yet'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
}
