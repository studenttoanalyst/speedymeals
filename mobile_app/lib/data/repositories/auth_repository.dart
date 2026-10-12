import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../json_utils.dart';

/// The access/refresh pair returned by every login endpoint
/// (backend: `auth/schemas.py: TokenResponseSchema`).
class TokenPair {
  final String accessToken;
  final String refreshToken;
  final String tokenType;

  const TokenPair({
    required this.accessToken,
    required this.refreshToken,
    this.tokenType = 'bearer',
  });

  factory TokenPair.fromJson(Map<String, dynamic> json) => TokenPair(
        accessToken: Json.asString(json['access_token']),
        refreshToken: Json.asString(json['refresh_token']),
        tokenType: Json.asString(json['token_type'], fallback: 'bearer'),
      );
}

/// Rider signup details for `POST /auth/rider/register`.
///
/// Required when the phone has no rider account yet (the backend creates the
/// `riders` row from these fields); a returning rider sends none and logs in
/// through `POST /auth/rider/login/otp-verify` instead.
class RiderSignupDetails {
  final String name;
  final String cnicNumber;
  final String? vehicleType;
  final String? vehicleRegistration;

  const RiderSignupDetails({
    required this.name,
    required this.cnicNumber,
    this.vehicleType,
    this.vehicleRegistration,
  });
}

/// All authentication calls, in one place.
///
/// Auth is phone + OTP exclusively — the backend has no password column on
/// `users` or `riders`, so there is no password to send, store or reset.
class AuthRepository {
  AuthRepository({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// Pakistan dialling code, the backend's default.
  static const String defaultCountryCode = '+92';

  /// Asks the backend to generate and send an OTP.
  ///
  /// With `SMS_PROVIDER_MODE=console` (the dev/test default) the code is
  /// printed to the *server* log rather than sent by SMS. Rate limits apply:
  /// a 45-second resend cooldown plus a 5-per-minute cap, both surfacing as 429.
  Future<void> requestOtp({
    required String phoneNumber,
    String countryCode = defaultCountryCode,
  }) async {
    await _client.postJson(
      '/auth/otp/request',
      body: {
        'phone_number': normalizeNationalNumber(phoneNumber),
        'country_code': countryCode,
      },
      authenticated: false,
    );
  }

  /// Verifies a customer's OTP. Find-or-creates their `users` row on the
  /// backend, so this single call covers both signup and login.
  Future<TokenPair> verifyCustomerOtp({
    required String phoneNumber,
    required String otpCode,
    String countryCode = defaultCountryCode,
  }) async {
    final json = await _client.postJson(
      '/auth/otp/verify',
      body: {
        'phone_number': normalizeNationalNumber(phoneNumber),
        'country_code': countryCode,
        'otp_code': otpCode,
      },
      authenticated: false,
    );
    return TokenPair.fromJson(json);
  }

  /// Verifies a rider's OTP.
  ///
  /// The backend exposes two separate rider OTP endpoints:
  ///   - `POST /auth/rider/register` — first-time signup, creates the `riders`
  ///     row with `approval_status = "pending"` from [signup].
  ///   - `POST /auth/rider/login/otp-verify` — plain login for an
  ///     already-registered rider (the backend 404s an unknown phone).
  ///
  /// Sending both cases to the old combined `/auth/rider/otp/verify` path made
  /// the app hit a route that no longer exists (404) on the verify step.
  Future<TokenPair> verifyRiderOtp({
    required String phoneNumber,
    required String otpCode,
    RiderSignupDetails? signup,
    String countryCode = defaultCountryCode,
  }) async {
    final path = signup != null
        ? '/auth/rider/register'
        : '/auth/rider/login/otp-verify';

    final json = await _client.postJson(
      path,
      // Key names must match `RiderRegisterSchema` / `RiderLoginOTPVerifySchema`
      // exactly (backend/app/platform/auth/schemas.py). `otp_code` is
      // stringified explicitly: Pydantic v2 does not coerce int -> str, so an
      // int here would come back as a 422 instead of a failed-verification 400.
      body: {
        'phone_number': normalizeNationalNumber(phoneNumber),
        'country_code': countryCode,
        'otp_code': otpCode.toString(),
        if (signup != null) ...{
          'name': signup.name,
          'cnic_number': signup.cnicNumber,
          'vehicle_type': signup.vehicleType,
          'vehicle_registration': signup.vehicleRegistration,
        },
      },
      authenticated: false,
    );
    return TokenPair.fromJson(json);
  }

  /// Rotates the refresh token. Returns the new pair, or null when the refresh
  /// token is no longer valid (revoked/expired → 401).
  Future<TokenPair?> refresh({required String refreshToken}) async {
    try {
      final json = await _client.postJson(
        '/auth/refresh',
        body: {'refresh_token': refreshToken},
        authenticated: false,
      );
      return TokenPair.fromJson(json);
    } on ApiException catch (error) {
      if (error.requiresReauth) return null;
      rethrow;
    }
  }

  /// Revokes the refresh token server-side.
  ///
  /// Failing here must never block a local sign-out, so errors are swallowed —
  /// the client clears its own session regardless.
  Future<void> logout({required String refreshToken}) async {
    try {
      await _client.postJson(
        '/auth/logout',
        body: {'refresh_token': refreshToken},
        authenticated: false,
      );
    } on ApiException {
      // Best effort: the token expires on its own within 30 days.
    }
  }

  /// Lightweight identity check — `{id, role}` straight from the access token.
  Future<({String id, UserRole role})> me() async {
    final json = await _client.getJson('/auth/me');
    return (
      id: Json.asString(json['id']),
      role: UserRole.fromWire(Json.asStringOrNull(json['role'])),
    );
  }

  /// Normalizes a locally typed phone number into the national-significant
  /// form the backend expects.
  ///
  /// The backend concatenates `country_code + phone_number`, so a local-format
  /// number carrying its trunk prefix (`03001234567`) would become
  /// `+9203001234567` — invalid. Stripping the leading zero yields
  /// `+923001234567`.
  ///
  /// Also drops spaces, dashes and parentheses, and tolerates a user pasting a
  /// full international number.
  static String normalizeNationalNumber(String input) {
    var value = input.trim().replaceAll(RegExp(r'[\s\-()]'), '');
    if (value.startsWith('+')) {
      value = value.substring(1);
    }
    // Strip the country code if the user pasted it without a "+".
    if (value.startsWith('92') && value.length > 10) {
      value = value.substring(2);
    }
    while (value.startsWith('0')) {
      value = value.substring(1);
    }
    return value;
  }
}
