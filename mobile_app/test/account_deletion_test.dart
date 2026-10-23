// Account-deletion tests (Google Play policy: in-app + web deletion).
//
// Covers the rider's deferred flow end to end from the client side:
//   DELETE  /users/me                         -> pending request + grace date
//   GET     /users/me/deletion-request        -> status, or null when none
//   POST    /users/me/deletion-request/cancel -> reactivated account
// plus the exact confirmation-dialog wording the product approved, the status
// card states (pending / under review / on hold with the reason / completed),
// and the 409 messages (active delivery, dues) being surfaced verbatim.
//
// The customer flow is intentionally unchanged (immediate deletion) and stays
// covered by test/phase2_release_test.dart.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:speedy_meals/core/constants/app_constants.dart';
import 'package:speedy_meals/core/network/api_client.dart';
import 'package:speedy_meals/core/network/api_exception.dart';
import 'package:speedy_meals/core/storage/token_storage.dart';
import 'package:speedy_meals/data/models/deletion_models.dart';
import 'package:speedy_meals/data/repositories/rider_repository.dart';
import 'package:speedy_meals/screens/rider/rider_account_screen.dart';

const _accessToken = 'rider-access-token';

/// Session without the platform keystore (same pattern as the other
/// backend-integration tests). No refresh token: a 401 is never retried.
class _StaticTokens extends TokenStorage {
  @override
  String? get accessToken => _accessToken;

  @override
  String? get refreshToken => null;

  @override
  UserRole? get role => UserRole.rider;
}

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

/// A request as the backend returns it from DeletionRequestResponseSchema.
Map<String, dynamic> _requestJson({
  String status = 'pending',
  String? holdReason,
  bool canCancel = true,
  int daysUntilReview = 7,
  // Relative to now: a fixed date here silently fails once it passes.
  String? graceEndsAt,
  String? requestedAt,
  String? reviewedAt,
}) =>
    {
      'id': 'req-1',
      'role': 'rider',
      'status': status,
      'requested_at': requestedAt ??
          DateTime.now().toUtc().subtract(const Duration(days: 1)).toIso8601String(),
      'grace_ends_at': graceEndsAt ??
          DateTime.now().toUtc().add(Duration(days: daysUntilReview)).toIso8601String(),
      'requested_via': 'app',
      'reviewed_at': reviewedAt,
      'admin_note': null,
      'hold_reason': holdReason,
      'kyc_action': null,
      'kyc_retain_until': null,
      'kyc_purged_at': null,
      'can_cancel': canCancel,
      'days_until_review': daysUntilReview,
    };

ApiClient _api(http.Client client) => ApiClient(
      httpClient: client,
      tokenStorage: _StaticTokens(),
    );

// ---------------------------------------------------------------- model rules


void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('DeletionRequest model', () {
    test('maps every backend status and never throws on an unknown one', () {
      expect(DeletionRequestStatus.fromWire('pending'),
          DeletionRequestStatus.pending);
      expect(DeletionRequestStatus.fromWire('ready_for_review'),
          DeletionRequestStatus.readyForReview);
      expect(DeletionRequestStatus.fromWire('on_hold'),
          DeletionRequestStatus.onHold);
      expect(DeletionRequestStatus.fromWire('completed'),
          DeletionRequestStatus.completed);
      expect(DeletionRequestStatus.fromWire('cancelled'),
          DeletionRequestStatus.cancelled);
      expect(DeletionRequestStatus.fromWire('something_new'),
          DeletionRequestStatus.unknown);
      expect(DeletionRequestStatus.fromWire(null),
          DeletionRequestStatus.unknown);
    });

    test('labels and descriptions match the agreed product wording', () {
      expect(DeletionRequestStatus.readyForReview.label, 'Under review');
      expect(DeletionRequestStatus.pending.description, contains('7 days'));
      expect(DeletionRequestStatus.pending.description,
          contains('admin review'));
      expect(DeletionRequestStatus.completed.description,
          contains('anonymised'));
      expect(DeletionRequestStatus.onHold.description, contains('reason'));
    });

    test('cancellable only while pending or under review', () {
      expect(DeletionRequestStatus.pending.canBeCancelled, isTrue);
      expect(DeletionRequestStatus.readyForReview.canBeCancelled, isTrue);
      expect(DeletionRequestStatus.onHold.canBeCancelled, isFalse);
      expect(DeletionRequestStatus.completed.canBeCancelled, isFalse);
      expect(DeletionRequestStatus.cancelled.canBeCancelled, isFalse);
    });

    test('parses dates into local friendly labels', () {
      final request = DeletionRequest.fromJson(_requestJson());
      expect(request.status, DeletionRequestStatus.pending);
      expect(request.canCancel, isTrue);
      expect(request.daysUntilReview, 7);
      expect(request.graceEndsLabel, matches(r'^\d{1,2} \w{3} \d{4}$'));
      expect(request.requestedDateLabel, matches(r'^\d{1,2} \w{3} \d{4}$'));
      expect(request.reviewedLabel, isNull);
    });

    test('never exposes a document URL (KYC stays in the private bucket)', () {
      final json = _requestJson(status: 'completed', canCancel: false);
      final serialised = jsonEncode(json);
      expect(serialised.toLowerCase(), isNot(contains('photo_url')));
      expect(serialised, isNot(contains('rider-docs')));
    });
  });

  group('RiderRepository against the backend contract', () {
    test('requestAccountDeletion issues DELETE /users/me with the rider token',
        () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return _json(
          {'message': 'Your account has been deactivated.', 'request': _requestJson()},
          200,
        );
      });

      final action = await RiderRepository(client: _api(client))
          .requestAccountDeletion();

      expect(captured, isNotNull);
      expect(captured!.method, equals('DELETE'));
      expect(captured!.url.path, equals('/users/me'));
      expect(captured!.headers['Authorization'], equals('Bearer $_accessToken'));

      expect(action.request.status, DeletionRequestStatus.pending);
      expect(action.request.canCancel, isTrue);
      expect(action.request.graceEndsAt.isAfter(DateTime.now()), isTrue);
      expect(action.message, contains('deactivated'));
    });

    test('deletionRequest reads GET /users/me/deletion-request', () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return _json({'request': _requestJson(status: 'ready_for_review')}, 200);
      });

      final request = await RiderRepository(client: _api(client)).deletionRequest();

      expect(captured!.method, equals('GET'));
      expect(captured!.url.path, equals('/users/me/deletion-request'));
      expect(request, isNotNull);
      expect(request!.status, DeletionRequestStatus.readyForReview);
      expect(request.canCancel, isTrue);
    });

    test('deletionRequest maps a null request to null (not an error)', () async {
      final client = MockClient((request) async => _json({'request': null}, 200));
      expect(await RiderRepository(client: _api(client)).deletionRequest(), isNull);
    });

    test('cancelDeletionRequest posts to the cancel endpoint', () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return _json(
          {
            'message': 'Your deletion request has been cancelled.',
            'request': _requestJson(status: 'cancelled', canCancel: false),
          },
          200,
        );
      });

      final action = await RiderRepository(client: _api(client)).cancelDeletionRequest();

      expect(captured!.method, equals('POST'));
      expect(captured!.url.path, equals('/users/me/deletion-request/cancel'));
      expect(action.request.status, DeletionRequestStatus.cancelled);
      expect(action.request.canCancel, isFalse);
    });

    test('an active delivery surfaces the backend 409 verbatim', () async {
      const message =
          'You still have an active delivery. Complete it, then request '
          'account deletion again.';
      final client = MockClient((request) async => _json({'detail': message}, 409));

      await expectLater(
        RiderRepository(client: _api(client)).requestAccountDeletion(),
        throwsA(
          isA<ApiException>()
              .having((e) => e.kind, 'kind', ApiErrorKind.conflict)
              .having((e) => e.statusCode, 'statusCode', 409)
              .having((e) => e.message, 'message', message),
        ),
      );
    });

    test('unsettled dues surface as a conflict the UI can explain', () async {
      const message =
          'Deletion blocked: Rider has unsettled dues (wallet balance Rs 250.00, '
          'collected cash Rs 900.00). These must be settled to zero before deletion.';
      final client = MockClient((request) async => _json({'detail': message}, 409));

      await expectLater(
        RiderRepository(client: _api(client)).requestAccountDeletion(),
        throwsA(
          isA<ApiException>()
              .having((e) => e.kind, 'kind', ApiErrorKind.conflict)
              .having((e) => e.message, 'message', message),
        ),
      );
    });
  });

  // ------------------------------------------------------------- widget flows


  group('RiderAccountScreen', () {
    testWidgets('shows the approved confirmation dialog copy before requesting',
        (tester) async {
      final fake = _FakeRiderRepository();
      await tester.pumpWidget(
        MaterialApp(home: RiderAccountScreen(repository: fake)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Request Account Deletion'), findsOneWidget);

      await tester.tap(find.text('Request Account Deletion'));
      await tester.pumpAndSettle();

      expect(find.text('Request account deletion?'), findsOneWidget);
      expect(find.text(RiderAccountScreen.deletionDialogCopy), findsOneWidget);
      // The exact wording from the change request.
      expect(
        RiderAccountScreen.deletionDialogCopy,
        'Your account will be deactivated now. After 7 days your request goes '
        'to admin review. Deletion happens only after approval and only if you '
        'have no pending dues. You can cancel before then.',
      );
      expect(fake.requestCalls, 0);

      await tester.tap(find.text('Keep my account'));
      await tester.pumpAndSettle();
      expect(fake.requestCalls, 0);
    });

    testWidgets('requests deletion, then shows pending status and the date',
        (tester) async {
      final fake = _FakeRiderRepository();
      await tester.pumpWidget(
        MaterialApp(home: RiderAccountScreen(repository: fake)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Request Account Deletion'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Request deletion'));
      await tester.pumpAndSettle();

      expect(fake.requestCalls, 1);
      expect(find.text('Pending'), findsOneWidget);
      expect(find.textContaining('Review starts'), findsOneWidget);
      expect(find.text('Cancel deletion request'), findsOneWidget);
      expect(find.textContaining('speedymealservices.com/delete-account'),
          findsOneWidget);

      // Let the confirmation snackbar finish so no timer outlives the test.
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
    });

    testWidgets('shows on-hold status with the reason verbatim', (tester) async {
      final fake = _FakeRiderRepository(
        status: DeletionRequest(
          id: 'req-9',
          role: 'rider',
          status: DeletionRequestStatus.onHold,
          requestedAt: DateTime.now().toUtc(),
          graceEndsAt: DateTime.now().toUtc().subtract(const Duration(days: 3)),
          requestedVia: 'app',
          holdReason: 'Rider has unsettled dues (wallet balance Rs 250.00, '
              'collected cash Rs 0.00).',
          canCancel: false,
          daysUntilReview: 3,
        ),
      );
      await tester.pumpWidget(
        MaterialApp(home: RiderAccountScreen(repository: fake)),
      );
      await tester.pumpAndSettle();

      expect(find.text('On hold'), findsOneWidget);
      expect(find.textContaining('wallet balance Rs 250.00'), findsOneWidget);
      expect(find.text('Cancel deletion request'), findsNothing);
      expect(find.textContaining('Contact support'), findsOneWidget);
    });

    testWidgets('shows completed state without a cancel button', (tester) async {
      final fake = _FakeRiderRepository(
        status: DeletionRequest(
          id: 'req-4',
          role: 'rider',
          status: DeletionRequestStatus.completed,
          requestedAt: DateTime.now().toUtc(),
          graceEndsAt: DateTime.now().toUtc().subtract(const Duration(days: 7)),
          requestedVia: 'app',
          reviewedAt: DateTime.now().toUtc(),
          canCancel: false,
        ),
      );
      await tester.pumpWidget(
        MaterialApp(home: RiderAccountScreen(repository: fake)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Completed'), findsOneWidget);
      expect(
        find.text(
          'Your account and personal data have been deleted. Order and payment '
          'records are kept in anonymised form.',
        ),
        findsOneWidget,
      );
      expect(find.text('Cancel deletion request'), findsNothing);
      expect(find.text('Request Account Deletion'), findsNothing);
    });

    testWidgets('cancels a pending request and reactivates the account',
        (tester) async {
      final fake = _FakeRiderRepository();
      await tester.pumpWidget(
        MaterialApp(home: RiderAccountScreen(repository: fake)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Request Account Deletion'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Request deletion'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancel deletion request'));
      await tester.pumpAndSettle();
      expect(find.text('Cancel deletion request?'), findsOneWidget);

      await tester.tap(find.text('Cancel request'));
      await tester.pumpAndSettle();

      expect(fake.cancelCalls, 1);
      expect(find.text('Cancelled'), findsOneWidget);
      expect(find.text('Request Account Deletion'), findsOneWidget);

      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
    });

    testWidgets('shows the backend 409 (active delivery) verbatim',
        (tester) async {
      final fake = _FakeRiderRepository(
        requestError: const ApiException(
          kind: ApiErrorKind.conflict,
          statusCode: 409,
          message:
              'You still have an active delivery. Complete it, then request '
              'account deletion again.',
        ),
      );
      await tester.pumpWidget(
        MaterialApp(home: RiderAccountScreen(repository: fake)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Request Account Deletion'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Request deletion'));
      await tester.pumpAndSettle();

      expect(
        find.text(
          'You still have an active delivery. Complete it, then request '
          'account deletion again.',
        ),
        findsOneWidget,
      );
      // The refusal must leave the screen in its "no request" state.
      expect(find.text('Request Account Deletion'), findsOneWidget);

      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
    });
  });

  group('AppConstants keeps the hosted deletion link', () {
    test('points at the published deletion page', () {
      expect(AppConstants.deleteAccountUrl,
          'https://speedymealservices.com/delete-account');
    });
  });
}

/// Repository double: no backend, deterministic responses, call counters.
class _FakeRiderRepository extends RiderRepository {
  _FakeRiderRepository({
    this.status,
    this.requestError,
  }) : super(
          client: ApiClient(
            httpClient: http.Client(),
            tokenStorage: _StaticTokens(),
          ),
        );

  /// What `GET /users/me/deletion-request` reports (null = no request yet).
  DeletionRequest? status;

  final ApiException? requestError;

  int requestCalls = 0;
  int cancelCalls = 0;

  DeletionRequest get _pending => DeletionRequest.fromJson(_requestJson());

  DeletionRequest get _cancelled => DeletionRequest.fromJson(
        _requestJson(status: 'cancelled', canCancel: false, daysUntilReview: 0),
      );

  @override
  Future<DeletionRequestAction> requestAccountDeletion() async {
    requestCalls++;
    final error = requestError;
    if (error != null) throw error;
    final pending = _pending;
    status = pending;
    return DeletionRequestAction(
      message:
          'Your account has been deactivated. After 7 days your request goes '
          'to admin review. Deletion happens only after approval and only if '
          'you have no pending dues. You can cancel before then.',
      request: pending,
    );
  }

  @override
  Future<DeletionRequest?> deletionRequest() async => status;

  @override
  Future<DeletionRequestAction> cancelDeletionRequest() async {
    cancelCalls++;
    status = _cancelled;
    return DeletionRequestAction(
      message:
          'Your deletion request has been cancelled and your account is active again.',
      request: _cancelled,
    );
  }
}
