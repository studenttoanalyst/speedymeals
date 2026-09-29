import 'location_socket_transport.dart';

/// Web build (and any platform without `dart:io`) cannot open a raw WebSocket
/// with the mobile transport.
///
/// The tracking screen treats this exactly like a failed connection: it stays
/// on `GET /orders/{id}/rider-location` polling and never claims live streaming.
Future<LocationSocketTransport> connectLocationSocket(
  Uri url, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  throw UnsupportedError(
    'Raw WebSocket transport is unavailable on this platform; '
    'REST polling is used instead.',
  );
}
