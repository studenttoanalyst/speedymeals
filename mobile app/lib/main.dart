import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';

void main() {
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