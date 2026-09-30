import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:speedy_meals/core/constants/app_constants.dart';
import 'package:speedy_meals/core/network/api_client.dart';
import 'package:speedy_meals/core/network/api_exception.dart';
import 'package:speedy_meals/core/storage/token_storage.dart';
import 'package:speedy_meals/data/models/order_models.dart';
import 'package:speedy_meals/data/models/rider_location.dart';
import 'package:speedy_meals/data/repositories/location_repository.dart';
import 'package:speedy_meals/data/repositories/order_repository.dart';
import 'package:speedy_meals/data/repositories/rider_location_repository.dart';
import 'package:speedy_meals/data/repositories/rider_repository.dart';
import 'package:speedy_meals/screens/tracking/order_tracking_screen.dart';
import 'package:speedy_meals/services/live_location_socket.dart';
import 'package:speedy_meals/services/location_socket_transport.dart';
import 'package:speedy_meals/services/rider_location_publisher.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const _accessToken = 'test-access-token';

/// A session without touching the platform keystore.
///
/// The real [TokenStorage] talks to `flutter_secure_storage`, whose plugin is
/// absent in the test VM. Overriding the getters keeps these tests synchronous
/// and, deliberately, exposes **no** refresh token — so a 401 is never retried
/// through a refresh the backend would not have issued anyway.
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

TokenStorage _tokens(UserRole role) => _StaticTokens(role);

Position _position({required double latitude, required double longitude}) {
  return Position(
    latitude: latitude,
    longitude: longitude,
    timestamp: DateTime.now(),
    accuracy: 5.0,
    altitude: 10.0,
    altitudeAccuracy: 1.0,
    heading: 0.0,
    headingAccuracy: 1.0,
    speed: 15.0,
    speedAccuracy: 1.0,
  );
}

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

Future<void> _flush() => Future<void>.delayed(const Duration(milliseconds: 10));

/// Fake WebSocket transport driven directly from tests.
class FakeSocketTransport implements LocationSocketTransport {
  final StreamController<String> _controller =
      StreamController<String>.broadcast();
  bool _closed = false;

  @override
  Stream<String> get messages => _controller.stream;

  @override
  bool get isClosed => _closed;

  @override
  Future<void> close([int? code, String? reason]) async {
    _closed = true;
    if (!_controller.isClosed) await _controller.close();
  }

  void emit(Map<String, dynamic> frame) => emitRaw(jsonEncode(frame));

  void emitRaw(String raw) {
    if (!_controller.isClosed) _controller.add(raw);
  }

  void drop() {
    _closed = true;
    if (!_controller.isClosed) unawaited(_controller.close());
  }
}

/// Records every connect attempt and hands back a controllable transport.
class FakeConnector {
  final List<Uri> urls = [];
  final List<FakeSocketTransport> transports = [];
  bool failConnect = false;

  Future<LocationSocketTransport> connect(
    Uri url, {
    Duration timeout = const Duration(seconds: 10),
  }) async {
    urls.add(url);
    if (failConnect) {
      throw http.ClientException('connection refused');
    }
    final transport = FakeSocketTransport();
    transports.add(transport);
    return transport;
  }
}

LiveLocationSocket _buildSocket(
  FakeConnector connector, {
  required TokenStorage tokens,
  Duration reconnectDelay = const Duration(milliseconds: 20),
  int maxReconnectAttempts = 3,
}) {
  return LiveLocationSocket(
    connector: connector.connect,
    tokenStorage: tokens,
    uriBuilder: ({required orderId, required token}) =>
        Uri.parse('ws://localhost:8000/orders/$orderId/track?token=$token'),
    reconnectDelay: reconnectDelay,
    maxReconnectAttempts: maxReconnectAttempts,
    connectTimeout: const Duration(seconds: 2),
  );
}

class _FakeOrderRepository extends OrderRepository {
  _FakeOrderRepository(this.result);

  final OrderTracking result;

  @override
  Future<OrderTracking> track(String orderId) async => result;
}

class _CountingRiderLocationRepository implements RiderLocationRepository {
  _CountingRiderLocationRepository(this.next);

  RiderLocation? next;
  int callCount = 0;
  bool throwNetwork = false;

  @override
  Future<RiderLocation?> getRiderLocation(String orderId) async {
    callCount++;
    if (throwNetwork) throw Exception('Simulated network failure');
    return next;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // ───────────────────────────────────────────────────────────────────────────
  // A. Rider GPS upload — PATCH /wallet/location
  // ───────────────────────────────────────────────────────────────────────────

  group('A. Rider GPS upload (PATCH /wallet/location)', () {
    test('A1. uploads real GPS to the documented endpoint with the rider token',
        () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return _json({
          'rider_id': '5f0c1f6e-0000-0000-0000-000000000000',
          'lat': 33.6844,
          'lng': 73.0479,
          'updated_at': '2026-09-28T10:00:00Z',
        }, 200);
      });

      final api = ApiClient(
        httpClient: client,
        tokenStorage: _tokens(UserRole.rider),
      );
      await RiderRepository(client: api)
          .updateLocation(latitude: 33.6844, longitude: 73.0479);

      expect(captured, isNotNull);
      expect(captured!.method, equals('PATCH'));
      expect(captured!.url.path, equals('/wallet/location'));
      expect(
        jsonDecode(captured!.body),
        equals({'latitude': 33.6844, 'longitude': 73.0479}),
      );
      expect(captured!.headers['Authorization'], equals('Bearer $_accessToken'));
      // The rider id comes from the token server-side, never from the client.
      expect((jsonDecode(captured!.body) as Map).containsKey('rider_id'), isFalse);
    });

    test('A2. publisher never sends out-of-range or non-finite coordinates',
        () async {
      var requestCount = 0;
      final client = MockClient((request) async {
        requestCount++;
        return _json({'ok': true}, 200);
      });

      final publisher = RiderLocationPublisher(
        repository: RiderRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.rider),
          ),
        ),
        minUploadInterval: Duration.zero,
      );

      publisher.handlePosition(_position(latitude: 91.0, longitude: 73.0));
      publisher.handlePosition(_position(latitude: 33.0, longitude: -181.0));
      publisher.handlePosition(_position(latitude: double.nan, longitude: 73.0));
      publisher.handlePosition(
          _position(latitude: 33.0, longitude: double.infinity));
      await _flush();

      expect(requestCount, equals(0));
      expect(publisher.uploadAttemptCount, equals(0));
    });

    test('A3. publisher uploads a valid position through the real repository',
        () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return _json({'lat': 33.5, 'lng': 73.5, 'updated_at': 'x'}, 200);
      });

      final publisher = RiderLocationPublisher(
        repository: RiderRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.rider),
          ),
        ),
        minUploadInterval: Duration.zero,
      );

      publisher.handlePosition(_position(latitude: 33.5, longitude: 73.5));
      await _flush();

      expect(captured!.method, equals('PATCH'));
      expect(captured!.url.path, equals('/wallet/location'));
      expect(
        jsonDecode(captured!.body),
        equals({'latitude': 33.5, 'longitude': 73.5}),
      );
      expect(publisher.successfulUploadCount, equals(1));
      expect(publisher.lastLatitude, equals(33.5));
      expect(publisher.lastLongitude, equals(73.5));
    });

    test('A4. status codes map to the shared ApiException kinds', () async {
      Future<ApiException> uploadWith(int status) async {
        final client = MockClient(
          (request) async => _json({'detail': 'failure'}, status),
        );
        final repo = RiderRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.rider),
          ),
        );
        try {
          await repo.updateLocation(latitude: 33.0, longitude: 73.0);
          fail('expected an ApiException for $status');
        } on ApiException catch (error) {
          return error;
        }
      }

      expect((await uploadWith(401)).kind, equals(ApiErrorKind.unauthorized));
      expect((await uploadWith(403)).kind, equals(ApiErrorKind.forbidden));
      expect((await uploadWith(422)).kind, equals(ApiErrorKind.validation));
      expect((await uploadWith(429)).kind, equals(ApiErrorKind.rateLimited));
      expect((await uploadWith(500)).kind, equals(ApiErrorKind.server));
      expect((await uploadWith(503)).kind, equals(ApiErrorKind.unavailable));
      expect((await uploadWith(404)).kind, equals(ApiErrorKind.notFound));
    });

    test('A5. timeout and connection failures are classified, not thrown raw',
        () async {
      Future<ApiException> uploadWithHandler(MockClient client) async {
        final repo = RiderRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.rider),
          ),
        );
        try {
          await repo.updateLocation(latitude: 33.0, longitude: 73.0);
          fail('expected an ApiException');
        } on ApiException catch (error) {
          return error;
        }
      }

      final timeout = await uploadWithHandler(MockClient((request) async {
        throw TimeoutException('upload timed out');
      }));
      expect(timeout.kind, equals(ApiErrorKind.timeout));

      final offline = await uploadWithHandler(MockClient((request) async {
        throw http.ClientException('Connection refused');
      }));
      expect(offline.kind, equals(ApiErrorKind.network));
    });

    test('A6. a failing upload never terminates tracking', () async {
      // 401 on every attempt — the same failure the backend returns for an
      // expired access token.
      final client = MockClient(
        (request) async => _json({'detail': 'Invalid or expired token.'}, 401),
      );
      final publisher = RiderLocationPublisher(
        repository: RiderRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.rider),
          ),
        ),
        minUploadInterval: Duration.zero,
      );

      publisher.handlePosition(_position(latitude: 33.0, longitude: 73.0));
      await _flush();
      expect(publisher.uploadAttemptCount, equals(1));
      expect(publisher.successfulUploadCount, equals(0));

      // Tracking keeps going: the next position is still attempted.
      publisher.handlePosition(_position(latitude: 33.1, longitude: 73.1));
      await _flush();
      expect(publisher.uploadAttemptCount, equals(2));
      expect(publisher.successfulUploadCount, equals(0));
    });

    test('A7. concurrent uploads are prevented (single-flight)', () async {
      final gate = Completer<void>();
      var requestCount = 0;
      final client = MockClient((request) async {
        requestCount++;
        await gate.future;
        return _json({'ok': true}, 200);
      });

      final publisher = RiderLocationPublisher(
        repository: RiderRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.rider),
          ),
        ),
        minUploadInterval: Duration.zero,
      );

      publisher.handlePosition(_position(latitude: 33.0, longitude: 73.0));
      expect(publisher.uploadInFlight, isTrue);
      publisher.handlePosition(_position(latitude: 33.2, longitude: 73.2));
      publisher.handlePosition(_position(latitude: 33.3, longitude: 73.3));

      gate.complete();
      await _flush();

      expect(requestCount, equals(1));
      expect(publisher.uploadAttemptCount, equals(1));
      expect(publisher.uploadInFlight, isFalse);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // B. Customer rider-location polling — GET /orders/{id}/rider-location
  // ───────────────────────────────────────────────────────────────────────────

  group('B. Customer rider location (GET /orders/{id}/rider-location)', () {
    test('B1. parses the live location on 200', () async {
      // Relative to now, so the fixture never drifts into "stale" as the
      // calendar advances.
      final updatedAt = DateTime.now().toUtc();
      final client = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, equals('/orders/ord-1/rider-location'));
        return _json({
          'order_id': 'ord-1',
          'latitude': 33.7011,
          'longitude': 73.0622,
          'updated_at': updatedAt.toIso8601String(),
        }, 200);
      });

      final location = await HttpRiderLocationRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _tokens(UserRole.customer),
        ),
      ).getRiderLocation('ord-1');

      expect(location, isNotNull);
      expect(location!.latitude, equals(33.7011));
      expect(location.longitude, equals(73.0622));
      expect(location.riderId, isNull);
      expect(location.isStale(threshold: const Duration(minutes: 2)), isFalse);
    });

    test('B2. a null-coordinate payload (no rider / TTL expired) is null', () async {
      final client = MockClient((request) async => _json({
            'order_id': 'ord-2',
            'latitude': null,
            'longitude': null,
            'updated_at': null,
          }, 200));

      final location = await HttpRiderLocationRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _tokens(UserRole.customer),
        ),
      ).getRiderLocation('ord-2');

      expect(location, isNull);
    });

    test('B3. a stale timestamp is detectable so the UI can avoid claiming live',
        () async {
      final client = MockClient((request) async => _json({
            'order_id': 'ord-3',
            'latitude': 33.7,
            'longitude': 73.0,
            'updated_at': DateTime.now()
                .toUtc()
                .subtract(const Duration(minutes: 5))
                .toIso8601String(),
          }, 200));

      final location = await HttpRiderLocationRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _tokens(UserRole.customer),
        ),
      ).getRiderLocation('ord-3');

      expect(location, isNotNull);
      expect(location!.isStale(threshold: const Duration(minutes: 2)), isTrue);
    });

    test('B4. malformed / out-of-range coordinates are ignored', () async {
      Future<RiderLocation?> fetch(Object body) async {
        final client = MockClient((request) async => _json(body, 200));
        return HttpRiderLocationRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.customer),
          ),
        ).getRiderLocation('ord-x');
      }

      expect(await fetch({'latitude': 'abc', 'longitude': 73.0}), isNull);
      expect(await fetch({'latitude': 999.0, 'longitude': 73.0}), isNull);
      expect(await fetch({'latitude': 33.0}), isNull);
      expect(await fetch({'detail': 'unexpected shape'}), isNull);
      expect(await fetch('not-json-object'), isNull);
    });

    test('B5. every documented failure status degrades to null', () async {
      for (final status in [401, 403, 404, 409, 422, 429, 500, 503]) {
        final client = MockClient(
          (request) async => _json({'detail': 'failure'}, status),
        );
        final location = await HttpRiderLocationRepository(
          client: ApiClient(
            httpClient: client,
            tokenStorage: _tokens(UserRole.customer),
          ),
        ).getRiderLocation('ord-$status');

        expect(location, isNull, reason: 'status $status must not throw');
      }
    });

    test('B6. timeout and network failures degrade to null', () async {
      final timeoutRepo = HttpRiderLocationRepository(
        client: ApiClient(
          httpClient: MockClient((request) async {
            throw TimeoutException('slow');
          }),
          tokenStorage: _tokens(UserRole.customer),
        ),
      );
      expect(await timeoutRepo.getRiderLocation('ord-t'), isNull);

      final offlineRepo = HttpRiderLocationRepository(
        client: ApiClient(
          httpClient: MockClient((request) async {
            throw http.ClientException('Connection refused');
          }),
          tokenStorage: _tokens(UserRole.customer),
        ),
      );
      expect(await offlineRepo.getRiderLocation('ord-o'), isNull);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C. WebSocket — WS /orders/{order_id}/track
  // ───────────────────────────────────────────────────────────────────────────

  group('C. Live tracking WebSocket (WS /orders/{id}/track)', () {
    test('C1. connects to the backend path with the JWT query parameter',
        () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));

      await socket.connect('ord-1');

      expect(connector.urls, hasLength(1));
      expect(connector.urls.single.path, equals('/orders/ord-1/track'));
      expect(
        connector.urls.single.queryParameters['token'],
        equals(_accessToken),
      );
      expect(socket.isConnected, isTrue);

      await socket.dispose();
    });

    test('C2. parses the initial and subsequent location_update frames',
        () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-2');
      final transport = connector.transports.single;

      transport.emit({
        'event': 'location_update',
        'data': {
          'order_id': 'ord-2',
          'latitude': 33.7011,
          'longitude': 73.0622,
          'updated_at': '2026-09-28T10:00:00Z',
        },
      });
      await _flush();

      transport.emit({
        'event': 'location_update',
        'data': {
          'order_id': 'ord-2',
          'latitude': 33.7100,
          'longitude': 73.0700,
          'updated_at': '2026-09-28T10:00:05Z',
        },
      });
      await _flush();

      final updates = events.whereType<LiveLocationUpdated>().toList();
      expect(updates, hasLength(2));
      expect(updates.first.location.latitude, equals(33.7011));
      expect(updates.last.location.latitude, equals(33.7100));
      // The endpoint does not send a rider id; the parser must not invent one.
      expect(updates.last.location.riderId, isNull);

      await socket.dispose();
    });

    test('C3. ignores malformed JSON, unknown events and bad coordinates',
        () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-3');
      final transport = connector.transports.single;

      transport.emitRaw('this is not json');
      transport.emit({'event': 'something_new', 'data': {'x': 1}});
      transport.emit({
        'event': 'location_update',
        'data': {'latitude': 999.0, 'longitude': 73.0},
      });
      transport.emit({'event': 'location_update', 'data': null});
      await _flush();

      expect(events.whereType<LiveLocationUpdated>(), isEmpty);
      expect(socket.isConnected, isTrue);

      await socket.dispose();
    });

    test('C4. order_completed ends tracking with no reconnect', () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-4');
      connector.transports.single.emit({
        'event': 'order_completed',
        'detail': 'Order reached terminal status. Live tracking ended.',
      });
      await _flush();

      expect(events.whereType<LiveLocationCompleted>(), hasLength(1));
      expect(socket.isCompleted, isTrue);
      expect(socket.isConnected, isFalse);

      // No reconnect is attempted after the terminal frame.
      await Future<void>.delayed(const Duration(milliseconds: 60));
      expect(connector.urls, hasLength(1));

      await socket.dispose();
    });

    test('C5. a dropped socket reports disconnection and reconnects', () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-5');
      connector.transports.single.drop();
      await _flush();

      final drops = events.whereType<LiveLocationDisconnected>().toList();
      expect(drops, hasLength(1));
      expect(drops.single.willReconnect, isTrue);

      await Future<void>.delayed(const Duration(milliseconds: 60));
      expect(connector.urls, hasLength(2)); // reconnected
      expect(socket.isConnected, isTrue);

      await socket.dispose();
    });

    test('C6. reconnect attempts are bounded, then give up', () async {
      final connector = FakeConnector();
      final socket = _buildSocket(
        connector,
        tokens: _tokens(UserRole.customer),
        maxReconnectAttempts: 1,
      );
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-6');
      connector.transports.single.drop();
      await _flush();
      expect(
        events.whereType<LiveLocationDisconnected>().single.willReconnect,
        isTrue,
      );

      await Future<void>.delayed(const Duration(milliseconds: 60));
      expect(connector.transports, hasLength(2));

      connector.transports.last.drop();
      await _flush();

      final drops = events.whereType<LiveLocationDisconnected>().toList();
      expect(drops, hasLength(2));
      expect(drops.last.willReconnect, isFalse);

      await socket.dispose();
    });

    test('C7. a failed connect degrades to a disconnection event', () async {
      final connector = FakeConnector()..failConnect = true;
      final socket = _buildSocket(
        connector,
        tokens: _tokens(UserRole.customer),
        maxReconnectAttempts: 0,
      );
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-7');
      await _flush();

      expect(socket.isConnected, isFalse);
      final drops = events.whereType<LiveLocationDisconnected>().toList();
      expect(drops, hasLength(1));
      expect(drops.single.willReconnect, isFalse);

      await socket.dispose();
    });

    test('C8. duplicate connect calls never open a second socket', () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));

      await socket.connect('ord-8');
      await socket.connect('ord-8');
      await socket.connect('ord-8');

      expect(connector.urls, hasLength(1));
      expect(socket.orderId, equals('ord-8'));

      await socket.dispose();
    });

    test('C9. switching orders closes the previous socket', () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: _tokens(UserRole.customer));

      await socket.connect('ord-a');
      final first = connector.transports.first;
      await socket.connect('ord-b');

      expect(first.isClosed, isTrue);
      expect(connector.urls, hasLength(2));
      expect(connector.urls.last.path, equals('/orders/ord-b/track'));

      await socket.dispose();
    });

    test('C10. no session means no socket attempt', () async {
      final connector = FakeConnector();
      final socket = _buildSocket(connector, tokens: TokenStorage());
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-10');
      await _flush();

      expect(connector.urls, isEmpty);
      expect(
        events.whereType<LiveLocationDisconnected>().single.willReconnect,
        isFalse,
      );

      await socket.dispose();
    });

    test('C11. real dart:io WebSocket round-trips the backend frame contract',
        () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final paths = <String>[];
      final tokensSeen = <String>[];

      server.listen((request) async {
        paths.add(request.uri.path);
        tokensSeen.add(request.uri.queryParameters['token'] ?? '');
        final ws = await WebSocketTransformer.upgrade(request);
        ws.add(jsonEncode({
          'event': 'location_update',
          'data': {
            'order_id': 'ord-io',
            'latitude': 24.8607,
            'longitude': 67.0011,
            'updated_at': '2026-09-28T10:00:00Z',
          },
        }));
        await Future<void>.delayed(const Duration(milliseconds: 30));
        ws.add(jsonEncode({
          'event': 'order_completed',
          'detail': 'Order reached terminal status. Live tracking ended.',
        }));
        await ws.close(1000, 'done');
      });

      final socket = LiveLocationSocket(
        tokenStorage: _tokens(UserRole.customer),
        uriBuilder: ({required orderId, required token}) => Uri.parse(
          'ws://127.0.0.1:${server.port}/orders/$orderId/track?token=$token',
        ),
      );
      final events = <LiveLocationEvent>[];
      socket.events.listen(events.add);

      await socket.connect('ord-io');
      await Future<void>.delayed(const Duration(milliseconds: 200));

      expect(paths.single, equals('/orders/ord-io/track'));
      expect(tokensSeen.single, equals(_accessToken));
      expect(events.whereType<LiveLocationUpdated>(), hasLength(1));
      expect(
        events.whereType<LiveLocationUpdated>().single.location.latitude,
        equals(24.8607),
      );
      expect(events.whereType<LiveLocationCompleted>(), hasLength(1));

      await socket.dispose();
      await server.close(force: true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // D. Backend location proxy
  // ───────────────────────────────────────────────────────────────────────────

  group('D. Backend location proxy (places + reverse geocode)', () {
    test('D1. reverse-geocodes through the backend with the bearer token',
        () async {
      http.Request? captured;
      final client = MockClient((request) async {
        captured = request;
        return _json({
          'formatted_address': 'F-7 Markaz, Islamabad, Pakistan',
          'place_id': 'ChIJabc',
          'components': {
            'street': 'F-7 Markaz',
            'neighborhood': 'F-7',
            'city': 'Islamabad',
          },
        }, 200);
      });

      final result = await LocationRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _tokens(UserRole.customer),
        ),
      ).reverseGeocode(latitude: 33.7215, longitude: 73.0546);

      expect(captured!.url.path, equals('/api/v1/location/reverse-geocode'));
      expect(captured!.url.queryParameters['lat'], equals('33.7215'));
      expect(captured!.url.queryParameters['lng'], equals('73.0546'));
      // All /api/v1/location/* endpoints require auth (get_current_user).
      expect(captured!.headers['Authorization'],
          equals('Bearer $_accessToken'));

      expect(result.formattedAddress, equals('F-7 Markaz, Islamabad, Pakistan'));
      expect(result.components.city, equals('Islamabad'));
      expect(result.displayAddress, equals('F-7 Markaz, Islamabad, Pakistan'));
    });

    test('D2. resolveAddress returns null instead of throwing (404/429/503)',
        () async {
      for (final status in [404, 429, 503]) {
        final repo = LocationRepository(
          client: ApiClient(
            httpClient: MockClient(
              (request) async => _json({'detail': 'no address'}, status),
            ),
            tokenStorage: _tokens(UserRole.customer),
          ),
        );
        expect(
          await repo.resolveAddress(latitude: 0, longitude: 0),
          isNull,
          reason: 'status $status',
        );
      }
    });

    test('D3. places autocomplete + details use the backend proxy', () async {
      final requestedPaths = <String>[];
      final client = MockClient((request) async {
        requestedPaths.add(request.url.path);
        if (request.url.path.endsWith('/autocomplete')) {
          return _json([
            {'place_id': 'ChIJ1', 'description': 'F-7 Markaz, Islamabad'},
          ], 200);
        }
        return _json({
          'place_id': 'ChIJ1',
          'formatted_address': 'F-7 Markaz, Islamabad',
          'lat': 33.7215,
          'lng': 73.0546,
          'components': {'city': 'Islamabad'},
        }, 200);
      });

      final repo = LocationRepository(
        client: ApiClient(
          httpClient: client,
          tokenStorage: _tokens(UserRole.customer),
        ),
      );

      final predictions = await repo.autocompletePlaces('F-7 Markaz');
      expect(predictions, hasLength(1));
      expect(predictions.single.placeId, equals('ChIJ1'));

      final details = await repo.placeDetails('ChIJ1');
      expect(details, isNotNull);
      expect(details!.latitude, equals(33.7215));

      expect(requestedPaths, equals([
        '/api/v1/location/places/autocomplete',
        '/api/v1/location/places/details',
      ]));
    });

    test('D4. placeDetails returns null when the backend has no such place',
        () async {
      final repo = LocationRepository(
        client: ApiClient(
          httpClient: MockClient(
            (request) async => _json({'detail': 'Place ID not found.'}, 404),
          ),
          tokenStorage: _tokens(UserRole.customer),
        ),
      );
      expect(await repo.placeDetails('missing'), isNull);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // E. Screen-level transport coordination
  // ───────────────────────────────────────────────────────────────────────────

  group('E. Tracking screen live transport', () {
    final activeOrder = OrderTracking(
      id: 'ord-ws',
      status: OrderStatus.onTheWay,
      paymentMethod: PaymentMethod.cod,
      restaurantName: 'Speedy Pizza',
      riderName: 'Hamza Khan',
      riderPhone: '+923001234567',
      deliveryDistanceKm: 3.5,
      foodSubtotal: 1200,
      deliveryFee: 120,
      totalAmount: 1320,
    );

    testWidgets('E1. goes live from a WebSocket frame and pauses REST polling',
        (tester) async {
      final connector = FakeConnector();
      final socket = _buildSocket(
        connector,
        tokens: _tokens(UserRole.customer),
      );
      final riderRepo = _CountingRiderLocationRepository(null);
      final orderRepo = _FakeOrderRepository(activeOrder);

      await tester.pumpWidget(
        MaterialApp(
          home: OrderTrackingScreen(
            orderId: 'ord-ws',
            orderRepository: orderRepo,
            riderLocationRepository: riderRepo,
            liveLocationSocket: socket,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      // The socket is opened for this order...
      expect(connector.urls, hasLength(1));
      expect(connector.urls.single.path, equals('/orders/ord-ws/track'));
      // ...and the REST fallback has already polled once while it connected.
      expect(riderRepo.callCount, equals(1));
      // No live fix yet, so the UI says so rather than inventing a position.
      expect(find.text('Rider location is currently unavailable.'), findsOneWidget);

      connector.transports.single.emit({
        'event': 'location_update',
        'data': {
          'order_id': 'ord-ws',
          'latitude': 33.7050,
          'longitude': 73.0650,
          'updated_at': '2026-09-28T10:00:00Z',
        },
      });
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Rider location is currently unavailable.'), findsNothing);

      // Polling must pause while live frames are flowing.
      final callsWhileLive = riderRepo.callCount;
      await tester.pump(const Duration(seconds: 10));
      expect(riderRepo.callCount, equals(callsWhileLive));

      // Dispose: the socket must close and no timer may survive.
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(tester.takeException(), isNull);
    });

    testWidgets('E2. falls back to REST polling when the socket drops',
        (tester) async {
      final connector = FakeConnector();
      final socket = _buildSocket(
        connector,
        tokens: _tokens(UserRole.customer),
      );
      final riderRepo = _CountingRiderLocationRepository(
        const RiderLocation(latitude: 33.7050, longitude: 73.0650),
      );
      final orderRepo = _FakeOrderRepository(activeOrder);

      await tester.pumpWidget(
        MaterialApp(
          home: OrderTrackingScreen(
            orderId: 'ord-ws',
            orderRepository: orderRepo,
            riderLocationRepository: riderRepo,
            liveLocationSocket: socket,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      final callsBeforeDrop = riderRepo.callCount;
      connector.transports.single.drop();
      await tester.pump(const Duration(milliseconds: 50));

      // Polling resumes after the drop (immediately, since the socket will retry).
      await tester.pump(const Duration(seconds: 1));
      expect(riderRepo.callCount, greaterThan(callsBeforeDrop));

      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(tester.takeException(), isNull);
    });
  });
}
