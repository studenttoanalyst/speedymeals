/// Minimal transport abstraction for the live-tracking WebSocket.
///
/// The concrete implementation lives behind a conditional import
/// (`websocket_connector.dart`) so the mobile app can use `dart:io` while the
/// rest of the codebase — and the web build — stays free of it.
///
/// Tests inject a fake implementation of this interface, so socket behaviour
/// (frames, completion, drops, reconnects) is verified without a real network.
abstract class LocationSocketTransport {
  /// Raw text frames sent by the server. The backend sends JSON objects.
  Stream<String> get messages;

  /// Closes the socket. Safe to call more than once.
  Future<void> close([int? code, String? reason]);

  /// True once the underlying socket can no longer be used.
  bool get isClosed;
}

/// Opens a WebSocket connection to [url].
///
/// On the mobile/desktop targets this is backed by `dart:io`'s
/// `WebSocket.connect`. On unsupported platforms it throws
/// [UnsupportedError]; callers treat that exactly like a failed connection and
/// fall back to REST polling.
typedef LocationSocketConnector = Future<LocationSocketTransport> Function(
  Uri url, {
  Duration timeout,
});
