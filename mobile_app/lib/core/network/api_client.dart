import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' show MediaType;

import '../config/api_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// The one and only HTTP entry point for the app.
///
/// Every screen talks to a repository; every repository talks to this class.
/// No widget or repository builds an `http` request itself, so auth headers,
/// timeouts, retry-on-401 and error mapping are implemented exactly once.

///
/// Deliberately free of `dart:io` so the same code compiles for Flutter web.
class ApiClient {
  ApiClient({
    http.Client? httpClient,
    TokenStorage? tokenStorage,
    String? baseUrl,
  })  : _http = httpClient ?? http.Client(),
        _tokens = tokenStorage ?? TokenStorage(),
        _baseUrlOverride = baseUrl;

  /// Shared instance used by every repository.
  static final ApiClient instance = ApiClient();

  final http.Client _http;
  final TokenStorage _tokens;
  final String? _baseUrlOverride;

  /// How long a single request may take before it is treated as a timeout.
  static const Duration timeout = Duration(seconds: 20);

  /// Longer budget for uploads (documents and menu photos are up to 5 MB).
  static const Duration uploadTimeout = Duration(seconds: 45);

  String get baseUrl => _baseUrlOverride ?? ApiConfig.baseUrl;

  /// Exposes the session for repositories that need the current role/identity.
  TokenStorage get tokens => _tokens;

  /// Installed by the auth layer during bootstrap. Returning `true` means new
  /// tokens were stored and the failed request can be retried once.
  ///
  /// This indirection exists to break a cycle: [ApiClient] must be able to
  /// refresh, but refreshing is `POST /auth/refresh`, which can only live in the
  /// auth repository, which itself needs an [ApiClient].
  Future<bool> Function()? onRefreshToken;

  /// Fired when a refresh attempt fails, i.e. the session is genuinely dead and
  /// the user must sign in again. The app shell uses this to bounce to login.
  void Function()? onSessionExpired;

  /// Single-flight guard so N concurrent 401s trigger exactly one refresh call.
  Future<bool>? _refreshInFlight;

  // ---------------------------------------------------------------- requests

  /// Performs a request and returns the decoded JSON body.
  ///
  /// Returns `null` for 204 responses and empty bodies. Throws [ApiException]
  /// for every failure — callers never see a raw `http.Response`.
  Future<Object?> request(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool authenticated = true,
    bool allowRefresh = true,
    Duration? timeoutOverride,
  }) async {
    final uri = _buildUri(path, query);

    try {
      final response = await _send(
        method,
        uri,
        body: body,
        headers: headers,
        authenticated: authenticated,
        timeoutOverride: timeoutOverride,
      );

      // A 401 on an authenticated call usually just means the 15-minute access
      // token rolled over. Refresh once, then replay the original request.
      if (response.statusCode == 401 &&
          authenticated &&
          allowRefresh &&
          _tokens.refreshToken != null) {
        final refreshed = await _ensureRefreshed();
        if (refreshed) {
          return await request(
            method,
            path,
            body: body,
            query: query,
            headers: headers,
            authenticated: authenticated,
            allowRefresh: false,
            timeoutOverride: timeoutOverride,
          );
        }
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return _decodeBody(response);
      }

      throw ApiException.fromResponse(
        response.statusCode,
        _decodeBody(response),
      );
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw ApiException(
        kind: ApiErrorKind.timeout,
        message: 'The request took too long. Please check your connection and '
            'try again.',
      );
    } catch (error, stackTrace) {
      developer.log('Request $method $uri failed', name: 'ApiClient', error: error, stackTrace: stackTrace);
      throw _classifyTransportError(error);
    }
  }

  /// GET returning a JSON object.
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final body = await request('GET', path, query: query, headers: headers, authenticated: authenticated);
    return _asObject(body);
  }

  /// GET returning a JSON array.
  Future<List<dynamic>> getJsonList(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final body = await request('GET', path, query: query, headers: headers, authenticated: authenticated);
    if (body is List) return body;
    throw ApiException(
      kind: ApiErrorKind.unknown,
      message: 'Unexpected response from the server.',
      detail: body,
    );
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final response = await request('POST', path, body: body, query: query, headers: headers, authenticated: authenticated);
    return _asObjectOrEmpty(response);
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    Object? body,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final response = await request('PUT', path, body: body, headers: headers, authenticated: authenticated);
    return _asObjectOrEmpty(response);
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    Object? body,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    final response = await request('PATCH', path, body: body, headers: headers, authenticated: authenticated);
    return _asObjectOrEmpty(response);
  }

  /// DELETE that tolerates the backend's 204 (no content) replies.
  Future<void> delete(
    String path, {
    Object? body,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    await request('DELETE', path, body: body, headers: headers, authenticated: authenticated);
  }

  // ------------------------------------------------------------------ upload

  /// Multipart upload (rider documents, menu photos).
  ///
  /// [bytes] are passed straight through so callers control where the data came
  /// from (file picker, camera, …) without this layer taking a file-system
  /// dependency.
  Future<Map<String, dynamic>> uploadFile(
    String path, {
    required List<int> bytes,
    required String filename,
    required String contentType,
    String fieldName = 'file',
    bool authenticated = true,
    bool allowRefresh = true,
  }) async {
    final uri = _buildUri(path, null);

    try {
      final request = http.MultipartRequest('POST', uri)
        ..files.add(
          http.MultipartFile.fromBytes(
            fieldName,
            bytes,
            filename: filename,
            contentType: MediaType.parse(contentType),
          ),
        );

      if (authenticated) {
        final token = _tokens.accessToken;
        if (token != null) {
          request.headers['Authorization'] = 'Bearer $token';
        }
      }

      final streamed = await request.send().timeout(uploadTimeout);
      final response = await http.Response.fromStream(streamed);

      if (response.statusCode == 401 &&
          authenticated &&
          allowRefresh &&
          _tokens.refreshToken != null) {
        final refreshed = await _ensureRefreshed();
        if (refreshed) {
          return await uploadFile(
            path,
            bytes: bytes,
            filename: filename,
            contentType: contentType,
            fieldName: fieldName,
            authenticated: authenticated,
            allowRefresh: false,
          );
        }
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return _asObjectOrEmpty(_decodeBody(response));
      }

      throw ApiException.fromResponse(response.statusCode, _decodeBody(response));
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw ApiException(
        kind: ApiErrorKind.timeout,
        message: 'The upload took too long. Please try again.',
      );
    } catch (error, stackTrace) {
      developer.log('Upload $uri failed', name: 'ApiClient', error: error, stackTrace: stackTrace);
      throw _classifyTransportError(error);
    }
  }

  // ----------------------------------------------------------------- internals

  Future<http.Response> _send(
    String method,
    Uri uri, {
    Object? body,
    Map<String, String>? headers,
    required bool authenticated,
    Duration? timeoutOverride,
  }) {
    // Per-request headers are merged over the defaults and may override them.
    final requestHeaders = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      ...?headers,
    };

    if (authenticated) {
      final token = _tokens.accessToken;
      if (token != null) {
        requestHeaders['Authorization'] = 'Bearer $token';
      }
    }

    final encoded = body == null ? null : jsonEncode(body);
    final budget = timeoutOverride ?? timeout;

    switch (method) {
      case 'GET':
        return _http.get(uri, headers: requestHeaders).timeout(budget);
      case 'POST':
        return _http.post(uri, headers: requestHeaders, body: encoded).timeout(budget);
      case 'PUT':
        return _http.put(uri, headers: requestHeaders, body: encoded).timeout(budget);
      case 'PATCH':
        return _http.patch(uri, headers: requestHeaders, body: encoded).timeout(budget);
      case 'DELETE':
        return _http.delete(uri, headers: requestHeaders, body: encoded).timeout(budget);
      default:
        throw ArgumentError.value(method, 'method', 'Unsupported HTTP method');
    }
  }

  /// Runs [onRefreshToken] at most once across all concurrent callers.
  Future<bool> _ensureRefreshed() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<bool> _doRefresh() async {
    final refresh = onRefreshToken;
    if (refresh == null) return false;

    try {
      final succeeded = await refresh();
      if (!succeeded) {
        await _tokens.clear();
        onSessionExpired?.call();
      }
      return succeeded;
    } catch (error, stackTrace) {
      developer.log('Token refresh failed', name: 'ApiClient', error: error, stackTrace: stackTrace);
      await _tokens.clear();
      onSessionExpired?.call();
      return false;
    }
  }

  Uri _buildUri(String path, Map<String, dynamic>? query) {
    final normalized = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$baseUrl$normalized');

    if (query == null || query.isEmpty) return uri;

    final params = <String, String>{};
    query.forEach((key, value) {
      // Nulls are omitted rather than sent as the literal string "null" —
      // FastAPI would reject the latter for typed query params.
      if (value == null) return;
      if (value is Iterable) {
        for (final element in value) {
          if (element != null) params[key] = '$element';
        }
      } else {
        params[key] = '$value';
      }
    });
    if (params.isEmpty) return uri;
    return uri.replace(queryParameters: params);
  }

  Object? _decodeBody(http.Response response) {
    if (response.statusCode == 204) return null;
    final text = response.body;
    if (text.isEmpty) return null;
    try {
      return jsonDecode(text);
    } catch (_) {
      // Non-JSON error page (proxy, load balancer). Kept as raw text so the
      // exception detail still carries something diagnosable.
      return text;
    }
  }

  Map<String, dynamic> _asObject(Object? body) {
    if (body is Map<String, dynamic>) return body;
    if (body is Map) return Map<String, dynamic>.from(body);
    throw ApiException(
      kind: ApiErrorKind.unknown,
      message: 'Unexpected response from the server.',
      detail: body,
    );
  }

  Map<String, dynamic> _asObjectOrEmpty(Object? body) {
    if (body == null) return <String, dynamic>{};
    return _asObject(body);
  }

  /// Maps a transport-layer failure onto an [ApiException].
  ///
  /// package:http throws [http.ClientException] on both native and web, but a
  /// bare `SocketException` can still escape on native. Message sniffing keeps
  /// this classification correct without importing `dart:io` (which would break
  /// the web build).
  ApiException _classifyTransportError(Object error) {
    final description = error.toString();
    final isOffline = error is http.ClientException ||
        description.contains('SocketException') ||
        description.contains('Connection refused') ||
        description.contains('Failed host lookup') ||
        description.contains('Connection closed') ||
        description.contains('XMLHttpRequest');

    if (isOffline) {
      return ApiException(
        kind: ApiErrorKind.network,
        message: 'Cannot reach Speedy Meals. Check your internet connection '
            'and try again.',
        detail: error,
      );
    }

    return ApiException(
      kind: ApiErrorKind.unknown,
      message: 'Something went wrong. Please try again.',
      detail: error,
    );
  }
}
