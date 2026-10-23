import 'dart:async';

import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import '../services/auth_service.dart';
import '../widgets/home_navigation.dart';
import 'auth/register_as_screen.dart';
import 'rider/rider_dashboard_screen.dart';
import '../core/theme/app_tokens.dart';

/// Splash screen and session restoration for SpeedyMeals.
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

  static const Color _splashRed = AppColors.red600;

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
                borderRadius: BorderRadius.circular(AppRadius.lg),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ink900.withValues(alpha: 0.18),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.lg),
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
            AppConstants.appName,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            AppConstants.appTagline,
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
