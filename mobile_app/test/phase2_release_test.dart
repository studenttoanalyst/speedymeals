// Phase 2 release tests: account deletion (`DELETE /users/me`), the profile
// surface that exposes it, and the legal links required on every auth screen.
//
// Offline-safe: the widget tests run with no backend reachable, so the screens
// must still render their static chrome (links, delete option) without throwing.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:speedy_meals/core/constants/app_constants.dart';
import 'package:speedy_meals/core/network/api_client.dart';
import 'package:speedy_meals/core/network/api_exception.dart';
import 'package:speedy_meals/core/storage/token_storage.dart';
import 'package:speedy_meals/data/repositories/user_repository.dart';
import 'package:speedy_meals/screens/auth/otp_verification_screen.dart';
import 'package:speedy_meals/screens/profile/profile_screen.dart';
import 'package:speedy_meals/services/auth_service.dart';
import 'package:speedy_meals/services/cart_service.dart';

const _accessToken = 'test-access-token';

/// A session without touching the platform keystore (same pattern as the other
/// backend-integration tests). No refresh token, so a 401 is never retried.
class _StaticTokens extends TokenStorage {
  _StaticTokens(this._role);

  final UserRole _role;

  @override
  String? get accessToken => _accessToken;

  @override
  String? get refreshToken => null;

  @override
  UserRole? get role => _role;
}

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    CartService.instance.resetAfterCheckout();
  });

  group('Account deletion endpoint (DELETE /users/me)', () {
    test('issues DELETE /users/me with the customer bearer token', () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('', 204);
      });

      final repo = UserRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _StaticTokens(UserRole.customer),
        ),
      );

      await repo.deleteAccount();

      expect(captured, isNotNull);
      expect(captured!.method, equals('DELETE'));
      expect(captured!.url.path, equals('/users/me'));
      expect(
        captured!.headers['Authorization'],
        equals('Bearer $_accessToken'),
      );
    });

    test('surfaces the backend reason (409) when an order is still active',
        () async {
      const message =
          'You have an active or pending order. Please wait until it is '
          'delivered or cancelled, then delete your account.';
      final client = MockClient(
        (request) async => _json({'detail': message}, 409),
      );

      final repo = UserRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _StaticTokens(UserRole.customer),
        ),
      );

      await expectLater(
        repo.deleteAccount(),
        throwsA(
          isA<ApiException>()
              .having((e) => e.kind, 'kind', ApiErrorKind.conflict)
              .having((e) => e.message, 'message', message),
        ),
      );
    });

    test('AuthService.deleteAccount surfaces the refusal as an AuthException',
        () async {
      // No live backend: the singleton ApiClient cannot reach one, so the call
      // fails transport-wise and must be reported as a retryable AuthException
      // rather than escaping as an unhandled error.
      await expectLater(
        AuthService.instance.deleteAccount(),
        throwsA(isA<AuthException>()),
      );
    });
  });

  group('CartService.purgeLocal', () {
    test('clears the local cart view and the persisted restaurant scope',
        () async {
      final service = CartService.instance;
      expect(service.restaurantId, isNull);
      expect(service.isEmpty, isTrue);

      await service.purgeLocal();

      expect(service.restaurantId, isNull);
      expect(service.lines, isEmpty);
      expect(service.isEmpty, isTrue);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('sm.cart.restaurant_id'), isNull);
      expect(prefs.getString('sm.cart.restaurant_name'), isNull);
    });
  });

  group('Profile surface', () {
    testWidgets('exposes Terms, Privacy and Delete Account',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: ProfileScreen()),
      );
      await tester.pump();

      expect(find.text('Terms & Conditions'), findsOneWidget);
      expect(find.text('Privacy Policy'), findsOneWidget);
      expect(find.text('Delete Account'), findsOneWidget);
      expect(find.text(AppConstants.deleteAccountUrl), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    });
  });

  group('OTP verification legal consent', () {
    testWidgets('renders the Terms & Privacy consent notice',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: OtpVerificationScreen(role: UserRole.customer),
        ),
      );
      await tester.pump();

      expect(find.textContaining('Terms & Conditions'), findsOneWidget);
      expect(find.textContaining('Privacy Policy'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    });
  });
}
