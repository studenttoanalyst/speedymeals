import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'core/theme/app_theme.dart';
import 'features/maps/maps_platform.dart';
import 'screens/splash_screen.dart';
import 'services/push_service.dart';
import 'core/theme/app_tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  _registerFontLicenses();

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

  // Firebase Cloud Messaging. Never throws: without Firebase config this build
  // simply runs without push (see PushService).
  await PushService.instance.init();

  // Web only: load the Maps JavaScript API when MAPS_API_KEY is provided.
  await ensureMapsLoaded();

  runApp(const SpeedyMealsApp());
}

/// The bundled brand fonts are SIL OFL 1.1; their licenses must ship with the
/// app. Registering them lists each one on Flutter's Licenses page.
void _registerFontLicenses() {
  const fonts = {
    'Figtree': 'assets/fonts/OFL-Figtree.txt',
    'Archivo Black': 'assets/fonts/OFL-ArchivoBlack.txt',
    'JetBrains Mono': 'assets/fonts/OFL-JetBrainsMono.txt',
  };
  LicenseRegistry.addLicense(() async* {
    for (final entry in fonts.entries) {
      yield LicenseEntryWithLineBreaks([entry.key], await rootBundle.loadString(entry.value));
    }
  });
}

/// Lets lists scroll by dragging with a mouse or trackpad too (Flutter web
/// and desktop only accept touch drags by default), so horizontal rails can
/// be swiped in the browser just like on a phone.
class _AppScrollBehavior extends MaterialScrollBehavior {
  const _AppScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.stylus,
        PointerDeviceKind.invertedStylus,
      };
}

class SpeedyMealsApp extends StatelessWidget {
  const SpeedyMealsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'SpeedyMeals',
      theme: AppTheme.light,
      scrollBehavior: const _AppScrollBehavior(),
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
      color: AppColors.canvas,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.error_outline, size: 56, color: AppColors.cta),
              SizedBox(height: 16),
              Text(
                'Something went wrong',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.ink900,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 8),
              Text(
                'Please go back and try again.',
                style: TextStyle(fontSize: 13, color: AppColors.ink600),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}