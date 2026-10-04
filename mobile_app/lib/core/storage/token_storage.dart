import 'dart:developer' as developer;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

/// Persists the session (tokens + the identity stamped inside them) in the
/// platform keystore / keychain.
///
/// Why the identity is cached too: the access token carries `sub` (user id) and
/// `role`, but decoding a JWT on the client to boot the app would mean trusting
/// an unverified signature. Instead the server-supplied identity is stored
/// alongside the tokens at sign-in time, so a cold start can restore the UI
/// immediately and let `GET /auth/me` confirm it in the background.
///
/// Failure policy: secure storage is unavailable on some desktop Linux setups
/// (no libsecret) and on misconfigured emulators. Rather than crash on launch,
/// reads and writes degrade to memory for the current process — the user is
/// simply asked to sign in again next launch, and the reason is logged.
class TokenStorage {
  /// flutter_secure_storage 11.x encrypts on every platform by default
  /// (AES-GCM with keystore-wrapped keys on Android, Keychain on iOS/macOS),
  /// and its Android `resetOnError` default discards values it can no longer
  /// decrypt instead of throwing forever — so the default options are correct.
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  /// Set once a read/write has failed, so we stop hammering a broken keystore.
  bool _degraded = false;

  /// In-process fallback when the keystore is unavailable.
  final Map<String, String> _memory = {};

  static const _kAccessToken = 'sm.access_token';
  static const _kRefreshToken = 'sm.refresh_token';
  static const _kRole = 'sm.role';
  static const _kSubjectId = 'sm.subject_id';
  static const _kPhoneNumber = 'sm.phone_number';

  String? _accessToken;
  String? _refreshToken;
  UserRole? _role;
  String? _subjectId;
  String? _phoneNumber;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  UserRole? get role => _role;
  String? get subjectId => _subjectId;
  String? get phoneNumber => _phoneNumber;

  /// True once tokens are loaded (or written) so the app can make authed calls.
  bool get hasSession => _accessToken != null && _role != null;

  /// Loads the persisted session into memory. Safe to call more than once.
  Future<void> load() async {
    final values = await _readAll();
    _accessToken = values[_kAccessToken];
    _refreshToken = values[_kRefreshToken];
    _subjectId = values[_kSubjectId];
    _phoneNumber = values[_kPhoneNumber];
    _role = UserRole.fromWire(values[_kRole]);
  }

  /// Persists a freshly issued session. [role] comes from the login endpoint the
  /// caller used — the backend does not echo the role in the token response.
  Future<void> save({
    required String accessToken,
    required String refreshToken,
    required UserRole role,
    String? subjectId,
    String? phoneNumber,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _role = role;
    _subjectId = subjectId;
    _phoneNumber = phoneNumber;

    final values = <String, String>{
      _kAccessToken: accessToken,
      _kRefreshToken: refreshToken,
      _kRole: role.wireName,
    };
    if (subjectId != null) values[_kSubjectId] = subjectId;
    if (phoneNumber != null) values[_kPhoneNumber] = phoneNumber;

    await _writeAll(values);
  }

  /// Updates just the token pair, used by the 401 → refresh rotation path so a
  /// rotated refresh token is never lost.
  Future<void> updateTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    final existing = await _readAll();
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    existing[_kAccessToken] = accessToken;
    existing[_kRefreshToken] = refreshToken;
    await _writeAll(existing);
  }

  /// Clears every persisted key. Used by logout and by the refresh-failed path.
  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
    _role = null;
    _subjectId = null;
    _phoneNumber = null;

    if (_degraded) {
      _memory.clear();
      return;
    }
    try {
      await _storage.deleteAll();
      _memory.clear();
    } catch (error, stackTrace) {
      _degrade('clear', error, stackTrace);
      _memory.clear();
    }
  }

  Future<Map<String, String>> _readAll() async {
    if (_degraded) return Map.of(_memory);
    try {
      return await _storage.readAll();
    } catch (error, stackTrace) {
      _degrade('read', error, stackTrace);
      return Map.of(_memory);
    }
  }

  Future<void> _writeAll(Map<String, String> values) async {
    if (_degraded) {
      _memory
        ..clear()
        ..addAll(values);
      return;
    }
    try {
      await _storage.write(key: _kAccessToken, value: values[_kAccessToken]);
      await _storage.write(key: _kRefreshToken, value: values[_kRefreshToken]);
      await _storage.write(key: _kRole, value: values[_kRole]);
      // Absent values must actively remove the previous key, otherwise a stale
      // phone number from a previous session survives logout.
      await _writeOrDelete(_kSubjectId, values[_kSubjectId]);
      await _writeOrDelete(_kPhoneNumber, values[_kPhoneNumber]);
    } catch (error, stackTrace) {
      _degrade('write', error, stackTrace);
      _memory
        ..clear()
        ..addAll(values);
    }
  }

  Future<void> _writeOrDelete(String key, String? value) async {
    if (value == null) {
      await _storage.delete(key: key);
    } else {
      await _storage.write(key: key, value: value);
    }
  }

  void _degrade(String operation, Object error, StackTrace stackTrace) {
    if (_degraded) return;
    _degraded = true;
    developer.log(
      'Secure storage $operation failed; falling back to in-memory session '
      'storage for this process. The user will need to sign in again after '
      'restarting the app.',
      name: 'TokenStorage',
      error: error,
      stackTrace: stackTrace,
    );
  }
}
