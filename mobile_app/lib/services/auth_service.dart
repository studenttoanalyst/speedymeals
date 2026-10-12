import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/constants/app_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../core/storage/token_storage.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/rider_repository.dart';
import '../data/repositories/user_repository.dart';

// Re-exported so screens keep importing only this file for their auth types.
export '../core/constants/app_constants.dart' show UserRole;

/// A signed-in identity.
///
/// Populated from the backend after the OTP is verified — never synthesised
/// locally. Fields the backend does not have (a password, an invented
/// "city") are deliberately absent.
@immutable
class AuthUser {
  final String id;
  final UserRole role;

  /// Full international number, e.g. `+923001234567`.
  final String phoneNumber;

  final String name;
  final String? email;

  /// Rider-only: `pending` | `approved` | `rejected`.
  final String? approvalStatus;
  final String? vehicleType;
  final String? vehicleRegistration;

  /// Rider-only wallet figures (PKR).
  final double walletBalance;
  final double pendingCashOwed;

  const AuthUser({
    required this.id,
    required this.role,
    required this.phoneNumber,
    required this.name,
    this.email,
    this.approvalStatus,
    this.vehicleType,
    this.vehicleRegistration,
    this.walletBalance = 0,
    this.pendingCashOwed = 0,
  });

  bool get isRider => role == UserRole.rider;

  /// True when the rider may accept work. Always true for customers.
  bool get isApproved => !isRider || approvalStatus == 'approved';

  String get displayName {
    final trimmed = name.trim();
    if (trimmed.isNotEmpty) return trimmed;
    return phoneNumber;
  }

  /// First name, for greetings.
  String get firstName {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return 'there';
    return trimmed.split(RegExp(r'\s+')).first;
  }

  /// Two-letter avatar initials.
  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return 'SM';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }

  AuthUser copyWith({
    String? name,
    String? email,
    String? approvalStatus,
    String? vehicleType,
    String? vehicleRegistration,
    double? walletBalance,
    double? pendingCashOwed,
  }) =>
      AuthUser(
        id: id,
        role: role,
        phoneNumber: phoneNumber,
        name: name ?? this.name,
        email: email ?? this.email,
        approvalStatus: approvalStatus ?? this.approvalStatus,
        vehicleType: vehicleType ?? this.vehicleType,
        vehicleRegistration: vehicleRegistration ?? this.vehicleRegistration,
        walletBalance: walletBalance ?? this.walletBalance,
        pendingCashOwed: pendingCashOwed ?? this.pendingCashOwed,
      );
}

/// Error raised by the auth layer. Carries a message that is already safe to
/// show to the user.
class AuthException implements Exception {
  final String message;

  /// True when the caller can simply retry the same action.
  final bool isRetryable;

  const AuthException(this.message, {this.isRetryable = false});

  /// Wraps a transport/API failure in user-facing wording.
  factory AuthException.fromApi(ApiException error) {
    switch (error.kind) {
      case ApiErrorKind.rateLimited:
        return AuthException(
          'Too many attempts. Please wait a moment before trying again.',
          isRetryable: true,
        );
      case ApiErrorKind.validation:
      case ApiErrorKind.badRequest:
        // The backend rejects a wrong/expired code with 400/401 and a message
        // like "Invalid or expired OTP." — surface it verbatim.
        return AuthException(error.message);
      case ApiErrorKind.network:
        return const AuthException(
          'Cannot reach Speedy Meals. Check your internet connection.',
          isRetryable: true,
        );
      case ApiErrorKind.timeout:
        return const AuthException(
          'The request timed out. Please try again.',
          isRetryable: true,
        );
      default:
        return AuthException(error.message, isRetryable: error.isRetryable);
    }
  }

  @override
  String toString() => message;
}

/// Authentication state for the whole app.
///
/// Real backend flow — there is no password anywhere:
///
///     phone number -> POST /auth/otp/request -> OTP screen
///     -> POST /auth/otp/verify (or /auth/rider/login/otp-verify, or
///        /auth/rider/register for a first-time rider) -> token pair
///     -> secure storage -> GET /users/me or GET /wallet/profile
///
/// A [ChangeNotifier] singleton so the existing `AnimatedBuilder`-based screens
/// keep working unchanged, while the data behind it becomes real.
class AuthService extends ChangeNotifier {
  AuthService._internal();

  static final AuthService instance = AuthService._internal();

  final TokenStorage _tokens = ApiClient.instance.tokens;
  final AuthRepository _auth = AuthRepository();
  final UserRepository _users = UserRepository();
  final RiderRepository _riders = RiderRepository();

  AuthUser? _currentUser;
  bool _isBootstrapping = true;

  String? _pendingPhone;
  UserRole _pendingRole = UserRole.customer;
  Timer? _cooldownTimer;
  DateTime? _lastOtpRequestAt;

  /// Currently signed-in user, or null.
  AuthUser? get currentUser => _currentUser;

  bool get isLoggedIn => _currentUser != null;
  UserRole? get currentRole => _currentUser?.role;
  bool get isRider => _currentUser?.isRider ?? false;

  /// True until the first [bootstrap] completes, so the splash screen can hold
  /// the UI instead of flashing the login screen at a signed-in user.
  bool get isBootstrapping => _isBootstrapping;

  /// Phone number waiting for an OTP, and the role it belongs to. Used to
  /// label the OTP screen and to resend.
  String? get pendingPhoneNumber => _pendingPhone;
  UserRole get pendingRole => _pendingRole;

  /// Seconds left before the backend will accept another OTP request (its
  /// resend cooldown is 45s). Zero means "can send now".
  int get resendCooldownRemaining {
    final last = _lastOtpRequestAt;
    if (last == null) return 0;
    final elapsed = DateTime.now().difference(last);
    final remaining =
        AppConstants.otpResendCooldown.inSeconds - elapsed.inSeconds;
    return remaining > 0 ? remaining : 0;
  }

  // --------------------------------------------------------------- lifecycle

  /// Restores a persisted session on app start.
  ///
  /// Installs the token-refresh hook first, so `GET /auth/me` can silently
  /// refresh an expired access token before deciding the session is dead.
  Future<void> bootstrap() async {
    try {
      await _tokens.load();

      ApiClient.instance.onRefreshToken = _refreshAccessToken;
      ApiClient.instance.onSessionExpired = _handleSessionExpired;

      if (_tokens.hasSession) {
        // Confirms the stored token is still accepted (and triggers a refresh
        // if it merely expired).
        final me = await _auth.me();
        await _loadIdentity(role: me.role, id: me.id);
      }
    } on ApiException catch (error) {
      // A dead/revoked session is normal (30-day refresh window) and must not
      // block startup; anything else is also non-fatal here.
      debugPrint('Session restore failed (${error.kind.name}); signed out.');
      await _clearSession();
    } catch (error) {
      debugPrint('Session restore failed: $error');
      await _clearSession();
    } finally {
      _isBootstrapping = false;
      notifyListeners();
    }
  }

  // ------------------------------------------------------------------- OTP

  /// Step 1 of the login flow: ask the backend to send a code.
  ///
  /// The backend rate-limits this (45s cooldown + 5/min), so a 429 is surfaced
  /// as a friendly, retryable [AuthException].
  Future<void> requestOtp({
    required String phoneNumber,
    required UserRole role,
  }) async {
    final normalized = AuthRepository.normalizeNationalNumber(phoneNumber);
    if (normalized.length < 9) {
      throw const AuthException(
        'Enter a valid mobile number, e.g. 300 1234567.',
      );
    }

    try {
      await _auth.requestOtp(phoneNumber: normalized);
    } on ApiException catch (error) {
      throw AuthException.fromApi(error);
    }

    _pendingPhone = normalized;
    _pendingRole = role;
    _startResendCooldown();
    notifyListeners();
  }

  /// Re-sends the code for the pending number. Throws while the cooldown is
  /// still running so the UI can't spam the endpoint into a 429.
  Future<void> resendOtp() async {
    final phone = _pendingPhone;
    if (phone == null) {
      throw const AuthException('Enter your phone number again to get a code.');
    }
    final remaining = resendCooldownRemaining;
    if (remaining > 0) {
      throw AuthException('Please wait ${remaining}s before requesting again.');
    }
    await requestOtp(phoneNumber: phone, role: _pendingRole);
  }

  /// Step 2: verify the code and establish the session.
  ///
  /// For a first-time rider phone number the backend creates the `riders` row
  /// (`approval_status = "pending"`) from [riderSignup], so signup must pass it.
  /// For an already-registered rider this is a plain login: [riderSignup] is
  /// `null`, the backend looks the rider up by phone and ignores signup fields.
  /// A rider phone with no account and no [riderSignup] is rejected by the
  /// backend (404), so an unknown number can never authenticate without
  /// signing up first.
  Future<AuthUser> verifyOtp({
    required String otpCode,
    RiderSignupDetails? riderSignup,
  }) async {
    final phone = _pendingPhone;
    if (phone == null) {
      throw const AuthException('Request a verification code first.');
    }

    final code = otpCode.trim();
    if (code.length != 6 || int.tryParse(code) == null) {
      throw const AuthException('Enter the 6-digit code from your SMS.');
    }

    final role = _pendingRole;

    // A returning rider logs in with just phone + OTP (riderSignup is null);
    // only a first-time rider signup supplies the details. The backend decides
    // which case this is and rejects an unknown phone without signup details.
    final TokenPair tokens;
    try {
      tokens = role.isRider
          ? await _auth.verifyRiderOtp(
              phoneNumber: phone,
              otpCode: code,
              signup: riderSignup,
            )
          : await _auth.verifyCustomerOtp(phoneNumber: phone, otpCode: code);
    } on ApiException catch (error) {
      throw AuthException.fromApi(error);
    }

    await _tokens.save(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      role: role,
      phoneNumber: phone,
    );

    // The refresh hook must be installed before the very first authenticated
    // profile read, so a token that is already near expiry still resolves.
    ApiClient.instance.onRefreshToken = _refreshAccessToken;
    ApiClient.instance.onSessionExpired = _handleSessionExpired;

    _cancelCooldown();

    await _loadIdentity(role: role);
    return _currentUser!;
  }

  // ---------------------------------------------------------------- session

  /// Re-reads the signed-in user's backend profile and refreshes the local copy.
  Future<void> refreshProfile() async {
    if (!_tokens.hasSession) return;
    await _loadIdentity();
  }

  /// Signs out: revokes the refresh token server-side, then clears local state.
  ///
  /// Local state is cleared even if the network call fails — a user who taps
  /// "log out" must end up logged out.
  Future<void> logout() async {
    final refreshToken = _tokens.refreshToken;
    if (refreshToken != null) {
      await _auth.logout(refreshToken: refreshToken);
    }
    await _clearSession();
  }

  /// Forgets the pending OTP (used when backing out of the OTP screen).
  void clearPendingOtp() {
    _pendingPhone = null;
    _pendingRole = UserRole.customer;
    _cancelCooldown();
    notifyListeners();
  }

  // ------------------------------------------------------------- internals

  Future<bool> _refreshAccessToken() async {
    final refreshToken = _tokens.refreshToken;
    if (refreshToken == null) return false;

    final pair = await _auth.refresh(refreshToken: refreshToken);
    if (pair == null) return false;

    await _tokens.updateTokens(
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    );
    return true;
  }

  /// Called by [ApiClient] when a refresh attempt fails — the session is dead.
  void _handleSessionExpired() {
    if (_currentUser == null && !_tokens.hasSession) return;
    unawaited(_clearSession());
  }

  /// Fetches the role-appropriate profile and caches it as [currentUser].
  ///
  /// [role]/[id] are supplied during bootstrap (from `GET /auth/me`); on a
  /// normal login the stored role is used.
  Future<void> _loadIdentity({UserRole? role, String? id}) async {
    final effectiveRole = role ?? _tokens.role ?? UserRole.unknown;
    final effectiveId = id ?? _tokens.subjectId ?? '';

    switch (effectiveRole) {
      case UserRole.customer:
        final profile = await _users.getProfile();
        _currentUser = AuthUser(
          id: profile.id.isNotEmpty ? profile.id : effectiveId,
          role: UserRole.customer,
          phoneNumber: profile.fullPhoneNumber,
          name: profile.name,
          email: profile.email,
          walletBalance: profile.walletBalance,
        );

      case UserRole.rider:
        final profile = await _riders.profile();
        _currentUser = AuthUser(
          id: profile.id.isNotEmpty ? profile.id : effectiveId,
          role: UserRole.rider,
          phoneNumber: profile.phoneNumber,
          name: profile.name,
          approvalStatus: profile.approvalStatus,
          vehicleType: profile.vehicleType,
          vehicleRegistration: profile.vehicleRegistration,
          walletBalance: profile.walletBalance,
          pendingCashOwed: profile.pendingCashOwed,
        );

      case UserRole.restaurant:
      case UserRole.admin:
      case UserRole.unknown:
        // Neither role is usable from this app (the restaurant dashboard and
        // admin panel are separate clients). Keep the token so the session is
        // not silently thrown away, but report what actually happened.
        _currentUser = AuthUser(
          id: effectiveId,
          role: effectiveRole,
          phoneNumber: _tokens.phoneNumber ?? '',
          name: effectiveRole.wireName,
        );
    }

    notifyListeners();
  }

  Future<void> _clearSession() async {
    _cancelCooldown();
    _currentUser = null;
    _pendingPhone = null;
    ApiClient.instance.onRefreshToken = null;
    ApiClient.instance.onSessionExpired = null;
    await _tokens.clear();
    notifyListeners();
  }

  void _startResendCooldown() {
    _lastOtpRequestAt = DateTime.now();
    _cancelCooldown();
    // Ticks once a second so the resend button's countdown label stays live.
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (resendCooldownRemaining <= 0) {
        timer.cancel();
      }
      notifyListeners();
    });
  }

  void _cancelCooldown() {
    _cooldownTimer?.cancel();
    _cooldownTimer = null;
  }

  @override
  void dispose() {
    _cancelCooldown();
    super.dispose();
  }
}
