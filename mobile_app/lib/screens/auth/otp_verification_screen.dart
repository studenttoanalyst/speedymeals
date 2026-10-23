import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/config/api_config.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/user_models.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../services/auth_service.dart';
import '../../widgets/home_navigation.dart';
import '../../widgets/legal_links.dart';
import '../rider/rider_dashboard_screen.dart';
import '../../core/theme/app_tokens.dart';

/// Step 2 of the phone+OTP login flow: enter the 6-digit code.
///
/// Reached from the customer/rider login and signup screens once
/// `POST /auth/otp/request` succeeds. The phone number and role come from
/// [AuthService]'s pending state, so this screen cannot be entered without a
/// code actually having been requested.
class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    super.key,
    required this.role,
    this.riderSignup,
    this.customerName,
    this.customerEmail,
  });

  final UserRole role;

  /// Required when [role] is [UserRole.rider] and the phone has never signed up
  /// before — the backend creates the `riders` row from these details.
  final RiderSignupDetails? riderSignup;

  /// Customer signup collects a name and optional email, but
  /// `POST /auth/otp/verify` takes only a phone number (it find-or-creates the
  /// `users` row). These are therefore applied right after verification via
  /// `PUT /users/me`, which is the backend's real profile-update endpoint.
  final String? customerName;
  final String? customerEmail;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  static const Color _brandRed = AppColors.cta;

  final _codeController = TextEditingController();
  final _codeFocusNode = FocusNode();

  bool _isVerifying = false;
  bool _isResending = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    AuthService.instance.addListener(_onAuthChanged);
    // The code field is the only interactive element on screen — focus it
    // straight away so the keyboard opens without an extra tap.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _codeFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    AuthService.instance.removeListener(_onAuthChanged);
    _codeController.dispose();
    _codeFocusNode.dispose();
    super.dispose();
  }

  /// Keeps the resend countdown label in sync with [AuthService]'s timer.
  void _onAuthChanged() {
    if (mounted) setState(() {});
  }

  String get _phoneNumber => AuthService.instance.pendingPhoneNumber ?? '';

  /// `+923001234567` -> `+92 300 ••• 4567`, so the user can confirm the number
  /// without it being fully readable over their shoulder.
  String get _maskedPhoneNumber {
    final phone = _phoneNumber;
    if (phone.length < 6) return phone;
    final start = phone.substring(0, phone.length - 7 > 0 ? phone.length - 10 : 0);
    final end = phone.substring(phone.length - 4);
    return '$start•••$end';
  }

  Future<void> _verify() async {
    if (_isVerifying) return;

    final code = _codeController.text.trim();
    if (code.length != 6) {
      setState(() => _errorMessage = 'Enter all 6 digits of your code.');
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      final user = await AuthService.instance.verifyOtp(
        otpCode: code,
        riderSignup: widget.riderSignup,
      );

      // Persist the signup form's name/email now that a session exists.
      // Best-effort: a failure here must not block an otherwise valid login.
      await _applySignupProfile(user);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Welcome, ${user.firstName}!'),
          backgroundColor: AppColors.green600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        ),
      );

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => user.isRider
              ? const RiderDashboardScreen()
              : const HomeNavigation(),
        ),
        (route) => false,
      );
    } on AuthException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  /// Writes the customer signup name/email onto the freshly created profile.
  Future<void> _applySignupProfile(AuthUser user) async {
    if (user.isRider) return;

    final name = widget.customerName?.trim();
    final email = widget.customerEmail?.trim();
    if ((name == null || name.isEmpty) && (email == null || email.isEmpty)) {
      return;
    }

    try {
      await UserRepository().updateProfile(
        UserProfileUpdate(
          name: (name != null && name.isNotEmpty) ? name : null,
          email: (email != null && email.isNotEmpty) ? email : null,
        ),
      );
      await AuthService.instance.refreshProfile();
    } on ApiException catch (error) {
      // e.g. the email is already taken by another account — the login itself
      // still succeeded, so surface it without undoing the session.
      developer.log(
        'Could not save signup profile details: ${error.message}',
        name: 'OtpVerificationScreen',
      );
    }
  }

  Future<void> _resend() async {
    if (_isResending) return;
    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    try {
      await AuthService.instance.resendOtp();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('A new code is on its way.'),
          backgroundColor: AppColors.green600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        ),
      );
    } on AuthException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondsLeft = AuthService.instance.resendCooldownRemaining;
    final canResend = secondsLeft == 0 && !_isResending;

    return Scaffold(
      backgroundColor: AppColors.ink50,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  InkWell(
                    onTap: () {
                      AuthService.instance.clearPendingOtp();
                      Navigator.pop(context);
                    },
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: AppColors.ink100,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_back_rounded,
                        color: AppColors.ink700,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    _buildBrandHeader(),
                    const SizedBox(height: 24),
                    Text(
                      'Enter verification code',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink900,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'We sent a 6-digit code to $_maskedPhoneNumber',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.ink500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: AppColors.ink200),
                      ),
                      child: Column(
                        children: [
                          TextField(
                            controller: _codeController,
                            focusNode: _codeFocusNode,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            maxLength: 6,
                            autofillHints: const [AutofillHints.oneTimeCode],
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            onChanged: (value) {
                              // Clear a stale error as soon as the user edits.
                              if (_errorMessage != null) {
                                setState(() => _errorMessage = null);
                              }
                              if (value.length == 6) {
                                _verify();
                              } else {
                                setState(() {});
                              }
                            },
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 10,
                              color: AppColors.ink900,
                            ),
                            decoration: const InputDecoration(
                              counterText: '',
                              hintText: '000000',
                              hintStyle: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 10,
                                color: AppColors.ink300,
                              ),
                              border: InputBorder.none,
                            ),
                          ),
                          const Divider(height: 1, color: AppColors.ink200),
                          const SizedBox(height: 12),
                          Text(
                            widget.role == UserRole.rider
                                ? 'Signing in as a delivery rider'
                                : 'Signing in as a customer',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink400,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      _buildErrorBanner(_errorMessage!),
                    ],
                    if (ApiConfig.isUsingConsoleOtp) ...[
                      const SizedBox(height: 16),
                      _buildDevHint(),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed:
                            (_isVerifying || _codeController.text.length != 6)
                                ? null
                                : _verify,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _brandRed,
                          disabledBackgroundColor: AppColors.ink300,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                        ),
                        child: _isVerifying
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : const Text(
                                'Verify & Continue',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Both children are flexed (Expanded + Flexible) so the
                    // line can never overflow horizontally: the label shares
                    // the available width with the button and wraps instead of
                    // pushing the button off-screen on narrow screens or at
                    // large accessibility text scales.
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            "Didn't get the code? ",
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink500,
                            ),
                          ),
                        ),
                        Flexible(
                          child: TextButton(
                            onPressed: canResend ? _resend : null,
                            child: Text(
                              canResend
                                  ? 'Resend'
                                  : 'Resend in ${secondsLeft}s',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: canResend
                                    ? _brandRed
                                    : AppColors.ink400,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const LegalConsentText(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBrandHeader() {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.ink100, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: _brandRed.withValues(alpha: 0.1),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Image.asset(
            'assets/images/new logo.png',
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) =>
                Image.asset('assets/images/logo.png', fit: BoxFit.contain),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'SPEEDY MEALS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: _brandRed,
            letterSpacing: 2.0,
          ),
        ),
      ],
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.red50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.red100),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, size: 18, color: _brandRed),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppColors.red800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Honest disclosure about how the code is delivered in development.
  ///
  /// The backend's `SMS_PROVIDER_MODE=console` prints the OTP to the server log
  /// instead of sending an SMS — it does not pretend to be a real SMS provider.
  Widget _buildDevHint() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.ink100,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Icon(Icons.terminal_rounded, size: 16, color: AppColors.ink500),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Development mode: SMS is not configured, so the backend prints '
              'the 6-digit code in its server console.',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: AppColors.ink500,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
