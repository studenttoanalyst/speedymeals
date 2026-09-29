/// Platform-selected WebSocket connector.
///
/// `dart:io` is only available on mobile/desktop/VM targets, so the real
/// implementation is selected at compile time. On web the stub is compiled in
/// and reports the transport as unavailable — the tracking screen then uses its
/// REST polling fallback instead of crashing.
library;

export 'websocket_connector_stub.dart'
    if (dart.library.io) 'websocket_connector_io.dart';
