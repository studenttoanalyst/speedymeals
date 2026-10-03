import 'package:flutter/foundation.dart';

/// Central API configuration.
///
/// Nothing else in the app is allowed to hardcode a backend host — every
/// request goes through [ApiClient], which reads [ApiConfig.baseUrl].
///
/// Resolution order:
///   1. `--dart-define=API_BASE_URL=...`  (wins everywhere; required for
///      release builds, also used for staging, CI and LAN devices)
///   2. release build without an override -> [baseUrl] throws; no production
///      domain is hardcoded or guessed
///   3. debug + Android emulator   -> `10.0.2.2` (the emulator's alias for the
///      host machine's loopback, since `localhost` inside the emulator is the
///      emulator itself)
///   4. debug + anything else      -> `localhost` (iOS simulator, desktop, web)
///
/// Physical Android device over USB/Wi-Fi: pass your machine's LAN IP, e.g.
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8000
///
/// Release builds: the backend origin must be supplied, e.g.
///   flutter build apk --dart-define=API_BASE_URL=https://api.example.com
class ApiConfig {
  ApiConfig._();

  /// Compile-time override. Empty when not supplied.
  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// Bare host:port the FastAPI app is listening on in local development.
  static const String devPort = '8000';

  static bool get hasOverride => _override.trim().isNotEmpty;

  /// True when running a compiled release build (`flutter build`), false under
  /// `flutter run` / tests.
  static bool get isProductionBuild => kReleaseMode;

  static String get baseUrl {
    final override = _override.trim();
    if (override.isNotEmpty) return _stripTrailingSlash(override);

    if (isProductionBuild) {
      // Deliberately no hardcoded production host: the real backend origin is
      // deployment-specific and a guessed domain would fail as an opaque
      // network error. Fail loudly at configuration time instead.
      throw StateError(
        'API_BASE_URL is required for release builds. Re-run the build with '
        '--dart-define=API_BASE_URL=https://<your-backend-host> '
        '(for example: flutter build apk --dart-define=API_BASE_URL=...) .',
      );
    }

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:$devPort';
    }
    return 'http://localhost:$devPort';
  }

  /// Where the backend prints OTP codes in `SMS_PROVIDER_MODE=console`.
  /// Shown in dev-only UI so testers know where to look for the 6-digit code.
  static bool get isUsingConsoleOtp => !isProductionBuild && !hasOverride;

  /// WebSocket base derived from [baseUrl] — `https` becomes `wss`, `http`
  /// becomes `ws`, same host and port. There is no separate WS host to
  /// configure: the backend serves the live-tracking socket from the same
  /// Uvicorn app that serves the REST API.
  static String get wsBaseUrl {
    final base = baseUrl;
    if (base.startsWith('https://')) {
      return 'wss://${base.substring('https://'.length)}';
    }
    if (base.startsWith('http://')) {
      return 'ws://${base.substring('http://'.length)}';
    }
    // Already a ws/wss URL (or an unexpected scheme) — used verbatim.
    return base;
  }

  /// `WS /orders/{order_id}/track?token=…` — the backend's live rider-tracking
  /// channel (mounted on the customer-orders router, so the path has no
  /// `/api/v1` prefix).
  ///
  /// The access token travels as a **query parameter** because that is what the
  /// existing backend handler reads (`Query(...)`); this is the backend's
  /// contract, not a client choice. Callers must never log the resulting URI.
  static Uri orderTrackingSocketUri({
    required String orderId,
    required String token,
  }) {
    final base = Uri.parse('$wsBaseUrl/orders/${Uri.encodeComponent(orderId)}/track');
    return base.replace(queryParameters: {'token': token});
  }

  /// The same URI with the credential stripped — safe to log.
  static String redact(Uri uri) {
    if (!uri.hasQuery) return '$uri';
    return '${uri.replace(queryParameters: const {})}?token=[REDACTED]';
  }

  static String _stripTrailingSlash(String url) => url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
