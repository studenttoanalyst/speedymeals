import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../widgets/home_navigation.dart';
import '../rider/rider_dashboard_screen.dart';
import 'customer_signup_screen.dart';
import 'otp_verification_screen.dart';
import 'register_as_screen.dart';

/// Splash + Phone OTP login flows for Speedy Meals.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _timer;

  /// The brand moment is guaranteed, but never extended by a slow network.
  bool _minimumSplashElapsed = false;
  bool _hasNavigated = false;

  @override
  void initState() {
    super.initState();

    _timer = Timer(const Duration(seconds: 3), () {
      _minimumSplashElapsed = true;
      _navigateOnceReady();
    });

    unawaited(_restoreSession());
  }

  /// Restores a persisted session (validating it against `GET /auth/me`, which
  /// silently refreshes an expired access token) while the splash is showing.
  Future<void> _restoreSession() async {
    await AuthService.instance.bootstrap();
    _navigateOnceReady();
  }

  /// Leaves the splash only once BOTH the brand delay has finished and
  /// bootstrap has settled, so a signed-in user never sees the login screen
  /// flash up first.
  void _navigateOnceReady() {
    if (!mounted || _hasNavigated) return;
    if (!_minimumSplashElapsed || AuthService.instance.isBootstrapping) return;

    _hasNavigated = true;
    final user = AuthService.instance.currentUser;

    final Widget destination;
    if (user == null) {
      destination = const RegisterAsScreen();
    } else if (user.isRider) {
      destination = const RiderDashboardScreen();
    } else {
      destination = const HomeNavigation();
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => destination),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const _SplashContent();
  }
}

class _SplashContent extends StatelessWidget {
  const _SplashContent();

  static const Color _splashRed = Color(0xFFE53935);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _splashRed,
      body: Column(
        children: [
          const Spacer(flex: 10),
          Center(
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(36),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(36),
                child: Image.asset(
                  'assets/images/new logo.png',
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Image.asset(
                    'assets/images/logo.png',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 28),

          const Text(
            'Speedy Meals',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),

          const SizedBox(height: 8),

          const Text(
            'Lightning Fast Delights',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              color: Colors.white,
            ),
          ),

          const Spacer(flex: 9),
        ],
      ),
    );
  }
}

/// Phone OTP login screen.
class PhoneOtpLoginScreen extends StatefulWidget {
  const PhoneOtpLoginScreen({super.key});

  @override
  State<PhoneOtpLoginScreen> createState() => _PhoneOtpLoginScreenState();
}

class _PhoneOtpLoginScreenState extends State<PhoneOtpLoginScreen> {
  final _phoneController = TextEditingController();

  bool _isSendingCode = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  /// Real OTP request against the backend, then on to code entry.
  ///
  /// NOTE: this screen is a second, equivalent entry point to
  /// [CustomerLoginScreen] and is not currently routed to from anywhere in the
  /// app. It is kept (and kept working, rather than left as a mock) because
  /// removing UI was out of scope for this integration.
  Future<void> _requestOtp() async {
    if (_isSendingCode) return;
    setState(() => _isSendingCode = true);

    try {
      await AuthService.instance.requestOtp(
        phoneNumber: _phoneController.text.trim(),
        role: UserRole.customer,
      );
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const OtpVerificationScreen(
            role: UserRole.customer,
          ),
        ),
      );
    } on AuthException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isSendingCode = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const SizedBox(height: 20),

              // Brand hero logo
              Container(
                padding: const EdgeInsets.all(18),
                decoration: const BoxDecoration(
                  color: Color(0xFFDC2626),
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/new logo.png',
                    height: 56,
                    width: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                        Image.asset('assets/images/logo.png',
                            height: 56, width: 56, fit: BoxFit.cover),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Text(
                'Speedy Meals',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFFDC2626),
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                'Fast & Fresh Delivery',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const Spacer(flex: 1),

              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Enter your phone number',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Phone number',
                          prefixText: '+92 ',
                          hintText: '300 0000000',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSendingCode ? null : _requestOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Continue with OTP',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account? ",
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const CustomerSignUpScreen(),
                        ),
                      );
                    },
                    child: const Text(
                      'Sign up',
                      style: TextStyle(color: Color(0xFFDC2626)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
