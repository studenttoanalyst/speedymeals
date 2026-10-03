import 'dart:async';
import 'dart:io';

import 'location_socket_transport.dart';

/// Opens a real WebSocket using `dart:io`.
///
/// Used on Android, iOS, Windows, macOS and Linux. The web build compiles
/// `websocket_connector_stub.dart` instead.
Future<LocationSocketTransport> connectLocationSocket(
  Uri url, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  final socket = await WebSocket.connect(url.toString()).timeout(timeout);
  return IoLocationSocketTransport(socket);
}

/// `dart:io`-backed [LocationSocketTransport].
class IoLocationSocketTransport implements LocationSocketTransport {
  IoLocationSocketTransport(this._socket);

  final WebSocket _socket;

  @override
  Stream<String> get messages =>
      _socket.map((event) => event is String ? event : event.toString());

  @override
  Future<void> close([int? code, String? reason]) async {
    try {
      await _socket.close(code, reason);
    } catch (_) {
      // Already-closing / already-closed sockets are not an error for callers.
    }
  }

  @override
  bool get isClosed => _socket.readyState == WebSocket.closed;

  /// Exposed for diagnostics only — never surfaced to the UI.
  int get readyState => _socket.readyState;
}
