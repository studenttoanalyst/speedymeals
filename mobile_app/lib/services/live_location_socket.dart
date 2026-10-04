import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;

import '../core/config/api_config.dart';
import '../core/storage/token_storage.dart';
import '../data/models/rider_location.dart';
import 'location_socket_transport.dart';
import 'websocket_connector.dart';

/// Events emitted by [LiveLocationSocket].
///
/// These mirror the backend's two documented frame types exactly — no invented
/// fields, no synthetic movement.
sealed class LiveLocationEvent {
  const LiveLocationEvent();
}

/// A frame the backend sent as
/// `{"event":"location_update","data":{order_id,latitude,longitude,updated_at}}`.
///
/// Only emitted when `data` carries coordinates that pass
/// [RiderLocation.isValidCoordinate]; malformed frames are dropped.
class LiveLocationUpdated extends LiveLocationEvent {
  const LiveLocationUpdated(this.location);

  final RiderLocation location;
}

/// The backend's terminal frame
/// `{"event":"order_completed","detail":…}` — the order reached a terminal
/// status, so tracking stops for good (no reconnect after this).
class LiveLocationCompleted extends LiveLocationEvent {
  const LiveLocationCompleted([this.detail]);

  final String? detail;
}

/// The socket dropped (or never opened).
///
/// [willReconnect] is true while the service still has retry attempts left;
/// the screen uses it to decide between "we may go live again" and "stay on
/// REST polling".
class LiveLocationDisconnected extends LiveLocationEvent {
  const LiveLocationDisconnected({
    required this.reason,
    required this.willReconnect,
  });

  final String reason;
  final bool willReconnect;
}

/// Reusable client for the backend's live rider-tracking WebSocket:
/// `WS /orders/{order_id}/track?token=<access JWT>`.
///
/// Responsibilities
/// ----------------
/// • Connect only while a customer is actively tracking an order.
/// • Authenticate exactly as the backend expects (JWT as a query parameter).
/// • Parse the backend's real frames (`location_update`, `order_completed`).
/// • Never open a second socket for the same order (duplicate guard).
/// • Reconnect a bounded number of times on an unexpected drop, then stop and
///   let the caller fall back to REST polling.
/// • Never log the token or the full URL.
class LiveLocationSocket {
  LiveLocationSocket({
    LocationSocketConnector? connector,
    Uri Function({required String orderId, required String token})? uriBuilder,
    TokenStorage? tokenStorage,
    this.connectTimeout = const Duration(seconds: 10),
    this.reconnectDelay = const Duration(seconds: 5),
    this.maxReconnectAttempts = 3,
  })  : _connector = connector ?? connectLocationSocket,
        _uriBuilder = uriBuilder ?? ApiConfig.orderTrackingSocketUri,
        _tokens = tokenStorage ?? TokenStorage();

  final LocationSocketConnector _connector;
  final Uri Function({required String orderId, required String token})
      _uriBuilder;
  final TokenStorage _tokens;

  /// How long a single connect attempt may take.
  final Duration connectTimeout;

  /// Delay before an automatic reconnect attempt.
  final Duration reconnectDelay;

  /// Automatic reconnect attempts after an unexpected drop (per connection).
  final int maxReconnectAttempts;

  final StreamController<LiveLocationEvent> _events =
      StreamController<LiveLocationEvent>.broadcast();

  /// Consumer-facing event stream.
  Stream<LiveLocationEvent> get events => _events.stream;

  LocationSocketTransport? _transport;
  StreamSubscription<String>? _subscription;
  Timer? _reconnectTimer;

  String? _orderId;
  int _reconnectAttempts = 0;
  bool _disposed = false;
  bool _completed = false;
  bool _connecting = false;

  /// True while a usable socket is open.
  bool get isConnected => _transport != null && !_transport!.isClosed;

  /// True while a connect attempt is in progress.
  bool get isConnecting => _connecting;

  /// The order currently being tracked, if any.
  String? get orderId => _orderId;

  /// Whether the server told us the order is finished.
  bool get isCompleted => _completed;

  /// Connects for [orderId]. No-op when already connected to the same order.
  Future<void> connect(String orderId) async {
    if (_disposed) return;
    if (_orderId == orderId && (isConnected || _connecting)) return; // duplicate guard
    if (_orderId != null && _orderId != orderId) {
      await close();
    }
    _orderId = orderId;
    _completed = false;
    _reconnectAttempts = 0;
    await _open();
  }

  /// Closes the socket and cancels any pending reconnect. Safe to call twice.
  Future<void> close() async {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _connecting = false;

    final sub = _subscription;
    _subscription = null;
    await sub?.cancel();

    final transport = _transport;
    _transport = null;
    if (transport != null) {
      await transport.close(1000, 'client closed');
    }
  }

  /// Closes the socket and releases the event stream.
  ///
  /// Call only when the owning screen is permanently disposed; a disposed
  /// socket cannot be reconnected.
  Future<void> dispose() async {
    _disposed = true;
    await close();
    await _events.close();
  }

  // ─────────────────────────────── internals ────────────────────────────────

  Future<void> _open() async {
    final orderId = _orderId;
    if (_disposed || orderId == null || isConnected || _connecting) return;

    final token = _tokens.accessToken;
    if (token == null || token.isEmpty) {
      // Not signed in (or the session was cleared) — no point retrying.
      _emit(LiveLocationDisconnected(
        reason: 'no access token',
        willReconnect: false,
      ));
      return;
    }

    _connecting = true;
    try {
      final transport = await _connector(
        _uriBuilder(orderId: orderId, token: token),
        timeout: connectTimeout,
      );

      // The caller may have closed/disposed or switched orders mid-connect.
      if (_disposed || _orderId != orderId) {
        await transport.close(1000, 'stale connection');
        return;
      }

      _transport = transport;
      // The reconnect budget is only reset once the server proves the
      // connection is healthy (a location frame) — see [_onFrame]. Resetting it
      // on every successful handshake would make a flapping socket retry
      // forever instead of eventually handing back to REST polling.
      // Log the route only — never the query string (it carries the JWT).
      developer.log(
        'LiveLocationSocket: connected for order $orderId',
        name: 'LiveLocationSocket',
      );

      _subscription = transport.messages.listen(
        _onFrame,
        onError: (Object error) => _handleDrop('socket error'),
        onDone: () => _handleDrop('socket closed'),
        cancelOnError: false,
      );
    } catch (error) {
      _handleDrop('connect failed');
    } finally {
      _connecting = false;
    }
  }

  void _onFrame(String raw) {
    if (_disposed) return;

    Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } catch (_) {
      // Non-JSON frame — ignored rather than crashing the stream.
      return;
    }
    if (decoded is! Map) return;

    final event = decoded['event'];
    switch (event) {
      case 'location_update':
        final data = decoded['data'];
        if (data is! Map) return;
        final location =
            RiderLocation.tryFromJson(Map<String, dynamic>.from(data));
        if (location == null) return; // invalid/missing coordinates
        // A real frame means the connection is healthy: restore the retry
        // budget for any later drop.
        _reconnectAttempts = 0;
        _emit(LiveLocationUpdated(location));
      case 'order_completed':
        _completed = true;
        _emit(LiveLocationCompleted(decoded['detail'] as String?));
        // Terminal: stop streaming for good. The screen also halts its own
        // polling because the order status is terminal.
        unawaited(close());
      default:
        // Unknown event type — ignore (forward-compatible, no invented fields).
        break;
    }
  }

  void _handleDrop(String reason) {
    _subscription?.cancel();
    _subscription = null;
    _transport = null;

    if (_disposed || _completed) return;

    final canRetry = _reconnectAttempts < maxReconnectAttempts;
    if (!canRetry) {
      _emit(LiveLocationDisconnected(reason: reason, willReconnect: false));
      return;
    }

    _reconnectAttempts++;
    _emit(LiveLocationDisconnected(reason: reason, willReconnect: true));
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(reconnectDelay, () {
      _reconnectTimer = null;
      unawaited(_open());
    });
  }

  void _emit(LiveLocationEvent event) {
    if (_events.isClosed) return;
    _events.add(event);
  }
}
