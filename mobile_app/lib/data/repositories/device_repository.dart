import '../../core/network/api_client.dart';

/// Registers this device's FCM token with the backend so it can receive push
/// notifications for the signed-in account.
///
///     POST   /devices              {"token": "...", "platform": "android|ios"}
///     DELETE /devices?token=...    (call on logout, before the session is cleared)
///
/// Both endpoints bind the token to the identity in the access token, so the
/// client never sends (and can never spoof) a user id.
class DeviceRepository {
  DeviceRepository({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  Future<void> register({required String token, required String platform}) async {
    await _client.postJson(
      '/devices',
      body: {'token': token, 'platform': platform},
    );
  }

  Future<void> unregister(String token) async {
    await _client.request('DELETE', '/devices', query: {'token': token});
  }
}
