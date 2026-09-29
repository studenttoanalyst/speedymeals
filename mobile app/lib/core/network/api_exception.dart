/// Machine-readable classification of an API failure.
///
/// The UI switches on this (never on a raw status code or an exception string)
/// so every screen can render the same friendly copy for the same condition.
enum ApiErrorKind {
  /// No connectivity, DNS failure, connection refused.
  network,

  /// The request exceeded [ApiClient.timeout].
  timeout,

  /// 400 — the request was understood but rejected (e.g. empty cart,
  /// invalid status transition).
  badRequest,

  /// 401 — missing/expired/invalid access token.
  unauthorized,

  /// 403 — valid token, wrong role for this endpoint.
  forbidden,

  /// 404 — not found, or not owned by the caller (the backend deliberately
  /// returns 404 rather than 403 for another user's resource).
  notFound,

  /// 409 — conflicting state.
  conflict,

  /// 422 — request failed schema validation.
  validation,

  /// 429 — rate limited (OTP resend cooldown is 45s).
  rateLimited,

  /// 500 — unexpected server error.
  server,

  /// 503 — a dependency is down (e.g. the Maps API used for delivery distance).
  unavailable,

  /// Anything else.
  unknown,
}

/// A single, uniform error type for every failed API call.
///
/// Screens should show [message] to the user and may log [detail] for debugging.
/// Raw stack traces / server internals are never surfaced through [message].
class ApiException implements Exception {
  final ApiErrorKind kind;
  final int? statusCode;

  /// Human-readable, safe to display.
  final String message;

  /// Raw `detail` payload from the backend, for logs / diagnostics only.
  final Object? detail;

  const ApiException({
    required this.kind,
    required this.message,
    this.statusCode,
    this.detail,
  });

  /// Build an exception from a non-2xx HTTP response.
  ///
  /// FastAPI reports errors as `{"detail": <string>}` or, for validation
  /// failures, `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`.
  factory ApiException.fromResponse(int statusCode, Object? body) {
    final detail = _extractDetail(body);

    switch (statusCode) {
      case 400:
        return ApiException(
          kind: ApiErrorKind.badRequest,
          statusCode: statusCode,
          message: detail ?? 'That request could not be completed.',
          detail: body,
        );
      case 401:
        return ApiException(
          kind: ApiErrorKind.unauthorized,
          statusCode: statusCode,
          message: 'Your session has expired. Please sign in again.',
          detail: body,
        );
      case 403:
        return ApiException(
          kind: ApiErrorKind.forbidden,
          statusCode: statusCode,
          message: detail ?? 'You do not have access to this action.',
          detail: body,
        );
      case 404:
        return ApiException(
          kind: ApiErrorKind.notFound,
          statusCode: statusCode,
          message: detail ?? 'We could not find what you were looking for.',
          detail: body,
        );
      case 409:
        return ApiException(
          kind: ApiErrorKind.conflict,
          statusCode: statusCode,
          message: detail ?? 'That conflicts with the current state.',
          detail: body,
        );
      case 422:
        return ApiException(
          kind: ApiErrorKind.validation,
          statusCode: statusCode,
          message: detail ?? 'Some of the details you entered are not valid.',
          detail: body,
        );
      case 429:
        return ApiException(
          kind: ApiErrorKind.rateLimited,
          statusCode: statusCode,
          message: detail ?? 'Too many attempts. Please wait a moment.',
          detail: body,
        );
      case 500:
        return ApiException(
          kind: ApiErrorKind.server,
          statusCode: statusCode,
          message: 'Something went wrong on our side. Please try again.',
          detail: body,
        );
      case 502:
      case 503:
      case 504:
        return ApiException(
          kind: ApiErrorKind.unavailable,
          statusCode: statusCode,
          message: detail ??
              'The service is temporarily unavailable. Please try again shortly.',
          detail: body,
        );
      default:
        return ApiException(
          kind: ApiErrorKind.unknown,
          statusCode: statusCode,
          message: detail ?? 'Something went wrong. Please try again.',
          detail: body,
        );
    }
  }

  /// Flatten FastAPI's `detail` (string, or list of validation errors) into a
  /// single readable sentence. Returns null when there is nothing usable.
  static String? _extractDetail(Object? body) {
    if (body is! Map) return null;
    final detail = body['detail'];
    if (detail is String && detail.trim().isNotEmpty) return detail;

    if (detail is List) {
      final messages = <String>[];
      for (final entry in detail) {
        if (entry is Map) {
          final msg = entry['msg'];
          final loc = entry['loc'];
          if (msg is String) {
            // "body -> qty" is far more useful than a bare "Field required".
            final field = loc is List
                ? loc.where((p) => p != 'body').join(' → ')
                : null;
            messages.add(field == null || field.isEmpty ? msg : '$field: $msg');
          }
        }
      }
      if (messages.isNotEmpty) return messages.join('\n');
    }
    return null;
  }

  /// True when retrying the exact same request has a real chance of working.
  bool get isRetryable =>
      kind == ApiErrorKind.network ||
      kind == ApiErrorKind.timeout ||
      kind == ApiErrorKind.server ||
      kind == ApiErrorKind.unavailable;

  /// True when the session is unusable and the user must sign in again.
  bool get requiresReauth => kind == ApiErrorKind.unauthorized;

  @override
  String toString() =>
      'ApiException(${kind.name}${statusCode == null ? '' : ' $statusCode'}): $message';
}
