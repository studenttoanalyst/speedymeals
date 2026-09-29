import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';

void main() {
  // Defensive: replace the framework's default error box with a branded,
  // readable fallback. Without this, a build failure such as the checkout
  // RenderFlex assertion surfaced as an unhelpful blank/white screen.
  ErrorWidget.builder = (FlutterErrorDetails details) {
    if (kDebugMode) {
      // Keep the detailed developer error in debug builds.
      return ErrorWidget(details.exception);
    }
    return const _AppErrorFallback();
  };

  runApp(const SpeedyMealsApp());
}

class SpeedyMealsApp extends StatelessWidget {
  const SpeedyMealsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Speedy Meals',
      theme: AppTheme.light,
      home: const SplashScreen(),
    );
  }
}

/// Friendly in-app error state shown instead of a blank screen.
class _AppErrorFallback extends StatelessWidget {
  const _AppErrorFallback();

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFFAF8FF),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.error_outline, size: 56, color: Color(0xFFDC2626)),
              SizedBox(height: 16),
              Text(
                'Something went wrong',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF131B2E),
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 8),
              Text(
                'Please go back and try again.',
                style: TextStyle(fontSize: 13, color: Color(0xFF5C403C)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}