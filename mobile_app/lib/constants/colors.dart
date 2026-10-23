import 'package:flutter/material.dart';

import '../core/theme/app_tokens.dart';

/// SpeedyMeals Material 3 color roles, mapped onto the shared design tokens
/// (design-tokens/tokens.json → AppColors). Prefer [AppColors] in new code;
/// these role names remain for ColorScheme assembly and existing widgets.
///
/// Brand: red for the primary action, blue for trust, tan used sparingly,
/// ink on paper for everything else. See docs/DESIGN_TOKENS.md.
class SpeedyMealsColors {
  // Primary — CTA red (white text 5.36:1)
  static const Color primary = AppColors.cta;
  static const Color primaryContainer = AppColors.red50;
  static const Color onPrimary = AppColors.onCta;
  static const Color onPrimaryContainer = AppColors.red700;

  // Secondary — trust blue
  static const Color secondary = AppColors.blue600;
  static const Color secondaryContainer = AppColors.blue50;
  static const Color onSecondary = AppColors.paper;
  static const Color onSecondaryContainer = AppColors.blue700;
  static const Color secondaryFixed = AppColors.blue100;

  // Tertiary — tan premium accent (sparing; text uses tan700 for contrast)
  static const Color tertiary = AppColors.tan700;
  static const Color tertiaryContainer = AppColors.tan100;
  static const Color onTertiary = AppColors.paper;
  static const Color onTertiaryContainer = AppColors.tan700;
  static const Color tertiaryFixed = AppColors.tan100;
  static const Color tertiaryFixedDim = AppColors.tan400;

  // Surface & background — white cards on a warm ink-50 canvas
  static const Color surface = AppColors.surface;
  static const Color surfaceVariant = AppColors.ink100;
  static const Color background = AppColors.canvas;
  static const Color onBackground = AppColors.text;
  static const Color onSurface = AppColors.text;
  static const Color onSurfaceVariant = AppColors.textSecondary;

  // Surface container levels
  static const Color surfaceContainerLowest = AppColors.paper;
  static const Color surfaceContainerLow = AppColors.ink50;
  static const Color surfaceContainer = AppColors.ink100;
  static const Color surfaceContainerHigh = AppColors.ink200;
  static const Color surfaceContainerHighest = AppColors.ink200;

  // Inverse
  static const Color inverseSurface = AppColors.surfaceInverse;
  static const Color inverseOnSurface = AppColors.ink50;
  static const Color surfaceDim = AppColors.ink100;
  // Transparent: stops Material 3 tinting elevated surfaces pink.
  static const Color surfaceTint = Color(0x00000000);

  // Outlines
  static const Color outline = AppColors.borderControl;
  static const Color outlineVariant = AppColors.line;

  // Status
  static const Color error = AppColors.error;
  static const Color errorContainer = AppColors.errorBg;
  static const Color onError = AppColors.paper;
  static const Color onErrorContainer = AppColors.red700;

  // White & transparent
  static const Color white = AppColors.paper;
  static const Color transparent = Color(0x00000000);

  // Ink-tinted overlay (10%)
  static const Color surfaceContainerLow2 = Color(0x1A15171A);
}
