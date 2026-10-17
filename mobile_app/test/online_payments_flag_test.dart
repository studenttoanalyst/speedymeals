// Tests for the backend-driven online-payments flag
// (`ONLINE_PAYMENTS_ENABLED` → `checkout-preview.online_payments_enabled`).
//
// The backend's digital payment is a stub that never charges anyone, so the
// flag defaults to false everywhere: the option must be hidden, COD shown,
// and parsing must fail safe if the key is ever missing.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:speedy_meals/data/models/order_models.dart';
import 'package:speedy_meals/data/models/user_models.dart';
import 'package:speedy_meals/screens/checkout/checkout_screen.dart';
import 'package:speedy_meals/services/cart_service.dart';

const _previewJson = {
  'food_subtotal': 1000.0,
  'delivery_distance_km': 3.0,
  'delivery_fee': 175.0,
  'platform_fee': 15.0,
  'total': 1190.0,
  'gst_rate': 0.0,
  'prices_include_gst': true,
  'gst_amount': 0.0,
};

const _address = UserAddress(
  id: 'addr-1',
  latitude: 24.8607,
  longitude: 67.0011,
  fullAddress: 'Street 5, Block B, Clifton',
  isDefault: true,
);

void main() {
  group('CheckoutPreview.onlinePaymentsEnabled', () {
    test('parses explicit true from the backend', () {
      final preview = CheckoutPreview.fromJson({
        ..._previewJson,
        'online_payments_enabled': true,
      });
      expect(preview.onlinePaymentsEnabled, isTrue);
    });

    test('parses explicit false from the backend', () {
      final preview = CheckoutPreview.fromJson({
        ..._previewJson,
        'online_payments_enabled': false,
      });
      expect(preview.onlinePaymentsEnabled, isFalse);
    });

    test('fails safe to false when the key is missing', () {
      // An older or failing backend must hide the option, never show it.
      final preview = CheckoutPreview.fromJson(Map.of(_previewJson));
      expect(preview.onlinePaymentsEnabled, isFalse);
    });
  });

  group('Checkout screen with online payments disabled', () {
    setUp(() {
      // SharedPreferences has no platform implementation under
      // `flutter test`; the cart scope awaits it without this mock.
      SharedPreferences.setMockInitialValues({});
      CartService.instance.resetAfterCheckout();
    });

    testWidgets('shows COD only and hides "Pay Online" without a backend',
        (WidgetTester tester) async {
      // With no backend reachable the preview never loads, so the flag reads
      // false — the fail-safe state must be Cash on Delivery alone.
      await tester.pumpWidget(
        MaterialApp(home: CheckoutScreen(address: _address)),
      );
      await tester.pump();

      expect(find.text('Checkout'), findsOneWidget);
      expect(find.text('Cash on Delivery'), findsOneWidget);
      expect(find.text('Pay Online'), findsNothing);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    });
  });
}