import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// Speedy Meals Material 3-aligned theme assembly.
///
/// Branded tokens are intentionally explicit here so screens remain
/// pixel-aligned with the Stitch design mockups without relying on a
/// generic Material theme default.
class AppTheme {
  AppTheme._();

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: SpeedyMealsColors.primary,
        onPrimary: SpeedyMealsColors.onPrimary,
        primaryContainer: SpeedyMealsColors.primaryContainer,
        onPrimaryContainer: SpeedyMealsColors.onPrimaryContainer,
        secondary: SpeedyMealsColors.secondary,
        onSecondary: SpeedyMealsColors.onSecondary,
        secondaryContainer: SpeedyMealsColors.secondaryContainer,
        onSecondaryContainer: SpeedyMealsColors.onSecondaryContainer,
        tertiary: SpeedyMealsColors.tertiary,
        onTertiary: SpeedyMealsColors.onTertiary,
        tertiaryContainer: SpeedyMealsColors.tertiaryContainer,
        onTertiaryContainer: SpeedyMealsColors.onTertiaryContainer,
        surface: SpeedyMealsColors.surface,
        onSurface: SpeedyMealsColors.onSurface,
        surfaceContainerHighest: SpeedyMealsColors.surfaceContainerHighest,
        error: SpeedyMealsColors.error,
        onError: SpeedyMealsColors.onError,
      ),
      scaffoldBackgroundColor: SpeedyMealsColors.surface,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: SpeedyMealsColors.onSurface,
        ),
        iconTheme: IconThemeData(color: SpeedyMealsColors.onSurface),
      ),
      cardTheme: const CardThemeData(
        color: SpeedyMealsColors.surfaceContainerLowest,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: SpeedyMealsColors.surfaceContainerLowest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: SpeedyMealsColors.surfaceContainerHigh),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: SpeedyMealsColors.surfaceContainerHigh),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: SpeedyMealsColors.secondary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: SpeedyMealsColors.primary,
          foregroundColor: SpeedyMealsColors.onPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: SpeedyMealsColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          textStyle: const TextStyle(
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
      iconTheme: const IconThemeData(color: SpeedyMealsColors.onSurfaceVariant),
      textTheme: _textTheme,
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: SpeedyMealsColors.surfaceContainerLowest,
        elevation: 8,
        selectedItemColor: SpeedyMealsColors.primary,
        unselectedItemColor: SpeedyMealsColors.onSurfaceVariant,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }

  static TextTheme get _textTheme {
    return const TextTheme(
      displayLarge: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 32,
        fontWeight: FontWeight.w800,
        height: 40 / 32,
        letterSpacing: -0.02,
        color: SpeedyMealsColors.onSurface,
      ),
      displayMedium: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 26,
        fontWeight: FontWeight.w700,
        height: 34 / 26,
        letterSpacing: -0.015,
        color: SpeedyMealsColors.onSurface,
      ),
      headlineLarge: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 22,
        fontWeight: FontWeight.w700,
        height: 28 / 22,
        letterSpacing: -0.01,
        color: SpeedyMealsColors.onSurface,
      ),
      headlineMedium: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 18,
        fontWeight: FontWeight.w600,
        height: 24 / 18,
        letterSpacing: -0.005,
        color: SpeedyMealsColors.onSurface,
      ),
      headlineSmall: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 22 / 16,
        letterSpacing: 0,
        color: SpeedyMealsColors.onSurface,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 24 / 16,
        letterSpacing: 0,
        color: SpeedyMealsColors.onSurface,
      ),
      bodyMedium: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 20 / 14,
        letterSpacing: 0,
        color: SpeedyMealsColors.onSurface,
      ),
      bodySmall: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 16 / 12,
        letterSpacing: 0.01,
        color: SpeedyMealsColors.onSurface,
      ),
      labelLarge: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 14,
        fontWeight: FontWeight.w600,
        height: 20 / 14,
        letterSpacing: 0.01,
        color: SpeedyMealsColors.onSurface,
      ),
      labelMedium: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 12,
        fontWeight: FontWeight.w600,
        height: 16 / 12,
        letterSpacing: 0.02,
        color: SpeedyMealsColors.onSurface,
      ),
      labelSmall: TextStyle(
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fontWeight: FontWeight.w700,
        height: 14 / 11,
        letterSpacing: 0.03,
        color: SpeedyMealsColors.onSurface,
      ),
    );
  }
}
